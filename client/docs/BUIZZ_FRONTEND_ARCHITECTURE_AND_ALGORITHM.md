# Buizz Frontend Architecture and Algorithm

## Scope

Buizz is a frontend-only Next.js event discovery, booking, ticketing, organizer, admin, and future super-admin product surface.

This repository must stay frontend-only until backend contracts exist.

Do not implement backend APIs, databases, real OTP, real WhatsApp delivery, or real payments in this codebase. Use Next.js, TypeScript, Zustand, localStorage, mock data, and the existing Buizz visual system.

## Current Repository Shape

```text
src/app
  (public)       Public website, auth, discovery, detail, booking, scanner
  (customer)     Profile, tickets, wishlist, passport, settings
  (organizer)    Organizer landing, auth, onboarding, dashboard routes
  (admin)        Admin placeholder routes
  (super-admin) Super Admin control dashboard routes

src/components
  common         Navbar, footer, location picker, shared form pieces
  layouts        Public, customer, organizer, admin layout wrappers
  ui             Low-level reusable UI primitives
  event          Legacy/shared event components
  booking        Booking-specific components
  profile        Profile-specific components
  dashboard      Metric/chart components

src/features
  account        Public auth, profile, tickets, passport, scanner pages
  booking        Booking flow, ticket pass, payment placeholder
  discovery      Events, plays, activities data and page templates
  events         Homepage and legacy events page
  organizer      Organizer landing/auth/onboarding/dashboard prototype

src/store
  app.store      Theme, selected city, app preferences
  auth.store     Current public auth implementation with localStorage
  authStore      Legacy duplicate auth store
  bookingStore   Basic ticket-selection state
  eventStore     Selected event state
  ticket.store   Tickets, QR status, passport stamps, scanner check-in
  userStore      Basic profile state
  wishlist.store Wishlist persistence
  permissionStore Admin and organizer feature permissions
  superAdminStore Super Admin session, approvals, admins, events, users
```

## Design System Rules

The existing product language is dark-first with light mode support, purple/red accents, glass/elevated surfaces, rounded cards, compact event rails, strong typography, and the shared navbar/footer chrome.

Preserve these files as the design foundation:

```text
src/styles/tokens.css
src/styles/themes.css
src/styles/globals.css
src/components/common/Navbar/index.tsx
src/components/common/Footer/index.tsx
src/components/layouts/PublicLayout/index.tsx
```

## Route Architecture

Public routes currently include:

```text
/
/events
/events/[id]
/events/category/[slug]
/plays
/plays/[id]
/plays/category/[slug]
/activities
/activities/[id]
/activities/category/[slug]
/booking/[id]
/booking/success/[bookingId]
/login
/signup
/forgot-password
/reset-password
/scan-ticket
/about
/contact
/privacy
/terms
```

Customer routes currently include:

```text
/profile
/profile/bookings
/profile/tickets
/profile/wishlist
/profile/passport
/profile/settings
/profile/notifications
/profile/saved-events
```

Organizer routes currently include:

```text
/organizer
/organizer/login
/organizer/signup
/organizer/onboarding
/organizer/dashboard
/organizer/create-event
/organizer/events
/organizer/attendees
/organizer/analytics
/organizer/payouts
/organizer/settings
```

Admin routes currently include:

```text
/admin/dashboard
/admin/users
/admin/events
/admin/bookings
/admin/payments
/admin/analytics
/admin/settings
```

New Super Admin routes:

```text
/super-admin
/super-admin/login
/super-admin/dashboard
```

Missing required route groups:

```text
/admin
/organizer/forgot-password
/organizer/my-events
/organizer/draft-events
/organizer/pending-events
/organizer/live-events
/organizer/bookings
/organizer/offline-bookings
/organizer/ticket-scanner
/organizer/revenue
/organizer/notifications
/profile/notifications as fully data-backed dummy workflow
/about-us
/careers
/blog
/contact-us
/help-center
/terms-and-conditions
/privacy-policy
/refund-policy
/faq
/all-cities
```

## State Architecture Target

Required stores:

```text
authStore
cityStore
eventStore
bookingStore
ticketStore
notificationStore
permissionStore
organizerStore
adminStore
superAdminStore
```

Current stores now include the Phase 1 `permissionStore` and `superAdminStore`. The app still has `app.store.ts` for city/theme, `auth.store.ts` for public auth, and a legacy `authStore.ts` duplicate. Before broad auth work, consolidate imports around one auth source or create role-specific stores with clear names.

