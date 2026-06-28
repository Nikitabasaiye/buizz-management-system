# Buizz Frontend Architecture

## 1. Architecture Intent

Buizz is a Maharashtra-wide experience discovery, booking, community, entertainment, and creator-commerce platform. The frontend must support multiple product surfaces without becoming five separate apps:

- Customer Platform
- Organizer Platform
- Influencer Platform
- Admin Platform
- Event Staff Scanner Platform

The production frontend should be built as a modular Next.js 15 application using App Router, TypeScript, Tailwind CSS, Zustand, TanStack Query, Axios, React Hook Form, Zod, Framer Motion, and Recharts.

The key architectural decision is to organize the app around product domains and role-specific route groups, while keeping shared UI, API, auth, state, validation, and design tokens centralized.

```text
                 +--------------------+
                 |      Buizz App     |
                 |    Next.js 15      |
                 +---------+----------+
                           |
       +-------------------+-------------------+
       |                   |                   |
  Public Customer     Authenticated       Internal Admin
  Discovery Flow      Role Platforms      Operations
       |                   |                   |
  Events, Search,     Organizer,          Admin,
  Booking, Tickets    Influencer, Staff   Reports, Trust
```

## 2. Folder Structure

Use a feature-first structure with a small shared foundation. This keeps large modules independent while preventing duplicate button, API, auth, and state logic.

```text
src/
  app/
    (public)/
    (customer)/
    (organizer)/
    (influencer)/
    (admin)/
    (staff)/
    (auth)/
    api/
    layout.tsx
    globals.css

  features/
    discovery/
    events/
    booking/
    tickets/
    search/
    recommendations/
    organizers/
    influencers/
    staff-scanner/
    admin/
    analytics/
    notifications/

  components/
    ui/
    layout/
    navigation/
    feedback/
    motion/
    charts/
    forms/

  lib/
    api/
    auth/
    config/
    constants/
    formatters/
    permissions/
    query/
    seo/
    utils/
    validation/

  stores/
    app.store.ts
    auth.store.ts
    booking.store.ts
    discovery.store.ts

  types/
    api.types.ts
    auth.types.ts
    event.types.ts
    booking.types.ts
    user.types.ts

  styles/
    tokens.css
    themes.css

  assets/
    images/
    icons/
```

Recommended feature module shape:

```text
features/events/
  api/
  components/
  hooks/
  schemas/
  types/
  utils/
  constants.ts
```

Rules:

- `app/` owns routing, layouts, metadata, loading states, and page composition.
- `features/` owns business functionality.
- `components/ui/` contains generic reusable primitives only.
- `lib/api/` contains shared API client infrastructure.
- `stores/` contains global client state only, not server cache.
- Feature-specific logic should not leak into shared components.

## 3. Route Structure

Use App Router route groups to separate platform experiences without changing URL quality.

```text
app/
  (public)/
    page.tsx                         -> Home / discovery entry
    events/
      page.tsx                       -> Event listing
      [eventSlug]/
        page.tsx                     -> Event detail
    movies/
    concerts/
    workshops/
    sports/
    tourism/
    digital-events/

  (customer)/
    account/
    bookings/
    tickets/
      [ticketId]/
    wishlist/
    notifications/
    checkout/
      [eventId]/

  (organizer)/
    organizer/
      dashboard/
      events/
      events/new/
      events/[eventId]/
      bookings/
      attendees/
      analytics/
      revenue/
      payouts/

  (influencer)/
    influencer/
      dashboard/
      campaigns/
      referrals/
      earnings/
      profile/

  (admin)/
    admin/
      dashboard/
      events/
      organizers/
      users/
      influencers/
      finance/
      reports/
      moderation/
      settings/

  (staff)/
    staff/
      scanner/
      scanner/[eventId]/
      checkins/

  (auth)/
    login/
    register/
    forgot-password/
```

Route ownership:

```text
Route Group       Audience       Layout Style
(public)          Guest/User     Discovery-first, animated, media-rich
(customer)        Customer       Booking/account focused
(organizer)       Organizer      Operational dashboard
(influencer)      Influencer     Referral and earnings dashboard
(admin)           Admin          Dense internal control center
(staff)           Event Staff    Mobile scanner-first utility UI
(auth)            All roles      Minimal secure auth flow
```

