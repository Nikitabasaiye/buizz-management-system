"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  Info,
  Lock,
  MapPin,
  Minus,
  Music,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  Share2,
  Star,
  Trash2,
  Unlock,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { getApiError } from "@/utils/apiError";
import { BuizzBookingPass } from "@/features/tickets/components/BuizzBookingPass";
import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { saveUnifiedBooking } from "@/features/integration/bookingIntegration";
import {
  readUnifiedEvents,
  type UnifiedBuizzEvent,
} from "@/features/integration/eventLifecycle";
import {
  useCreateOfflineBookingMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
} from "@/store/api";

export type TicketType = "event" | "theatre" | "activity" | "offline" | "reserved" | "free";

export type TicketLayoutElement = {
  id: string;
  type:
  | "logo"
  | "passTitle"
  | "statusBadge"
  | "organizerBadge"
  | "eventTitle"
  | "category"
  | "date"
  | "time"
  | "venue"
  | "divider"
  | "bookingId"
  | "qr"
  | "ticketDate"
  | "seatCount"
  | "seatsTable"
  | "totalAmount"
  | "terms"
  | "actions";
  label: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
};

export type TicketDesignDraft = {
  templateId: string;
  templateName: string;
  ticketType: TicketType;
  titleOverride: string;
  tagline: string;
  badgeText: string;
  termsNote: string;
  organizerLogoUrl: string;
  backgroundImageUrl: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  showLogo: boolean;
  showBanner: boolean;
  showPrice: boolean;
  showSourceBadge: boolean;
  showTerms: boolean;
  showSeatOrZone: boolean;
  showActions: boolean;
  previewSize: "compact" | "standard" | "large";
  layoutElements: TicketLayoutElement[];
  lockedFields: string[];
  updatedAt: string;
};

export type TicketPreviewData = {
  eventTitle: string;
  category: string;
  ticketType: TicketType;
  organizerName: string;
  organizerLogoUrl?: string;
  bannerImageUrl?: string;
  venueName: string;
  city: string;
  date: string;
  time: string;
  bookingId: string;
  ticketId: string;
  source: "Online" | "Offline" | "Reserved" | "Free";
  status: "Valid" | "Pending" | "Used" | "Cancelled";
  blockName: string;
  seatLabel?: string;
  quantity: number;
  customerName?: string;
  paymentMode?: string;
  amountPaid: number;
  seats: Array<{
    section: string;
    totalSeats: number;
    seatNumbers: string;
    amount: number;
  }>;
};

export type TicketPreviewContent = TicketPreviewData & {
  title?: string;
  venue?: string;
  block?: string;
  seatOrZone?: string;
  price?: number;
  currency?: string;
  amountCollected?: number;
};

export type BuizzTicketPreviewProps = {
  design: TicketDesignDraft;
  data: TicketPreviewData;
  mode?: "designer" | "create-event" | "offline-issued" | "wallet";
  editable?: boolean;
  selectedElementId?: string;
  onSelectElement?: (id: string) => void;
  onUpdateElement?: (id: string, patch: Partial<TicketLayoutElement>) => void;
  onView?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  className?: string;
};

export type OfflineBookingSource = "Offline" | "Reserved" | "Complimentary";
export type OfflinePaymentStatus = "Paid" | "Partial Paid" | "Unpaid" | "Complimentary";

export type OfflineBookingRecord = {
  id: string;
  bookingId: string;
  ticketId: string;
  receiptNo: string;
  eventId: string;
  eventTitle: string;
  category: string;
  venueName: string;
  city: string;
  date: string;
  time: string;
  ticketBlock: string;
  seatLabel: string;
  zone: string;
  gate: string;
  quantity: number;
  pricePerTicket: number;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  whatsappPhone?: string;
  customerEmail?: string;
  customerCity?: string;
  idProof?: string;
  source: OfflineBookingSource;
  paymentMode: "Cash" | "UPI" | "Razorpay" | "Other" | "Complimentary";
  paymentStatus: OfflinePaymentStatus;
  amountCollected: number;
  balanceAmount: number;
  paymentReference?: string;
  counterStaff?: string;
  notes: string;
  qrPayload: string;
  status: "issued" | "cancelled";
  issuedAt: string;
  cancelledAt?: string;
};

type StoredDefaultMap = Partial<Record<TicketType, string>>;
type OrganizerEventOption = {
  id: string;
  backendEventId?: number;
  title: string;
  category: string;
  venueName: string;
  city: string;
  date: string;
  time: string;
  status: string;
  schedules: Array<{
    id: string;
    date: string;
    timeSlots: Array<{
      id: string;
      time: string;
      label: string;
    }>;
  }>;
  blocks: Array<{
    id: string;
    backendTicketTypeId?: number;
    name: string;
    price: number;
    offlineQuantity: number;
    reservedQuantity: number;
    soldOffline: number;
    soldReserved: number;
    maxPerBooking: number;
  }>;
};

type TicketDesignControlPanel = "all" | "content" | "style" | "visibility" | "layout" | "layers";

export const ticketDesignStorageKeys = {
  drafts: "buizz-ticket-design-drafts",
  defaults: "buizz-ticket-design-defaults",
  offlineBookings: "buizz-offline-bookings",
} as const;

const lockedFieldKeys = ["qr", "bookingId", "ticketId", "buizzBadge", "eventCoreDetails", "sourceBadge"];

const lockedFieldLabels = [
  "QR placeholder always shows",
  "Booking ID always shows",
  "Ticket ID always shows",
  "Buizz verified badge always shows",
  "Event title, date, time, and venue always show",
  "Source badge always shows for Offline and Reserved tickets",
  "Buizz footer branding always shows",
];

const templateMeta: Record<string, Omit<TicketDesignDraft, "updatedAt" | "lockedFields" | "layoutElements"> & { description: string }> = {
  "event-ticket": {
    templateId: "event-ticket",
    templateName: "Event Ticket",
    ticketType: "event",
    titleOverride: "",
    tagline: "Your verified access pass",
    badgeText: "BUIZZ PASS",
    termsNote: "Please show this ticket at venue entry. This is a single entry ticket for all selected seats.",
    organizerLogoUrl: "",
    backgroundImageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85",
    backgroundColor: "#08000d",
    textColor: "#ffffff",
    accentColor: "#ff1b8d",
    showLogo: true,
    showBanner: true,
    showPrice: true,
    showSourceBadge: true,
    showTerms: true,
    showSeatOrZone: true,
    showActions: true,
    previewSize: "standard",
    description: "Real dark Buizz mobile pass for online event bookings.",
  },
  "theatre-ticket": {
    templateId: "theatre-ticket",
    templateName: "Theatre / Play Ticket",
    ticketType: "theatre",
    titleOverride: "",
    tagline: "Curtain-ready verified entry",
    badgeText: "THEATRE PASS",
    termsNote: "Late entry follows theatre rules. Keep this QR ready at the entrance.",
    organizerLogoUrl: "",
    backgroundImageUrl: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=85",
    backgroundColor: "#08000d",
    textColor: "#ffffff",
    accentColor: "#ff1b8d",
    showLogo: true,
    showBanner: true,
    showPrice: true,
    showSourceBadge: true,
    showTerms: true,
    showSeatOrZone: true,
    showActions: true,
    previewSize: "standard",
    description: "Seat and section focused pass for plays and theatre.",
  },
  "activity-pass": {
    templateId: "activity-pass",
    templateName: "Activity Pass",
    ticketType: "activity",
    titleOverride: "",
    tagline: "Slot access with Buizz verification",
    badgeText: "ACTIVITY PASS",
    termsNote: "Arrive before your booked slot. Safety instructions from the host apply.",
    organizerLogoUrl: "",
    backgroundImageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1400&q=85",
    backgroundColor: "#08000d",
    textColor: "#ffffff",
    accentColor: "#ff1b8d",
    showLogo: true,
    showBanner: true,
    showPrice: true,
    showSourceBadge: true,
    showTerms: true,
    showSeatOrZone: true,
    showActions: true,
    previewSize: "standard",
    description: "Participant and slot friendly pass for activities.",
  },
  "offline-counter-ticket": {
    templateId: "offline-counter-ticket",
    templateName: "Offline Counter Ticket",
    ticketType: "offline",
    titleOverride: "",
    tagline: "Counter-issued verified ticket",
    badgeText: "COUNTER PASS",
    termsNote: "Issued by organizer counter. Offline inventory is used only for this pass.",
    organizerLogoUrl: "",
    backgroundImageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=85",
    backgroundColor: "#08000d",
    textColor: "#ffffff",
    accentColor: "#ff1b8d",
    showLogo: true,
    showBanner: true,
    showPrice: true,
    showSourceBadge: true,
    showTerms: true,
    showSeatOrZone: true,
    showActions: true,
    previewSize: "standard",
    description: "Counter pass with source, payment mode, customer, and amount collected.",
  },
  "reserved-vip-pass": {
    templateId: "reserved-vip-pass",
    templateName: "Reserved / VIP Pass",
    ticketType: "reserved",
    titleOverride: "",
    tagline: "Reserved inventory verified by Buizz",
    badgeText: "VIP PASS",
    termsNote: "Reserved inventory is held separately and does not reduce online availability.",
    organizerLogoUrl: "",
    backgroundImageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=85",
    backgroundColor: "#08000d",
    textColor: "#ffffff",
    accentColor: "#ff1b8d",
    showLogo: true,
    showBanner: true,
    showPrice: true,
    showSourceBadge: true,
    showTerms: true,
    showSeatOrZone: true,
    showActions: true,
    previewSize: "standard",
    description: "VIP and reserved pass with source badge locked.",
  },
  "free-registration-pass": {
    templateId: "free-registration-pass",
    templateName: "Free Registration Pass",
    ticketType: "free",
    titleOverride: "",
    tagline: "Free entry, verified by Buizz",
    badgeText: "FREE PASS",
    termsNote: "Registration is free. Entry still requires valid QR verification.",
    organizerLogoUrl: "",
    backgroundImageUrl: "https://images.unsplash.com/photo-1528605105345-5344ea20e269?auto=format&fit=crop&w=1400&q=85",
    backgroundColor: "#08000d",
    textColor: "#ffffff",
    accentColor: "#ff1b8d",
    showLogo: true,
    showBanner: true,
    showPrice: true,
    showSourceBadge: true,
    showTerms: true,
    showSeatOrZone: true,
    showActions: true,
    previewSize: "standard",
    description: "Free registration pass with amount shown as FREE.",
  },
};

export function createDefaultLayoutElements(): TicketLayoutElement[] {
  return [
    createLayoutElement("logo", "logo", "Buizz logo", true, 4.5, 4, 22, 4.8, 20, 19),
    createLayoutElement("passTitle", "passTitle", "Pass title", true, 57, 3.1, 26, 4, 21, 17),
    createLayoutElement("statusBadge", "statusBadge", "Status badge", true, 62.5, 7.6, 15.5, 4.6, 21, 12),
    createLayoutElement("organizerBadge", "organizerBadge", "Organizer badge", true, 84.5, 3.6, 11.5, 15.5, 21, 12),
    createLayoutElement("eventTitle", "eventTitle", "Event title", true, 4, 18, 69, 6.1, 20, 23),
    createLayoutElement("category", "category", "Category", true, 4, 25.6, 34, 3.7, 20, 14),
    createLayoutElement("date", "date", "Date", true, 4, 31.3, 28, 4, 20, 12),
    createLayoutElement("time", "time", "Time", true, 38.5, 31.3, 23, 4, 20, 12),
    createLayoutElement("venue", "venue", "Venue", true, 68, 30.8, 28, 5.7, 20, 12),
    createLayoutElement("divider", "divider", "Ticket divider", true, 0, 38.5, 100, 2.8, 30),
    createLayoutElement("bookingId", "bookingId", "Booking ID", true, 4, 42.2, 58, 12.6, 15, 21),
    createLayoutElement("qr", "qr", "QR code", true, 72, 41.6, 24, 17.2, 16),
    createLayoutElement("ticketDate", "ticketDate", "Ticket date", true, 4, 57.6, 36, 3.2, 15, 12),
    createLayoutElement("seatCount", "seatCount", "Seat count", true, 4, 61.1, 45, 3.2, 15, 12),
    createLayoutElement("seatsTable", "seatsTable", "Seats table", true, 4, 66.8, 92, 13.7, 10, 12),
    createLayoutElement("totalAmount", "totalAmount", "Total amount", true, 4, 82.2, 92, 5.4, 10, 14),
    createLayoutElement("terms", "terms", "Entry instruction", false, 4, 88.6, 92, 4.9, 10, 12),
    createLayoutElement("actions", "actions", "Action buttons", false, 4, 94.5, 92, 5.4, 10, 14),
  ];
}

function createLayoutElement(
  id: TicketLayoutElement["id"],
  type: TicketLayoutElement["type"],
  label: string,
  locked: boolean,
  x: number,
  y: number,
  w: number,
  h: number,
  zIndex: number,
  fontSize?: number,
): TicketLayoutElement {
  return {
    id,
    type,
    label,
    visible: true,
    locked,
    x,
    y,
    w,
    h,
    zIndex,
    fontSize,
    fontWeight: locked ? "900" : "800",
  };
}

