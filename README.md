# TASNIM TRAVEL

تطبيق تسنيم للسفريات والسياحة — Expo / React Native.

## Connected backend
- Supabase project: `ecldmphkqxqicwirbbsy` (Singapore).
- Supabase Auth: customer sign-up and sign-in; staff sign-in is checked against trusted `app_metadata.role`.
- Database tables: `profiles`, `travel_services`, `bookings`.
- Row Level Security (RLS) is enabled on application tables.
- Private Storage bucket: `passport-documents` (10 MB per file; JPEG/PNG/PDF).
- Edge Function: `create-staff`, JWT required; only a user with `app_metadata.role = owner` can create staff accounts.
- Staff permission claims: `bookings.read`, `bookings.update`, `services.read`, `services.manage`, `customers.read`, `reports.read`.

The app contains only the Supabase project URL and publishable key. Never put a service-role key, database password, or other server secret in the app or public Git repository.

## Current app experience
- Arabic customer sign-up/login and separate staff login.
- Customer home with travel-service categories, destination offers, offer pricing and optional travel dates.
- Customer booking requests and booking-history status labels.
- Owner/staff dashboard with permission-aware booking actions.
- Owner can publish offers with category, destination, description, price and optional date range.
- Owners can hide an offer without deleting the related booking history.
- Owner-only staff creation with individually selected permissions.
- Remote travel imagery currently uses category images; custom offer-image upload is not implemented yet.

## Run locally
```bash
npm install
npx expo start
```

## Required production setup
1. Create the first account through customer sign-up.
2. Promote the intended owner account to `app_metadata.role = owner` through a trusted administrative operation. Do not set roles from client-side code or editable user metadata.
3. Configure email confirmation and password recovery in Supabase Auth.
4. Enable Supabase leaked-password protection before public launch.
5. Test sign-up, email confirmation, login, booking creation, customer row isolation, staff permissions, offer publishing/hiding and private document access on real devices.
6. Keep a secure owner recovery procedure and rotate any credential that has ever been exposed in chat or source control.

## Not integrated yet
- Airline, hotel and visa-provider APIs or live inventory.
- Online payments and refunds.
- Push notifications or in-app chat.
- Passport/document upload screens.
- Custom photo upload for offers.
- Booking assignment, detailed audit history and reporting dashboards.

A successful type check or security-advisor scan is not a penetration test and does not guarantee that no vulnerability exists.

## Branding
- Product: TASNIM TRAVEL
- Arabic name: تسنيم للسفريات والسياحة
- Initial market: Yemen
- Planned platforms: Android and iOS
