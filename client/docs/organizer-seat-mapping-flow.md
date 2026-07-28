# Organizer Seat Mapping Flow

## Goal

Build seat mapping like BookMyShow from the organizer perspective: organizer creates a venue layout, assigns categories and prices, submits it with the event, and customers select seats on the public booking page after approval.

## Roles

- Organizer: creates and edits draft seat maps before event approval.
- Assigned admin: reviews operational correctness and can request changes.
- Super admin: final approval, publish control, emergency edit/delete access.
- Customer: can only select seats marked `available` and `buizz_online`.
- Check-in staff: scans generated QR ticket and marks attendance at the venue gate.

## Database Ownership

- `events`: stores event status, schedule, venue, capacity, booking mode, and publish status.
- `ticket_types`: stores category pricing. Default category is `General`; organizer can add more.
- `seat_map_templates`: reusable venue layouts.
- `event_seat_map_overrides`: event-specific seat map version connected to one event.
- `seat_inventory`: per-seat state for each event: `available`, `locked`, `booked`, `blocked`, `reserved`.
- `bookings`: one customer booking/order.
- `tickets`: generated ticket rows with QR code payload and ticket PDF URL.
- `check_ins`: scan result, staff id, ticket id, event id, and timestamp.

## Organizer Flow

1. Organizer opens `Create Event`.
2. Organizer enters event details and selects booking mode:
   - General admission: no exact seat map.
   - Seat map: exact seat selection.
3. Organizer opens Seat Mapping.
4. Organizer chooses or creates a layout:
   - Sections, rows, seats, aisles, screen/stage.
   - Seat labels like `A1`, `A2`, `B1`.
   - Category color and price per tier.
5. Organizer assigns channel:
   - `buizz_online` for public online booking.
   - `offline` for organizer/admin counter booking.
   - `reserved` for sponsor/VIP/internal hold.
6. Organizer saves draft.
7. Organizer submits event and seat map for review.
8. Admin or super admin reviews and approves.
9. After approval, organizer can publish. After event date passes, organizer can view details but cannot edit, update, or delete without admin/super-admin approval.

## Customer Booking Flow

1. Customer clicks Book Now and stays on `/events/:id/booking`.
2. Event gallery loads from `/api/v1/event-gallery/event/:eventId`.
3. Customer selects venue.
4. Seat/ticket section appears immediately on the same page.
5. Customer selects exact seats or ticket quantity.
6. Amount summary and terms checkbox appear without another page.
7. Proceed to Pay is enabled only after:
   - User is logged in.
   - Valid seats/tickets are selected.
   - Terms checkbox is checked.
8. Payment gateway receives only the final total payable.
9. After successful payment:
   - Booking is confirmed.
   - Seats move from `locked` to `booked`.
   - QR ticket PDF is generated.
   - Ticket is sent to registered email and WhatsApp.

## Seat State Rules

- `available`: selectable by customer.
- `locked`: temporarily held during checkout.
- `booked`: paid and confirmed.
- `blocked`: disabled by organizer/admin.
- `reserved`: not available online.

Seat locks should expire automatically if payment is not completed.

## Check-In Flow

1. Organizer or super admin creates check-in staff for an event.
2. Staff logs in to the scan page.
3. Staff scans QR from the generated ticket.
4. Backend validates:
   - ticket exists
   - booking is paid/confirmed
   - ticket belongs to the event
   - ticket is not already checked in
   - staff has access to that event
5. Backend stores check-in row with staff id and timestamp.
6. Attendee count increases only after successful check-in.

## UI Requirements

- Map must show stage/screen direction.
- Seat colors must match category legend.
- Disabled seats must not be clickable.
- Selected seats must update summary instantly.
- Mobile must support pinch/zoom and horizontal pan.
- Organizer builder must avoid nested cards and keep controls dense, clear, and predictable.
