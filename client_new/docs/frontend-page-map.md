# Buizz Frontend Page Map and Navigation Architecture

## Purpose

This document maps every planned Buizz frontend page by role, route path, layout, required components, APIs consumed, and access permissions. It is based on the frontend architecture, roadmap, API contract, and design system.

No page implementation or business logic is defined here.

## Layouts

| Layout | Used By | Purpose |
| --- | --- | --- |
| `RootLayout` | All routes | Providers, metadata, global styles |
| `PublicLayout` | Public discovery | Header, search, footer, discovery motion |
| `CustomerLayout` | Customer account and booking | Account nav, mobile bottom nav |
| `AuthLayout` | Auth routes | Minimal centered secure forms |
| `DashboardLayout` | Organizer, Influencer, Admin | Sidebar, topbar, command/search, content |
| `StaffScannerLayout` | Staff routes | Compact mobile-first scanner shell |

## Customer and Public Pages

| Page | Route | Layout | Required Components | APIs Consumed | Access Permission |
| --- | --- | --- | --- | --- | --- |
| Home | `/` | `PublicLayout` | `SearchBar`, `CategoryRail`, `EventRail`, `EventCard` | `GET /events`, `GET /categories`, `GET /recommendations` | Public |
| Events | `/events` | `PublicLayout` | `EventGrid`, `FilterDrawer`, `SearchBar`, `Pagination` | `GET /events`, `GET /categories` | Public |
| Event Detail | `/events/[eventSlug]` | `PublicLayout` | `EventHero`, `VenueMapPreview`, `TicketSelectorPreview`, `WishlistButton` | `GET /events/:eventId`, `GET /events/:eventId/tickets` | Public |
| Category | `/categories/[categorySlug]` | `PublicLayout` | `CategoryHeader`, `EventGrid`, `FilterDrawer` | `GET /events`, `GET /categories` | Public |
| Search | `/search` | `PublicLayout` | `SearchBar`, `SearchSuggestions`, `EventGrid` | `GET /search/suggestions`, `GET /events` | Public |
| Wishlist | `/wishlist` | `CustomerLayout` | `EventGrid`, `WishlistButton`, `EmptyState` | `GET /events`, `POST /wishlist`, `DELETE /wishlist/:eventId` | `event.read`, authenticated customer |
| Checkout | `/checkout/[eventId]` | `CustomerLayout` | `TicketSelector`, `BookingSummary`, `AttendeeForm`, `CouponInput` | `GET /events/:eventId/tickets`, `POST /bookings/quote`, `POST /bookings` | `booking.create` |
| Payment | `/checkout/[eventId]/payment` | `CustomerLayout` | `PaymentStatus`, `BookingSummary` | `POST /payments/initiate`, `GET /payments/:paymentId/status` | `booking.create`, `payment.create` |
| Confirmation | `/booking/confirmation/[bookingId]` | `CustomerLayout` | `ConfirmationState`, `TicketSummary`, `SharePanel` | `GET /bookings/me`, `GET /tickets/me` | `booking.read` |
| Account | `/account` | `CustomerLayout` | `ProfileForm`, `AccountSummary` | `GET /users/me`, `PATCH /users/me` | `profile.read` |
| Bookings | `/bookings` | `CustomerLayout` | `BookingList`, `StatusBadge`, `EmptyState` | `GET /bookings/me` | `booking.read` |
| Booking Detail | `/bookings/[bookingId]` | `CustomerLayout` | `BookingDetail`, `TicketSummary`, `PaymentStatus` | `GET /bookings/me`, `GET /tickets/me` | `booking.read` |
| Tickets | `/tickets` | `CustomerLayout` | `TicketList`, `TicketQRCode` | `GET /tickets/me` | `ticket.read` |
| Ticket Detail | `/tickets/[ticketId]` | `CustomerLayout` | `TicketQRCode`, `EventSummary`, `TicketStatus` | `GET /tickets/:ticketId` | `ticket.read` |
| Notifications | `/notifications` | `CustomerLayout` | `NotificationList`, `NotificationPreferences` | `GET /notifications`, `PATCH /notifications/:id/read` | `notification.read` |