## 4. Layout Architecture

Use nested layouts to avoid repeating shells.

```text
RootLayout
  Providers
    QueryClientProvider
    AuthProvider
    ThemeProvider
    MotionConfig
    ToastProvider

PublicLayout
  MarketingNav
  DiscoveryHeader
  PageContent
  Footer

DashboardLayout
  Sidebar
  Topbar
  CommandSearch
  PageContent

StaffScannerLayout
  CompactHeader
  ScannerContent
  BottomActions
```

Layout principles:

- Public/customer pages should be immersive, animated, and discovery-focused.
- Organizer/admin pages should be calmer, denser, and optimized for repeated work.
- Staff scanner pages should be mobile-first, low-latency, high-contrast, and usable at venue gates.
- Layouts should define spacing, shell behavior, navigation, and access guards.
- Pages should compose features, not implement business logic directly.

## 5. State Management Architecture

Use TanStack Query for server state and Zustand for client UI/session workflow state.

```text
Server State                  Client State
TanStack Query                Zustand
-------------------------     -------------------------
events list                   selected city
event details                 filter drawer open
bookings                      checkout step
tickets                       temporary cart
organizer analytics           scanner mode
notifications                 sidebar collapse
admin reports                 auth session snapshot
```

State rules:

- API data belongs in TanStack Query.
- UI state belongs in Zustand or local component state.
- Form state belongs in React Hook Form.
- URL-visible state, such as search, category, city, date, and filters, should live in route search params.
- Avoid duplicating server data inside Zustand.

Suggested stores:

```text
auth.store       -> current user snapshot, active role, session status
app.store        -> theme, nav, modals, command palette
discovery.store  -> city, category drawer, recent searches
booking.store    -> selected tickets, checkout step, temporary booking context
scanner.store    -> scanner mode, last scan result, offline queue indicator
```

## 6. API Layer Architecture

Use Axios for transport and TanStack Query for caching, retries, invalidation, and async status.

```text
UI Component
    |
Feature Hook
    |
Feature API Function
    |
Shared Axios Client
    |
Backend API
```

API folder structure:

```text
lib/api/
  client.ts
  endpoints.ts
  errors.ts
  interceptors.ts
  response.ts

features/events/api/
  event.api.ts
  event.queries.ts
  event.mutations.ts
```

API decisions:

- One shared Axios client with base URL, auth headers, timeout, and error normalization.
- Feature APIs expose typed functions.
- Feature query files define query keys, query options, mutations, and invalidation.
- Backend response types should be normalized before reaching UI components.
- Global errors should feed toast and auth-expiry handling.

Query key pattern:

```text
['events']
['events', 'list', filters]
['events', 'detail', eventId]
['organizer', organizerId, 'analytics', range]
['admin', 'reports', reportType, filters]
```

## 7. Authentication Architecture

Authentication should be centralized and role-aware.

```text
Login/Register
    |
Auth API
    |
Token / Session Storage
    |
Auth Store
    |
Route Guard
    |
Role Layout
```

Recommended approach:

- Use secure HTTP-only cookies if backend supports them.
- Avoid storing long-lived tokens in localStorage.
- Keep only safe user/session metadata in Zustand.
- Refresh session on app load through a `/me` endpoint.
- Use middleware for coarse route protection.
- Use layout-level guards for role-specific protection.

Auth states:

```text
unknown -> checking session
guest   -> public access only
user    -> customer access
organizer -> organizer dashboard access
influencer -> influencer dashboard access
admin   -> admin platform access
staff   -> scanner platform access
```

## 8. Role-Based Access Architecture

Use permission-based checks, not only role names. Roles decide broad access; permissions decide exact actions.

```text
Role
  |
Permissions
  |
Route Access + UI Actions + API Capability
```

Example permission groups:

```text
event.read
event.create
event.update
event.publish
booking.read
ticket.scan
analytics.read
revenue.read
user.manage
organizer.verify
platform.moderate
```

Access layers:

- Middleware protects route groups.
- Layout guards validate active role.
- Components hide unavailable actions.
- API must still enforce authorization server-side.

Role matrix:

