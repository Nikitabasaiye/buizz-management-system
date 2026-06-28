# Buizz Frontend Backlog

## Import Format

Use each row as a task card in Jira, Trello, Notion, or GitHub Projects.

Fields: `Area | Priority | Epic | User Story | Acceptance Criteria | Technical Notes | Dependencies`

## Customer Features

| Area | Priority | Epic | User Story | Acceptance Criteria | Technical Notes | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Customer | P0 | Discovery | As a customer, I want to browse events by city and category so I can find relevant experiences. | Event list renders by city/category; empty/loading/error states exist; filters persist in URL. | Use TanStack Query and URL search params. | Foundation, Categories API |
| Customer | P0 | Event Detail | As a customer, I want complete event details so I can decide whether to book. | Detail page shows media, schedule, venue, pricing, organizer, CTA. | Page composes feature components; no business logic in route file. | Events API |
| Customer | P0 | Search | As a customer, I want search suggestions so I can quickly find events. | Debounced search; suggestions cached; no-result state. | Use query key `['search','suggestions',term]`. | Search API |
| Customer | P0 | Checkout | As a customer, I want to select tickets and complete booking. | Ticket selection validates availability; quote shown; payment initiated; confirmation route reached. | RHF + Zod; booking store only for transient checkout state. | Auth, Tickets, Bookings, Payments |
| Customer | P1 | My Bookings | As a customer, I want to view booking history. | Bookings list and detail pages show status and ticket links. | Paginated query. | Auth, Bookings API |
| Customer | P1 | Tickets | As a customer, I want QR tickets available in my account. | Ticket QR visible; ticket status shown; invalid/cancelled state handled. | QR component must be printable/shareable later. | Tickets API |
| Customer | P1 | Wishlist | As a customer, I want to save events for later. | Add/remove works; optimistic UI; saved events page. | Mutations invalidate event and wishlist queries. | Auth, Wishlist API |
| Customer | P2 | Notifications | As a customer, I want notification preferences and inbox. | List, mark read, unread count, preference screen. | Shared notification feature. | Notifications API |
| Customer | P2 | Recommendations | As a customer, I want personalized recommendations. | Recommendation rails render and fail gracefully. | Keep algorithm opaque to frontend. | Recommendations API |

## Organizer Features

| Area | Priority | Epic | User Story | Acceptance Criteria | Technical Notes | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Organizer | P0 | Organizer Shell | As an organizer, I want a dashboard shell so I can manage my events. | Sidebar/topbar render; route guard works; responsive navigation. | Use dashboard layout primitives. | Auth, RBAC |
| Organizer | P0 | Event Management | As an organizer, I want to create and edit events. | Multi-section form validates; draft/save states; media placeholders. | RHF + Zod schemas in feature module. | Events API |
| Organizer | P0 | Ticket Inventory | As an organizer, I want to configure ticket types and quantities. | Ticket types can be added/edited/removed in UI; validation errors visible. | Do not duplicate server inventory in Zustand. | Organizer Events API |
| Organizer | P1 | Attendee Management | As an organizer, I want attendee lists for each event. | Search/filter attendees; status badges; export placeholder. | Data table foundation required. | Bookings API |
| Organizer | P1 | Revenue Dashboard | As an organizer, I want revenue metrics. | KPI cards and Recharts graphs render with loading/error states. | Lazy-load heavy charts. | Analytics API |
| Organizer | P1 | Payouts | As an organizer, I want payout visibility. | Payout list, status, date, amount. | Read-only initial version. | Payments/Payout API |
| Organizer | P2 | Event Analytics | As an organizer, I want event performance charts. | Booking trend, traffic, conversion placeholders. | Shared analytics components. | Analytics API |

## Influencer Features

| Area | Priority | Epic | User Story | Acceptance Criteria | Technical Notes | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Influencer | P1 | Creator Shell | As an influencer, I want a focused dashboard. | Shell renders campaign, referral, earnings nav. | Use role layout guard. | Auth, RBAC |
| Influencer | P1 | Campaigns | As an influencer, I want to discover campaigns I can promote. | Campaign cards show commission, dates, status. | Query by eligible campaigns. | Influencer API |
| Influencer | P1 | Referral Links | As an influencer, I want to generate and copy referral links. | Link creation mutation; copy action; success feedback. | Use Clipboard API behind safe utility. | Campaigns API |
| Influencer | P2 | Earnings | As an influencer, I want to see referral earnings. | Earnings summary, payout status, chart. | Recharts with empty states. | Analytics, Payments |
| Influencer | P2 | Profile | As an influencer, I want to manage my creator profile. | Profile form validates and saves. | RHF + Zod. | Users API |

