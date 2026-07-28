// "use client";

// import type { BuizzTicketData } from "@/features/tickets";

// import {
//   buizzIntegrationStorageKeys,
//   readStorageArray,
//   uniqueBy,
//   upsertStorageRecord,
//   writeStorageValue,
// } from "./frontendStorage";

// export type UnifiedBookingSource = "Online" | "Offline" | "Reserved" | "Free";
// export type UnifiedPaymentMode =
//   | "Online Mock"
//   | "Cash"
//   | "UPI"
//   | "Card"
//   | "Other"
//   | "Complimentary"
//   | "Free Registration"; "Online Mock" | "Cash" | "UPI" | "Card" | "Other" | "Complimentary";
// export type UnifiedBookingStatus = "confirmed" | "issued" | "checked_in" | "cancelled" | "refunded";

// export type UnifiedBookingRecord = {
//   id: string;
//   bookingId: string;
//   ticketId: string;
//   eventId: string;
//   eventTitle: string;
//   category: string;
//   organizerId: string;
//   organizerName: string;
//   customerName: string;
//   customerPhone: string;
//   customerEmail?: string;
//   source: UnifiedBookingSource;
//   ticketBlock: string;
//   quantity: number;
//   pricePerTicket: number;
//   totalAmount: number;
//   amountCollected: number;
//   balanceAmount: number;
//   paymentMode: UnifiedPaymentMode;
//   paymentReference?: string;
//   status: UnifiedBookingStatus;
//   venueName: string;
//   city: string;
//   date: string;
//   time: string;
//   issuedAt: string;
//   createdAt: string;
//   updatedAt: string;
// };

// export type BuizzCheckInRecord = {
//   id: string;
//   bookingId: string;
//   ticketId: string;
//   eventId: string;
//   customerName: string;
//   source: UnifiedBookingSource;
//   status: "checked_in";
//   checkedInAt: string;
//   checkedInBy: string;
// };

// type OfflineBookingLike = Partial<UnifiedBookingRecord> & {
//   eventTitle?: string;
//   ticketBlock?: string;
//   paymentMode?: string;
//   status?: string;
// };

// export function readUnifiedBookings(): UnifiedBookingRecord[] {
//   const online = readOnlineBookings();
//   const offline = readOfflineBookings();
//   const userTickets = readUserTicketBookings();
//   return uniqueBy([...online, ...offline, ...userTickets], (booking) => booking.bookingId || booking.ticketId);
// }

// export function saveUnifiedBooking(booking: UnifiedBookingRecord) {
//   const normalized = normalizeUnifiedBooking(booking);
//   if (!normalized) return null;
//   const key = normalized.source === "Online"
//     ? buizzIntegrationStorageKeys.onlineBookings
//     : buizzIntegrationStorageKeys.offlineBookings;
//   upsertStorageRecord(key, normalized, (item) => item.bookingId || item.id);
//   return normalized;
// }

// export function readOnlineBookings(): UnifiedBookingRecord[] {
//   return readStorageArray<unknown>(buizzIntegrationStorageKeys.onlineBookings)
//     .map((item) => normalizeUnifiedBooking(item, "Online"))
//     .filter(Boolean) as UnifiedBookingRecord[];
// }

// export function readOfflineBookings(): UnifiedBookingRecord[] {
//   return readStorageArray<unknown>(buizzIntegrationStorageKeys.offlineBookings)
//     .map((item) => normalizeUnifiedBooking(item, "Offline"))
//     .filter(Boolean) as UnifiedBookingRecord[];
// }

// export function readBookingsByEvent(eventId: string) {
//   return readUnifiedBookings().filter((booking) => booking.eventId === eventId);
// }

