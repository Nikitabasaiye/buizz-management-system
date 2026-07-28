import type { SelectedSeatData } from "@/features/seat-map/seatMapTypes";
import type { BookingLineItem } from "@/store/ticket.store";
import type { BuizzTicketData } from "./ticketTypes";

export type BuizzBookingSeatGroup = {
  section: string;
  sectionColor?: string;
  totalSeats: number;
  seatNumbers: string[];
  amount: number;
};

export type TicketSeatGroup = BuizzBookingSeatGroup;

export type BuizzBookingPassStatus = "valid" | "used" | "cancelled" | "refunded" | "preview";

export type BuizzBookingPass = {
  id: string;
  bookingId: string;
  ticketId: string;
  eventId: string;
  eventSlug?: string;
  eventTitle: string;
  eventImage?: string;
  organizerName?: string;
  organizerLogo?: string;
  category: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  venueCity?: string;
  status: BuizzBookingPassStatus;
  totalSeats: number;
  totalAmountPaid: number;
  seatGroups: BuizzBookingSeatGroup[];
  qrValue: string;
  createdAt: string;
};

type TicketBlockLike = {
  label?: string;
  name?: string;
  section?: string;
  sectionName?: string;
  color?: string;
  sectionColor?: string;
  quantity?: number;
  totalSeats?: number;
  price?: number;
  amount?: number;
  totalAmount?: number;
  seats?: string[];
  seatNumbers?: string[];
};

type SeatLike = SelectedSeatData & {
  sectionName?: string;
  blockName?: string;
  ticketType?: string;
  amount?: number;
  sectionColor?: string;
  color?: string;
};

export function buildSeatGroupsFromBooking({
  selectedSeats = [],
  selectedTicketBlocks = [],
  lineItems = [],
}: {
  selectedSeats?: SelectedSeatData[];
  selectedTicketBlocks?: TicketBlockLike[];
  lineItems?: BookingLineItem[];
}): BuizzBookingSeatGroup[] {
  const seatMapSeats = selectedSeats.length
    ? selectedSeats
    : lineItems.flatMap((item) => item.selectedSeats ?? []);

  if (seatMapSeats.length) {
    const groups = new Map<string, BuizzBookingSeatGroup>();

    seatMapSeats.forEach((seat) => {
      const section = seat.section || seat.tierName || "Selected Seats";
      const seatNumber = seat.seatNumber || seat.label || seat.seatId || "Seat";
      const current = groups.get(section) ?? {
        section,
        totalSeats: 0,
        seatNumbers: [],
        amount: 0,
      };

      current.totalSeats += 1;
      current.seatNumbers = [...current.seatNumbers, seatNumber];
      current.amount += Number.isFinite(seat.price) ? seat.price : 0;
      groups.set(section, current);
    });

    return Array.from(groups.values());
  }

  if (lineItems.length) {
    return lineItems.map((item) => {
      const quantity = Math.max(1, item.quantity);
      const seats = item.seats?.filter(Boolean) ?? [];
      const isGeneralSeatLabel =
        seats.length === 1 && seats[0]?.toLowerCase() === item.label.toLowerCase();

      return {
        section: item.label || "General",
        totalSeats: quantity,
        seatNumbers: seats.length && !isGeneralSeatLabel ? seats : [`${item.label || "General"} x${quantity}`],
        amount: item.price * quantity,
      };
    });
  }

  if (selectedTicketBlocks.length) {
    return selectedTicketBlocks.map((block) => {
      const section = block.section || block.sectionName || block.name || block.label || "General";
      const quantity = Math.max(1, Number(block.totalSeats ?? block.quantity ?? 1));
      const seatNumbers = block.seatNumbers ?? block.seats ?? [`${section} x${quantity}`];
      const amount = Number(block.amount ?? block.totalAmount ?? Number(block.price ?? 0) * quantity);

      return {
        section,
        sectionColor: block.sectionColor || block.color,
        totalSeats: quantity,
        seatNumbers,
        amount: Number.isFinite(amount) ? amount : 0,
      };
    });
  }

  return [
    {
      section: "General",
      totalSeats: 1,
      seatNumbers: ["General x1"],
      amount: 0,
    },
  ];
}

export function buildSeatGroupsFromSelectedSeats(selectedSeats: SeatLike[] = []): BuizzBookingSeatGroup[] {
  const groups = new Map<string, BuizzBookingSeatGroup>();

  selectedSeats.forEach((seat) => {
    const section =
      seat.sectionName ||
      seat.section ||
      seat.blockName ||
      seat.ticketType ||
      seat.tierName ||
      "General";
    const seatNumber = seat.seatNumber || seat.label || seat.seatId || "Seat";
    const amount = normalizeNumber(seat.price ?? seat.amount, 0);
    const current = groups.get(section) ?? {
      section,
      sectionColor: seat.sectionColor || seat.color,
      totalSeats: 0,
      seatNumbers: [],
      amount: 0,
    };

    current.totalSeats += 1;
    current.seatNumbers = [...current.seatNumbers, String(seatNumber)];
    current.amount += amount;
    groups.set(section, current);
  });

  return Array.from(groups.values());
}

