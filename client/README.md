# Buizz Event Management Platform

Buizz is a frontend-ready event management and booking platform for events, plays, activities, organizers, admins, super admins, bookings, tickets, QR check-in, media, approvals, and revenue workflows.

Current status: Buizz is a production-polished frontend using mock/localStorage data before backend integration. It is frontend demo-ready and backend-integration ready, but real production requires backend APIs, database persistence, authentication, media upload, payments, and QR verification services.

## Project Overview

- Public website for discovering events, plays, and activities.
- Organizer panel for event creation, draft management, submission, bookings, attendees, and revenue views.
- Admin panel for approvals, permissions-based operations, and platform workflows.
- Super Admin panel for permissions, reviews, revenue, platform fee settings, and system controls.
- Booking flow for ticket quantity, seat map, slot/capacity, and free registration events.
- Ticketing model where one booking creates one ticket/pass with QR.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Zustand and localStorage mock state
- lucide-react
- Frontend mock integration layer for API-ready state boundaries

## Main Modules

- Public Website
- Organizer Panel
- Admin Panel
- Super Admin Panel
- Booking Flow
- Ticket / QR / Profile Wallet
- Seat Map / Capacity / Slot Booking
- Event Approval Lifecycle
- Media Gallery / Video / Social Links
- Revenue / Bookings / Attendees mock dashboards

## Current Frontend Features

- Dynamic organizer event creation.
- Save draft and submit for review.
- Admin/Super Admin approval flow.
- Published events visible publicly.
- Public detail page uses organizer event data and media.
- Empty optional media sections hide automatically.
- Booking CTA changes by event type.
- Ticket sections and inventory.
- Seat map event-specific override flow.
- Free registration skips payment.
- One booking creates one ticket/pass.
- Responsive UI.
- Light/dark-ready design tokens.
- `.env.example` provided.
- `.gitignore` cleaned.

## Event Lifecycle

```text
Organizer Create Event
-> Save Draft
-> Submit for Review
-> Admin/Super Admin Review
-> Approve / Reject / Request Changes
-> Publish
-> Public Website
-> Booking
-> Ticket / QR
-> Profile Wallet
```

## Booking Modes

- Simple Ticket Quantity Booking
- Seat Map Booking
- Slot / Capacity Booking
- Free Registration

## Local Setup

```bash
npm install
npx.cmd tsc -p tsconfig.json
npm run build
npm run dev
```

Local URL:

```text
http://localhost:3000
```

## Environment Variables

Copy `.env.example` to `.env.local`.

Windows:

```bash
copy .env.example .env.local
```

Mac/Linux:

```bash
cp .env.example .env.local
```

Do not commit `.env.local`. Secrets must stay backend-only.

## Important Frontend Mock Note

- Current app uses frontend mock/localStorage storage.
- Browser localStorage has size limits.
- Uploaded local files are preview-only until backend upload exists.
- Public image/video URLs can persist in mock mode.
- Backend APIs will replace localStorage functions later.

## Backend Integration Plan

Required backend modules:

- Auth/session API
- Organizer profile/application API
- Event CRUD API
- Event approval lifecycle API
- Admin permissions API
- Media upload API
- Seat map template/override API
- Ticket inventory API
- Booking API
- Payment API
- Ticket/QR API
- Check-in API
- Revenue/settlement API
- Notifications API
- Audit logs API
- Public search/listing API
- Customer profile/tickets API

## API Replacement Examples

```text
readUnifiedEvents()
-> GET /api/events

saveBuizzEventToIntegration(event)
-> POST /api/events
-> PATCH /api/events/:id

Approval local update
-> PATCH /api/admin/events/:id/status

Media preview
-> POST /api/uploads

Mock payment
-> payment gateway backend APIs

Mock ticket creation
-> booking/ticket API
```

## Testing Commands

```bash
npx.cmd tsc -p tsconfig.json
npm run build
```

## QA Checklist

- Organizer creates event.
- Submit appears in Admin/Super Admin review.
- Approve/publish appears publicly.
- Public detail uses real organizer data.
- Booking uses real ticket sections/seat map.
- One booking = one ticket.
- Profile wallet shows ticket.
- No localStorage quota crash.
- Responsive mobile/desktop.

## Git Commands

```bash
git status
git add .
git commit -m "docs: update project readme"
git push origin main
```

## Final Status

- Frontend demo ready: Yes
- Backend integration ready: Yes
- Real production ready: After backend integration
