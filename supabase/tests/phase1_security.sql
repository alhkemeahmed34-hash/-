-- TASNIM TRAVEL Phase 1 security smoke tests.
-- Run ONLY against a local Supabase database after applying the migration:
--   supabase test db
-- This script creates fixed test fixtures inside a transaction and rolls them back.
begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '10000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'phase1-customer-a@example.invalid', '',
  pg_catalog.now(), '{}'::jsonb, '{"full_name":"Phase 1 A"}'::jsonb, pg_catalog.now(), pg_catalog.now()
),
(
  '10000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'phase1-customer-b@example.invalid', '',
  pg_catalog.now(), '{}'::jsonb, '{"full_name":"Phase 1 B"}'::jsonb, pg_catalog.now(), pg_catalog.now()
),
(
  '10000000-0000-0000-0000-000000000003',
  'authenticated', 'authenticated', 'phase1-staff-reader@example.invalid', '',
  pg_catalog.now(),
  '{"role":"staff","permissions":["bookings.read","customers.read"]}'::jsonb,
  '{"full_name":"Phase 1 Reader"}'::jsonb, pg_catalog.now(), pg_catalog.now()
),
(
  '10000000-0000-0000-0000-000000000004',
  'authenticated', 'authenticated', 'phase1-staff-limited@example.invalid', '',
  pg_catalog.now(),
  '{"role":"staff","permissions":[]}'::jsonb,
  '{"full_name":"Phase 1 Limited"}'::jsonb, pg_catalog.now(), pg_catalog.now()
),
(
  '10000000-0000-0000-0000-000000000005',
  'authenticated', 'authenticated', 'phase1-staff-updater@example.invalid', '',
  pg_catalog.now(),
  '{"role":"staff","permissions":["bookings.update"]}'::jsonb,
  '{"full_name":"Phase 1 Updater"}'::jsonb, pg_catalog.now(), pg_catalog.now()
);

insert into public.travel_services (
  id, category, title, description, price, currency, is_active
) values (
  '30000000-0000-0000-0000-000000000001',
  'flight', 'Phase 1 test service', 'Test fixture', 100, 'YER', true
);

insert into public.bookings (
  id, customer_id, service_id, service_category, customer_name, customer_phone, status, details
) values
(
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'flight', 'Customer A', '0000000001', 'pending', '{}'::jsonb
),
(
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'flight', 'Customer B', '0000000002', 'pending', '{}'::jsonb
);

insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
values
(
  'passport-documents',
  '10000000-0000-0000-0000-000000000001/passport-a.pdf',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '{"mimetype":"application/pdf"}'::jsonb
),
(
  'passport-documents',
  '10000000-0000-0000-0000-000000000002/passport-b.pdf',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '{"mimetype":"application/pdf"}'::jsonb
);

-- Customer A session.
select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{}}',
  true
);
set local role authenticated;

do $test$
declare
  visible_count integer;
  booking_status text;
begin
  select count(*)::integer into visible_count
  from public.bookings
  where id in (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002'
  );
  if visible_count <> 1
     or not exists (select 1 from public.bookings where id = '20000000-0000-0000-0000-000000000001')
     or exists (select 1 from public.bookings where id = '20000000-0000-0000-0000-000000000002') then
    raise exception 'FAIL: customer A must see only booking A; got % visible test bookings', visible_count;
  end if;

  select count(*)::integer into visible_count
  from public.profiles
  where id in (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  );
  if visible_count <> 1 then
    raise exception 'FAIL: customer A must see only their own profile; got %', visible_count;
  end if;

  select count(*)::integer into visible_count
  from storage.objects
  where bucket_id = 'passport-documents'
    and name like '10000000-0000-0000-0000-00000000000%/passport-%.pdf';
  if visible_count <> 1
     or not exists (select 1 from storage.objects where bucket_id = 'passport-documents' and name = '10000000-0000-0000-0000-000000000001/passport-a.pdf')
     or exists (select 1 from storage.objects where bucket_id = 'passport-documents' and name = '10000000-0000-0000-0000-000000000002/passport-b.pdf') then
    raise exception 'FAIL: customer A must see only passport A; got % visible test files', visible_count;
  end if;

  if pg_catalog.has_table_privilege('authenticated', 'public.bookings', 'UPDATE') then
    raise exception 'FAIL: authenticated must not have direct UPDATE privilege on bookings';
  end if;

  begin
    perform public.update_booking_status(
      '20000000-0000-0000-0000-000000000001',
      'confirmed'
    );
    raise exception 'FAIL: customer unexpectedly changed booking status through RPC';
  exception
    when insufficient_privilege then
      null;
  end;

  select status into booking_status
  from public.bookings
  where id = '20000000-0000-0000-0000-000000000001';
  if booking_status <> 'pending' then
    raise exception 'FAIL: customer changed booking status; found %', booking_status;
  end if;

  if pg_catalog.has_table_privilege('authenticated', 'auth.users', 'UPDATE') then
    raise exception 'FAIL: authenticated must not be able to update auth.users/app_metadata';
  end if;
