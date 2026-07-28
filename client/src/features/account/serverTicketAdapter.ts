import type { BookingDetails, BookingTicket } from "@/store/api/bookingsApi";
import type { Ticket as ServerTicket } from "@/store/api/ticketsApi";
import type { BuizzTicket, PassportStamp, TicketStatus } from "@/store/ticket.store";

const fallbackEventImage =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80";

export const passportStampCatalog: PassportStamp[] = [
  { id: "music-explorer", title: "Music Explorer", category: "Music", unlocked: false, xp: 50 },
  { id: "comedy-fan", title: "Comedy Fan", category: "Comedy", unlocked: false, xp: 50 },
  { id: "theatre-lover", title: "Theatre Lover", category: "Theatre", unlocked: false, xp: 50 },
  { id: "sports-explorer", title: "Sports Explorer", category: "Sports", unlocked: false, xp: 50 },
  { id: "food-trailblazer", title: "Food Trailblazer", category: "Food", unlocked: false, xp: 50 },
  { id: "business-networker", title: "Business Networker", category: "Business", unlocked: false, xp: 50 },
  { id: "spiritual-seeker", title: "Spiritual Seeker", category: "Spiritual", unlocked: false, xp: 50 },
  { id: "culture-collector", title: "Culture Collector", category: "Culture", unlocked: false, xp: 50 },
  { id: "activity-explorer", title: "Activity Explorer", category: "Activity", unlocked: false, xp: 50 },
  { id: "festival-hopper", title: "Festival Hopper", category: "Festival", unlocked: false, xp: 50 },
];

export function serverTicketToBuizzTicket(ticket: ServerTicket): BuizzTicket {
  const startDate = ticket.event_date ?? ticket.created_at;
  const status = mapTicketStatus(ticket.status);

  return {
    bookingId: String(ticket.payment_id ?? ticket.ticket_number),
    ticketId: ticket.ticket_number,
    itemId: String(ticket.event_id),
    kind: inferKind(ticket.event_title),
    eventName: ticket.event_title || `Event #${ticket.event_id}`,
    eventImage: fallbackEventImage,
    date: formatDate(startDate),
    time: formatTime(startDate),
    venue: ticket.venue_name || "Venue pending",
    city: "",
    duration: "",
    buyerName: ticket.user_name || "Buizz User",
    buyerEmail: ticket.user_email,
    buyerPhone: ticket.user_phone,
    deliveryPreference: "email",
    lineItems: [
      {
        label: ticket.ticket_type || "Entry Pass",
        quantity: 1,
        price: toNumber(ticket.price),
      },
    ],
    subtotal: toNumber(ticket.price),
    convenienceFee: 0,
    taxes: 0,
    total: toNumber(ticket.price),
    status,
    qrStatus: status === "Used" ? "Attended" : status === "Valid" ? "QR Ready" : "Unavailable",
    qrPayload: ticket.qr_code || ticket.ticket_number,
    createdAt: ticket.created_at,
    attendedAt: ticket.scanned_at,
    passportStamp: status === "Used" ? inferStampId(ticket.event_title) : undefined,
    xpAwarded: status === "Used" ? 50 : undefined,
  };
}

export function bookingToBuizzTickets(booking: BookingDetails): BuizzTicket[] {
  const event = booking.event;
  const eventId = event?.id ?? booking.eventId ?? booking.orderId;
  const eventTitle = event?.title || booking.eventTitle || "Event details unavailable";
  const eventDate = event?.startDate || booking.eventDate || booking.createdAt;
  const sourceTickets = Array.isArray(booking.tickets) && booking.tickets.length
    ? booking.tickets
    : createLegacyBookingTickets(booking);

  return sourceTickets.map((ticket, index) => {
    const status = mapTicketStatus(ticket.status);
    const price = toNumber(ticket.price);

    return {
      bookingId: booking.orderId,
      ticketId: ticket.ticketNumber || `${booking.orderId}-${index + 1}`,
      itemId: String(eventId),
      kind: inferKind(eventTitle),
      eventName: eventTitle,
      eventImage: event?.banner || fallbackEventImage,
      date: formatDate(eventDate),
      time: formatTime(eventDate),
      venue: (typeof event?.venue === 'object' ? event.venue?.name : event?.venue) || "Venue pending",
      city: (typeof event?.venue === 'object' ? event.venue?.city : undefined) || "",
      duration: "",
      buyerName: "Buizz User",
      deliveryPreference: "email",
      lineItems: [
        {
          label: ticket.ticketType || "Entry Pass",
          quantity: 1,
          price,
        },
      ],
      subtotal: price,
      convenienceFee: 0,
      taxes: 0,
      total: price,
      status,
      qrStatus: status === "Used" ? "Attended" : status === "Valid" ? "QR Ready" : "Unavailable",
      qrPayload: ticket.qrCode || ticket.ticketNumber,
      createdAt: booking.createdAt,
      passportStamp: status === "Used" ? inferStampId(eventTitle) : undefined,
      xpAwarded: status === "Used" ? 50 : undefined,
    };
  });
}

function createLegacyBookingTickets(booking: BookingDetails): BookingTicket[] {
  const count = Math.max(1, Number(booking.ticketCount || 1));
  const perTicketPrice = toNumber(booking.amount) / count;
  const status: BookingTicket["status"] =
    booking.status === "refunded" || booking.status === "failed"
      ? "cancelled"
      : "active";

  return Array.from({ length: count }, (_, index) => ({
    ticketNumber: `${booking.orderId}-${index + 1}`,
    ticketType: "Entry Pass",
    price: perTicketPrice,
    status,
    qrCode: "",
  }));
}

export function stampsFromTickets(tickets: BuizzTicket[]): PassportStamp[] {
  const usedStampIds = new Set(
    tickets
      .filter((ticket) => ticket.status === "Used")
      .map((ticket) => ticket.passportStamp ?? inferStampId(ticket.eventName)),
  );

  return passportStampCatalog.map((stamp) => ({
    ...stamp,
    unlocked: usedStampIds.has(stamp.id),
    unlockedAt: usedStampIds.has(stamp.id) ? new Date().toISOString() : undefined,
  }));
}

function mapTicketStatus(status: ServerTicket["status"]): TicketStatus {
  if (status === "used") return "Used";
  if (status === "cancelled") return "Cancelled";
  if (status === "expired") return "Expired";
  return "Valid";
}

function inferKind(title = ""): BuizzTicket["kind"] {
  const text = title.toLowerCase();
  if (text.includes("play") || text.includes("theatre")) return "plays";
  if (text.includes("workshop") || text.includes("sport") || text.includes("activity")) return "activities";
  return "events";
}

function inferStampId(title = "") {
  const text = title.toLowerCase();
  if (text.includes("play") || text.includes("theatre")) return "theatre-lover";
  if (text.includes("comedy")) return "comedy-fan";
  if (text.includes("sport") || text.includes("cricket") || text.includes("football")) return "sports-explorer";
  if (text.includes("food")) return "food-trailblazer";
  if (text.includes("business") || text.includes("startup")) return "business-networker";
  if (text.includes("spiritual") || text.includes("satsang")) return "spiritual-seeker";
  if (text.includes("culture") || text.includes("art")) return "culture-collector";
  if (text.includes("festival") || text.includes("fest")) return "festival-hopper";
  if (text.includes("workshop") || text.includes("activity")) return "activity-explorer";
  return "music-explorer";
}

function formatDate(value?: string) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function toNumber(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}