export function buildSeatGroupsFromLineItems(lineItems: BookingLineItem[] = []): BuizzBookingSeatGroup[] {
  return lineItems.map((line) => {
    const quantity = Math.max(1, normalizeNumber(line.quantity, 1));
    const section = line.label || "General";
    const seats = line.seats?.filter(Boolean) ?? [];
    const isGeneralSeatLabel =
      seats.length === 1 && seats[0]?.toLowerCase() === section.toLowerCase();

    return {
      section,
      totalSeats: quantity,
      seatNumbers: seats.length && !isGeneralSeatLabel ? seats : [`${section} x${quantity}`],
      amount: normalizeNumber(line.price, 0) * quantity,
    };
  });
}

export function normalizeBookingPasses<T extends BuizzBookingPass | BuizzTicketData>(savedTickets: T[] = []): T[] {
  const buckets = new Map<string, T[]>();

  savedTickets.forEach((ticket) => {
    const bookingId = getBookingId(ticket);
    if (!bookingId) return;
    buckets.set(bookingId, [...(buckets.get(bookingId) ?? []), ticket]);
  });

  return Array.from(buckets.values()).map((group) => mergeBookingPassGroup(group)) as T[];
}

export function flattenSeatNumbers(seatGroups: BuizzBookingSeatGroup[]) {
  return seatGroups.flatMap((group) => group.seatNumbers).filter(Boolean);
}

function mergeBookingPassGroup<T extends BuizzBookingPass | BuizzTicketData>(group: T[]) {
  if (group.length === 1) return normalizeSingleBookingPass(group[0]) as T;

  const primary = normalizeSingleBookingPass(group[0]);
  const bookingId = getBookingId(primary);
  const seatGroups = mergeSeatGroups(group.flatMap(extractSeatGroups));
  const totalSeats = seatGroups.reduce((sum, item) => sum + item.totalSeats, 0);
  const totalAmountPaid = seatGroups.reduce((sum, item) => sum + item.amount, 0);
  const qrValue = createBookingPassQrValue(primary, {
    bookingId,
    totalSeats,
    seatGroups,
    status: getPassStatus(primary),
  });

  return applyPassFields(primary, {
    bookingId,
    ticketId: bookingId,
    seatGroups,
    totalSeats,
    totalAmountPaid,
    qrValue,
  }) as T;
}

function normalizeSingleBookingPass<T extends BuizzBookingPass | BuizzTicketData>(ticket: T) {
  const bookingId = getBookingId(ticket);
  const seatGroups = mergeSeatGroups(extractSeatGroups(ticket));
  const totalSeats = seatGroups.reduce((sum, item) => sum + item.totalSeats, 0);
  const totalAmountPaid = getAmountPaid(ticket, seatGroups);

  return applyPassFields(ticket, {
    bookingId,
    ticketId: bookingId,
    seatGroups,
    totalSeats,
    totalAmountPaid,
    qrValue: createBookingPassQrValue(ticket, {
      bookingId,
      totalSeats,
      seatGroups,
      status: getPassStatus(ticket),
    }),
  });
}

function applyPassFields<T extends BuizzBookingPass | BuizzTicketData>(
  ticket: T,
  fields: {
    bookingId: string;
    ticketId: string;
    seatGroups: BuizzBookingSeatGroup[];
    totalSeats: number;
    totalAmountPaid: number;
    qrValue: string;
  },
) {
  if (isBookingPass(ticket)) {
    return {
      ...ticket,
      id: ticket.id || fields.bookingId,
      bookingId: fields.bookingId,
      ticketId: fields.ticketId,
      totalSeats: fields.totalSeats,
      totalAmountPaid: fields.totalAmountPaid,
      seatGroups: fields.seatGroups,
      qrValue: fields.qrValue,
    };
  }

  return {
    ...ticket,
    bookingId: fields.bookingId,
    ticketId: fields.ticketId,
    qrPayload: fields.qrValue,
    seatGroups: fields.seatGroups.map((group) => ({
      section: group.section,
      seats: group.seatNumbers,
      quantity: group.totalSeats,
      amount: group.amount,
    })),
    ticket: {
      ...ticket.ticket,
      seats: flattenSeatNumbers(fields.seatGroups),
      quantity: fields.totalSeats,
      amountPaid: fields.totalAmountPaid,
    },
  };
}

