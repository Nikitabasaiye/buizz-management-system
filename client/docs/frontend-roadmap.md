# Buizz Frontend Development Roadmap

## Purpose

This roadmap defines the recommended frontend delivery plan for Buizz across Customer, Organizer, Influencer, Admin, and Event Staff Scanner platforms. It assumes the architecture in `docs/frontend-architecture.md` and avoids business logic implementation details.

## Phase 1 - Foundation

Objective: Establish a stable frontend platform for all product surfaces.

Features:
- Next.js 15 App Router structure
- Tailwind tokens and global styles
- TypeScript strict configuration
- Provider shell for Query, Zustand, Motion, Theme, Toast, Auth
- Axios client and API error normalization
- Base route groups and layouts
- Environment configuration

Components required:
- `AppProviders`, `QueryProvider`, `AuthProvider`, `MotionProvider`
- `Button`, `Input`, `Card`, `Badge`, `Dialog`, `Sheet`, `Tabs`
- `PageHeader`, `Container`, `DashboardShell`, `EmptyState`, `ErrorState`

Pages required:
- Public home placeholder
- Login placeholder
- Customer account placeholder
- Organizer dashboard placeholder
- Influencer dashboard placeholder
- Admin dashboard placeholder
- Staff scanner placeholder

APIs required:
- `GET /health`
- `GET /auth/me`

Dependencies:
- Next.js, TypeScript, Tailwind CSS, Zustand, TanStack Query, Axios, Framer Motion

Complexity: P0, Medium

Implementation order:
1. Configure TypeScript, path aliases, linting, formatting
2. Create providers and route groups
3. Build design tokens and shared primitives
4. Add API client and query client
5. Add placeholder routes and layout guards

## Phase 2 - Authentication

Objective: Support secure login, session discovery, role switching, and route protection.

Features:
- Login, register, forgot password
- Session refresh through `/auth/me`
- Role-aware navigation
- Permission utilities
- Middleware route protection
- Auth error handling

Components required:
- `AuthFormShell`, `LoginForm`, `RegisterForm`, `PasswordResetForm`
- `RoleGate`, `PermissionGate`, `SessionLoader`

Pages required:
- `/login`
- `/register`
- `/forgot-password`
- role-specific unauthorized page