// export function readAttendeesByOrganizer(organizerId?: string) {
//   return readUnifiedBookings()
//     .filter((booking) => !organizerId || booking.organizerId === organizerId)
//     .map((booking) => ({
//       bookingId: booking.bookingId,
//       ticketId: booking.ticketId,
//       eventId: booking.eventId,
//       eventTitle: booking.eventTitle,
//       customerName: booking.customerName,
//       customerPhone: booking.customerPhone,
//       ticketBlock: booking.ticketBlock,
//       quantity: booking.quantity,
//       source: booking.source,
//       paymentMode: booking.paymentMode,
//       checkInStatus: isTicketCheckedIn(booking.ticketId) ? "checked_in" : "pending",
//     }));
// }

// export function readRevenueSummary(organizerId?: string) {
//   const bookings = readUnifiedBookings().filter((booking) => !organizerId || booking.organizerId === organizerId);
//   const onlineRevenue = sumBySource(bookings, "Online");
//   const offlineRevenue = sumBySource(bookings, "Offline");
//   const reservedValue = sumBySource(bookings, "Reserved");
//   const totalCollected = bookings.reduce((sum, booking) => sum + booking.amountCollected, 0);
//   const complimentaryTickets = bookings.filter((booking) => booking.paymentMode === "Complimentary").reduce((sum, booking) => sum + booking.quantity, 0);
//   const pendingBalance = bookings.reduce((sum, booking) => sum + booking.balanceAmount, 0);

//   return {
//     onlineRevenue,
//     offlineRevenue,
//     reservedValue,
//     totalCollected,
//     complimentaryTickets,
//     pendingBalance,
//     paymentSplit: ["Online Mock", "Cash", "UPI", "Card", "Other", "Complimentary"].map((mode) => ({
//       mode: mode as UnifiedPaymentMode,
//       amount: bookings.filter((booking) => booking.paymentMode === mode).reduce((sum, booking) => sum + booking.amountCollected, 0),
//       count: bookings.filter((booking) => booking.paymentMode === mode).length,
//     })),
//     sourceSplit: ["Online", "Offline", "Reserved", "Free"].map((source) => ({
//       source: source as UnifiedBookingSource,
//       count: bookings.filter((booking) => booking.source === source).length,
//       tickets: bookings.filter((booking) => booking.source === source).reduce((sum, booking) => sum + booking.quantity, 0),
//     })),
//   };
// }

// export function readCheckIns(): BuizzCheckInRecord[] {
//   return readStorageArray<unknown>(buizzIntegrationStorageKeys.checkIns)
//     .map(normalizeCheckIn)
//     .filter(Boolean) as BuizzCheckInRecord[];
// }

// export function saveCheckIn(record: BuizzCheckInRecord) {
//   upsertStorageRecord(buizzIntegrationStorageKeys.checkIns, record, (item) => item.ticketId || item.bookingId || item.id);
// }

// export function isTicketCheckedIn(ticketId: string) {
//   return readCheckIns().some((checkIn) => checkIn.ticketId === ticketId);
// }

// export function normalizeUnifiedBooking(value: unknown, fallbackSource: UnifiedBookingSource = "Online"): UnifiedBookingRecord | null {
//   if (!value || typeof value !== "object") return null;
//   const candidate = value as OfflineBookingLike;
//   if (!candidate.bookingId && !candidate.ticketId && !candidate.eventId) return null;
//   const now = new Date().toISOString();
//   const quantity = normalizeNumber(candidate.quantity, 1);
//   const totalAmount = normalizeNumber(candidate.totalAmount, normalizeNumber(candidate.amountCollected, 0));
//   const source = normalizeSource(candidate.source, fallbackSource);
//   const paymentMode = normalizePaymentMode(candidate.paymentMode, source);

