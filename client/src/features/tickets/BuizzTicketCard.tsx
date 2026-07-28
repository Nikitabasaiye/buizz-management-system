"use client";

import { Music2 } from "lucide-react";

import type { BuizzTicket } from "@/store/ticket.store";

import { BuizzBookingPass } from "./components/BuizzBookingPass";
import {
  buildSeatGroupsFromBooking,
  type BuizzBookingPass as BuizzBookingPassData,
  type BuizzBookingPassStatus,
  type BuizzBookingSeatGroup,
} from "./ticket-utils";
import type { BuizzTicketData, TicketDesignConfig, TicketMode } from "./ticketTypes";

type TicketSource = BuizzTicket | BuizzTicketData;

export type TicketCardData = {
  bookingId: string;
  ticketId: string;
  status: string;
  eventImage?: string;
  eventName: string;
  eventSlug?: string;
  eventType: string;
  date: string;
  time: string;
  venue: string;
  city?: string;
  amountPaid: number;
  qrPayload: string;
  organizerName: string;
  organizerLogo?: string;
  seatGroups: BuizzBookingSeatGroup[];
  totalSeats: number;
};

type BuizzTicketCardProps = {
  ticket: TicketSource;
  mode?: TicketMode;
  showActions?: boolean;
  viewHref?: string;
  className?: string;
  designConfig?: Partial<TicketDesignConfig>;
  onView?: () => void;
};

export function BuizzTicketGrid({
  tickets,
  mode = "customer",
  showActions = true,
}: {
  tickets: TicketSource[];
  mode?: TicketMode;
  showActions?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tickets.map((ticket) => {
        const data = toTicketCardData(ticket);
        return (
          <BuizzTicketCard
            key={`${data.bookingId}-${data.ticketId}`}
            ticket={ticket}
            mode={mode}
            showActions={showActions}
          />
        );
      })}
    </div>
  );
}

export function BuizzTicketCard({
  ticket,
  mode = "customer",
  showActions = true,
  viewHref = "/profile/tickets",
  className = "",
  designConfig,
  onView,
}: BuizzTicketCardProps) {
  const data = toTicketCardData(ticket);

  return (
    <section className={className}>
      <BuizzBookingPass
        bookingPass={toBookingPass(data, {
          eventImage: designConfig?.heroImage || data.eventImage,
          status: normalizePassStatus(data.status, mode),
        })}
        categoryIcon={<Music2 className="size-4" />}
        showActions={showActions}
        previewMode={mode === "preview" || mode === "admin" || mode === "super-admin" || mode === "organizer"}
        onView={onView ?? (() => {
          if (typeof window !== "undefined") window.location.href = viewHref;
        })}
        onDownload={() => downloadTicketPdf(ticket)}
        onShare={() => void shareTicket(ticket)}
      />
    </section>
  );
}

export function toTicketCardData(ticket: TicketSource): TicketCardData {
  if (isTicketData(ticket)) {
    const seatGroups = normalizeApiSeatGroups(ticket);
    const totalSeats = seatGroups.reduce((sum, group) => sum + group.totalSeats, 0);

    return {
      bookingId: ticket.bookingId,
      ticketId: ticket.ticketId,
      status: ticket.ticketStatus,
      eventImage: ticket.event.ticketImageUrl || ticket.event.bannerUrl,
      eventName: ticket.event.title,
      eventSlug: ticket.event.slug,
      eventType: ticket.event.eventType || ticket.event.category,
      date: ticket.event.date,
      time: ticket.event.startTime,
      venue: ticket.event.venueName,
      city: ticket.event.city,
      amountPaid: ticket.ticket.amountPaid,
      qrPayload: ticket.qrPayload,
      organizerName: ticket.organizer.name,
      organizerLogo: ticket.organizer.logoUrl,
      seatGroups,
      totalSeats,
    };
  }

  const seatGroups = buildSeatGroupsFromBooking({
    selectedSeats: ticket.selectedSeats,
    lineItems: ticket.lineItems,
  });
  const totalSeats = seatGroups.reduce((sum, group) => sum + group.totalSeats, 0);

  return {
    bookingId: ticket.bookingId,
    ticketId: ticket.ticketId,
    status: ticket.status,
    eventImage: ticket.bannerUrl || ticket.eventImage,
    eventName: ticket.eventName,
    eventSlug: ticket.eventSlug,
    eventType: ticket.eventType || ticket.category || ticket.kind,
    date: ticket.date,
    time: ticket.time,
    venue: ticket.venue,
    city: ticket.city,
    amountPaid: ticket.total,
    qrPayload: ticket.qrPayload || buildBookingQrPayload({
      bookingId: ticket.bookingId,
      eventId: ticket.itemId,
      eventSlug: ticket.eventSlug,
      totalSeats,
      seatGroups,
      status: normalizePassStatus(ticket.status),
    }),
    organizerName: ticket.organizerName || "Buizz Organizer",
    organizerLogo: ticket.organizerLogo,
    seatGroups,
    totalSeats,
  };
}

