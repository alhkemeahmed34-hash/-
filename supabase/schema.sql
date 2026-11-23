-- TASNIM TRAVEL initial schema.
-- Roles must be assigned by a trusted server using app_metadata only.
-- Never allow clients to write their own role or app_metadata.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.travel_services (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('flight','umrah','hajj','tourism','hotel','visa','transport')),
  title text not null,
  description text not null default '',
  destination text,
  price numeric(12,2),
  currency text not null default 'YER',
  starts_at date,
  ends_at date,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id),
  service_id uuid references public.travel_services(id) on delete set null,
  service_category text not null check (service_category in ('flight','umrah','hajj','tourism','hotel','visa','transport')),
  customer_name text not null,
  customer_phone text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','under_review','confirmed','rejected','cancelled','completed')),
  staff_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_customer_created_idx
  on public.bookings(customer_id, created_at desc);
create index if not exists bookings_status_created_idx
  on public.bookings(status, created_at desc);
create index if not exists services_category_active_idx
  on public.travel_services(category, is_active);

alter table public.profiles enable row level security;
alter table public.travel_services enable row level security;
alter table public.bookings enable row level security;

-- Profile owners can read/update their own profile. Staff roles are trusted app_metadata claims.
create policy "profile_read_self_or_staff"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('owner','staff')
);

create policy "profile_update_self"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "services_read_active"
on public.travel_services for select to anon, authenticated
using (
  is_active = true
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('owner','staff')
);

create policy "services_manage_staff"
on public.travel_services for all to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('owner','staff'))
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('owner','staff'));

create policy "bookings_customer_read_own"
on public.bookings for select to authenticated
using (
  customer_id = (select auth.uid())
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('owner','staff')
);

create policy "bookings_customer_create_own"
on public.bookings for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and status = 'pending'
  and staff_notes is null
);

create policy "bookings_staff_update"
on public.bookings for update to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('owner','staff'))
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('owner','staff'));

-- No customer DELETE policy: preserve booking history.
-- Staff/owner account provisioning and role assignment must happen server-side.


-- Additional production setup applied to the dedicated TASNIM TRAVEL project.
-- Private passport storage; never make this bucket public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('passport-documents', 'passport-documents', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','application/pdf'];

create policy "profile_insert_self" on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

create or replace function public.has_staff_permission(permission_name text)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'owner'
    or (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'staff'
      and coalesce((select auth.jwt()) -> 'app_metadata' -> 'permissions', '[]'::jsonb) ? permission_name);
$$;
revoke all on function public.has_staff_permission(text) from public;
grant execute on function public.has_staff_permission(text) to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'phone', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute function public.handle_new_auth_user();
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

-- Staff roles and permissions must only be assigned by trusted server-side admin code.
-- Never let the mobile client update auth.users.raw_app_meta_data or app_metadata.