//   return {
//     id: String(candidate.id ?? candidate.bookingId ?? candidate.ticketId),
//     bookingId: String(candidate.bookingId ?? candidate.id ?? `BUIZZ-${source.toUpperCase()}-LOCAL`),
//     ticketId: String(candidate.ticketId ?? `TKT-${source.toUpperCase()}-LOCAL`),
//     eventId: String(candidate.eventId ?? "event-local"),
//     eventTitle: String(candidate.eventTitle ?? "Buizz Event"),
//     category: String(candidate.category ?? "event"),
//     organizerId: String(candidate.organizerId ?? "organizer-demo"),
//     organizerName: String(candidate.organizerName ?? "Buizz Organizer"),
//     customerName: String(candidate.customerName ?? "Customer"),
//     customerPhone: String(candidate.customerPhone ?? ""),
//     customerEmail: candidate.customerEmail ? String(candidate.customerEmail) : undefined,
//     source,
//     ticketBlock: String(candidate.ticketBlock ?? "Entry Pass"),
//     quantity,
//     pricePerTicket: normalizeNumber(candidate.pricePerTicket, quantity ? Math.round(totalAmount / quantity) : totalAmount),
//     totalAmount,
//     amountCollected: normalizeNumber(candidate.amountCollected, totalAmount),
//     balanceAmount: normalizeNumber(candidate.balanceAmount, Math.max(totalAmount - normalizeNumber(candidate.amountCollected, totalAmount), 0)),
//     paymentMode,
//     paymentReference: candidate.paymentReference ? String(candidate.paymentReference) : undefined,
//     status: normalizeBookingStatus(candidate.status, source),
//     venueName: String(candidate.venueName ?? "Venue pending"),
//     city: String(candidate.city ?? "City pending"),
//     date: String(candidate.date ?? ""),
//     time: String(candidate.time ?? ""),
//     issuedAt: String(candidate.issuedAt ?? candidate.createdAt ?? now),
//     createdAt: String(candidate.createdAt ?? candidate.issuedAt ?? now),
//     updatedAt: String(candidate.updatedAt ?? now),
//   };
// }

// function readUserTicketBookings() {
//   return readStorageArray<BuizzTicketData>(buizzIntegrationStorageKeys.userTickets)
//     .map((ticket) => normalizeUnifiedBooking({
//       id: ticket.bookingId,
//       bookingId: ticket.bookingId,
//       ticketId: ticket.ticketId,
//       eventId: ticket.event.id,
//       eventTitle: ticket.event.title,
//       category: ticket.event.category,
//       organizerId: ticket.organizer.id,
//       organizerName: ticket.organizer.name,
//       customerName: ticket.buyer.name,
//       customerPhone: ticket.buyer.contactMasked,
//       source: "Online",
//       ticketBlock: ticket.ticket.ticketType,
//       quantity: ticket.ticket.quantity,
//       pricePerTicket: ticket.ticket.quantity ? Math.round(ticket.ticket.amountPaid / ticket.ticket.quantity) : ticket.ticket.amountPaid,
//       totalAmount: ticket.ticket.amountPaid,
//       amountCollected: ticket.ticket.amountPaid,
//       balanceAmount: 0,
//       paymentMode: "Online Mock",
//       status: ticket.ticketStatus === "Used" ? "checked_in" : ticket.ticketStatus === "Cancelled" ? "cancelled" : "confirmed",
//       venueName: ticket.event.venueName,
//       city: ticket.event.city,
//       date: ticket.event.date,
//       time: ticket.event.startTime,
//       issuedAt: ticket.issuedAt,
//     }, "Online"))
//     .filter(Boolean) as UnifiedBookingRecord[];
// }

// function normalizeCheckIn(value: unknown): BuizzCheckInRecord | null {
//   if (!value || typeof value !== "object") return null;
//   const candidate = value as Partial<BuizzCheckInRecord>;
//   if (!candidate.ticketId && !candidate.bookingId) return null;
//   return {
//     id: String(candidate.id ?? candidate.ticketId ?? candidate.bookingId),
//     bookingId: String(candidate.bookingId ?? ""),
//     ticketId: String(candidate.ticketId ?? ""),
//     eventId: String(candidate.eventId ?? ""),
//     customerName: String(candidate.customerName ?? "Customer"),
//     source: normalizeSource(candidate.source, "Online"),
//     status: "checked_in",
//     checkedInAt: String(candidate.checkedInAt ?? new Date().toISOString()),
//     checkedInBy: String(candidate.checkedInBy ?? "Organizer Gate Staff"),
//   };
// }