export function createTicketDesignDraft(templateId = "event-ticket", overrides: Partial<TicketDesignDraft> = {}): TicketDesignDraft {
  const base = templateMeta[templateId] ?? templateMeta["event-ticket"];
  return {
    ...base,
    layoutElements: createDefaultLayoutElements(),
    lockedFields: [...lockedFieldKeys],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export const ticketTemplatePresets: TicketDesignDraft[] = [
  createTicketDesignDraft("event-ticket"),
  createTicketDesignDraft("theatre-ticket"),
  createTicketDesignDraft("activity-pass"),
  createTicketDesignDraft("offline-counter-ticket"),
  createTicketDesignDraft("reserved-vip-pass"),
  createTicketDesignDraft("free-registration-pass"),
];

export function isDefaultTicketTemplate(templateId: string) {
  return ticketTemplatePresets.some((template) => template.templateId === templateId);
}

export function readTicketDesignDrafts(): TicketDesignDraft[] {
  return readArrayStorage<unknown>(ticketDesignStorageKeys.drafts).map(normalizeTicketDesignDraft).filter(Boolean) as TicketDesignDraft[];
}

export function saveTicketDesignDraft(draft: TicketDesignDraft) {
  const allDrafts = readUnknownArray(ticketDesignStorageKeys.drafts);
  const organizerDrafts = allDrafts.map(normalizeTicketDesignDraft).filter(Boolean) as TicketDesignDraft[];
  const unrelatedDrafts = allDrafts.filter((item) => !normalizeTicketDesignDraft(item));
  const nextDraft = { ...draft, updatedAt: new Date().toISOString() };
  writeStorage(ticketDesignStorageKeys.drafts, [
    nextDraft,
    ...unrelatedDrafts,
    ...organizerDrafts.filter((item) => item.templateId !== nextDraft.templateId),
  ]);
  return nextDraft;
}

export function deleteTicketDesignDraft(templateId: string) {
  if (isDefaultTicketTemplate(templateId)) return false;
  const allDrafts = readUnknownArray(ticketDesignStorageKeys.drafts);
  writeStorage(
    ticketDesignStorageKeys.drafts,
    allDrafts.filter((item) => {
      const draft = normalizeTicketDesignDraft(item);
      return !draft || draft.templateId !== templateId;
    }),
  );
  return true;
}

export function readTicketDesignDefaults(): StoredDefaultMap {
  const value = readStorage<unknown>(ticketDesignStorageKeys.defaults, {});
  return value && typeof value === "object" && !Array.isArray(value) ? (value as StoredDefaultMap) : {};
}

export function setTicketDesignDefault(ticketType: TicketType, templateId: string) {
  const defaults = readTicketDesignDefaults();
  const next = { ...defaults, [ticketType]: templateId };
  writeStorage(ticketDesignStorageKeys.defaults, next);
  return next;
}

export function readOfflineBookings() {
  return readArrayStorage<unknown>(ticketDesignStorageKeys.offlineBookings).map(normalizeOfflineBookingRecord).filter(Boolean) as OfflineBookingRecord[];
}

function writeOfflineBookings(bookings: OfflineBookingRecord[]) {
  writeStorage(ticketDesignStorageKeys.offlineBookings, bookings);
}

export function saveOfflineBooking(booking: OfflineBookingRecord) {
  writeOfflineBookings([
    booking,
    ...readOfflineBookings().filter(
      (item) =>
        item.bookingId !== booking.bookingId &&
        item.ticketId !== booking.ticketId,
    ),
  ]);

  saveUnifiedBooking({
    ...booking,
    organizerId: "",
    organizerName: "",
    source: booking.source === "Complimentary" ? "Free" : booking.source,
    paymentMode: toUnifiedPaymentMode(booking.paymentMode),
    status: booking.status,
    createdAt: booking.issuedAt,
    updatedAt: booking.issuedAt,
  });
}


function toUnifiedPaymentMode(
  paymentMode: OfflineBookingRecord["paymentMode"],
): OfflineBookingRecord["paymentMode"] {
  return paymentMode;
}

function updateOfflineBookingRecord(
  bookingId: string,
  patch: Partial<OfflineBookingRecord>,
) {
  const next = readOfflineBookings().map((booking) =>
    booking.bookingId === bookingId ? { ...booking, ...patch } : booking,
  );

  writeOfflineBookings(next);

  return next;
}

export function createDefaultTicketContent(draft: TicketDesignDraft, overrides: Partial<TicketPreviewContent> = {}): TicketPreviewContent {
  const isFree = draft.ticketType === "free";
  const source = draft.ticketType === "offline" ? "Offline" : draft.ticketType === "reserved" ? "Reserved" : isFree ? "Free" : "Online";
  const eventTitle =
    overrides.eventTitle ??
    overrides.title ??
    "";
  const amountPaid = Number(overrides.amountPaid ?? overrides.amountCollected ?? overrides.price ?? 0);
  const quantity = Number(overrides.quantity ?? 1);
  const blockName = String(overrides.blockName ?? overrides.block ?? (isFree ? "Registration Pass" : "Entry"));
  const seats = Array.isArray(overrides.seats) && overrides.seats.length
    ? overrides.seats
    : [
      { section: blockName, totalSeats: quantity, seatNumbers: "", amount: amountPaid },
    ];

  return {
    eventTitle,
    title: eventTitle,
    category: String(overrides.category ?? (draft.ticketType === "theatre" ? "Theatre" : draft.ticketType === "activity" ? "Activity" : isFree ? "Registration" : "Music")),
    ticketType: overrides.ticketType ?? draft.ticketType,
    organizerName: String(overrides.organizerName ?? "ARJUT SI..."),
    organizerLogoUrl: overrides.organizerLogoUrl ?? draft.organizerLogoUrl,
    bannerImageUrl: overrides.bannerImageUrl ?? draft.backgroundImageUrl,
    venueName: String(overrides.venueName ?? overrides.venue ?? "Mahalaxmi Lawns"),
    venue: String(overrides.venueName ?? overrides.venue ?? "Mahalaxmi Lawns"),
    city: String(overrides.city ?? "Pune"),
    date: String(overrides.date ?? "19 Jun 2026"),
    time: String(overrides.time ?? "08:30 PM"),
    bookingId: String(overrides.bookingId ?? "BUIZZ-ARIJ-MQKP38AA-J3FFF"),
    ticketId: String(overrides.ticketId ?? "TKT-BUIZZ-24086"),
    source: overrides.source ?? source,
    status: overrides.status ?? "Valid",
    blockName,
    block: blockName,
    seatLabel: String(overrides.seatLabel ?? overrides.seatOrZone ?? "C1, C11"),
    seatOrZone: String(overrides.seatLabel ?? overrides.seatOrZone ?? "C1, C11"),
    quantity,
    customerName: overrides.customerName,
    paymentMode: overrides.paymentMode,
    amountPaid,
    price: amountPaid,
    amountCollected: amountPaid,
    currency: "INR",
    seats,
  };
}

export function BuizzTicketPreview({
  design,
  data,
  mode = "designer",
  onView,
  onDownload,
  onShare,
  className,
}: BuizzTicketPreviewProps) {
  const normalized = normalizePreviewData(design, data);
  const title = design.titleOverride.trim() || normalized.eventTitle;
  const isFree = normalized.amountPaid <= 0 || normalized.source === "Free" || design.ticketType === "free";
  const bannerUrl = design.showBanner ? (normalized.bannerImageUrl || design.backgroundImageUrl) : "";
  const seatGroups = normalized.seats.length
    ? normalized.seats.map((seat) => ({
      section: seat.section,
      totalSeats: seat.totalSeats,
      seatNumbers: seat.seatNumbers.split(",").map((value) => value.trim()).filter(Boolean),
      amount: isFree ? 0 : seat.amount,
    }))
    : [
      {
        section: normalized.blockName || "General",
        totalSeats: Math.max(1, normalized.quantity),
        seatNumbers: [normalized.seatLabel || `${normalized.blockName || "General"} x${Math.max(1, normalized.quantity)}`],
        amount: isFree ? 0 : normalized.amountPaid,
      },
    ];
  const totalSeats = seatGroups.reduce((sum, group) => sum + group.totalSeats, 0);
  const passStatus = normalizePreviewStatus(normalized.status, mode);

  return (
    <div className={className}>
      <BuizzBookingPass
        bookingPass={{
          id: normalized.bookingId,
          bookingId: normalized.bookingId,
          ticketId: normalized.bookingId,
          eventId: "preview-event",
          eventTitle: title,
          eventImage: bannerUrl,
          organizerName: normalized.organizerName,
          organizerLogo: design.showLogo ? (normalized.organizerLogoUrl || design.organizerLogoUrl || undefined) : undefined,
          category: normalized.category,
          dateLabel: normalized.date,
          timeLabel: normalized.time,
          venueName: normalized.venueName,
          venueCity: normalized.city,
          status: passStatus,
          totalSeats,
          totalAmountPaid: isFree ? 0 : normalized.amountPaid,
          seatGroups,
          qrValue: JSON.stringify({
            type: "buizz-booking-pass",
            bookingId: normalized.bookingId,
            eventId: "preview-event",
            totalSeats,
            seatGroups,
            status: passStatus,
            signedToken: "pending-backend-signature",
          }),
          createdAt: new Date().toISOString(),
        }}
        categoryIcon={<Music className="size-4" />}
        showActions={design.showActions}
        previewMode
        onView={onView}
        onDownload={onDownload}
        onShare={onShare}
      />
    </div>
  );
}

function normalizePreviewStatus(status: TicketPreviewData["status"], mode: BuizzTicketPreviewProps["mode"]) {
  if (mode === "designer" || mode === "create-event") return "preview";
  if (status === "Used") return "used";
  if (status === "Cancelled") return "cancelled";
  return "valid";
}

function renderTicketElement(
  element: TicketLayoutElement,
  context: {
    design: TicketDesignDraft;
    data: TicketPreviewData;
    title: string;
    isFree: boolean;
    onView?: () => void;
    onDownload?: () => void;
    onShare?: () => void;
  },
) {
  const { design, data, title, isFree, onView, onDownload, onShare } = context;
  const accentStyle = { color: "var(--ticket-accent)" };
  const fontSize = element.fontSize ? { fontSize: `${element.fontSize}px` } : undefined;

  switch (element.type) {
    case "logo":
      return (
        <div className="flex h-full items-start">
          {design.showLogo && design.organizerLogoUrl ? (
            <img src={design.organizerLogoUrl} alt="Organizer logo" className="max-h-full rounded-md object-contain" />
          ) : (
            <BuizzLogo variant="dark" size="sm" className="max-h-full" />
          )}
        </div>
      );
    case "passTitle":
      return <p className="text-right font-black uppercase leading-none text-white" style={fontSize}>{design.badgeText || "BUIZZ PASS"}</p>;
    case "statusBadge":
      return (
        <div className="flex justify-end">
          <span className="rounded-full bg-[#10cfa3] px-4 py-2 text-xs font-black uppercase leading-none text-white">{data.status}</span>
        </div>
      );
    case "organizerBadge":
      return (
        <div className="grid justify-items-center gap-1 text-center">
          <p className="text-[10px] font-black leading-none text-white">Organizer</p>
          <div className="grid size-[62px] place-items-center overflow-hidden rounded-full bg-white text-center text-[20px] font-black text-[var(--ticket-accent)] shadow-lg">
            {data.organizerLogoUrl ? <img src={data.organizerLogoUrl} alt={`${data.organizerName} logo`} className="h-full w-full object-cover" /> : initials(data.organizerName || data.category)}
          </div>
          <p className="max-w-[74px] truncate text-[10px] font-black uppercase leading-none text-white">{data.category === "Music" ? "EVENTS" : data.category}</p>
          <p className="max-w-[74px] truncate text-[10px] font-black uppercase leading-none text-[var(--ticket-accent)]">{data.organizerName}</p>
        </div>
      );
    case "eventTitle":
      return <h3 className="line-clamp-2 break-words text-[23px] font-black leading-tight text-white" style={fontSize}>{title}</h3>;
    case "category":
      return (
        <div className="flex h-full items-center gap-2 font-black uppercase tracking-wide text-[var(--ticket-accent)]">
          <Music className="size-5 shrink-0" />
          <span className="truncate text-sm">{data.category}</span>
        </div>
      );
    case "date":
      return <MetaLine icon={CalendarDays} value={formatHeroDate(data.date)} />;
    case "time":
      return <MetaLine icon={Clock3} value={data.time} />;
    case "venue":
      return <MetaLine icon={MapPin} value={`${data.venueName}, ${data.city}`} />;
    case "divider":
      return <TicketDivider />;
    case "bookingId":
      return (
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--ticket-accent)]">Booking ID</p>
          <p className="mt-4 break-words text-[21px] font-black leading-tight text-white" style={fontSize}>{data.bookingId}</p>
          {data.customerName ? <p className="mt-2 truncate text-xs font-black text-white/70">Customer: {data.customerName}</p> : null}
          {data.paymentMode ? <p className="mt-1 truncate text-xs font-black text-white/70">Payment: {data.paymentMode}</p> : null}
          {design.showSourceBadge || data.source !== "Online" ? <p className="mt-1 truncate text-xs font-black text-[var(--ticket-accent)]">Source: {data.source}</p> : null}
        </div>
      );
    case "qr":
      return (
        <div className="grid justify-items-center gap-2">
          <QrBlock />
          <p className="text-center text-xs font-black text-white">Scan at Gate Entry</p>
          <p className="max-w-full truncate text-center text-[9px] font-bold text-white/55">{data.ticketId}</p>
        </div>
      );
    case "ticketDate":
      return <BodyLine icon={CalendarDays} value={data.date} />;
    case "seatCount":
      return <BodyLine icon={Star} value={`${data.quantity} seats on this pass`} />;
    case "seatsTable":
      return <SeatsTable data={data} showPrice={design.showPrice} isFree={isFree} />;
    case "totalAmount":
      return (
        <div className="flex h-full items-center justify-between gap-3 border-t border-white/10 pt-2">
          <p className="text-sm font-black uppercase text-white/65">Total Amount Paid</p>
          <p className="shrink-0 text-[30px] font-black leading-none text-[var(--ticket-accent)]">{formatMoney(data.amountPaid, isFree || !design.showPrice)}</p>
        </div>
      );
    case "terms":
      return (
        <div className="flex h-full items-start gap-2 border-t border-dashed border-white/10 pt-2 text-center text-xs font-bold leading-5 text-white">
          <Info className="mt-0.5 size-5 shrink-0 text-[var(--ticket-accent)]" />
          <p className="mx-auto">{design.termsNote}</p>
        </div>
      );
    case "actions":
      return (
        <div className="grid h-full grid-cols-3 gap-2">
          <TicketAction icon={<Eye className="size-4" />} label="View" onClick={onView} />
          <TicketAction icon={<Download className="size-4" />} label="Download" onClick={onDownload} />
          <TicketAction icon={<Share2 className="size-4" />} label="Share" onClick={onShare} />
        </div>
      );
    default:
      return null;
  }
}

export function TicketTemplateLibrary({
  selectedTemplateId,
  onSelect,
  includeCustom = false,
}: {
  selectedTemplateId: string;
  onSelect: (draft: TicketDesignDraft) => void;
  includeCustom?: boolean;
}) {
  const templates = includeCustom
    ? [...ticketTemplatePresets, createTicketDesignDraft("event-ticket", { templateId: "custom-draft-template", templateName: "Custom Draft Template" })]
    : ticketTemplatePresets;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => {
        const selected = selectedTemplateId === template.templateId;
        const meta = templateMeta[template.templateId];
        return (
          <button
            key={template.templateId}
            type="button"
            onClick={() =>
              onSelect(
                createTicketDesignDraft(
                  template.templateId,
                  template.templateId === "custom-draft-template" ? { templateId: `custom-${Date.now()}`, templateName: "Custom Draft Template" } : {},
                ),
              )
            }
            className={cn(
              "min-w-0 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]",
              selected
                ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 shadow-[0_14px_34px_rgb(var(--brand-primary-rgb)/0.14)]"
                : "border-[var(--app-border)] bg-[var(--app-elevated)] hover:border-[var(--color-brand-primary)]/40",
            )}
          >
            <p className="truncate text-sm font-black">{template.templateName}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">{meta?.description ?? `${template.ticketType} template`}</p>
          </button>
        );
      })}
    </div>
  );
}