function extractSeatGroups(ticket: BuizzBookingPass | BuizzTicketData): BuizzBookingSeatGroup[] {
  if (isBookingPass(ticket)) {
    return ticket.seatGroups?.length
      ? ticket.seatGroups
      : [{
          section: "General",
          totalSeats: Math.max(1, normalizeNumber(ticket.totalSeats, 1)),
          seatNumbers: [`General x${Math.max(1, normalizeNumber(ticket.totalSeats, 1))}`],
          amount: normalizeNumber(ticket.totalAmountPaid, 0),
        }];
  }

  if (ticket.seatGroups?.length) {
    return ticket.seatGroups.map((group) => ({
      section: group.section || "General",
      totalSeats: Math.max(1, normalizeNumber(group.quantity, 1)),
      seatNumbers: group.seats?.length ? group.seats.map(String) : [`${group.section || "General"} x${Math.max(1, normalizeNumber(group.quantity, 1))}`],
      amount: normalizeNumber(group.amount, 0),
    }));
  }

  const selectedSeats = ticket.ticket.selectedSeats ?? [];
  if (selectedSeats.length) return buildSeatGroupsFromSelectedSeats(selectedSeats);

  return buildSeatGroupsFromLineItems([
    {
      label: ticket.ticket.section || ticket.ticket.ticketType || "General",
      quantity: Math.max(1, normalizeNumber(ticket.ticket.quantity, 1)),
      price: normalizeNumber(ticket.ticket.quantity, 1)
        ? normalizeNumber(ticket.ticket.amountPaid, 0) / Math.max(1, normalizeNumber(ticket.ticket.quantity, 1))
        : normalizeNumber(ticket.ticket.amountPaid, 0),
      seats: ticket.ticket.seats?.length ? ticket.ticket.seats : undefined,
      selectedSeats,
    },
  ]);
}

function mergeSeatGroups(groups: BuizzBookingSeatGroup[]) {
  const merged = new Map<string, BuizzBookingSeatGroup & { seen: Set<string> }>();

  groups.forEach((group) => {
    const section = group.section || "General";
    const current = merged.get(section) ?? {
      section,
      sectionColor: group.sectionColor,
      totalSeats: 0,
      seatNumbers: [],
      amount: 0,
      seen: new Set<string>(),
    };

    const numbers = group.seatNumbers?.length ? group.seatNumbers : [`${section} x${Math.max(1, group.totalSeats)}`];
    numbers.forEach((seatNumber) => {
      const value = String(seatNumber);
      if (current.seen.has(value)) return;
      current.seen.add(value);
      current.seatNumbers.push(value);
    });

    current.totalSeats = Math.max(current.totalSeats, current.seatNumbers.length || group.totalSeats);
    current.amount += normalizeNumber(group.amount, 0);
    merged.set(section, current);
  });

  return Array.from(merged.values()).map(({ seen: _seen, ...group }) => ({
    ...group,
    totalSeats: Math.max(1, group.totalSeats),
  }));
}

function createBookingPassQrValue(
  ticket: BuizzBookingPass | BuizzTicketData,
  fields: {
    bookingId: string;
    totalSeats: number;
    seatGroups: BuizzBookingSeatGroup[];
    status: BuizzBookingPassStatus;
  },
) {
  return JSON.stringify({
    type: "buizz-booking-pass",
    bookingId: fields.bookingId,
    eventId: getEventId(ticket),
    eventSlug: getEventSlug(ticket),
    totalSeats: fields.totalSeats,
    seatGroups: fields.seatGroups,
    status: fields.status,
    signedToken: "pending-backend-signature",
  });
}

function getBookingId(ticket: BuizzBookingPass | BuizzTicketData) {
  return String(ticket.bookingId || ticket.ticketId || (isBookingPass(ticket) ? ticket.id : "") || "");
}

function getEventId(ticket: BuizzBookingPass | BuizzTicketData) {
  return isBookingPass(ticket) ? ticket.eventId : ticket.event.id;
}

function getEventSlug(ticket: BuizzBookingPass | BuizzTicketData) {
  return isBookingPass(ticket) ? ticket.eventSlug : ticket.event.slug;
}

function getPassStatus(ticket: BuizzBookingPass | BuizzTicketData): BuizzBookingPassStatus {
  const raw = "status" in ticket ? ticket.status : ticket.ticketStatus;
  const status = String(raw).toLowerCase();
  if (status.includes("used") || status.includes("checked")) return "used";
  if (status.includes("cancel") || status.includes("blocked")) return "cancelled";
  if (status.includes("refund")) return "refunded";
  if (status.includes("preview")) return "preview";
  return "valid";
}

function getAmountPaid(ticket: BuizzBookingPass | BuizzTicketData, seatGroups: BuizzBookingSeatGroup[]) {
  const fromTicket =
    "totalAmountPaid" in ticket
      ? normalizeNumber(ticket.totalAmountPaid, 0)
      : normalizeNumber(ticket.ticket.amountPaid, 0);

  if (fromTicket > 0) return fromTicket;
  return seatGroups.reduce((sum, group) => sum + group.amount, 0);
}

function normalizeNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isBookingPass(ticket: BuizzBookingPass | BuizzTicketData): ticket is BuizzBookingPass {
  return "eventTitle" in ticket;
}