// function normalizeSource(value: unknown, fallback: UnifiedBookingSource): UnifiedBookingSource {
//   if (value === "Offline" || value === "Reserved" || value === "Free" || value === "Online") return value;
//   return fallback;
// }

// function normalizePaymentMode(
//   value: unknown,
//   source: UnifiedBookingSource
// ): UnifiedPaymentMode {
//   if (
//     value === "Cash" ||
//     value === "UPI" ||
//     value === "Card" ||
//     value === "Other" ||
//     value === "Complimentary" ||
//     value === "Online Mock" ||
//     value === "Free Registration"
//   ) {
//     return value;
//   }

//   if (source === "Free") return "Free Registration";
//   return source === "Online" ? "Online Mock" : "Cash";
// }

// function normalizeBookingStatus(value: unknown, source: UnifiedBookingSource): UnifiedBookingStatus {
//   if (value === "confirmed" || value === "issued" || value === "checked_in" || value === "cancelled" || value === "refunded") return value;
//   if (value === "issued") return "issued";
//   return source === "Online" ? "confirmed" : "issued";
// }

// function normalizeNumber(value: unknown, fallback: number) {
//   const next = Number(value);
//   return Number.isFinite(next) ? next : fallback;
// }

// function sumBySource(bookings: UnifiedBookingRecord[], source: UnifiedBookingSource) {
//   return bookings.filter((booking) => booking.source === source).reduce((sum, booking) => sum + booking.amountCollected, 0);
// }




"use client";

import type { BuizzTicketData } from "@/features/tickets";
import type { SelectedSeatData } from "@/features/seat-map/seatMapTypes";

import {
  buizzIntegrationStorageKeys,
  readStorageArray,
  uniqueBy,
  upsertStorageRecord,
  writeStorageValue,
} from "./frontendStorage";

export type UnifiedBookingSource = "Online" | "Offline" | "Reserved" | "Free";
export type UnifiedPaymentMode =
  | "Online"
  | "Cash"
  | "UPI"
  | "Razorpay"
  | "Card"
  | "Other"
  | "Complimentary"
  | "Free Registration";
export type UnifiedBookingStatus = "confirmed" | "issued" | "checked_in" | "cancelled" | "refunded";

