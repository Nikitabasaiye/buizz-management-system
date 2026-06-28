# Buizz Frontend Architecture

This project is organized as a production-ready Next.js 15 App Router frontend for the Buizz Event Management Platform. The current refactor focuses on architecture only: routing, folder boundaries, reusable component targets, typed stores, service stubs, and future backend integration points.

## Current Structure

```txt
src/
  app/
    layout.tsx
    (public)/
      page.tsx
      events/
        page.tsx
        [id]/page.tsx
      login/page.tsx
      signup/page.tsx
      forgot-password/page.tsx
      about/page.tsx
      contact/page.tsx
      terms/page.tsx
      privacy/page.tsx
    (customer)/
      profile/
        page.tsx
        bookings/page.tsx
        tickets/page.tsx
        saved-events/page.tsx
        notifications/page.tsx
        settings/page.tsx
    (organizer)/
      organizer/
        dashboard/page.tsx
        events/page.tsx
        create-event/page.tsx
        attendees/page.tsx
        analytics/page.tsx
        payouts/page.tsx
        settings/page.tsx
    (admin)/
      admin/
        dashboard/page.tsx
        users/page.tsx
        events/page.tsx
        bookings/page.tsx
        payments/page.tsx
        analytics/page.tsx
        settings/page.tsx
  components/
    common/
    event/
    booking/
    profile/
    dashboard/
    layouts/
    ui/
  features/
    auth/
    events/
    booking/
    tickets/
    payments/
    notifications/
  store/
  services/
  hooks/
  types/
  utils/
  constants/
  lib/
  styles/
  assets/
public/
  images/
  icons/
  fonts/
```

## Architecture Rules

- App Router route groups separate public, customer, organizer, and admin surfaces without changing URL paths.
- `components/ui` remains the low-level design primitive layer.
- `components/common`, `components/event`, `components/booking`, `components/profile`, and `components/dashboard` are reusable product component folders.
- `features/*` owns feature composition and should become the home for forms, schemas, queries, mutations, and feature-specific state.
- `store/*Store.ts` contains small Zustand slices. Keep server data in API/query layers and use Zustand for UI/session workflow state.
- `services/*.api.ts` are API integration boundaries. Add endpoint methods here when backend contracts are confirmed.
- `types` contains shared product and API types. Avoid `any`; model unknown backend data with narrow DTOs and Zod parsing when needed.

## Home Page Composition

The home page is now composed from named sections:

1. Navbar
2. Hero Banner
3. Search Bar
4. Location Selector
5. Categories
6. Trending Events
7. Upcoming Events
8. Events Near You
9. Offers Section
10. Host Your Event
11. Testimonials
12. Footer

## Booking Flow Target

The architecture is prepared for:

Home -> Event Details -> Select Ticket Type -> Select Quantity -> Customer Details -> Payment -> Success -> QR Ticket -> Download PDF -> WhatsApp Ticket -> My Tickets.

Supported ticket type names are modeled in `src/types/event.ts`: male, female, couple, kids, vip, gold, platinum, and custom.

## Recommendations Before UI Implementation

- Create a small visual system pass first: spacing scale, card density, color usage, and mobile navigation behavior.
- Build public discovery and event detail UI before dashboards, because they define the customer booking experience.
- Add Zod schemas beside feature forms when real form fields are introduced.
- Add API methods only after endpoint contracts are known; keep placeholders thin until then.
- Prefer subtle Framer Motion transitions for route sections, cards, modals, skeletons, and success states.