export function downloadTicketPdf(ticket: TicketSource) {
  const ticketNumber = isTicketData(ticket)
    ? ticket.ticketId
    : (ticket as BuizzTicket).ticketId;

  if (!ticketNumber) {
    throw new Error("Invalid ticket number");
  }

  if (typeof window === "undefined") {
    throw new Error("Download not available on server");
  }

  fetchTicketPdfBlob(ticketNumber)
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `Buizz-Ticket-${ticketNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    })
    .catch((error) => {
      throw new Error("Failed to download ticket PDF. Please try again.");
    });
}

function getCustomerTicketToken() {
  let token = "";
  try {
    const s = JSON.parse(localStorage.getItem("buizz-customer-session") || "{}");
    token = s?.token || "";
  } catch {}
  if (!token) {
    try {
      const s = JSON.parse(localStorage.getItem("buizz-auth") || "{}");
      token = s?.state?.user?.token || "";
    } catch {}
  }
  return token;
}

function getTicketPdfUrl(ticketNumber: string) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.buizz.com/api/v1";
  return `${API_BASE}/tickets/${encodeURIComponent(ticketNumber)}/pdf`;
}

async function fetchTicketPdfBlob(ticketNumber: string) {
  const token = getCustomerTicketToken();
  const res = await fetch(getTicketPdfUrl(ticketNumber), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("PDF fetch failed");
  return res.blob();
}

export async function shareTicket(ticket: TicketSource) {
  const data = toTicketCardData(ticket);
  const seats = data.seatGroups
    .map((group) => `${group.section}: ${group.seatNumbers.join(", ")}`)
    .join("; ");
  const shareText = [
    `Event: ${data.eventName}`,
    `Booking ID: ${data.bookingId}`,
    `Date/time: ${data.date} ${data.time}`,
    `Venue: ${data.venue}${data.city ? `, ${data.city}` : ""}`,
    `Seats: ${seats}`,
    `Total amount: ${formatCurrencyText(data.amountPaid)}`,
  ].join("\n");
  const shareUrl =
    typeof window === "undefined"
      ? "/profile/tickets"
      : `${window.location.origin}/profile/tickets`;
  const ticketNumber = data.ticketId || data.bookingId;
  const pdfUrl = ticketNumber ? getTicketPdfUrl(ticketNumber) : "";
  const textWithLinks = [shareText, `Ticket page: ${shareUrl}`, pdfUrl ? `Ticket PDF: ${pdfUrl}` : ""].filter(Boolean).join("\n");

  if (typeof navigator !== "undefined" && navigator.share) {
    if (ticketNumber && "canShare" in navigator) {
      try {
        const blob = await fetchTicketPdfBlob(ticketNumber);
        const file = new File([blob], `Buizz-Ticket-${ticketNumber}.pdf`, { type: "application/pdf" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: "My Buizz Pass", text: shareText, url: shareUrl, files: [file] });
          return;
        }
      } catch {
        // Fall back to link sharing below.
      }
    }
    await navigator.share({
      title: "My Buizz Pass",
      text: textWithLinks,
      url: shareUrl,
    });
    return;
  }

  await navigator.clipboard?.writeText(textWithLinks);
}

function normalizeApiSeatGroups(ticket: BuizzTicketData): BuizzBookingSeatGroup[] {
  if (ticket.seatGroups?.length) {
    return ticket.seatGroups.map((group) => ({
      section: group.section,
      totalSeats: group.quantity,
      seatNumbers: group.seats,
      amount: group.amount,
    }));
  }

  return buildSeatGroupsFromBooking({
    selectedSeats: ticket.ticket.selectedSeats,
    lineItems: [
      {
        label: ticket.ticket.section || ticket.ticket.ticketType || "General",
        quantity: ticket.ticket.quantity,
        price: ticket.ticket.quantity ? Math.round(ticket.ticket.amountPaid / ticket.ticket.quantity) : ticket.ticket.amountPaid,
        seats: ticket.ticket.seats.length ? ticket.ticket.seats : undefined,
        selectedSeats: ticket.ticket.selectedSeats,
      },
    ],
  });
}

function normalizePassStatus(status: string, mode?: TicketMode): BuizzBookingPassStatus {
  if (mode === "preview") return "preview";
  const normalized = status.toLowerCase();
  if (normalized.includes("used") || normalized.includes("checked")) return "used";
  if (normalized.includes("cancel") || normalized.includes("blocked")) return "cancelled";
  if (normalized.includes("refund")) return "refunded";
  if (normalized.includes("preview") || normalized.includes("pending")) return "preview";
  return "valid";
}

function buildBookingQrPayload({
  bookingId,
  eventId,
  eventSlug,
  totalSeats,
  seatGroups,
  status,
}: {
  bookingId: string;
  eventId: string;
  eventSlug?: string;
  totalSeats: number;
  seatGroups: BuizzBookingSeatGroup[];
  status: BuizzBookingPassStatus;
}) {
  return JSON.stringify({
    type: "buizz-booking-pass",
    bookingId,
    eventId,
    eventSlug,
    totalSeats,
    seatGroups,
    status,
    signedToken: "pending-backend-signature",
  });
}

function toBookingPass(
  data: TicketCardData,
  overrides?: {
    eventImage?: string;
    status?: BuizzBookingPassStatus;
  },
): BuizzBookingPassData {
  const status = overrides?.status ?? normalizePassStatus(data.status);

  return {
    id: data.bookingId,
    bookingId: data.bookingId,
    ticketId: data.bookingId,
    eventId: data.eventSlug ?? data.bookingId,
    eventSlug: data.eventSlug,
    eventTitle: data.eventName,
    eventImage: overrides?.eventImage ?? data.eventImage,
    organizerName: data.organizerName,
    organizerLogo: data.organizerLogo,
    category: data.eventType,
    dateLabel: data.date,
    timeLabel: data.time,
    venueName: data.venue,
    venueCity: data.city,
    status,
    totalSeats: data.totalSeats,
    totalAmountPaid: data.amountPaid,
    seatGroups: data.seatGroups,
    qrValue: data.qrPayload || buildBookingQrPayload({
      bookingId: data.bookingId,
      eventId: data.eventSlug ?? data.bookingId,
      eventSlug: data.eventSlug,
      totalSeats: data.totalSeats,
      seatGroups: data.seatGroups,
      status,
    }),
    createdAt: new Date().toISOString(),
  };
}

function createTicketPdf(data: TicketCardData) {
  const lines = [
    "BUIZZ PASS",
    `Status: ${data.status}`,
    data.eventName,
    `Booking ID: ${data.bookingId}`,
    `Date/time: ${data.date} ${data.time}`,
    `Venue: ${data.venue}${data.city ? `, ${data.city}` : ""}`,
    `Total seats: ${data.totalSeats}`,
    "Seats:",
    ...data.seatGroups.map((group) =>
      `${group.section} | ${group.totalSeats} | ${group.seatNumbers.join(", ")} | ${formatCurrencyText(group.amount)}`
    ),
    `Total Amount Paid: ${formatCurrencyText(data.amountPaid)}`,
    "Please show this ticket at venue entry. This is a single entry ticket for all selected seats.",
    "Scan at Gate Entry",
  ];

  const textCommands = lines
    .flatMap((line, index) =>
      wrapPdfText(line, index === 2 ? 32 : 62).map((part, partIndex) => ({
        value: part,
        yOffset: index * 24 + partIndex * 14,
        size: index === 0 ? 22 : index === 2 ? 24 : 11,
      }))
    )
    .map(({ value, yOffset, size }) => pdfText(64, 742 - yOffset, value, size))
    .join("\n");

  const content = [
    "0.03 0.00 0.05 rg 0 0 595 842 re f",
    "0.93 0.11 0.45 rg 40 762 515 34 re f",
    "0.06 0.00 0.08 rg 40 48 515 748 re f",
    "1 1 1 rg 376 154 128 128 re f",
    "0.08 0.09 0.13 rg",
    pdfText(408, 210, "QR", 34),
    pdfText(384, 184, "SCAN AT GATE", 11),
    "1 1 1 rg",
    textCommands,
  ].join("\n");

  return buildPdf(content);
}

function buildPdf(content: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function pdfText(x: number, y: number, value: string, size: number) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`;
}

function wrapPdfText(value: string, maxLength: number) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
      return;
    }
    current = next;
  });

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function escapePdf(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function formatCurrencyText(amount: number) {
  return `Rs.${Math.max(0, Math.round(amount)).toLocaleString("en-IN")}`;
}

function isTicketData(ticket: TicketSource): ticket is BuizzTicketData {
  return "event" in ticket && "ticket" in ticket && "payment" in ticket;
}