export type UnifiedBookingRecord = {
  id: string;
  bookingId: string;
  ticketId: string;
  eventId: string;
  eventTitle: string;
  category: string;
  organizerId: string;
  organizerName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  source: UnifiedBookingSource;
  ticketBlock: string;
  quantity: number;
  pricePerTicket: number;
  totalAmount: number;
  amountCollected: number;
  balanceAmount: number;
  paymentMode: UnifiedPaymentMode;
  paymentReference?: string;
  status: UnifiedBookingStatus;
  selectedSeats?: SelectedSeatData[];
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  seatLockId?: string;
  venueName: string;
  city: string;
  date: string;
  time: string;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BuizzCheckInRecord = {
  id: string;
  bookingId: string;
  ticketId: string;
  eventId: string;
  customerName: string;
  source: UnifiedBookingSource;
  selectedSeats?: SelectedSeatData[];
  gate?: string;
  status: "checked_in";
  checkedInAt: string;
  checkedInBy: string;
};

type OfflineBookingLike = Partial<UnifiedBookingRecord> & {
  eventTitle?: string;
  ticketBlock?: string;
  paymentMode?: string;
  status?: string;
};

export function readUnifiedBookings(): UnifiedBookingRecord[] {
  // This function now returns empty array - use RTK Query hooks from platformApi instead
  // Import and use: useGetUserBookingsQuery, useGetOrganizerBookingsQuery, useGetAllBookingsQuery
  return [];
}

export function saveUnifiedBooking(booking: UnifiedBookingRecord) {
  const normalized = normalizeUnifiedBooking(booking);
  if (!normalized) return null;
  const key = normalized.source === "Online"
    ? buizzIntegrationStorageKeys.onlineBookings
    : buizzIntegrationStorageKeys.offlineBookings;
  upsertStorageRecord(key, normalized, (item) => item.bookingId || item.id);
  return normalized;
}

export function readOnlineBookings(): UnifiedBookingRecord[] {
  return readStorageArray<unknown>(buizzIntegrationStorageKeys.onlineBookings)
    .map((item) => normalizeUnifiedBooking(item, "Online"))
    .filter(Boolean) as UnifiedBookingRecord[];
}

export function readOfflineBookings(): UnifiedBookingRecord[] {
  return readStorageArray<unknown>(buizzIntegrationStorageKeys.offlineBookings)
    .map((item) => normalizeUnifiedBooking(item, "Offline"))
    .filter(Boolean) as UnifiedBookingRecord[];
}

export function readBookingsByEvent(eventId: string) {
  return readUnifiedBookings().filter((booking) => booking.eventId === eventId);
}

export function readAttendeesByOrganizer(organizerId?: string) {
  return readUnifiedBookings()
    .filter((booking) => !organizerId || booking.organizerId === organizerId)
    .map((booking) => ({
      bookingId: booking.bookingId,
      ticketId: booking.ticketId,
      eventId: booking.eventId,
      eventTitle: booking.eventTitle,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      ticketBlock: booking.ticketBlock,
      quantity: booking.quantity,
      source: booking.source,
      paymentMode: booking.paymentMode,
      checkInStatus: isTicketCheckedIn(booking.ticketId) ? "checked_in" : "pending",
    }));
}

export function readRevenueSummary(organizerId?: string) {
  const bookings = readUnifiedBookings().filter((booking) => !organizerId || booking.organizerId === organizerId);
  const onlineRevenue = sumBySource(bookings, "Online");
  const offlineRevenue = sumBySource(bookings, "Offline");
  const reservedValue = sumBySource(bookings, "Reserved");
  const totalCollected = bookings.reduce((sum, booking) => sum + booking.amountCollected, 0);
  const complimentaryTickets = bookings.filter((booking) => booking.paymentMode === "Complimentary").reduce((sum, booking) => sum + booking.quantity, 0);
  const pendingBalance = bookings.reduce((sum, booking) => sum + booking.balanceAmount, 0);

  return {
    onlineRevenue,
    offlineRevenue,
    reservedValue,
    totalCollected,
    complimentaryTickets,
    pendingBalance,
    paymentSplit: ["Online", "Cash", "UPI", "Razorpay", "Card", "Other", "Complimentary", "Free Registration"].map((mode) => ({
      mode: mode as UnifiedPaymentMode,
      amount: bookings.filter((booking) => booking.paymentMode === mode).reduce((sum, booking) => sum + booking.amountCollected, 0),
      count: bookings.filter((booking) => booking.paymentMode === mode).length,
    })),
    sourceSplit: ["Online", "Offline", "Reserved", "Free"].map((source) => ({
      source: source as UnifiedBookingSource,
      count: bookings.filter((booking) => booking.source === source).length,
      tickets: bookings.filter((booking) => booking.source === source).reduce((sum, booking) => sum + booking.quantity, 0),
    })),
  };
}

export function readCheckIns(): BuizzCheckInRecord[] {
  return readStorageArray<unknown>(buizzIntegrationStorageKeys.checkIns)
    .map(normalizeCheckIn)
    .filter(Boolean) as BuizzCheckInRecord[];
}

export function saveCheckIn(record: BuizzCheckInRecord) {
  upsertStorageRecord(buizzIntegrationStorageKeys.checkIns, record, (item) => item.ticketId || item.bookingId || item.id);
}

export function isTicketCheckedIn(ticketId: string) {
  return readCheckIns().some((checkIn) => checkIn.ticketId === ticketId);
}

export function normalizeUnifiedBooking(value: unknown, fallbackSource: UnifiedBookingSource = "Online"): UnifiedBookingRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as OfflineBookingLike;
  if (!candidate.bookingId && !candidate.ticketId && !candidate.eventId) return null;
  const now = new Date().toISOString();
  const quantity = normalizeNumber(candidate.quantity, 1);
  const totalAmount = normalizeNumber(candidate.totalAmount, normalizeNumber(candidate.amountCollected, 0));
  const source = normalizeSource(candidate.source, fallbackSource);
  const paymentMode = normalizePaymentMode(candidate.paymentMode, source);

  return {
    id: String(candidate.id ?? candidate.bookingId ?? candidate.ticketId),
    bookingId: String(candidate.bookingId ?? candidate.id ?? `BUIZZ-${source.toUpperCase()}-LOCAL`),
    ticketId: String(candidate.ticketId ?? `TKT-${source.toUpperCase()}-LOCAL`),
    eventId: String(candidate.eventId ?? "event-local"),
    eventTitle: String(candidate.eventTitle ?? "Buizz Event"),
    category: String(candidate.category ?? "event"),
    organizerId: String(candidate.organizerId ?? "organizer-demo"),
    organizerName: String(candidate.organizerName ?? "Buizz Organizer"),
    customerName: String(candidate.customerName ?? "Customer"),
    customerPhone: String(candidate.customerPhone ?? ""),
    customerEmail: candidate.customerEmail ? String(candidate.customerEmail) : undefined,
    source,
    ticketBlock: String(candidate.ticketBlock ?? "Entry Pass"),
    quantity,
    pricePerTicket: normalizeNumber(candidate.pricePerTicket, quantity ? Math.round(totalAmount / quantity) : totalAmount),
    totalAmount,
    amountCollected: normalizeNumber(candidate.amountCollected, totalAmount),
    balanceAmount: normalizeNumber(candidate.balanceAmount, Math.max(totalAmount - normalizeNumber(candidate.amountCollected, totalAmount), 0)),
    paymentMode,
    paymentReference: candidate.paymentReference ? String(candidate.paymentReference) : undefined,
    status: normalizeBookingStatus(candidate.status, source),
    selectedSeats: normalizeSelectedSeats(candidate.selectedSeats),
    seatMapTemplateId: candidate.seatMapTemplateId ? String(candidate.seatMapTemplateId) : undefined,
    seatMapOverrideId: candidate.seatMapOverrideId ? String(candidate.seatMapOverrideId) : undefined,
    seatLockId: candidate.seatLockId ? String(candidate.seatLockId) : undefined,
    venueName: String(candidate.venueName ?? "Venue pending"),
    city: String(candidate.city ?? "City pending"),
    date: String(candidate.date ?? ""),
    time: String(candidate.time ?? ""),
    issuedAt: String(candidate.issuedAt ?? candidate.createdAt ?? now),
    createdAt: String(candidate.createdAt ?? candidate.issuedAt ?? now),
    updatedAt: String(candidate.updatedAt ?? now),
  };
}