## Admin Features

| Area | Priority | Epic | User Story | Acceptance Criteria | Technical Notes | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Admin | P0 | Admin Shell | As an admin, I want a dense operations dashboard. | Sidebar, topbar, command/search placeholder; admin-only guard. | Desktop-first responsive design. | Auth, RBAC |
| Admin | P0 | User Management | As an admin, I want to view and manage users. | Data table with search/filter/status; user detail drawer. | Shared DataTable. | Admin Users API |
| Admin | P0 | Event Moderation | As an admin, I want to approve/reject events. | Moderation queue; action confirmation; status updates. | Mutations invalidate admin/event queries. | Admin Events API |
| Admin | P1 | Organizer Verification | As an admin, I want to verify organizers. | Verification list and detail review panel. | Support document metadata placeholders. | Admin Organizer API |
| Admin | P1 | Finance Reports | As an admin, I want platform revenue visibility. | Finance KPIs, report table, export placeholder. | Charts lazy-loaded. | Admin Finance API |
| Admin | P1 | Influencer Oversight | As an admin, I want to monitor influencer activity. | Influencer table, campaign performance, status controls. | Reuse data table. | Admin Influencer API |
| Admin | P2 | Audit Logs | As an admin, I want an audit log for platform actions. | Timeline/table with actor, action, target, timestamp. | Read-only. | Admin Audit API |
| Admin | P2 | Broadcast Notifications | As an admin, I want to send platform notifications. | Form validates audience, title, body, schedule. | RHF + Zod. | Notifications API |

## Scanner Features

| Area | Priority | Epic | User Story | Acceptance Criteria | Technical Notes | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Staff | P0 | Scanner Shell | As staff, I want a mobile-first scanner interface. | Staff guard; compact layout; event selector. | High contrast, large tap targets. | Auth, RBAC |
| Staff | P0 | QR Validation | As staff, I want to scan QR codes and validate tickets. | Scan success, duplicate, invalid, expired, network error states. | Camera integration behind scanner adapter. | Scanner API |
| Staff | P0 | Manual Lookup | As staff, I want manual code lookup if camera fails. | Lookup form validates; returns same result panel. | Same mutation as scanner validation. | Scanner API |
| Staff | P1 | Check-in History | As staff, I want recent check-ins visible. | Recent scans list with status and time. | Poll or invalidate after check-in. | Scanner API |
| Staff | P2 | Offline Indicator | As staff, I want clear offline feedback. | Offline banner and queued state placeholder. | Full offline sync can be future enhancement. | App Network Utility |

## Shared Features

| Area | Priority | Epic | User Story | Acceptance Criteria | Technical Notes | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Shared | P0 | Design System | As a developer, I want reusable UI primitives. | Core components have variants, disabled/loading/error states. | Barrel exports from each component group. | Foundation |
| Shared | P0 | API Layer | As a developer, I want typed API calls. | Axios client, error normalization, endpoints, query key helpers. | Feature APIs import shared client only. | Foundation |
| Shared | P0 | Auth/RBAC | As a developer, I want route and UI access controls. | Middleware and layout guards; permission utilities. | Server must remain source of truth. | Auth API |
| Shared | P0 | Form System | As a developer, I want consistent forms. | Form field wrappers, schema patterns, error messages. | RHF + Zod. | Design System |
| Shared | P1 | Charts | As a developer, I want reusable chart patterns. | KPI cards and chart wrappers support loading/empty/error. | Recharts. | Analytics APIs |
| Shared | P1 | Notifications | As a user, I want in-app notification feedback. | Toast system and notification center base. | Shared provider. | Notifications API |
| Shared | P1 | Testing | As a developer, I want reliable frontend checks. | Unit/component/e2e folders and test conventions. | Add runner when selected. | Foundation |
| Shared | P1 | Accessibility | As a user, I want accessible flows. | Keyboard, focus, aria, contrast checked for auth/booking/scanner. | Include review checklist. | Design System |
| Shared | P2 | Feature Flags | As a team, we want controlled rollout. | Feature flag config and gate component. | Can start static, later backend-driven. | Config API |