APIs required:
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`
- `POST /auth/forgot-password`

Dependencies:
- Foundation providers, Axios interceptors, auth store, Zod schemas

Complexity: P0, High

Implementation order:
1. Define auth types and schemas
2. Add auth API functions and query hooks
3. Build auth pages
4. Add middleware and layout guards
5. Validate role redirects

## Phase 3 - Customer Experience

Objective: Build event discovery, browsing, search, and event detail flows.

Features:
- City and category discovery
- Event listing and filters
- Event detail media, schedule, venue, pricing
- Search suggestions
- Wishlist
- Recommendations

Components required:
- `EventCard`, `EventGrid`, `EventRail`, `CategoryRail`, `SearchBar`
- `FilterDrawer`, `VenueMapPreview`, `PriceSummary`, `WishlistButton`

Pages required:
- `/`
- `/events`
- `/events/[eventSlug]`
- `/categories/[categorySlug]`
- `/search`
- `/wishlist`

APIs required:
- `GET /events`
- `GET /events/:id`
- `GET /categories`
- `GET /search/suggestions`
- `GET /recommendations`
- `POST /wishlist`
- `DELETE /wishlist/:eventId`

Dependencies:
- Auth optional session, query client, URL filter utilities

Complexity: P0, High

Implementation order:
1. Categories and city selector
2. Event list query and filters
3. Event detail composition
4. Search and recommendations
5. Wishlist states

## Phase 4 - Booking System

Objective: Enable customers to select tickets, checkout, pay, and receive confirmation.

Features:
- Ticket/pass selection
- Cart and booking summary
- Attendee details
- Coupon application
- Payment handoff
- Confirmation and ticket creation

Components required:
- `TicketSelector`, `BookingSummary`, `AttendeeForm`, `CouponInput`
- `PaymentStatus`, `BookingStepper`, `StickyCheckoutBar`

Pages required:
- `/checkout/[eventId]`
- `/checkout/[eventId]/payment`
- `/booking/confirmation/[bookingId]`

APIs required:
- `GET /events/:id/tickets`
- `POST /bookings/quote`
- `POST /bookings`
- `POST /payments/initiate`
- `GET /payments/:paymentId/status`

Dependencies:
- Customer event detail, auth, payment backend, booking store

Complexity: P0, Very High

Implementation order:
1. Ticket availability display
2. Booking form and Zod validation
3. Quote and summary
4. Payment initiation and status polling
5. Confirmation and ticket handoff

## Phase 5 - Customer Dashboard

Objective: Give customers a reliable account area for bookings, tickets, profile, and notifications.

Features:
- My bookings
- QR tickets
- Profile management
- Notification center
- Refund/cancellation request entry points

Components required:
- `BookingList`, `TicketQRCode`, `TicketDetail`, `ProfileForm`, `NotificationList`

Pages required:
- `/account`
- `/bookings`
- `/bookings/[bookingId]`
- `/tickets`
- `/tickets/[ticketId]`
- `/notifications`

APIs required:
- `GET /bookings/me`
- `GET /tickets/me`
- `GET /tickets/:ticketId`
- `PATCH /users/me`
- `GET /notifications`
- `PATCH /notifications/:id/read`

Dependencies:
- Auth, booking, notifications

Complexity: P1, Medium

Implementation order:
1. Account shell
2. Bookings list/detail
3. Tickets and QR views
4. Profile edit
5. Notifications

## Phase 6 - Organizer Platform

Objective: Provide organizers with tools to create events, manage bookings, monitor attendees, and track revenue.

Features:
- Organizer dashboard
- Event CRUD
- Media and schedule management
- Ticket inventory
- Attendee list
- Revenue and payouts
- Event analytics

Components required:
- `OrganizerMetricCards`, `EventEditor`, `TicketInventoryTable`
- `AttendeeTable`, `RevenueChart`, `PayoutStatus`

Pages required:
- `/organizer/dashboard`
- `/organizer/events`
- `/organizer/events/new`
- `/organizer/events/[eventId]`
- `/organizer/bookings`
- `/organizer/attendees`
- `/organizer/analytics`
- `/organizer/revenue`
- `/organizer/payouts`

APIs required:
- `GET /organizers/me`
- `GET /organizer/events`
- `POST /organizer/events`
- `PATCH /organizer/events/:id`
- `GET /organizer/events/:id/attendees`
- `GET /organizer/analytics`
- `GET /organizer/payouts`

Dependencies:
- Auth, role protection, events, analytics, forms

Complexity: P1, Very High

Implementation order:
1. Dashboard shell and metrics
2. Event list and creation flow
3. Event editing
4. Attendee and booking tools
5. Revenue and analytics

## Phase 7 - Influencer Platform

Objective: Support creator referrals, campaigns, performance tracking, and earnings visibility.

Features:
- Influencer profile
- Campaign marketplace
- Referral link generation
- Performance analytics
- Earnings summary
- Payout status

Components required:
- `CampaignCard`, `ReferralLinkCard`, `CreatorMetricCards`
- `EarningsChart`, `SharePanel`, `CampaignPerformanceTable`

Pages required:
- `/influencer/dashboard`
- `/influencer/campaigns`
- `/influencer/referrals`
- `/influencer/earnings`
- `/influencer/profile`

APIs required:
- `GET /influencers/me`
- `GET /influencer/campaigns`
- `POST /influencer/referrals`
- `GET /influencer/referrals`
- `GET /influencer/analytics`
- `GET /influencer/earnings`

Dependencies:
- Auth, analytics, payments/payouts, campaign backend

Complexity: P2, High

Implementation order:
1. Influencer dashboard
2. Campaign browsing
3. Referral link generation
4. Earnings and analytics
5. Profile

## Phase 8 - Admin Platform

Objective: Give internal teams full platform visibility and operational controls.

Features:
- Platform analytics
- User management
- Organizer verification
- Event moderation
- Influencer oversight
- Finance reports
- Notification broadcasting
- Settings and audit logs

Components required:
- `AdminMetricCards`, `DataTable`, `ModerationQueue`
- `VerificationPanel`, `FinanceReportTable`, `AuditLogTimeline`

Pages required:
- `/admin/dashboard`
- `/admin/users`
- `/admin/events`
- `/admin/organizers`
- `/admin/influencers`
- `/admin/finance`
- `/admin/reports`
- `/admin/moderation`
- `/admin/settings`

APIs required:
- `GET /admin/analytics`
- `GET /admin/users`
- `PATCH /admin/users/:id`
- `GET /admin/events`
- `PATCH /admin/events/:id/moderation`
- `GET /admin/organizers`
- `PATCH /admin/organizers/:id/verification`
- `GET /admin/reports`
- `GET /admin/audit-logs`

Dependencies:
- Auth, admin permissions, analytics, data tables

Complexity: P1, Very High

Implementation order:
1. Admin dashboard shell
2. Data table foundation
3. Users and organizers
4. Event moderation
5. Finance, reports, audit logs

## Phase 9 - Scanner Platform

Objective: Provide fast, mobile-first check-in tooling for event staff.

Features:
- Event selection
- QR scanner
- Manual ticket lookup
- Check-in success/error states
- Offline queue indicator
- Scan history

Components required:
- `ScannerViewport`, `ScanResultPanel`, `ManualLookupForm`
- `CheckInHistoryList`, `OfflineQueueBanner`

Pages required:
- `/staff/scanner`
- `/staff/scanner/[eventId]`
- `/staff/checkins`

APIs required:
- `GET /scanner/events`
- `POST /scanner/tickets/validate`
- `POST /scanner/checkins`
- `GET /scanner/checkins`

Dependencies:
- Auth, staff role, device camera permissions, ticket backend

Complexity: P0, High

Implementation order:
1. Staff shell
2. Event selection
3. Scanner UI states
4. Validate and check in
5. Scan history and offline indicators

## Phase 10 - Production Optimization

Objective: Harden the application for scale, quality, accessibility, and launch readiness.

Features:
- Performance budgets
- Route-level code splitting
- SEO metadata
- Error boundaries
- Accessibility checks
- Visual regression testing
- Analytics instrumentation
- Production environment validation

Components required:
- `GlobalErrorBoundary`, `RouteLoadingState`, `SeoMetadata`
- `AnalyticsProvider`, `FeatureFlagGate`

Pages required:
- Error pages
- Not-found pages
- Maintenance/unsupported browser page

APIs required:
- `POST /analytics/events`
- `GET /config/frontend`

Dependencies:
- All major feature surfaces

Complexity: P0, High

Implementation order:
1. Error/loading states
2. SEO and metadata
3. Bundle analysis and lazy loading
4. Accessibility pass
5. Observability and release checks

## Frontend Task Board

| Status | Work Type | Examples |
| --- | --- | --- |
| Backlog | Feature planning | Module specs, API contracts, acceptance criteria |
| Ready | Buildable tasks | Typed API hooks, page skeletons, form schemas |
| In Progress | Active work | Components, route integration, styling |
| Review | Quality gate | PR review, accessibility, responsive checks |
| QA | Validation | User flow testing, API mocks, regression tests |
| Done | Release-ready | Merged, documented, verified |

## Component Checklist

| Component | Priority | Owner Surface |
| --- | --- | --- |
| Button, Input, Select, Textarea | P0 | Shared |
| Dialog, Sheet, Drawer, Tabs | P0 | Shared |
| Toast, EmptyState, ErrorState, Skeleton | P0 | Shared |
| EventCard, EventRail, EventGrid | P0 | Customer |
| TicketSelector, BookingSummary | P0 | Booking |
| TicketQRCode, BookingList | P1 | Customer |
| DashboardShell, MetricCard, DataTable | P0 | Organizer/Admin |
| RevenueChart, BookingTrendChart | P1 | Analytics |
| ScannerViewport, ScanResultPanel | P0 | Staff |
| ReferralLinkCard, CampaignCard | P2 | Influencer |

## Reusable Component Inventory

- UI primitives: controls, overlays, feedback, typography, cards
- Layout primitives: containers, shells, sidebars, topbars, responsive grids
- Form primitives: field wrapper, validation message, upload, date/time controls
- Data primitives: table, pagination, filters, sort controls
- Chart primitives: line, bar, area, donut, KPI cards
- Motion primitives: page transition, reveal, animated list, reduced-motion helpers

## Page Inventory

- Public: home, events, event detail, categories, search
- Auth: login, register, forgot password, unauthorized
- Customer: account, bookings, ticket detail, wishlist, notifications, checkout
- Organizer: dashboard, events, event editor, bookings, attendees, analytics, revenue, payouts
- Influencer: dashboard, campaigns, referrals, earnings, profile
- Admin: dashboard, users, events, organizers, influencers, finance, reports, moderation, settings
- Staff: scanner home, event scanner, check-in history

## Feature Inventory

- Authentication and RBAC
- Discovery and search
- Events and categories
- Tickets and booking
- Payments
- Customer account
- Organizer operations
- Influencer campaigns
- Admin operations
- Notifications
- Analytics
- Scanner and check-in

## API Inventory

- Auth: login, register, logout, refresh, me
- Users: profile, preferences, role metadata
- Events: list, detail, create, update, publish, moderate
- Categories: list, hierarchy
- Tickets: inventory, customer tickets, validation
- Bookings: quote, create, status, cancel
- Payments: initiate, verify, refund status
- Notifications: list, read, preferences
- Organizers: profile, events, attendees, payouts
- Influencers: campaigns, referrals, earnings
- Analytics: customer, organizer, influencer, admin metrics
- Admin: users, moderation, verification, finance, reports
- Scanner: scanner events, validate ticket, check in, history