function readUserTicketBookings() {
  return readStorageArray<BuizzTicketData>(buizzIntegrationStorageKeys.userTickets)
    .map((ticket) => normalizeUnifiedBooking({
      id: ticket.bookingId,
      bookingId: ticket.bookingId,
      ticketId: ticket.ticketId,
      eventId: ticket.event.id,
      eventTitle: ticket.event.title,
      category: ticket.event.category,
      organizerId: ticket.organizer.id,
      organizerName: ticket.organizer.name,
      customerName: ticket.buyer.name,
      customerPhone: ticket.buyer.contactMasked,
      source: ticket.ticket.amountPaid <= 0 ? "Free" : "Online",
      ticketBlock: ticket.ticket.ticketType,
      quantity: ticket.ticket.quantity,
      pricePerTicket: ticket.ticket.quantity ? Math.round(ticket.ticket.amountPaid / ticket.ticket.quantity) : ticket.ticket.amountPaid,
      totalAmount: ticket.ticket.amountPaid,
      amountCollected: ticket.ticket.amountPaid,
      balanceAmount: 0,
      paymentMode: ticket.ticket.amountPaid <= 0 ? "Free Registration" : "Online",
      status: ticket.ticketStatus === "Used" ? "checked_in" : ticket.ticketStatus === "Cancelled" ? "cancelled" : "confirmed",
      selectedSeats: normalizeTicketSeats(ticket),
      venueName: ticket.event.venueName,
      city: ticket.event.city,
      date: ticket.event.date,
      time: ticket.event.startTime,
      issuedAt: ticket.issuedAt,
    }, "Online"))
    .filter(Boolean) as UnifiedBookingRecord[];
}