```text
Capability              Customer  Organizer  Influencer  Admin  Staff
Discover events         Yes       Yes        Yes         Yes    Limited
Book event              Yes       No         No          No     No
Create event            No        Yes        No          Yes    No
View revenue            No        Own        Own refs    All    No
Scan QR ticket          No        Optional   No          Yes    Yes
Moderate platform       No        No         No          Yes    No
Referral tracking       Limited   Campaigns  Yes         Yes    No
```

## 9. Feature Module Architecture

Each feature should own its API calls, hooks, schemas, types, and domain components.

```text
Feature Module
  |
  +-- API
  +-- Hooks
  +-- Components
  +-- Schemas
  +-- Types
  +-- Utils
```

Main feature boundaries:

- `discovery`: homepage feeds, city selection, trending rails, category browsing.
- `events`: event listing, detail, media, schedules, venue, pricing.
- `booking`: seat/pass selection, checkout, payment handoff, confirmation.
- `tickets`: QR ticket display, ticket transfer, ticket status.
- `search`: global search, suggestions, recent searches, filters.
- `recommendations`: personalized and location-based experience rails.
- `organizers`: organizer dashboards, event CRUD, attendee management.
- `analytics`: charts, performance dashboards, funnel metrics.
- `influencers`: referral links, campaigns, creator earnings.
- `notifications`: in-app notification center and preference UI.
- `staff-scanner`: QR scan, check-in state, invalid ticket handling.
- `admin`: moderation, users, finance, reports, platform controls.

Feature rules:

- Feature components can use shared UI primitives.
- Shared UI primitives should not import feature logic.
- Feature hooks should hide query/mutation details from pages.
- Zod schemas should sit near the feature that owns the form or payload.

## 10. Shared Component Architecture

Shared components should be grouped by responsibility.

```text
components/
  ui/
    Button
    Input
    Select
    Dialog
    Sheet
    Tabs
    Badge
    Card
    Skeleton
    Tooltip

  layout/
    AppShell
    DashboardShell
    PageHeader
    Section
    Container

  navigation/
    PublicNavbar
    DashboardSidebar
    MobileBottomNav
    Breadcrumbs

  feedback/
    Toast
    EmptyState
    ErrorState
    LoadingState

  forms/
    FormField
    FormSection
    ImageUpload
    DateTimePicker

  charts/
    RevenueChart
    BookingTrendChart
    CategoryBreakdownChart

  motion/
    PageTransition
    AnimatedList
    Reveal
```

Component principles:

- Shared components should be accessible by default.
- Design variants should be explicit.
- Data fetching should not happen in shared presentational components.
- Components should support loading, error, empty, disabled, focus, and mobile states.
- Avoid one-off styling in pages when a reusable primitive exists.

## 11. Responsive Design Architecture

Buizz should be mobile-first, especially for customers and event staff.

Breakpoint strategy:

```text
Base      Mobile-first layout
sm        Larger mobile / small tablet
md        Tablet
lg        Laptop
xl        Desktop
2xl       Large displays
```

Platform-specific responsive priorities:

```text
Customer
  Mobile-first discovery, swipeable rails, sticky booking CTA

Organizer
  Responsive dashboard, tables collapse into cards on mobile

Influencer
  Mobile-first referral dashboard, share-first actions

Admin
  Desktop-first dense tables, mobile support for urgent tasks only

Staff Scanner
  Mobile-only primary experience, large tap targets, high contrast
```

Responsive rules:

- Navigation changes by platform, not globally.
- Public/customer pages should favor image-led cards and horizontal rails on mobile.
- Booking CTAs should become sticky bottom actions on mobile.
- Dashboard tables need responsive alternatives.
- Scanner screens require stable viewport handling and no layout shift.

## 12. Animation Architecture

Use Framer Motion for premium interaction, but centralize motion rules.

```text
Motion System
  |
  +-- Page transitions
  +-- Section reveals
  +-- Card hover/tap
  +-- Drawer/dialog motion
  +-- Skeleton loading
  +-- Success states
```

Animation principles:

- Motion should guide attention, not slow the user.
- Public discovery pages can be more expressive.
- Dashboards should use restrained transitions.
- Staff scanner should use minimal motion for speed and clarity.
- Respect `prefers-reduced-motion`.
- Avoid animating large layout shifts during booking or payment.

Recommended motion tokens:

```text
fast       120ms
base       180ms
smooth     260ms
expressive 420ms

ease.standard
ease.enter
ease.exit
ease.spring
```

