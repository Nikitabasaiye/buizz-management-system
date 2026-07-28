"use client";

import type { BuizzTicket } from "@/store/ticket.store";

import { TicketTemplate } from "./TicketTemplate";
import {
  createTicketQrPayload,
  getQrStatusForTicketStatus,
  maskTicketContact,
  maskTicketEmail,
  type BuizzTicketData,
  type TicketMode,
  type TicketStatus,
} from "./ticketTypes";

type TicketPreviewProps = {
  ticket?: BuizzTicket | BuizzTicketData;
  mode?: TicketMode;
  backHref?: string;
  showActions?: boolean;
};

export function TicketPreview({ ticket, mode = "customer", backHref, showActions }: TicketPreviewProps) {
  if (ticket) {
    const ticketData = isTicketData(ticket) ? ticket : adaptLegacyBuizzTicket(ticket);
    return <TicketTemplate ticketData={ticketData} mode={mode} backHref={backHref} showActions={showActions} />;
  }

  return (
    <section className="rounded-lg border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center text-sm font-black text-[var(--app-muted)]">
      No ticket data available.
    </section>
  );
}

export function adaptLegacyBuizzTicket(ticket: BuizzTicket): BuizzTicketData {
  const seats = ticket.lineItems.flatMap((item) => item.seats ?? []);
  const selectedSeats = ticket.selectedSeats ?? ticket.lineItems.flatMap((item) => item.selectedSeats ?? []);
  const primaryLine = ticket.lineItems[0];
  const status = ticket.status as TicketStatus;

  return {
    bookingId: ticket.bookingId,
    ticketId: ticket.ticketId,
    ticketStatus: status,
    qrStatus: getQrStatusForTicketStatus(status),
    qrPayload: ticket.qrPayload ?? createTicketQrPayload({
      type: "buizz-booking-pass",
      bookingId: ticket.bookingId,
      eventId: ticket.itemId,
      eventSlug: ticket.eventSlug,
      totalSeats: ticket.lineItems.reduce((sum, item) => sum + Math.max(1, item.quantity), 0),
      seatGroups: (ticket.seatGroups ?? []).map((group) => ({
        section: group.section,
        totalSeats: group.quantity,
        seatNumbers: group.seats,
        amount: group.amount,
      })),
      status: ticket.status === "Used" ? "used" : ticket.status === "Cancelled" ? "cancelled" : ticket.status === "Refunded" ? "refunded" : "valid",
      gate: ticket.gate,
      selectedSeats,
      seatMapTemplateId: ticket.seatMapTemplateId,
      seatMapOverrideId: ticket.seatMapOverrideId,
      tierId: selectedSeats[0]?.tierId,
      source: ticket.total <= 0 ? "Free" : "Online",
    }),
    issuedAt: ticket.createdAt,
    checkedInAt: ticket.attendedAt,
    event: {
      id: ticket.itemId,
      slug: ticket.itemId,
      title: ticket.eventName,
      category: ticket.category ?? ticket.kind,
      eventType: ticket.eventType ?? ticket.kind,
      bannerUrl: ticket.bannerUrl ?? ticket.eventImage,
      date: ticket.date,
      startTime: ticket.time,
      endTime: ticket.duration,
      venueName: ticket.venue,
      venueAddress: ticket.venue,
      city: ticket.city,
      state: "",
    },
    organizer: {
      id: "",
      name: ticket.organizerName ?? "",
      logoUrl: "",
    },
    buyer: {
      name: ticket.buyerName,
      contactMasked: maskTicketContact(ticket.buyerPhone ?? ticket.buyerEmail),
      ...(maskTicketEmail(ticket.buyerEmail) ? { emailMasked: maskTicketEmail(ticket.buyerEmail) } : {}),
    },
    ticket: {
      ticketType: primaryLine?.label ?? "General Entry",
      ticketTypeId: `TYPE-${ticket.ticketId}`,
      section: primaryLine?.label ?? "General",
      seatBlock: primaryLine?.label ?? "General",
      seatBlockType: ticket.seatingType ?? (seats.length ? "Reserved Seating" : "General Admission"),
      seats,
      selectedSeats,
      seatMapTemplateId: ticket.seatMapTemplateId,
      seatMapOverrideId: ticket.seatMapOverrideId,
      seatMapSource: ticket.seatMapTemplateId ? "Seat Map Template" : "Capacity Only",
      quantity: ticket.lineItems.reduce((sum, item) => sum + item.quantity, 0),
      gate: ticket.gate ?? "Main Gate",
      amountPaid: ticket.total,
      currency: "INR",
      benefits: ["Verified booking", "QR entry"],
      instructions: ["Keep the QR ready before reaching the gate.", "Carry a valid photo ID if requested.", "This pass is valid for one scan only."],
    },
    seatGroups: ticket.seatGroups ?? ticket.lineItems.map((item) => ({
      section: item.label || "General",
      seats: item.seats?.length ? item.seats : ["Open entry"],
      quantity: Math.max(1, item.quantity),
      amount: item.price * Math.max(1, item.quantity),
    })),
    payment: {
      paymentStatus: status === "Refunded" ? "Refunded" : "Paid",
      transactionIdMasked: "",
      paidAt: ticket.createdAt,
    },
    theme: {
      organizerSelectedThemeKey: ticket.ticketThemeKey,
      adminApprovedThemeKey: ticket.ticketThemeKey,
      layoutType: "premium",
      qrPosition: "right",
      showAmount: true,
      showBuyerName: true,
      showOrganizerLogo: true,
    },
  };
}

export function createTicketPreviewData(data: BuizzTicketData) {
  return data;
}

function isTicketData(ticket: BuizzTicket | BuizzTicketData): ticket is BuizzTicketData {
  return "event" in ticket && "buyer" in ticket && "payment" in ticket;
}
