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