Use cases:

- Event cards: subtle lift, image zoom, favorite feedback.
- Category cards: tap compression and selected state.
- Page transitions: soft fade/slide.
- Booking confirmation: celebratory but short success animation.
- Scanner: instant success/error feedback with color and haptic-ready visual state.

## 13. Design System Architecture

The design system should support both premium consumer delight and operational dashboard clarity.

Design layers:

```text
Tokens
  Colors
  Typography
  Spacing
  Radius
  Shadow
  Motion
  Z-index

Primitives
  Button
  Input
  Card
  Sheet
  Dialog
  Tabs

Patterns
  EventCard
  BookingSummary
  DashboardMetric
  ScannerResult

Screens
  Discovery
  Event Detail
  Checkout
  Organizer Dashboard
  Admin Reports
```

Visual system decisions:

- Customer UI: premium, image-led, energetic, animated.
- Organizer UI: clean, practical, analytics-focused.
- Influencer UI: creator-friendly, share-first, earnings-focused.
- Admin UI: dense, neutral, controlled.
- Staff UI: high-contrast, fast, large controls.

Token categories:

```text
brand.primary
brand.secondary
surface.default
surface.elevated
text.primary
text.secondary
border.default
status.success
status.warning
status.danger
motion.fast
radius.card
radius.control
```

Typography:

- Use a modern sans-serif family.
- Keep display type for discovery and campaign pages.
- Use tighter, smaller typography for dashboards.
- Define separate scales for marketing, product UI, tables, forms, and mobile actions.

## 14. Scalability Strategy

Scalability comes from boundaries, typed contracts, and predictable data flow.

Technical strategy:

- Feature-first module ownership.
- Route groups for role separation.
- TanStack Query for server cache and invalidation.
- Zustand only for global client state.
- Zod for form and API payload validation.
- Axios interceptors for consistent auth/error handling.
- Shared permission system for role-based UI.
- Reusable design system primitives.
- Lazy-load heavy dashboard charts and scanner modules.
- Use dynamic imports for rarely used admin tools.
- Keep URL params as source of truth for discovery filters.

Performance strategy:

- Prefer server components for static/public data where suitable.
- Use client components only for interactivity-heavy UI.
- Image optimization for event posters and venue media.
- Skeleton loading for discovery rails and dashboards.
- Paginated or infinite queries for event lists.
- Debounced search and cached suggestions.
- Chart rendering only when visible.
- Avoid global re-renders from oversized stores.

Operational strategy:

- Establish route ownership by platform.
- Add Storybook or isolated component docs once UI primitives stabilize.
- Use typed API contracts generated from backend schema if available.
- Add visual regression testing for core pages.
- Add accessibility checks for booking, auth, and scanner flows.
- Separate production, staging, and local config.

## 15. Recommended Build Order

```text
1. Foundation
   Next.js 15 setup, Tailwind, providers, tokens, app shell

2. Public Customer Discovery
   Home, category pages, event listing, event detail

3. Booking and Tickets
   Checkout flow, confirmation, QR ticket UI

4. Auth and RBAC
   Login, session, role guards, permission utilities

5. Organizer Platform
   Dashboard, event management, attendees, revenue

6. Staff Scanner
   QR scanner, validation states, check-in history

7. Influencer Platform
   Referral links, campaigns, earnings

8. Admin Platform
   Moderation, user management, reports, finance

9. Optimization
   Performance, analytics, testing, accessibility, SEO
```

## 16. High-Level Data Flow

```text
User Action
   |
Component Event
   |
Feature Hook
   |
Zod Validation / Query Params
   |
TanStack Query Mutation or Query
   |
Axios API Client
   |
Backend
   |
Normalized Response
   |
Query Cache Update
   |
UI Re-render
```

## 17. Production Best Practices

- Keep each page thin and composition-focused.
- Keep feature logic close to the feature.
- Keep shared components business-agnostic.
- Never store server cache in Zustand.
- Never rely only on frontend role checks for security.
- Use Zod for every form and critical API payload.
- Use query keys consistently from the beginning.
- Design loading, empty, error, and offline states as first-class UI.
- Make scanner and booking flows resilient to poor network conditions.
- Use motion intentionally and provide reduced-motion behavior.
- Treat design tokens as product infrastructure, not styling decoration.

