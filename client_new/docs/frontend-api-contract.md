# Buizz Frontend API Contract and Integration Specification

## Purpose

This document describes the API contract expected by the Buizz frontend. It is written from the frontend perspective and should be treated as an integration agreement, not a backend implementation document.

## Global API Standards

Base URL:
- Local: `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api`
- Staging: `NEXT_PUBLIC_API_BASE_URL=https://staging-api.buizz.in/api`
- Production: `NEXT_PUBLIC_API_BASE_URL=https://api.buizz.in/api`

Headers:
- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer <accessToken>` only if token-based auth is used
- Prefer HTTP-only secure cookies for production sessions

Success envelope:
```ts
type ApiSuccess<T> = {
  data: T;
  meta?: {
    requestId?: string;
    page?: number;
    limit?: number;
    total?: number;
  };
};
```

Error envelope:
```ts
type ApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
  };
};
```

Common errors:
- `400 VALIDATION_ERROR`
- `401 UNAUTHENTICATED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 CONFLICT`
- `422 UNPROCESSABLE_ENTITY`
- `429 RATE_LIMITED`
- `500 INTERNAL_ERROR`

Pagination:
```ts
type PaginationQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
```

## Authentication

### Login

Endpoint: `POST /auth/login`

Request:
```ts
{
  email: string;
  password: string;
}
```

Response:
```ts
{
  user: UserSummary;
  accessToken?: string;
  expiresAt?: string;
}
```

Validation:
- `email` must be valid email
- `password` required

Errors:
- `401 INVALID_CREDENTIALS`
- `403 ACCOUNT_DISABLED`

### Register

Endpoint: `POST /auth/register`

Request:
```ts
{
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: "customer" | "organizer" | "influencer";
}
```

Response:
```ts
{
  user: UserSummary;
  requiresVerification: boolean;
}
```

Errors:
- `409 EMAIL_ALREADY_EXISTS`
- `400 VALIDATION_ERROR`

### Current Session

Endpoint: `GET /auth/me`

Response:
```ts
{
  user: UserSummary | null;
  permissions: string[];
}
```

Errors:
- `401 UNAUTHENTICATED`

### Logout

Endpoint: `POST /auth/logout`

Request: `{}`

Response:
```ts
{ success: true }
```

## Users

### Get My Profile

Endpoint: `GET /users/me`

Response:
```ts
{
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  roles: UserRole[];
  preferences: UserPreferences;
}
```

### Update My Profile

Endpoint: `PATCH /users/me`

Request:
```ts
{
  name?: string;
  phone?: string;
  avatarUrl?: string;
  preferences?: Partial<UserPreferences>;
}
```

Response: updated user profile.

Validation:
- `name` 2-80 characters
- phone must match supported country format

## Events

### List Events

Endpoint: `GET /events`

Query:
```ts
{
  city?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}