## Dummy Data Target

Required mock domains:

```text
users
organizers
admins
permissions
events
ticketTypes
bookings
tickets
notifications
passportStamps
offlineBookings
approvalRequests
```

Current dummy data exists mainly inside discovery data, auth localStorage helpers, organizer prototype pages, and ticket store persistence. Phase work should move role/product data into typed frontend domain files or stores without creating backend services.

## Core Algorithms

### City Selection Algorithm

1. Read selected city from persisted app state.
2. Only city-specific sections should change headings/content like `Upcoming Events in Pune`.
3. Discovery rails and global recommendation sections should continue mixing global dummy data.
4. At render time, replace Pune-specific text with selected city only for city-context labels, venue display, and city-specific upcoming sections.

Current state: implemented broadly through `useAppStore.selectedCity`, `LocationSelector`, and helper text replacement. Needs tightening so only required upcoming sections are city-specific.

### Discovery Filter Algorithm

1. Start from the relevant dummy item pool: events, plays, or activities.
2. Normalize search query to lowercase.
3. Filter by category, quick filters, primary filter, secondary filter, price, and more filters.
4. Sort by popularity, rating, price, date, or distance.
5. Render grid/list cards and empty states.
6. For category pages, generate enough dummy inventory using category mock creation.

Current state: mostly implemented in `src/features/discovery/components/DiscoveryPageTemplate.tsx`.

### Public Signup Algorithm

Required target:

1. User enters name, email, phone, password, confirm password.
2. User verifies email with mock OTP `123456`.
3. User verifies phone with mock OTP `123456`.
4. Store normalized user in localStorage.
5. Phone note must be visible: `This number will be used for WhatsApp ticket delivery.`

Current state: partial. Signup supports either email OTP or phone OTP, not both in one required flow.

### Login Algorithm

1. Accept email plus password or phone plus password.
2. Look up mock account in localStorage.
3. If password matches, persist current auth user and navigate to profile.

Current state: implemented in `AuthPages.tsx` and `mockAuth.ts`.

### Forgot Password Algorithm

1. User enters email or phone.
2. Validate that a mock account exists.
3. Send mock OTP `123456`.
4. Verify OTP.
5. Set new password and confirm password.
6. Navigate to login.

Current state: implemented in `ResetPasswordPage`, but route naming should be aligned with `/forgot-password`.

### Booking Algorithm Target

Required target flow:

```text
Step 1: City, venue, date, time
Step 2: Ticket type and quantity, max 10
Step 3: Review
```

Free tickets:

1. If ticket price is `0`, skip payment.
2. Generate booking, ticket, QR placeholder, and notification immediately.
3. Store ticket in profile.

Paid tickets:

1. Continue to payment placeholder.
2. Call `initiatePayment()`.
3. Do not generate ticket immediately.
4. Only `handlePaymentSuccess()` can create ticket, QR, and notification.

Current state: booking is more advanced but not minimal. It has date/time, experience zones, group planning, delivery verification, review, payment placeholder, ticket generation after `handlePaymentSuccess()`, and a 10-ticket cap in the selector. It needs refactoring to the required three-step flow and explicit free-ticket handling.

### Ticket Pass Algorithm

1. Store generated ticket in `ticket.store.ts`.
2. Show event image, event name, booking ID, ticket ID, QR placeholder, venue, city, date, time, category, buyer, phone, and status.
3. Support Download Pass, Share Pass, Add To Calendar, and View My Tickets.

Current state: mostly implemented through `QRTicket`, `downloadPass`, `sharePass`, and calendar file generation.

### Passport Unlock Algorithm

1. Ticket starts as `Valid`.
2. Payment alone does not unlock passport.
3. Scanner marks ticket as `Used`.
4. Store attendance timestamp.
5. Infer and unlock passport stamp.

Current state: implemented in `ticket.store.ts` and `MockTicketScannerPage`.

### Approval Workflow Algorithm

Organizer event:

```text
Pending Admin Approval
Pending Super Admin Approval
Live
```

Admin-created event:

```text
Live
```

Super Admin-created event:

```text
Live
```

Current state: missing except as placeholders.

### Permission Algorithm

1. Load role permission records from localStorage.
2. Super Admin can toggle admin and organizer permissions.
3. Admin and organizer navigation should hide unavailable features.
4. Permission state must not delete mock data; it should only gate UI.