function normalizeCheckIn(value: unknown): BuizzCheckInRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<BuizzCheckInRecord>;
  if (!candidate.ticketId && !candidate.bookingId) return null;
  const selectedSeats = normalizeSelectedSeats(candidate.selectedSeats);
  return {
    id: String(candidate.id ?? candidate.ticketId ?? candidate.bookingId),
    bookingId: String(candidate.bookingId ?? ""),
    ticketId: String(candidate.ticketId ?? ""),
    eventId: String(candidate.eventId ?? ""),
    customerName: String(candidate.customerName ?? "Customer"),
    source: normalizeSource(candidate.source, "Online"),
    selectedSeats,
    gate: candidate.gate ? String(candidate.gate) : selectedSeats?.[0]?.gate,
    status: "checked_in",
    checkedInAt: String(candidate.checkedInAt ?? new Date().toISOString()),
    checkedInBy: String(candidate.checkedInBy ?? "Organizer Gate Staff"),
  };
}

function normalizeSelectedSeats(value: unknown): SelectedSeatData[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seats = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      seatId: String(item.seatId ?? item.id ?? item.label ?? ""),
      label: String(item.label ?? item.seatNumber ?? "Seat"),
      section: String(item.section ?? item.sectionName ?? "Section"),
      row: item.row ? String(item.row) : undefined,
      seatNumber: item.seatNumber ? String(item.seatNumber) : undefined,
      gate: item.gate ? String(item.gate) : undefined,
      tierId: item.tierId ? String(item.tierId) : undefined,
      tierName: item.tierName ? String(item.tierName) : undefined,
      price: normalizeNumber(item.price, 0),
    }))
    .filter((seat) => seat.seatId || seat.label);
  return seats.length ? seats : undefined;
}

function normalizeTicketSeats(ticket: BuizzTicketData): SelectedSeatData[] | undefined {
  if (!ticket.ticket.seats.length) return undefined;
  return ticket.ticket.seats.map((label) => ({
    seatId: `${ticket.ticket.ticketTypeId}-${label}`,
    label,
    section: ticket.ticket.section || ticket.ticket.seatBlock,
    gate: ticket.ticket.gate,
    tierId: ticket.ticket.ticketTypeId,
    tierName: ticket.ticket.ticketType,
    price: ticket.ticket.quantity ? Math.round(ticket.ticket.amountPaid / ticket.ticket.quantity) : ticket.ticket.amountPaid,
  }));
}

function normalizeSource(value: unknown, fallback: UnifiedBookingSource): UnifiedBookingSource {
  if (value === "Offline" || value === "Reserved" || value === "Free" || value === "Online") return value;
  return fallback;
}

function normalizePaymentMode(
  value: unknown,
  source: UnifiedBookingSource
): UnifiedPaymentMode {
  if (
    value === "Cash" ||
    value === "UPI" ||
    value === "Razorpay" ||
    value === "Card" ||
    value === "Other" ||
    value === "Complimentary" ||
    value === "Online" ||
    value === "Free Registration"
  ) {
    return value;
  }

  if (source === "Free") return "Free Registration";
  return source === "Online" ? "Online" : "Cash";
}

function normalizeBookingStatus(value: unknown, source: UnifiedBookingSource): UnifiedBookingStatus {
  if (value === "confirmed" || value === "issued" || value === "checked_in" || value === "cancelled" || value === "refunded") return value;
  if (value === "issued") return "issued";
  return source === "Online" ? "confirmed" : "issued";
}

function normalizeNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function sumBySource(bookings: UnifiedBookingRecord[], source: UnifiedBookingSource) {
  return bookings.filter((booking) => booking.source === source).reduce((sum, booking) => sum + booking.amountCollected, 0);
}
