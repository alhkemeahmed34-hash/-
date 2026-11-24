-- TASNIM TRAVEL — Phase 1 security hardening
-- Review this file before applying it. This migration is NOT executed by this commit.
begin;

-- Keep internal trigger helpers outside the exposed Data API schemas.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.travel_services enable row level security;
alter table public.bookings enable row level security;
alter table storage.objects enable row level security;

-- Remove the currently installed and legacy policies so no permissive policy
-- can accidentally combine with the hardened policies below.
drop policy if exists "profile_read_self_or_staff" on public.profiles;
drop policy if exists "profile_read_self_or_authorized_staff" on public.profiles;
drop policy if exists "profile_update_self" on public.profiles;
drop policy if exists "profile_insert_self" on public.profiles;

drop policy if exists "services_read_active" on public.travel_services;
drop policy if exists "services_read_active_anon" on public.travel_services;
drop policy if exists "services_read_active_or_authorized_staff" on public.travel_services;
drop policy if exists "services_manage_staff" on public.travel_services;
drop policy if exists "services_insert_authorized_staff" on public.travel_services;
drop policy if exists "services_update_authorized_staff" on public.travel_services;
drop policy if exists "services_delete_authorized_staff" on public.travel_services;

drop policy if exists "bookings_customer_read_own" on public.bookings;
drop policy if exists "bookings_customer_read_own_or_authorized_staff" on public.bookings;
drop policy if exists "bookings_customer_create_own" on public.bookings;
drop policy if exists "bookings_staff_update" on public.bookings;
drop policy if exists "bookings_update_authorized_staff" on public.bookings;

drop policy if exists "passport_delete_authorized_staff" on storage.objects;
drop policy if exists "passport_read_own_or_authorized_staff" on storage.objects;
drop policy if exists "passport_update_own_or_authorized_staff" on storage.objects;
drop policy if exists "passport_upload_own_folder" on storage.objects;

-- Least-privilege SQL grants complement RLS. In particular, authenticated
-- clients receive no UPDATE or DELETE privilege on bookings.
revoke all privileges on table public.profiles from public, anon, authenticated;
revoke all privileges on table public.travel_services from public, anon, authenticated;
revoke all privileges on table public.bookings from public, anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.travel_services to anon, authenticated;
grant insert, update on table public.travel_services to authenticated;
grant select, insert on table public.bookings to authenticated;

-- Profiles: customers see and edit only their own profile. Staff need the
-- explicit customers.read permission to read customer profiles.
create policy "profile_read_self_or_authorized_staff"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.has_staff_permission('customers.read')
);

create policy "profile_insert_self"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

create policy "profile_update_self"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Services: active services are public; inactive services are visible only to
-- staff with a relevant service-management/read permission. There is
-- intentionally no DELETE policy: services are hidden with is_active=false.
create policy "services_read_active_anon"
on public.travel_services for select to anon
using (is_active = true);

create policy "services_read_active_or_authorized_staff"
on public.travel_services for select to authenticated
using (
  is_active = true
  or public.has_staff_permission('services.read')
  or public.has_staff_permission('services.manage')
);

create policy "services_insert_authorized_staff"
on public.travel_services for insert to authenticated
with check (public.has_staff_permission('services.manage'));

create policy "services_update_authorized_staff"
on public.travel_services for update to authenticated
using (public.has_staff_permission('services.manage'))
with check (public.has_staff_permission('services.manage'));

-- Bookings: customers read only their own rows. Staff need bookings.read.
create policy "bookings_customer_read_own_or_authorized_staff"
on public.bookings for select to authenticated
using (
  customer_id = (select auth.uid())
  or public.has_staff_permission('bookings.read')
);

-- Customer-created bookings must belong to the caller and start pending.
-- A selected service, when supplied, must exist, be active, and match category.
create policy "bookings_customer_create_own"
on public.bookings for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and status = 'pending'
  and staff_notes is null
  and (
    service_id is null
    or exists (
      select 1
      from public.travel_services as service
      where service.id = bookings.service_id
        and service.is_active = true
        and service.category = bookings.service_category
    )
  )
);