Customer navigation:

- Desktop: Discover, Events, Categories, Wishlist, Tickets, Account.
- Mobile bottom nav: Discover, Search, Tickets, Wishlist, Account.
- Sticky booking CTA appears on event detail and checkout.

## Auth Pages

| Page | Route | Layout | Required Components | APIs Consumed | Access Permission |
| --- | --- | --- | --- | --- | --- |
| Login | `/login` | `AuthLayout` | `AuthFormShell`, `LoginForm` | `POST /auth/login`, `GET /auth/me` | Guest |
| Register | `/register` | `AuthLayout` | `RegisterForm`, `RoleSelector` | `POST /auth/register` | Guest |
| Forgot Password | `/forgot-password` | `AuthLayout` | `PasswordResetForm` | `POST /auth/forgot-password` | Guest |
| Unauthorized | `/unauthorized` | `AuthLayout` | `ErrorState`, `RoleSwitchPrompt` | `GET /auth/me` | Authenticated |

Auth navigation:

- Login links to register and forgot password.
- Register links back to login.
- Unauthorized links to account, role switch, or login depending on session state.

## Organizer Pages

| Page | Route | Layout | Required Components | APIs Consumed | Access Permission |
| --- | --- | --- | --- | --- | --- |
| Dashboard | `/organizer/dashboard` | `DashboardLayout` | `OrganizerMetricCards`, `RevenueChart`, `RecentBookings` | `GET /organizers/me`, `GET /organizer/analytics` | `organizer.dashboard.read` |
| Events | `/organizer/events` | `DashboardLayout` | `EventTable`, `StatusBadge`, `CreateEventCTA` | `GET /organizer/events` | `event.read` |
| New Event | `/organizer/events/new` | `DashboardLayout` | `EventEditor`, `TicketInventoryTable`, `MediaUpload` | `POST /organizer/events`, `GET /categories` | `event.create` |
| Event Detail/Edit | `/organizer/events/[eventId]` | `DashboardLayout` | `EventEditor`, `TicketInventoryTable`, `PublishPanel` | `GET /events/:eventId`, `PATCH /organizer/events/:id` | `event.update` |
| Bookings | `/organizer/bookings` | `DashboardLayout` | `BookingTable`, `FilterBar` | Organizer booking endpoint from backend | `booking.read.own` |
| Attendees | `/organizer/attendees` | `DashboardLayout` | `AttendeeTable`, `SearchBar`, `ExportButton` | `GET /organizer/events/:id/attendees` | `attendee.read` |
| Analytics | `/organizer/analytics` | `DashboardLayout` | `RevenueChart`, `BookingTrendChart`, `CategoryBreakdownChart` | `GET /organizer/analytics` | `analytics.read.own` |
| Revenue | `/organizer/revenue` | `DashboardLayout` | `RevenueSummary`, `FinanceReportTable` | `GET /organizer/analytics` | `revenue.read.own` |
| Payouts | `/organizer/payouts` | `DashboardLayout` | `PayoutStatus`, `PayoutTable` | `GET /organizer/payouts` | `payout.read.own` |

Organizer navigation:

- Dashboard
- Events
- Bookings
- Attendees
- Analytics
- Revenue
- Payouts
- Settings/Profile

## Influencer Pages