Current state: permission toggles and localStorage persistence are implemented. Admin and organizer feature hiding still needs to be wired during those phases.

### Route Transition Loading Algorithm

Required target:

1. Each route segment should show a premium loading shell.
2. Loading shell includes Buizz logo, skeleton placeholders, soft shimmer, and fast transition.
3. No route should show blank screens.

Current state: no global route loading system is present yet.

## Backend Dependency Boundaries

Frontend placeholders may exist for:

```text
initiatePayment()
handlePaymentSuccess()
sendOtp()
verifyOtp()
sendWhatsAppTicket()
approveOrganizer()
approveEvent()
rejectOrganizer()
rejectEvent()
uploadOrganizerDocument()
uploadEventMedia()
scanQr()
generateReport()
```

These must remain mock/localStorage functions until backend contracts are provided.

## Production Risks

- Duplicate auth stores can create inconsistent auth state.
- Admin and organizer modules are mostly placeholders.
- Super Admin exists, but deeper detail routes can be added later.
- Footer links are not all functional yet.
- No route-level `loading.tsx` implementation exists.
- Public signup does not yet require both email and phone verification.
- Booking does not yet match the required minimal three-step flow.
- Notifications are not centralized in a store.
- Permissions are not implemented.
- Build can pass while visual responsiveness still needs browser QA.











No. For a platform like **Buizz** (similar to BookMyShow + Eventbrite + Townscript), there can easily be **60–100+ modules**. We should not build everything immediately, but it's useful to know the complete roadmap.

# Phase 1 — Core Platform (1–20)

1. Event Creation & Management
2. Ticket Types & Pricing
3. Seat Maps & Seat Blocks
4. Event Listing
5. Event Details
6. Search & Filters
7. Booking Flow
8. Checkout
9. QR Ticket Generation
10. QR Ticket Scanning
11. Attendee Management
12. User Authentication
13. User Profile
14. Organizer Dashboard
15. Admin Dashboard
16. Super Admin Dashboard
17. Event Approval Workflow
18. Organizer Verification
19. Notifications
20. Reviews & Ratings

# Phase 2 — Business Features (21–40)

21. Payments
22. Payouts
23. Commission System
24. Coupons
25. Discounts
26. Refunds
27. Cancellation Policy
28. Invoices
29. GST Billing
30. Analytics
31. Reports
32. Sales Dashboard
33. Featured Events
34. Homepage Banners
35. Category Management
36. City Management
37. Venue Management
38. Support Tickets
39. FAQ Center
40. CMS Pages

# Phase 3 — Growth Features (41–60)

41. Wishlist
42. Favorites
43. Event Sharing
44. Recommendations
45. Related Events
46. Email Campaigns
47. WhatsApp Campaigns
48. Push Notifications
49. Event Gallery
50. Videos
51. Sponsors
52. Vendors
53. Merchandise
54. Digital Products
55. Memberships
56. Loyalty Points
57. Wallet
58. Referral System
59. Affiliate System
60. Influencer Program

# Phase 4 — Enterprise Features (61–80)

61. Staff Management
62. Sub-admin Roles
63. Permissions
64. Audit Logs
65. Activity Logs
66. Multi-organizer Support
67. Team Management
68. API Keys
69. Webhooks
70. Custom Domains
71. White-label Platform
72. Multi-language
73. Multi-currency
74. Tax Rules
75. Fraud Detection
76. Duplicate Ticket Detection
77. Device Tracking
78. Session Tracking
79. Data Export
80. Backup & Restore

# Phase 5 — Advanced Features (81–100)

81. AI Recommendations
82. AI Analytics
83. Dynamic Pricing
84. Smart Seat Allocation
85. Live Streaming
86. Hybrid Events
87. Virtual Events
88. Calendar Sync
89. Google Maps Integration
90. Venue Maps
91. Waitlist
92. Pre-registration
93. Passes & Badges
94. Certificates
95. Check-in History
96. Attendance Reports
97. Kiosk Mode
98. POS System
99. Offline Ticket Validation
100. Mobile App Support

---

### For your current Buizz project, I recommend building modules **1–20 first**, then moving module by module across **Public Website → Organizer → Admin → Super Admin** so that nothing is missed.
   



   Public Website
↓
User Flow
↓
Organizer Panel
↓
Admin Panel
↓
Super Admin Panel
↓
Backend/API requirements ( this willl backend dev will do nt us)
↓
Notifications & Analytics
↓
UI/UX improvements