-- No direct UPDATE or DELETE policy exists for bookings. All staff status
-- changes must go through the narrowly-scoped RPC below.
create or replace function public.update_booking_status(
  p_booking_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null
     or not public.has_staff_permission('bookings.update') then
    raise exception using
      errcode = '42501',
      message = 'Not authorized to update booking status';
  end if;

  if p_status is null or p_status not in (
    'pending', 'under_review', 'confirmed', 'rejected', 'cancelled', 'completed'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Invalid booking status';
  end if;

  update public.bookings
  set status = p_status,
      updated_at = pg_catalog.now()
  where id = p_booking_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Booking not found';
  end if;
end;
$function$;

revoke all on function public.update_booking_status(uuid, text) from public, anon, authenticated;
grant execute on function public.update_booking_status(uuid, text) to authenticated;
comment on function public.update_booking_status(uuid, text) is
  'Changes only booking status after checking the caller app_metadata permission bookings.update.';

-- Passport documents remain private. Customers may read/upload only inside
-- their own UUID folder. Staff with customers.read may read, but cannot
-- overwrite or delete passport files through the client Storage API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'passport-documents',
  'passport-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf'];

create policy "passport_read_own_or_authorized_staff"
on storage.objects for select to authenticated
using (
  bucket_id = 'passport-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.has_staff_permission('customers.read')
  )
);

create policy "passport_upload_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'passport-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Even privileged deletes must not orphan historical bookings. The normal
-- client path is to set is_active=false; this trigger protects linked records.
create or replace function private.prevent_service_delete_with_bookings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1
    from public.bookings as booking
    where booking.service_id = old.id
  ) then
    raise exception using
      errcode = '23503',
      message = 'Cannot delete a travel service linked to existing bookings; set is_active=false instead';
  end if;

  return old;
end;
$function$;

revoke all on function private.prevent_service_delete_with_bookings() from public, anon, authenticated;
drop trigger if exists prevent_service_delete_with_bookings on public.travel_services;
create trigger prevent_service_delete_with_bookings
before delete on public.travel_services
for each row
execute function private.prevent_service_delete_with_bookings();

-- Prevent deleting, soft-deleting, or demoting the final active owner.
-- app_metadata is not writable by authenticated clients; this trigger adds a
-- database-level guard for trusted administrative operations as well.
create or replace function private.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  remaining_active_owners integer;
  old_role text;
  new_role text;
begin
  old_role := coalesce(old.raw_app_meta_data ->> 'role', '');

  if tg_op = 'UPDATE' then
    new_role := coalesce(new.raw_app_meta_data ->> 'role', '');

    if old_role = 'owner'
       and old.deleted_at is null
       and (
         new_role <> 'owner'
         or (old.deleted_at is null and new.deleted_at is not null)
       ) then
      select count(*)::integer
      into remaining_active_owners
      from auth.users as auth_user
      where auth_user.id <> old.id
        and coalesce(auth_user.raw_app_meta_data ->> 'role', '') = 'owner'
        and auth_user.deleted_at is null;

      if remaining_active_owners = 0 then
        raise exception using
          errcode = '23514',
          message = 'Cannot demote or disable the last active TASNIM owner';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' and old_role = 'owner' and old.deleted_at is null then
    select count(*)::integer
    into remaining_active_owners
    from auth.users as auth_user
    where auth_user.id <> old.id
      and coalesce(auth_user.raw_app_meta_data ->> 'role', '') = 'owner'
      and auth_user.deleted_at is null;

    if remaining_active_owners = 0 then
      raise exception using
        errcode = '23514',
        message = 'Cannot delete the last active TASNIM owner';
    end if;

    return old;
  end if;

  return old;
end;
$function$;

revoke all on function private.prevent_last_owner_removal() from public, anon, authenticated;
drop trigger if exists protect_last_owner_account on auth.users;
create trigger protect_last_owner_account
before update of raw_app_meta_data, deleted_at or delete
on auth.users
for each row
execute function private.prevent_last_owner_removal();

commit;