| Page | Route | Layout | Required Components | APIs Consumed | Access Permission |
| --- | --- | --- | --- | --- | --- |
| Dashboard | `/influencer/dashboard` | `DashboardLayout` | `CreatorMetricCards`, `EarningsChart`, `CampaignPerformanceTable` | `GET /influencers/me`, `GET /influencer/analytics` | `influencer.dashboard.read` |
| Campaigns | `/influencer/campaigns` | `DashboardLayout` | `CampaignCard`, `CampaignFilters` | `GET /influencer/campaigns` | `campaign.read` |
| Referrals | `/influencer/referrals` | `DashboardLayout` | `ReferralLinkCard`, `SharePanel`, `ReferralTable` | `POST /influencer/referrals`, `GET /influencer/referrals` | `referral.manage` |
| Earnings | `/influencer/earnings` | `DashboardLayout` | `EarningsSummary`, `EarningsChart`, `PayoutStatus` | `GET /influencer/earnings`, `GET /influencer/analytics` | `earnings.read.own` |
| Profile | `/influencer/profile` | `DashboardLayout` | `ProfileForm`, `SocialLinksForm` | `GET /users/me`, `PATCH /users/me` | `profile.update` |

Influencer navigation:

- Dashboard
- Campaigns
- Referrals
- Earnings
- Profile

## Admin Pages

| Page | Route | Layout | Required Components | APIs Consumed | Access Permission |
| --- | --- | --- | --- | --- | --- |
| Dashboard | `/admin/dashboard` | `DashboardLayout` | `AdminMetricCards`, `PlatformAnalyticsChart`, `AuditLogTimeline` | `GET /admin/analytics`, `GET /admin/audit-logs` | `admin.dashboard.read` |
| Users | `/admin/users` | `DashboardLayout` | `DataTable`, `UserDetailDrawer`, `StatusBadge` | `GET /admin/users`, `PATCH /admin/users/:id` | `user.manage` |
| Events | `/admin/events` | `DashboardLayout` | `DataTable`, `ModerationQueue`, `EventPreviewDrawer` | `GET /admin/events`, `PATCH /admin/events/:id/moderation` | `event.moderate` |
| Organizers | `/admin/organizers` | `DashboardLayout` | `VerificationPanel`, `OrganizerTable` | `GET /admin/organizers`, `PATCH /admin/organizers/:id/verification` | `organizer.verify` |
| Influencers | `/admin/influencers` | `DashboardLayout` | `InfluencerTable`, `CampaignPerformanceTable` | Admin influencer endpoint from backend | `influencer.manage` |
| Finance | `/admin/finance` | `DashboardLayout` | `FinanceReportTable`, `RevenueChart`, `PayoutStatus` | Finance/report endpoints from backend | `finance.read` |
| Reports | `/admin/reports` | `DashboardLayout` | `ReportBuilder`, `DataTable`, `ExportButton` | `GET /admin/reports` | `report.read` |
| Moderation | `/admin/moderation` | `DashboardLayout` | `ModerationQueue`, `DecisionModal` | `GET /admin/events`, `PATCH /admin/events/:id/moderation` | `platform.moderate` |
| Settings | `/admin/settings` | `DashboardLayout` | `SettingsForm`, `FeatureFlagGate` | `GET /config/frontend` | `platform.settings.manage` |
| Audit Logs | `/admin/audit-logs` | `DashboardLayout` | `AuditLogTimeline`, `FilterBar` | `GET /admin/audit-logs` | `audit.read` |

Admin navigation:

- Dashboard
- Users
- Events
- Organizers
- Influencers
- Finance
- Reports
- Moderation
- Settings
- Audit Logs

## Event Staff Pages

| Page | Route | Layout | Required Components | APIs Consumed | Access Permission |
| --- | --- | --- | --- | --- | --- |
| Scanner Home | `/staff/scanner` | `StaffScannerLayout` | `EventSelector`, `ScannerInstructions`, `OfflineQueueBanner` | `GET /scanner/events` | `ticket.scan` |
| Event Scanner | `/staff/scanner/[eventId]` | `StaffScannerLayout` | `ScannerViewport`, `ManualLookupForm`, `ScanResultPanel` | `POST /scanner/tickets/validate`, `POST /scanner/checkins` | `ticket.scan`, `checkin.create` |
| Check-ins | `/staff/checkins` | `StaffScannerLayout` | `CheckInHistoryList`, `FilterBar` | `GET /scanner/checkins` | `checkin.read` |