function TicketEditorTabs({
  activePanel,
  onChange,
}: {
  activePanel: TicketDesignControlPanel;
  onChange: (panel: TicketDesignControlPanel) => void;
}) {
  const panels: Array<{ id: Exclude<TicketDesignControlPanel, "all">; label: string }> = [
    { id: "content", label: "Content" },
    { id: "style", label: "Design" },
    { id: "visibility", label: "Visibility" },
    { id: "layout", label: "Layout" },
    { id: "layers", label: "Layers" },
  ];

  return (
    <div className="mb-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {panels.map((panel) => {
          const selected = activePanel === panel.id;
          return (
            <button
              key={panel.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(panel.id)}
              className={cn(
                "min-h-10 rounded-2xl px-3 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30",
                selected
                  ? "bg-[var(--color-brand-primary)] text-white shadow-[0_12px_28px_rgb(var(--brand-primary-rgb)/0.18)]"
                  : "bg-[var(--app-subtle)] text-[var(--app-muted)] hover:text-[var(--app-foreground)]",
              )}
            >
              {panel.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TicketDesignControls({
  draft,
  selectedElementId,
  editLayout,
  activePanel = "all",
  onToggleEditLayout,
  onChange,
  onSelectElement,
}: {
  draft: TicketDesignDraft;
  selectedElementId: string;
  editLayout: boolean;
  activePanel?: TicketDesignControlPanel;
  onToggleEditLayout: () => void;
  onChange: (draft: TicketDesignDraft) => void;
  onSelectElement: (id: string) => void;
}) {
  const elements = normalizeLayoutElements(draft.layoutElements);
  const selectedElement = elements.find((element) => element.id === selectedElementId) ?? elements[0];
  const update = <Key extends keyof TicketDesignDraft>(key: Key, value: TicketDesignDraft[Key]) => {
    onChange({ ...draft, [key]: value, updatedAt: new Date().toISOString() });
  };
  const updateElement = (id: string, patch: Partial<TicketLayoutElement>) => {
    update("layoutElements", updateLayoutElement(elements, id, patch));
  };
  const showPanel = (panel: Exclude<TicketDesignControlPanel, "all">) => activePanel === "all" || activePanel === panel;

  return (
    <div className="grid gap-5">
      {showPanel("content") ? (
        <EditorPanel title="Content">
          <TextField label="Ticket title override" value={draft.titleOverride} onChange={(value) => update("titleOverride", value)} />
          <TextField label="Tagline" value={draft.tagline} onChange={(value) => update("tagline", value)} />
          <TextField label="Badge text" value={draft.badgeText} onChange={(value) => update("badgeText", value)} />
          <TextAreaField label="Terms note" value={draft.termsNote} onChange={(value) => update("termsNote", value)} />
          <TextField label="Organizer logo URL" value={draft.organizerLogoUrl} onChange={(value) => update("organizerLogoUrl", value)} />
          <TextField label="Banner image URL" value={draft.backgroundImageUrl} onChange={(value) => update("backgroundImageUrl", value)} />
        </EditorPanel>
      ) : null}

      {showPanel("style") ? (
        <EditorPanel title="Design">
          <ColorField label="Background color" value={draft.backgroundColor} onChange={(value) => update("backgroundColor", value)} />
          <ColorField label="Text color" value={draft.textColor} onChange={(value) => update("textColor", value)} />
          <ColorField label="Accent color" value={draft.accentColor} onChange={(value) => update("accentColor", value)} />
          <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
            Preview size
            <select value={draft.previewSize} onChange={(event) => update("previewSize", event.target.value as TicketDesignDraft["previewSize"])} className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]">
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="large">Large</option>
            </select>
          </label>
        </EditorPanel>
      ) : null}

      {showPanel("visibility") ? (
        <EditorPanel title="Visibility">
          <ToggleControl label="Show organizer logo" checked={draft.showLogo} onToggle={() => update("showLogo", !draft.showLogo)} />
          <ToggleControl label="Show banner image" checked={draft.showBanner} onToggle={() => update("showBanner", !draft.showBanner)} />
          <ToggleControl label="Show price" checked={draft.showPrice} onToggle={() => update("showPrice", !draft.showPrice)} />
          <ToggleControl label="Show source badge" checked={draft.showSourceBadge} onToggle={() => update("showSourceBadge", !draft.showSourceBadge)} />
          <ToggleControl label="Show terms" checked={draft.showTerms} onToggle={() => update("showTerms", !draft.showTerms)} />
          <ToggleControl label="Show seat/zone" checked={draft.showSeatOrZone} onToggle={() => update("showSeatOrZone", !draft.showSeatOrZone)} />
          <ToggleControl label="Show action buttons" checked={draft.showActions} onToggle={() => update("showActions", !draft.showActions)} />
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-xs font-semibold leading-5 text-[var(--app-muted)]">
            Locked fields can be moved but cannot be hidden: QR, Booking ID, Ticket ID, Buizz pass badge, event title, date, time, venue, and required source badge.
          </div>
        </EditorPanel>
      ) : null}

      {showPanel("layout") ? (
        <EditorPanel title="Layout">
          <ToggleControl label="Drag elements on preview" checked={editLayout} onToggle={onToggleEditLayout} />
          {selectedElement ? (
            <ElementInspector
              element={selectedElement}
              onChange={(patch) => updateElement(selectedElement.id, patch)}
              onReset={() => {
                const defaultElement = createDefaultLayoutElements().find((item) => item.id === selectedElement.id);
                if (defaultElement) updateElement(selectedElement.id, defaultElement);
              }}
            />
          ) : null}
        </EditorPanel>
      ) : null}

      {showPanel("layers") ? (
        <EditorPanel title="Layers">
          <LayersList elements={elements} selectedElementId={selectedElementId} onSelect={onSelectElement} onUpdate={updateElement} onChange={(next) => update("layoutElements", next)} />
        </EditorPanel>
      ) : null}
    </div>
  );
}

export function TicketDesignEditor({
  draft,
  content,
  onChange,
  onSave,
  onReset,
  onOpenFullDesigner,
}: {
  draft: TicketDesignDraft;
  content: TicketPreviewContent;
  onChange: (draft: TicketDesignDraft) => void;
  onSave: (draft: TicketDesignDraft) => void;
  onReset: () => void;
  onOpenFullDesigner?: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editLayout, setEditLayout] = useState(false);
  const [activePanel, setActivePanel] = useState<TicketDesignControlPanel>("content");
  const [selectedElementId, setSelectedElementId] = useState("eventTitle");
  const data = useMemo(() => normalizePreviewData(draft, content), [content, draft]);
  const updateElement = (id: string, patch: Partial<TicketLayoutElement>) => {
    onChange({ ...draft, layoutElements: updateLayoutElement(draft.layoutElements, id, patch), updatedAt: new Date().toISOString() });
  };

  return (
    <div className="grid gap-5">
      <EditorPanel title="Template Type">
        <TicketTemplateLibrary selectedTemplateId={draft.templateId} onSelect={onChange} />
      </EditorPanel>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <TicketEditorTabs activePanel={activePanel} onChange={setActivePanel} />
          <TicketDesignControls
            draft={draft}
            selectedElementId={selectedElementId}
            editLayout={editLayout}
            activePanel={activePanel}
            onToggleEditLayout={() => setEditLayout((value) => !value)}
            onChange={onChange}
            onSelectElement={setSelectedElementId}
          />
          <EditorPanel title="Actions">
            <div className="flex flex-wrap gap-2">
              <ActionButton label="Reset to Real Ticket Default" icon={<RotateCcw className="size-4" />} onClick={onReset} />
              <ActionButton label="Save Ticket Draft" icon={<Save className="size-4" />} onClick={() => onSave(draft)} primary />
              <ActionButton label="Preview Full Ticket" icon={<Eye className="size-4" />} onClick={() => setPreviewOpen(true)} />
              {onOpenFullDesigner ? (
                <ActionButton label="Open Full Designer" icon={<Copy className="size-4" />} onClick={onOpenFullDesigner} />
              ) : null}
            </div>
          </EditorPanel>
        </div>
        <div className="min-w-0 rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
          <BuizzTicketPreview
            design={draft}
            data={data}
            mode="create-event"
            editable={editLayout}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={updateElement}
          />
        </div>
      </div>
      {previewOpen ? (
        <PreviewModal title="Full Ticket Preview" onClose={() => setPreviewOpen(false)}>
          <BuizzTicketPreview design={draft} data={data} mode="create-event" />
        </PreviewModal>
      ) : null}
    </div>
  );
}

export function OrganizerTicketDesignsPage() {
  const [draft, setDraft] = useState<TicketDesignDraft>(() => createTicketDesignDraft());
  const [savedDrafts, setSavedDrafts] = useState<TicketDesignDraft[]>([]);
  const [defaults, setDefaults] = useState<StoredDefaultMap>({});
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editLayout, setEditLayout] = useState(false);
  const [activePanel, setActivePanel] = useState<TicketDesignControlPanel>("content");
  const [selectedElementId, setSelectedElementId] = useState("eventTitle");
  const preview = useMemo(() => createDefaultTicketContent(draft), [draft]);
  const previewData = useMemo(() => normalizePreviewData(draft, preview), [draft, preview]);

  useEffect(() => {
    setSavedDrafts(readTicketDesignDrafts());
    setDefaults(readTicketDesignDefaults());
  }, []);

  const save = () => {
    const saved = saveTicketDesignDraft(draft);
    setDraft(saved);
    setSavedDrafts(readTicketDesignDrafts());
    setNotice("Template saved to localStorage.");
  };
  const duplicate = () => {
    const copy = saveTicketDesignDraft({
      ...draft,
      templateId: `custom-${Date.now()}`,
      templateName: `${draft.templateName} Copy`,
      updatedAt: new Date().toISOString(),
    });
    setDraft(copy);
    setSavedDrafts(readTicketDesignDrafts());
    setNotice("Template duplicated.");
  };
  const remove = () => {
    if (!deleteTicketDesignDraft(draft.templateId)) {
      setNotice("Default Buizz templates cannot be deleted.");
      return;
    }
    setDraft(createTicketDesignDraft());
    setSavedDrafts(readTicketDesignDrafts());
    setNotice("Custom template deleted.");
  };
  const setDefault = (ticketType: TicketType) => {
    const next = setTicketDesignDefault(ticketType, draft.templateId);
    setDefaults(next);
    setNotice(`Default template updated for ${ticketType}.`);
  };
  const updateElement = (id: string, patch: Partial<TicketLayoutElement>) => {
    setDraft((current) => ({ ...current, layoutElements: updateLayoutElement(current.layoutElements, id, patch), updatedAt: new Date().toISOString() }));
  };

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Ticket Designs</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--app-muted)]">
            Manage reusable Buizz ticket templates for online, offline, reserved, paid, and free bookings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton label="New Template" icon={<Copy className="size-4" />} onClick={() => setDraft(createTicketDesignDraft("event-ticket", { templateId: `custom-${Date.now()}`, templateName: "Custom Draft Template" }))} />
          <ActionButton label="Save Template" icon={<Save className="size-4" />} onClick={save} primary />
          <ActionButton label="Preview" icon={<Eye className="size-4" />} onClick={() => setPreviewOpen(true)} />
        </div>
      </div>
      {notice ? <p className="rounded-2xl border border-[#22C55E]/25 bg-[#22C55E]/10 p-3 text-sm font-black text-[#15803D]">{notice}</p> : null}
      <EditorPanel title="Template Library">
        <TicketTemplateLibrary selectedTemplateId={draft.templateId} includeCustom onSelect={setDraft} />
      </EditorPanel>
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,390px)_minmax(0,1fr)_minmax(280px,340px)]">
        <div className="grid gap-5">
          <EditorPanel title="Template Type">
            <TextField label="Template name" value={draft.templateName} onChange={(value) => setDraft((current) => ({ ...current, templateName: value, updatedAt: new Date().toISOString() }))} />
            <SelectField
              label="Ticket type"
              value={draft.ticketType}
              options={[
                { value: "event", label: "Online Event Ticket" },
                { value: "theatre", label: "Theatre / Play Ticket" },
                { value: "activity", label: "Activity Pass" },
                { value: "offline", label: "Offline Counter Ticket" },
                { value: "reserved", label: "Reserved / VIP Pass" },
                { value: "free", label: "Free Registration Pass" },
              ]}
              onChange={(value) => setDraft((current) => ({ ...current, ticketType: value as TicketType, updatedAt: new Date().toISOString() }))}
            />
          </EditorPanel>
          <TicketEditorTabs activePanel={activePanel} onChange={setActivePanel} />
          <TicketDesignControls
            draft={draft}
            selectedElementId={selectedElementId}
            editLayout={editLayout}
            activePanel={activePanel}
            onToggleEditLayout={() => setEditLayout((value) => !value)}
            onChange={setDraft}
            onSelectElement={setSelectedElementId}
          />
        </div>
        <div className="min-w-0 rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
          <BuizzTicketPreview
            design={draft}
            data={previewData}
            mode="designer"
            editable={editLayout}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={updateElement}
          />
        </div>
        <aside className="grid content-start gap-4">
          <EditorPanel title="Saved Templates">
            {savedDrafts.length ? (
              <div className="grid gap-2">
                {savedDrafts.map((item) => (
                  <button key={item.templateId} type="button" onClick={() => setDraft(item)} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]">
                    <p className="text-sm font-black">{item.templateName}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{formatUpdatedAt(item.updatedAt)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-[var(--app-border)] p-4 text-sm font-semibold text-[var(--app-muted)]">No saved custom templates yet.</p>
            )}
          </EditorPanel>
          <EditorPanel title="Default Template Per Category">
            <div className="grid gap-2">
              {(["event", "theatre", "activity", "offline", "free"] as TicketType[]).map((type) => (
                <button key={type} type="button" onClick={() => setDefault(type)} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-left text-xs font-black capitalize">
                  <span>{type === "theatre" ? "Play" : type}</span>
                  <span className="truncate text-[var(--app-muted)]">{defaults[type] ?? "Default Buizz"}</span>
                </button>
              ))}
            </div>
          </EditorPanel>
          <EditorPanel title="Locked Fields">
            <div className="grid gap-2">
              {lockedFieldLabels.map((field) => <p key={field} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-xs font-bold text-[var(--app-muted)]">{field}</p>)}
            </div>
          </EditorPanel>
          <EditorPanel title="Template Actions">
            <div className="grid gap-2">
              <ActionButton label="Duplicate Template" icon={<Copy className="size-4" />} onClick={duplicate} />
              <ActionButton label="Delete Custom Template" icon={<Trash2 className="size-4" />} onClick={remove} disabled={isDefaultTicketTemplate(draft.templateId)} />
              <ActionButton label="Set as default for Event" icon={<Save className="size-4" />} onClick={() => setDefault("event")} />
              <ActionButton label="Set as default for Play" icon={<Save className="size-4" />} onClick={() => setDefault("theatre")} />
              <ActionButton label="Set as default for Activity" icon={<Save className="size-4" />} onClick={() => setDefault("activity")} />
              <ActionButton label="Set as default for Offline" icon={<Save className="size-4" />} onClick={() => setDefault("offline")} />
              <ActionButton label="Set as default for Free" icon={<Save className="size-4" />} onClick={() => setDefault("free")} />
              <ActionButton label="Reset Template" icon={<RotateCcw className="size-4" />} onClick={() => setDraft(createTicketDesignDraft(draft.templateId))} />
            </div>
          </EditorPanel>
          <EditorPanel title="Last Saved">
            <p className="text-sm font-black">{formatUpdatedAt(draft.updatedAt)}</p>
          </EditorPanel>
        </aside>
      </div>
      {previewOpen ? (
        <PreviewModal title="Full Ticket Preview" onClose={() => setPreviewOpen(false)}>
          <BuizzTicketPreview design={draft} data={previewData} mode="designer" />
        </PreviewModal>
      ) : null}
    </section>
  );
}

export function OrganizerOfflineBookingPage() {
  return (
    <section className="grid w-full max-w-full min-w-0 gap-4 overflow-x-hidden">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgb(var(--brand-primary-rgb)/0.14),transparent_34%),linear-gradient(135deg,var(--app-elevated),var(--app-subtle))]" />

        <div className="relative grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)]/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)] shadow-sm">
              <ReceiptText className="size-3.5" />
              Organizer Counter Desk
            </div>

            <h1 className="mt-3 break-words text-2xl font-black tracking-[-0.04em] text-[var(--app-foreground)] sm:text-3xl lg:text-4xl">
              Offline Booking
            </h1>

            <p className="mt-2 max-w-3xl break-words text-sm font-semibold leading-6 text-[var(--app-muted)] sm:text-base sm:leading-7">
              Issue counter, reserved, VIP, and complimentary tickets using offline inventory without reducing online stock.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            {[
              ["Flow", "8 steps"],
              ["Source", "Offline"],
              ["QR", "After issue"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)]/85 p-3 shadow-sm backdrop-blur"
              >
                <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  {label}
                </p>
                <p className="mt-1 break-words text-sm font-black text-[var(--app-foreground)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <OfflineBookingForm />
    </section>
  );
}

export function OfflineBookingForm() {
  const [createOfflineBookingApi, { isLoading: creatingOfflineBooking }] = useCreateOfflineBookingMutation();
  const [sendPhoneOtpApi] = useSendPhoneOtpMutation();
  const [verifyPhoneOtpApi] = useVerifyPhoneOtpMutation();
  const [events, setEvents] = useState<OrganizerEventOption[]>([]);
  const [currentStep, setCurrentStep] = useState<OfflineBookingStepId>("customer");
  const [booking, setBooking] = useState<OfflineBookingRecord | null>(null);
  const [recent, setRecent] = useState<OfflineBookingRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [recentSearch, setRecentSearch] = useState("");
  const [recentSource, setRecentSource] = useState<"All" | OfflineBookingRecord["source"]>("All");
  const [recentPayment, setRecentPayment] = useState<"All" | OfflineBookingRecord["paymentMode"]>("All");
  const [selectedRecentPreview, setSelectedRecentPreview] = useState<OfflineBookingRecord | null>(null);
  const [paymentAmountTouched, setPaymentAmountTouched] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpInput, setPhoneOtpInput] = useState("");
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [offlineOtpDelivery, setOfflineOtpDelivery] = useState<"auto" | "email">("auto");
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const recentRef = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState<OfflineBookingFormState>(() => createOfflineBookingFormState());

  useEffect(() => {
    const loadedEvents = loadOrganizerEventOptions();
    setEvents(loadedEvents);
    setRecent(readOfflineBookings());
    if (loadedEvents[0]) {
      setForm((current) => ({
        ...current,
        eventId: current.eventId || "",
        blockId: current.blockId || "",
      }));
    }
  }, []);

  const filteredEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) =>
      [event.title, event.category, event.venueName, event.city, event.status].some((value) => value.toLowerCase().includes(query)),
    );
  }, [eventSearch, events]);

  const selectedEvent = events.find((event) => event.id === form.eventId) ?? null;
  const selectedSchedule = getSelectedSchedule(selectedEvent, form.scheduleDate);
  const selectedSlot = getSelectedTimeSlot(selectedSchedule, form.timeSlot);
  const selectedBlock = selectedEvent?.blocks.find((block) => block.id === form.blockId) ?? null;
  const quantity =
    form.seatMode === "seat-map"
      ? form.selectedSeats.length
      : sanitizeQuantity(form.quantity);
  const inventoryLimit = getAvailableInventory(selectedBlock, form.source);
  const grossAmount = selectedBlock ? selectedBlock.price * quantity : 0;
  const totalAmount = form.source === "Complimentary" ? 0 : grossAmount;
  const amountCollected = form.paymentMode === "Complimentary" || form.source === "Complimentary" ? 0 : Number(form.amountCollected || 0);
  const balanceAmount = form.source === "Complimentary" ? 0 : Math.max(totalAmount - (Number.isFinite(amountCollected) ? amountCollected : 0), 0);
  const paymentStatus = getOfflinePaymentStatus(totalAmount, amountCollected, form.paymentMode, form.source);
  const validationMessage = getOfflineBookingValidation(currentStep, form, selectedEvent, selectedBlock, quantity, inventoryLimit, amountCollected, totalAmount);
  const draft = useMemo(() => createTicketDesignDraft(form.source === "Reserved" ? "reserved-vip-pass" : form.source === "Complimentary" ? "free-registration-pass" : "offline-counter-ticket"), [form.source]);
  const previewRecord = booking;

  const previewContent = previewRecord
    ? offlineBookingToPreviewContent(previewRecord)
    : createDefaultTicketContent(draft, {
      eventTitle: selectedEvent?.title ?? "Select an event",
      category: selectedEvent?.category ?? "Music Events",
      ticketType: form.source === "Reserved" ? "reserved" : "offline",
      venueName: selectedEvent?.venueName ?? "Venue pending",
      city: selectedEvent?.city ?? "City pending",
      date: form.scheduleDate || selectedEvent?.date || "Date pending",
      time: form.timeSlot || selectedEvent?.time || "Time pending",
      blockName: selectedBlock?.name ?? "Ticket block",
      seatLabel: formatSeatZoneLabel(form, selectedBlock),
      amountPaid: form.paymentMode === "Complimentary" || form.source === "Complimentary" ? 0 : totalAmount,
      source: form.source === "Complimentary" ? "Free" : form.source,
      customerName: form.customerName || "Customer name",
      quantity: Math.max(quantity, 1),
      paymentMode: form.paymentMode,
      bookingId: form.source === "Reserved" ? "BUIZZ-RES-PREVIEW" : form.source === "Complimentary" ? "BUIZZ-CMP-PREVIEW" : "BUIZZ-OFF-PREVIEW",
      ticketId: form.source === "Reserved" ? "TKT-RES-PREVIEW" : form.source === "Complimentary" ? "TKT-CMP-PREVIEW" : "TKT-OFF-PREVIEW",
      seats: [{ section: selectedBlock?.name ?? "Counter", totalSeats: Math.max(quantity, 1), seatNumbers: formatSeatZoneLabel(form, selectedBlock), amount: form.paymentMode === "Complimentary" || form.source === "Complimentary" ? 0 : totalAmount }],
    });

  const filteredRecent = useMemo(() => {
    const query = recentSearch.trim().toLowerCase();
    return recent.filter((bookingItem) => {
      const matchesQuery = !query || [bookingItem.bookingId, bookingItem.ticketId, bookingItem.customerName, bookingItem.eventTitle, bookingItem.ticketBlock]
        .some((value) => value.toLowerCase().includes(query));
      const matchesSource = recentSource === "All" || bookingItem.source === recentSource;
      const matchesPayment = recentPayment === "All" || bookingItem.paymentMode === recentPayment;
      return matchesQuery && matchesSource && matchesPayment;
    });
  }, [recent, recentPayment, recentSearch, recentSource]);

  const update = <Key extends keyof OfflineBookingFormState>(key: Key, value: OfflineBookingFormState[Key]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "customerPhone" || key === "whatsappPhone") {
        setPhoneOtp("");
        setPhoneOtpInput("");
        setPhoneOtpVerified(false);
        setPhoneVerificationToken("");
      }
      if (key === "eventId") {
        const nextEvent = events.find((event) => event.id === value);
        const nextSchedule = nextEvent?.schedules[0];
        const nextSlot = nextSchedule?.timeSlots[0];
        next.selectedSeats = [];
        next.scheduleDate = nextSchedule?.date ?? nextEvent?.date ?? "";
        next.timeSlot = nextSlot?.time ?? nextEvent?.time ?? "";
        next.blockId = nextEvent?.blocks[0]?.id ?? "";
        next.quantity = 1;
        next.zone = next.zone || nextEvent?.blocks[0]?.name || "";
        next.gate = next.gate || "Main Gate";

        if (nextEvent?.blocks[0] && next.paymentMode !== "Complimentary" && !paymentAmountTouched) {
          next.amountCollected = String(nextEvent.blocks[0].price);
        }
      }

      if (key === "scheduleDate") {
        const eventForSchedule = events.find((event) => event.id === next.eventId);
        const nextSchedule = getSelectedSchedule(eventForSchedule ?? null, String(value));
        next.timeSlot = nextSchedule?.timeSlots[0]?.time ?? "";
      }

      if (key === "source") {
        if (value === "Complimentary") {
          next.paymentMode = "Complimentary";
          next.amountCollected = "0";
        } else if (next.paymentMode === "Complimentary") {
          next.paymentMode = "Cash";
        }
      }

      if (key === "blockId" || key === "quantity" || key === "source" || key === "seatMode") {
        if (key === "blockId" || key === "source" || key === "seatMode") {
          next.selectedSeats = [];
        }
        const eventForBlock = events.find((event) => event.id === next.eventId);
        const blockForAmount = eventForBlock?.blocks.find((block) => block.id === next.blockId);
        if (blockForAmount && next.paymentMode !== "Complimentary" && next.source !== "Complimentary" && !paymentAmountTouched) {
          next.amountCollected = String(blockForAmount.price * sanitizeQuantity(next.quantity));
        }
      }

      if (key === "paymentMode") {
        if (value === "Complimentary") {
          next.source = "Complimentary";
          next.amountCollected = "0";
        } else if (!paymentAmountTouched) {
          const eventForBlock = events.find((event) => event.id === next.eventId);
          const blockForAmount = eventForBlock?.blocks.find((block) => block.id === next.blockId);
          next.amountCollected = String((blockForAmount?.price ?? 0) * sanitizeQuantity(next.quantity));
        }
      }
      return next;
    });
    if (key === "amountCollected") setPaymentAmountTouched(true);
    setError("");
    setNotice("");
  };

  const normalizedWhatsAppPhone = (form.whatsappPhone || form.customerPhone).replace(/\D/g, "");

  const sendPhoneOtp = async () => {
    const phone = normalizedWhatsAppPhone;
    if (phone.length < 10) {
      setError("Enter a valid customer WhatsApp phone number before sending OTP.");
      return;
    }
    try {
      await sendPhoneOtpApi({
        phone,
        email: form.customerEmail.trim(),
        purpose: "offline_booking",
        deliveryChannel: offlineOtpDelivery,
      }).unwrap();
      setPhoneOtp("sent");
      setPhoneOtpInput("");
      setPhoneOtpVerified(false);
      setPhoneVerificationToken("");
      setError("");
      setNotice(`OTP sent securely to ${form.customerName || "customer"}. Verify it before issuing the ticket.`);
    } catch (apiError) {
      setError(getApiError(apiError, "Unable to send customer OTP."));
    }
  };

  const verifyPhoneOtp = async () => {
    if (!phoneOtp) {
      setError("Send WhatsApp OTP first.");
      return;
    }
    try {
      const result = await verifyPhoneOtpApi({
        phone: normalizedWhatsAppPhone,
        otp: phoneOtpInput.trim().toUpperCase(),
        purpose: "offline_booking",
      }).unwrap();
      const verificationToken = result.data?.verificationToken;
      if (!verificationToken) throw new Error("Verification token was not returned");
      setPhoneVerificationToken(verificationToken);
      setPhoneOtpVerified(true);
      setError("");
      setNotice("Customer WhatsApp phone verified.");
    } catch (apiError) {
      setError(getApiError(apiError, "Incorrect or expired WhatsApp OTP."));
      setPhoneOtpVerified(false);
    }
  };

  const selectEvent = (eventId: string) => {
    update("eventId", eventId);
    setCurrentStep("schedule");
  };

  const goNext = () => {
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    const nextStep = getAdjacentOfflineStep(currentStep, 1);
    if (nextStep) setCurrentStep(nextStep);
  };

  const goPrevious = () => {
    const previousStep = getAdjacentOfflineStep(currentStep, -1);
    if (previousStep) setCurrentStep(previousStep);
    setError("");
  };

  const issueTicket = async () => {
    if (!phoneOtpVerified) {
      setCurrentStep("customer");
      setError("Verify customer WhatsApp OTP before issuing the ticket.");
      return;
    }
    const blockingStep = offlineBookingSteps
      .filter((step) => step.id !== "success")
      .find((step) => getOfflineBookingValidation(step.id, form, selectedEvent, selectedBlock, quantity, inventoryLimit, amountCollected, totalAmount));
    if (blockingStep) {
      const message = getOfflineBookingValidation(blockingStep.id, form, selectedEvent, selectedBlock, quantity, inventoryLimit, amountCollected, totalAmount);
      setCurrentStep(blockingStep.id);
      setError(message);
      return;
    }
    if (!selectedEvent || !selectedBlock) return;

    const backendEventId = Number(selectedEvent.backendEventId ?? selectedEvent.id);
    const backendTicketTypeId = Number(selectedBlock.backendTicketTypeId ?? selectedBlock.id);

    if (!Number.isInteger(backendEventId) || backendEventId <= 0 || !Number.isInteger(backendTicketTypeId) || backendTicketTypeId <= 0) {
      setError("This event or ticket section is missing backend IDs. Open a database-saved approved event before offline booking.");
      return;
    }

    let backendResult: any;
    try {
      backendResult = await createOfflineBookingApi({
        eventId: backendEventId,
        ticketTypeId: backendTicketTypeId,
        quantity,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        customerPhoneVerificationToken: phoneVerificationToken,
        paymentMode: form.paymentMode,
        paymentReference: form.paymentReference.trim() || undefined,
      } as any).unwrap();
    } catch (apiError) {
      setError(getApiError(apiError, "Offline booking failed. Ticket was not generated."));
      return;
    }

    const issuedAt = new Date().toISOString();
    const code = createOfflineTicketCode();
    const prefix = form.source === "Reserved" ? "RES" : form.source === "Complimentary" ? "CMP" : "OFF";
    const backendData = backendResult?.data ?? backendResult;
    const bookingId = String(backendData?.booking?.bookingNumber ?? backendData?.booking?.bookingId ?? `BUIZZ-${prefix}-${code}`);
    const ticketId = String(backendData?.tickets?.[0]?.ticket_number ?? backendData?.tickets?.[0]?.ticketNumber ?? bookingId);
    const receiptNo = `RCPT-${prefix}-${code}`;
    const seatLabel = formatSeatZoneLabel(form, selectedBlock);
    const qrPayload = JSON.stringify({
      type: "buizz-booking-pass",
      bookingId,
      eventId: selectedEvent.id,
      totalSeats: quantity,
      seatGroups: [
        {
          section: selectedBlock.name,
          totalSeats: quantity,
          seatNumbers: [seatLabel || `${selectedBlock.name} x${quantity}`],
          amount: totalAmount,
        },
      ],
      source: form.source,
      status: "issued",
      issuedAt,
    });

    const record: OfflineBookingRecord = {
      id: `offline-${issuedAt}`,
      bookingId,
      ticketId,
      receiptNo,
      eventId: selectedEvent.id,
      eventTitle: selectedEvent.title,
      category: selectedEvent.category,
      venueName: selectedEvent.venueName,
      city: selectedEvent.city,
      date: form.scheduleDate || selectedEvent.date,
      time: form.timeSlot || selectedEvent.time,
      ticketBlock: selectedBlock.name,
      seatLabel,
      zone: form.zone.trim() || selectedBlock.name,
      gate: form.gate.trim() || "Main Gate",
      quantity,
      pricePerTicket: form.source === "Complimentary" ? 0 : selectedBlock.price,
      totalAmount,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      whatsappPhone: form.whatsappPhone.trim() || form.customerPhone.trim(),
      customerEmail: form.customerEmail.trim() || undefined,
      customerCity: form.customerCity.trim() || undefined,
      idProof: form.idProof.trim() || undefined,
      source: form.source,
      paymentMode: form.source === "Complimentary" ? "Complimentary" : form.paymentMode,
      paymentStatus,
      amountCollected,
      balanceAmount,
      paymentReference: form.paymentReference.trim() || undefined,
      counterStaff: form.counterStaff.trim() || undefined,
      notes: form.notes.trim() || form.internalNote.trim(),
      qrPayload,
      status: "issued",
      issuedAt,
    };

    setEvents((current) =>
      current.map((event) =>
        event.id !== selectedEvent.id
          ? event
          : {
            ...event,
            blocks: event.blocks.map((block) => {
              if (block.id !== selectedBlock.id) return block;
              return form.source === "Offline"
                ? { ...block, offlineQuantity: Math.max(block.offlineQuantity - quantity, 0), soldOffline: block.soldOffline + quantity }
                : { ...block, reservedQuantity: Math.max(block.reservedQuantity - quantity, 0), soldReserved: block.soldReserved + quantity };
            }),
          },
      ),
    );
    saveOfflineBooking(record);
    setBooking(record);
    setRecent(readOfflineBookings());
    setSelectedRecentPreview(null);
    setCurrentStep("success");
    setNotice("Ticket issued, inventory updated, QR created, and delivery queued.");
  };

  const resetFlow = () => {
    const next = createOfflineBookingFormState();
    setForm(next);
    setBooking(null);
    setSelectedRecentPreview(null);
    setPaymentAmountTouched(false);
    setPhoneOtp("");
    setPhoneOtpInput("");
    setPhoneOtpVerified(false);
    setPhoneVerificationToken("");
    setCurrentStep("customer");
    setError("");
    setNotice("");
  };

  const viewRecent = () => {
    recentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const downloadTicket = () => {
    setNotice("Download functionality to be implemented with backend PDF generation.");
  };

  const shareTicket = async (record: OfflineBookingRecord | null) => {
    if (!record) return;
    const text = `${record.bookingId} / ${record.ticketId} - ${record.customerName} for ${record.eventTitle}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Buizz offline ticket", text });
        setNotice("Ticket shared.");
        return;
      }
      await navigator.clipboard.writeText(text);
      setNotice("Ticket details copied to clipboard.");
    } catch {
      setNotice("Ticket share was not completed. You can still copy details from the receipt.");
    }
  };

  const printTicket = (record: OfflineBookingRecord | null) => {
    if (!record) return;
    setSelectedRecentPreview(record);
    setNotice("Print preview selected. Use browser print / backend PDF later.");
    window.print();
  };

  const markRecentPaid = (record: OfflineBookingRecord) => {
    const next = updateOfflineBookingRecord(record.bookingId, {
      amountCollected: record.totalAmount,
      balanceAmount: 0,
      paymentStatus: record.totalAmount <= 0 ? "Complimentary" : "Paid",
      paymentMode: record.paymentMode === "Complimentary" ? "Complimentary" : record.paymentMode,
    });
    setRecent(next);
    setSelectedRecentPreview((current) =>
      current?.bookingId === record.bookingId
        ? next.find((item) => item.bookingId === record.bookingId) ?? current
        : current,
    );
    setNotice("Offline booking marked as fully paid.");
  };

  const cancelRecentBooking = (record: OfflineBookingRecord) => {
    const next = updateOfflineBookingRecord(record.bookingId, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    });
    setRecent(next);
    setSelectedRecentPreview((current) =>
      current?.bookingId === record.bookingId
        ? next.find((item) => item.bookingId === record.bookingId) ?? current
        : current,
    );
    setNotice("Offline booking cancelled locally. Backend should sync inventory reversal.");
  };

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4 overflow-x-hidden pb-24 sm:pb-0">
      <div className="grid w-full max-w-full min-w-0 gap-4 lg:grid-cols-[76px_minmax(0,1fr)] 2xl:grid-cols-[244px_minmax(0,1fr)_minmax(320px,380px)]">
        <OfflineBookingStepper currentStep={currentStep} />

        <section className="min-w-0 overflow-hidden rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[var(--app-border)] bg-[linear-gradient(135deg,var(--app-subtle),var(--app-elevated))] p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                  Step {Math.max(offlineBookingSteps.findIndex((step) => step.id === currentStep) + 1, 1)} of {offlineBookingSteps.length}
                </p>
                <h2 className="mt-1 break-words text-2xl font-black tracking-[-0.03em] text-[var(--app-foreground)] sm:text-3xl">
                  {offlineBookingSteps.find((step) => step.id === currentStep)?.label ?? "Offline Booking"}
                </h2>
                <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-[var(--app-muted)]">
                  Complete this step to generate a counter ticket with QR after final review.
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  <span>Progress</span>
                  <span className="text-[var(--color-brand-primary)]">
                    {Math.round(((offlineBookingSteps.findIndex((step) => step.id === currentStep) + 1) / offlineBookingSteps.length) * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-brand-primary)] transition-all duration-500"
                    style={{
                      width: `${Math.round(((offlineBookingSteps.findIndex((step) => step.id === currentStep) + 1) / offlineBookingSteps.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 p-4 sm:p-5 lg:p-6">
            {currentStep === "event" ? (
              <OfflineEventStep events={filteredEvents} selectedEventId={form.eventId} search={eventSearch} onSearch={setEventSearch} onSelect={selectEvent} />
            ) : null}

            {currentStep === "schedule" ? (
              <OfflineScheduleStep form={form} selectedEvent={selectedEvent} selectedSchedule={selectedSchedule} onChange={update} />
            ) : null}

            {currentStep === "source" ? (
              <OfflineSourceStep form={form} selectedBlock={selectedBlock} inventoryLimit={inventoryLimit} onChange={update} />
            ) : null}

            {currentStep === "ticket" ? (
              <OfflineTicketStep form={form} selectedEvent={selectedEvent} selectedBlock={selectedBlock} quantity={quantity} totalAmount={totalAmount} grossAmount={grossAmount} onChange={update} />
            ) : null}

            {currentStep === "customer" ? (
              <OfflineCustomerStep
                form={form}
                otpSent={Boolean(phoneOtp)}
                otpInput={phoneOtpInput}
                otpVerified={phoneOtpVerified}
                otpDelivery={offlineOtpDelivery}
                onOtpDelivery={(channel) => {
                  setOfflineOtpDelivery(channel);
                  setPhoneOtp("");
                  setPhoneOtpInput("");
                  setPhoneOtpVerified(false);
                  setPhoneVerificationToken("");
                }}
                onOtpInput={(value) =>
                  setPhoneOtpInput(
                    value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
                  )
                }
                onSendOtp={sendPhoneOtp}
                onVerifyOtp={verifyPhoneOtp}
                onChange={update}
              />
            ) : null}

            {currentStep === "payment" ? (
              <OfflinePaymentStep form={form} totalAmount={totalAmount} amountCollected={amountCollected} balanceAmount={balanceAmount} paymentStatus={paymentStatus} onChange={update} />
            ) : null}

            {currentStep === "review" ? (
              <OfflineReviewStep form={form} selectedEvent={selectedEvent} selectedBlock={selectedBlock} quantity={quantity} totalAmount={totalAmount} amountCollected={amountCollected} balanceAmount={balanceAmount} paymentStatus={paymentStatus} />
            ) : null}

            {currentStep === "success" ? (
              <OfflineSuccessStep booking={booking} draft={draft} content={previewContent} onIssueAnother={resetFlow} onViewRecent={viewRecent} onDownload={downloadTicket} onShare={() => shareTicket(booking)} />
            ) : null}

            {currentStep !== "success" ? (
              <OfflineStepActions
                currentStep={currentStep}
                disabled={Boolean(validationMessage)}
                disabledMessage={validationMessage}
                onPrevious={goPrevious}
                onNext={goNext}
                onConfirm={issueTicket}
                confirming={creatingOfflineBooking}
              />
            ) : null}
          </div>
        </section>

        <aside className="min-w-0 lg:col-span-2 2xl:col-span-1 2xl:sticky 2xl:top-4 2xl:self-start">
          <OfflineBookingSummary
            currentStep={currentStep}
            selectedEvent={selectedEvent}
            selectedBlock={selectedBlock}
            selectedSchedule={selectedSchedule}
            selectedSlot={selectedSlot}
            form={form}
            quantity={quantity}
            totalAmount={totalAmount}
            paymentStatus={paymentStatus}
            validationMessage={validationMessage}
          />
        </aside>
      </div>

      <div className="grid gap-2">
        {error ? (
          <p className="rounded-2xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 p-3 text-sm font-black leading-5 text-[var(--color-brand-primary)]">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-3 text-sm font-black leading-5 text-[#15803D]">
            {notice}
          </p>
        ) : null}
      </div>

      {booking ? null : (
        <section className="overflow-hidden rounded-[1.75rem] border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-center shadow-[0_12px_34px_rgba(15,23,42,0.04)] sm:p-5">
          <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
            <Lock className="size-5" />
          </span>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
            Ticket Preview Locked
          </p>
          <h2 className="mx-auto mt-2 max-w-lg break-words text-lg font-black sm:text-xl">
            Preview will appear after issuing the ticket
          </h2>
          <p className="mx-auto mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-[var(--app-muted)]">
            Complete event, ticket, customer, payment, and review steps first. After confirmation,
            Buizz will generate the offline counter ticket with QR preview.
          </p>
        </section>
      )}

      <p className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-xs font-semibold leading-5 text-[var(--app-muted)]">
        Frontend inventory preview only. Backend will finalize inventory lock. Online inventory is not reduced by this counter flow.
      </p>

      <section ref={recentRef} className="min-w-0">
        <RecentOfflineBookings
          bookings={filteredRecent}
          search={recentSearch}
          source={recentSource}
          payment={recentPayment}
          selectedPreview={selectedRecentPreview}
          onSearch={setRecentSearch}
          onSource={setRecentSource}
          onPayment={setRecentPayment}
          onPreview={setSelectedRecentPreview}
          onDownload={downloadTicket}
          onShare={shareTicket}
          onPrint={printTicket}
          onMarkPaid={markRecentPaid}
          onCancel={cancelRecentBooking}
        />
      </section>
    </div>
  );
}

export function OfflineTicketPreview({ draft, content }: { draft: TicketDesignDraft; content: TicketPreviewContent }) {
  return <BuizzTicketPreview design={{ ...draft, badgeText: draft.ticketType === "reserved" ? "VIP PASS" : "COUNTER PASS", showSourceBadge: true }} data={normalizePreviewData(draft, content)} mode="offline-issued" />;
}

type OfflineBookingStepId =
  | "customer"
  | "event"
  | "schedule"
  | "source"
  | "ticket"
  | "payment"
  | "review"
  | "success";




type OfflineBookingFormState = {
  eventId: string;
  scheduleDate: string;
  timeSlot: string;
  blockId: string;
  quantity: number;
  seatMode: "seat-map" | "zone-quantity";
  selectedSeats: string[];
  seatLabel: string;
  zone: string;
  gate: string;
  customerName: string;
  customerPhone: string;
  whatsappPhone: string;
  customerEmail: string;
  customerCity: string;
  idProof: string;
  notes: string;
  source: OfflineBookingRecord["source"];
  paymentMode: OfflineBookingRecord["paymentMode"];
  amountCollected: string;
  paymentReference: string;
  counterStaff: string;
  internalNote: string;
};

const offlineBookingSteps: Array<{ id: OfflineBookingStepId; label: string }> = [
  { id: "customer", label: "Customer" },
  { id: "event", label: "Event" },
  { id: "schedule", label: "Date & Time" },
  { id: "source", label: "Source" },
  { id: "ticket", label: "Ticket / Seat" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
  { id: "success", label: "Success" },
];
const paymentModes: OfflineBookingRecord["paymentMode"][] = ["Cash", "UPI", "Razorpay", "Other", "Complimentary"];

function createOfflineBookingFormState(): OfflineBookingFormState {
  return {
    eventId: "",
    scheduleDate: "",
    timeSlot: "",
    blockId: "",
    quantity: 1,
    seatMode: "seat-map",
    selectedSeats: [],
    seatLabel: "",
    zone: "",
    gate: "",
    customerName: "",
    customerPhone: "",
    whatsappPhone: "",
    customerEmail: "",
    customerCity: "",
    idProof: "",
    notes: "",
    source: "Offline",
    paymentMode: "Cash",
    amountCollected: "",
    paymentReference: "",
    counterStaff: "",
    internalNote: "",
  };
}

function OfflineBookingStepper({ currentStep }: { currentStep: OfflineBookingStepId }) {
  const activeIndex = offlineBookingSteps.findIndex((step) => step.id === currentStep);
  const safeActiveIndex = Math.max(activeIndex, 0);
  const progress = Math.round(((safeActiveIndex + 1) / offlineBookingSteps.length) * 100);
  const activeStep = offlineBookingSteps[safeActiveIndex] ?? offlineBookingSteps[0];

  return (
    <nav className="relative z-10 w-full max-w-full min-w-0 lg:sticky lg:top-4 lg:self-start">
      <div className="lg:hidden overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
              Counter Flow
            </p>
            <p className="mt-1 truncate text-base font-black text-[var(--app-foreground)]">
              Step {safeActiveIndex + 1}: {activeStep?.label ?? "Offline Booking"}
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1.5 text-xs font-black text-[var(--color-brand-primary)]">
            {progress}%
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--app-subtle)]">
          <div
            className="h-full rounded-full bg-[var(--color-brand-primary)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-8 gap-1.5">
          {offlineBookingSteps.map((step, index) => {
            const active = step.id === currentStep;
            const complete = index < activeIndex;

            return (
              <span
                key={step.id}
                title={step.label}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "grid min-h-9 place-items-center rounded-xl border text-[11px] font-black transition-all duration-300",
                  active
                    ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white shadow-[0_10px_22px_rgb(var(--brand-primary-rgb)/0.18)]"
                    : complete
                      ? "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                      : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)]",
                )}
              >
                {complete ? <CheckCircle2 className="size-4" /> : index + 1}
              </span>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="group/rail w-full max-w-full overflow-visible rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_18px_50px_rgba(15,23,42,0.08)] 2xl:p-3">
          <div className="hidden border-b border-[var(--app-border)] px-2 pb-3 2xl:block">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              Counter Flow
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-[var(--app-foreground)]">
                  Step {safeActiveIndex + 1} of {offlineBookingSteps.length}
                </p>
                <p className="mt-0.5 truncate text-xs font-bold text-[var(--app-muted)]">
                  {activeStep?.label ?? "Offline Booking"}
                </p>
              </div>
              <span className="shrink-0 text-xs font-black text-[var(--color-brand-primary)]">
                {progress}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--app-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--color-brand-primary)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid gap-2 pt-0 2xl:pt-3">
            {offlineBookingSteps.map((step, index) => {
              const active = step.id === currentStep;
              const complete = index < activeIndex;

              return (
                <div
                  key={step.id}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "group/step relative grid min-h-12 min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-2 overflow-visible rounded-2xl border text-left transition-all duration-300",
                    active
                      ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white shadow-[0_14px_32px_rgb(var(--brand-primary-rgb)/0.22)]"
                      : complete
                        ? "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                        : "border-transparent bg-[var(--app-subtle)] text-[var(--app-muted)]",
                  )}
                >
                  <span
                    className={cn(
                      "ml-1 grid size-10 shrink-0 place-items-center rounded-xl text-xs font-black transition-transform duration-300 group-hover/step:scale-105",
                      active
                        ? "bg-white/18 text-white"
                        : complete
                          ? "bg-[var(--color-brand-primary)] text-white"
                          : "bg-[var(--app-elevated)] text-[var(--app-muted)]",
                    )}
                  >
                    {complete ? <CheckCircle2 className="size-4" /> : index + 1}
                  </span>

                  <span className="hidden min-w-0 opacity-100 transition-all duration-300 2xl:block">
                    <span className="block truncate text-sm font-black">{step.label}</span>
                    <span className={cn("mt-0.5 block truncate text-[10px] font-bold", active ? "text-white/75" : "text-[var(--app-muted)]")}>Counter booking</span>
                  </span>

                  <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden min-w-[150px] -translate-y-1/2 translate-x-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 py-2 text-xs font-black text-[var(--app-foreground)] opacity-0 shadow-[0_18px_42px_rgba(15,23,42,0.18)] transition-all duration-200 group-hover/step:translate-x-0 group-hover/step:opacity-100 xl:block 2xl:hidden">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

function OfflineEventStep({
  events,
  selectedEventId,
  search,
  onSearch,
  onSelect,
}: {
  events: OrganizerEventOption[];
  selectedEventId: string;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (eventId: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
        Search event
        <span className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3">
          <Search className="size-4 text-[var(--app-muted)]" />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by event, city, venue, status" className="min-w-0 bg-transparent text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none" />
        </span>
      </label>
      <div className="grid gap-3">
        {events.map((event) => {
          const selected = selectedEventId === event.id;
          const totals = event.blocks.reduce(
            (sum, block) => ({
              offline: sum.offline + block.offlineQuantity,
              reserved: sum.reserved + block.reservedQuantity,
              soldOffline: sum.soldOffline + block.soldOffline,
              soldReserved: sum.soldReserved + block.soldReserved,
            }),
            { offline: 0, reserved: 0, soldOffline: 0, soldReserved: 0 },
          );
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              className={cn(
                "min-w-0 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30",
                selected ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10" : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:border-[var(--color-brand-primary)]/40",
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-black">{event.title}</p>
                  <p className="mt-2 text-xs font-bold uppercase text-[var(--color-brand-primary)]">{event.category}</p>
                  <div className="mt-3 grid gap-2 text-xs font-semibold text-[var(--app-muted)] sm:grid-cols-2">
                    <span className="min-w-0 truncate">{event.venueName}, {event.city}</span>
                    <span>{event.date} / {event.time}</span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 py-1 text-[11px] font-black text-[var(--app-muted)]">{event.status}</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <InventoryMini label="Offline available" value={totals.offline} />
                <InventoryMini label="Reserved available" value={totals.reserved} />
                <InventoryMini label="Sold offline" value={totals.soldOffline} />
                <InventoryMini label="Sold reserved" value={totals.soldReserved} />
              </div>
            </button>
          );
        })}
        {!events.length ? <p className="rounded-2xl border border-dashed border-[var(--app-border)] p-4 text-sm font-semibold text-[var(--app-muted)]">No matching events found.</p> : null}
      </div>
    </div>
  );
}


function OfflineScheduleStep({
  form,
  selectedEvent,
  selectedSchedule,
  onChange,
}: {
  form: OfflineBookingFormState;
  selectedEvent: OrganizerEventOption | null;
  selectedSchedule: OrganizerEventOption["schedules"][number] | null;
  onChange: <Key extends keyof OfflineBookingFormState>(key: Key, value: OfflineBookingFormState[Key]) => void;
}) {
  if (!selectedEvent) return <EmptyStepMessage title="Select an event first" detail="Go back to the Event step and choose the counter event." />;

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
        <p className="text-xs font-black uppercase text-[var(--app-muted)]">Selected event</p>
        <p className="mt-1 text-lg font-black">{selectedEvent.title}</p>
        <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">{selectedEvent.venueName}, {selectedEvent.city}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {selectedEvent.schedules.map((schedule) => {
          const selected = form.scheduleDate === schedule.date;
          return (
            <button
              key={schedule.id}
              type="button"
              onClick={() => onChange("scheduleDate", schedule.date)}
              className={cn(
                "min-h-20 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30",
                selected ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10" : "border-[var(--app-border)] bg-[var(--app-subtle)]",
              )}
            >
              <p className="text-xs font-black uppercase text-[var(--app-muted)]">Date</p>
              <p className="mt-1 text-base font-black">{formatHeroDate(schedule.date)}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{schedule.timeSlots.length} slot(s)</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(selectedSchedule?.timeSlots ?? []).map((slot) => {
          const selected = form.timeSlot === slot.time;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onChange("timeSlot", slot.time)}
              className={cn(
                "min-h-14 rounded-2xl border px-4 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30",
                selected ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white" : "border-[var(--app-border)] bg-[var(--app-subtle)]",
              )}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OfflineSourceStep({
  form,
  selectedBlock,
  inventoryLimit,
  onChange,
}: {
  form: OfflineBookingFormState;
  selectedBlock: OrganizerEventOption["blocks"][number] | null;
  inventoryLimit: number;
  onChange: <Key extends keyof OfflineBookingFormState>(key: Key, value: OfflineBookingFormState[Key]) => void;
}) {
  const sources: Array<{
    id: OfflineBookingSource;
    title: string;
    detail: string;
  }> = [
      {
        id: "Offline",
        title: "Offline Counter Sale",
        detail: "Paid ticket sold at venue counter. Reduces offline inventory.",
      },
      {
        id: "Reserved",
        title: "Reserved / VIP Pass",
        detail: "Pass for guest list, VIP, sponsor, or held seats. Reduces reserved inventory.",
      },
      {
        id: "Complimentary",
        title: "Complimentary / Free Pass",
        detail: "Free pass issued by organizer. Uses reserved inventory and stores zero revenue.",
      },
    ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-3">
        {sources.map((source) => {
          const selected = form.source === source.id;
          return (
            <button
              key={source.id}
              type="button"
              onClick={() => onChange("source", source.id)}
              className={cn(
                "min-h-32 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30",
                selected ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10" : "border-[var(--app-border)] bg-[var(--app-subtle)]",
              )}
            >
              <p className="text-base font-black">{source.title}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">{source.detail}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:grid-cols-3">
        <MiniLine label="Selected block" value={selectedBlock?.name ?? "Not selected"} />
        <MiniLine label="Selected source" value={form.source} />
        <MiniLine label="Available inventory" value={String(inventoryLimit)} />
      </div>
    </div>
  );
}
function CounterSeatMap({
  block,
  source,
  selectedSeats,
  maxSelectable,
  onChange,
}: {
  block: OrganizerEventOption["blocks"][number] | null;
  source: OfflineBookingSource;
  selectedSeats: string[];
  maxSelectable: number;
  onChange: (seats: string[]) => void;
}) {
  if (!block) {
    return (
      <EmptyStepMessage
        title="Select a ticket block first"
        detail="Choose VIP, Premium, General, or another ticket block before selecting seats."
      />
    );
  }

  const seats = buildCounterSeatMap(block, source);

  const toggleSeat = (label: string) => {
    if (selectedSeats.includes(label)) {
      onChange(selectedSeats.filter((seat) => seat !== label));
      return;
    }

    if (selectedSeats.length >= maxSelectable) return;

    onChange([...selectedSeats, label]);
  };

  return (
    <section className="grid gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">Counter Seat Map</p>
          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
            Select seats for offline/reserved counter ticket.
          </p>
        </div>

        <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 py-1 text-xs font-black">
          Selected {selectedSeats.length}/{maxSelectable}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
        <div className="mx-auto w-full max-w-md rounded-b-[3rem] rounded-t-xl bg-[var(--color-brand-primary)] px-4 py-2 text-center text-xs font-black uppercase tracking-[0.16em] text-white">
          Stage / Screen
        </div>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {seats.map((seat) => {
            const selected = selectedSeats.includes(seat.label);

            return (
              <button
                key={seat.label}
                type="button"
                disabled={seat.sold}
                onClick={() => toggleSeat(seat.label)}
                className={cn(
                  "min-h-10 rounded-xl border text-[11px] font-black transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30",
                  seat.sold
                    ? "cursor-not-allowed border-[var(--app-border)] bg-[var(--app-muted)]/20 text-[var(--app-muted)] opacity-50"
                    : selected
                      ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white shadow-[0_10px_24px_rgb(var(--brand-primary-rgb)/0.22)]"
                      : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:border-[var(--color-brand-primary)]/50",
                )}
              >
                {seat.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold text-[var(--app-muted)]">
          <span className="rounded-full border border-[var(--app-border)] px-3 py-1">Available</span>
          <span className="rounded-full border border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] px-3 py-1 text-white">Selected</span>
          <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-muted)]/20 px-3 py-1">Sold/Blocked</span>
        </div>
      </div>
    </section>
  );
}

function buildCounterSeatMap(
  block: OrganizerEventOption["blocks"][number],
  source: OfflineBookingSource,
) {
  const sold =
    source === "Offline"
      ? block.soldOffline
      : block.soldReserved;

  const available =
    source === "Offline"
      ? block.offlineQuantity
      : block.reservedQuantity;

  const total = Math.min(Math.max(sold + available, 30), 120);
  const rows = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const prefix = block.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "GEN";

  return Array.from({ length: total }).map((_, index) => {
    const row = rows[Math.floor(index / 10)] ?? "Z";
    const column = (index % 10) + 1;

    return {
      label: `${prefix}-${row}${column}`,
      sold: index < sold,
    };
  });
}

function OfflineTicketStep({
  form,
  selectedEvent,
  selectedBlock,
  quantity,
  totalAmount,
  grossAmount,
  onChange,
}: {
  form: OfflineBookingFormState;
  selectedEvent: OrganizerEventOption | null;
  selectedBlock: OrganizerEventOption["blocks"][number] | null;
  quantity: number;
  totalAmount: number;
  grossAmount: number;
  onChange: <Key extends keyof OfflineBookingFormState>(key: Key, value: OfflineBookingFormState[Key]) => void;
}) {
  if (!selectedEvent) {
    return (
      <EmptyStepMessage
        title="Select an event first"
        detail="Go back to the Event step and choose the counter event."
      />
    );
  }
  const sourceLimit = getAvailableInventory(selectedBlock, form.source);
  const maxSelectable = Math.min(
    selectedBlock?.maxPerBooking ?? 1,
    Math.max(sourceLimit, 1),
  );

  const ticketCapacityMessage =
    !selectedBlock
      ? "Select a ticket block."
      : sourceLimit <= 0
        ? `${form.source} inventory is sold out for this ticket block.`
        : quantity > selectedBlock.maxPerBooking
          ? `Maximum allowed quantity is ${selectedBlock.maxPerBooking}.`
          : quantity > sourceLimit
            ? `${form.source} inventory has only ${sourceLimit} tickets available.`
            : "";

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
        <p className="text-xs font-black uppercase text-[var(--app-muted)]">
          Selected event and schedule
        </p>
        <p className="mt-1 text-lg font-black">{selectedEvent.title}</p>
        <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
          {selectedEvent.venueName}, {selectedEvent.city} /{" "}
          {form.scheduleDate || selectedEvent.date} /{" "}
          {form.timeSlot || selectedEvent.time}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {selectedEvent.blocks.map((block) => {
          const selected = block.id === form.blockId;

          return (
            <button
              key={block.id}
              type="button"
              onClick={() => onChange("blockId", block.id)}
              className={cn(
                "min-w-0 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30",
                selected
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10"
                  : "border-[var(--app-border)] bg-[var(--app-subtle)]",
              )}
            >
              <p className="truncate text-base font-black">{block.name}</p>
              <p className="mt-1 text-xl font-black text-[var(--color-brand-primary)]">
                {formatMoney(block.price)}
              </p>

              <div className="mt-4 grid gap-2">
                <MiniLine label="Offline available" value={String(block.offlineQuantity)} />
                <MiniLine label="Reserved available" value={String(block.reservedQuantity)} />
                <MiniLine label="Sold offline" value={String(block.soldOffline)} />
                <MiniLine label="Sold reserved" value={String(block.soldReserved)} />
                <MiniLine label="Max allowed" value={String(block.maxPerBooking)} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("seatMode", "seat-map")}
          className={cn(
            "min-h-12 rounded-xl border px-4 text-sm font-black",
            form.seatMode === "seat-map"
              ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
              : "border-[var(--app-border)] bg-[var(--app-elevated)]",
          )}
        >
          Choose Seats
        </button>

        <button
          type="button"
          onClick={() => onChange("seatMode", "zone-quantity")}
          className={cn(
            "min-h-12 rounded-xl border px-4 text-sm font-black",
            form.seatMode === "zone-quantity"
              ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
              : "border-[var(--app-border)] bg-[var(--app-elevated)]",
          )}
        >
          Zone + Quantity
        </button>
      </div>

      {form.seatMode === "seat-map" ? (
        <CounterSeatMap
          block={selectedBlock}
          source={form.source}
          selectedSeats={form.selectedSeats}
          maxSelectable={maxSelectable}
          onChange={(seats) => onChange("selectedSeats", seats)}
        />
      ) : (
        <div className="grid gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <QuantityControl
            value={quantity}
            max={sourceLimit}
            onChange={(value) => onChange("quantity", value)}
          />

          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
            <p className="text-xs font-black uppercase text-[var(--app-muted)]">
              Total amount
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--color-brand-primary)]">
              {formatMoney(totalAmount, form.source === "Complimentary")}
            </p>

            {form.source === "Complimentary" ? (
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                Original value waived: {formatMoney(grossAmount)}
              </p>
            ) : (
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                Inventory limit: {sourceLimit}
              </p>
            )}
          </div>
        </div>
      )}
      {ticketCapacityMessage ? (
        <p className="rounded-2xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 p-3 text-sm font-black text-[var(--color-brand-primary)]">
          {ticketCapacityMessage}
        </p>
      ) : selectedBlock ? (
        <p className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-3 text-sm font-black text-[#15803D]">
          {sourceLimit} {form.source.toLowerCase()} ticket(s) available for{" "}
          {selectedBlock.name}.
        </p>
      ) : null}

      <div className="grid gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:grid-cols-3">
        <TextField
          label="Manual seat/pass label optional"
          value={form.seatLabel}
          onChange={(value) => onChange("seatLabel", value)}
        />

        <TextField
          label="Zone / Section optional"
          placeholder="Example: VIP Zone, Balcony, General"
          value={form.zone}
          onChange={(value) => onChange("zone", value)}
        />

        <TextField
          label="Gate optional"
          placeholder="Example: Main Gate, Gate 2"
          value={form.gate}
          onChange={(value) => onChange("gate", value)}
        />

        <p className="sm:col-span-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-xs font-semibold leading-5 text-[var(--app-muted)]">
          For seat-map mode, selected seats will be used automatically. For general entry,
          use Zone + Quantity mode.
        </p>
      </div>
    </div>
  );
}

function OfflineCustomerStep({
  form,
  otpSent,
  otpInput,
  otpVerified,
  otpDelivery,
  onOtpDelivery,
  onOtpInput,
  onSendOtp,
  onVerifyOtp,
  onChange,
}: {
  form: OfflineBookingFormState;
  otpSent: boolean;
  otpInput: string;
  otpVerified: boolean;
  otpDelivery: "auto" | "email";
  onOtpDelivery: (channel: "auto" | "email") => void;
  onOtpInput: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onChange: <Key extends keyof OfflineBookingFormState>(key: Key, value: OfflineBookingFormState[Key]) => void;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex min-w-0 items-start gap-3 rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <Users className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--app-foreground)]">Customer verification</p>
          <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">
            Name and phone are required. Other details help counter staff verify the guest faster.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Customer name required"
          placeholder="Enter customer full name"
          value={form.customerName}
          onChange={(value) => onChange("customerName", value)}
        />
        <TextField
          label="Customer phone required"
          placeholder="Enter mobile number"
          value={form.customerPhone}
          onChange={(value) => onChange("customerPhone", value)}
        />
        <TextField
          label="WhatsApp number optional"
          placeholder="Enter WhatsApp number if different"
          value={form.whatsappPhone}
          onChange={(value) => onChange("whatsappPhone", value)}
        />
        <div className="grid gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <TextField
            label="Phone verification OTP"
            placeholder={otpSent ? "Enter OTP from WhatsApp or email" : "Send OTP first"}
            value={otpInput}
            onChange={onOtpInput}
          />
          <button type="button" onClick={onSendOtp} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-xs font-black">
            {otpSent ? "Resend OTP" : "Send OTP"}
          </button>
          <button type="button" onClick={onVerifyOtp} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white">
            {otpVerified ? "Verified" : "Verify"}
          </button>
          <p className={cn("text-xs font-black sm:col-span-3", otpVerified ? "text-[#15803D]" : "text-[var(--app-muted)]")}>
            {otpVerified ? "Customer phone number verified." : "Ticket can be issued only after phone OTP verification."}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:col-span-3">
            <button type="button" onClick={() => onOtpDelivery("auto")} className={cn("rounded-xl border px-3 py-2 text-xs font-black", otpDelivery === "auto" ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]" : "border-[var(--app-border)]")}>
              WhatsApp + email backup
            </button>
            <button type="button" onClick={() => onOtpDelivery("email")} className={cn("rounded-xl border px-3 py-2 text-xs font-black", otpDelivery === "email" ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]" : "border-[var(--app-border)]")}>
              Email directly
            </button>
          </div>
        </div>
        <TextField
          label="Customer email required"
          placeholder="Enter customer email for ticket delivery"
          value={form.customerEmail}
          onChange={(value) => onChange("customerEmail", value)}
        />
        <TextField
          label="Customer city optional"
          placeholder="Enter city name"
          value={form.customerCity}
          onChange={(value) => onChange("customerCity", value)}
        />
        <TextField
          label="ID proof / remark optional"
          placeholder="Enter ID proof, last 4 digits, or remark"
          value={form.idProof}
          onChange={(value) => onChange("idProof", value)}
        />
        <div className="sm:col-span-2">
          <TextAreaField
            label="Customer notes optional"
            placeholder="Add counter notes, accessibility request, or verification instruction"
            value={form.notes}
            onChange={(value) => onChange("notes", value)}
          />
        </div>
      </div>
    </section>
  );
}

function OfflinePaymentStep({
  form,
  totalAmount,
  amountCollected,
  balanceAmount,
  paymentStatus,
  onChange,
}: {
  form: OfflineBookingFormState;
  totalAmount: number;
  amountCollected: number;
  balanceAmount: number;
  paymentStatus: OfflinePaymentStatus;
  onChange: <Key extends keyof OfflineBookingFormState>(key: Key, value: OfflineBookingFormState[Key]) => void;
}) {
  const complimentary = form.paymentMode === "Complimentary" || form.source === "Complimentary";

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {paymentModes.map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={form.source === "Complimentary" && mode !== "Complimentary"}
            onClick={() => onChange("paymentMode", mode)}
            className={cn(
              "min-h-11 rounded-xl border px-3 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30 disabled:cursor-not-allowed disabled:opacity-45",
              form.paymentMode === mode ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white" : "border-[var(--app-border)] bg-[var(--app-subtle)]",
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Amount collected" placeholder="Enter amount collected" type="number" value={complimentary ? "0" : form.amountCollected} disabled={complimentary} onChange={(value) => onChange("amountCollected", value)} />
        <TextField label="Payment reference optional" placeholder="Enter UPI ID, card ref, or cash note" value={form.paymentReference} onChange={(value) => onChange("paymentReference", value)} />
        <TextField label="Counter staff name optional" placeholder="Enter staff name" value={form.counterStaff} onChange={(value) => onChange("counterStaff", value)} />
        <TextField label="Internal note optional" placeholder="Add internal counter note" value={form.internalNote} onChange={(value) => onChange("internalNote", value)} />
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:grid-cols-5">
        <MiniLine label="Ticket total" value={formatMoney(totalAmount, totalAmount <= 0)} />
        <MiniLine label="Amount collected" value={formatMoney(amountCollected, complimentary)} />
        <MiniLine label="Balance" value={formatMoney(balanceAmount, balanceAmount <= 0)} />
        <MiniLine label="Payment mode" value={form.paymentMode} />
        <MiniLine label="Payment status" value={paymentStatus} />
      </div>
    </div>
  );
}

function OfflineReviewStep({
  form,
  selectedEvent,
  selectedBlock,
  quantity,
  totalAmount,
  amountCollected,
  balanceAmount,
  paymentStatus,
}: {
  form: OfflineBookingFormState;
  selectedEvent: OrganizerEventOption | null;
  selectedBlock: OrganizerEventOption["blocks"][number] | null;
  quantity: number;
  totalAmount: number;
  amountCollected: number;
  balanceAmount: number;
  paymentStatus: OfflinePaymentStatus;
}) {
  if (!selectedEvent || !selectedBlock) return <EmptyStepMessage title="Review unavailable" detail="Select event and ticket details before reviewing." />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReviewSection title="Event Details" values={[["Event title", selectedEvent.title], ["Venue", `${selectedEvent.venueName}, ${selectedEvent.city}`], ["Date", form.scheduleDate || selectedEvent.date], ["Time", form.timeSlot || selectedEvent.time]]} />
      <ReviewSection title="Ticket Details" values={[["Block", selectedBlock.name], ["Source", form.source], ["Quantity", String(quantity)], ["Seat / Zone", formatSeatZoneLabel(form, selectedBlock)], ["Gate", form.gate || "Main Gate"], ["Price", formatMoney(form.source === "Complimentary" ? 0 : selectedBlock.price)], ["Total amount", formatMoney(totalAmount, form.source === "Complimentary")]]} />
      <ReviewSection title="Customer Details" values={[["Name", form.customerName], ["Phone", form.customerPhone], ["WhatsApp", form.whatsappPhone || form.customerPhone], ["Email", form.customerEmail || "Not provided"], ["ID / Remark", form.idProof || "Not provided"]]} />
      <ReviewSection title="Payment Details" values={[["Mode", form.paymentMode], ["Payment status", paymentStatus], ["Amount collected", formatMoney(amountCollected, form.paymentMode === "Complimentary")], ["Balance", formatMoney(balanceAmount, balanceAmount <= 0)]]} />
      <div className="lg:col-span-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
        <p className="text-sm font-black">Inventory Impact</p>
        <div className="mt-3 grid gap-2 text-sm font-semibold text-[var(--app-muted)]">
          <p>Offline source reduces offline counter inventory.</p>
          <p>Reserved and Complimentary source reduce reserved/VIP inventory.</p>
          <p>Online inventory is not reduced by this counter flow.</p>
        </div>
      </div>
    </div>
  );
}

function OfflineSuccessStep({
  booking,
  draft,
  content,
  onIssueAnother,
  onViewRecent,
  onDownload,
  onShare,
}: {
  booking: OfflineBookingRecord | null;
  draft: TicketDesignDraft;
  content: TicketPreviewContent;
  onIssueAnother: () => void;
  onViewRecent: () => void;
  onDownload: () => void;
  onShare: () => void;
}) {
  if (!booking) return <EmptyStepMessage title="Ticket not issued yet" detail="Confirm the review step to generate an offline ticket." />;
  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#15803D]" />
          <div className="min-w-0">
            <p className="text-lg font-black text-[#15803D]">Ticket issued successfully</p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">Status: Issued</p>
          </div>
        </div>
      </div>
      <div className="grid gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniLine label="Booking ID" value={booking.bookingId} />
        <MiniLine label="Ticket ID" value={booking.ticketId} />
        <MiniLine label="Receipt No" value={booking.receiptNo} />
        <MiniLine label="Customer" value={booking.customerName} />
        <MiniLine label="Event" value={booking.eventTitle} />
        <MiniLine label="Quantity" value={String(booking.quantity)} />
        <MiniLine label="Source" value={booking.source} />
        <MiniLine label="Payment status" value={booking.paymentStatus} />
        <MiniLine label="Amount collected" value={formatMoney(booking.amountCollected, booking.paymentMode === "Complimentary")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
        <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
          <BuizzTicketPreview design={draft} data={normalizePreviewData(draft, content)} mode="offline-issued" />
        </div>
        <div className="grid content-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
          <p className="text-sm font-black">Booking receipt summary</p>
          <MiniLine label="Ticket block" value={booking.ticketBlock} />
          <MiniLine label="Seat / Zone" value={booking.seatLabel || booking.zone || booking.ticketBlock} />
          <MiniLine label="Gate" value={booking.gate || "Main Gate"} />
          <MiniLine label="Venue" value={`${booking.venueName}, ${booking.city}`} />
          <MiniLine label="Balance" value={formatMoney(booking.balanceAmount, booking.balanceAmount <= 0)} />
          <MiniLine label="Collected by" value={booking.counterStaff || "Counter Staff"} />
          <MiniLine label="Issued time" value={formatUpdatedAt(booking.issuedAt)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionButton label="Issue Another Ticket" icon={<Copy className="size-4" />} onClick={onIssueAnother} primary />
        <ActionButton label="View Recent Bookings" icon={<ReceiptText className="size-4" />} onClick={onViewRecent} />
        <ActionButton label="Download Ticket" icon={<Download className="size-4" />} onClick={onDownload} />
        <ActionButton label="Share Ticket" icon={<Share2 className="size-4" />} onClick={onShare} />
      </div>
    </div>
  );
}

function OfflineStepActions({
  currentStep,
  disabled = false,
  disabledMessage = "",
  onPrevious,
  onNext,
  onConfirm,
  confirming = false,
}: {
  currentStep: OfflineBookingStepId;
  disabled?: boolean;
  disabledMessage?: string;
  onPrevious: () => void;
  onNext: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}) {
  const activeIndex = offlineBookingSteps.findIndex(
    (step) => step.id === currentStep,
  );
  const showPrevious = activeIndex > 0 && currentStep !== "success";
  const review = currentStep === "review";

  return (
    <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-4">
      {disabled && disabledMessage ? (
        <p className="rounded-2xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-4 py-3 text-xs font-black leading-5 text-[var(--color-brand-primary)]">
          {disabledMessage}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!showPrevious}
          onClick={onPrevious}
          className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-xs font-black text-[var(--app-foreground)] transition hover:bg-[var(--app-elevated)] disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:px-3 sm:text-sm"
        >
          <ChevronLeft className="size-4 shrink-0" />
          <span className="truncate">Previous</span>
        </button>

        <button
          type="button"
          disabled={disabled || confirming}
          title={disabledMessage || undefined}
          onClick={review ? onConfirm : onNext}
          className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-[var(--color-brand-primary)] px-2 text-xs font-black text-white shadow-[0_16px_34px_rgb(var(--brand-primary-rgb)/0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 sm:gap-2 sm:px-3 sm:text-sm"
        >
          <span className="truncate">{confirming ? "Issuing..." : review ? "Issue Ticket" : "Next"}</span>
          {review ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <ChevronRight className="size-4 shrink-0" />
          )}
        </button>
      </div>
    </div>
  );
}

function OfflineBookingSummary({
  currentStep,
  selectedEvent,
  selectedBlock,
  selectedSchedule,
  selectedSlot,
  form,
  quantity,
  totalAmount,
  paymentStatus,
  validationMessage,
}: {
  currentStep: OfflineBookingStepId;
  selectedEvent: OrganizerEventOption | null;
  selectedBlock: OrganizerEventOption["blocks"][number] | null;
  selectedSchedule: OrganizerEventOption["schedules"][number] | null;
  selectedSlot: OrganizerEventOption["schedules"][number]["timeSlots"][number] | null;
  form: OfflineBookingFormState;
  quantity: number;
  totalAmount: number;
  paymentStatus: OfflinePaymentStatus;
  validationMessage: string;
}) {
  const ready = !validationMessage;

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="border-b border-[var(--app-border)] bg-[var(--app-subtle)]/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              Live Booking Summary
            </p>
            <h2 className="mt-1 text-lg font-black">Counter preview</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
              This updates as the offline ticket flow progresses.
            </p>
          </div>
          <span className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[10px] font-black",
            ready ? "bg-[#22C55E]/10 text-[#15803D]" : "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]",
          )}>
            {ready ? "Ready" : "Pending"}
          </span>
        </div>
      </div>

      {selectedEvent ? (
        <div className="grid gap-3 p-4">
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
            <p className="break-words text-sm font-black text-[var(--app-foreground)]">{selectedEvent.title}</p>
            <p className="mt-1 break-words text-xs font-semibold text-[var(--app-muted)]">
              {selectedEvent.venueName}, {selectedEvent.city}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MiniLine label="Date" value={selectedSchedule?.date ?? form.scheduleDate ?? "Not selected"} boxed />
            <MiniLine label="Time" value={selectedSlot?.label ?? form.timeSlot ?? "Not selected"} boxed />
            <MiniLine label="Block" value={selectedBlock?.name ?? "Not selected"} boxed />
            <MiniLine label="Source" value={form.source} boxed />
            <MiniLine label="Qty" value={String(quantity)} boxed />
            <MiniLine label="Amount" value={formatMoney(totalAmount, totalAmount <= 0)} boxed />
          </div>

          {form.customerName ? <MiniLine label="Customer" value={form.customerName} boxed /> : null}
          {currentStep === "payment" || currentStep === "review" || currentStep === "success" ? (
            <MiniLine label="Payment status" value={paymentStatus} boxed />
          ) : null}

          <div className={cn(
            "rounded-2xl border p-3 text-xs font-black leading-5",
            validationMessage
              ? "border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
              : "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#15803D]",
          )}>
            {validationMessage || "Current step is ready."}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-semibold text-[var(--app-muted)]">
            Select an event to start the counter booking.
          </div>
        </div>
      )}
    </section>
  );
}

function RecentOfflineBookings({
  bookings,
  search,
  source,
  payment,
  selectedPreview,
  onSearch,
  onSource,
  onPayment,
  onPreview,
  onDownload,
  onShare,
  onPrint,
  onMarkPaid,
  onCancel,
}: {
  bookings: OfflineBookingRecord[];
  search: string;
  source: "All" | OfflineBookingRecord["source"];
  payment: "All" | OfflineBookingRecord["paymentMode"];
  selectedPreview: OfflineBookingRecord | null;
  onSearch: (value: string) => void;
  onSource: (value: "All" | OfflineBookingRecord["source"]) => void;
  onPayment: (value: "All" | OfflineBookingRecord["paymentMode"]) => void;
  onPreview: (booking: OfflineBookingRecord) => void;
  onDownload: () => void;
  onShare: (booking: OfflineBookingRecord) => void;
  onPrint: (booking: OfflineBookingRecord) => void;
  onMarkPaid: (booking: OfflineBookingRecord) => void;
  onCancel: (booking: OfflineBookingRecord) => void;
}) {
  const previewDraft = selectedPreview
    ? createTicketDesignDraft(selectedPreview.source === "Reserved" ? "reserved-vip-pass" : "offline-counter-ticket")
    : null;
  const previewContent = selectedPreview ? offlineBookingToPreviewContent(selectedPreview) : null;

  return (
    <section className="grid min-w-0 gap-4 overflow-hidden rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,640px)] xl:items-end">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
            Counter Records
          </p>
          <h2 className="mt-1 break-words text-xl font-black sm:text-2xl">
            Recent Offline Bookings
          </h2>
          <p className="mt-1 break-words text-sm font-semibold leading-6 text-[var(--app-muted)]">
            Local counter booking records saved in this browser.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="grid gap-1 text-[10px] font-black uppercase text-[var(--app-muted)]">
            Search
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search booking, customer, event..."
              className="min-h-11 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)]/65 focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]"
            />
          </label>

          <SelectField
            label="Source"
            value={source}
            options={["All", "Offline", "Reserved", "Complimentary"].map((value) => ({ value, label: value }))}
            onChange={(value) => onSource(value as "All" | OfflineBookingRecord["source"])}
          />

          <SelectField
            label="Payment"
            value={payment}
            options={["All", ...paymentModes].map((value) => ({ value, label: value }))}
            onChange={(value) => onPayment(value as "All" | OfflineBookingRecord["paymentMode"])}
          />
        </div>
      </div>

      <div className="grid gap-3 xl:hidden">
        {bookings.map((booking) => (
          <article
            key={`mobile-offline-${booking.id}`}
            className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all text-[10px] font-black uppercase text-[var(--color-brand-primary)]">
                  {booking.bookingId}
                </p>
                <h3 className="mt-1 break-words text-base font-black">
                  {booking.customerName}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                  {booking.eventTitle}
                </p>
              </div>

              <span className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[10px] font-black capitalize",
                booking.status === "cancelled"
                  ? "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                  : "bg-[#22C55E]/10 text-[#15803D]",
              )}>
                {booking.status}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniLine label="Block" value={booking.ticketBlock} boxed />
              <MiniLine label="Qty" value={String(booking.quantity)} boxed />
              <MiniLine label="Paid" value={formatMoney(booking.amountCollected, booking.paymentMode === "Complimentary")} boxed />
              <MiniLine label="Balance" value={formatMoney(booking.balanceAmount, booking.balanceAmount <= 0)} boxed />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[booking.source, booking.paymentMode, booking.paymentStatus].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-2.5 py-1 text-[10px] font-black text-[var(--app-muted)]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onPreview(booking)} className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black">
                Preview
              </button>
              <button type="button" onClick={() => onPrint(booking)} className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black">
                Print
              </button>
              <button type="button" disabled={booking.balanceAmount <= 0 || booking.status === "cancelled"} onClick={() => onMarkPaid(booking)} className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black disabled:opacity-40">
                Mark Paid
              </button>
              <button type="button" disabled={booking.status === "cancelled"} onClick={() => onCancel(booking)} className="min-h-10 rounded-xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-3 text-xs font-black text-[var(--color-brand-primary)] disabled:opacity-40">
                Cancel
              </button>
            </div>
          </article>
        ))}

        {!bookings.length ? (
          <p className="rounded-2xl border border-dashed border-[var(--app-border)] p-4 text-sm font-semibold text-[var(--app-muted)]">
            No offline bookings match these filters.
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-[var(--app-border)] xl:block">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-[var(--app-subtle)] text-[10px] uppercase text-[var(--app-muted)]">
            <tr>
              {["Booking ID", "Customer", "Event", "Block", "Qty", "Source", "Payment", "Paid", "Balance", "Status", "Issued", "Action"].map((header) => (
                <th key={header} className="border-b border-[var(--app-border)] px-3 py-3 font-black">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="align-top transition hover:bg-[var(--app-subtle)]">
                <td className="border-b border-[var(--app-border)] px-3 py-3 font-black">{booking.bookingId}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3">{booking.customerName}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3">{booking.eventTitle}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3">{booking.ticketBlock}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3">{booking.quantity}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3">{booking.source}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3">{booking.paymentMode}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3 font-black">{formatMoney(booking.amountCollected, booking.paymentMode === "Complimentary")}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3 font-black">{formatMoney(booking.balanceAmount, booking.balanceAmount <= 0)}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3 capitalize">{booking.status} / {booking.paymentStatus}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3">{formatUpdatedAt(booking.issuedAt)}</td>
                <td className="border-b border-[var(--app-border)] px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onPreview(booking)} className="min-h-9 rounded-xl border border-[var(--app-border)] px-3 text-xs font-black">Preview</button>
                    <button type="button" onClick={() => onPrint(booking)} className="min-h-9 rounded-xl border border-[var(--app-border)] px-3 text-xs font-black">Print</button>
                    <button type="button" disabled={booking.balanceAmount <= 0 || booking.status === "cancelled"} onClick={() => onMarkPaid(booking)} className="min-h-9 rounded-xl border border-[var(--app-border)] px-3 text-xs font-black disabled:opacity-40">Mark Paid</button>
                    <button type="button" disabled={booking.status === "cancelled"} onClick={() => onCancel(booking)} className="min-h-9 rounded-xl border border-[var(--app-border)] px-3 text-xs font-black text-[var(--color-brand-primary)] disabled:opacity-40">Cancel</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!bookings.length ? (
          <p className="m-3 rounded-2xl border border-dashed border-[var(--app-border)] p-4 text-sm font-semibold text-[var(--app-muted)]">
            No offline bookings match these filters.
          </p>
        ) : null}
      </div>

      {selectedPreview && previewDraft && previewContent ? (
        <div className="grid min-w-0 gap-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
          <BuizzTicketPreview design={previewDraft} data={normalizePreviewData(previewDraft, previewContent)} mode="offline-issued" />

          <div className="grid min-w-0 content-start gap-3 p-2">
            <p className="text-sm font-black">Selected ticket preview</p>
            <MiniLine label="Booking ID" value={selectedPreview.bookingId} boxed />
            <MiniLine label="Ticket ID" value={selectedPreview.ticketId} boxed />
            <MiniLine label="Customer" value={selectedPreview.customerName} boxed />
            <div className="flex flex-wrap gap-2">
              <ActionButton label="Download Ticket" icon={<Download className="size-4" />} onClick={onDownload} />
              <ActionButton label="Print Ticket" icon={<Printer className="size-4" />} onClick={() => onPrint(selectedPreview)} />
              <ActionButton label="Share Ticket" icon={<Share2 className="size-4" />} onClick={() => onShare(selectedPreview)} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function offlineBookingToPreviewContent(booking: OfflineBookingRecord): TicketPreviewContent {
  return createDefaultTicketContent(createTicketDesignDraft(booking.source === "Reserved" ? "reserved-vip-pass" : "offline-counter-ticket"), {
    eventTitle: booking.eventTitle,
    category: booking.category || (booking.source === "Reserved" ? "VIP" : "Music Events"),
    ticketType: booking.source === "Reserved" ? "reserved" : booking.source === "Complimentary" ? "free" : "offline",
    venueName: booking.venueName,
    city: booking.city,
    date: booking.date,
    time: booking.time,
    blockName: booking.ticketBlock,
    seatLabel: booking.seatLabel || booking.ticketBlock,
    amountPaid: booking.totalAmount || booking.amountCollected,
    source: booking.source === "Complimentary" ? "Free" : booking.source,
    status: booking.status === "cancelled" ? "Cancelled" : "Valid",
    bookingId: booking.bookingId,
    ticketId: booking.ticketId,
    organizerName: booking.source === "Reserved" ? "Reserved" : "Counter",
    customerName: booking.customerName,
    quantity: booking.quantity,
    paymentMode: booking.paymentMode,
    seats: [{ section: booking.zone || booking.ticketBlock, totalSeats: booking.quantity, seatNumbers: booking.seatLabel || "Counter issued", amount: booking.totalAmount || booking.amountCollected }],
  });
}

function InventoryMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
      <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 text-base font-black">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}

function SegmentedSourceControl({ value, onChange }: { value: OfflineBookingRecord["source"]; onChange: (value: OfflineBookingRecord["source"]) => void }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-black uppercase text-[var(--app-muted)]">Source selection</p>
      <div className="grid grid-cols-2 gap-2">
        {(["Offline", "Reserved", "Complimentary"] as OfflineBookingRecord["source"][]).map((source) => (
          <button
            key={source}
            type="button"
            onClick={() => onChange(source)}
            className={cn(
              "min-h-11 rounded-xl border px-3 text-sm font-black",
              value === source ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white" : "border-[var(--app-border)] bg-[var(--app-elevated)]",
            )}
          >
            {source}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuantityControl({ value, max, onChange }: { value: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-black uppercase text-[var(--app-muted)]">Quantity</p>
      <div className="grid min-h-11 grid-cols-[44px_minmax(0,1fr)_44px] overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)]">
        <button type="button" onClick={() => onChange(Math.max(value - 1, 1))} className="grid place-items-center border-r border-[var(--app-border)]"><Minus className="size-4" /></button>
        <input type="number" min={1} max={max} value={value} onChange={(event) => onChange(Number(event.target.value || 1))} className="min-w-0 bg-transparent text-center text-sm font-black outline-none" />
        <button type="button" onClick={() => onChange(Math.min(value + 1, Math.max(max, 1)))} className="grid place-items-center border-l border-[var(--app-border)]"><Plus className="size-4" /></button>
      </div>
      <p className="text-xs font-semibold text-[var(--app-muted)]">Available for selected source: {max}</p>
    </div>
  );
}

function ReviewSection({ title, values }: { title: string; values: Array<[string, string]> }) {
  return (
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <p className="text-sm font-black">{title}</p>
      <div className="mt-3 grid gap-3">
        {values.map(([label, value]) => <MiniLine key={label} label={label} value={value} />)}
      </div>
    </section>
  );
}

function EmptyStepMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--app-border)] p-5 text-sm">
      <p className="font-black">{title}</p>
      <p className="mt-2 font-semibold text-[var(--app-muted)]">{detail}</p>
    </div>
  );
}

function getAdjacentOfflineStep(currentStep: OfflineBookingStepId, direction: -1 | 1) {
  const currentIndex = offlineBookingSteps.findIndex((step) => step.id === currentStep);
  const next = offlineBookingSteps[currentIndex + direction];
  return next?.id;
}

function getSelectedSchedule(event: OrganizerEventOption | null, date: string) {
  if (!event) return null;
  return event.schedules.find((schedule) => schedule.date === date) ?? event.schedules[0] ?? null;
}

function getSelectedTimeSlot(
  schedule: OrganizerEventOption["schedules"][number] | null,
  time: string,
) {
  if (!schedule) return null;
  return schedule.timeSlots.find((slot) => slot.time === time) ?? schedule.timeSlots[0] ?? null;
}

function getAvailableInventory(block: OrganizerEventOption["blocks"][number] | null, source: OfflineBookingRecord["source"]) {
  if (!block) return 0;
  return source === "Offline" ? block.offlineQuantity : block.reservedQuantity;
}

function getOfflinePaymentStatus(
  totalAmount: number,
  amountCollected: number,
  paymentMode: OfflineBookingRecord["paymentMode"],
  source: OfflineBookingRecord["source"],
): OfflinePaymentStatus {
  if (source === "Complimentary" || paymentMode === "Complimentary") return "Complimentary";
  if (amountCollected >= totalAmount && totalAmount > 0) return "Paid";
  if (amountCollected > 0 && amountCollected < totalAmount) return "Partial Paid";
  return "Unpaid";
}

function formatSeatZoneLabel(
  form: Pick<OfflineBookingFormState, "seatLabel" | "zone" | "gate" | "selectedSeats">,
  block: OrganizerEventOption["blocks"][number] | null,
) {
  const seatValue = form.selectedSeats.length
    ? form.selectedSeats.join(", ")
    : form.seatLabel;

  const values = [form.zone, seatValue, form.gate].filter((value) => value.trim());

  return values.length ? values.join(" / ") : block?.name ?? "Counter issued";
}

function sanitizeQuantity(value: number) {
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(Math.floor(next), 0) : 0;
}

function getOfflineBookingValidation(
  step: OfflineBookingStepId,
  form: OfflineBookingFormState,
  selectedEvent: OrganizerEventOption | null,
  selectedBlock: OrganizerEventOption["blocks"][number] | null,
  quantity: number,
  inventoryLimit: number,
  amountCollected: number,
  totalAmount: number,
): string {
  if (step === "event") {
    return selectedEvent ? "" : "Select an event before continuing.";
  }
  if (step === "schedule") {
    if (!selectedEvent) return "Select an event before choosing date and time.";
    if (!form.scheduleDate) return "Select booking date.";
    if (!form.timeSlot) return "Select booking time slot.";
  }
  if (step === "source") {
    if (!form.source) return "Select Offline, Reserved, or Complimentary source.";
  }
  if (step === "ticket") {
    if (!selectedEvent) return "Select an event before choosing tickets.";
    if (!selectedBlock) return "Select a ticket block.";
    if (!form.source) return "Select Offline, Reserved, or Complimentary source.";
    if (form.seatMode === "seat-map" && form.selectedSeats.length <= 0) {
      return "Select at least one seat from the counter seat map.";
    }

    if (quantity <= 0) return "Quantity must be greater than 0.";
    if (quantity > selectedBlock.maxPerBooking) return `Maximum allowed quantity is ${selectedBlock.maxPerBooking}.`;
    if (quantity > inventoryLimit) return `${form.source} inventory has only ${inventoryLimit} tickets available.`;
  }
  if (step === "customer") {
    if (!form.customerName.trim()) return "Customer name is required.";
    if (!form.customerPhone.trim()) return "Customer phone is required.";
    if (!form.customerEmail.trim()) return "Customer email is required.";
  }
  if (step === "payment") {
    if (!form.paymentMode) return "Payment mode is required.";
    if (form.source !== "Complimentary" && form.paymentMode !== "Complimentary" && form.amountCollected.trim() === "") return "Amount collected is required unless complimentary.";
    if (!Number.isFinite(amountCollected) || amountCollected < 0) return "Amount collected cannot be negative.";
    if (form.source !== "Complimentary" && amountCollected < totalAmount) return "Collect full payment before generating the ticket.";
    if ((form.paymentMode === "UPI" || form.paymentMode === "Razorpay") && !form.paymentReference.trim()) return "Payment reference is required for UPI/Razorpay bookings.";
  }
  if (step === "review") {
    return getOfflineBookingValidation("event", form, selectedEvent, selectedBlock, quantity, inventoryLimit, amountCollected, totalAmount)
      || getOfflineBookingValidation("schedule", form, selectedEvent, selectedBlock, quantity, inventoryLimit, amountCollected, totalAmount)
      || getOfflineBookingValidation("source", form, selectedEvent, selectedBlock, quantity, inventoryLimit, amountCollected, totalAmount)
      || getOfflineBookingValidation("ticket", form, selectedEvent, selectedBlock, quantity, inventoryLimit, amountCollected, totalAmount)
      || getOfflineBookingValidation("customer", form, selectedEvent, selectedBlock, quantity, inventoryLimit, amountCollected, totalAmount)
      || getOfflineBookingValidation("payment", form, selectedEvent, selectedBlock, quantity, inventoryLimit, amountCollected, totalAmount);
  }
  return "";
}

function createOfflineTicketCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}
function readOrganizerStorageEventOptions(): OrganizerEventOption[] {
  const storageCandidates = ["buizz-organizer-events-v2", "buizz-organizer-events"];

  for (const key of storageCandidates) {
    const saved = readArrayStorage<Record<string, unknown>>(key)
      .map((event) => {
        const venues = Array.isArray(event.venues)
          ? (event.venues as Array<Record<string, unknown>>)
          : [];

        const venue = venues[0] ?? {};
        const schedules = Array.isArray(venue.schedules)
          ? (venue.schedules as Array<Record<string, unknown>>)
          : [];

        const schedule = schedules[0] ?? {};
        const slots = Array.isArray(schedule.timeSlots)
          ? (schedule.timeSlots as Array<Record<string, unknown>>)
          : [];

        const normalizedSchedules = schedules.length
          ? schedules.map((scheduleItem, scheduleIndex) => {
            const scheduleSlots = Array.isArray(scheduleItem.timeSlots)
              ? (scheduleItem.timeSlots as Array<Record<string, unknown>>)
              : [];

            return {
              id: String(scheduleItem.id ?? `schedule-${scheduleIndex}`),
              date: String(scheduleItem.date ?? "Date pending"),
              timeSlots: (scheduleSlots.length ? scheduleSlots : [{ id: "slot-0", startTime: "Time pending" }]).map((slotItem, slotIndex) => ({
                id: String(slotItem.id ?? `slot-${slotIndex}`),
                time: String(slotItem.startTime ?? slotItem.time ?? "Time pending"),
                label: String(slotItem.label ?? slotItem.startTime ?? slotItem.time ?? "Time pending"),
              })),
            };
          })
          : [
            {
              id: "schedule-0",
              date: String(schedule.date ?? "Date pending"),
              timeSlots: [{ id: "slot-0", time: String(slots[0]?.startTime ?? "Time pending"), label: String(slots[0]?.startTime ?? "Time pending") }],
            },
          ];

        const slot = slots[0] ?? {};
        const blocks = Array.isArray(event.ticketBlocks)
          ? (event.ticketBlocks as Array<Record<string, unknown>>)
          : [];

        if (!event.id || !event.title || !blocks.length) return null;

        const backendEventId = Number(event.backendEventId ?? event.eventId ?? event.id) || undefined;
        const option: OrganizerEventOption = {
          id: String(event.id),
          ...(backendEventId ? { backendEventId } : {}),
          title: String(event.title),
          category: String(event.category ?? "Music Events"),
          venueName: String(venue.venueName ?? venue.name ?? "Venue pending"),
          city: String(venue.city ?? "City pending"),
          date: String(schedule.date ?? "Date pending"),
          time: String(slot.startTime ?? "Time pending"),
          status: String(event.publicationStatus ?? event.approvalStatus ?? event.status ?? "Published / Approved"),
          schedules: normalizedSchedules,
          blocks: blocks.map((block, index) => ({
            id: String(block.blockId ?? block.id ?? `block-${index}`),
            ...(Number(block.id ?? block.ticketTypeId ?? block.ticket_type_id) ? { backendTicketTypeId: Number(block.id ?? block.ticketTypeId ?? block.ticket_type_id) } : {}),
            name: String(block.name ?? "Entry Pass"),
            price: toOfflineNumber(block.price, 0),
            offlineQuantity: toOfflineNumber(block.offlineQuantity, 0),
            reservedQuantity: toOfflineNumber(block.reservedQuantity, 0),
            soldOffline: toOfflineNumber(block.soldOffline, 0),
            soldReserved: toOfflineNumber(block.soldReserved, 0),
            maxPerBooking: Math.max(toOfflineNumber(block.maxPerBooking, 10), 1),
          })),
        };
        return option;
      })
      .filter((event): event is OrganizerEventOption => Boolean(event));

    if (saved.length) return saved;
  }

  return [];
}

function unifiedEventToOrganizerEventOption(event: UnifiedBuizzEvent): OrganizerEventOption | null {
  const candidate = event as UnifiedBuizzEvent & Record<string, unknown>;

  if (event.status !== "approved" && event.status !== "published") return null;

  const priceMin = toOfflineNumber(candidate.priceMin, 499);
  const capacity = toOfflineNumber(candidate.capacity, 100);

  return {
    id: String(event.id),
    backendEventId: Number(candidate.backendEventId ?? candidate.eventId ?? event.id) || undefined,
    title: String(event.title || "Untitled Event"),
    category: String(event.subCategory || event.category || "Event"),
    venueName: String(event.venueName || "Venue pending"),
    city: String(event.city || "Pune"),
    date: String(event.date || "Date pending"),
    time: String(event.time || "Time pending"),
    status: event.status === "published" ? "Published" : "Approved",
    schedules: buildOfflineSchedulesFromUnknown(candidate.schedules ?? candidate.venues, String(event.date || "Date pending"), String(event.time || "Time pending")),
    blocks: buildOfflineBlocksFromUnknown(
      candidate.ticketBlocks ?? candidate.tickets ?? candidate.ticketTypes,
      priceMin,
      capacity,
    ),
  };
}

function buildOfflineSchedulesFromUnknown(
  value: unknown,
  fallbackDate: string,
  fallbackTime: string,
): OrganizerEventOption["schedules"] {
  if (Array.isArray(value) && value.length) {
    const schedules = value.flatMap((item, itemIndex) => {
      if (!item || typeof item !== "object") return [];

      const candidate = item as Record<string, unknown>;
      const nestedSchedules = Array.isArray(candidate.schedules)
        ? (candidate.schedules as Array<Record<string, unknown>>)
        : [candidate];

      return nestedSchedules.map((schedule, scheduleIndex) => {
        const slots = Array.isArray(schedule.timeSlots)
          ? (schedule.timeSlots as Array<Record<string, unknown>>)
          : Array.isArray(schedule.slots)
            ? (schedule.slots as Array<Record<string, unknown>>)
            : [];

        return {
          id: String(schedule.id ?? `schedule-${itemIndex}-${scheduleIndex}`),
          date: String(schedule.date ?? fallbackDate),
          timeSlots: (slots.length ? slots : [{ id: "slot-0", startTime: schedule.time ?? fallbackTime }]).map((slot, slotIndex) => ({
            id: String(slot.id ?? `slot-${slotIndex}`),
            time: String(slot.startTime ?? slot.time ?? fallbackTime),
            label: String(slot.label ?? slot.startTime ?? slot.time ?? fallbackTime),
          })),
        };
      });
    });

    if (schedules.length) return schedules;
  }

  return [
    {
      id: "schedule-0",
      date: fallbackDate,
      timeSlots: [{ id: "slot-0", time: fallbackTime, label: fallbackTime }],
    },
  ];
}

function buildOfflineBlocksFromUnknown(
  value: unknown,
  fallbackPrice: number,
  fallbackCapacity: number,
): OrganizerEventOption["blocks"] {
  if (!Array.isArray(value) || !value.length) {
    return createFallbackOfflineBlocks(fallbackPrice, fallbackCapacity);
  }

  const blocks = value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;

      const block = item as Record<string, unknown>;
      const price = toOfflineNumber(
        block.price ?? block.amount ?? block.pricePerTicket,
        fallbackPrice,
      );

      const quantity = toOfflineNumber(
        block.offlineQuantity ?? block.quantity ?? block.capacity ?? block.totalSeats,
        Math.max(Math.floor(fallbackCapacity / value.length), 20),
      );

      const backendTicketTypeId = Number(block.id ?? block.ticketTypeId ?? block.ticket_type_id) || undefined;
      const normalizedBlock: OrganizerEventOption["blocks"][number] = {
        id: String(block.id ?? block.blockId ?? `block-${index}`),
        ...(backendTicketTypeId ? { backendTicketTypeId } : {}),
        name: String(block.name ?? block.label ?? block.type ?? `Ticket ${index + 1}`),
        price,
        offlineQuantity: Math.max(quantity, 0),
        reservedQuantity: Math.max(toOfflineNumber(block.reservedQuantity, Math.ceil(quantity * 0.2)), 0),
        soldOffline: Math.max(toOfflineNumber(block.soldOffline, 0), 0),
        soldReserved: Math.max(toOfflineNumber(block.soldReserved, 0), 0),
        maxPerBooking: Math.max(toOfflineNumber(block.maxPerBooking, 10), 1),
      };
      return normalizedBlock;
    })
    .filter((block): block is OrganizerEventOption["blocks"][number] => Boolean(block));

  return blocks.length ? blocks : createFallbackOfflineBlocks(fallbackPrice, fallbackCapacity);
}

function createFallbackOfflineBlocks(
  fallbackPrice: number,
  fallbackCapacity: number,
): OrganizerEventOption["blocks"] {
  const safePrice = Math.max(fallbackPrice, 0);
  const safeCapacity = Math.max(fallbackCapacity, 60);

  return [
    {
      id: "general",
      name: "General",
      price: safePrice || 499,
      offlineQuantity: Math.max(Math.floor(safeCapacity * 0.25), 20),
      reservedQuantity: Math.max(Math.floor(safeCapacity * 0.08), 5),
      soldOffline: 0,
      soldReserved: 0,
      maxPerBooking: 10,
    },
    {
      id: "premium",
      name: "Premium",
      price: safePrice ? safePrice + 500 : 999,
      offlineQuantity: Math.max(Math.floor(safeCapacity * 0.15), 10),
      reservedQuantity: Math.max(Math.floor(safeCapacity * 0.05), 5),
      soldOffline: 0,
      soldReserved: 0,
      maxPerBooking: 8,
    },
  ];
}

function mergeOrganizerEventOptions(events: OrganizerEventOption[]) {
  const map = new Map<string, OrganizerEventOption>();

  events.forEach((event) => {
    if (!map.has(event.id)) {
      map.set(event.id, event);
    }
  });

  return Array.from(map.values());
}

function toOfflineNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function loadOrganizerEventOptions(): OrganizerEventOption[] {
  if (typeof window === "undefined") return [];

  const unifiedEvents = readUnifiedEvents()
    .filter((event) => event.status === "approved" || event.status === "published")
    .map(unifiedEventToOrganizerEventOption)
    .filter((event): event is OrganizerEventOption => Boolean(event));

  const organizerEvents = readOrganizerStorageEventOptions();

  const mergedEvents = mergeOrganizerEventOptions([
    ...unifiedEvents,
    ...organizerEvents,
  ]);

  return mergedEvents;
}

function normalizePreviewData(design: TicketDesignDraft, data: TicketPreviewData | TicketPreviewContent): TicketPreviewData {
  const extended = data as TicketPreviewContent;
  return {
    eventTitle: data.eventTitle || extended.title || "",
    category: data.category || "",
    ticketType: data.ticketType || design.ticketType,
    organizerName: data.organizerName || "Organizer",
    organizerLogoUrl: data.organizerLogoUrl || design.organizerLogoUrl,
    bannerImageUrl: data.bannerImageUrl || design.backgroundImageUrl,
    venueName: data.venueName || extended.venue || "Mahalaxmi Lawns",
    city: data.city || "Pune",
    date: data.date || "19 Jun 2026",
    time: data.time || "08:30 PM",
    bookingId: data.bookingId || "BUIZZ-ARIJ-MQKP38AA-J3FFF",
    ticketId: data.ticketId || "TKT-BUIZZ-24086",
    source: data.source || (design.ticketType === "free" ? "Free" : design.ticketType === "offline" ? "Offline" : design.ticketType === "reserved" ? "Reserved" : "Online"),
    status: data.status || "Valid",
    blockName: data.blockName || extended.block || "Right",
    seatLabel: data.seatLabel || extended.seatOrZone || "C1, C11",
    quantity: Number(data.quantity || 1),
    customerName: data.customerName,
    paymentMode: data.paymentMode,
    amountPaid: Number(data.amountPaid ?? extended.amountCollected ?? extended.price ?? 0),
    seats: Array.isArray(data.seats) ? data.seats : [],
  };
}

function shouldRenderElement(element: TicketLayoutElement, design: TicketDesignDraft) {
  if (element.type === "logo" && !design.showLogo && !element.locked) return false;
  if (element.type === "terms" && !design.showTerms) return false;
  if (element.type === "actions" && !design.showActions) return false;
  if ((element.type === "seatsTable" || element.type === "seatCount") && !design.showSeatOrZone && !element.locked) return false;
  if (element.type === "totalAmount" && !design.showPrice) return false;
  return true;
}

function updateLayoutElement(elements: TicketLayoutElement[], id: string, patch: Partial<TicketLayoutElement>) {
  return normalizeLayoutElements(elements).map((element) => {
    if (element.id !== id) return element;
    const nextVisible = element.locked && patch.visible === false ? true : patch.visible;
    return {
      ...element,
      ...patch,
      visible: nextVisible ?? element.visible,
      locked: element.locked,
      x: roundLayout(clamp(patch.x ?? element.x, 0, 100 - (patch.w ?? element.w))),
      y: roundLayout(clamp(patch.y ?? element.y, 0, 100 - (patch.h ?? element.h))),
      w: roundLayout(clamp(patch.w ?? element.w, 4, 100 - (patch.x ?? element.x))),
      h: roundLayout(clamp(patch.h ?? element.h, 2, 100 - (patch.y ?? element.y))),
    };
  });
}

function normalizeLayoutElements(elements: TicketLayoutElement[] | undefined) {
  const defaults = createDefaultLayoutElements();
  if (!Array.isArray(elements) || !elements.length) return defaults;
  const current = new Map(elements.filter(isTicketLayoutElement).map((element) => [element.id, element]));
  return defaults.map((base) => {
    const saved = current.get(base.id);
    return saved ? { ...base, ...saved, locked: base.locked } : base;
  });
}

function LayersList({
  elements,
  selectedElementId,
  onSelect,
  onUpdate,
  onChange,
}: {
  elements: TicketLayoutElement[];
  selectedElementId: string;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<TicketLayoutElement>) => void;
  onChange: (elements: TicketLayoutElement[]) => void;
}) {
  const move = (id: string, direction: -1 | 1) => {
    const index = elements.findIndex((element) => element.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= elements.length) return;
    const next = [...elements];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(nextIndex, 0, moved);
    onChange(next.map((element, orderIndex) => ({ ...element, zIndex: 10 + orderIndex })));
  };

  return (
    <div className="grid gap-2">
      {elements.map((element, index) => (
        <div key={element.id} className={cn("grid gap-2 rounded-2xl border p-3", selectedElementId === element.id ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10" : "border-[var(--app-border)] bg-[var(--app-subtle)]")}>
          <button type="button" onClick={() => onSelect(element.id)} className="flex items-center justify-between gap-3 text-left text-xs font-black">
            <span>{element.label}</span>
            {element.locked ? <Lock className="size-4 text-[var(--app-muted)]" /> : <Unlock className="size-4 text-[var(--app-muted)]" />}
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={element.locked} onClick={() => onUpdate(element.id, { visible: !element.visible })} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--app-border)] px-2 text-[11px] font-black disabled:opacity-40">
              {element.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
              Eye
            </button>
            <button type="button" disabled={index === 0} onClick={() => move(element.id, -1)} className="min-h-8 rounded-lg border border-[var(--app-border)] px-2 text-[11px] font-black disabled:opacity-40">Up</button>
            <button type="button" disabled={index === elements.length - 1} onClick={() => move(element.id, 1)} className="min-h-8 rounded-lg border border-[var(--app-border)] px-2 text-[11px] font-black disabled:opacity-40">Down</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ElementInspector({ element, onChange, onReset }: { element: TicketLayoutElement; onChange: (patch: Partial<TicketLayoutElement>) => void; onReset: () => void }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black">{element.label}</p>
        {element.locked ? <span className="rounded-full bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">Locked</span> : null}
      </div>
      {!element.locked ? <ToggleControl label="Visible" checked={element.visible} onToggle={() => onChange({ visible: !element.visible })} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="X" value={element.x} onChange={(value) => onChange({ x: value })} />
        <NumberField label="Y" value={element.y} onChange={(value) => onChange({ y: value })} />
        <NumberField label="Width" value={element.w} onChange={(value) => onChange({ w: value })} />
        <NumberField label="Height" value={element.h} onChange={(value) => onChange({ h: value })} />
        <NumberField label="Font size" value={element.fontSize ?? 12} onChange={(value) => onChange({ fontSize: value })} />
        <NumberField label="Layer" value={element.zIndex} onChange={(value) => onChange({ zIndex: value })} />
      </div>
      <ColorField label="Text color" value={element.color || "#ffffff"} onChange={(value) => onChange({ color: value })} />
      <button type="button" onClick={onReset} className="min-h-10 rounded-xl border border-[var(--app-border)] px-3 text-xs font-black">Reset position</button>
    </div>
  );
}

function SeatsTable({ data, showPrice, isFree }: { data: TicketPreviewData; showPrice: boolean; isFree: boolean }) {
  const rows = data.seats.length ? data.seats : [{ section: data.blockName, totalSeats: data.quantity, seatNumbers: data.seatLabel ?? "-", amount: data.amountPaid }];
  return (
    <div className="min-w-0">
      <p className="text-sm font-black uppercase tracking-wide text-[var(--ticket-accent)]">Your Seats</p>
      <div className="mt-3 overflow-hidden rounded-[1.2rem] border border-white/12">
        <table className="w-full table-fixed border-collapse text-left text-[11px] text-white [&_tbody_td:first-child]:text-[#9d4dff] [&_tbody_td:first-child]:before:mr-1 [&_tbody_td:first-child]:before:inline-block [&_tbody_td:first-child]:before:size-2.5 [&_tbody_td:first-child]:before:rounded-full [&_tbody_td:first-child]:before:bg-[#9d4dff] [&_tbody_td:first-child_span]:hidden">
          <thead className="bg-white/7 text-[10px] uppercase">
            <tr>
              <th className="w-[28%] px-2 py-3 font-black">Section</th>
              <th className="w-[18%] px-2 py-3 font-black">Total Seats</th>
              <th className="w-[28%] px-2 py-3 font-black">Seat Numbers</th>
              <th className="px-2 py-3 font-black">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((seat) => (
              <tr key={`${seat.section}-${seat.seatNumbers}`} className="border-t border-white/10">
                <td className="break-words px-2 py-3 font-black text-[#8a35ff]">{seat.section}</td>
                <td className="px-2 py-3 font-black">{seat.totalSeats}</td>
                <td className="break-words px-2 py-3 font-black text-[#9d4dff]">{seat.seatNumbers}</td>
                <td className="break-words px-2 py-3 font-black">{showPrice ? formatMoney(seat.amount, isFree) : "Hidden"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetaLine({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return (
    <span className="flex h-full min-w-0 items-center gap-2 text-xs font-black text-white">
      <Icon className="size-4 shrink-0 text-[var(--ticket-accent)]" />
      <span className="min-w-0 break-words">{value}</span>
    </span>
  );
}

function BodyLine({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return (
    <span className="flex h-full min-w-0 items-center gap-2 text-sm font-black text-white">
      <Icon className={cn("size-4 shrink-0 text-[var(--ticket-accent)]", Icon === Star && "fill-[var(--ticket-accent)]")} />
      <span className="min-w-0 truncate">{value}</span>
    </span>
  );
}

function EditorPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
      <h2 className="mb-4 text-sm font-black">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const autoPlaceholder =
    placeholder ??
    `Enter ${label.replace(/required|optional/gi, "").replace(/\s+/g, " ").trim().toLowerCase() || "value"}`;

  return (
    <label className="grid min-w-0 gap-2 text-[11px] font-black uppercase tracking-[0.04em] text-[var(--app-muted)]">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={autoPlaceholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)]/60 focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[52px]"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <TextField label={label} type="number" value={String(value)} onChange={(next) => onChange(Number(next || 0))} />;
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const autoPlaceholder =
    placeholder ??
    `Add ${label.replace(/required|optional/gi, "").replace(/\s+/g, " ").trim().toLowerCase() || "details"}`;

  return (
    <label className="grid min-w-0 gap-2 text-[11px] font-black uppercase tracking-[0.04em] text-[var(--app-muted)]">
      {label}
      <textarea
        value={value}
        placeholder={autoPlaceholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 w-full min-w-0 resize-none rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-semibold normal-case leading-6 text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)]/60 focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] focus:ring-2 focus:ring-[var(--color-brand-primary)]/20"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
      {label}
      <span className="grid grid-cols-[52px_minmax(0,1fr)] gap-2">
        <input type="color" value={normalizeHexColor(value)} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-1" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]" />
      </span>
    </label>
  );
}

function ToggleControl({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-left text-sm font-black focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30">
      <span>{label}</span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-[#22C55E]" : "bg-[var(--app-muted)]")}>
        <span className={cn("absolute top-1 size-4 rounded-full bg-white transition", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase tracking-[0.04em] text-[var(--app-muted)]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 sm:min-h-[52px]">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ActionButton({ label, icon, onClick, primary = false, disabled = false }: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30 disabled:cursor-not-allowed disabled:opacity-50", primary ? "bg-[var(--color-brand-primary)] text-white" : "border border-[var(--app-border)] bg-[var(--app-subtle)]")}>
      {icon}
      {label}
    </button>
  );
}

function TicketAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border border-[var(--ticket-accent)]/45 bg-white/[0.03] px-2 text-sm font-semibold text-[var(--ticket-accent)] transition hover:bg-[var(--ticket-accent)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--ticket-accent)]/40 sm:text-base">
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function TicketDivider() {
  return (
    <div className="relative h-full">
      <span className="absolute left-0 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--ticket-accent)] bg-[var(--app-background,#f4f4f5)]" />
      <span className="absolute right-0 top-1/2 size-9 -translate-y-1/2 translate-x-1/2 rounded-full border border-[var(--ticket-accent)] bg-[var(--app-background,#f4f4f5)]" />
      <span className="absolute left-0 right-0 top-1/2 border-t border-dashed border-[var(--ticket-accent)]" />
    </div>
  );
}

function QrBlock() {
  return (
    <div className="grid size-[108px] place-items-center rounded-[1.45rem] border border-[var(--ticket-accent)]/45 bg-white p-4 text-slate-950 shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
      <div className="grid size-full grid-cols-11 gap-[2px]">
        {Array.from({ length: 121 }).map((_, index) => (
          <span key={index} className={cn("rounded-[1px]", isQrDotDark(index) ? "bg-slate-950" : "bg-slate-200")} />
        ))}
      </div>
    </div>
  );
}

function isQrDotDark(index: number) {
  const row = Math.floor(index / 11);
  const column = index % 11;
  const finder =
    (row <= 2 && column <= 2) ||
    (row <= 2 && column >= 8) ||
    (row >= 8 && column <= 2);

  return finder || (row * 3 + column * 5 + row * column) % 4 === 0 || (row + column) % 7 === 0;
}

function MiniLine({ label, value, boxed = false }: { label: string; value: string; boxed?: boolean }) {
  const content = (
    <>
      <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-[var(--app-foreground)]">{value}</p>
    </>
  );

  if (boxed) {
    return (
      <div className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
        {content}
      </div>
    );
  }

  return <div className="min-w-0">{content}</div>;
}

function PreviewModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-3xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--app-border)] px-4 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30">Close</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function formatHeroDate(value: string) {
  if (!value || value.includes(",")) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
}

function formatMoney(value: number, free = false) {
  if (free || value <= 0) return "FREE";
  return `\u20b9${value.toLocaleString("en-IN")}`;
}

function formatUpdatedAt(value: string) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not saved yet";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AS";
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

function normalizeHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#08000d";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundLayout(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeTicketDesignDraft(value: unknown): TicketDesignDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TicketDesignDraft> & { blockOrder?: unknown };
  if (!candidate.templateId || !candidate.templateName || !candidate.ticketType) return null;
  return {
    ...createTicketDesignDraft(candidate.templateId),
    ...candidate,
    layoutElements: normalizeLayoutElements(candidate.layoutElements),
    lockedFields: Array.isArray(candidate.lockedFields) ? candidate.lockedFields : [...lockedFieldKeys],
    updatedAt: String(candidate.updatedAt ?? new Date().toISOString()),
  };
}

function isTicketLayoutElement(value: unknown): value is TicketLayoutElement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TicketLayoutElement>;
  return Boolean(candidate.id && candidate.type && candidate.label && typeof candidate.x === "number" && typeof candidate.y === "number");
}

function normalizeOfflineBookingRecord(value: unknown): OfflineBookingRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<OfflineBookingRecord>;
  if (!candidate.bookingId && !candidate.ticketId && !candidate.customerName) return null;
  const source: OfflineBookingSource =
    candidate.source === "Reserved"
      ? "Reserved"
      : candidate.source === "Complimentary"
        ? "Complimentary"
        : "Offline";
  const paymentMode = paymentModes.includes(candidate.paymentMode as OfflineBookingRecord["paymentMode"])
    ? candidate.paymentMode as OfflineBookingRecord["paymentMode"]
    : source === "Complimentary"
      ? "Complimentary"
      : "Cash";
  const quantity = Number(candidate.quantity ?? 1);
  const amountCollected = Number(candidate.amountCollected ?? 0);
  const totalAmount = Number(candidate.totalAmount ?? amountCollected);
  const normalizedPaymentStatus = getOfflinePaymentStatus(totalAmount, amountCollected, paymentMode, source);
  const bookingId = String(candidate.bookingId ?? `BUIZZ-OFF-${createOfflineTicketCode()}`);
  const ticketId = String(candidate.ticketId ?? `TKT-OFF-${createOfflineTicketCode()}`);

  return {
    id: String(candidate.id ?? `offline-${bookingId ?? Date.now()}`),
    bookingId,
    ticketId,
    receiptNo: String(candidate.receiptNo ?? `RCPT-${bookingId.replace("BUIZZ-", "")}`),
    eventId: String(candidate.eventId ?? "legacy-event"),
    eventTitle: String(candidate.eventTitle ?? "Offline Event"),
    category: String(candidate.category ?? "Music Events"),
    venueName: String(candidate.venueName ?? "Venue pending"),
    city: String(candidate.city ?? "City pending"),
    date: String(candidate.date ?? ""),
    time: String(candidate.time ?? ""),
    ticketBlock: String(candidate.ticketBlock ?? "Counter Pass"),
    seatLabel: String(candidate.seatLabel ?? candidate.ticketBlock ?? "Counter issued"),
    zone: String(candidate.zone ?? candidate.ticketBlock ?? "Counter"),
    gate: String(candidate.gate ?? "Main Gate"),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    pricePerTicket: Number(candidate.pricePerTicket ?? (quantity ? Math.round(totalAmount / quantity) : totalAmount)),
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : amountCollected,
    customerName: String(candidate.customerName ?? "Counter Customer"),
    customerPhone: String(candidate.customerPhone ?? ""),
    whatsappPhone: candidate.whatsappPhone ? String(candidate.whatsappPhone) : undefined,
    customerEmail: candidate.customerEmail ? String(candidate.customerEmail) : undefined,
    customerCity: candidate.customerCity ? String(candidate.customerCity) : undefined,
    idProof: candidate.idProof ? String(candidate.idProof) : undefined,
    source,
    paymentMode,
    paymentStatus: candidate.paymentStatus ?? normalizedPaymentStatus,
    amountCollected: Number.isFinite(amountCollected) ? amountCollected : 0,
    balanceAmount: Number(candidate.balanceAmount ?? Math.max(totalAmount - amountCollected, 0)),
    paymentReference: candidate.paymentReference ? String(candidate.paymentReference) : undefined,
    counterStaff: candidate.counterStaff ? String(candidate.counterStaff) : undefined,
    notes: String(candidate.notes ?? ""),
    qrPayload: String(candidate.qrPayload ?? JSON.stringify({ bookingId, ticketId, source, status: candidate.status ?? "issued" })),
    status: candidate.status === "cancelled" ? "cancelled" : "issued",
    issuedAt: String(candidate.issuedAt ?? new Date().toISOString()),
    cancelledAt: candidate.cancelledAt ? String(candidate.cancelledAt) : undefined,
  };
}

function readUnknownArray(key: string): unknown[] {
  const value = readStorage<unknown>(key, []);
  return Array.isArray(value) ? value : [];
}

function readArrayStorage<T>(key: string): T[] {
  return readUnknownArray(key) as T[];
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
