# Buizz Frontend Design System

## Purpose

This document defines the visual, interaction, accessibility, and component standards for Buizz, an experience discovery, event booking, community, and entertainment platform.

Buizz should feel premium and delightful like a blend of Airbnb, Apple, Spotify, and BookMyShow: warm discovery, polished surfaces, entertainment energy, and clear booking confidence.

## Design Principles

- Mobile first across customer and staff experiences.
- Premium but practical; visual polish should support conversion and trust.
- Highly animated, but never slow or distracting.
- Accessible by default with WCAG 2.1 AA as the target.
- Consistent across Customer, Organizer, Influencer, Admin, and Event Staff platforms.
- Consumer pages should feel expressive and media-led.
- Dashboard pages should feel calmer, denser, and optimized for repeated work.

## 1. Color System

Use semantic design tokens instead of raw color values in components.

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `color.brand.primary` | `#FF385C` | `#FF5C7A` | Primary CTA, active states |
| `color.brand.secondary` | `#111827` | `#F9FAFB` | Premium text and nav |
| `color.brand.energy` | `#1DB954` | `#35D979` | Music, community, positive highlights |
| `color.brand.gold` | `#F5B700` | `#FFD166` | Premium badges, featured events |
| `color.surface.default` | `#FFFFFF` | `#0B0F19` | Page background |
| `color.surface.subtle` | `#F7F7F8` | `#111827` | Sections, dashboard backgrounds |
| `color.surface.elevated` | `#FFFFFF` | `#171C2A` | Cards, popovers |
| `color.text.primary` | `#111827` | `#F9FAFB` | Main text |
| `color.text.secondary` | `#4B5563` | `#AAB2C0` | Supporting text |
| `color.border.default` | `#E5E7EB` | `#2A3142` | Dividers and controls |
| `color.status.success` | `#16A34A` | `#22C55E` | Success |
| `color.status.warning` | `#D97706` | `#F59E0B` | Warning |
| `color.status.danger` | `#DC2626` | `#F87171` | Errors |
| `color.status.info` | `#2563EB` | `#60A5FA` | Informational states |

Rules:

- Primary CTA uses `color.brand.primary`.
- Admin dashboards use mostly neutral surfaces with status accents.
- Scanner screens use high-contrast status colors.
- Never encode state by color alone; pair state with icon and text.
- Event cards may use image-derived accents, but controls remain token-based.
- Use status colors only for meaningful status, not decoration.

## 2. Typography System

Recommended font strategy:

- Primary UI font: `Inter`, `Geist`, or an equivalent modern sans-serif.
- Display/event hero font: same family with heavier weight.
- Numeric/dashboard values: tabular numbers.
- Avoid decorative fonts in core product UI.

| Token | Size | Line Height | Usage |
| --- | --- | --- | --- |
| `type.display.lg` | 48px | 56px | Desktop event/detail heroes |
| `type.display.md` | 36px | 44px | Landing and category headers |
| `type.heading.xl` | 30px | 38px | Page titles |
| `type.heading.lg` | 24px | 32px | Section titles |
| `type.heading.md` | 20px | 28px | Cards and panels |
| `type.body.lg` | 18px | 28px | Hero supporting text |
| `type.body.md` | 16px | 24px | Default body |
| `type.body.sm` | 14px | 20px | Metadata, forms |
| `type.caption` | 12px | 16px | Labels, badges, helper text |

Rules:

- No negative letter spacing.
- Do not scale type with viewport width.
- Dashboard headings stay compact.
- Buttons use 14-16px depending on size.
- Price, date, and ticket quantities use tabular numbers.
- Long labels must wrap cleanly rather than overflow.

## 3. Spacing System

Use an 8px base grid with 4px micro spacing.

| Token | Value |
| --- | --- |
| `space.1` | 4px |
| `space.2` | 8px |
| `space.3` | 12px |
| `space.4` | 16px |
| `space.5` | 20px |
| `space.6` | 24px |
| `space.8` | 32px |
| `space.10` | 40px |
| `space.12` | 48px |
| `space.16` | 64px |
| `space.20` | 80px |

Rules:

- Mobile page padding: 16px.
- Tablet page padding: 24px.
- Desktop content padding: 32-48px.
- Dashboard shell spacing is tighter than customer discovery pages.
- Scanner layout spacing uses large tap targets and compact content grouping.
- Avoid one-off spacing values unless the design token scale cannot express the need.

## 4. Grid System

Use responsive CSS grid and flex layouts with stable dimensions for repeated cards, tables, scanners, and booking summaries.

Rules:

- Customer discovery: 2-column mobile cards when compact, 3-5 columns desktop.
- Event detail: single column mobile, media/content split on desktop.
- Booking: sticky bottom CTA mobile, side summary desktop.
- Organizer/Admin: table desktop, stacked list/card fallback mobile.
- Influencer: mobile-first cards and share-first actions.
- Scanner: mobile-first single-column only.
- Avoid layout shift when loading cards, charts, tables, or scanner results.

## 5. Responsive Breakpoints

| Token | Width | Usage |
| --- | --- | --- |
| `breakpoint.xs` | 0px | Mobile base |
| `breakpoint.sm` | 640px | Large mobile |
| `breakpoint.md` | 768px | Tablet |
| `breakpoint.lg` | 1024px | Laptop |
| `breakpoint.xl` | 1280px | Desktop |
| `breakpoint.2xl` | 1536px | Large desktop |

Platform standards:

- Customer: mobile-first discovery, swipeable rails, sticky booking CTA.
- Organizer: responsive dashboards; tables collapse into cards on mobile.
- Influencer: mobile-first referral and share workflows.
- Admin: desktop-first dense tables, mobile support for urgent tasks.
- Staff: scanner-first mobile utility UI.

## 6. Icon System

Use `lucide-react` as the default icon library.

Icon sizes:

| Token | Size | Usage |
| --- | --- | --- |
| `icon.sm` | 16px | Compact metadata and table actions |
| `icon.md` | 20px | Default buttons and nav |
| `icon.lg` | 24px | Prominent actions |
| `icon.xl` | 32px | Scanner/status moments |

Rules:

- Icons inside buttons must be visually centered.
- Use icons for search, filter, heart, share, calendar, map, ticket, scan, user, settings.
- Every icon-only button requires an accessible label.
- Icon-only desktop controls should have tooltips.
- Do not create manual SVG icons unless no suitable library icon exists.

## 7. Elevation and Shadows

| Token | Usage |
| --- | --- |
| `shadow.none` | Flat dashboard surfaces |
| `shadow.sm` | Inputs, subtle cards |
| `shadow.md` | Event cards, dropdowns |
| `shadow.lg` | Modals, drawers |
| `shadow.focus` | Keyboard focus ring |
| `shadow.glow` | Rare premium/featured highlight |

Rules:

- Consumer cards may lift subtly on hover.
- Dashboards avoid heavy shadows; use borders and surface contrast.
- Modals and drawers require backdrop and clear elevation.
- Dark mode shadows should rely more on borders and surface contrast.
- Focus shadow must be visible in light and dark mode.

## 8. Border Radius Standards

| Token | Value | Usage |
| --- | --- | --- |
| `radius.xs` | 4px | Badges, table cells |
| `radius.sm` | 6px | Inputs, compact controls |
| `radius.md` | 8px | Cards, buttons, panels |
| `radius.lg` | 12px | Modals, drawers, feature cards |
| `radius.xl` | 16px | Hero media, large event imagery |
| `radius.full` | 999px | Pills, avatars |

Rules:

- Default cards use 8px.
- Avoid overly rounded dashboard cards.
- Event media can use 12-16px.
- Scanner controls should use 8-12px with strong contrast.
- Use `radius.full` only for avatars, pills, and circular icon controls.

## 9. Motion and Animation Standards

Use Framer Motion with centralized motion tokens.

| Token | Duration | Usage |
| --- | --- | --- |
| `motion.fast` | 120ms | Button tap, hover |
| `motion.base` | 180ms | Small transitions |
| `motion.smooth` | 260ms | Drawers, tabs |
| `motion.expressive` | 420ms | Discovery hero, confirmation |

Rules:

- Respect `prefers-reduced-motion`.
- Public/customer pages can use richer transitions.
- Dashboards use restrained fades and layout transitions.
- Scanner feedback must be instant.
- Avoid animations that move booking totals, payment state, or scanner results unpredictably.
- Motion should guide attention, not slow task completion.

Recommended motion patterns:

- Event cards: subtle lift, image zoom, favorite feedback.
- Category cards: tap compression and selected state.
- Page transitions: soft fade/slide.
- Booking confirmation: short success animation.
- Scanner: immediate success/error state transition.

## 10. Component Design Rules

### Buttons

Variants:

- `primary`
- `secondary`
- `ghost`
- `outline`
- `danger`
- `success`

Sizes:

- `sm`
- `md`
- `lg`
- `icon`

Rules:

- Must support loading, disabled, icon-left, and icon-right states.
- Primary CTA text should be action-specific: "Book tickets", "Publish event", "Scan ticket".
- One dominant primary action per screen.
- Icon-only buttons require `aria-label`.