Staff navigation:

- Scanner
- Check-ins
- Event switcher
- Logout/account action

## Frontend Sitemap

```text
/
  events
    [eventSlug]
  categories
    [categorySlug]
  search
  login
  register
  forgot-password
  unauthorized

  account
  bookings
    [bookingId]
  tickets
    [ticketId]
  wishlist
  notifications
  checkout
    [eventId]
      payment
  booking
    confirmation
      [bookingId]

  organizer
    dashboard
    events
      new
      [eventId]
    bookings
    attendees
    analytics
    revenue
    payouts

  influencer
    dashboard
    campaigns
    referrals
    earnings
    profile

  admin
    dashboard
    users
    events
    organizers
    influencers
    finance
    reports
    moderation
    settings
    audit-logs

  staff
    scanner
      [eventId]
    checkins
```

## Navigation Architecture

Global behavior:

- Navigation is role-aware after session load from `GET /auth/me`.
- Public navigation emphasizes discovery: city, search, categories, login/account.
- Customer navigation emphasizes booking continuity: tickets, bookings, wishlist, notifications.
- Dashboard navigation is role-scoped and permission-filtered.
- Admin navigation is dense and desktop-first.
- Staff navigation is mobile-first and avoids nonessential links.
- Unauthorized routes redirect to `/unauthorized`.
- Unauthenticated protected routes redirect to `/login`.

Public navigation:

- Left: Buizz logo.
- Center: city selector, search, category links.
- Right: login/register or account menu.
- Mobile: search-first header with bottom navigation after login.

Customer navigation:

- Desktop: Discover, Events, Categories, Wishlist, Tickets, Account.
- Mobile: Discover, Search, Tickets, Wishlist, Account.
- Event detail and checkout use sticky booking actions.

Dashboard navigation:

- Organizer: Dashboard, Events, Bookings, Attendees, Analytics, Revenue, Payouts.
- Influencer: Dashboard, Campaigns, Referrals, Earnings, Profile.
- Admin: Dashboard, Users, Events, Organizers, Influencers, Finance, Reports, Moderation, Settings, Audit Logs.
- All dashboard nav items are filtered by permission.

Staff navigation:

- Scanner-first route after login.
- Event switcher stays accessible from scanner pages.
- Check-in history is secondary.
- Logout/account action stays available but visually quiet.

## Permission Model

Permissions are string-based and checked in three layers:

- Middleware for coarse route protection.
- Layout guards for role-specific access.
- Component gates for action-level permissions.

Frontend permission checks improve UX only. Backend APIs remain the source of truth.

Recommended permission groups:

- `event.read`
- `event.create`
- `event.update`
- `event.moderate`
- `booking.create`
- `booking.read`
- `booking.read.own`
- `ticket.read`
- `ticket.scan`
- `checkin.create`
- `checkin.read`
- `analytics.read.own`
- `revenue.read.own`
- `payout.read.own`
- `profile.read`
- `profile.update`
- `notification.read`
- `organizer.verify`
- `influencer.manage`
- `user.manage`
- `finance.read`
- `report.read`
- `platform.moderate`
- `platform.settings.manage`
- `audit.read`

## API Contract Gaps to Resolve Later

The current frontend API contract covers the primary surface area. These endpoints are referenced by the page map but should be formalized before implementation:

- Organizer bookings endpoint.
- Admin influencer management endpoint.
- Admin finance/report endpoints.
- Scanner check-in history endpoint.
- Wishlist list endpoint if wishlist needs a dedicated persisted list.

## Acceptance Checks

- Every planned route has a layout, required components, API dependency, and permission.
- Public routes and protected routes are clearly separated.
- Role navigation is explicit for Customer, Organizer, Influencer, Admin, and Event Staff.
- Missing API contract items are called out instead of silently invented.
- This document remains planning-only and does not define UI implementation details.
