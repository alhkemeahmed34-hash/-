# TASNIM TRAVEL

Mobile application starter for **تسنيم للسفريات والسياحة**.

## Current prototype
- Expo / React Native / TypeScript foundation.
- Arabic-first, right-to-left styled screens.
- Separate entry choices for customers and staff.
- Customer home screen with travel service categories.
- Staff/admin dashboard preview.

## Important status
This is an initial UI prototype only. Authentication, employee authorization, database persistence, booking workflows, notifications, payments, airline/hotel supplier integrations, and production security are **not yet connected**. The current sign-in and dashboard navigation are demo-only and must not be used to protect real business data.

## Run locally
```bash
npm install
npx expo start
```

## Next implementation milestones
1. Connect Supabase Auth and database.
2. Implement server-controlled roles (owner/admin/staff/customer); never trust a role selected by the client.
3. Enable Row Level Security on every exposed table and verify policies.
4. Add booking request lifecycle and staff assignment.
5. Add secure private document storage for passports and travel documents.
6. Add payment and supplier integrations only after provider accounts and credentials are supplied.
7. Run device tests and security review before release.

## Branding
- Product: TASNIM TRAVEL
- Arabic name: تسنيم للسفريات والسياحة
- Initial market: Yemen
- Planned platforms: Android and iOS
- Logo: to be added after approval