### Inputs and Forms

Rules:

- Label is always visible.
- Helper/error text appears below input.
- Error includes icon and message.
- Required fields use clear text, not only `*`.
- Forms use React Hook Form and Zod.
- Inputs include disabled, loading, error, and success-ready states.

### Cards

Rules:

- Event cards prioritize image, date, title, venue/city, price.
- Dashboard cards prioritize metric, delta, timeframe.
- Cards support loading and empty states.
- Do not place cards inside cards.
- Card hover is allowed for clickable cards, not static dashboard panels.

### Modals and Drawers

Rules:

- Modal is for blocking confirmation or focused decisions.
- Drawer is for filters, mobile menus, and side detail panels.
- Must trap focus, close on escape, and restore focus.
- Mobile filters use bottom drawer.
- Destructive modal actions require clear confirmation copy.

### Tables

Rules:

- Use tables for dense desktop operations.
- Mobile fallback is stacked list/card layout.
- Must support loading, empty, sort/filter, and pagination.
- Row actions go in menus or labeled buttons.
- Tables should not be used for customer discovery cards.

### Navigation

Rules:

- Public: top nav with search, city/category, and account CTA.
- Customer mobile: bottom nav for Discover, Search, Tickets, Wishlist, Account.
- Dashboard: sidebar plus topbar.
- Staff: compact header and persistent scan action.
- Active route must be visually obvious and accessible.

### Sidebars

Rules:

- Used by Organizer, Influencer, and Admin platforms.
- Collapsible on desktop, drawer on mobile.
- Use role-specific nav items.
- Sidebar state can be stored in Zustand.
- Navigation must be permission-filtered after session load.

### Dashboards

Rules:

- First row: key metrics.
- Second row: charts and recent activity.
- Tables below.
- Date range control is consistent across analytics pages.
- Heavy chart modules should be lazy-loaded where appropriate.

### Empty States

Rules:

- Include title, useful message, and one primary action when applicable.
- Customer empty states may be warmer and more encouraging.
- Admin empty states are concise and operational.
- Empty states should not imply failure when no data is normal.

### Loading States

Rules:

- Use skeletons for cards, tables, charts, and booking summaries.
- Avoid global spinners except app/session boot.
- Keep skeleton dimensions stable.
- Scanner should show immediate camera permission/loading state.

### Error States

Rules:

- Show recoverable action: retry, back, or contact support.
- API errors use normalized messages.
- Permission errors route to `/unauthorized`.
- Payment errors must preserve booking context.
- Scanner errors must be large, high-contrast, and text-based.

## Naming Conventions

- Design tokens: `category.intent.variant`, for example `color.brand.primary`.
- Components: `PascalCase`.
- Hooks: `useThing`.
- Files: `kebab-case` for routes/docs, `PascalCase.tsx` for components.
- Feature components: `EventCard`, `BookingSummary`, `ScannerResultPanel`.
- Shared primitives must not include product-specific names.
- Query keys should use stable arrays, for example `['events', 'list', filters]`.

## Reusability Guidelines

- Shared UI components cannot import feature logic.
- Feature components may import shared UI.
- Common patterns graduate from feature to shared only after reuse in 2+ areas.
- Shared components expose variants, not custom class escape hatches as the default.
- API data formatting belongs in feature utilities or shared formatters.
- Pages compose features; they should not contain business logic.

## Accessibility Requirements

- Target WCAG 2.1 AA.
- Keyboard support for all interactive UI.
- Visible focus ring on every focusable element.
- 44px minimum touch target for mobile primary actions.
- Form errors announced to assistive technology.
- Dialogs and drawers trap focus.
- Color contrast: 4.5:1 for normal text, 3:1 for large text/icons.
- Scanner states must include text and icon, not just color.
- Reduced motion preference must be respected.

## Dark Mode Strategy

- Token-driven dark mode via CSS variables.
- Default launch can use system preference with manual toggle.
- Event imagery remains unchanged; overlays adapt.
- Dashboards use dark surfaces carefully to preserve table readability.
- Scanner dark mode must preserve high contrast.
- Avoid hard-coded color values inside components.

## Mobile UX Standards

- Bottom sticky CTA for booking.
- Bottom sheets for filters and menus.
- Avoid hover-only interactions.
- Use one primary action per screen.
- Keep booking totals visible during checkout.
- Scanner screens must avoid layout shift and support one-hand use.
- Forms should use appropriate mobile keyboard types.
- Navigation should be reachable with thumb-friendly tap targets.
