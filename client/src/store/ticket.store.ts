import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeliveryPreference } from "@/store/auth.store";
import type { TicketThemeKey } from "@/features/tickets/ticketTypes";
import type { SelectedSeatData } from "@/features/seat-map/seatMapTypes";

export type TicketStatus = "Valid" | "Used" | "Cancelled" | "Refunded" | "Expired" | "Transferred" | "Blocked";

export type BookingLineItem = {
  label: string;
  quantity: number;
  price: number;
  seats?: string[];
  selectedSeats?: SelectedSeatData[];
};

export type TicketSeatGroup = {
  section: string;
  seats: string[];
  quantity: number;
  amount: number;
};

export type BuizzTicket = {
  bookingId: string;
  ticketId: string;
  itemId: string;
  eventSlug?: string;
  kind: "events" | "plays" | "activities";
  eventName: string;
  eventImage: string;
  bannerUrl?: string;
  category?: string;
  eventType?: string;
  ticketThemeKey?: TicketThemeKey;
  date: string;
  time: string;
  venue: string;
  city: string;
  duration: string;
  organizerName?: string;
  organizerLogo?: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  deliveryPreference: DeliveryPreference;
  groupPlanning?: string;
  lineItems: BookingLineItem[];
  seatGroups?: TicketSeatGroup[];
  selectedSeats?: SelectedSeatData[];
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  seatLockId?: string;
  subtotal: number;
  convenienceFee: number;
  taxes: number;
  total: number;
  status: TicketStatus;
  qrStatus: "QR Ready" | "Attended" | "Unavailable";
  qrPayload?: string;
  seatingType?: string;
  gate?: string;
  emailStatus?: "Sent to Email";
  whatsappStatus?: "Sent to WhatsApp";
  createdAt: string;
  attendedAt?: string;
  passportStamp?: string;
  xpAwarded?: number;
};

export type PassportStamp = {
  id: string;
  title: string;
  category: string;
  unlocked: boolean;
  xp: number;
  unlockedAt?: string;
  recent?: boolean;
};

type TicketStore = {
  tickets: BuizzTicket[];
  stamps: PassportStamp[];
  addTicket: (ticket: BuizzTicket) => void;
  addTickets: (tickets: BuizzTicket[]) => void;
  markTicketUsed: (ticketId: string) => { ok: boolean; message: string; stamp?: PassportStamp };
  getTicket: (ticketIdOrBookingId: string) => BuizzTicket | undefined;
  getTicketsByBookingId: (bookingId: string) => BuizzTicket[];
};

const initialStamps: PassportStamp[] = [
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

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      tickets: [],
      stamps: initialStamps,
      addTicket: (ticket) =>
        set((state) => ({
          tickets: [ticket, ...state.tickets.filter((current) => current.bookingId !== ticket.bookingId)],
        })),
      addTickets: (tickets) =>
        set((state) => ({
          tickets: [
            ...tickets,
            ...state.tickets.filter((current) => !tickets.some((ticket) => ticket.bookingId === current.bookingId)),
          ],
        })),
      getTicket: (ticketIdOrBookingId) =>
        get().tickets.find((ticket) => ticket.ticketId === ticketIdOrBookingId || ticket.bookingId === ticketIdOrBookingId),
      getTicketsByBookingId: (bookingId) => get().tickets.filter((ticket) => ticket.bookingId === bookingId),
      markTicketUsed: (ticketId) => {
        const ticket = get().tickets.find((current) => current.ticketId === ticketId || current.bookingId === ticketId);
        if (!ticket) return { ok: false, message: "Ticket not found" };
        if (ticket.status === "Used") return { ok: false, message: "Already Used" };
        if (ticket.status === "Cancelled") return { ok: false, message: "Ticket Cancelled" };
        if (ticket.status === "Refunded") return { ok: false, message: "Ticket Refunded" };
        if (ticket.status === "Expired") return { ok: false, message: "Ticket Expired" };
        if (ticket.status === "Transferred") return { ok: false, message: "Transfer Pending" };
        if (ticket.status === "Blocked") return { ok: false, message: "Entry Blocked" };

        const stampId = inferStampId(ticket);
        let unlockedStamp: PassportStamp | undefined;

        set((state) => ({
          tickets: state.tickets.map((current) =>
            current.ticketId === ticket.ticketId
              ? {
                  ...current,
                  status: "Used",
                  qrStatus: "Attended",
                  attendedAt: new Date().toISOString(),
                  passportStamp: stampId,
                  xpAwarded: 50,
                }
              : current
          ),
          stamps: state.stamps.map((stamp) => {
            const next = { ...stamp, recent: false };
            if (stamp.id !== stampId) return next;
            unlockedStamp = { ...next, unlocked: true, recent: true, unlockedAt: new Date().toISOString() };
            return unlockedStamp;
          }),
        }));

        return { ok: true, message: "Entry Approved", stamp: unlockedStamp };
      },
    }),
    { name: "buizz-ticket-system" }
  )
);

function inferStampId(ticket: BuizzTicket) {
  const text = `${ticket.eventName} ${ticket.kind} ${ticket.lineItems.map((item) => item.label).join(" ")}`.toLowerCase();
  if (ticket.kind === "plays" || text.includes("play") || text.includes("theatre")) return "theatre-lover";
  if (text.includes("comedy")) return "comedy-fan";
  if (text.includes("sport") || text.includes("cricket") || text.includes("football") || text.includes("badminton")) return "sports-explorer";
  if (text.includes("food")) return "food-trailblazer";
  if (text.includes("business") || text.includes("startup")) return "business-networker";
  if (text.includes("spiritual") || text.includes("satsang")) return "spiritual-seeker";
  if (text.includes("culture") || text.includes("art")) return "culture-collector";
  if (text.includes("festival") || text.includes("fest")) return "festival-hopper";
  if (ticket.kind === "activities") return "activity-explorer";
  return "music-explorer";
}