end;
$test$;

-- Customer B session: the same isolation must hold in the opposite direction.
select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{}}',
  true
);

do $test$
declare visible_count integer;
begin
  select count(*)::integer into visible_count
  from public.bookings
  where id in (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002'
  );
  if visible_count <> 1
     or not exists (select 1 from public.bookings where id = '20000000-0000-0000-0000-000000000002')
     or exists (select 1 from public.bookings where id = '20000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL: customer B must see only booking B; got % visible test bookings', visible_count;
  end if;

  select count(*)::integer into visible_count
  from storage.objects
  where bucket_id = 'passport-documents'
    and name like '10000000-0000-0000-0000-00000000000%/passport-%.pdf';
  if visible_count <> 1
     or not exists (select 1 from storage.objects where bucket_id = 'passport-documents' and name = '10000000-0000-0000-0000-000000000002/passport-b.pdf')
     or exists (select 1 from storage.objects where bucket_id = 'passport-documents' and name = '10000000-0000-0000-0000-000000000001/passport-a.pdf') then
    raise exception 'FAIL: customer B must see only passport B; got % visible test files', visible_count;
  end if;
end;
$test$;

-- Staff reader session: only the explicit permissions grant access.
select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated","app_metadata":{"role":"staff","permissions":["bookings.read","customers.read"]}}',
  true
);

do $test$
declare visible_count integer;
begin
  select count(*)::integer into visible_count
  from public.bookings
  where id in (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002'
  );
  if visible_count <> 2 then
    raise exception 'FAIL: staff with bookings.read must see both test bookings; got %', visible_count;
  end if;

  select count(*)::integer into visible_count
  from public.profiles
  where id in (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  );
  if visible_count <> 2 then
    raise exception 'FAIL: staff with customers.read must see both test profiles; got %', visible_count;
  end if;

  select count(*)::integer into visible_count
  from storage.objects
  where bucket_id = 'passport-documents'
    and name like '10000000-0000-0000-0000-00000000000%/passport-%.pdf';
  if visible_count <> 2 then
    raise exception 'FAIL: staff with customers.read must see both test passport files; got %', visible_count;
  end if;
end;
$test$;

-- Staff without bookings.read must not see bookings.
select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated","app_metadata":{"role":"staff","permissions":[]}}',
  true
);

do $test$
declare visible_count integer;
begin
  select count(*)::integer into visible_count
  from public.bookings
  where id in (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002'
  );
  if visible_count <> 0 then
    raise exception 'FAIL: staff without bookings.read must not see bookings; got %', visible_count;
  end if;
end;
$test$;

-- Staff with bookings.update may change only status through the RPC.
select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated","app_metadata":{"role":"staff","permissions":["bookings.update"]}}',
  true
);

do $test$
declare booking_status text;
begin
  perform public.update_booking_status(
    '20000000-0000-0000-0000-000000000001',
    'confirmed'
  );

  select status into booking_status
  from public.bookings
  where id = '20000000-0000-0000-0000-000000000001';

  if booking_status <> 'confirmed' then
    raise exception 'FAIL: staff with bookings.update could not update status';
  end if;
end;
$test$;

reset role;

-- A linked service cannot be physically deleted, even by a privileged database role.
do $test$
begin
  begin
    delete from public.travel_services
    where id = '30000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: deleting a service linked to a booking was not blocked';
  exception
    when foreign_key_violation then
      null;
  end;

  if not exists (
    select 1 from public.travel_services
    where id = '30000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'FAIL: linked travel service disappeared';
  end if;
end;
$test$;

-- Exercise the last-owner guard only when this isolated test database has no
-- pre-existing active owner. Never touch an existing owner account.
do $test$
declare
  existing_owners integer;
  owner_fixture uuid := '10000000-0000-0000-0000-000000000006';
  blocked boolean;
begin
  select count(*)::integer into existing_owners
  from auth.users
  where coalesce(raw_app_meta_data ->> 'role', '') = 'owner'
    and deleted_at is null;

  if existing_owners = 0 then
    insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      owner_fixture, 'authenticated', 'authenticated',
      'phase1-owner-guard@example.invalid', '', pg_catalog.now(),
      '{"role":"owner"}'::jsonb, '{}'::jsonb, pg_catalog.now(), pg_catalog.now()
    );

    blocked := false;
    begin
      delete from auth.users where id = owner_fixture;
    exception
      when check_violation then blocked := true;
    end;
    if not blocked then
      raise exception 'FAIL: deleting the last active owner was not blocked';
    end if;

    blocked := false;
    begin
      update auth.users
      set raw_app_meta_data = '{"role":"staff"}'::jsonb
      where id = owner_fixture;
    exception
      when check_violation then blocked := true;
    end;
    if not blocked then
      raise exception 'FAIL: demoting the last active owner was not blocked';
    end if;
  else
    raise notice 'SKIP: last-owner destructive test because this database already has an active owner';
  end if;
end;
$test$;

rollback;
