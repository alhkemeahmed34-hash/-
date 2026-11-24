# TASNIM TRAVEL — Phase 1 security rollout

## Scope

The migration `20261124000100_phase1_security_hardening.sql` is a reviewed source file only. It has **not** been applied to the hosted Supabase project.

It:
- removes direct UPDATE/DELETE access to bookings from client roles;
- adds `public.update_booking_status(uuid,text)`, which changes only status and requires `bookings.update`;
- preserves booking ownership and pending-only customer inserts;
- limits customer profile, booking, and passport reads to the signed-in user;
- limits staff access through the existing `public.has_staff_permission()` helper;
- keeps passport storage private and removes client-side overwrite/delete policies;
- removes service DELETE permission so services are hidden through `is_active=false` and blocks privileged deletion of a service linked to bookings;
- adds a database trigger that prevents deletion, soft deletion, or demotion of the final active owner.

## Important current-state notes

- The hosted project currently has **zero** users with `app_metadata.role = owner`. The last-owner trigger protects the system after the first owner is provisioned; it does not create an owner. Staff creation will continue to reject callers until a first owner is established through a trusted administrative process.
- The existing `create-staff` Edge Function already checks the caller's trusted `app_metadata.role` and hard-codes new accounts to `role: "staff"`. It does not accept a caller-supplied role. No service-role key is added to the client or repository.
- Authenticated users currently have no SQL UPDATE privilege on `auth.users`; Supabase stores authorization roles in `app_metadata`, not editable `user_metadata`.
- The migration intentionally does not run any SQL against production.

## Client compatibility change

`App.tsx` now calls the status RPC instead of issuing a direct table UPDATE. This must be deployed together with the migration. Until the migration is applied, status changes from the updated client will fail because the RPC will not exist yet.

## Local verification

This repository currently has no `supabase/config.toml`. The migration and tests are committed, but the Supabase CLI local project is not initialized here. Do not run CLI migration commands until a local configuration has been created and checked.

After initializing a disposable local Supabase project and applying this migration locally, run:

```sh
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase1_security.sql
```

Use only the local database URL printed by your local Supabase setup; never point this test file at the hosted production database. The test file creates temporary auth users, bookings, and passport-object rows inside a transaction and rolls everything back. The last-owner destructive test is skipped if the local database already has an active owner.

These tests have been authored but have **not** been executed in this environment. This runtime has no `psql` or Supabase CLI installed, so SQL execution and migration parsing remain unverified. They do not replace Android device testing.

## Leaked-password protection

This is a hosted Auth project setting, not a PostgreSQL migration. In the Supabase Dashboard open:

**Authentication → Sign In / Providers → Email → Prevent use of leaked passwords**

Supabase documents that this HaveIBeenPwned-backed feature is available on Pro plans and above. If the setting is unavailable on the current plan, set the strongest available password length/character requirements and revisit after upgrading. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security).

## Safe rollout order

1. Review the migration and local test file.
2. Run the migration and tests on local Supabase first.
3. Confirm the first owner account through a trusted administrative process.
4. Apply the migration to the hosted project only after explicit approval.
5. Deploy the updated app build after the database migration is live.
6. Re-run the Supabase Security Advisor and verify customer/staff isolation using separate test accounts.