```

Response:
```ts
{
  items: EventCardDto[];
  total: number;
}
```

Errors:
- `400 INVALID_FILTER`

### Get Event Detail

Endpoint: `GET /events/:eventId`

Response:
```ts
{
  id: string;
  slug: string;
  title: string;
  description: string;
  category: CategoryDto;
  organizer: OrganizerSummary;
  venue: VenueDto;
  media: MediaAsset[];
  schedules: EventSchedule[];
  ticketTypes: TicketTypeSummary[];
  status: "draft" | "published" | "cancelled" | "completed";
}
```

### Create Organizer Event

Endpoint: `POST /organizer/events`

Request: event draft payload with title, category, venue, schedules, media, and ticket types.

Response: event detail.

Validation:
- title required
- category required
- at least one schedule
- at least one ticket type before publish

## Categories

### List Categories

Endpoint: `GET /categories`

Response:
```ts
{
  items: {
    id: string;
    name: string;
    slug: string;
    iconUrl?: string;
    parentId?: string;
  }[];
}
```

## Tickets

### Get Event Ticket Types

Endpoint: `GET /events/:eventId/tickets`

Response:
```ts
{
  eventId: string;
  ticketTypes: {
    id: string;
    name: string;
    price: number;
    currency: "INR";
    availableQuantity: number;
    minPerBooking: number;
    maxPerBooking: number;
  }[];
}
```

### Get My Tickets

Endpoint: `GET /tickets/me`

Response:
```ts
{
  items: TicketDto[];
}
```

### Get Ticket Detail

Endpoint: `GET /tickets/:ticketId`

Response:
```ts
{
  id: string;
  bookingId: string;
  event: EventCardDto;
  holderName: string;
  qrPayload: string;
  status: "valid" | "used" | "cancelled" | "expired";
}
```

## Bookings

### Create Quote

Endpoint: `POST /bookings/quote`

Request:
```ts
{
  eventId: string;
  tickets: { ticketTypeId: string; quantity: number }[];
  couponCode?: string;
}
```

Response:
```ts
{
  quoteId: string;
  subtotal: number;
  discount: number;
  fees: number;
  total: number;
  currency: "INR";
  expiresAt: string;
}
```

Errors:
- `409 TICKET_UNAVAILABLE`
- `422 QUOTE_EXPIRED`

### Create Booking

Endpoint: `POST /bookings`

Request:
```ts
{
  quoteId: string;
  attendees: {
    name: string;
    email?: string;
    phone?: string;
    ticketTypeId: string;
  }[];
}
```

Response:
```ts
{
  bookingId: string;
  status: "pending_payment" | "confirmed";
  paymentRequired: boolean;
}
```

## Payments

### Initiate Payment

Endpoint: `POST /payments/initiate`

Request:
```ts
{
  bookingId: string;
  returnUrl: string;
}
```

Response:
```ts
{
  paymentId: string;
  provider: "razorpay" | "stripe" | "cashfree";
  checkoutPayload: Record<string, unknown>;
}
```

### Payment Status

Endpoint: `GET /payments/:paymentId/status`

Response:
```ts
{
  paymentId: string;
  bookingId: string;
  status: "created" | "processing" | "succeeded" | "failed" | "refunded";
}
```

## Notifications

### List Notifications

Endpoint: `GET /notifications`

Response:
```ts
{
  items: NotificationDto[];
  unreadCount: number;
}
```

### Mark Notification Read

Endpoint: `PATCH /notifications/:notificationId/read`

Response:
```ts
{ success: true }
```

## Organizers

### Get Organizer Profile

Endpoint: `GET /organizers/me`

Response: organizer profile, verification status, and payout configuration summary.

### Organizer Analytics

Endpoint: `GET /organizer/analytics`

Query:
```ts
{
  eventId?: string;
  range: "7d" | "30d" | "90d" | "custom";
  from?: string;
  to?: string;
}
```

Response:
```ts
{
  revenue: number;
  bookings: number;
  attendees: number;
  conversionRate?: number;
  series: { date: string; revenue: number; bookings: number }[];
}
```

## Influencers

### List Campaigns

Endpoint: `GET /influencer/campaigns`

Response:
```ts
{
  items: {
    id: string;
    event: EventCardDto;
    commissionType: "fixed" | "percentage";
    commissionValue: number;
    status: "available" | "active" | "ended";
  }[];
}
```

### Create Referral Link

Endpoint: `POST /influencer/referrals`

Request:
```ts
{
  campaignId: string;
  channel?: "instagram" | "youtube" | "whatsapp" | "other";
}
```

Response:
```ts
{
  referralId: string;
  url: string;
  code: string;
}
```

## Analytics

### Platform Analytics

Endpoint: `GET /analytics/platform`

Query:
```ts
{
  range: "7d" | "30d" | "90d" | "custom";
  from?: string;
  to?: string;
}
```

Response:
```ts
{
  totalRevenue: number;
  totalBookings: number;
  activeEvents: number;
  activeUsers: number;
  series: { date: string; revenue: number; bookings: number; users: number }[];
}
```

## Admin

### List Users

Endpoint: `GET /admin/users`

Query: pagination plus `role`, `status`, and `search`.

Response:
```ts
{
  items: UserSummary[];
  total: number;
}
```

### Moderate Event

Endpoint: `PATCH /admin/events/:eventId/moderation`

Request:
```ts
{
  decision: "approved" | "rejected" | "needs_changes";
  note?: string;
}
```

Response: updated event moderation status.

Validation:
- `note` required when rejected or needs changes

### Verify Organizer

Endpoint: `PATCH /admin/organizers/:organizerId/verification`

Request:
```ts
{
  status: "verified" | "rejected" | "needs_documents";
  note?: string;
}
```

Response: updated organizer verification status.

## Scanner

### List Scanner Events

Endpoint: `GET /scanner/events`

Response:
```ts
{
  items: {
    id: string;
    title: string;
    startsAt: string;
    venueName: string;
  }[];
}
```

### Validate Ticket

Endpoint: `POST /scanner/tickets/validate`

Request:
```ts
{
  eventId: string;
  qrPayload?: string;
  manualCode?: string;
}
```

Response:
```ts
{
  ticketId: string;
  status: "valid" | "already_checked_in" | "invalid" | "wrong_event" | "cancelled";
  holderName?: string;
  ticketTypeName?: string;
  checkedInAt?: string;
}
```

Validation:
- exactly one of `qrPayload` or `manualCode` is required

### Check In Ticket

Endpoint: `POST /scanner/checkins`

Request:
```ts
{
  eventId: string;
  ticketId: string;
}
```

Response:
```ts
{
  checkInId: string;
  ticketId: string;
  checkedInAt: string;
  status: "checked_in";
}
```

Errors:
- `409 ALREADY_CHECKED_IN`
- `404 TICKET_NOT_FOUND`
- `403 WRONG_EVENT`

## Frontend Integration Rules

- All API calls must go through `src/lib/api/client.ts`.
- Feature modules own endpoint functions, query keys, queries, and mutations.
- Zod validates all form payloads before mutation.
- TanStack Query owns server state and cache invalidation.
- Zustand stores only UI/session workflow state.
- Axios interceptors normalize errors into `ApiError`.
- Route guards use session and permissions but backend remains source of truth.
- File uploads should use signed upload URLs when backend is ready.
- Payment provider payloads must stay provider-agnostic until the payment component boundary.
- Scanner validation must support rapid repeated scans and duplicate suppression in the UI.

## Shared Type Aliases

```ts
type UserRole = "customer" | "organizer" | "influencer" | "admin" | "staff";

type UserSummary = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  roles: UserRole[];
  activeRole: UserRole;
  status: "active" | "disabled" | "pending";
};

type EventCardDto = {
  id: string;
  slug: string;
  title: string;
  categoryName: string;
  city: string;
  startsAt: string;
  posterUrl?: string;
  minPrice: number;
  currency: "INR";
};

type NotificationDto = {
  id: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
};
```
