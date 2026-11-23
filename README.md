# TASNIM TRAVEL

تطبيق تسنيم للسفريات والسياحة — Expo / React Native.

## Connected backend
- Supabase project: `ecldmphkqxqicwirbbsy` (Singapore).
- Supabase Auth: customer sign-up and sign-in; staff sign-in is checked against trusted `app_metadata.role`.
- Database tables: `profiles`, `travel_services`, `bookings`.
- Database Row Level Security (RLS) is enabled.
- Private Storage bucket: `passport-documents` (10 MB per file; JPEG, PNG and PDF only).
- Edge Function: `create-staff`, JWT required; only a user with `app_metadata.role = owner` can create staff accounts.
- Staff permission claims: `bookings.read`, `bookings.update`, `services.read`, `services.manage`, `customers.read`, `reports.read`.

The app contains the Supabase project URL and publishable key only. A publishable key is intended for client apps; never put a service-role key, database password, or other secret in the app or public Git repository.

## Run locally
```bash
npm install
npx expo start
```

## Important setup before real use
1. Create the first owner account through the customer sign-up screen.
2. An organization/project owner must then promote that account to `app_metadata.role = owner` using a trusted administrative operation (never by editing user metadata from the app). Until this is done, staff creation is unavailable.
3. Configure the desired email-confirmation and password-reset behavior in Supabase Auth.
4. Test customer sign-up, email confirmation, login, booking submission, RLS isolation, staff permissions, and private document access on real devices.
5. Add document upload UI, booking assignment/audit trail, notifications, payment providers, and airline/hotel supplier APIs when the office has provider credentials.

## Scope and limitations
The current app supports customer account creation/login, customer booking requests and history, staff login, booking listing/status updates, and owner-only staff account creation with selectable permissions. Flight/hotel/visa suppliers, online payments, push notifications, and document upload UI are not integrated yet. A successful security-advisor scan is not a penetration test and does not guarantee that no vulnerability exists.

## Branding
- Product: TASNIM TRAVEL
- Arabic name: تسنيم للسفريات والسياحة
- Initial market: Yemen
- Planned platforms: Android and iOS
