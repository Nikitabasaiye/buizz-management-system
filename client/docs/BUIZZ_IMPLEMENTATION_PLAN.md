# Buizz Frontend Implementation Plan

## Non-Negotiables

- Frontend only.
- No backend creation.
- No APIs, database, real OTP, real WhatsApp, or real payment integration.
- Use Next.js, TypeScript, Zustand, localStorage, dummy data, and existing Buizz styling.
- Keep navbar, footer, theme toggle, purple/red accents, glass surfaces, rounded cards, and current typography.
- Run `npm.cmd run build` after implementation phases.

## Implementation Order

### Phase 1: Super Admin

Goal: Create the missing Super Admin surface first.

Status: Completed in current frontend pass.

Tasks:

1. Add routes:
   - `/super-admin`
   - `/super-admin/login`
   - `/super-admin/dashboard`
2. Create `superAdminStore` with localStorage persistence.
3. Create `permissionStore` with admin and organizer permission toggles.
4. Add dummy data for admins, organizers, permissions, approval requests, events, users, revenue, and reports.
5. Build Super Admin dashboard sections:
   - Organizer Approvals
   - Event Approvals
   - Admin Management
   - Permission Management
   - User Management
   - Event Management
   - Revenue Dashboard
   - Reports
   - Settings
6. Implement permission toggles:
   - Admin: Approve Organizers, Approve Events, Manage Users, Manage Events, View Revenue, View Reports
   - Organizer: Create Events, Edit Events, View Bookings, Offline Booking, Ticket Scanner, View Revenue, Manage Attendees
7. Store all changes in localStorage.
8. Add badges for approval states.

Exit criteria:

- Super Admin routes do not 404.
- Permission toggles persist after refresh.
- Dashboard cards and approval tables are responsive.
- No unavailable action appears as a dead button.

Current result:

- Added `/super-admin`, `/super-admin/login`, and `/super-admin/dashboard`.
- Added `superAdminStore`, `permissionStore`, and typed mock platform data.
- Added approval actions, admin status controls, revenue cards, reports, user/event tables, and settings notes.
- Build passed with `npm.cmd run build`.

### Phase 2: Organizer

Goal: Turn organizer from prototype into a full frontend workflow.

Tasks:

1. Add `/organizer/forgot-password`.
2. Refactor organizer signup:
   - Mobile verification
   - General information
   - Document upload
   - Agreement
   - Pending approval
3. Expand onboarding fields:
   - Organization Name
   - PAN
   - Address
   - GSTIN
   - ITR Status
   - Contact Person
   - Email
   - Mobile
   - Bank Details
4. Add document upload UI:
   - PAN
   - Address Proof
   - Bank Proof
   - GST Certificate
   - Identity Proof
5. Add organizer pages:
   - My Events
   - Draft Events
   - Pending Events
   - Live Events
   - Bookings
   - Offline Bookings
   - Ticket Scanner
   - Revenue
   - Notifications
6. Implement event creation form and ticket type builder.
7. Implement COD offline booking.
8. Implement organizer scanner that marks tickets as checked in and unlocks passport stamps.
9. Hide unavailable features based on organizer permissions.

Exit criteria:

- Organizer workflows use localStorage.
- Organizer pages are reachable from navigation.
- Permission gating is visible and consistent.
- Event creation supports at least one ticket type and multiple ticket types.

### Phase 3: Admin

Goal: Replace admin placeholders with operational frontend screens.

Tasks:

1. Add `/admin` index route.
2. Replace placeholder dashboard with analytics overview.
3. Add organizer approval UI.
4. Add event approval UI.
5. Add users, events, reports, notifications, and settings surfaces.
6. Implement approve/reject actions using localStorage approval requests.
7. Respect admin permission toggles set by Super Admin.

Exit criteria:

- Admin routes are functional and permission-aware.
- Approval actions update localStorage state and badges.
- Placeholder pages are removed or converted into real mock dashboards.

### Phase 4: Public User Improvements

Goal: Align public user flow with client requirements.

Tasks:

1. Add premium route loading states across public, customer, organizer, admin, and super-admin route groups.
2. Refactor public signup to require both email OTP and phone OTP.
3. Show phone note: `This number will be used for WhatsApp ticket delivery.`
4. Align forgot password route and flow.
5. Add centralized `notificationStore`.
6. Add dummy notifications:
   - Booking confirmed
   - Ticket delivered
   - Event reminder
   - Refund update
   - Passport unlocked
7. Refactor booking to the required 3-step flow.
8. Implement free-ticket immediate generation.
9. Keep paid-ticket generation behind `handlePaymentSuccess()`.
10. Tighten city logic so only upcoming sections are city-specific.
11. Update footer:
   - Remove Press
   - Add required pages
   - Make every link functional
   - Add `Developed by Aventra Innovations`
   - Store newsletter subscriptions in localStorage

Exit criteria:

- No blank route transitions.
- Signup requires both OTP checks.
- Free events produce tickets immediately.
- Paid events never produce tickets before payment success.
- Footer links all route to real pages.

### Phase 5: Documentation

Goal: Keep docs aligned after implementation.

Tasks:

1. Update `BUIZZ_FRONTEND_ARCHITECTURE_AND_ALGORITHM.md`.
2. Update `BUIZZ_FRONTEND_STATUS_REPORT.md`.
3. Update this implementation plan with completed/remaining tasks.
4. Document frontend-only backend dependency placeholders.
5. Document production risks and next recommended phase.

Exit criteria:

- Docs match source state.
- Gap analysis is current.
- Backend dependencies are clearly marked.

### Phase 6: Build Verification

Goal: Verify the final frontend state.

Tasks:

1. Run:

```bash
npm.cmd run build
```

2. Fix TypeScript errors.
3. Fix import errors.
4. Fix route errors.
5. Smoke check important routes:
   - `/`
   - `/events`
   - `/plays`
   - `/activities`
   - `/booking/[id]`
   - `/profile`
   - `/organizer`
   - `/admin`
   - `/super-admin`
6. Perform responsive visual QA for mobile, tablet, laptop, desktop.
7. Check theme appearance and navigation.

Exit criteria:

- Build passes.
- No broken required routes.
- No obvious responsive overflow.
- No blank loading screens.

## Next Recommended Phase

Start with Phase 2: Organizer.

Phase 1 code units added:

1. `src/store/permissionStore.ts`
2. `src/store/superAdminStore.ts`
3. `src/lib/mockPlatformData.ts`
4. `src/app/(super-admin)/layout.tsx`
5. `src/app/(super-admin)/super-admin/page.tsx`
6. `src/app/(super-admin)/super-admin/login/page.tsx`
7. `src/app/(super-admin)/super-admin/dashboard/page.tsx`

This creates the permission foundation required by Organizer and Admin phases.
