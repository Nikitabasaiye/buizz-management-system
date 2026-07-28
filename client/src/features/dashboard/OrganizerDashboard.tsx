"use client";

import {
  AlertCircle,
  BarChart3,
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  HeadphonesIcon,
  Landmark,
  Megaphone,
  PlusCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Star,
  Send,
  Ticket,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SeatMapBuilderPage } from "@/features/seat-map";
import type { SelectedSeatData } from "@/features/seat-map/seatMapTypes";
import {
  OrganizerCreateEventFlow,
  OrganizerSettingsPageContent,
} from "@/features/organizer/create-event";
import { getRoleSession } from "@/features/auth/authSession";
import {
  BuizzTicketPreview,
  OrganizerOfflineBookingPage,
  createDefaultTicketContent,
  createTicketDesignDraft,
  readOfflineBookings,
  type OfflineBookingRecord,
} from "@/features/tickets/organizerTicketDesignSystem";
import {
  LEGACY_ORGANIZER_EVENTS_STORAGE_KEY,
  createOrganizerSummaryFromEvent,
  loadPhase3EventsFromStorage,
  savePhase3EventToStorage,
  type EventApprovalBlockers,
} from "@/features/events";
import {
  deleteUnifiedEvent,
  readUnifiedEvents,
  saveUnifiedEvent,
  updateUnifiedEventStatus,
  type UnifiedBuizzEvent,
  type UnifiedEventStatus,
} from "@/features/integration/eventLifecycle";
import {
  readUnifiedBookings,
  saveCheckIn as saveUnifiedCheckIn,
  type UnifiedBookingRecord,
  type UnifiedBookingSource,
} from "@/features/integration/bookingIntegration";
import {
  TicketPreview,
  TicketCustomizer,
  TicketQrPreview,
  createTicketQrPayload,
  loadEventTicketSettings,
  loadTicketThemeRequests,
  saveTicketThemeRequests,
  saveEventTicketSetting,
  type TicketThemeSettings,
} from "@/features/tickets";
import { LoadingButton } from "@/components/common/LoadingButton";
import { ActionFeedback } from "@/components/common/ActionFeedback";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import {
  createSupportTicketId,
  getAutoSupportPriority,
  getSupportTickets,
  getSupportTimestamp,
  saveSupportTickets,
  type SupportTicket,
  type SupportTicketCategory,
} from "@/lib/supportTickets";
import {
  useCreateSupportTicketMutation,
  useGetOrganizerAnalyticsQuery,
  useGetOrganizerBookingsQuery,
  useGetOrganizerEventsQuery,
  useGetOrganizerRevenueSummaryQuery,
  useDeleteEventMutation,
  usePublishEventMutation,
  useSubmitEventForReviewMutation,
} from "@/store";
import {
  Panel,
  StatusPill,
  TicketDesignModuleDisabled,
  dedupeDashboardEvents,
  formatDashboardDateTime,
  getDashboardEventContentKey,
  getUnifiedEventKey,
  parseDashboardMoney,
  upsertDashboardEvent,
} from "./SharedDashboardComponents";


type OrganizerEventStatus =
  | "Draft"
  | "Pending Review"
  | "Changes Requested"
  | "Approved"
  | "Rejected"
  | "Published"
  | "Unpublished"
  | "Completed"
  | "Cancelled"
  | "Expired";

export function organizerStatusToUnified(status: OrganizerEventStatus): UnifiedEventStatus {
  if (status === "Pending Review") return "pending_review";
  if (status === "Changes Requested") return "changes_requested";
  if (status === "Approved") return "approved";
  if (status === "Published") return "published";
  if (status === "Rejected") return "rejected";
  if (status === "Cancelled") return "cancelled";
  if (status === "Completed") return "completed";
  if (status === "Expired") return "expired";
  return "draft";
}

export function unifiedStatusToOrganizer(status: UnifiedEventStatus): OrganizerEventStatus {
  if (status === "pending_review") return "Pending Review";
  if (status === "changes_requested") return "Changes Requested";
  if (status === "approved") return "Approved";
  if (status === "published") return "Published";
  if (status === "rejected") return "Rejected";
  if (status === "cancelled") return "Cancelled";
  if (status === "completed") return "Completed";
  if (status === "expired") return "Expired";
  return "Draft";
}

function backendEventStatusToUnified(status: unknown): UnifiedEventStatus {
  const rawStatus = String(status ?? "draft");
  if (rawStatus === "submitted" || rawStatus === "under_review") return "pending_review";
  if (
    rawStatus === "draft" ||
    rawStatus === "changes_requested" ||
    rawStatus === "approved" ||
    rawStatus === "published" ||
    rawStatus === "rejected" ||
    rawStatus === "cancelled" ||
    rawStatus === "completed" ||
    rawStatus === "expired"
  ) {
    return rawStatus;
  }
  return "draft";
}

function isLikelyBackendEventId(value: number) {
  return Number.isInteger(value) && value > 0 && value < 1000000000;
}

function uniqueEventNames(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function useOrganizerEventNames(extraEventNames: string[] = []) {
  const [eventNames, setEventNames] = useState<string[]>([]);

  useEffect(() => {
    try {
      const unifiedEventNames = readUnifiedEvents()
        .filter((event) => Boolean(event.organizerName))
        .map((event) => event.title);

      const phase3EventNames =
        typeof window === "undefined"
          ? []
          : loadPhase3EventsFromStorage(window.localStorage)
            .map((event) => createOrganizerSummaryFromEvent(event))
            .map((event) => event.name);

      setEventNames(uniqueEventNames([...unifiedEventNames, ...phase3EventNames]));
    } catch {
      setEventNames([]);
    }
  }, []);

  const extraKey = extraEventNames.join("|");

  return useMemo(() => {
    return uniqueEventNames([...eventNames, ...extraEventNames]);
  }, [eventNames, extraKey]);
}

function useOrganizerEventFilterOptions(extraEventNames: string[] = []) {
  const names = useOrganizerEventNames(extraEventNames);
  return useMemo(() => ["All Events", ...names], [names]);
}


export function OrganizerSection({ section }: { section: string }) {
  switch (section) {
    case "dashboard":
      return <OrganizerDashboardOverview />;
    case "my-events":
    case "events":
      return <OrganizerEventsView title="My Events" status="All" />;
    case "create-event":
      return <OrganizerCreateEventFlow />;
    case "seat-mapping":
    case "seat-maps":
      return <SeatMapBuilderPage role="organizer" />;
    case "tickets":
      return <OrganizerTicketsView />;
    case "ticket-design":
    case "ticket-designs":
    case "ticket-theme":
    case "ticket-themes":
      return <TicketDesignModuleDisabled role="organizer" />;
    case "bookings":
      return <OrganizerBookingsView />;
    case "attendees":
      return <OrganizerAttendeesView />;
    case "offline-booking":
    case "offline-bookings":
      return <OrganizerOfflineBookingPage />;
    case "qr-check-in":
      return <TicketScannerView />;
    case "revenue":
      return <OrganizerRevenuePage />;
    case "payouts":
    case "settlements":
      return <SettlementsView />;
    case "analytics":
      return <OrganizerAnalyticsView />;
    case "offers":
      return <OrganizerOffersView />;
    case "reports":
      return <ReportsView title="Organizer Reports" role="organizer" />;
    case "support":
      return <OrganizerSupportView />;
    case "notifications":
      return <NotificationsView role="Organizer" />;
    case "settings":
      return <OrganizerSettingsPageContent />;
    case "profile":
      return <OrganizerProfileView />;
      if (
        section === "seat-maps" ||
        section === "seat-mapping" ||
        section === "seat-map" ||
        section === "venue-seat-map"
      ) {
        return <SeatMapBuilderPage role="organizer" />;
      }
    default:
      return <OrganizerDashboardOverview />;
  }
}




type AttendeeCheckInStatus = "Not Checked In" | "Verified" | "Checked In" | "Rejected";
type AttendeeTicketStatus = "Valid" | "Used" | "Cancelled" | "Refunded";

type OrganizerAttendeeRow = {
  id: string;
  ticketId: string;
  bookingId: string;
  orderId: string;
  event: string;
  eventId: string;
  attendeeName: string;
  contactRef: string;
  ticketType: string;
  seat: string;
  gate: string;
  qrStatus: "QR Active" | "QR Used" | "QR Blocked";
  ticketStatus: AttendeeTicketStatus;
  checkInStatus: AttendeeCheckInStatus;
  verifiedBy: string;
  checkInTime: string;
  source?: "Online" | "Offline" | "Reserved" | "Free";
  paymentMode?: string;
  quantity?: number;
};

type OrganizerOfflineCheckInRecord = {
  ticketId: string;
  bookingId: string;
  checkedInAt: string;
  verifiedBy: string;
  source: UnifiedBookingSource;
};

const organizerOfflineCheckInsKey = "buizz-checkins";

export function useOrganizerOfflineBookings() {
  const [offlineBookings, setOfflineBookings] = useState<OfflineBookingRecord[]>([]);

  useEffect(() => {
    setOfflineBookings(readOfflineBookings());
  }, []);

  return offlineBookings;
}

export function useOrganizerUnifiedBookings() {
  const [bookings, setBookings] = useState<UnifiedBookingRecord[]>([]);

  useEffect(() => {
    setBookings(readUnifiedBookings());
  }, []);

  return bookings;
}

export function useOrganizerOfflineCheckIns() {
  const [checkIns, setCheckIns] = useState<OrganizerOfflineCheckInRecord[]>([]);

  useEffect(() => {
    setCheckIns(readOrganizerOfflineCheckIns());
  }, []);

  const save = (record: OrganizerOfflineCheckInRecord) => {
    const next = [
      record,
      ...checkIns.filter((item) => item.ticketId !== record.ticketId && item.bookingId !== record.bookingId),
    ];
    setCheckIns(next);
    saveOrganizerOfflineCheckIns(next);
  };

  return { checkIns, save };
}

export function readOrganizerOfflineCheckIns(): OrganizerOfflineCheckInRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(organizerOfflineCheckInsKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Partial<OrganizerOfflineCheckInRecord>;
        if (!record.ticketId && !record.bookingId) return null;
        return {
          ticketId: String(record.ticketId ?? ""),
          bookingId: String(record.bookingId ?? ""),
          checkedInAt: String(record.checkedInAt ?? new Date().toISOString()),
          verifiedBy: String(record.verifiedBy ?? "Organizer Gate Staff"),
          source: record.source === "Online" || record.source === "Reserved" || record.source === "Free" ? record.source : "Offline",
        } satisfies OrganizerOfflineCheckInRecord;
      })
      .filter((item): item is OrganizerOfflineCheckInRecord => Boolean(item));
  } catch {
    return [];
  }
}

export function saveOrganizerOfflineCheckIns(records: OrganizerOfflineCheckInRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(organizerOfflineCheckInsKey, JSON.stringify(records));
}

export function isOfflineBookingCheckedIn(booking: OfflineBookingRecord, checkIns: OrganizerOfflineCheckInRecord[]) {
  return checkIns.some((item) => item.ticketId === booking.ticketId || item.bookingId === booking.bookingId);
}

export function formatOfflineCheckInTime(booking: OfflineBookingRecord, checkIns: OrganizerOfflineCheckInRecord[]) {
  const record = checkIns.find((item) => item.ticketId === booking.ticketId || item.bookingId === booking.bookingId);
  if (!record) return "Pending";
  const date = new Date(record.checkedInAt);
  return Number.isNaN(date.getTime()) ? "Checked in" : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}


export function normalizeOfflineSourceForDashboard(
  source: OfflineBookingRecord["source"] | UnifiedBookingSource,
): "Online" | "Offline" | "Reserved" | "Free" {
  if (source === "Complimentary") return "Free";
  if (source === "Free") return "Free";
  if (source === "Reserved") return "Reserved";
  if (source === "Offline") return "Offline";

  return "Online";
}

export function normalizeOfflineSourceForCheckIn(
  source: OfflineBookingRecord["source"] | UnifiedBookingSource,
): UnifiedBookingSource {
  if (source === "Complimentary" || source === "Free") return "Free";
  if (source === "Reserved") return "Reserved";
  if (source === "Offline") return "Offline";
  if (source === "Online") return "Online";

  return "Online";
}



export function offlineBookingToAttendeeRow(booking: OfflineBookingRecord, checkIns: OrganizerOfflineCheckInRecord[]): OrganizerAttendeeRow {
  const checkedIn = isOfflineBookingCheckedIn(booking, checkIns);
  return {
    id: `OFF-ATT-${booking.ticketId}`,
    ticketId: booking.ticketId,
    bookingId: booking.bookingId,
    orderId: booking.ticketId,
    event: booking.eventTitle,
    eventId: booking.eventId,
    attendeeName: booking.customerName,
    contactRef: booking.customerPhone || "Contact hidden",
    ticketType: booking.ticketBlock,
    seat: `${booking.ticketBlock} / Qty ${booking.quantity}`,
    gate: booking.source === "Reserved" ? "VIP Gate" : "Counter Gate",
    qrStatus: checkedIn ? "QR Used" : "QR Active",
    ticketStatus: checkedIn ? "Used" : "Valid",
    checkInStatus: checkedIn ? "Checked In" : "Not Checked In",
    verifiedBy: checkedIn ? "Organizer Gate Staff" : "Pending",
    checkInTime: checkedIn ? formatOfflineCheckInTime(booking, checkIns) : "Pending",
    source: normalizeOfflineSourceForDashboard(booking.source),
    paymentMode: booking.paymentMode,
    quantity: booking.quantity,
  };
}

export function offlineBookingToScannerRow(booking: OfflineBookingRecord, checkIns: OrganizerOfflineCheckInRecord[]): ScannerTicketRow {
  const checkedIn = isOfflineBookingCheckedIn(booking, checkIns);
  return {
    id: `OFF-SCAN-${booking.ticketId}`,
    ticketId: booking.ticketId,
    bookingId: booking.bookingId,
    eventId: booking.eventId,
    event: booking.eventTitle,
    attendeeName: booking.customerName,
    ticketType: booking.ticketBlock,
    seat: `${booking.ticketBlock} / Qty ${booking.quantity}`,
    gate: booking.source === "Reserved" ? "VIP Gate" : "Counter Gate",
    ticketStatus: checkedIn ? "Used" : "Valid",
    checkInStatus: checkedIn ? "Checked In" : "Not Checked In",
    checkInTime: checkedIn ? formatOfflineCheckInTime(booking, checkIns) : "Pending",
    verifiedBy: checkedIn ? "Organizer Gate Staff" : "Pending",
    themeKey: booking.source === "Reserved" ? "reserved-vip-pass" : "offline-counter-ticket",
    source: normalizeOfflineSourceForDashboard(booking.source),
    paymentMode: booking.paymentMode,
    amountCollected: booking.amountCollected,
  };
}

export function getOrganizerPaymentStatusFromOffline(
  booking: OfflineBookingRecord,
): OrganizerPaymentStatus {
  if (
    booking.paymentStatus === "Complimentary" ||
    booking.paymentMode === "Complimentary"
  ) {
    return "Complimentary";
  }

  if (booking.paymentStatus === "Paid") {
    return "Paid";
  }

  return "Pending";
}

export function getOrganizerBookingStatusFromOffline(
  booking: OfflineBookingRecord,
  checkedIn: boolean,
): OrganizerBookingStatus {
  if (booking.status === "cancelled") {
    return "Cancelled";
  }

  if (checkedIn) {
    return "Checked In";
  }

  if (
    booking.paymentStatus === "Unpaid" ||
    booking.paymentStatus === "Partial Paid" ||
    booking.balanceAmount > 0
  ) {
    return "Pending Payment";
  }

  return "Confirmed";
}

export function offlineBookingToOrganizerBookingRow(
  booking: OfflineBookingRecord,
  checkIns: OrganizerOfflineCheckInRecord[],
): OrganizerBookingRow {
  const checkedIn = isOfflineBookingCheckedIn(booking, checkIns);

  return {
    id: booking.bookingId,
    orderId: booking.ticketId,
    event: booking.eventTitle,
    eventId: booking.eventId,
    customerRef: booking.customerName,
    ticketType: booking.ticketBlock,
    quantity: booking.quantity,
    amount: booking.amountCollected,
    bookingDate: booking.issuedAt,
    paymentStatus: getOrganizerPaymentStatusFromOffline(booking),
    bookingStatus: getOrganizerBookingStatusFromOffline(booking, checkedIn),
    scanStatus: checkedIn ? "Checked In" : "Not Checked In",
    source: normalizeOfflineSourceForDashboard(booking.source),
    coupon: "No Coupon",
    ticketId: booking.ticketId,
    customerPhone: booking.customerPhone,
    paymentMode: booking.paymentMode,
    balanceAmount: booking.balanceAmount,
  };
}


export function isUnifiedBookingCheckedIn(booking: UnifiedBookingRecord, checkIns: OrganizerOfflineCheckInRecord[]) {
  return checkIns.some((item) => item.ticketId === booking.ticketId || item.bookingId === booking.bookingId) || booking.status === "checked_in";
}

export function formatUnifiedCheckInTime(booking: UnifiedBookingRecord, checkIns: OrganizerOfflineCheckInRecord[]) {
  const record = checkIns.find((item) => item.ticketId === booking.ticketId || item.bookingId === booking.bookingId);
  if (!record) return "Pending";
  const date = new Date(record.checkedInAt);
  return Number.isNaN(date.getTime()) ? "Checked in" : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatUnifiedSeatLabel(booking: UnifiedBookingRecord) {
  if (!booking.selectedSeats?.length) return `${booking.ticketBlock} / Qty ${booking.quantity}`;
  return booking.selectedSeats
    .map((seat) => `${seat.section}${seat.row ? `-${seat.row}` : ""}-${seat.seatNumber ?? seat.label}`)
    .join(", ");
}

function getUnifiedSeatGate(booking: UnifiedBookingRecord) {
  return booking.selectedSeats?.find((seat) => seat.gate)?.gate ?? (booking.source === "Reserved" ? "VIP Gate" : "Main Gate");
}

export function unifiedBookingToAttendeeRow(booking: UnifiedBookingRecord, checkIns: OrganizerOfflineCheckInRecord[]): OrganizerAttendeeRow {
  const checkedIn = isUnifiedBookingCheckedIn(booking, checkIns);
  return {
    id: `UNI-ATT-${booking.ticketId}`,
    ticketId: booking.ticketId,
    bookingId: booking.bookingId,
    orderId: booking.ticketId,
    event: booking.eventTitle,
    eventId: booking.eventId,
    attendeeName: booking.customerName,
    contactRef: booking.customerPhone || "Contact hidden",
    ticketType: booking.ticketBlock,
    seat: formatUnifiedSeatLabel(booking),
    gate: getUnifiedSeatGate(booking),
    qrStatus: checkedIn ? "QR Used" : booking.status === "cancelled" ? "QR Blocked" : "QR Active",
    ticketStatus: checkedIn ? "Used" : booking.status === "cancelled" ? "Cancelled" : "Valid",
    checkInStatus: checkedIn ? "Checked In" : "Not Checked In",
    verifiedBy: checkedIn ? "Organizer Gate Staff" : "Pending",
    checkInTime: checkedIn ? formatUnifiedCheckInTime(booking, checkIns) : "Pending",
    source: normalizeOfflineSourceForDashboard(booking.source),
    paymentMode: booking.paymentMode,
    quantity: booking.quantity,
  };
}

export function unifiedBookingToScannerRow(booking: UnifiedBookingRecord, checkIns: OrganizerOfflineCheckInRecord[]): ScannerTicketRow {
  const checkedIn = isUnifiedBookingCheckedIn(booking, checkIns);
  return {
    id: `UNI-SCAN-${booking.ticketId}`,
    ticketId: booking.ticketId,
    bookingId: booking.bookingId,
    eventId: booking.eventId,
    event: booking.eventTitle,
    attendeeName: booking.customerName,
    ticketType: booking.ticketBlock,
    seat: formatUnifiedSeatLabel(booking),
    gate: getUnifiedSeatGate(booking),
    ticketStatus: checkedIn ? "Used" : booking.status === "cancelled" ? "Cancelled" : "Valid",
    checkInStatus: checkedIn ? "Checked In" : "Not Checked In",
    checkInTime: checkedIn ? formatUnifiedCheckInTime(booking, checkIns) : "Pending",
    verifiedBy: checkedIn ? "Organizer Gate Staff" : "Pending",
    themeKey: booking.source === "Reserved" ? "reserved-vip-pass" : "event-ticket",
    source: normalizeOfflineSourceForDashboard(booking.source),
    paymentMode: booking.paymentMode,
    amountCollected: booking.amountCollected,
    selectedSeats: booking.selectedSeats,
  };
}

export function unifiedBookingToOrganizerBookingRow(booking: UnifiedBookingRecord, checkIns: OrganizerOfflineCheckInRecord[]): OrganizerBookingRow {
  const checkedIn = isUnifiedBookingCheckedIn(booking, checkIns);
  return {
    id: booking.bookingId,
    orderId: booking.ticketId,
    event: booking.eventTitle,
    eventId: booking.eventId,
    customerRef: booking.customerName,
    ticketType: booking.ticketBlock,
    quantity: booking.quantity,
    amount: booking.amountCollected,
    bookingDate: booking.issuedAt,
    paymentStatus: booking.paymentMode === "Complimentary" ? "Complimentary" : booking.balanceAmount > 0 ? "Pending" : "Paid",
    bookingStatus: checkedIn ? "Checked In" : booking.status === "cancelled" ? "Cancelled" : "Confirmed",
    scanStatus: checkedIn ? "Checked In" : "Not Checked In",
    source: normalizeOfflineSourceForDashboard(booking.source),
    coupon: "No Coupon",
    ticketId: booking.ticketId,
    customerPhone: booking.customerPhone,
    paymentMode: booking.paymentMode,
    balanceAmount: booking.balanceAmount,
  };
}

export function createOfflineBookingPreview(booking: OfflineBookingRecord) {
  const draft = createTicketDesignDraft(booking.source === "Reserved" ? "reserved-vip-pass" : "offline-counter-ticket");
  const content = createDefaultTicketContent(draft, {
    eventTitle: booking.eventTitle,
    category: booking.category,
    ticketType: booking.source === "Reserved" ? "reserved" : "offline",
    venueName: booking.venueName,
    city: booking.city,
    date: booking.date,
    time: booking.time,
    blockName: booking.ticketBlock,
    seatLabel: booking.ticketBlock,
    amountPaid: booking.totalAmount,
    source: normalizeOfflineSourceForDashboard(booking.source),
    bookingId: booking.bookingId,
    ticketId: booking.ticketId,
    organizerName: booking.source === "Reserved" ? "Reserved" : "Counter",
    customerName: booking.customerName,
    quantity: booking.quantity,
    paymentMode: booking.paymentMode,
    seats: [{ section: booking.ticketBlock, totalSeats: booking.quantity, seatNumbers: "Counter issued", amount: booking.totalAmount }],
  });

  return { draft, content };
}

export function OfflineBookingTicketPreview({ booking }: { booking: OfflineBookingRecord }) {
  const { draft, content } = createOfflineBookingPreview(booking);
  return <BuizzTicketPreview design={draft} data={content} mode="offline-issued" />;
}

export function findOfflineBookingByIds(bookings: OfflineBookingRecord[], bookingId?: string, ticketId?: string) {
  return bookings.find((booking) => booking.bookingId === bookingId || booking.ticketId === ticketId) ?? null;
}

export function paymentModesForDashboard(): Array<
  | "Cash"
  | "UPI"
  | "Razorpay"
  | "Card"
  | "Other"
  | "Online"
  | "Complimentary"
  | "Free Registration"
> {
  return [
    "Cash",
    "UPI",
    "Razorpay",
    "Other",
    "Complimentary",
    "Free Registration",
  ];
}
export function getTopOfflineEventName(bookings: OfflineBookingRecord[]) {
  if (!bookings.length) return "No offline data";
  const counts = bookings.reduce((map, booking) => {
    map.set(booking.eventTitle, (map.get(booking.eventTitle) ?? 0) + booking.quantity);
    return map;
  }, new Map<string, number>());
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No offline data";
}

export function OrganizerAttendeesView() {
  const router = useRouter();
  const offlineBookings = useOrganizerOfflineBookings();
  const unifiedBookings = useOrganizerUnifiedBookings();
  const { checkIns } = useOrganizerOfflineCheckIns();
  const [entryAttempts, setEntryAttempts] = useState<OrganizerVenueEntryAttempt[]>([]);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All Events");
  const [entryFilter, setEntryFilter] = useState<"All Entries" | OrganizerVenueEntryAttemptResult>("All Entries");
  const [selectedAttendee, setSelectedAttendee] = useState<OrganizerAttendeeRow | null>(null);

  useEffect(() => {
    setEntryAttempts(readOrganizerVenueEntryAttempts());
  }, []);

  const sourceAttendees = useMemo(() => {
    const offlineRows = offlineBookings.map((booking) => offlineBookingToAttendeeRow(booking, checkIns));
    const unifiedRows = unifiedBookings
      .filter((booking) => booking.source === "Online" || booking.source === "Free")
      .map((booking) => unifiedBookingToAttendeeRow(booking, checkIns));

    return [...unifiedRows, ...offlineRows];
  }, [checkIns, offlineBookings, unifiedBookings]);

  const sourceMap = useMemo(() => {
    return sourceAttendees.reduce((map, row) => {
      map.set(row.ticketId.toLowerCase(), row);
      map.set(row.bookingId.toLowerCase(), row);
      return map;
    }, new Map<string, OrganizerAttendeeRow>());
  }, [sourceAttendees]);

  const checkedInFallbackAttempts = useMemo(() => {
    return sourceAttendees
      .filter((row) => row.checkInStatus === "Checked In")
      .map((row) => ({
        id: `CHECKIN-${row.ticketId}-${row.bookingId}`,
        ticketId: row.ticketId,
        bookingId: row.bookingId,
        eventId: row.eventId,
        event: row.event,
        attendeeName: row.attendeeName,
        contactRef: row.contactRef,
        ticketType: row.ticketType,
        seat: row.seat,
        gate: row.gate,
        source: row.source ?? "Online",
        paymentMode: row.paymentMode,
        result: "Checked In" as OrganizerVenueEntryAttemptResult,
        message: "Ticket was already checked in from saved check-in records.",
        attemptedAt: new Date().toISOString(),
        verifiedBy: row.verifiedBy || "Organizer Gate Staff",
        rawInput: row.bookingId,
      }));
  }, [sourceAttendees]);

  const allVenueEntryAttempts = useMemo(() => {
    const merged = [...entryAttempts, ...checkedInFallbackAttempts];
    const byKey = new Map<string, OrganizerVenueEntryAttempt>();

    merged.forEach((attempt) => {
      const key = `${attempt.result}-${attempt.ticketId}-${attempt.bookingId}-${attempt.attemptedAt}`;
      byKey.set(key, attempt);
    });

    return Array.from(byKey.values()).sort(
      (a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime(),
    );
  }, [checkedInFallbackAttempts, entryAttempts]);

  const entryRows = useMemo(() => {
    return allVenueEntryAttempts.map((attempt) => {
      const matched =
        sourceMap.get(attempt.ticketId.toLowerCase()) ??
        sourceMap.get(attempt.bookingId.toLowerCase()) ??
        null;

      const checkInStatus: AttendeeCheckInStatus =
        attempt.result === "Checked In" || attempt.result === "Already Used"
          ? "Checked In"
          : attempt.result === "Valid Ticket"
            ? "Verified"
            : "Rejected";

      const ticketStatus: AttendeeTicketStatus =
        attempt.result === "Checked In" || attempt.result === "Already Used"
          ? "Used"
          : attempt.result === "Valid Ticket"
            ? "Valid"
            : "Cancelled";

      return {
        id: attempt.id,
        ticketId: attempt.ticketId || matched?.ticketId || "Unknown ticket",
        bookingId: attempt.bookingId || matched?.bookingId || attempt.rawInput || "Unknown booking",
        orderId: matched?.orderId ?? attempt.ticketId ?? attempt.bookingId ?? attempt.rawInput,
        event: attempt.event || matched?.event || "Unknown / invalid ticket",
        eventId: attempt.eventId || matched?.eventId || "Not matched",
        attendeeName: attempt.attendeeName || matched?.attendeeName || "Unknown visitor",
        contactRef: attempt.contactRef || matched?.contactRef || "Not available",
        ticketType: attempt.ticketType || matched?.ticketType || "Unknown",
        seat: attempt.seat || matched?.seat || "Not available",
        gate: attempt.gate || matched?.gate || "Gate attempt",
        qrStatus:
          attempt.result === "Checked In" || attempt.result === "Already Used"
            ? "QR Used"
            : attempt.result === "Valid Ticket"
              ? "QR Active"
              : "QR Blocked",
        ticketStatus,
        checkInStatus,
        verifiedBy: attempt.verifiedBy || "Organizer Scanner",
        checkInTime: formatVenueAttemptTime(attempt.attemptedAt),
        source: attempt.source ?? matched?.source ?? "Online",
        paymentMode: attempt.paymentMode ?? matched?.paymentMode,
        quantity: matched?.quantity ?? 1,
        entryResult: attempt.result,
        entryMessage: attempt.message,
        rawInput: attempt.rawInput,
      } satisfies OrganizerAttendeeRow & {
        entryResult: OrganizerVenueEntryAttemptResult;
        entryMessage: string;
        rawInput?: string;
      };
    });
  }, [allVenueEntryAttempts, sourceMap]);

  const events = useMemo(
    () => ["All Events", ...Array.from(new Set(entryRows.map((item) => item.event).filter(Boolean)))],
    [entryRows],
  );

  const filteredAttendees = entryRows.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      item.attendeeName.toLowerCase().includes(query) ||
      item.ticketId.toLowerCase().includes(query) ||
      item.bookingId.toLowerCase().includes(query) ||
      item.orderId.toLowerCase().includes(query) ||
      item.event.toLowerCase().includes(query) ||
      item.seat.toLowerCase().includes(query) ||
      item.entryResult.toLowerCase().includes(query) ||
      String(item.rawInput ?? "").toLowerCase().includes(query);

    const matchesEvent = eventFilter === "All Events" || item.event === eventFilter;
    const matchesEntry = entryFilter === "All Entries" || item.entryResult === entryFilter;

    return matchesSearch && matchesEvent && matchesEntry;
  });

  const refreshEntryLog = () => {
    setEntryAttempts(readOrganizerVenueEntryAttempts());
  };

  const resetFilters = () => {
    setSearch("");
    setEventFilter("All Events");
    setEntryFilter("All Entries");
  };

  const totalAttempts = filteredAttendees.length;
  const checkedIn = filteredAttendees.filter((item) => item.entryResult === "Checked In").length;
  const validAttempts = filteredAttendees.filter((item) => item.entryResult === "Valid Ticket").length;
  const invalidAttempts = filteredAttendees.filter(
    (item) => item.entryResult === "Invalid Ticket" || item.entryResult === "Blocked Ticket" || item.entryResult === "Rejected Entry",
  ).length;

  const exportVenueEntryLog = () => {
    const headers = [
      "Result",
      "Attempt Time",
      "Attendee",
      "Event",
      "Ticket ID",
      "Booking ID",
      "Ticket Type",
      "Gate",
      "Source",
      "Verified By",
      "Message",
      "Raw Input",
    ];

    const rows = filteredAttendees.map((item) => [
      item.entryResult,
      item.checkInTime,
      item.attendeeName,
      item.event,
      item.ticketId,
      item.bookingId,
      item.ticketType,
      item.gate,
      item.source ?? "Online",
      item.verifiedBy,
      item.entryMessage,
      item.rawInput ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `buizz-venue-entry-log-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      title="Attendees"
      description="Only venue entry activity is shown here: checked-in guests, valid scan attempts, invalid tickets, blocked tickets, and repeated entry attempts."
    >
      <div className="grid w-full min-w-0 gap-4 overflow-x-hidden sm:gap-5">
        <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <OrganizerAttendeeStatCard title="Entry Attempts" value={totalAttempts} detail="Venue scan/check-in log" />
          <OrganizerAttendeeStatCard title="Checked In" value={checkedIn} detail="Ticket verified and used" />
          <OrganizerAttendeeStatCard title="Valid Scans" value={validAttempts} detail="Valid but not entered yet" />
          <OrganizerAttendeeStatCard title="Invalid / Blocked" value={invalidAttempts} detail="Rejected, blocked, or fake" />
        </section>

        <section className="grid gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-3 2xl:grid-cols-[minmax(0,1fr)_220px_180px_auto_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search entry log, booking ID, ticket ID, attendee..."
            className="min-h-10 min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-semibold outline-none focus:border-[var(--color-brand-primary)] sm:min-h-11 sm:text-sm 2xl:rounded-xl"
          />

          <select
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value)}
            className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black outline-none sm:min-h-11 sm:text-sm"
          >
            {events.map((eventName) => (
              <option key={eventName}>{eventName}</option>
            ))}
          </select>

          <select
            value={entryFilter}
            onChange={(event) => setEntryFilter(event.target.value as "All Entries" | OrganizerVenueEntryAttemptResult)}
            className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black outline-none sm:min-h-11 sm:text-sm"
          >
            <option>All Entries</option>
            <option>Valid Ticket</option>
            <option>Checked In</option>
            <option>Already Used</option>
            <option>Invalid Ticket</option>
            <option>Blocked Ticket</option>
            <option>Rejected Entry</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="min-h-10 rounded-xl border border-[var(--app-border)] px-3 text-xs font-black sm:min-h-11 sm:text-sm"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={refreshEntryLog}
            className="min-h-10 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white sm:min-h-11 sm:text-sm"
          >
            Refresh Log
          </button>
        </section>

        <section className="rounded-2xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-3 sm:p-4">
          <p className="text-sm font-black text-[var(--app-foreground)]">
            Attendees page rule
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
            This page no longer lists every booking. It only shows people who reached the venue scanner: valid scans, checked-in tickets, already-used QR attempts, invalid booking IDs, and blocked/rejected entries.
          </p>
        </section>

        <section className="grid gap-2 xl:grid-cols-2 2xl:hidden">
          {filteredAttendees.map((item, index) => (
            <article
              key={`mobile-entry-${item.entryResult}-${item.id}-${index}`}
              className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-all text-[10px] font-black uppercase text-[var(--color-brand-primary)]">
                    {item.bookingId}
                  </p>
                  <h3 className="mt-1 line-clamp-1 text-sm font-black">
                    {item.attendeeName}
                  </h3>
                  <p className="mt-1 truncate text-[11px] font-semibold text-[var(--app-muted)]">
                    {item.event}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-[var(--color-brand-primary)]/10 px-2 py-1 text-[10px] font-black text-[var(--color-brand-primary)]">
                  {item.entryResult}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                  <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Ticket</p>
                  <p className="mt-1 truncate text-xs font-black">{item.ticketType}</p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)]">{item.ticketId}</p>
                </div>

                <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                  <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Gate / Time</p>
                  <p className="mt-1 truncate text-xs font-black">{item.gate}</p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)]">{item.checkInTime}</p>
                </div>
              </div>

              <p className="mt-2 line-clamp-2 rounded-xl bg-[var(--app-subtle)] p-2 text-[11px] font-semibold leading-5 text-[var(--app-muted)]">
                {item.entryMessage}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAttendee(item)}
                  className="min-h-9 rounded-xl border border-[var(--app-border)] px-2 text-xs font-black"
                >
                  View
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/organizer/qr-check-in")}
                  className="min-h-9 rounded-xl bg-[var(--color-brand-primary)] px-2 text-xs font-black text-white"
                >
                  Open Scanner
                </button>
              </div>
            </article>
          ))}

          {!filteredAttendees.length ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center xl:col-span-2">
              <p className="text-lg font-black">No venue entry records yet</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Scan or check a booking ID on QR Check-in page. Only venue attempts will appear here.
              </p>
            </div>
          ) : null}
        </section>

        <section className="hidden min-w-0 overflow-x-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_14px_40px_rgba(15,23,42,0.06)] 2xl:block">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase text-[var(--app-muted)]">
                <th className="px-4 py-4">Entry Result</th>
                <th className="px-4 py-4">Attendee</th>
                <th className="px-4 py-4">Event</th>
                <th className="px-4 py-4">Ticket / Booking</th>
                <th className="px-4 py-4">Gate</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Attempt Time</th>
                <th className="px-4 py-4">Message</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredAttendees.map((item, index) => (
                <tr
                  key={`entry-row-${item.entryResult}-${item.id}-${index}`}
                  className="border-b border-[var(--app-border)] transition duration-200 hover:bg-[var(--app-subtle)] last:border-0"
                >
                  <td className="px-4 py-4 align-top">
                    <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-black text-[var(--color-brand-primary)]">
                      {item.entryResult}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{item.attendeeName}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{item.contactRef}</p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{item.event}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{item.eventId}</p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{item.ticketType}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">Ticket: {item.ticketId}</p>
                    <p className="text-xs font-semibold text-[var(--app-muted)]">Booking: {item.bookingId}</p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{item.gate}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{item.seat}</p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <StatusPill label={item.source ?? "Online"} />
                    {item.paymentMode ? <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{item.paymentMode}</p> : null}
                  </td>

                  <td className="px-4 py-4 align-top font-semibold">{item.checkInTime}</td>

                  <td className="max-w-xs px-4 py-4 align-top text-xs font-semibold leading-5 text-[var(--app-muted)]">
                    {item.entryMessage}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedAttendee(item)} className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black">
                        View
                      </button>

                      <button type="button" onClick={() => router.push("/organizer/qr-check-in")} className="rounded-xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white">
                        Scanner
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredAttendees.length ? (
            <div className="p-10 text-center">
              <p className="text-xl font-black">No venue entry records yet</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Use QR Check-in page to scan camera QR or check booking ID.
              </p>
            </div>
          ) : null}
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={exportVenueEntryLog} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] px-4 text-sm font-black">
            <Download className="size-4" />
            Export Entry Log
          </button>

          <button type="button" onClick={() => router.push("/organizer/qr-check-in")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white">
            <QrCode className="size-4" />
            Open QR Check-in
          </button>

          <button type="button" onClick={refreshEntryLog} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] px-4 text-sm font-black">
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      {selectedAttendee ? (
        <OrganizerAttendeeDetailsModal
          attendee={selectedAttendee}
          onClose={() => setSelectedAttendee(null)}
          onVerify={() => router.push("/organizer/qr-check-in")}
          onCheckIn={() => router.push("/organizer/qr-check-in")}
          onReject={() => router.push("/organizer/qr-check-in")}
        />
      ) : null}
    </Panel>
  );
}

export function OrganizerAttendeeStatCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="buizz-dashboard-card rounded-3xl p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
        {title}
      </p>
      <p className="mt-3 text-3xl font-black text-[var(--app-foreground)]">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
        {detail}
      </p>
    </article>
  );
}

export function OrganizerCheckInBadge({ status }: { status: AttendeeCheckInStatus }) {
  const tone =
    status === "Checked In"
      ? "bg-[#22C55E]/15 text-[#22C55E]"
      : status === "Verified"
        ? "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]"
        : status === "Rejected"
          ? "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]"
          : "bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{status}</span>;
}

export function OrganizerTicketValidBadge({ status }: { status: AttendeeTicketStatus }) {
  const tone =
    status === "Valid"
      ? "bg-[#22C55E]/15 text-[#22C55E]"
      : status === "Used"
        ? "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]"
        : "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{status}</span>;
}

export function OrganizerAttendeeDetailsModal({
  attendee,
  onClose,
  onVerify,
  onCheckIn,
  onReject,
}: {
  attendee: OrganizerAttendeeRow;
  onClose: () => void;
  onVerify: () => void;
  onCheckIn: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-2xl buizz-dashboard-enter">
        <div className="flex items-start justify-between gap-4">
          <div>
            <OrganizerCheckInBadge status={attendee.checkInStatus} />
            <h2 className="mt-3 text-2xl font-black">{attendee.attendeeName}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
              {attendee.event} • {attendee.ticketId}
            </p>
          </div>

          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl border border-[var(--app-border)]">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-4">
            <SectionBox title="Attendee Information">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailBox label="Attendee ID" value={attendee.id} />
                <DetailBox label="Name" value={attendee.attendeeName} />
                <DetailBox label="Contact" value="Hidden for privacy" />
                <DetailBox label="Booking ID" value={attendee.bookingId} />
                <DetailBox label="Order ID" value={attendee.orderId} />
                <DetailBox label="Event ID" value={attendee.eventId} />
                <DetailBox label="Event" value={attendee.event} />
                <DetailBox label="Source" value={attendee.source ?? "Online"} />
                <DetailBox label="Payment Mode" value={attendee.paymentMode ?? "Online"} />
              </div>
            </SectionBox>

            <SectionBox title="Ticket Verification">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailBox label="Booking Reference" value={attendee.bookingId} />
                <DetailBox label="Ticket Type" value={attendee.ticketType} />
                <DetailBox label="Quantity" value={String(attendee.quantity ?? 1)} />
                <DetailBox label="Seat / Section" value={attendee.seat} />
                <DetailBox label="Gate" value={attendee.gate} />
                <DetailBox label="QR Status" value={attendee.qrStatus} />
                <DetailBox label="Ticket Status" value={attendee.ticketStatus} />
                <DetailBox label="Check-in Status" value={attendee.checkInStatus} />
                <DetailBox label="Verified By" value={attendee.verifiedBy} />
              </div>
            </SectionBox>
          </div>

          <aside className="rounded-2xl border border-[var(--app-border)] bg-[var(--color-brand-ink)] p-4 text-white">
            <p className="text-xs font-black uppercase text-white/60">QR Verification Preview</p>

            <div className="mt-4 rounded-xl bg-white p-4 text-[var(--color-brand-ink)]">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">Buizz Verified Ticket</p>
                  <p className="mt-1 text-lg font-black">{attendee.ticketType}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{attendee.seat}</p>
                </div>
                <QrCode className="size-16" />
              </div>

              <div className="mt-4 grid gap-2 text-xs font-bold">
                <p>Booking ID: {attendee.bookingId}</p>
                <p>Status: {attendee.checkInStatus}</p>
                <p>Gate: {attendee.gate}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <button type="button" onClick={onVerify} disabled={attendee.ticketStatus !== "Valid"} className="min-h-10 rounded-xl border border-white/15 px-4 text-xs font-black disabled:opacity-50">
                Verify Ticket
              </button>

              <button type="button" onClick={onCheckIn} disabled={attendee.ticketStatus !== "Valid" || attendee.checkInStatus === "Checked In"} className="min-h-10 rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white disabled:opacity-50">
                Mark Checked In
              </button>

              <button type="button" onClick={onReject} disabled={attendee.checkInStatus === "Checked In"} className="min-h-10 rounded-xl border border-white/15 px-4 text-xs font-black disabled:opacity-50">
                Reject Entry
              </button>

              <button type="button" onClick={() => window.print()} className="min-h-10 rounded-xl border border-white/15 px-4 text-xs font-black">
                Print Verification
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}




function getCurrentOrganizerId() {
  if (typeof window === "undefined") return "";
  const session = getRoleSession("organizer");
  return String(session?.userId || session?.displayId || session?.email || "").trim();
}

type OrganizerDashboardEventStatus =
  | "Draft"
  | "Pending Review"
  | "Changes Requested"
  | "Approved"
  | "Rejected"
  | "Published"
  | "Unpublished"
  | "Completed"
  | "Cancelled"
  | "Expired";

type OrganizerDashboardBookingSource = "Online" | "Offline" | "Reserved" | "Free";

type OrganizerDashboardTransaction = {
  id: string;
  eventId: string;
  eventName: string;
  customerName: string;
  ticketBlock: string;
  quantity: number;
  amount: number;
  balanceAmount: number;
  source: OrganizerDashboardBookingSource;
  paymentMode: string;
  status: "Successful" | "Pending" | "Cancelled" | "Checked In";
  issuedAt: string;
};

type OrganizerDashboardEventRow = {
  id: string;
  name: string;
  category: string;
  status: OrganizerDashboardEventStatus;
  dateLabel: string;
  timeLabel: string;
  city: string;
  venue: string;
  revenue: number;
  pendingRevenue: number;
  bookings: number;
  ticketsSold: number;
  attendees: number;
  checkedIn: number;
  capacity: number;
  ticketTypes: number;
  occupancy: number;
  approvalNote: string;
  nextActionLabel: string;
  nextActionHref: string;
  sourceBreakdown: Array<{ source: OrganizerDashboardBookingSource; bookings: number; tickets: number; revenue: number }>;
};

type OrganizerDashboardActivityRow = {
  id: string;
  title: string;
  detail: string;
  tone: "success" | "warning" | "brand" | "muted";
  href: string;
};

type OrganizerDashboardActionItem = {
  label: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  tone: "primary" | "secondary" | "soft";
};


type OrganizerDashboardModuleItem = {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  status: string;
};

function organizerDashboardMoney(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function organizerDashboardSafeNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatOrganizerDashboardDate(value?: string) {
  if (!value) return "Date pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatOrganizerDashboardTime(value?: string) {
  if (!value) return "Time pending";
  if (/am|pm/i.test(value)) return value;

  const [hourPart, minutePart = "00"] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrganizerDashboardCapacity(event: UnifiedBuizzEvent) {
  const blocks = (event as UnifiedBuizzEvent & {
    ticketBlocks?: Array<{ totalQuantity?: number }>;
  }).ticketBlocks;

  const blockCapacity = Array.isArray(blocks)
    ? blocks.reduce((sum, block) => sum + organizerDashboardSafeNumber(block.totalQuantity), 0)
    : 0;

  return blockCapacity || organizerDashboardSafeNumber((event as UnifiedBuizzEvent & { capacity?: number }).capacity);
}

function getOrganizerDashboardApprovalNote(status: OrganizerDashboardEventStatus) {
  if (status === "Draft") return "Draft is saved. Submit it for Buizz review.";
  if (status === "Pending Review") return "Waiting for Admin or Super Admin approval.";
  if (status === "Changes Requested") return "Reviewer requested changes. Edit and resubmit.";
  if (status === "Approved") return "Approved by Super Admin. Ready to publish.";
  if (status === "Published") return "Live on customer website.";
  if (status === "Rejected") return "Rejected. Edit the event and resubmit.";
  if (status === "Completed") return "Completed event. Reports are ready.";
  if (status === "Cancelled") return "Cancelled event. Check refunds and support.";
  if (status === "Expired") return "Expired event. Reports and history remain available.";
  return "Event is not currently visible to customers.";
}

function getOrganizerDashboardAction(status: OrganizerDashboardEventStatus) {
  if (status === "Draft") return { label: "Continue Setup", href: "/organizer/create-event" };
  if (status === "Pending Review") return { label: "View Review", href: "/organizer/my-events" };
  if (status === "Changes Requested") return { label: "Fix & Resubmit", href: "/organizer/create-event" };
  if (status === "Approved") return { label: "View Event", href: "/organizer/my-events" };
  if (status === "Published") return { label: "Open Scanner", href: "/organizer/qr-check-in" };
  if (status === "Rejected") return { label: "Fix & Resubmit", href: "/organizer/create-event" };
  return { label: "View Report", href: "/organizer/reports" };
}

function getOrganizerDashboardHealth(event: OrganizerDashboardEventRow) {
  if (event.status === "Rejected" || event.status === "Cancelled") return "Needs Action";
  if (event.status === "Draft" || event.status === "Pending Review") return "Setup";
  if (event.occupancy >= 80) return "High Demand";
  if (event.occupancy >= 45) return "Healthy";
  return "Needs Push";
}

function buildOrganizerDashboardCsv(events: OrganizerDashboardEventRow[]) {
  const headers = [
    "Event ID",
    "Event",
    "Category",
    "Status",
    "City",
    "Venue",
    "Date",
    "Time",
    "Bookings",
    "Tickets Sold",
    "Checked In",
    "Capacity",
    "Occupancy %",
    "Revenue",
    "Pending Revenue",
  ];

  const rows = events.map((event) => [
    event.id,
    event.name,
    event.category,
    event.status,
    event.city,
    event.venue,
    event.dateLabel,
    event.timeLabel,
    event.bookings,
    event.ticketsSold,
    event.checkedIn,
    event.capacity,
    event.occupancy,
    Math.round(event.revenue),
    Math.round(event.pendingRevenue),
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadOrganizerDashboardCsv(events: OrganizerDashboardEventRow[]) {
  const csv = buildOrganizerDashboardCsv(events);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `buizz-organizer-dashboard-${Date.now()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function OrganizerDashboardOverview() {
  const currentOrganizerId = getCurrentOrganizerId();
  const {
    data: organizerAnalyticsResponse,
    isFetching: analyticsFetching,
    refetch: refetchOrganizerAnalytics,
  } = useGetOrganizerAnalyticsQuery({});
  const {
    data: organizerEventsResponse,
    isFetching: eventsFetching,
    refetch: refetchOrganizerEvents,
  } = useGetOrganizerEventsQuery({ page: 1, limit: 100 });
  const {
    data: organizerBookingsResponse,
    isFetching: bookingsFetching,
    refetch: refetchOrganizerBookings,
  } = useGetOrganizerBookingsQuery({ page: 1, limit: 100 });
  const [events, setEvents] = useState<UnifiedBuizzEvent[]>([]);
  const [offlineBookings, setOfflineBookings] = useState<OfflineBookingRecord[]>([]);
  const [unifiedBookings, setUnifiedBookings] = useState<UnifiedBookingRecord[]>([]);
  const [checkIns, setCheckIns] = useState<OrganizerOfflineCheckInRecord[]>([]);
  const [supportTicketsCount, setSupportTicketsCount] = useState(0);
  const [offerCampaignCount, setOfferCampaignCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState<"All" | OrganizerDashboardEventStatus>("All");
  const [eventSortBy, setEventSortBy] = useState<"Revenue" | "Tickets" | "Bookings" | "Status">("Revenue");
  const organizerApiEvents = organizerEventsResponse?.data ?? [];
  const organizerApiBookings = organizerBookingsResponse?.data ?? [];
  const organizerApiAnalytics = organizerAnalyticsResponse?.data;

  const loadDashboardBaseData = () => {
    try {
      const unifiedEvents = readUnifiedEvents().filter(
        (event) =>
          event.organizerId === currentOrganizerId ||
          String((event as Record<string, unknown>).organizerEmail ?? "") === currentOrganizerId,
      );

      setEvents(unifiedEvents);
    } catch {
      setEvents([]);
    }

    try {
      setUnifiedBookings(readUnifiedBookings());
    } catch {
      setUnifiedBookings([]);
    }

    try {
      setOfflineBookings(readOfflineBookings());
    } catch {
      setOfflineBookings([]);
    }

    try {
      setCheckIns(readOrganizerOfflineCheckIns());
    } catch {
      setCheckIns([]);
    }

    try {
      const organizerTickets = getSupportTickets().filter((ticket) => {
        const statusText = String(ticket.status ?? "").toLowerCase();
        const isOrganizerTicket = ticket.sourceType === "Organizer";
        const isOpenTicket = !["closed", "resolved", "done"].some((status) => statusText.includes(status));

        return isOrganizerTicket && isOpenTicket;
      });

      setSupportTicketsCount(organizerTickets.length);
    } catch {
      setSupportTicketsCount(0);
    }

    try {
      const storedOffers = window.localStorage.getItem("buizz-organizer-offers-v3");
      const parsedOffers = storedOffers ? (JSON.parse(storedOffers) as unknown) : [];
      const activeOffers = Array.isArray(parsedOffers)
        ? parsedOffers.filter((offer) => {
          if (!offer || typeof offer !== "object") return false;
          const status = String((offer as { status?: unknown }).status ?? "").toLowerCase();
          return status === "active" || status === "scheduled" || status === "published";
        }).length
        : 0;
      setOfferCampaignCount(activeOffers);
    } catch {
      setOfferCampaignCount(0);
    }

    setLastUpdatedAt(
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  };

  useEffect(() => {
    loadDashboardBaseData();

    const refreshOnFocus = () => loadDashboardBaseData();
    const refreshOnStorage = (event: StorageEvent) => {
      const key = event.key ?? "";
      if (
        key.includes("buizz") ||
        key.includes("booking") ||
        key.includes("event") ||
        key.includes("support") ||
        key.includes("offer") ||
        key.includes("checkin")
      ) {
        loadDashboardBaseData();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("storage", refreshOnStorage);
    const interval = window.setInterval(loadDashboardBaseData, 15000);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("storage", refreshOnStorage);
      window.clearInterval(interval);
    };
  }, []);

  const transactions = useMemo<OrganizerDashboardTransaction[]>(() => {
    const apiRows = organizerApiBookings.map((booking, index) => {
      const statusText = String(booking.bookingStatus ?? booking.status ?? "").toLowerCase();
      const paymentStatus = String(booking.paymentStatus ?? "").toLowerCase();
      const amount = organizerDashboardSafeNumber(booking.totalAmount ?? booking.amount ?? booking.paymentAmount);
      const quantity = Math.max(1, organizerDashboardSafeNumber(booking.quantity) || 1);

      return {
        id: `API-${String(booking.id ?? booking.bookingNumber ?? index)}`,
        eventId: String(booking.eventId ?? "api-event"),
        eventName: String(booking.eventTitle ?? booking.event?.title ?? "Untitled Event"),
        customerName: String(booking.customerName ?? booking.user?.name ?? "Customer"),
        ticketBlock: String(booking.ticketType ?? "General"),
        quantity,
        amount,
        balanceAmount: paymentStatus === "pending" || statusText === "pending" ? amount : 0,
        source: normalizeOfflineSourceForDashboard(booking.source ?? "Online"),
        paymentMode: String(booking.paymentMode ?? "Online"),
        status: statusText === "cancelled" || statusText === "failed"
          ? "Cancelled"
          : paymentStatus === "pending" || statusText === "pending"
            ? "Pending"
            : "Successful",
        issuedAt: String(booking.createdAt ?? new Date().toISOString()),
      } satisfies OrganizerDashboardTransaction;
    });

    if (apiRows.length) return apiRows;

    const onlineRows = unifiedBookings.map((booking, index) => {
      const balanceAmount = organizerDashboardSafeNumber(booking.balanceAmount);
      const source = normalizeOfflineSourceForDashboard(booking.source);
      const bookingStatus = String(booking.status ?? "");

      return {
        id: `UNI-${String(booking.bookingId ?? booking.ticketId ?? index)}`,
        eventId: String(booking.eventId ?? "unknown-event"),
        eventName: String(booking.eventTitle ?? "Untitled Event"),
        customerName: String(booking.customerName ?? "Guest"),
        ticketBlock: String(booking.ticketBlock ?? "General"),
        quantity: Math.max(1, organizerDashboardSafeNumber(booking.quantity) || 1),
        amount: organizerDashboardSafeNumber(booking.amountCollected),
        balanceAmount,
        source,
        paymentMode: String(booking.paymentMode ?? "Online"),
        status: bookingStatus === "checked_in"
          ? "Checked In"
          : bookingStatus === "cancelled"
            ? "Cancelled"
            : balanceAmount > 0
              ? "Pending"
              : "Successful",
        issuedAt: String(booking.issuedAt ?? new Date().toISOString()),
      } satisfies OrganizerDashboardTransaction;
    });

    const offlineRows = offlineBookings.map((booking, index) => {
      const balanceAmount = organizerDashboardSafeNumber(booking.balanceAmount);
      const source = normalizeOfflineSourceForDashboard(booking.source);
      const isPending =
        balanceAmount > 0 ||
        String(booking.paymentStatus ?? "") === "Unpaid" ||
        String(booking.paymentStatus ?? "") === "Partial Paid";

      return {
        id: `OFF-${String(booking.bookingId ?? booking.ticketId ?? index)}`,
        eventId: String(booking.eventId ?? "offline-event"),
        eventName: String(booking.eventTitle ?? "Offline Event"),
        customerName: String(booking.customerName ?? "Counter Customer"),
        ticketBlock: String(booking.ticketBlock ?? "General"),
        quantity: Math.max(1, organizerDashboardSafeNumber(booking.quantity) || 1),
        amount: organizerDashboardSafeNumber(booking.amountCollected),
        balanceAmount,
        source,
        paymentMode: String(booking.paymentMode ?? "Counter"),
        status: booking.status === "cancelled" ? "Cancelled" : isPending ? "Pending" : "Successful",
        issuedAt: String(booking.issuedAt ?? new Date().toISOString()),
      } satisfies OrganizerDashboardTransaction;
    });

    const rows = [...onlineRows, ...offlineRows];

    return Array.from(
      rows
        .reduce((map, row) => {
          const key = [row.id, row.eventId, row.ticketBlock, row.source].join("|").toLowerCase();
          map.set(key, row);
          return map;
        }, new Map<string, OrganizerDashboardTransaction>())
        .values(),
    );
  }, [offlineBookings, organizerApiBookings, unifiedBookings]);

  const dashboardEvents = useMemo<OrganizerDashboardEventRow[]>(() => {
    const eventMap = new Map<string, OrganizerDashboardEventRow>();

    organizerApiEvents.forEach((event) => {
      const status = unifiedStatusToOrganizer(backendEventStatusToUnified(event.status));
      const action = getOrganizerDashboardAction(status);
      const capacity = organizerDashboardSafeNumber(event.totalSeats ?? event.capacity);
      const ticketsSold = Math.max(0, capacity - organizerDashboardSafeNumber(event.availableSeats ?? capacity));

      eventMap.set(String(event.id), {
        id: String(event.id),
        name: String(event.title ?? "Untitled Event"),
        category: String(event.category ?? "Event"),
        status,
        dateLabel: formatOrganizerDashboardDate(event.startDate),
        timeLabel: formatOrganizerDashboardTime(event.startDate ? new Date(event.startDate).toTimeString().slice(0, 5) : undefined),
        city: String(event.city ?? event.venue?.city ?? "City pending"),
        venue: String(event.venueName ?? event.venue?.name ?? "Venue pending"),
        revenue: organizerDashboardSafeNumber(event.revenue),
        pendingRevenue: 0,
        bookings: organizerDashboardSafeNumber(event.bookingCount),
        ticketsSold,
        attendees: ticketsSold,
        checkedIn: 0,
        capacity,
        ticketTypes: Array.isArray(event.ticketTypes) ? event.ticketTypes.length : 0,
        occupancy: capacity ? Math.min(100, Math.round((ticketsSold / capacity) * 100)) : 0,
        approvalNote: getOrganizerDashboardApprovalNote(status),
        nextActionLabel: action.label,
        nextActionHref: action.href,
        sourceBreakdown: ["Online", "Offline", "Reserved", "Free"].map((source) => ({
          source: source as OrganizerDashboardBookingSource,
          bookings: 0,
          tickets: 0,
          revenue: 0,
        })),
      });
    });

    events.forEach((event) => {
      if (eventMap.has(event.id)) return;
      const status = unifiedStatusToOrganizer(event.status);
      const action = getOrganizerDashboardAction(status);
      const capacity = getOrganizerDashboardCapacity(event);
      const blocks = (event as UnifiedBuizzEvent & { ticketBlocks?: Array<unknown> }).ticketBlocks;

      eventMap.set(event.id, {
        id: event.id,
        name: event.title,
        category: event.subCategory || event.category || "Event",
        status,
        dateLabel: formatOrganizerDashboardDate(event.date),
        timeLabel: formatOrganizerDashboardTime(event.time),
        city: event.city || "City pending",
        venue: event.venueName || "Venue pending",
        revenue: 0,
        pendingRevenue: 0,
        bookings: 0,
        ticketsSold: 0,
        attendees: 0,
        checkedIn: 0,
        capacity,
        ticketTypes: Array.isArray(blocks) ? blocks.length : 0,
        occupancy: 0,
        approvalNote: getOrganizerDashboardApprovalNote(status),
        nextActionLabel: getOrganizerDashboardAction(status).label,
        nextActionHref: action.href,
        sourceBreakdown: ["Online", "Offline", "Reserved", "Free"].map((source) => ({
          source: source as OrganizerDashboardBookingSource,
          bookings: 0,
          tickets: 0,
          revenue: 0,
        })),
      });
    });

    transactions.forEach((transaction) => {
      const existing = eventMap.get(transaction.eventId) ?? eventMap.get(transaction.eventName);
      const key = existing?.id ?? transaction.eventId;
      const fallbackStatus: OrganizerDashboardEventStatus = "Published";
      const fallbackAction = getOrganizerDashboardAction(fallbackStatus);
      const row = existing ?? {
        id: transaction.eventId || transaction.eventName,
        name: transaction.eventName,
        category: "Event",
        status: fallbackStatus,
        dateLabel: "Date pending",
        timeLabel: "Time pending",
        city: "City pending",
        venue: "Venue pending",
        revenue: 0,
        pendingRevenue: 0,
        bookings: 0,
        ticketsSold: 0,
        attendees: 0,
        checkedIn: 0,
        capacity: 0,
        ticketTypes: 0,
        occupancy: 0,
        approvalNote: getOrganizerDashboardApprovalNote(fallbackStatus),
        nextActionLabel: fallbackAction.label,
        nextActionHref: fallbackAction.href,
        sourceBreakdown: ["Online", "Offline", "Reserved", "Free"].map((source) => ({
          source: source as OrganizerDashboardBookingSource,
          bookings: 0,
          tickets: 0,
          revenue: 0,
        })),
      } satisfies OrganizerDashboardEventRow;

      const checkedInByScanner = checkIns.some((checkIn) =>
        transaction.id.includes(checkIn.bookingId) || transaction.id.includes(checkIn.ticketId),
      );
      const settled = transaction.status === "Successful" || transaction.status === "Checked In" || checkedInByScanner;
      const nextSourceBreakdown = row.sourceBreakdown.map((sourceRow) =>
        sourceRow.source === transaction.source
          ? {
            ...sourceRow,
            bookings: sourceRow.bookings + 1,
            tickets: sourceRow.tickets + transaction.quantity,
            revenue: sourceRow.revenue + (settled ? transaction.amount : 0),
          }
          : sourceRow,
      );

      const nextRevenue = row.revenue + (settled ? transaction.amount : 0);
      const nextTicketsSold = row.ticketsSold + (transaction.status === "Cancelled" ? 0 : transaction.quantity);
      const nextBookings = row.bookings + 1;
      const nextCheckedIn = row.checkedIn + (transaction.status === "Checked In" || checkedInByScanner ? transaction.quantity : 0);
      const nextCapacity = row.capacity;

      eventMap.set(key, {
        ...row,
        revenue: nextRevenue,
        pendingRevenue: row.pendingRevenue + (transaction.status === "Pending" ? transaction.amount : 0),
        bookings: nextBookings,
        ticketsSold: nextTicketsSold,
        attendees: Math.max(row.attendees, nextTicketsSold),
        checkedIn: nextCheckedIn,
        occupancy: nextCapacity ? Math.min(100, Math.round((nextTicketsSold / nextCapacity) * 100)) : 0,
        sourceBreakdown: nextSourceBreakdown,
      });
    });

    return Array.from(eventMap.values()).sort((a, b) => b.revenue - a.revenue || b.ticketsSold - a.ticketsSold);
  }, [checkIns, events, organizerApiEvents, transactions]);

  const sourceSummary = useMemo(() => {
    const sources: OrganizerDashboardBookingSource[] = ["Online", "Offline", "Reserved", "Free"];
    return sources.map((source) => {
      const sourceRows = dashboardEvents.flatMap((event) => event.sourceBreakdown).filter((row) => row.source === source);
      return {
        source,
        bookings: sourceRows.reduce((sum, row) => sum + row.bookings, 0),
        tickets: sourceRows.reduce((sum, row) => sum + row.tickets, 0),
        revenue: sourceRows.reduce((sum, row) => sum + row.revenue, 0),
      };
    });
  }, [dashboardEvents]);

  const dashboardMetrics = useMemo(() => {
    const totalEvents = dashboardEvents.length;
    const activeEvents = dashboardEvents.filter((event) => event.status === "Published").length;
    const pendingReviews = dashboardEvents.filter((event) => event.status === "Pending Review").length;
    const draftEvents = dashboardEvents.filter((event) => event.status === "Draft").length;
    const totalBookings = dashboardEvents.reduce((sum, event) => sum + event.bookings, 0);
    const totalTickets = dashboardEvents.reduce((sum, event) => sum + event.ticketsSold, 0);
    const totalRevenue = dashboardEvents.reduce((sum, event) => sum + event.revenue, 0);
    const pendingRevenue = dashboardEvents.reduce((sum, event) => sum + event.pendingRevenue, 0);
    const checkedIn = dashboardEvents.reduce((sum, event) => sum + event.checkedIn, 0);
    const capacity = dashboardEvents.reduce((sum, event) => sum + event.capacity, 0);
    const occupancyRate = capacity ? Math.round((totalTickets / capacity) * 100) : 0;
    const cancelledTransactions = transactions.filter((transaction) => transaction.status === "Cancelled").length;

    return {
      totalEvents: organizerDashboardSafeNumber(organizerApiAnalytics?.totalEvents) || totalEvents,
      activeEvents: organizerDashboardSafeNumber(organizerApiAnalytics?.publishedEvents) || activeEvents,
      pendingReviews,
      draftEvents: organizerDashboardSafeNumber(organizerApiAnalytics?.draftEvents) || draftEvents,
      totalBookings: organizerDashboardSafeNumber(organizerApiAnalytics?.totalBookings) || totalBookings,
      totalTickets: organizerDashboardSafeNumber(organizerApiAnalytics?.totalTickets) || totalTickets,
      totalRevenue: organizerDashboardSafeNumber(organizerApiAnalytics?.totalRevenue) || totalRevenue,
      pendingRevenue,
      checkedIn: organizerDashboardSafeNumber(organizerApiAnalytics?.checkedIn) || checkedIn,
      capacity,
      occupancyRate,
      cancelledTransactions,
    };
  }, [dashboardEvents, organizerApiAnalytics, transactions]);

  const statusRows = useMemo(() => {
    const statuses: OrganizerDashboardEventStatus[] = [
      "Draft",
      "Pending Review",
      "Approved",
      "Published",
      "Completed",
      "Cancelled",
    ];

    return statuses.map((status) => ({
      status,
      value: dashboardEvents.filter((event) => event.status === status).length,
    }));
  }, [dashboardEvents]);

  const visibleDashboardEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    const filtered = dashboardEvents.filter((event) => {
      const matchesSearch =
        !query ||
        event.name.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query) ||
        event.city.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.status.toLowerCase().includes(query);
      const matchesStatus = eventStatusFilter === "All" || event.status === eventStatusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (eventSortBy === "Tickets") return b.ticketsSold - a.ticketsSold;
      if (eventSortBy === "Bookings") return b.bookings - a.bookings;
      if (eventSortBy === "Status") return a.status.localeCompare(b.status);
      return b.revenue - a.revenue;
    });
  }, [dashboardEvents, eventSearch, eventSortBy, eventStatusFilter]);

  const activityRows = useMemo<OrganizerDashboardActivityRow[]>(() => {
    const latestTransactions = [...transactions]
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
      .slice(0, 4)
      .map((transaction) => ({
        id: `booking-${transaction.id}`,
        title: `${transaction.source} booking ${transaction.status.toLowerCase()}`,
        detail: `${transaction.customerName} • ${transaction.eventName} • ${organizerDashboardMoney(transaction.amount)}`,
        tone: transaction.status === "Successful" || transaction.status === "Checked In" ? "success" : transaction.status === "Pending" ? "warning" : "muted",
        href: "/organizer/bookings",
      }) satisfies OrganizerDashboardActivityRow);

    const eventActivities = dashboardEvents
      .filter((event) => event.status === "Draft" || event.status === "Pending Review" || event.status === "Published" || event.status === "Rejected")
      .slice(0, 3)
      .map((event) => ({
        id: `event-${event.id}`,
        title: `${event.status} event`,
        detail: `${event.name} • ${event.approvalNote}`,
        tone: event.status === "Published" ? "success" : event.status === "Pending Review" ? "warning" : event.status === "Rejected" ? "muted" : "brand",
        href: event.nextActionHref,
      }) satisfies OrganizerDashboardActivityRow);

    return [...latestTransactions, ...eventActivities].slice(0, 6);
  }, [dashboardEvents, transactions]);

  const actionItems: OrganizerDashboardActionItem[] = [
    {
      label: "Create Event",
      detail: "Start a draft and submit for Buizz approval.",
      href: "/organizer/create-event",
      icon: PlusCircle,
      tone: "primary",
    },
    {
      label: "Offline Ticket",
      detail: "Issue counter, reserved, or free passes.",
      href: "/organizer/offline-booking",
      icon: Ticket,
      tone: "soft",
    },
    {
      label: "QR Check-in",
      detail: "Validate ticket at venue gate.",
      href: "/organizer/qr-check-in",
      icon: QrCode,
      tone: "secondary",
    },
    {
      label: "Revenue",
      detail: "Track earnings and payout status.",
      href: "/organizer/revenue",
      icon: DollarSign,
      tone: "soft",
    },
    {
      label: "Analytics",
      detail: "Review demand and occupancy.",
      href: "/organizer/analytics",
      icon: BarChart3,
      tone: "soft",
    },
    {
      label: "Support",
      detail: "Handle open support tickets.",
      href: "/organizer/support",
      icon: HeadphonesIcon,
      tone: "soft",
    },
  ];

  const pageOverviewItems = [
    {
      label: "Events",
      value: `${dashboardMetrics.totalEvents} total`,
      detail: `${dashboardMetrics.activeEvents} live, ${dashboardMetrics.pendingReviews} in review`,
      href: "/organizer/my-events",
      icon: Calendar,
      status: "Manage",
    },
    {
      label: "Create Event",
      value: `${dashboardMetrics.draftEvents} drafts`,
      detail: dashboardMetrics.draftEvents ? "Drafts need completion before review" : "Create a new event draft",
      href: "/organizer/create-event",
      icon: PlusCircle,
      status: "Create",
    },
    {
      label: "Bookings",
      value: dashboardMetrics.totalBookings.toLocaleString("en-IN"),
      detail: "Real online, offline, reserved and free records",
      href: "/organizer/bookings",
      icon: Ticket,
      status: "Track",
    },
    {
      label: "QR Check-in",
      value: dashboardMetrics.checkedIn.toLocaleString("en-IN"),
      detail: "Validated entry and used-ticket records",
      href: "/organizer/qr-check-in",
      icon: QrCode,
      status: "Gate",
    },
    {
      label: "Revenue",
      value: organizerDashboardMoney(dashboardMetrics.totalRevenue),
      detail: `${organizerDashboardMoney(dashboardMetrics.pendingRevenue)} pending settlement`,
      href: "/organizer/revenue",
      icon: DollarSign,
      status: "Payout",
    },
    {
      label: "Analytics",
      value: `${dashboardMetrics.occupancyRate}%`,
      detail: `${dashboardMetrics.totalTickets.toLocaleString("en-IN")} sold of ${dashboardMetrics.capacity || "unset"} capacity`,
      href: "/organizer/analytics",
      icon: BarChart3,
      status: "Insights",
    },
    {
      label: "Offers",
      value: `${offerCampaignCount} active`,
      detail: offerCampaignCount ? "Active offer records from offers module" : "No active campaign created yet",
      href: "/organizer/offers",
      icon: Megaphone,
      status: "Promote",
    },
    {
      label: "Support",
      value: `${supportTicketsCount} open`,
      detail: supportTicketsCount ? "Open organizer support work" : "No open support tickets",
      href: "/organizer/support",
      icon: HeadphonesIcon,
      status: "Resolve",
    },
  ];

  const visualTrendRows = useMemo(() => {
    const now = new Date();
    const weekStarts = [21, 14, 7, 0].map((offset) => {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - offset);
      return start;
    });

    const rows = weekStarts.map((start, index) => {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return {
        label: index === weekStarts.length - 1 ? "This week" : `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
        start,
        end,
        revenue: 0,
        tickets: 0,
        bookings: 0,
      };
    });

    transactions.forEach((transaction) => {
      const date = new Date(transaction.issuedAt);
      const bucketIndex = Number.isNaN(date.getTime())
        ? rows.length - 1
        : rows.findIndex((row) => date >= row.start && date <= row.end);
      const bucket = rows[bucketIndex === -1 ? rows.length - 1 : bucketIndex];
      bucket.revenue += transaction.status === "Successful" || transaction.status === "Checked In" ? transaction.amount : 0;
      bucket.tickets += transaction.status === "Cancelled" ? 0 : transaction.quantity;
      bucket.bookings += 1;
    });

    return rows.map(({ label, revenue, tickets, bookings }) => ({ label, revenue, tickets, bookings }));
  }, [transactions]);

  const topEventsForVisuals = dashboardEvents.slice(0, 4);
  const featuredEvent = dashboardEvents.find((event) => event.status === "Published") ?? dashboardEvents[0] ?? null;
  const hasOrganizerData = dashboardEvents.length > 0 || transactions.length > 0 || supportTicketsCount > 0 || offerCampaignCount > 0;
  const isApiLoading = analyticsFetching || eventsFetching || bookingsFetching;

  const refreshDashboard = () => {
    setLoading(true);
    void Promise.all([
      refetchOrganizerAnalytics(),
      refetchOrganizerEvents(),
      refetchOrganizerBookings(),
    ]).finally(() => {
      loadDashboardBaseData();
      setLoading(false);
    });
  };

  const resetEventFilters = () => {
    setEventSearch("");
    setEventStatusFilter("All");
    setEventSortBy("Revenue");
  };

  return (
    <div className="mx-auto grid w-full max-w-[1500px] min-w-0 gap-3 overflow-x-hidden sm:gap-4">
      <section className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <OrganizerDashboardMetricCard title="Revenue" value={organizerDashboardMoney(dashboardMetrics.totalRevenue)} detail={`${organizerDashboardMoney(dashboardMetrics.pendingRevenue)} pending`} icon={DollarSign} />
        <OrganizerDashboardMetricCard title="Tickets" value={dashboardMetrics.totalTickets.toLocaleString("en-IN")} detail={`${dashboardMetrics.totalBookings} bookings`} icon={Ticket} />
        <OrganizerDashboardMetricCard title="Events" value={dashboardMetrics.activeEvents.toLocaleString("en-IN")} detail={`${dashboardMetrics.pendingReviews} in review`} icon={Calendar} />
        <OrganizerDashboardMetricCard title="Check-ins" value={dashboardMetrics.checkedIn.toLocaleString("en-IN")} detail={`${supportTicketsCount} support open`} icon={Users} />
      </section>

      {!hasOrganizerData ? (
        <OrganizerDashboardEmptyState
          title="No organizer activity yet"
          detail="Create your first event or issue a booking. This dashboard updates from event, booking, revenue, check-in, offer, and support records saved by other organizer pages."
          href="/organizer/create-event"
          actionLabel="Create Event"
        />
      ) : null}

      <section className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)] sm:text-xs">
              Live module overview
            </p>
            <p className="mt-1 text-[10px] font-semibold text-[var(--app-muted)] sm:text-xs">
              {lastUpdatedAt ? `Updated ${lastUpdatedAt}` : "Ready"} • Click any card to open the real module.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={loading || isApiLoading}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[10px] font-black text-[var(--app-foreground)] disabled:opacity-60 sm:min-h-10 sm:text-xs"
            >
              <RefreshCw className={`size-3.5 ${loading || isApiLoading ? "animate-spin" : ""}`} />
              {loading || isApiLoading ? "Refreshing" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => downloadOrganizerDashboardCsv(visibleDashboardEvents)}
              disabled={!visibleDashboardEvents.length}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-brand-primary)] px-3 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:text-xs"
            >
              <Download className="size-3.5" />
              Export
            </button>
          </div>
        </div>

        <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {pageOverviewItems.map((item) => (
            <OrganizerDashboardModuleCard key={item.label} item={item} />
          ))}
        </div>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <DashboardSideCard title="Business visuals" eyebrow="Live data">
          <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <OrganizerDashboardTrendVisual rows={visualTrendRows} />
            <OrganizerDashboardSourceVisual rows={sourceSummary} />
            <OrganizerDashboardStatusVisual rows={statusRows} />
            <OrganizerDashboardTopEventsVisual events={topEventsForVisuals} />
          </div>
        </DashboardSideCard>

        {featuredEvent ? (
          <DashboardSideCard title="Focus event" eyebrow="Auto selected">
            <div className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-base font-black text-[var(--app-foreground)] sm:text-lg">
                    {featuredEvent.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-[var(--app-muted)] sm:text-xs">
                    {featuredEvent.city} • {featuredEvent.venue} • {featuredEvent.dateLabel}
                  </p>
                </div>
                <StatusPill label={featuredEvent.status} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <DashboardMiniMetric label="Tickets" value={featuredEvent.ticketsSold.toLocaleString("en-IN")} />
                <DashboardMiniMetric label="Revenue" value={organizerDashboardMoney(featuredEvent.revenue)} />
                <DashboardMiniMetric label="Filled" value={`${featuredEvent.occupancy}%`} />
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between gap-3 text-[10px] font-black text-[var(--app-muted)]">
                  <span>Capacity</span>
                  <span>{featuredEvent.capacity ? `${featuredEvent.ticketsSold}/${featuredEvent.capacity}` : "Not set"}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--app-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-brand-primary)]"
                    style={{ width: `${featuredEvent.capacity ? Math.min(100, featuredEvent.occupancy) : 0}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Link href={featuredEvent.nextActionHref} className="inline-flex min-h-8 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] px-2 text-[10px] font-black text-white sm:min-h-9 sm:px-3 sm:text-[11px]">
                  {featuredEvent.nextActionLabel}
                </Link>
                <Link href="/organizer/bookings" className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--app-border)] px-2 text-[10px] font-black sm:min-h-9 sm:px-3 sm:text-[11px]">
                  Bookings
                </Link>
                <Link href="/organizer/analytics" className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--app-border)] px-2 text-[10px] font-black sm:min-h-9 sm:px-3 sm:text-[11px]">
                  Analytics
                </Link>
              </div>
            </div>
          </DashboardSideCard>
        ) : null}
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid min-w-0 gap-3">
          <div className="flex min-w-0 flex-col gap-3 rounded-[1.2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] sm:rounded-[1.5rem] sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)] sm:text-xs">
                  Events
                </p>
                <h2 className="mt-1 text-lg font-black sm:text-xl">Event operations</h2>
              </div>
              <Link href="/organizer/my-events" className="shrink-0 rounded-full border border-[var(--app-border)] px-3 py-1.5 text-[11px] font-black text-[var(--color-brand-primary)]">
                View all
              </Link>
            </div>

            <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_170px_150px_auto]">
              <input
                value={eventSearch}
                onChange={(event) => setEventSearch(event.target.value)}
                placeholder="Search event, city, venue, status..."
                className="min-h-9 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[11px] font-semibold outline-none focus:border-[var(--color-brand-primary)] sm:min-h-10 sm:text-xs"
              />

              <select
                value={eventStatusFilter}
                onChange={(event) => setEventStatusFilter(event.target.value as "All" | OrganizerDashboardEventStatus)}
                className="min-h-9 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[11px] font-black outline-none focus:border-[var(--color-brand-primary)] sm:min-h-10 sm:text-xs"
              >
                <option value="All">All Status</option>
                {statusRows.map((row) => (
                  <option key={`filter-${row.status}`} value={row.status}>{row.status}</option>
                ))}
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={eventSortBy}
                onChange={(event) => setEventSortBy(event.target.value as "Revenue" | "Tickets" | "Bookings" | "Status")}
                className="min-h-9 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[11px] font-black outline-none focus:border-[var(--color-brand-primary)] sm:min-h-10 sm:text-xs"
              >
                <option value="Revenue">Revenue</option>
                <option value="Tickets">Tickets</option>
                <option value="Bookings">Bookings</option>
                <option value="Status">Status</option>
              </select>

              <button
                type="button"
                onClick={resetEventFilters}
                className="min-h-9 rounded-xl border border-[var(--app-border)] px-3 text-[11px] font-black sm:min-h-10 sm:text-xs"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid min-w-0 gap-2">
            {visibleDashboardEvents.slice(0, 8).map((event) => (
              <OrganizerDashboardEventCard key={`organizer-dashboard-event-${event.id}`} event={event} />
            ))}
            {!visibleDashboardEvents.length ? (
              <OrganizerDashboardEmptyState
                title="No matching event records"
                detail="Change search or status filters. Event rows appear here from the same event records used by My Events, bookings, and approval status."
                href="/organizer/my-events"
                actionLabel="Open My Events"
              />
            ) : null}
          </div>
        </div>

        <aside className="grid min-w-0 content-start gap-3">
          <DashboardSideCard title="Shortcuts" eyebrow="Actions">
            <div className="grid grid-cols-2 gap-2">
              {actionItems.map((item) => (
                <OrganizerDashboardActionTile key={item.label} item={item} />
              ))}
            </div>
          </DashboardSideCard>

          <DashboardSideCard title="Recent activity" eyebrow="Live">
            <div className="grid gap-2">
              {activityRows.map((activity) => (
                <OrganizerDashboardActivityItem key={activity.id} activity={activity} />
              ))}
              {!activityRows.length ? (
                <div className="min-w-0 rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                  No recent booking, check-in, event, or support activity yet.
                </div>
              ) : null}
            </div>
          </DashboardSideCard>
        </aside>
      </section>
    </div>
  );
}

function DashboardMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2 sm:rounded-2xl sm:p-3">
      <p className="line-clamp-1 text-[9px] font-black uppercase tracking-[0.06em] text-[var(--app-muted)] sm:text-[10px]">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-[var(--app-foreground)] sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function OrganizerDashboardMetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-[1.15rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_22px_rgba(15,23,42,0.05)] sm:rounded-[1.35rem] sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--app-muted)] sm:text-xs">
            {title}
          </p>
          <p className="mt-1 truncate text-lg font-black tracking-[-0.03em] text-[var(--app-foreground)] sm:text-2xl">
            {value}
          </p>
        </div>

        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] sm:size-9">
          <Icon className="size-4" />
        </span>
      </div>

      <p className="mt-2 line-clamp-1 text-[10px] font-semibold text-[var(--app-muted)] sm:text-xs">
        {detail}
      </p>
    </article>
  );
}

function OrganizerDashboardModuleCard({ item }: { item: OrganizerDashboardModuleItem }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group min-w-0 overflow-hidden rounded-[1.1rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]/35 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:rounded-[1.35rem] sm:p-4"
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--app-subtle)] text-[var(--color-brand-primary)] transition group-hover:bg-[var(--color-brand-primary)] group-hover:text-white sm:size-9">
          <Icon className="size-4" />
        </span>

        <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 py-1 text-[9px] font-black uppercase tracking-[0.04em] text-[var(--app-muted)] sm:text-[10px]">
          {item.status}
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <p className="line-clamp-1 text-sm font-black text-[var(--app-foreground)] sm:text-base">
          {item.label}
        </p>
        <p className="mt-1 truncate text-base font-black tracking-[-0.03em] text-[var(--color-brand-primary)] sm:text-lg">
          {item.value}
        </p>
        <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-[var(--app-muted)] sm:text-xs sm:leading-5">
          {item.detail}
        </p>
      </div>
    </Link>
  );
}

function OrganizerDashboardTrendVisual({
  rows,
}: {
  rows: Array<{ label: string; revenue: number; tickets: number; bookings: number }>;
}) {
  const safeRows = rows.length
    ? rows
    : [{ label: "No data", revenue: 0, tickets: 0, bookings: 0 }];

  const hasMovement = safeRows.some((row) => row.revenue > 0 || row.tickets > 0 || row.bookings > 0);
  const maxRevenue = Math.max(...safeRows.map((row) => row.revenue), 1);
  const maxTickets = Math.max(...safeRows.map((row) => row.tickets), 1);
  const totalRevenue = safeRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalTickets = safeRows.reduce((sum, row) => sum + row.tickets, 0);
  const totalBookings = safeRows.reduce((sum, row) => sum + row.bookings, 0);
  const bestRow = safeRows.reduce((best, row) => (row.revenue > best.revenue ? row : best), safeRows[0]);

  const chartWidth = 360;
  const chartHeight = 150;
  const left = 18;
  const right = 342;
  const top = 22;
  const bottom = 114;
  const usableWidth = right - left;
  const usableHeight = bottom - top;

  const getPoint = (row: (typeof safeRows)[number], index: number) => {
    const x = safeRows.length === 1 ? chartWidth / 2 : left + (index / (safeRows.length - 1)) * usableWidth;
    const y = bottom - (row.revenue / maxRevenue) * usableHeight;
    return {
      x,
      y: Math.max(top, Math.min(bottom, y)),
    };
  };

  const points = safeRows.map(getPoint);
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const fillPoints = `${left},${bottom + 2} ${linePoints} ${right},${bottom + 2}`;

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:rounded-[1.35rem]">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-[var(--app-foreground)]">Revenue trend</p>
          <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-[var(--app-muted)]">
            Updates from booking records
          </p>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <BarChart3 className="size-4" />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2">
          <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Revenue</p>
          <p className="mt-1 truncate text-xs font-black text-[var(--app-foreground)]">
            {organizerDashboardMoney(totalRevenue)}
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2">
          <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Tickets</p>
          <p className="mt-1 truncate text-xs font-black text-[var(--app-foreground)]">
            {totalTickets.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2">
          <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Orders</p>
          <p className="mt-1 truncate text-xs font-black text-[var(--app-foreground)]">
            {totalBookings.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2.5">
        {!hasMovement ? (
          <div className="grid min-h-[160px] place-items-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-center">
            <div className="max-w-[220px]">
              <p className="text-xs font-black text-[var(--app-foreground)]">No revenue movement yet</p>
              <p className="mt-1 text-[10px] font-semibold leading-4 text-[var(--app-muted)]">
                Bookings created from online or offline modules will appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Organizer revenue trend"
              className="h-[150px] w-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="organizerDashboardRevenueFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity="0.03" />
                </linearGradient>
              </defs>

              <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="var(--app-border)" strokeWidth="1" />
              <line x1={left} y1="84" x2={right} y2="84" stroke="var(--app-border)" strokeWidth="1" strokeDasharray="4 6" />
              <line x1={left} y1="54" x2={right} y2="54" stroke="var(--app-border)" strokeWidth="1" strokeDasharray="4 6" />
              <line x1={left} y1="24" x2={right} y2="24" stroke="var(--app-border)" strokeWidth="1" strokeDasharray="4 6" />

              <polygon points={fillPoints} fill="url(#organizerDashboardRevenueFill)" />

              <polyline
                points={linePoints}
                fill="none"
                stroke="var(--color-brand-primary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {points.map((point, index) => (
                <g key={`revenue-dot-${safeRows[index].label}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="var(--app-elevated)"
                    stroke="var(--color-brand-primary)"
                    strokeWidth="3"
                  />
                </g>
              ))}
            </svg>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {safeRows.map((row, index) => {
                const ticketPercent = Math.max(4, Math.round((row.tickets / maxTickets) * 100));
                const revenuePercent = Math.max(4, Math.round((row.revenue / maxRevenue) * 100));

                return (
                  <div
                    key={`revenue-period-${row.label}-${index}`}
                    className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2"
                  >
                    <p className="truncate text-[10px] font-black text-[var(--app-foreground)]">
                      {row.label}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-black text-[var(--color-brand-primary)]">
                      {organizerDashboardMoney(row.revenue)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-[var(--app-muted)]">
                      {row.tickets.toLocaleString("en-IN")} tickets
                    </p>
                    <div className="mt-2 space-y-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-brand-primary)]"
                          style={{ width: `${revenuePercent}%` }}
                        />
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-brand-secondary)]"
                          style={{ width: `${ticketPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-[var(--app-muted)]">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--color-brand-primary)]" />
            Revenue
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--color-brand-secondary)]" />
            Tickets
          </span>
        </div>
        {hasMovement ? <span className="truncate">Best: {bestRow.label}</span> : null}
      </div>
    </article>
  );
}

function OrganizerDashboardSourceVisual({
  rows,
}: {
  rows: Array<{ source: OrganizerDashboardBookingSource; bookings: number; tickets: number; revenue: number }>;
}) {
  const totalTickets = rows.reduce((sum, row) => sum + row.tickets, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <article className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-[var(--app-foreground)]">Booking source</p>
          <p className="mt-0.5 text-[10px] font-semibold text-[var(--app-muted)]">Online, offline, reserved, free</p>
        </div>
        <Ticket className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
      </div>

      <div className="mt-3 grid gap-2">
        {rows.map((row) => {
          const ticketPercent = totalTickets ? Math.round((row.tickets / totalTickets) * 100) : 0;

          return (
            <Link key={row.source} href="/organizer/bookings" className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 transition hover:border-[var(--color-brand-primary)]/40">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="text-[11px] font-black text-[var(--app-foreground)]">{row.source}</p>
                <p className="shrink-0 text-[10px] font-black text-[var(--app-muted)]">{ticketPercent}%</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--app-subtle)]">
                <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${ticketPercent}%` }} />
              </div>
              <p className="mt-1 text-[10px] font-semibold text-[var(--app-muted)]">
                {row.bookings} orders • {row.tickets} tickets • {organizerDashboardMoney(row.revenue)}
              </p>
            </Link>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] font-black text-[var(--app-muted)]">
        Total source revenue: {organizerDashboardMoney(totalRevenue)}
      </p>
    </article>
  );
}

function OrganizerDashboardStatusVisual({
  rows,
}: {
  rows: Array<{ status: OrganizerDashboardEventStatus; value: number }>;
}) {
  const total = Math.max(rows.reduce((sum, row) => sum + row.value, 0), 1);

  return (
    <article className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-[var(--app-foreground)]">Event status</p>
          <p className="mt-0.5 text-[10px] font-semibold text-[var(--app-muted)]">From event lifecycle records</p>
        </div>
        <ShieldCheck className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {rows.map((row) => {
          const percent = Math.round((row.value / total) * 100);

          return (
            <Link key={row.status} href="/organizer/my-events" className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 transition hover:border-[var(--color-brand-primary)]/40">
              <p className="line-clamp-1 text-[9px] font-black uppercase tracking-[0.05em] text-[var(--app-muted)]">{row.status}</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="text-lg font-black text-[var(--app-foreground)]">{row.value}</p>
                <p className="text-[10px] font-black text-[var(--app-muted)]">{percent}%</p>
              </div>
            </Link>
          );
        })}
      </div>
    </article>
  );
}

function OrganizerDashboardTopEventsVisual({ events }: { events: OrganizerDashboardEventRow[] }) {
  const maxRevenue = Math.max(...events.map((event) => event.revenue), 1);

  return (
    <article className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-[var(--app-foreground)]">Top events</p>
          <p className="mt-0.5 text-[10px] font-semibold text-[var(--app-muted)]">Sorted by ticket revenue</p>
        </div>
        <Star className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
      </div>

      <div className="mt-3 grid gap-2">
        {events.map((event) => {
          const percent = Math.round((event.revenue / maxRevenue) * 100);

          return (
            <Link key={`top-event-visual-${event.id}`} href="/organizer/analytics" className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 transition hover:border-[var(--color-brand-primary)]/40">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="line-clamp-1 text-[11px] font-black text-[var(--app-foreground)]">{event.name}</p>
                <p className="shrink-0 text-[10px] font-black text-[#15803D]">{organizerDashboardMoney(event.revenue)}</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--app-subtle)]">
                <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${percent}%` }} />
              </div>
            </Link>
          );
        })}

        {!events.length ? (
          <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-center text-[10px] font-bold leading-4 text-[var(--app-muted)]">
            No event revenue yet
          </div>
        ) : null}
      </div>
    </article>
  );
}

function OrganizerDashboardEmptyState({
  title,
  detail,
  href,
  actionLabel,
}: {
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <section className="min-w-0 rounded-[1.35rem] border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-5">
      <p className="text-base font-black text-[var(--app-foreground)] sm:text-lg">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
        {detail}
      </p>
      <Link href={href} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white">
        {actionLabel}
      </Link>
    </section>
  );
}

function OrganizerDashboardEventCard({ event }: { event: OrganizerDashboardEventRow }) {
  const health = getOrganizerDashboardHealth(event);

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_22px_rgba(15,23,42,0.05)] sm:rounded-[1.5rem] sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <StatusPill label={event.status} />
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 py-1 text-[9px] font-black text-[var(--app-muted)]">
              {health}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-black text-[var(--app-foreground)] sm:text-base">
            {event.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-[var(--app-muted)] sm:text-xs">
            {event.city} • {event.venue} • {event.dateLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--app-subtle)] px-2 py-1 text-[9px] font-black text-[var(--app-muted)]">
          {event.category}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
        <DashboardMiniMetric label="Tkt" value={event.ticketsSold.toLocaleString("en-IN")} />
        <DashboardMiniMetric label="Rev" value={organizerDashboardMoney(event.revenue)} />
        <DashboardMiniMetric label="Book" value={event.bookings.toLocaleString("en-IN")} />
        <DashboardMiniMetric label="Gate" value={event.checkedIn.toLocaleString("en-IN")} />
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 text-[9px] font-black text-[var(--app-muted)]">
            <span>Occupancy</span>
            <span>{event.capacity ? `${event.ticketsSold}/${event.capacity}` : "Not set"}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--app-subtle)]">
            <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${Math.min(100, event.occupancy)}%` }} />
          </div>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <Link href={event.nextActionHref} className="inline-flex min-h-8 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] px-2.5 text-[10px] font-black text-white sm:px-3 sm:text-[11px]">
            {event.nextActionLabel}
          </Link>
          <Link href="/organizer/bookings" className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--app-border)] px-2.5 text-[10px] font-black sm:px-3 sm:text-[11px]">
            Bookings
          </Link>
        </div>
      </div>
    </article>
  );
}

function OrganizerDashboardActionTile({ item }: { item: OrganizerDashboardActionItem }) {
  const Icon = item.icon;
  const tone =
    item.tone === "primary"
      ? "bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)]"
      : item.tone === "secondary"
        ? "bg-[var(--color-brand-secondary)]/10 text-[var(--color-brand-secondary)] border-[var(--color-brand-secondary)]/25"
        : "bg-[var(--app-subtle)] text-[var(--app-foreground)] border-[var(--app-border)]";

  return (
    <Link href={item.href} className={`grid min-w-0 grid-cols-[28px_minmax(0,1fr)] items-center gap-2 rounded-2xl border p-2.5 transition hover:-translate-y-0.5 ${tone}`}>
      <span className="grid size-7 place-items-center rounded-lg bg-white/10">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="line-clamp-1 block text-[11px] font-black sm:text-xs">{item.label}</span>
        <span className="line-clamp-1 block text-[9px] font-semibold opacity-75 sm:text-[10px]">{item.detail}</span>
      </span>
    </Link>
  );
}

function OrganizerDashboardStatusBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2.5 sm:p-3">
      <p className="line-clamp-1 text-[9px] font-black uppercase tracking-[0.08em] text-[var(--app-muted)] sm:text-[10px]">{label}</p>
      <p className="mt-1 text-lg font-black text-[var(--app-foreground)] sm:text-xl">{value}</p>
    </div>
  );
}

function OrganizerDashboardActivityItem({ activity }: { activity: OrganizerDashboardActivityRow }) {
  const tone =
    activity.tone === "success"
      ? "bg-[#22C55E]"
      : activity.tone === "warning"
        ? "bg-[var(--color-brand-accent)]"
        : activity.tone === "brand"
          ? "bg-[var(--color-brand-primary)]"
          : "bg-[var(--app-muted)]";

  return (
    <Link href={activity.href} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2.5 transition hover:border-[var(--color-brand-primary)]/40 sm:p-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className={`mt-1 size-2 shrink-0 rounded-full ${tone}`} />
        <div className="min-w-0">
          <p className="line-clamp-1 text-xs font-black text-[var(--app-foreground)] sm:text-sm">{activity.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-4 text-[var(--app-muted)] sm:text-xs sm:leading-5">{activity.detail}</p>
        </div>
      </div>
    </Link>
  );
}

function DashboardSideCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-4">
      <div className="relative z-10 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)] sm:text-xs">
          {eyebrow}
        </p>
        <h2 className="mt-1 break-words text-lg font-black sm:text-xl">{title}</h2>
        <div className="mt-3 min-w-0">{children}</div>
      </div>
    </section>
  );
}


type RevenueDateRange = "Today" | "Last 7 Days" | "Last 30 Days" | "This Year" | "All Time";
type RevenueTransactionStatus = "Successful" | "Pending" | "Refunded" | "Failed";
type RevenuePayoutStatus = "Ready" | "Processing" | "Sent to Bank" | "Held";

type RevenueTransactionRow = {
  id: string;
  orderId: string;
  ticketId: string;
  eventId: string;
  event: string;
  buyerName: string;
  buyerEmail: string;
  ticketTier: string;
  quantity: number;
  gross: number;
  buyerFee: number;
  platformFee: number;
  gatewayFee: number;
  organizerFee: number;
  taxOnFees: number;
  refundAmount: number;
  net: number;
  paymentMode: string;
  source: "Online" | "Offline" | "Reserved" | "Free";
  status: RevenueTransactionStatus;
  issuedAt: string;
  couponCode: string;
};

type RevenueEventSummaryRow = {
  eventId: string;
  event: string;
  status: string;
  city: string;
  capacity: number;
  ticketsSold: number;
  gross: number;
  fees: number;
  refunds: number;
  net: number;
  refundRate: number;
  payoutStatus: RevenuePayoutStatus;
  nextPayoutDate: string;
};

function OrganizerRevenuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revenueEventIdFromUrl = searchParams?.get("eventId") ?? null;
  const {
    data: organizerRevenueResponse,
    isFetching: isRevenueFetching,
    refetch: refetchOrganizerRevenue,
  } = useGetOrganizerRevenueSummaryQuery({});
  const {
    data: organizerBookingsResponse,
    isFetching: isBookingsFetching,
    refetch: refetchOrganizerBookings,
  } = useGetOrganizerBookingsQuery({ page: 1, limit: 100 });
  const {
    data: organizerEventsResponse,
    isFetching: isEventsFetching,
  } = useGetOrganizerEventsQuery({ page: 1, limit: 100 });

  const [eventFilter, setEventFilter] = useState("All Events");
  const [dateRange, setDateRange] = useState<RevenueDateRange>("Last 30 Days");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All Status" | RevenueTransactionStatus>("All Status");
  const [sourceFilter, setSourceFilter] = useState<"All Sources" | "Online" | "Offline" | "Reserved" | "Free">("All Sources");
  const [tierFilter, setTierFilter] = useState("All Tiers");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEventId(revenueEventIdFromUrl);
  }, [revenueEventIdFromUrl]);

  const money = (value: number) => `Rs. ${Math.round(value).toLocaleString("en-IN")}`;

  const safeAmount = (value: unknown) => {
    const numberValue = Number(value ?? 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const normalizeBackendRevenueSource = (value: unknown): RevenueTransactionRow["source"] => {
    const source = String(value ?? "Online").trim().toLowerCase();
    if (source.includes("complimentary") || source.includes("free")) return "Free";
    if (source.includes("reserved")) return "Reserved";
    if (source.includes("offline") || source.includes("counter") || source.includes("cash")) return "Offline";
    return "Online";
  };

  const normalizeBackendRevenueStatus = (value: unknown): RevenueTransactionStatus => {
    const status = String(value ?? "").trim().toLowerCase();
    if (status.includes("refund")) return "Refunded";
    if (status.includes("fail") || status.includes("cancel") || status.includes("expire")) return "Failed";
    if (status.includes("pending") || status.includes("unpaid") || status.includes("process")) return "Pending";
    return "Successful";
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || "Pending";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNextPayoutDate = (offsetDays = 3) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const createTransactionRow = ({
    id,
    orderId,
    ticketId,
    eventId,
    event,
    buyerName,
    buyerEmail,
    ticketTier,
    quantity,
    amount,
    paymentMode,
    source,
    status,
    issuedAt,
    couponCode,
  }: {
    id: string;
    orderId: string;
    ticketId: string;
    eventId: string;
    event: string;
    buyerName: string;
    buyerEmail?: string;
    ticketTier: string;
    quantity: number;
    amount: number;
    paymentMode: string;
    source: "Online" | "Offline" | "Reserved" | "Free";
    status: RevenueTransactionStatus;
    issuedAt: string;
    couponCode?: string;
  }): RevenueTransactionRow => {
    const gross = Math.max(0, amount);
    const buyerFee = source === "Online" ? gross * 0.02 : 0;
    const platformFee = gross * 0.08;
    const gatewayFee = source === "Online" ? gross * 0.018 : gross * 0.006;
    const organizerFee = gross * 0.02;
    const taxOnFees = (platformFee + gatewayFee + organizerFee) * 0.18;
    const refundAmount = status === "Refunded" || status === "Failed" ? gross : 0;
    const net = status === "Successful"
      ? Math.max(gross - platformFee - gatewayFee - organizerFee - taxOnFees - refundAmount, 0)
      : 0;

    return {
      id,
      orderId,
      ticketId,
      eventId,
      event,
      buyerName,
      buyerEmail: buyerEmail || "Hidden",
      ticketTier,
      quantity: Math.max(1, quantity || 1),
      gross,
      buyerFee,
      platformFee,
      gatewayFee,
      organizerFee,
      taxOnFees,
      refundAmount,
      net,
      paymentMode,
      source,
      status,
      issuedAt,
      couponCode: couponCode || "No Coupon",
    };
  };

  const revenueTransactions = useMemo<RevenueTransactionRow[]>(() => {
    const backendBookings = Array.isArray(organizerBookingsResponse?.data)
      ? organizerBookingsResponse.data
      : [];

    return backendBookings.map((booking, index) => {
      const eventId = String(booking.eventId ?? booking.event_id ?? "unknown-event");
      const bookingId = String(booking.bookingNumber ?? booking.booking_number ?? booking.id ?? `BKG-${index + 1}`);
      const ticketId = String(booking.ticketId ?? booking.ticket_id ?? booking.transactionId ?? bookingId);
      const amount = safeAmount(booking.totalAmount ?? booking.total_amount ?? booking.amountCollected ?? booking.amount);
      const paymentStatus = booking.paymentStatus ?? booking.payment_status ?? booking.bookingStatus ?? booking.booking_status;

      return createTransactionRow({
        id: `REV-BACKEND-${String(booking.id ?? bookingId ?? index)}`,
        orderId: bookingId,
        ticketId,
        eventId,
        event: String(booking.eventTitle ?? booking.event_title ?? booking.eventName ?? "Untitled Event"),
        buyerName: String(booking.customerName ?? booking.customer_name ?? booking.name ?? "Customer"),
        buyerEmail: String(booking.customerEmail ?? booking.customer_email ?? booking.customerPhone ?? booking.customer_phone ?? "Hidden"),
        ticketTier: String(booking.ticketType ?? booking.ticket_type ?? booking.ticketBlock ?? booking.ticket_block ?? "General"),
        quantity: safeAmount(booking.quantity) || 1,
        amount,
        paymentMode: String(booking.paymentMode ?? booking.payment_mode ?? booking.source ?? "Online"),
        source: normalizeBackendRevenueSource(booking.source ?? booking.paymentMode ?? booking.payment_mode),
        status: normalizeBackendRevenueStatus(paymentStatus),
        issuedAt: String(booking.createdAt ?? booking.created_at ?? booking.issuedAt ?? new Date().toISOString()),
        couponCode: String(booking.couponCode ?? booking.coupon_code ?? "No Coupon"),
      });
    });
  }, [organizerBookingsResponse]);

  const eventMetadata = useMemo(() => {
    const map = new Map<string, { status: string; city: string; capacity: number }>();

    const backendEvents = Array.isArray(organizerEventsResponse?.data)
      ? organizerEventsResponse.data
      : [];

    backendEvents.forEach((event) => {
      const eventBlocks = Array.isArray(event.ticketBlocks ?? event.ticket_blocks)
        ? (event.ticketBlocks ?? event.ticket_blocks)
        : [];
      const capacity = Array.isArray(eventBlocks)
        ? eventBlocks.reduce((total, block) => total + safeAmount(block.totalQuantity), 0)
        : safeAmount(event.capacity ?? event.totalCapacity ?? event.total_capacity);

      map.set(String(event.id ?? event.eventId ?? event.event_id), {
        status: String(event.status ?? "Revenue Active"),
        city: String(event.city ?? event.venueCity ?? event.venue_city ?? "City pending"),
        capacity,
      });
    });

    return map;
  }, [organizerEventsResponse]);

  const backendEventRevenueRows = useMemo<RevenueEventSummaryRow[]>(() => {
    const rows = Array.isArray(organizerRevenueResponse?.data?.byEvent)
      ? organizerRevenueResponse.data.byEvent
      : [];

    return rows.map((row: Record<string, unknown>, index: number) => {
      const eventId = String(row.eventId ?? row.event_id ?? `event-${index + 1}`);
      const gross = safeAmount(row.revenue ?? row.gross ?? row.totalRevenue ?? row.total_revenue);
      const metadata = eventMetadata.get(eventId);
      const fees = gross * 0.118;

      return {
        eventId,
        event: String(row.eventTitle ?? row.event_title ?? row.eventName ?? "Untitled Event"),
        status: metadata?.status ?? "Revenue Active",
        city: metadata?.city ?? "City pending",
        capacity: metadata?.capacity ?? 0,
        ticketsSold: safeAmount(row.bookings ?? row.ticketsSold ?? row.tickets_sold),
        gross,
        fees,
        refunds: 0,
        net: Math.max(gross - fees, 0),
        refundRate: 0,
        payoutStatus: gross > 0 ? "Ready" : "Held",
        nextPayoutDate: getNextPayoutDate(3),
      };
    });
  }, [eventMetadata, organizerRevenueResponse]);

  const backendRevenueData = organizerRevenueResponse?.data ?? null;

  const eventOptions = useMemo(
    () => [
      "All Events",
      ...Array.from(
        new Set([
          ...revenueTransactions.map((item) => item.event),
          ...backendEventRevenueRows.map((item) => item.event),
        ].filter(Boolean)),
      ),
    ],
    [backendEventRevenueRows, revenueTransactions],
  );

  const tierOptions = useMemo(
    () => ["All Tiers", ...Array.from(new Set(revenueTransactions.map((item) => item.ticketTier).filter(Boolean)))],
    [revenueTransactions],
  );

  const matchesDateRange = (issuedAt: string) => {
    if (dateRange === "All Time") return true;

    const date = new Date(issuedAt);
    if (Number.isNaN(date.getTime())) return true;

    const now = new Date();
    if (dateRange === "Today") {
      return date.toDateString() === now.toDateString();
    }

    if (dateRange === "This Year") {
      return date.getFullYear() === now.getFullYear();
    }

    const days = dateRange === "Last 7 Days" ? 7 : 30;
    return now.getTime() - date.getTime() <= days * 24 * 60 * 60 * 1000;
  };

  const filteredTransactions = useMemo(() => {
    const query = ledgerSearch.trim().toLowerCase();

    return revenueTransactions.filter((item) => {
      const matchesSearch =
        !query ||
        item.buyerName.toLowerCase().includes(query) ||
        item.buyerEmail.toLowerCase().includes(query) ||
        item.orderId.toLowerCase().includes(query) ||
        item.ticketId.toLowerCase().includes(query) ||
        item.event.toLowerCase().includes(query) ||
        item.ticketTier.toLowerCase().includes(query) ||
        item.paymentMode.toLowerCase().includes(query);

      const matchesEvent = eventFilter === "All Events" || item.event === eventFilter;
      const matchesStatus = statusFilter === "All Status" || item.status === statusFilter;
      const matchesSource = sourceFilter === "All Sources" || item.source === sourceFilter;
      const matchesTier = tierFilter === "All Tiers" || item.ticketTier === tierFilter;

      return matchesSearch && matchesEvent && matchesStatus && matchesSource && matchesTier && matchesDateRange(item.issuedAt);
    });
  }, [dateRange, eventFilter, ledgerSearch, revenueTransactions, sourceFilter, statusFilter, tierFilter]);

  const settledTransactions = useMemo(
    () => filteredTransactions.filter((item) => item.status === "Successful"),
    [filteredTransactions],
  );

  const pendingTransactions = useMemo(
    () => filteredTransactions.filter((item) => item.status === "Pending"),
    [filteredTransactions],
  );

  const revenueSummary = useMemo(() => {
    if (!revenueTransactions.length && backendRevenueData) {
      const gross = safeAmount(backendRevenueData.totalRevenue ?? backendRevenueData.total_revenue);
      const transactionCount = safeAmount(backendRevenueData.totalTransactions ?? backendRevenueData.total_transactions);
      const ticketsSold = backendEventRevenueRows.reduce((sum, row) => sum + row.ticketsSold, 0) || transactionCount;
      const platformFees = gross * 0.08;
      const gatewayFees = gross * 0.018;
      const organizerFees = gross * 0.02;
      const taxOnFees = (platformFees + gatewayFees + organizerFees) * 0.18;
      const totalFees = platformFees + gatewayFees + organizerFees + taxOnFees;

      return {
        gross,
        net: Math.max(gross - totalFees, 0),
        buyerFees: gross * 0.02,
        platformFees,
        gatewayFees,
        organizerFees,
        taxOnFees,
        totalFees,
        refunds: 0,
        ticketsSold,
        transactionCount,
        refundRate: 0,
      };
    }

    const gross = settledTransactions.reduce((sum, item) => sum + item.gross, 0);
    const net = settledTransactions.reduce((sum, item) => sum + item.net, 0);
    const buyerFees = settledTransactions.reduce((sum, item) => sum + item.buyerFee, 0);
    const platformFees = settledTransactions.reduce((sum, item) => sum + item.platformFee, 0);
    const gatewayFees = settledTransactions.reduce((sum, item) => sum + item.gatewayFee, 0);
    const organizerFees = settledTransactions.reduce((sum, item) => sum + item.organizerFee, 0);
    const taxOnFees = settledTransactions.reduce((sum, item) => sum + item.taxOnFees, 0);
    const refunds = filteredTransactions.reduce((sum, item) => sum + item.refundAmount, 0);
    const ticketsSold = settledTransactions.reduce((sum, item) => sum + item.quantity, 0);
    const refundOrders = filteredTransactions.filter((item) => item.status === "Refunded" || item.status === "Failed").length;

    return {
      gross,
      net,
      buyerFees,
      platformFees,
      gatewayFees,
      organizerFees,
      taxOnFees,
      totalFees: platformFees + gatewayFees + organizerFees + taxOnFees,
      refunds,
      ticketsSold,
      transactionCount: settledTransactions.length,
      refundRate: filteredTransactions.length ? Math.round((refundOrders / filteredTransactions.length) * 100) : 0,
    };
  }, [backendEventRevenueRows, backendRevenueData, filteredTransactions, revenueTransactions.length, settledTransactions]);

  const eventRevenueRows = useMemo<RevenueEventSummaryRow[]>(() => {
    const map = new Map<string, RevenueEventSummaryRow>();

    filteredTransactions.forEach((transaction) => {
      const key = transaction.eventId || transaction.event;
      const existing = map.get(key);
      const metadata = eventMetadata.get(transaction.eventId);
      const fees =
        transaction.platformFee +
        transaction.gatewayFee +
        transaction.organizerFee +
        transaction.taxOnFees;

      const next: RevenueEventSummaryRow = existing
        ? {
          ...existing,
          ticketsSold: existing.ticketsSold + (transaction.status === "Successful" ? transaction.quantity : 0),
          gross: existing.gross + transaction.gross,
          fees: existing.fees + fees,
          refunds: existing.refunds + transaction.refundAmount,
          net: existing.net + transaction.net,
        }
        : {
          eventId: transaction.eventId || key,
          event: transaction.event,
          status: metadata?.status ?? "Revenue Active",
          city: metadata?.city ?? "City pending",
          capacity: metadata?.capacity ?? 0,
          ticketsSold: transaction.status === "Successful" ? transaction.quantity : 0,
          gross: transaction.gross,
          fees,
          refunds: transaction.refundAmount,
          net: transaction.net,
          refundRate: 0,
          payoutStatus: transaction.status === "Pending" ? "Processing" : "Ready",
          nextPayoutDate: getNextPayoutDate(3),
        };

      map.set(key, next);
    });

    backendEventRevenueRows.forEach((row) => {
      const matchesEvent = eventFilter === "All Events" || row.event === eventFilter;
      if (matchesEvent && !map.has(row.eventId)) {
        map.set(row.eventId, row);
      }
    });

    return Array.from(map.values())
      .map((row): RevenueEventSummaryRow => {
        const eventTransactions = filteredTransactions.filter(
          (transaction) => (transaction.eventId || transaction.event) === (row.eventId || row.event),
        );
        const refundCount = eventTransactions.filter((transaction) => transaction.status === "Refunded" || transaction.status === "Failed").length;
        const payoutStatus: RevenuePayoutStatus =
          row.refunds > row.gross * 0.25
            ? "Held"
            : eventTransactions.some((transaction) => transaction.status === "Pending")
              ? "Processing"
              : row.net > 0
                ? "Ready"
                : "Held";

        return {
          ...row,
          refundRate: eventTransactions.length ? Math.round((refundCount / eventTransactions.length) * 100) : 0,
          payoutStatus,
        };
      })
      .sort((a, b) => b.net - a.net);
  }, [backendEventRevenueRows, eventFilter, eventMetadata, filteredTransactions]);

  const totalCapacity = eventRevenueRows.reduce((sum, row) => sum + row.capacity, 0);
  const sellThroughRate = totalCapacity
    ? Math.round((revenueSummary.ticketsSold / totalCapacity) * 100)
    : null;

  const ticketTierRows = useMemo(() => {
    const map = new Map<string, { tier: string; units: number; gross: number; fees: number; net: number; refunds: number }>();

    filteredTransactions.forEach((transaction) => {
      const existing = map.get(transaction.ticketTier) ?? {
        tier: transaction.ticketTier,
        units: 0,
        gross: 0,
        fees: 0,
        net: 0,
        refunds: 0,
      };

      map.set(transaction.ticketTier, {
        tier: transaction.ticketTier,
        units: existing.units + (transaction.status === "Successful" ? transaction.quantity : 0),
        gross: existing.gross + transaction.gross,
        fees: existing.fees + transaction.platformFee + transaction.gatewayFee + transaction.organizerFee + transaction.taxOnFees,
        net: existing.net + transaction.net,
        refunds: existing.refunds + transaction.refundAmount,
      });
    });

    return Array.from(map.values()).sort((a, b) => b.net - a.net);
  }, [filteredTransactions]);

  const promoRows = useMemo(() => {
    const map = new Map<string, { code: string; uses: number; gross: number; estimatedDiscount: number; net: number }>();

    filteredTransactions.forEach((transaction) => {
      const code = transaction.couponCode || "No Coupon";
      const existing = map.get(code) ?? { code, uses: 0, gross: 0, estimatedDiscount: 0, net: 0 };

      map.set(code, {
        code,
        uses: existing.uses + (code === "No Coupon" ? 0 : 1),
        gross: existing.gross + transaction.gross,
        estimatedDiscount: existing.estimatedDiscount + (code === "No Coupon" ? 0 : transaction.gross * 0.1),
        net: existing.net + transaction.net,
      });
    });

    return Array.from(map.values()).sort((a, b) => b.net - a.net);
  }, [filteredTransactions]);

  const salesTimeline = useMemo(() => {
    const labels =
      dateRange === "Today"
        ? ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM"]
        : dateRange === "Last 7 Days"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          : dateRange === "This Year"
            ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            : ["Week 1", "Week 2", "Week 3", "Week 4"];

    const rows = labels.map((label) => ({ label, gross: 0, net: 0, tickets: 0 }));

    filteredTransactions.forEach((transaction, index) => {
      const date = new Date(transaction.issuedAt);
      let bucket = 0;

      if (!Number.isNaN(date.getTime())) {
        if (dateRange === "Today") bucket = Math.min(rows.length - 1, Math.max(0, Math.floor((date.getHours() - 8) / 2)));
        else if (dateRange === "Last 7 Days") bucket = Math.min(rows.length - 1, Math.max(0, date.getDay() - 1));
        else if (dateRange === "This Year") bucket = date.getMonth();
        else bucket = Math.min(3, Math.floor(index % 4));
      } else {
        bucket = index % rows.length;
      }

      rows[bucket].gross += transaction.gross;
      rows[bucket].net += transaction.net;
      rows[bucket].tickets += transaction.quantity;
    });

    return rows;
  }, [dateRange, filteredTransactions]);

  const hourlyDistribution = useMemo(() => {
    const rows = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM"].map((label) => ({
      label,
      orders: 0,
      revenue: 0,
    }));

    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.issuedAt);
      const hour = Number.isNaN(date.getTime()) ? 12 : date.getHours();
      const bucket = Math.min(rows.length - 1, Math.max(0, Math.floor((hour - 8) / 2)));
      rows[bucket].orders += 1;
      rows[bucket].revenue += transaction.gross;
    });

    return rows;
  }, [filteredTransactions]);

  const sourceBreakdownRows = useMemo(() => {
    const orderedSources: Array<RevenueTransactionRow["source"]> = ["Online", "Offline", "Reserved", "Free"];

    return orderedSources.map((source) => {
      const sourceRows = settledTransactions.filter((transaction) => transaction.source === source);
      const gross = sourceRows.reduce((sum, transaction) => sum + transaction.gross, 0);
      const net = sourceRows.reduce((sum, transaction) => sum + transaction.net, 0);
      const orders = sourceRows.length;
      const tickets = sourceRows.reduce((sum, transaction) => sum + transaction.quantity, 0);

      return { source, gross, net, orders, tickets };
    });
  }, [settledTransactions]);

  const paymentModeRows = useMemo(() => {
    const map = new Map<string, number>();

    settledTransactions.forEach((transaction) => {
      map.set(transaction.paymentMode, (map.get(transaction.paymentMode) ?? 0) + transaction.gross);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [settledTransactions]);

  const sourceChartRows = sourceBreakdownRows.map((row) => ({ name: row.source, value: row.gross }));
  const chartColors = [
    "var(--color-brand-primary)",
    "var(--color-brand-secondary)",
    "var(--color-brand-accent)",
    "#22C55E",
    "var(--app-muted)",
  ];

  const selectedEventSummary = selectedEventId
    ? eventRevenueRows.find((row) => row.eventId === selectedEventId || row.event === selectedEventId) ?? null
    : null;

  const selectedEventTransactions = selectedEventSummary
    ? filteredTransactions.filter(
      (transaction) =>
        transaction.eventId === selectedEventSummary.eventId ||
        transaction.event === selectedEventSummary.event,
    )
    : [];

  const selectedEventTiers = selectedEventSummary
    ? ticketTierRows.filter((tier) =>
      selectedEventTransactions.some((transaction) => transaction.ticketTier === tier.tier),
    )
    : [];

  const exportRowsToCsv = (filename: string, rows: Array<Array<string | number>>) => {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportLedgerCsv = () => {
    exportRowsToCsv(`buizz-organizer-revenue-ledger-${Date.now()}.csv`, [
      [
        "Date",
        "Order ID",
        "Ticket ID",
        "Buyer",
        "Event",
        "Tier",
        "Quantity",
        "Gross",
        "Buyer Fee",
        "Platform Fee",
        "Gateway Fee",
        "Organizer Fee",
        "Tax On Fees",
        "Refund",
        "Net Payout",
        "Payment Mode",
        "Source",
        "Status",
        "Coupon",
      ],
      ...filteredTransactions.map((transaction) => [
        formatDateTime(transaction.issuedAt),
        transaction.orderId,
        transaction.ticketId,
        transaction.buyerName,
        transaction.event,
        transaction.ticketTier,
        transaction.quantity,
        Math.round(transaction.gross),
        Math.round(transaction.buyerFee),
        Math.round(transaction.platformFee),
        Math.round(transaction.gatewayFee),
        Math.round(transaction.organizerFee),
        Math.round(transaction.taxOnFees),
        Math.round(transaction.refundAmount),
        Math.round(transaction.net),
        transaction.paymentMode,
        transaction.source,
        transaction.status,
        transaction.couponCode,
      ]),
    ]);
  };

  const exportEventCsv = () => {
    exportRowsToCsv(`buizz-organizer-event-revenue-${Date.now()}.csv`, [
      ["Event", "Event ID", "Tickets", "Gross", "Fees", "Refunds", "Net", "Payout Status", "Next Payout"],
      ...eventRevenueRows.map((event) => [
        event.event,
        event.eventId,
        event.ticketsSold,
        Math.round(event.gross),
        Math.round(event.fees),
        Math.round(event.refunds),
        Math.round(event.net),
        event.payoutStatus,
        event.nextPayoutDate,
      ]),
    ]);
  };

  const resetRevenueFilters = () => {
    setEventFilter("All Events");
    setDateRange("Last 30 Days");
    setLedgerSearch("");
    setStatusFilter("All Status");
    setSourceFilter("All Sources");
    setTierFilter("All Tiers");
  };

  const openEventRevenue = (eventId: string) => {
    setSelectedEventId(eventId);
    router.push(`/organizer/revenue?eventId=${encodeURIComponent(eventId)}`);
  };

  const payoutStatusTone = (status: RevenuePayoutStatus) => {
    if (status === "Ready" || status === "Sent to Bank") return "bg-[#22C55E]/15 text-[#15803D]";
    if (status === "Processing") return "bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-accent)]";
    return "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]";
  };

  const transactionStatusTone = (status: RevenueTransactionStatus) => {
    if (status === "Successful") return "bg-[#22C55E]/15 text-[#15803D]";
    if (status === "Pending") return "bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-accent)]";
    if (status === "Refunded") return "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]";
    return "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]";
  };

  const isRevenueLoading = isRevenueFetching || isBookingsFetching || isEventsFetching;
  const refreshRevenueData = () => {
    void refetchOrganizerRevenue();
    void refetchOrganizerBookings();
  };

  if (selectedEventSummary) {
    return (
      <RevenueEventDetailPage
        eventSummary={selectedEventSummary}
        transactions={selectedEventTransactions}
        tierRows={selectedEventTiers}
        onBack={() => {
          setSelectedEventId(null);
          router.push("/organizer/revenue");
        }}
        money={money}
        formatDateTime={formatDateTime}
        payoutStatusTone={payoutStatusTone}
        transactionStatusTone={transactionStatusTone}
      />
    );
  }

  return (
    <Panel
      title="Revenue"
      description="Organizer revenue, payout readiness, event-wise profit, online/offline booking revenue, fees, refunds, and downloadable accounting records."
    >
      <div className="mx-auto grid w-full max-w-[1420px] min-w-0 gap-3 overflow-x-hidden sm:gap-5">
        <section className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_16px_44px_rgba(15,23,42,0.07)] sm:rounded-[1.75rem]">
          <div
            className="grid min-w-0 gap-3 p-3 sm:gap-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-center"
            style={{
              background:
                "radial-gradient(circle at top right, color-mix(in srgb, var(--color-brand-primary) 14%, transparent), transparent 42%), var(--app-elevated)",
            }}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
                Organizer Revenue Center
              </p>
              <h2 className="mt-1 break-words text-xl font-black tracking-tight text-[var(--app-foreground)] sm:text-3xl">
                Earnings, fees, and payouts for your events
              </h2>
              <p className="mt-1 max-w-3xl break-words text-xs font-semibold leading-5 text-[var(--app-muted)] sm:mt-2 sm:text-sm sm:leading-6">
                Only this organizer's transactions are shown. Backend settlement will finalize platform commission, gateway charges, taxes, refunds, and payout release.
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-2">
              <select
                value={eventFilter}
                onChange={(event) => setEventFilter(event.target.value)}
                className="min-h-10 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-xs font-black outline-none sm:min-h-11 sm:px-3 sm:text-sm"
              >
                {eventOptions.map((eventName) => (
                  <option key={eventName}>{eventName}</option>
                ))}
              </select>

              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value as RevenueDateRange)}
                className="min-h-10 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-xs font-black outline-none sm:min-h-11 sm:px-3 sm:text-sm"
              >
                <option>Today</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>This Year</option>
                <option>All Time</option>
              </select>

              <button
                type="button"
                onClick={exportLedgerCsv}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white sm:min-h-11 sm:text-sm"
              >
                <Download className="size-4" />
                Export
              </button>

              <button
                type="button"
                onClick={refreshRevenueData}
                disabled={isRevenueLoading}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black sm:min-h-11 sm:text-sm"
              >
                <RefreshCw className={`size-4 ${isRevenueLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <RevenueMetricCard
            title="Net Earnings"
            value={money(revenueSummary.net)}
            detail="Organizer take-home"
            icon={DollarSign}
          />
          <RevenueMetricCard
            title="Gross Sales"
            value={money(revenueSummary.gross)}
            detail={`${money(revenueSummary.totalFees)} fees deducted`}
            icon={CreditCard}
          />
          <RevenueMetricCard
            title="Tickets Sold"
            value={revenueSummary.ticketsSold.toLocaleString("en-IN")}
            detail={sellThroughRate === null ? "Capacity pending" : `${sellThroughRate}% of capacity`}
            icon={Ticket}
          />
          <RevenueMetricCard
            title="Refund Rate"
            value={`${revenueSummary.refundRate}%`}
            detail={`${money(revenueSummary.refunds)} refund / failed`}
            icon={AlertCircle}
          />
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <article className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-5">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
                  Cash Flow & Payout
                </p>
                <h3 className="mt-1 break-words text-lg font-black sm:text-2xl">
                  {money(revenueSummary.net)} available for payout
                </h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
                  Successful online/offline collections become wallet balance. Pending orders, refunds, and settlement holds are excluded from organizer take-home.
                </p>
              </div>
              <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-black ${payoutStatusTone(revenueSummary.net > 0 ? "Processing" : "Held")}`}>
                {revenueSummary.net > 0 ? "Processing" : "Held"}
              </span>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
              <RevenueSmallStat label="Available" value={money(revenueSummary.net)} />
              <RevenueSmallStat label="Pending" value={money(pendingTransactions.reduce((sum, item) => sum + item.gross, 0))} />
              <RevenueSmallStat label="Next Deposit" value={getNextPayoutDate(3)} />
              <RevenueSmallStat label="Account" value="RazorpayX ****4321" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => window.alert("Payout request will connect with backend settlement workflow.")}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white sm:min-h-11 sm:px-5 sm:text-sm"
              >
                Request Payout
              </button>
              <button
                type="button"
                onClick={() => router.push("/organizer/settings")}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--app-border)] px-3 text-xs font-black sm:min-h-11 sm:px-5 sm:text-sm"
              >
                Payout Settings
              </button>
            </div>
          </article>

          <article className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
              Gross to Net Calculation
            </p>
            <h3 className="mt-1 text-lg font-black sm:text-2xl">Backend-ready fee split</h3>

            <div className="mt-3 grid gap-2">
              {[
                ["Gross collected", revenueSummary.gross],
                ["Buyer convenience fee", revenueSummary.buyerFees],
                ["Platform commission", revenueSummary.platformFees],
                ["Payment gateway fee", revenueSummary.gatewayFees],
                ["Organizer service fee", revenueSummary.organizerFees],
                ["Tax on fees", revenueSummary.taxOnFees],
                ["Refund / failed", revenueSummary.refunds],
                ["Net payout", revenueSummary.net],
              ].map(([label, value]) => (
                <div key={String(label)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-[var(--app-subtle)] px-3 py-2">
                  <span className="min-w-0 break-words text-[11px] font-black leading-4 text-[var(--app-muted)] sm:text-xs">{label}</span>
                  <span className="shrink-0 text-right text-xs font-black sm:text-sm">{money(Number(value))}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <article className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:p-5">
            <div className="mb-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">Sales Timeline</p>
                <h3 className="mt-1 break-words text-lg font-black sm:text-xl">Gross vs net revenue</h3>
              </div>
              <span className="w-fit rounded-full bg-[var(--app-subtle)] px-3 py-1 text-[10px] font-black text-[var(--app-muted)] sm:text-xs">
                {dateRange}
              </span>
            </div>
            <div className="h-[210px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTimeline} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--app-muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--app-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Area type="monotone" dataKey="gross" name="Gross" stroke="var(--color-brand-primary)" fill="var(--color-brand-primary)" fillOpacity={0.16} strokeWidth={3} />
                  <Area type="monotone" dataKey="net" name="Net" stroke="#22C55E" fill="#22C55E" fillOpacity={0.12} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">Booking Source Split</p>
            <h3 className="mt-1 text-lg font-black sm:text-xl">Online / offline revenue</h3>

            <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
              {sourceBreakdownRows.map((row) => {
                const percent = revenueSummary.gross ? Math.round((row.gross / revenueSummary.gross) * 100) : 0;

                return (
                  <div key={row.source} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2.5 sm:p-3">
                    <p className="text-xs font-black text-[var(--app-foreground)]">{row.source}</p>
                    <p className="mt-1 text-[10px] font-semibold text-[var(--app-muted)]">{row.orders} orders • {row.tickets} tickets</p>
                    <p className="mt-2 break-words text-sm font-black text-[#15803D] sm:text-base">{money(row.net)}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                      <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-[var(--app-muted)]">{percent}% of gross</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">Payment modes</p>
              <div className="mt-2 grid gap-1.5">
                {paymentModeRows.map((row) => (
                  <div key={row.name} className="flex min-w-0 items-center justify-between gap-2 text-xs font-bold">
                    <span className="min-w-0 truncate text-[var(--app-muted)]">{row.name}</span>
                    <span className="shrink-0 text-[var(--app-foreground)]">{money(row.value)}</span>
                  </div>
                ))}
                {!paymentModeRows.length ? <p className="text-xs font-bold text-[var(--app-muted)]">No settled payments yet.</p> : null}
              </div>
            </div>
          </article>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <article className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">Source Chart</p>
            <h3 className="mt-1 text-lg font-black sm:text-xl">Settled gross by source</h3>
            <div className="h-[210px] w-full sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceChartRows} dataKey="value" nameKey="name" innerRadius={42} outerRadius={78} paddingAngle={3}>
                    {sourceChartRows.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">Hourly Distribution</p>
            <h3 className="mt-1 text-lg font-black sm:text-xl">When buyers purchase</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">Use this for email blasts, ads, and social campaign timing.</p>
            <div className="mt-3 h-[210px] w-full sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyDistribution} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--app-muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--app-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value, name) => name === "revenue" ? money(Number(value)) : Number(value).toLocaleString("en-IN")} />
                  <Legend />
                  <Bar dataKey="orders" name="Orders" fill="var(--color-brand-primary)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue" fill="#22C55E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:p-5">
          <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">Event-wise Revenue</p>
              <h3 className="mt-1 text-lg font-black sm:text-xl">Profitability by event</h3>
            </div>
            <button type="button" onClick={exportEventCsv} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] px-4 text-xs font-black sm:text-sm">
              <Download className="size-4" />
              Export Events
            </button>
          </div>

          <div className="grid gap-2 2xl:hidden">
            {eventRevenueRows.map((event) => (
              <article key={`mobile-revenue-event-${event.eventId}`} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-all text-[10px] font-black uppercase text-[var(--color-brand-primary)]">{event.eventId}</p>
                    <h4 className="mt-1 line-clamp-2 text-sm font-black text-[var(--app-foreground)]">{event.event}</h4>
                    <p className="mt-1 text-[11px] font-semibold text-[var(--app-muted)]">{event.city} • {event.status}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${payoutStatusTone(event.payoutStatus)}`}>{event.payoutStatus}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <RevenueSmallStat label="Net" value={money(event.net)} />
                  <RevenueSmallStat label="Gross" value={money(event.gross)} />
                  <RevenueSmallStat label="Fees" value={money(event.fees)} />
                  <RevenueSmallStat label="Tickets" value={`${event.ticketsSold}/${event.capacity || "∞"}`} />
                </div>

                <button
                  type="button"
                  onClick={() => openEventRevenue(event.eventId)}
                  className="mt-3 min-h-10 w-full rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white"
                >
                  View Event Revenue
                </button>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--app-border)] 2xl:block">
            <table className="w-full min-w-[1160px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase text-[var(--app-muted)]">
                  <th className="px-4 py-4">Event</th>
                  <th className="px-4 py-4">Tickets</th>
                  <th className="px-4 py-4">Gross</th>
                  <th className="px-4 py-4">Fees</th>
                  <th className="px-4 py-4">Refund</th>
                  <th className="px-4 py-4">Net Payout</th>
                  <th className="px-4 py-4">Payout</th>
                  <th className="px-4 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {eventRevenueRows.map((event) => (
                  <tr key={`event-revenue-row-${event.eventId}`} className="border-b border-[var(--app-border)] last:border-0">
                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{event.event}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{event.eventId}</p>
                      <p className="text-xs font-semibold text-[var(--app-muted)]">{event.city} • {event.status}</p>
                    </td>
                    <td className="px-4 py-4 align-top font-black">{event.ticketsSold}/{event.capacity || "∞"}</td>
                    <td className="px-4 py-4 align-top font-black">{money(event.gross)}</td>
                    <td className="px-4 py-4 align-top font-semibold text-[var(--app-muted)]">{money(event.fees)}</td>
                    <td className="px-4 py-4 align-top font-semibold text-[var(--color-brand-primary)]">{money(event.refunds)}</td>
                    <td className="px-4 py-4 align-top font-black text-[#15803D]">{money(event.net)}</td>
                    <td className="px-4 py-4 align-top">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${payoutStatusTone(event.payoutStatus)}`}>{event.payoutStatus}</span>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{event.nextPayoutDate}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <button type="button" onClick={() => openEventRevenue(event.eventId)} className="rounded-xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white">
                        View Event Revenue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!eventRevenueRows.length ? (
            <p className="rounded-2xl border border-dashed border-[var(--app-border)] p-6 text-center text-sm font-bold text-[var(--app-muted)]">
              No revenue records found for the selected filters.
            </p>
          ) : null}
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-2">
          <article className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">Ticket Tier Matrix</p>
            <h3 className="mt-1 text-lg font-black sm:text-xl">Revenue by ticket block</h3>
            <div className="mt-3 grid gap-2">
              {ticketTierRows.map((tier) => (
                <div key={tier.tier} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-black">{tier.tier}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{tier.units} sold • {money(tier.gross)} gross</p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-black text-[#15803D]">{money(tier.net)}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <RevenueSmallStat label="Fees" value={money(tier.fees)} />
                    <RevenueSmallStat label="Refund" value={money(tier.refunds)} />
                    <RevenueSmallStat label="Units" value={tier.units} />
                  </div>
                </div>
              ))}
              {!ticketTierRows.length ? <p className="text-sm font-bold text-[var(--app-muted)]">No ticket tier revenue found.</p> : null}
            </div>
          </article>

          <article className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">Promo & Discount Impact</p>
            <h3 className="mt-1 text-lg font-black sm:text-xl">Coupon revenue performance</h3>
            <div className="mt-3 grid gap-2">
              {promoRows.map((promo) => (
                <div key={promo.code} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-black">{promo.code}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{promo.uses} uses • {money(promo.estimatedDiscount)} discount</p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-black text-[#15803D]">{money(promo.net)}</p>
                  </div>
                  <p className="mt-2 text-xs font-bold text-[var(--app-muted)]">{money(promo.gross)} gross generated</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem] sm:p-5">
          <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">Transaction Ledger</p>
              <h3 className="mt-1 text-lg font-black sm:text-xl">Accounting and audit records</h3>
            </div>
            <button type="button" onClick={exportLedgerCsv} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white sm:text-sm">
              <Download className="size-4" />
              Export Ledger
            </button>
          </div>

          <div className="grid min-w-0 gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2 sm:p-3 xl:grid-cols-[minmax(0,1fr)_160px_160px_180px_auto]">
            <input
              value={ledgerSearch}
              onChange={(event) => setLedgerSearch(event.target.value)}
              placeholder="Search buyer, order ID, ticket ID, event..."
              className="min-h-10 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-semibold outline-none focus:border-[var(--color-brand-primary)] sm:min-h-11 sm:text-sm"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All Status" | RevenueTransactionStatus)} className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black outline-none sm:min-h-11 sm:text-sm">
              <option>All Status</option>
              <option>Successful</option>
              <option>Pending</option>
              <option>Refunded</option>
              <option>Failed</option>
            </select>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "All Sources" | "Online" | "Offline" | "Reserved" | "Free")} className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black outline-none sm:min-h-11 sm:text-sm">
              <option>All Sources</option>
              <option>Online</option>
              <option>Offline</option>
              <option>Reserved</option>
              <option>Free</option>
            </select>
            <select value={tierFilter} onChange={(event) => setTierFilter(event.target.value)} className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black outline-none sm:min-h-11 sm:text-sm">
              {tierOptions.map((tier) => <option key={tier}>{tier}</option>)}
            </select>
            <button type="button" onClick={resetRevenueFilters} className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black sm:min-h-11 sm:text-sm">
              Reset
            </button>
          </div>

          <div className="mt-3 grid gap-2 2xl:hidden">
            {filteredTransactions.map((transaction) => (
              <article key={`mobile-ledger-${transaction.id}`} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-all text-[10px] font-black uppercase text-[var(--color-brand-primary)]">{transaction.orderId}</p>
                    <h4 className="mt-1 line-clamp-1 text-sm font-black">{transaction.buyerName}</h4>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-[var(--app-muted)]">{transaction.event}</p>
                  </div>
                  <p className="shrink-0 text-right text-sm font-black text-[#15803D]">{money(transaction.net)}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <RevenueSmallStat label="Gross" value={money(transaction.gross)} />
                  <RevenueSmallStat label="Fees" value={money(transaction.platformFee + transaction.gatewayFee + transaction.organizerFee + transaction.taxOnFees)} />
                  <RevenueSmallStat label="Tier" value={`${transaction.ticketTier} x${transaction.quantity}`} />
                  <RevenueSmallStat label="Date" value={formatDateTime(transaction.issuedAt)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${transactionStatusTone(transaction.status)}`}>{transaction.status}</span>
                  <StatusPill label={transaction.source} />
                  <StatusPill label={transaction.paymentMode} />
                </div>
              </article>
            ))}
          </div>

          <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-[var(--app-border)] 2xl:block">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase text-[var(--app-muted)]">
                  <th className="px-4 py-4">Date / Order</th>
                  <th className="px-4 py-4">Buyer</th>
                  <th className="px-4 py-4">Event / Tier</th>
                  <th className="px-4 py-4">Gross</th>
                  <th className="px-4 py-4">Fees</th>
                  <th className="px-4 py-4">Refund</th>
                  <th className="px-4 py-4">Net</th>
                  <th className="px-4 py-4">Payment</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={`ledger-row-${transaction.id}`} className="border-b border-[var(--app-border)] last:border-0">
                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{formatDateTime(transaction.issuedAt)}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{transaction.orderId}</p>
                      <p className="text-xs font-semibold text-[var(--app-muted)]">{transaction.ticketId}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{transaction.buyerName}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{transaction.buyerEmail}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{transaction.event}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{transaction.ticketTier} • Qty {transaction.quantity}</p>
                      <p className="text-xs font-semibold text-[var(--app-muted)]">{transaction.couponCode}</p>
                    </td>
                    <td className="px-4 py-4 align-top font-black">{money(transaction.gross)}</td>
                    <td className="px-4 py-4 align-top font-semibold text-[var(--app-muted)]">{money(transaction.platformFee + transaction.gatewayFee + transaction.organizerFee + transaction.taxOnFees)}</td>
                    <td className="px-4 py-4 align-top font-semibold text-[var(--color-brand-primary)]">{money(transaction.refundAmount)}</td>
                    <td className="px-4 py-4 align-top font-black text-[#15803D]">{money(transaction.net)}</td>
                    <td className="px-4 py-4 align-top">
                      <StatusPill label={transaction.paymentMode} />
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{transaction.source}</p>
                    </td>
                    <td className="px-4 py-4 align-top"><span className={`rounded-full px-3 py-1 text-xs font-black ${transactionStatusTone(transaction.status)}`}>{transaction.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filteredTransactions.length ? (
            <p className="mt-3 rounded-2xl border border-dashed border-[var(--app-border)] p-6 text-center text-sm font-bold text-[var(--app-muted)]">
              No transaction records match the selected filters.
            </p>
          ) : null}
        </section>

        <section className="rounded-[1.35rem] border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-3 sm:rounded-[1.75rem] sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-[var(--color-brand-secondary)]" />
            <div className="min-w-0">
              <h3 className="text-sm font-black text-[var(--color-brand-secondary)] sm:text-lg">Backend revenue rule</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
                Final organizer payout must be calculated on backend from successful payments only. Backend should deduct platform commission, buyer convenience fee, payment gateway charges, organizer service fee, taxes, refunds, chargebacks, and settlement holds before releasing payout.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Panel>
  );
}


function RevenueMetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <article className="buizz-dashboard-card min-w-0 overflow-hidden rounded-2xl p-2.5 sm:rounded-3xl sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-[8px] font-black uppercase tracking-[0.1em] text-[var(--app-muted)] sm:text-xs sm:tracking-[0.12em]">
            {title}
          </p>
          <p className="mt-1.5 break-words text-[clamp(1.05rem,6vw,2.35rem)] font-black leading-none tracking-tight text-[var(--app-foreground)] sm:mt-2">
            {value}
          </p>
          <p className="mt-1.5 line-clamp-2 text-[9px] font-semibold leading-4 text-[var(--app-muted)] sm:mt-2 sm:text-xs sm:leading-5">
            {detail}
          </p>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] sm:size-12 sm:rounded-2xl">
          <Icon className="size-4 sm:size-5" />
        </span>
      </div>
    </article>
  );
}

function RevenueSmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 sm:rounded-2xl sm:p-3">
      <p className="line-clamp-1 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--app-muted)] sm:text-[10px]">
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-black text-[var(--app-foreground)] sm:text-sm">
        {value}
      </p>
    </div>
  );
}


function RevenueEventDetailPage({
  eventSummary,
  transactions,
  tierRows,
  onBack,
  money,
  formatDateTime,
  payoutStatusTone,
  transactionStatusTone,
}: {
  eventSummary: RevenueEventSummaryRow;
  transactions: RevenueTransactionRow[];
  tierRows: Array<{ tier: string; units: number; gross: number; fees: number; net: number; refunds: number }>;
  onBack: () => void;
  money: (value: number) => string;
  formatDateTime: (value: string) => string;
  payoutStatusTone: (status: RevenuePayoutStatus) => string;
  transactionStatusTone: (status: RevenueTransactionStatus) => string;
}) {
  const successfulTransactions = transactions.filter((transaction) => transaction.status === "Successful");

  const sourceRows = ["Online", "Offline", "Reserved", "Free"].map((source) => {
    const sourceTransactions = successfulTransactions.filter((transaction) => transaction.source === source);
    return {
      source,
      orders: sourceTransactions.length,
      tickets: sourceTransactions.reduce((sum, transaction) => sum + transaction.quantity, 0),
      gross: sourceTransactions.reduce((sum, transaction) => sum + transaction.gross, 0),
      net: sourceTransactions.reduce((sum, transaction) => sum + transaction.net, 0),
    };
  });

  const totalFees = eventSummary.fees;

  const exportEventLedger = () => {
    const headers = [
      "Date",
      "Order ID",
      "Ticket ID",
      "Buyer",
      "Tier",
      "Quantity",
      "Gross",
      "Fees",
      "Refund",
      "Net Payout",
      "Payment Mode",
      "Source",
      "Status",
    ];

    const rows = transactions.map((transaction) => [
      formatDateTime(transaction.issuedAt),
      transaction.orderId,
      transaction.ticketId,
      transaction.buyerName,
      transaction.ticketTier,
      transaction.quantity,
      Math.round(transaction.gross),
      Math.round(transaction.platformFee + transaction.gatewayFee + transaction.organizerFee + transaction.taxOnFees),
      Math.round(transaction.refundAmount),
      Math.round(transaction.net),
      transaction.paymentMode,
      transaction.source,
      transaction.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `buizz-${eventSummary.eventId}-revenue-ledger-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      title="Event Revenue"
      description="Detailed net revenue, fees, refunds, source split, ticket tiers, and transaction ledger for one organizer event."
    >
      <div className="grid w-full min-w-0 gap-4 overflow-x-hidden sm:gap-5">
        <section className="overflow-hidden rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={onBack}
                className="mb-4 inline-flex min-h-10 items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-xs font-black"
              >
                ← Back to all revenue
              </button>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${payoutStatusTone(eventSummary.payoutStatus)}`}>
                {eventSummary.payoutStatus}
              </span>
              <h2 className="mt-2 break-words text-xl font-black tracking-tight sm:mt-3 sm:text-3xl">
                {eventSummary.event}
              </h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:mt-2 sm:text-sm sm:leading-6">
                {eventSummary.eventId} • {eventSummary.city} • Next payout {eventSummary.nextPayoutDate}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 xl:w-[360px]">
              <button
                type="button"
                onClick={exportEventLedger}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white sm:min-h-11 sm:gap-2 sm:rounded-2xl sm:px-4 sm:text-sm"
              >
                <Download className="size-4" />
                Export Event CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-border)] px-4 text-sm font-black"
              >
                Print / PDF
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <RevenueMetricCard title="Net Earnings" value={money(eventSummary.net)} detail="Organizer take-home for this event" icon={DollarSign} />
          <RevenueMetricCard title="Gross Sales" value={money(eventSummary.gross)} detail="Total collected before deductions" icon={CreditCard} />
          <RevenueMetricCard title="Fees Deducted" value={money(totalFees)} detail="Platform + gateway + tax" icon={Landmark} />
          <RevenueMetricCard title="Tickets Sold" value={`${eventSummary.ticketsSold}/${eventSummary.capacity || eventSummary.ticketsSold}`} detail={`${eventSummary.refundRate}% refund rate`} icon={Ticket} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <article className="rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">Ticket Tier Revenue</p>
            <h3 className="mt-1 text-xl font-black">Revenue by ticket block</h3>

            <div className="mt-4 grid gap-3">
              {tierRows.map((tier) => (
                <div key={tier.tier} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{tier.tier}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{tier.units} sold</p>
                    </div>
                    <p className="text-right text-sm font-black text-[#15803D]">{money(tier.net)}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <RevenueSmallStat label="Gross" value={money(tier.gross)} />
                    <RevenueSmallStat label="Fees" value={money(tier.fees)} />
                    <RevenueSmallStat label="Refund" value={money(tier.refunds)} />
                  </div>
                </div>
              ))}

              {!tierRows.length ? (
                <p className="rounded-2xl border border-dashed border-[var(--app-border)] p-5 text-center text-sm font-bold text-[var(--app-muted)]">
                  No ticket tier revenue found for this event.
                </p>
              ) : null}
            </div>
          </article>

          <article className="rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">Booking Source</p>
            <h3 className="mt-1 text-xl font-black">Online / offline split</h3>

            <div className="mt-4 grid gap-3">
              {sourceRows.map((row) => {
                const percent = eventSummary.gross ? Math.round((row.gross / eventSummary.gross) * 100) : 0;

                return (
                  <div key={row.source} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{row.source}</p>
                        <p className="mt-0.5 text-xs font-semibold text-[var(--app-muted)]">{row.orders} orders • {row.tickets} tickets</p>
                      </div>
                      <p className="text-sm font-black text-[#15803D]">{money(row.net)}</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                      <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-2 text-[10px] font-bold text-[var(--app-muted)]">{money(row.gross)} gross • {percent}%</p>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">Event Transaction Ledger</p>
              <h3 className="mt-1 text-xl font-black">{successfulTransactions.length} successful orders</h3>
            </div>
            <p className="text-xs font-semibold text-[var(--app-muted)]">Backend will calculate final settlement before payout release.</p>
          </div>

          <div className="grid gap-3 xl:hidden">
            {transactions.map((transaction) => (
              <article key={`event-card-${transaction.id}`} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-[10px] font-black uppercase text-[var(--color-brand-primary)]">{transaction.orderId}</p>
                    <p className="mt-1 line-clamp-1 text-sm font-black">{transaction.buyerName}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{transaction.ticketTier} • Qty {transaction.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-[#15803D]">{money(transaction.net)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${transactionStatusTone(transaction.status)}`}>{transaction.status}</span>
                  <StatusPill label={transaction.source} />
                  <StatusPill label={transaction.paymentMode} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--app-border)] xl:block">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase text-[var(--app-muted)]">
                  <th className="px-4 py-4">Date / Order</th>
                  <th className="px-4 py-4">Buyer</th>
                  <th className="px-4 py-4">Ticket</th>
                  <th className="px-4 py-4">Gross</th>
                  <th className="px-4 py-4">Fees</th>
                  <th className="px-4 py-4">Refund</th>
                  <th className="px-4 py-4">Net</th>
                  <th className="px-4 py-4">Source</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={`event-ledger-${transaction.id}`} className="border-b border-[var(--app-border)] last:border-0">
                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{formatDateTime(transaction.issuedAt)}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{transaction.orderId}</p>
                      <p className="text-xs font-semibold text-[var(--app-muted)]">{transaction.ticketId}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{transaction.buyerName}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{transaction.buyerEmail}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{transaction.ticketTier}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">Qty {transaction.quantity}</p>
                    </td>
                    <td className="px-4 py-4 align-top font-black">{money(transaction.gross)}</td>
                    <td className="px-4 py-4 align-top font-semibold text-[var(--app-muted)]">{money(transaction.platformFee + transaction.gatewayFee + transaction.organizerFee + transaction.taxOnFees)}</td>
                    <td className="px-4 py-4 align-top font-semibold text-[var(--color-brand-primary)]">{money(transaction.refundAmount)}</td>
                    <td className="px-4 py-4 align-top font-black text-[#15803D]">{money(transaction.net)}</td>
                    <td className="px-4 py-4 align-top"><StatusPill label={transaction.source} /></td>
                    <td className="px-4 py-4 align-top"><span className={`rounded-full px-3 py-1 text-xs font-black ${transactionStatusTone(transaction.status)}`}>{transaction.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Panel>
  );
}

function RevenueEventDetailModal({
  eventSummary,
  transactions,
  tierRows,
  onClose,
  money,
  formatDateTime,
  payoutStatusTone,
  transactionStatusTone,
}: {
  eventSummary: RevenueEventSummaryRow;
  transactions: RevenueTransactionRow[];
  tierRows: Array<{ tier: string; units: number; gross: number; fees: number; net: number; refunds: number }>;
  onClose: () => void;
  money: (value: number) => string;
  formatDateTime: (value: string) => string;
  payoutStatusTone: (status: RevenuePayoutStatus) => string;
  transactionStatusTone: (status: RevenueTransactionStatus) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm lg:place-items-center lg:p-4">
      <div className="max-h-[94dvh] w-full max-w-6xl overflow-y-auto rounded-t-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-2xl lg:rounded-[2rem] lg:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${payoutStatusTone(eventSummary.payoutStatus)}`}>
              {eventSummary.payoutStatus}
            </span>
            <h2 className="mt-3 break-words text-2xl font-black sm:text-3xl">
              {eventSummary.event}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
              {eventSummary.eventId} • {eventSummary.city} • Next payout {eventSummary.nextPayoutDate}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <section className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <RevenueSmallStat label="Event Net" value={money(eventSummary.net)} />
          <RevenueSmallStat label="Gross Sales" value={money(eventSummary.gross)} />
          <RevenueSmallStat label="Fees" value={money(eventSummary.fees)} />
          <RevenueSmallStat label="Refunds" value={money(eventSummary.refunds)} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              Ticket Tier Revenue
            </p>

            <div className="mt-4 grid gap-2">
              {tierRows.map((tier) => (
                <div key={`modal-tier-${tier.tier}`} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="font-black">{tier.tier}</p>
                    <p className="font-black text-[#15803D]">{money(tier.net)}</p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                    {tier.units} sold • {money(tier.gross)} gross • {money(tier.fees)} fees
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              Event Transaction Ledger
            </p>

            <div className="mt-4 grid gap-2">
              {transactions.slice(0, 8).map((transaction) => (
                <div key={`modal-transaction-${transaction.id}`} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-black">{transaction.buyerName}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                        {transaction.orderId} • {transaction.ticketTier} • {formatDateTime(transaction.issuedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${transactionStatusTone(transaction.status)}`}>
                        {transaction.status}
                      </span>
                      <p className="text-sm font-black text-[#15803D]">{money(transaction.net)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {!transactions.length ? (
                <p className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-sm font-semibold text-[var(--app-muted)]">
                  No transactions found for this event in the current filter.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

type AnalyticsRange = "Today" | "Last 7 Days" | "Last 30 Days" | "This Year";
type AnalyticsSource = "All Sources" | "Online" | "Offline" | "Reserved" | "Free";
type AnalyticsEventStatus = "Draft" | "Pending Review" | "Approved" | "Published" | "Completed" | "Cancelled";

type OrganizerAnalyticsEvent = {
  eventId: string;
  eventName: string;
  category: string;
  status: AnalyticsEventStatus;
  city: string;
  ticketsSold: number;
  bookings: number;
  attendees: number;
  checkedIn: number;
  capacity: number;
  grossRevenue: number;
  offlineRevenue: number;
  reservedTickets: number;
  refunds: number;
  rating: number;
  sourceBreakdown: {
    source: "Online" | "Offline" | "Reserved" | "Free";
    bookings: number;
    tickets: number;
    revenue: number;
  }[];
};

type OrganizerAnalyticsTransaction = {
  id: string;
  eventId: string;
  eventName: string;
  category: string;
  status: AnalyticsEventStatus;
  city: string;
  ticketType: string;
  source: "Online" | "Offline" | "Reserved" | "Free";
  quantity: number;
  grossRevenue: number;
  refunds: number;
  checkedIn: boolean;
  issuedAt: string;
  paymentMode: string;
  paymentStatus: "Successful" | "Pending" | "Refunded" | "Failed" | "Complimentary";
};

type OrganizerAnalyticsEventMeta = {
  eventId: string;
  eventName: string;
  category: string;
  status: AnalyticsEventStatus;
  city: string;
  capacity: number;
  rating: number;
};

// Future backend:
// GET /api/organizer/analytics?eventId=&range=&source=
// GET /api/organizer/analytics/export
// Analytics must be calculated server-side from bookings, payments, refunds, check-ins, coupons, and inventory.
// Backend must scope analytics by authenticated organizerId and never trust frontend revenue, coupon, or payout values.

function calculateOccupancyRate(event: OrganizerAnalyticsEvent) {
  if (!event.capacity) return 0;
  return Math.min(100, Math.round((event.ticketsSold / event.capacity) * 100));
}

function calculateConversionRate(event: OrganizerAnalyticsEvent) {
  if (!event.bookings) return 0;
  return Math.min(100, Math.round((event.ticketsSold / event.bookings) * 100));
}

function calculateNetRevenue(event: OrganizerAnalyticsEvent) {
  const platformFee = Math.round(event.grossRevenue * 0.08);
  const gatewayFee = Math.round(event.grossRevenue * 0.025);
  const taxOnFees = Math.round((platformFee + gatewayFee) * 0.18);
  return Math.max(0, event.grossRevenue - platformFee - gatewayFee - taxOnFees - event.refunds);
}

function getAnalyticsHealth(event: OrganizerAnalyticsEvent) {
  const occupancy = calculateOccupancyRate(event);

  if (event.refunds > 5) return "Refund Risk";
  if (occupancy >= 80) return "High Demand";
  if (occupancy < 40) return "Needs Push";
  if (event.checkedIn > 0 && event.checkedIn < Math.round(event.attendees * 0.4)) return "Check-in Low";
  return "Healthy";
}

function formatAnalyticsMoney(value: number) {
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

function buildAnalyticsExportRows(events: OrganizerAnalyticsEvent[]) {
  return events.map((event) => ({
    "Event ID": event.eventId,
    Event: event.eventName,
    Category: event.category,
    Status: event.status,
    City: event.city,
    Tickets: event.ticketsSold,
    Bookings: event.bookings,
    Attendees: event.attendees,
    "Checked In": event.checkedIn,
    Capacity: event.capacity,
    "Occupancy %": calculateOccupancyRate(event),
    "Conversion %": calculateConversionRate(event),
    "Gross Revenue": event.grossRevenue,
    "Net Revenue": calculateNetRevenue(event),
    "Offline Revenue": event.offlineRevenue,
    "Reserved Tickets": event.reservedTickets,
    Refunds: event.refunds,
    Health: getAnalyticsHealth(event),
  }));
}

function exportAnalyticsCsv(events: OrganizerAnalyticsEvent[]) {
  const rows = buildAnalyticsExportRows(events);
  const headers = Object.keys(rows[0] ?? {
    "Event ID": "",
    Event: "",
    Category: "",
    Status: "",
    City: "",
    Tickets: "",
    Bookings: "",
    Attendees: "",
    "Checked In": "",
    Capacity: "",
    "Occupancy %": "",
    "Conversion %": "",
    "Gross Revenue": "",
    "Net Revenue": "",
    "Offline Revenue": "",
    "Reserved Tickets": "",
    Refunds: "",
    Health: "",
  });

  const csv = [headers, ...rows.map((row) => headers.map((header) => row[header as keyof typeof row] ?? ""))]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `buizz-organizer-analytics-${Date.now()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeAnalyticsEventStatus(status?: string): AnalyticsEventStatus {
  const value = String(status ?? "").toLowerCase().replace(/_/g, " ");
  if (value.includes("pending")) return "Pending Review";
  if (value.includes("approved")) return "Approved";
  if (value.includes("published")) return "Published";
  if (value.includes("completed")) return "Completed";
  if (value.includes("cancelled") || value.includes("canceled")) return "Cancelled";
  return "Draft";
}

function getAnalyticsEventKey(eventId: string, eventName: string) {
  return `${eventId || "no-id"}::${eventName.trim().toLowerCase()}`;
}

function getAnalyticsDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinAnalyticsRange(value: string, range: AnalyticsRange) {
  const date = getAnalyticsDate(value);
  if (!date) return true;

  const now = new Date();
  if (range === "Today") {
    return date.toDateString() === now.toDateString();
  }

  const diffMs = now.getTime() - date.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);

  if (range === "Last 7 Days") return days <= 7;
  if (range === "Last 30 Days") return days <= 30;
  return date.getFullYear() === now.getFullYear();
}

function buildOrganizerAnalyticsEventMeta(): Map<string, OrganizerAnalyticsEventMeta> {
  const map = new Map<string, OrganizerAnalyticsEventMeta>();

  try {
    readUnifiedEvents().forEach((event) => {
      const raw = event as Partial<UnifiedBuizzEvent> & Record<string, unknown>;
      const eventId = String(raw.id ?? "");
      const eventName = String(raw.title ?? "Untitled Event");
      const capacity = Number(raw.capacity ?? raw.totalCapacity ?? 0);
      const category = String(raw.category ?? raw.categoryName ?? "Event");
      const city = String(raw.city ?? raw.location ?? "City pending");
      const status = normalizeAnalyticsEventStatus(String(raw.status ?? "Draft"));

      map.set(getAnalyticsEventKey(eventId, eventName), {
        eventId,
        eventName,
        category,
        status,
        city,
        capacity: Number.isFinite(capacity) ? capacity : 0,
        rating: Number(raw.rating ?? 0),
      });
    });

    if (typeof window !== "undefined") {
      loadPhase3EventsFromStorage(window.localStorage).forEach((event) => {
        const summary = createOrganizerSummaryFromEvent(event);
        const eventId = String(summary.id ?? getUnifiedEventKey(summary));
        const eventName = String(summary.name ?? "Untitled Event");
        const capacity = Array.isArray(summary.seatBlocks)
          ? summary.seatBlocks.reduce((total, block) => total + Number(block.capacity || 0), 0)
          : 0;

        map.set(getAnalyticsEventKey(eventId, eventName), {
          eventId,
          eventName,
          category: String(summary.category ?? "Event"),
          status: normalizeAnalyticsEventStatus(String(summary.status ?? "Draft")),
          city: String(summary.city ?? "City pending"),
          capacity: Number.isFinite(capacity) ? capacity : 0,
          rating: 0,
        });
      });
    }
  } catch {
    return map;
  }

  return map;
}

function getAnalyticsPaymentStatus(value?: string): OrganizerAnalyticsTransaction["paymentStatus"] {
  const status = String(value ?? "").toLowerCase();
  if (status.includes("refund")) return "Refunded";
  if (status.includes("fail")) return "Failed";
  if (status.includes("pending") || status.includes("unpaid") || status.includes("partial")) return "Pending";
  if (status.includes("complimentary") || status.includes("free")) return "Complimentary";
  return "Successful";
}

function buildAnalyticsTransactions({
  unifiedBookings,
  offlineBookings,
  checkIns,
  eventMeta,
}: {
  unifiedBookings: UnifiedBookingRecord[];
  offlineBookings: OfflineBookingRecord[];
  checkIns: OrganizerOfflineCheckInRecord[];
  eventMeta: Map<string, OrganizerAnalyticsEventMeta>;
}): OrganizerAnalyticsTransaction[] {
  const findMeta = (eventId: string, eventName: string) =>
    eventMeta.get(getAnalyticsEventKey(eventId, eventName)) ??
    Array.from(eventMeta.values()).find(
      (meta) => meta.eventId === eventId || meta.eventName.trim().toLowerCase() === eventName.trim().toLowerCase(),
    );

  const unifiedRows = unifiedBookings.map((booking) => {
    const eventId = String(booking.eventId ?? "");
    const eventName = String(booking.eventTitle ?? "Untitled Event");
    const meta = findMeta(eventId, eventName);
    const source = normalizeOfflineSourceForDashboard(booking.source);
    const status = getAnalyticsPaymentStatus(booking.status);
    const grossRevenue = Number(booking.amountCollected ?? 0);
    const isRefunded = status === "Refunded" || String(booking.status ?? "").toLowerCase() === "cancelled";

    return {
      id: String(booking.bookingId ?? booking.ticketId ?? `UNI-${Date.now()}`),
      eventId,
      eventName,
      category: meta?.category ?? "Event",
      status: meta?.status ?? "Published",
      city: meta?.city ?? "City pending",
      ticketType: String(booking.ticketBlock ?? "General"),
      source,
      quantity: Math.max(0, Number(booking.quantity ?? 1)),
      grossRevenue,
      refunds: isRefunded ? grossRevenue : 0,
      checkedIn: isUnifiedBookingCheckedIn(booking, checkIns),
      issuedAt: String(booking.issuedAt ?? (booking as UnifiedBookingRecord & { createdAt?: string }).createdAt ?? new Date().toISOString()),
      paymentMode: String(booking.paymentMode ?? "Online"),
      paymentStatus: status,
    } satisfies OrganizerAnalyticsTransaction;
  });

  const offlineRows = offlineBookings.map((booking) => {
    const eventId = String(booking.eventId ?? "");
    const eventName = String(booking.eventTitle ?? "Untitled Event");
    const meta = findMeta(eventId, eventName);
    const source = normalizeOfflineSourceForDashboard(booking.source);
    const status = getAnalyticsPaymentStatus(booking.paymentStatus ?? booking.status);
    const grossRevenue = Number(booking.amountCollected ?? 0);
    const isRefunded = status === "Refunded" || String(booking.status ?? "").toLowerCase() === "cancelled";

    return {
      id: String(booking.bookingId ?? booking.ticketId ?? `OFF-${Date.now()}`),
      eventId,
      eventName,
      category: meta?.category ?? "Event",
      status: meta?.status ?? "Published",
      city: meta?.city ?? "City pending",
      ticketType: String(booking.ticketBlock ?? "Counter"),
      source,
      quantity: Math.max(0, Number(booking.quantity ?? 1)),
      grossRevenue,
      refunds: isRefunded ? grossRevenue : 0,
      checkedIn: isOfflineBookingCheckedIn(booking, checkIns),
      issuedAt: String(booking.issuedAt ?? new Date().toISOString()),
      paymentMode: String(booking.paymentMode ?? source),
      paymentStatus: status,
    } satisfies OrganizerAnalyticsTransaction;
  });

  const unique = new Map<string, OrganizerAnalyticsTransaction>();
  [...unifiedRows, ...offlineRows].forEach((row) => {
    const key = `${row.id}-${row.eventId}-${row.eventName}-${row.source}`.toLowerCase();
    unique.set(key, row);
  });

  return Array.from(unique.values());
}

function buildOrganizerAnalyticsEvents(
  transactions: OrganizerAnalyticsTransaction[],
  eventMeta: Map<string, OrganizerAnalyticsEventMeta>,
): OrganizerAnalyticsEvent[] {
  const grouped = new Map<string, OrganizerAnalyticsEvent>();

  transactions.forEach((transaction) => {
    const key = getAnalyticsEventKey(transaction.eventId, transaction.eventName);
    const meta = eventMeta.get(key);
    const current = grouped.get(key) ?? {
      eventId: transaction.eventId,
      eventName: transaction.eventName,
      category: meta?.category ?? transaction.category,
      status: meta?.status ?? transaction.status,
      city: meta?.city ?? transaction.city,
      ticketsSold: 0,
      bookings: 0,
      attendees: 0,
      checkedIn: 0,
      capacity: meta?.capacity ?? 0,
      grossRevenue: 0,
      offlineRevenue: 0,
      reservedTickets: 0,
      refunds: 0,
      rating: meta?.rating ?? 0,
      sourceBreakdown: [
        { source: "Online", bookings: 0, tickets: 0, revenue: 0 },
        { source: "Offline", bookings: 0, tickets: 0, revenue: 0 },
        { source: "Reserved", bookings: 0, tickets: 0, revenue: 0 },
        { source: "Free", bookings: 0, tickets: 0, revenue: 0 },
      ],
    } satisfies OrganizerAnalyticsEvent;

    const sourceBreakdown = current.sourceBreakdown.map((item) => {
      if (item.source !== transaction.source) return item;
      return {
        ...item,
        bookings: item.bookings + 1,
        tickets: item.tickets + transaction.quantity,
        revenue: item.revenue + transaction.grossRevenue,
      };
    });

    grouped.set(key, {
      ...current,
      ticketsSold: current.ticketsSold + transaction.quantity,
      bookings: current.bookings + 1,
      attendees: current.attendees + transaction.quantity,
      checkedIn: current.checkedIn + (transaction.checkedIn ? transaction.quantity : 0),
      grossRevenue: current.grossRevenue + transaction.grossRevenue,
      offlineRevenue: current.offlineRevenue + (transaction.source === "Offline" ? transaction.grossRevenue : 0),
      reservedTickets: current.reservedTickets + (transaction.source === "Reserved" ? transaction.quantity : 0),
      refunds: current.refunds + transaction.refunds,
      sourceBreakdown,
    });
  });

  return Array.from(grouped.values()).sort((a, b) => b.grossRevenue - a.grossRevenue);
}

function buildAnalyticsTrend(transactions: OrganizerAnalyticsTransaction[], range: AnalyticsRange) {
  const buckets = new Map<string, { label: string; revenue: number; tickets: number; attendees: number }>();

  transactions.forEach((transaction) => {
    const date = getAnalyticsDate(transaction.issuedAt) ?? new Date();
    const label =
      range === "Today"
        ? date.toLocaleTimeString("en-IN", { hour: "2-digit" })
        : range === "This Year"
          ? date.toLocaleDateString("en-IN", { month: "short" })
          : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

    const existing = buckets.get(label) ?? { label, revenue: 0, tickets: 0, attendees: 0 };
    buckets.set(label, {
      label,
      revenue: existing.revenue + transaction.grossRevenue,
      tickets: existing.tickets + transaction.quantity,
      attendees: existing.attendees + transaction.quantity,
    });
  });

  return Array.from(buckets.values());
}

function buildSourceTotals(events: OrganizerAnalyticsEvent[]) {
  const sources: Array<"Online" | "Offline" | "Reserved" | "Free"> = ["Online", "Offline", "Reserved", "Free"];

  return sources.map((source) => ({
    source,
    bookings: events.reduce((sum, event) => sum + (event.sourceBreakdown.find((item) => item.source === source)?.bookings ?? 0), 0),
    tickets: events.reduce((sum, event) => sum + (event.sourceBreakdown.find((item) => item.source === source)?.tickets ?? 0), 0),
    revenue: events.reduce((sum, event) => sum + (event.sourceBreakdown.find((item) => item.source === source)?.revenue ?? 0), 0),
  }));
}

function buildAnalyticsInsights(events: OrganizerAnalyticsEvent[]) {
  if (!events.length) return [];

  const insights: { title: string; detail: string; tone: "success" | "warning" | "danger" | "info" }[] = [];
  const best = [...events].sort((a, b) => calculateNetRevenue(b) - calculateNetRevenue(a))[0];
  const lowOccupancy = events.filter((event) => calculateOccupancyRate(event) < 40 && event.ticketsSold > 0);
  const highDemand = events.filter((event) => calculateOccupancyRate(event) > 80);
  const refundRisk = events.filter((event) => event.refunds > 5);
  const offlineHeavy = events.filter((event) => event.grossRevenue > 0 && event.offlineRevenue / event.grossRevenue > 0.35);
  const checkInLow = events.filter((event) => event.attendees > 0 && event.checkedIn / event.attendees < 0.25);

  if (best) {
    insights.push({
      title: "Best performing event",
      detail: `${best.eventName} is leading with ${formatAnalyticsMoney(calculateNetRevenue(best))} estimated net revenue.`,
      tone: "success",
    });
  }

  if (lowOccupancy.length) {
    insights.push({
      title: "Low occupancy warning",
      detail: `${lowOccupancy.length} event${lowOccupancy.length > 1 ? "s" : ""} below 40% occupancy. Push offers, reminders, or city campaigns.`,
      tone: "warning",
    });
  }

  if (highDemand.length) {
    insights.push({
      title: "High demand opportunity",
      detail: `${highDemand.length} event${highDemand.length > 1 ? "s" : ""} crossed 80% occupancy. Consider premium tier or additional slot planning.`,
      tone: "success",
    });
  }

  if (refundRisk.length) {
    insights.push({
      title: "Refund warning",
      detail: `${refundRisk.length} event${refundRisk.length > 1 ? "s have" : " has"} more than 5 refund records. Review timing, venue rules, and support tickets.`,
      tone: "danger",
    });
  }

  if (offlineHeavy.length) {
    insights.push({
      title: "Offline sales insight",
      detail: `${offlineHeavy.length} event${offlineHeavy.length > 1 ? "s" : ""} depend heavily on offline revenue. Keep counter reconciliation and receipt export ready.`,
      tone: "info",
    });
  }

  if (checkInLow.length) {
    insights.push({
      title: "Check-in warning",
      detail: `${checkInLow.length} event${checkInLow.length > 1 ? "s" : ""} show low checked-in count. Check scanner team readiness and gate setup.`,
      tone: "warning",
    });
  }

  return insights.slice(0, 6);
}


type OrganizerAnalyticsVisualTrendRow = {
  label?: string;
  revenue?: number;
  grossRevenue?: number;
  gross?: number;
  tickets?: number;
  ticketsSold?: number;
  bookings?: number;
  orders?: number;
};

function OrganizerAnalyticsTrendCard({
  rows,
  money,
}: {
  rows: OrganizerAnalyticsVisualTrendRow[];
  money: (value: number) => string;
}) {
  const safeRows = (rows.length ? rows : [{ label: "No data", revenue: 0, tickets: 0, bookings: 0 }]).map((row, index) => ({
    label: String(row.label ?? `Period ${index + 1}`),
    revenue: Number(row.revenue ?? row.grossRevenue ?? row.gross ?? 0),
    tickets: Number(row.tickets ?? row.ticketsSold ?? 0),
    bookings: Number(row.bookings ?? row.orders ?? 0),
  }));

  const maxRevenue = Math.max(...safeRows.map((row) => row.revenue), 1);
  const hasData = safeRows.some((row) => row.revenue > 0 || row.tickets > 0 || row.bookings > 0);
  const totalRevenue = safeRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalTickets = safeRows.reduce((sum, row) => sum + row.tickets, 0);

  const points = safeRows
    .map((row, index) => {
      const x = safeRows.length === 1 ? 180 : 18 + (index / (safeRows.length - 1)) * 324;
      const y = 110 - (row.revenue / maxRevenue) * 82;
      return `${x},${Math.max(24, Math.min(110, y))}`;
    })
    .join(" ");

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
            Revenue
          </p>
          <h3 className="mt-1 text-sm font-black sm:text-base">Revenue trend</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-[var(--app-muted)]">
            Updates when booking records change
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <BarChart3 className="size-4" />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[var(--app-subtle)] p-3">
          <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Revenue</p>
          <p className="mt-1 truncate text-sm font-black">{money(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl bg-[var(--app-subtle)] p-3">
          <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Tickets</p>
          <p className="mt-1 truncate text-sm font-black">{totalTickets.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {hasData ? (
        <div className="mt-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2">
          <svg viewBox="0 0 360 132" className="h-[132px] w-full" preserveAspectRatio="none" role="img" aria-label="Revenue trend chart">
            <defs>
              <linearGradient id="organizerAnalyticsRevenueFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity="0.24" />
                <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <line x1="18" y1="110" x2="342" y2="110" stroke="var(--app-border)" strokeWidth="1" />
            <line x1="18" y1="72" x2="342" y2="72" stroke="var(--app-border)" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="18" y1="34" x2="342" y2="34" stroke="var(--app-border)" strokeWidth="1" strokeDasharray="4 6" />
            <polygon points={`18,114 ${points} 342,114`} fill="url(#organizerAnalyticsRevenueFill)" />
            <polyline points={points} fill="none" stroke="var(--color-brand-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {safeRows.map((row, index) => (
              <div key={`analytics-trend-${row.label}-${index}`} className="min-w-0 rounded-xl bg-[var(--app-elevated)] p-2">
                <p className="truncate text-[10px] font-black">{row.label}</p>
                <p className="mt-1 truncate text-[11px] font-black text-[var(--color-brand-primary)]">{money(row.revenue)}</p>
                <p className="text-[10px] font-semibold text-[var(--app-muted)]">{row.tickets} tickets</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 grid min-h-[150px] place-items-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-center">
          <p className="text-xs font-black text-[var(--app-muted)]">No revenue movement yet</p>
        </div>
      )}
    </article>
  );
}


function OrganizerAnalyticsTopEventsCard({
  rows,
  money,
}: {
  rows: OrganizerAnalyticsTopEventRow[];
  money: (value: number) => string;
}) {
  const safeRows = rows.slice(0, 5);
  const maxRevenue = Math.max(...safeRows.map((row) => Number(row.revenue ?? 0)), 1);

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
        Events
      </p>
      <h3 className="mt-1 text-sm font-black sm:text-base">Top event revenue</h3>
      <p className="mt-0.5 text-[11px] font-semibold text-[var(--app-muted)]">Sorted by selected metric</p>

      <div className="mt-3 grid gap-2">
        {safeRows.map((row) => {
          const revenue = Number(row.revenue ?? 0);
          const percent = Math.max(3, Math.round((revenue / maxRevenue) * 100));

          return (
            <article key={`top-event-${row.eventId ?? row.eventName}`} className="min-w-0 rounded-2xl bg-[var(--app-subtle)] p-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-black">{row.eventName}</p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)]">
                    {row.city ?? "City pending"} • {row.category ?? "Event"}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-black text-[#15803D]">{money(revenue)}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${percent}%` }} />
              </div>
            </article>
          );
        })}

        {!safeRows.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] p-4 text-center text-xs font-bold text-[var(--app-muted)]">
            No event revenue yet
          </div>
        ) : null}
      </div>
    </article>
  );
}

function OrganizerAnalyticsFillRateCard({ rows }: { rows: OrganizerAnalyticsTopEventRow[] }) {
  const safeRows = rows.slice(0, 5);

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
        Capacity
      </p>
      <h3 className="mt-1 text-sm font-black sm:text-base">Event fill rate</h3>
      <p className="mt-0.5 text-[11px] font-semibold text-[var(--app-muted)]">Tickets sold vs capacity</p>

      <div className="mt-3 grid gap-2">
        {safeRows.map((row) => {
          const percent = Math.max(0, Math.min(100, Number(row.occupancy ?? 0)));

          return (
            <article key={`fill-rate-${row.eventId ?? row.eventName}`} className="min-w-0 rounded-2xl bg-[var(--app-subtle)] p-3">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="line-clamp-1 text-xs font-black">{row.eventName}</p>
                <p className="shrink-0 text-xs font-black text-[var(--color-brand-primary)]">{percent}%</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-[10px] font-semibold text-[var(--app-muted)]">
                {Number(row.tickets ?? 0).toLocaleString("en-IN")} tickets sold
              </p>
            </article>
          );
        })}

        {!safeRows.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] p-4 text-center text-xs font-bold text-[var(--app-muted)]">
            No capacity data yet
          </div>
        ) : null}
      </div>
    </article>
  );
}

function OrganizerAnalyticsStatusCard({
  rows,
}: {
  rows: Array<{ status: AnalyticsEventStatus; value: number }>;
}) {
  const total = Math.max(rows.reduce((sum, row) => sum + Number(row.value ?? 0), 0), 1);

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
        Lifecycle
      </p>
      <h3 className="mt-1 text-sm font-black sm:text-base">Event status</h3>
      <p className="mt-0.5 text-[11px] font-semibold text-[var(--app-muted)]">Approval and publish state</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {rows.map((row) => {
          const percent = Math.round((Number(row.value ?? 0) / total) * 100);

          return (
            <article key={`analytics-status-${row.status}`} className="min-w-0 rounded-2xl bg-[var(--app-subtle)] p-3">
              <p className="line-clamp-1 text-[10px] font-black uppercase text-[var(--app-muted)]">{row.status}</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="text-lg font-black">{Number(row.value ?? 0)}</p>
                <p className="text-[10px] font-black text-[var(--color-brand-primary)]">{percent}%</p>
              </div>
            </article>
          );
        })}
      </div>
    </article>
  );
}

type OrganizerAnalyticsSourcePerformanceRow = {
  source: string;
  bookings?: number;
  orders?: number;
  tickets?: number;
  revenue?: number;
  gross?: number;
  net?: number;
  percent?: number;
  percentage?: number;
};

function OrganizerAnalyticsSourcePerformance({
  rows,
  totalBookings,
  money,
}: {
  rows: OrganizerAnalyticsSourcePerformanceRow[];
  totalBookings: number;
  money: (value: number) => string;
}) {
  const fallbackRows: OrganizerAnalyticsSourcePerformanceRow[] = [
    { source: "Online", bookings: 0, tickets: 0, revenue: 0, percent: 0 },
    { source: "Offline", bookings: 0, tickets: 0, revenue: 0, percent: 0 },
    { source: "Reserved", bookings: 0, tickets: 0, revenue: 0, percent: 0 },
    { source: "Free", bookings: 0, tickets: 0, revenue: 0, percent: 0 },
  ];

  const safeRows = (rows.length ? rows : fallbackRows).map((row) => ({
    source: row.source,
    bookings: Number(row.bookings ?? row.orders ?? 0),
    tickets: Number(row.tickets ?? 0),
    revenue: Number(row.revenue ?? row.gross ?? row.net ?? 0),
    percent: Number(row.percent ?? row.percentage ?? 0),
  }));

  const totalTickets = safeRows.reduce((sum, row) => sum + row.tickets, 0);
  const totalRevenue = safeRows.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <section className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
            Sources
          </p>
          <h3 className="mt-1 text-sm font-black sm:text-base">Source performance</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-[var(--app-muted)]">
            Online, offline, reserved and free
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-[var(--app-subtle)] px-3 py-1 text-[10px] font-black text-[var(--app-muted)]">
          {Number(totalBookings ?? 0).toLocaleString("en-IN")} bookings
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1 2xl:grid-cols-2">
        {safeRows.map((source) => {
          const percent = Math.max(0, Math.min(100, source.percent));

          return (
            <article key={`source-${source.source}`} className="min-w-0 rounded-2xl bg-[var(--app-subtle)] p-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">{source.source}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[var(--app-muted)]">
                    {source.bookings.toLocaleString("en-IN")} orders
                  </p>
                </div>

                <p className="shrink-0 text-xs font-black text-[var(--color-brand-primary)]">
                  {percent}%
                </p>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${percent}%` }} />
              </div>

              <div className="mt-2">
                <p className="truncate text-sm font-black">{money(source.revenue)}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-[var(--app-muted)]">
                  {source.tickets.toLocaleString("en-IN")} tickets
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--app-subtle)] p-3">
        <div>
          <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Tickets</p>
          <p className="mt-1 text-sm font-black">{totalTickets.toLocaleString("en-IN")}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Revenue</p>
          <p className="mt-1 text-sm font-black">{money(totalRevenue)}</p>
        </div>
      </div>
    </section>
  );
}

function OrganizerAnalyticsCategoryPerformance({
  rows,
  money,
}: {
  rows: Array<{ category: string; revenue: number; tickets: number; events: number }>;
  money: (value: number) => string;
}) {
  const safeRows = rows.slice(0, 6);
  const maxRevenue = Math.max(...safeRows.map((row) => Number(row.revenue ?? 0)), 1);

  return (
    <section className="min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
            Category
          </p>
          <h3 className="mt-1 text-sm font-black sm:text-base">Category performance</h3>
        </div>

        <span className="shrink-0 rounded-full bg-[var(--app-subtle)] px-3 py-1 text-[10px] font-black text-[var(--app-muted)]">
          {safeRows.length} categories
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
        {safeRows.map((row) => {
          const percent = Math.max(3, Math.round((Number(row.revenue ?? 0) / maxRevenue) * 100));

          return (
            <article key={`category-${row.category}`} className="min-w-0 rounded-2xl bg-[var(--app-subtle)] p-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <p className="line-clamp-1 text-xs font-black">{row.category}</p>
                <p className="shrink-0 text-[10px] font-black text-[var(--color-brand-primary)]">
                  {Number(row.tickets ?? 0).toLocaleString("en-IN")} tkt
                </p>
              </div>

              <p className="mt-2 truncate text-sm font-black">{money(Number(row.revenue ?? 0))}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-[var(--app-muted)]">
                {Number(row.events ?? 0).toLocaleString("en-IN")} events
              </p>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${percent}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OrganizerAnalyticsView() {
  const [unifiedBookings, setUnifiedBookings] = useState<UnifiedBookingRecord[]>([]);
  const [offlineBookings, setOfflineBookings] = useState<OfflineBookingRecord[]>([]);
  const [checkIns, setCheckIns] = useState<OrganizerOfflineCheckInRecord[]>([]);
  const [eventMeta, setEventMeta] = useState<Map<string, OrganizerAnalyticsEventMeta>>(() => new Map());
  const [lastUpdated, setLastUpdated] = useState("Not synced");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All Events");
  const [dateRange, setDateRange] = useState<AnalyticsRange>("Last 30 Days");
  const [sourceFilter, setSourceFilter] = useState<AnalyticsSource>("All Sources");
  const [statusFilter, setStatusFilter] = useState<"All Status" | AnalyticsEventStatus>("All Status");
  const [sortBy, setSortBy] = useState<"Revenue" | "Tickets" | "Occupancy" | "Check-ins">("Revenue");

  const refreshAnalytics = () => {
    setIsRefreshing(true);

    try {
      setEventMeta(buildOrganizerAnalyticsEventMeta());
      setUnifiedBookings(readUnifiedBookings());
      setOfflineBookings(readOfflineBookings());
      setCheckIns(readOrganizerOfflineCheckIns());
      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      setEventMeta(new Map());
      setUnifiedBookings([]);
      setOfflineBookings([]);
      setCheckIns([]);
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 250);
    }
  };

  useEffect(() => {
    refreshAnalytics();

    const refreshOnFocus = () => refreshAnalytics();
    const refreshOnStorage = () => refreshAnalytics();
    const interval = window.setInterval(refreshAnalytics, 15000);

    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("storage", refreshOnStorage);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("storage", refreshOnStorage);
      window.clearInterval(interval);
    };
  }, []);

  const transactions = useMemo(
    () => buildAnalyticsTransactions({ unifiedBookings, offlineBookings, checkIns, eventMeta }),
    [checkIns, eventMeta, offlineBookings, unifiedBookings],
  );

  const eventOptions = useMemo(() => {
    const names = new Set<string>();
    eventMeta.forEach((meta) => names.add(meta.eventName));
    transactions.forEach((transaction) => names.add(transaction.eventName));

    return ["All Events", ...Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b))];
  }, [eventMeta, transactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesSearch =
        !query ||
        transaction.eventName.toLowerCase().includes(query) ||
        transaction.eventId.toLowerCase().includes(query) ||
        transaction.category.toLowerCase().includes(query) ||
        transaction.city.toLowerCase().includes(query) ||
        transaction.ticketType.toLowerCase().includes(query) ||
        transaction.paymentMode.toLowerCase().includes(query) ||
        transaction.source.toLowerCase().includes(query);

      const matchesEvent = eventFilter === "All Events" || transaction.eventName === eventFilter;
      const matchesRange = isWithinAnalyticsRange(transaction.issuedAt, dateRange);
      const matchesSource = sourceFilter === "All Sources" || transaction.source === sourceFilter;
      const matchesStatus = statusFilter === "All Status" || transaction.status === statusFilter;

      return matchesSearch && matchesEvent && matchesRange && matchesSource && matchesStatus;
    });
  }, [dateRange, eventFilter, search, sourceFilter, statusFilter, transactions]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const eventsFromTransactions = buildOrganizerAnalyticsEvents(filteredTransactions, eventMeta);
    const existingKeys = new Set(
      eventsFromTransactions.map((event) => getAnalyticsEventKey(event.eventId, event.eventName)),
    );

    const metaOnlyEvents =
      sourceFilter === "All Sources"
        ? Array.from(eventMeta.values())
          .filter((meta) => !existingKeys.has(getAnalyticsEventKey(meta.eventId, meta.eventName)))
          .filter((meta) => {
            const matchesSearch =
              !query ||
              meta.eventName.toLowerCase().includes(query) ||
              meta.eventId.toLowerCase().includes(query) ||
              meta.category.toLowerCase().includes(query) ||
              meta.city.toLowerCase().includes(query);

            const matchesEvent = eventFilter === "All Events" || meta.eventName === eventFilter;
            const matchesStatus = statusFilter === "All Status" || meta.status === statusFilter;

            return matchesSearch && matchesEvent && matchesStatus;
          })
          .map((meta) => ({
            eventId: meta.eventId,
            eventName: meta.eventName,
            category: meta.category,
            status: meta.status,
            city: meta.city,
            ticketsSold: 0,
            bookings: 0,
            attendees: 0,
            checkedIn: 0,
            capacity: meta.capacity,
            grossRevenue: 0,
            offlineRevenue: 0,
            reservedTickets: 0,
            refunds: 0,
            rating: meta.rating,
            sourceBreakdown: [
              { source: "Online", bookings: 0, tickets: 0, revenue: 0 },
              { source: "Offline", bookings: 0, tickets: 0, revenue: 0 },
              { source: "Reserved", bookings: 0, tickets: 0, revenue: 0 },
              { source: "Free", bookings: 0, tickets: 0, revenue: 0 },
            ],
          }) satisfies OrganizerAnalyticsEvent)
        : [];

    const nextEvents = [...eventsFromTransactions, ...metaOnlyEvents];

    return nextEvents.sort((a, b) => {
      if (sortBy === "Tickets") return b.ticketsSold - a.ticketsSold;
      if (sortBy === "Occupancy") return calculateOccupancyRate(b) - calculateOccupancyRate(a);
      if (sortBy === "Check-ins") return b.checkedIn - a.checkedIn;
      return b.grossRevenue - a.grossRevenue;
    });
  }, [eventFilter, eventMeta, filteredTransactions, search, sortBy, sourceFilter, statusFilter]);

  const totals = useMemo(() => {
    const ticketsSold = filteredEvents.reduce((sum, event) => sum + event.ticketsSold, 0);
    const bookings = filteredEvents.reduce((sum, event) => sum + event.bookings, 0);
    const attendees = filteredEvents.reduce((sum, event) => sum + event.attendees, 0);
    const checkedIn = filteredEvents.reduce((sum, event) => sum + event.checkedIn, 0);
    const capacity = filteredEvents.reduce((sum, event) => sum + event.capacity, 0);
    const grossRevenue = filteredEvents.reduce((sum, event) => sum + event.grossRevenue, 0);
    const netRevenue = filteredEvents.reduce((sum, event) => sum + calculateNetRevenue(event), 0);
    const refunds = filteredEvents.reduce((sum, event) => sum + event.refunds, 0);
    const pendingRevenue = filteredTransactions
      .filter((transaction) => transaction.paymentStatus === "Pending")
      .reduce((sum, transaction) => sum + transaction.grossRevenue, 0);
    const checkedInPercent = attendees ? Math.round((checkedIn / attendees) * 100) : 0;
    const occupancyRate = capacity ? Math.min(100, Math.round((ticketsSold / capacity) * 100)) : 0;
    const averageOrderValue = bookings ? Math.round(grossRevenue / bookings) : 0;
    const ticketsPerBooking = bookings ? Number((ticketsSold / bookings).toFixed(1)) : 0;

    return {
      ticketsSold,
      bookings,
      attendees,
      checkedIn,
      checkedInPercent,
      capacity,
      grossRevenue,
      netRevenue,
      refunds,
      pendingRevenue,
      occupancyRate,
      averageOrderValue,
      ticketsPerBooking,
    };
  }, [filteredEvents, filteredTransactions]);

  const trendData = useMemo(
    () => buildAnalyticsTrend(filteredTransactions, dateRange),
    [dateRange, filteredTransactions],
  );

  const sourceTotals = useMemo(() => buildSourceTotals(filteredEvents), [filteredEvents]);

  const statusRows = useMemo(() => {
    const statuses: AnalyticsEventStatus[] = [
      "Draft",
      "Pending Review",
      "Approved",
      "Published",
      "Completed",
      "Cancelled",
    ];

    return statuses.map((status) => ({
      status,
      value: filteredEvents.filter((event) => event.status === status).length,
    }));
  }, [filteredEvents]);

  const topEventRows = useMemo(
    () =>
      filteredEvents.slice(0, 6).map((event) => ({
        eventId: event.eventId,
        eventName: event.eventName,
        city: event.city,
        category: event.category,
        status: event.status,
        revenue: event.grossRevenue,
        netRevenue: calculateNetRevenue(event),
        tickets: event.ticketsSold,
        occupancy: calculateOccupancyRate(event),
        checkIns: event.checkedIn,
        health: getAnalyticsHealth(event),
      })),
    [filteredEvents],
  );

  const categoryRows = useMemo(() => {
    const map = new Map<string, { category: string; revenue: number; tickets: number; events: number }>();

    filteredEvents.forEach((event) => {
      const current = map.get(event.category) ?? {
        category: event.category,
        revenue: 0,
        tickets: 0,
        events: 0,
      };

      map.set(event.category, {
        category: event.category,
        revenue: current.revenue + event.grossRevenue,
        tickets: current.tickets + event.ticketsSold,
        events: current.events + 1,
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredEvents]);

  const resetFilters = () => {
    setSearch("");
    setEventFilter("All Events");
    setDateRange("Last 30 Days");
    setSourceFilter("All Sources");
    setStatusFilter("All Status");
    setSortBy("Revenue");
  };

  return (
    <Panel
      title="Analytics"
      description="Dynamic organizer analytics from events, bookings, sources, check-ins, revenue, refunds and capacity records."
    >
      <div className="mx-auto grid w-full max-w-[1500px] min-w-0 gap-3 overflow-x-hidden sm:gap-4">
        <section className="min-w-0 overflow-hidden rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-4">
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
                Live analytics
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--app-foreground)] sm:text-2xl">
                Organizer performance
              </h2>
              <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
                Live insights from event lifecycle, booking records, ticket sources, revenue and gate check-ins.
              </p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                Updated {lastUpdated}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={refreshAnalytics}
                disabled={isRefreshing}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[11px] font-black text-[var(--app-foreground)] disabled:opacity-60 sm:min-h-10 sm:text-xs"
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => exportAnalyticsCsv(filteredEvents)}
                disabled={!filteredEvents.length}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-brand-primary)] px-3 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:text-xs"
              >
                <Download className="size-3.5" />
                Export
              </button>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <AnalyticsMetricCard
            title="Gross Revenue"
            value={formatAnalyticsMoney(totals.grossRevenue)}
            detail={`${formatAnalyticsMoney(totals.netRevenue)} estimated net`}
            icon={DollarSign}
          />
          <AnalyticsMetricCard
            title="Tickets Sold"
            value={totals.ticketsSold.toLocaleString("en-IN")}
            detail={`${totals.bookings.toLocaleString("en-IN")} booking records`}
            icon={Ticket}
          />
          <AnalyticsMetricCard
            title="Event Fill Rate"
            value={`${totals.occupancyRate}%`}
            detail={`${totals.ticketsSold.toLocaleString("en-IN")}/${totals.capacity.toLocaleString("en-IN")} capacity`}
            icon={BarChart3}
          />
          <AnalyticsMetricCard
            title="Gate Check-ins"
            value={totals.checkedIn.toLocaleString("en-IN")}
            detail={`${totals.checkedInPercent}% of attendees`}
            icon={Users}
          />
        </section>

        <section className="min-w-0 rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-3">
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_150px_150px_150px_130px_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search event, city, source..."
              className="min-h-9 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[11px] font-semibold outline-none focus:border-[var(--color-brand-primary)] sm:min-h-10 sm:text-xs xl:text-sm"
            />

            <select
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
              className="min-h-9 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-[11px] font-black outline-none sm:min-h-10 sm:px-3 sm:text-xs"
            >
              {eventOptions.map((eventName) => (
                <option key={eventName}>{eventName}</option>
              ))}
            </select>

            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as AnalyticsRange)}
              className="min-h-9 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-[11px] font-black outline-none sm:min-h-10 sm:px-3 sm:text-xs"
            >
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Year</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as AnalyticsSource)}
              className="min-h-9 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-[11px] font-black outline-none sm:min-h-10 sm:px-3 sm:text-xs"
            >
              <option>All Sources</option>
              <option>Online</option>
              <option>Offline</option>
              <option>Reserved</option>
              <option>Free</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "All Status" | AnalyticsEventStatus)}
              className="min-h-9 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-[11px] font-black outline-none sm:min-h-10 sm:px-3 sm:text-xs"
            >
              <option>All Status</option>
              <option>Draft</option>
              <option>Pending Review</option>
              <option>Approved</option>
              <option>Published</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "Revenue" | "Tickets" | "Occupancy" | "Check-ins")}
              className="min-h-9 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-[11px] font-black outline-none sm:min-h-10 sm:px-3 sm:text-xs"
            >
              <option>Revenue</option>
              <option>Tickets</option>
              <option>Occupancy</option>
              <option>Check-ins</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-9 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[11px] font-black sm:min-h-10 sm:text-xs"
            >
              Reset
            </button>
          </div>
        </section>

        {!filteredEvents.length ? (
          <AnalyticsEmptyState onReset={resetFilters} />
        ) : (
          <>
            <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                <OrganizerAnalyticsTrendCard rows={trendData} money={formatAnalyticsMoney} />
                <OrganizerAnalyticsTopEventsCard rows={topEventRows} money={formatAnalyticsMoney} />
                <OrganizerAnalyticsFillRateCard rows={topEventRows} />
                <OrganizerAnalyticsStatusCard rows={statusRows} />
              </div>

              <OrganizerAnalyticsSourcePerformance
                rows={sourceTotals}
                totalBookings={totals.bookings}
                money={formatAnalyticsMoney}
              />
            </section>

            <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-4">
              <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                    Events
                  </p>
                  <h2 className="mt-1 text-base font-black text-[var(--app-foreground)] sm:text-xl">
                    Event analytics table
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                    Full-width on desktop, compact cards on mobile.
                  </p>
                </div>

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as "Revenue" | "Tickets" | "Occupancy" | "Check-ins")}
                  className="min-h-9 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[11px] font-black outline-none sm:min-h-10 sm:text-xs"
                >
                  <option>Revenue</option>
                  <option>Tickets</option>
                  <option>Occupancy</option>
                  <option>Check-ins</option>
                </select>
              </div>

              <div className="grid gap-2 xl:hidden">
                {filteredEvents.map((event) => (
                  <AnalyticsMobileEventCard
                    key={`analytics-mobile-${event.eventId}-${event.eventName}`}
                    event={event}
                  />
                ))}
              </div>

              <div className="hidden min-w-0 overflow-x-auto rounded-2xl border border-[var(--app-border)] xl:block">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase text-[var(--app-muted)]">
                      <th className="w-[34%] px-4 py-4">Event</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Tickets</th>
                      <th className="px-4 py-4">Revenue</th>
                      <th className="px-4 py-4">Fill rate</th>
                      <th className="px-4 py-4">Check-ins</th>
                      <th className="px-4 py-4">Health</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEvents.map((event) => (
                      <tr
                        key={`analytics-table-${event.eventId}-${event.eventName}`}
                        className="border-b border-[var(--app-border)] last:border-0 hover:bg-[var(--app-subtle)]"
                      >
                        <td className="px-4 py-4 align-top">
                          <p className="break-words font-black text-[var(--app-foreground)]">{event.eventName}</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                            {event.city} • {event.category}
                          </p>
                          <p className="mt-1 break-all text-[10px] font-black uppercase text-[var(--color-brand-primary)]">
                            {event.eventId || "Event"}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill label={event.status} />
                        </td>
                        <td className="px-4 py-4 align-top font-black">
                          {event.ticketsSold.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-4 align-top font-black text-[#15803D]">
                          {formatAnalyticsMoney(event.grossRevenue)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-black">{calculateOccupancyRate(event)}%</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                            {event.ticketsSold}/{event.capacity || "∞"}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top font-black">
                          {event.checkedIn.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill label={getAnalyticsHealth(event)} />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => window.alert(`${event.eventName} event analytics detail can be connected to a dedicated route later.`)}
                              className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() => exportAnalyticsCsv([event])}
                              className="rounded-xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white"
                            >
                              Export
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
              <div className="grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-1">
                <AnalyticsMetricCard
                  title="Pending Revenue"
                  value={formatAnalyticsMoney(totals.pendingRevenue)}
                  detail="Unpaid or partially paid records"
                  icon={Clock}
                />
                <AnalyticsMetricCard
                  title="Refunds"
                  value={formatAnalyticsMoney(totals.refunds)}
                  detail="Refunded or cancelled value"
                  icon={RefreshCw}
                />
                <AnalyticsMetricCard
                  title="Average Order"
                  value={formatAnalyticsMoney(totals.averageOrderValue)}
                  detail="Gross revenue per booking"
                  icon={CreditCard}
                />
                <AnalyticsMetricCard
                  title="Avg Tickets / Order"
                  value={totals.ticketsPerBooking.toLocaleString("en-IN")}
                  detail="Tickets per booking record"
                  icon={CheckCircle2}
                />
              </div>

              {categoryRows.length ? (
                <OrganizerAnalyticsCategoryPerformance rows={categoryRows} money={formatAnalyticsMoney} />
              ) : null}
            </section>
          </>
        )}
      </div>
    </Panel>
  );
}






type OrganizerAnalyticsTopEventRow = {
  eventId: string;
  eventName: string;
  city: string;
  category: string;
  status: AnalyticsEventStatus;
  revenue: number;
  netRevenue: number;
  tickets: number;
  occupancy: number;
  checkIns: number;
  health: string;
};

function OrganizerAnalyticsTrendVisual({
  rows,
}: {
  rows: Array<{ label: string; revenue: number; tickets: number; attendees: number }>;
}) {
  const safeRows = rows.length ? rows : [{ label: "No data", revenue: 0, tickets: 0, attendees: 0 }];
  const hasData = safeRows.some((row) => row.revenue > 0 || row.tickets > 0 || row.attendees > 0);
  const maxRevenue = Math.max(...safeRows.map((row) => row.revenue), 1);
  const maxTickets = Math.max(...safeRows.map((row) => row.tickets), 1);
  const totalRevenue = safeRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalTickets = safeRows.reduce((sum, row) => sum + row.tickets, 0);
  const totalAttendees = safeRows.reduce((sum, row) => sum + row.attendees, 0);

  const left = 16;
  const right = 344;
  const top = 24;
  const bottom = 116;
  const width = right - left;
  const height = bottom - top;
  const points = safeRows.map((row, index) => {
    const x = safeRows.length === 1 ? 180 : left + (index / (safeRows.length - 1)) * width;
    const y = bottom - (row.revenue / maxRevenue) * height;
    return { x, y: Math.max(top, Math.min(bottom, y)) };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const fillPoints = `${left},${bottom + 2} ${linePoints} ${right},${bottom + 2}`;

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">Revenue</p>
          <h3 className="mt-1 text-base font-black text-[var(--app-foreground)] sm:text-lg">Revenue trend</h3>
          <p className="mt-1 text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">Updates when booking records change</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <BarChart3 className="size-4" />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <AnalyticsMiniBox label="Revenue" value={formatAnalyticsMoney(totalRevenue)} />
        <AnalyticsMiniBox label="Tickets" value={totalTickets.toLocaleString("en-IN")} />
        <AnalyticsMiniBox label="Attendees" value={totalAttendees.toLocaleString("en-IN")} />
      </div>

      <div className="mt-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
        {!hasData ? (
          <div className="grid min-h-[150px] place-items-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-center">
            <div className="max-w-[220px]">
              <p className="text-xs font-black text-[var(--app-foreground)]">No movement yet</p>
              <p className="mt-1 text-[10px] font-semibold leading-4 text-[var(--app-muted)]">Create bookings to see revenue and ticket movement here.</p>
            </div>
          </div>
        ) : (
          <>
            <svg viewBox="0 0 360 144" role="img" aria-label="Revenue trend" className="h-[144px] w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="organizerAnalyticsRevenueFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="var(--app-border)" strokeWidth="1" />
              <line x1={left} y1="86" x2={right} y2="86" stroke="var(--app-border)" strokeWidth="1" strokeDasharray="4 6" />
              <line x1={left} y1="56" x2={right} y2="56" stroke="var(--app-border)" strokeWidth="1" strokeDasharray="4 6" />
              <line x1={left} y1="26" x2={right} y2="26" stroke="var(--app-border)" strokeWidth="1" strokeDasharray="4 6" />
              <polygon points={fillPoints} fill="url(#organizerAnalyticsRevenueFill)" />
              <polyline points={linePoints} fill="none" stroke="var(--color-brand-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point, index) => (
                <circle key={`analytics-trend-dot-${safeRows[index].label}-${index}`} cx={point.x} cy={point.y} r="5" fill="var(--app-elevated)" stroke="var(--color-brand-primary)" strokeWidth="3" />
              ))}
            </svg>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {safeRows.slice(0, 4).map((row, index) => {
                const revenuePercent = Math.max(4, Math.round((row.revenue / maxRevenue) * 100));
                const ticketPercent = Math.max(4, Math.round((row.tickets / maxTickets) * 100));

                return (
                  <article key={`analytics-trend-period-${row.label}-${index}`} className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2">
                    <p className="truncate text-[10px] font-black text-[var(--app-foreground)]">{row.label}</p>
                    <p className="mt-1 truncate text-[11px] font-black text-[var(--color-brand-primary)]">{formatAnalyticsMoney(row.revenue)}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-[var(--app-muted)]">{row.tickets.toLocaleString("en-IN")} tickets</p>
                    <div className="mt-2 space-y-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-subtle)]">
                        <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${revenuePercent}%` }} />
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-subtle)]">
                        <div className="h-full rounded-full bg-[var(--color-brand-secondary)]" style={{ width: `${ticketPercent}%` }} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function OrganizerAnalyticsTopEventsVisual({ rows }: { rows: OrganizerAnalyticsTopEventRow[] }) {
  const maxRevenue = Math.max(...rows.map((row) => row.revenue), 1);

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">Revenue</p>
      <h3 className="mt-1 text-base font-black text-[var(--app-foreground)] sm:text-lg">Top event revenue</h3>
      <p className="mt-1 text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">Sorted by selected metric</p>

      <div className="mt-3 grid gap-2">
        {rows.length ? rows.map((row) => {
          const percent = Math.round((row.revenue / maxRevenue) * 100);
          return (
            <article key={`analytics-top-event-${row.eventId}-${row.eventName}`} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-black text-[var(--app-foreground)] sm:text-sm">{row.eventName}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[var(--app-muted)]">{row.tickets.toLocaleString("en-IN")} tickets • {row.status}</p>
                </div>
                <p className="shrink-0 text-right text-xs font-black text-[#15803D] sm:text-sm">{formatAnalyticsMoney(row.revenue)}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${percent}%` }} />
              </div>
            </article>
          );
        }) : (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-5 text-center text-xs font-semibold text-[var(--app-muted)]">No event revenue yet.</div>
        )}
      </div>
    </section>
  );
}

function OrganizerAnalyticsOccupancyVisual({ rows }: { rows: OrganizerAnalyticsTopEventRow[] }) {
  const sorted = [...rows].sort((a, b) => b.occupancy - a.occupancy).slice(0, 5);

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">Capacity</p>
      <h3 className="mt-1 text-base font-black text-[var(--app-foreground)] sm:text-lg">Event fill rate</h3>
      <p className="mt-1 text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">Tickets sold vs total event capacity</p>

      <div className="mt-3 grid gap-2">
        {sorted.length ? sorted.map((row) => (
          <article key={`occupancy-${row.eventId}-${row.eventName}`} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="line-clamp-1 text-xs font-black text-[var(--app-foreground)]">{row.eventName}</p>
              <p className="shrink-0 text-xs font-black text-[var(--color-brand-primary)]">{row.occupancy}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-elevated)]">
              <div className="h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${Math.min(100, Math.max(0, row.occupancy))}%` }} />
            </div>
            <p className="mt-1 text-[10px] font-semibold text-[var(--app-muted)]">{row.tickets.toLocaleString("en-IN")} tickets • {row.health}</p>
          </article>
        )) : (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-5 text-center text-xs font-semibold text-[var(--app-muted)]">No capacity records yet.</div>
        )}
      </div>
    </section>
  );
}

function OrganizerAnalyticsStatusVisual({ rows }: { rows: Array<{ status: AnalyticsEventStatus; value: number }> }) {
  const total = Math.max(rows.reduce((sum, row) => sum + row.value, 0), 1);

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[1.75rem] sm:p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">Lifecycle</p>
      <h3 className="mt-1 text-base font-black text-[var(--app-foreground)] sm:text-lg">Event status</h3>
      <p className="mt-1 text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">Approval and publish distribution</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {rows.map((row) => {
          const percent = Math.round((row.value / total) * 100);
          return (
            <article key={`analytics-status-${row.status}`} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
              <p className="line-clamp-1 text-[9px] font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">{row.status}</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="text-lg font-black text-[var(--app-foreground)]">{row.value}</p>
                <p className="text-[10px] font-black text-[var(--color-brand-primary)]">{percent}%</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}




function AnalyticsMetricCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:rounded-3xl sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)] sm:text-xs">{title}</p>
          <p className="mt-2 break-words text-[clamp(1.25rem,6vw,2rem)] font-black leading-none text-[var(--app-foreground)]">{value}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] sm:size-11">
          <Icon className="size-4 sm:size-5" />
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-[10px] font-semibold leading-4 text-[var(--app-muted)] sm:text-xs sm:leading-5">{detail}</p>
    </article>
  );
}

function AnalyticsChartCard({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[2rem] sm:p-5">
      <div className="mb-3 min-w-0">
        <p className="break-words text-sm font-black text-[var(--app-foreground)] sm:text-lg">{title}</p>
        <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">{detail}</p>
      </div>
      <div className="h-[280px] min-w-0 sm:h-[320px]">{children}</div>
    </section>
  );
}

function AnalyticsInsightCard({ title, detail, tone }: { title: string; detail: string; tone: "success" | "warning" | "danger" | "info" }) {
  const toneClass = {
    success: "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#15803D]",
    warning: "border-[var(--color-brand-accent)]/25 bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]",
    danger: "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]",
    info: "border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 text-[var(--color-brand-secondary)]",
  }[tone];

  return (
    <article className={`min-w-0 rounded-2xl border p-3 ${toneClass}`}>
      <p className="break-words text-sm font-black">{title}</p>
      <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">{detail}</p>
    </article>
  );
}

function AnalyticsMobileEventCard({ event }: { event: OrganizerAnalyticsEvent }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-all text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">{event.eventId || "Event"}</p>
          <h3 className="mt-1 break-words text-sm font-black text-[var(--app-foreground)]">{event.eventName}</h3>
          <p className="mt-1 break-words text-xs font-semibold text-[var(--app-muted)]">{event.city} • {event.category}</p>
        </div>
        <StatusPill label={event.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <AnalyticsMiniBox label="Tickets" value={event.ticketsSold.toLocaleString("en-IN")} />
        <AnalyticsMiniBox label="Revenue" value={formatAnalyticsMoney(event.grossRevenue)} />
        <AnalyticsMiniBox label="Occupancy" value={`${calculateOccupancyRate(event)}%`} />
        <AnalyticsMiniBox label="Health" value={getAnalyticsHealth(event)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => window.alert(`${event.eventName} analytics detail can open as a dedicated event analytics route later.`)} className="min-h-10 rounded-xl border border-[var(--app-border)] px-3 text-xs font-black">View</button>
        <button type="button" onClick={() => exportAnalyticsCsv([event])} className="min-h-10 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white">Export</button>
      </div>
    </article>
  );
}

function AnalyticsMiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 break-words text-xs font-black text-[var(--app-foreground)]">{value}</p>
    </div>
  );
}

function AnalyticsEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <section className="grid min-h-64 place-items-center rounded-[1.5rem] border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center sm:rounded-[2rem]">
      <div className="max-w-md">
        <BarChart3 className="mx-auto size-10 text-[var(--color-brand-primary)]" />
        <h2 className="mt-4 text-xl font-black text-[var(--app-foreground)]">No analytics data found for selected filters.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">
          Change event, date range, source, or status filters. Analytics will fill automatically from online/offline bookings after backend integration.
        </p>
        <button type="button" onClick={onReset} className="mt-4 min-h-11 rounded-2xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white">
          Reset Filters
        </button>
      </div>
    </section>
  );
}







type OrganizerOfferStatus = "Active" | "Paused" | "Expired" | "Draft";
type OrganizerOfferDiscountType = "Percentage" | "Fixed Amount";
type OrganizerOfferVisibility = "Show on Event Page" | "Checkout Only" | "Hidden";
type OrganizerOfferPlacement =
  | "Event Details Page"
  | "Checkout Coupon Box"
  | "Home Promotional Banner"
  | "Event Card Badge"
  | "Organizer Campaign Link";

type OrganizerOffer = {
  id: string;
  name: string;
  body: string;
  code: string;
  eventName: string;
  discountType: OrganizerOfferDiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number;
  usageLimit: number;
  usedCount: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: OrganizerOfferStatus;
  visibility: OrganizerOfferVisibility;
  placement: OrganizerOfferPlacement;
  thumbnailUrl: string;
  organizerAcceptedLiability: boolean;
};

type OrganizerOfferForm = Omit<OrganizerOffer, "id" | "usedCount">;

const organizerOffersStorageKey = "buizz-organizer-offers-v3";

const initialOrganizerOffers: OrganizerOffer[] = [
  {
    id: "OFF-001",
    name: "Early Bird",
    body: "Save on premium tickets when you book early. Limited coupons available before the campaign closes.",
    code: "EARLY10",
    eventName: "Arijit Singh Premium Arena",
    discountType: "Percentage",
    discountValue: 10,
    minOrderValue: 999,
    maxDiscount: 500,
    usageLimit: 500,
    usedCount: 184,
    startDate: "2026-06-01",
    startTime: "10:00",
    endDate: "2026-07-15",
    endTime: "23:59",
    status: "Active",
    visibility: "Show on Event Page",
    placement: "Event Card Badge",
    thumbnailUrl: "",
    organizerAcceptedLiability: true,
  },
  {
    id: "OFF-002",
    name: "Student Pass",
    body: "Special student-friendly discount for verified counter and checkout bookings.",
    code: "STUDENT150",
    eventName: "Open Air Comedy Weekend",
    discountType: "Fixed Amount",
    discountValue: 150,
    minOrderValue: 499,
    maxDiscount: 150,
    usageLimit: 300,
    usedCount: 92,
    startDate: "2026-06-05",
    startTime: "09:00",
    endDate: "2026-06-30",
    endTime: "22:00",
    status: "Active",
    visibility: "Checkout Only",
    placement: "Checkout Coupon Box",
    thumbnailUrl: "",
    organizerAcceptedLiability: true,
  },
  {
    id: "OFF-003",
    name: "Couple Offer",
    body: "Book two or more tickets together and unlock an event-specific couple discount.",
    code: "COUPLE20",
    eventName: "Indie Music Festival",
    discountType: "Percentage",
    discountValue: 20,
    minOrderValue: 1999,
    maxDiscount: 800,
    usageLimit: 200,
    usedCount: 71,
    startDate: "2026-06-10",
    startTime: "11:00",
    endDate: "2026-08-01",
    endTime: "23:00",
    status: "Paused",
    visibility: "Show on Event Page",
    placement: "Event Details Page",
    thumbnailUrl: "",
    organizerAcceptedLiability: true,
  },
];

const emptyOfferForm: OrganizerOfferForm = {
  name: "",
  body: "",
  code: "",
  eventName: "Arijit Singh Premium Arena",
  discountType: "Percentage",
  discountValue: 10,
  minOrderValue: 0,
  maxDiscount: 0,
  usageLimit: 100,
  startDate: "",
  startTime: "10:00",
  endDate: "",
  endTime: "23:59",
  status: "Draft",
  visibility: "Show on Event Page",
  placement: "Event Details Page",
  thumbnailUrl: "",
  organizerAcceptedLiability: false,
};

function normalizeOrganizerOffer(value: Partial<OrganizerOffer>, index = 0): OrganizerOffer {
  return {
    id: String(value.id ?? `OFF-${String(index + 1).padStart(3, "0")}`),
    name: String(value.name ?? ""),
    body: String(
      value.body ??
      "Add a clear offer description so customers understand the benefit before checkout.",
    ),
    code: String(value.code ?? "").toUpperCase(),
    eventName: String(value.eventName ?? ""),
    discountType: value.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage",
    discountValue: Number(value.discountValue ?? 0),
    minOrderValue: Number(value.minOrderValue ?? 0),
    maxDiscount: Number(value.maxDiscount ?? 0),
    usageLimit: Math.max(1, Number(value.usageLimit ?? 100)),
    usedCount: Math.max(0, Number(value.usedCount ?? 0)),
    startDate: String(value.startDate ?? ""),
    startTime: String(value.startTime ?? "10:00"),
    endDate: String(value.endDate ?? ""),
    endTime: String(value.endTime ?? "23:59"),
    status:
      value.status === "Active" ||
        value.status === "Paused" ||
        value.status === "Expired" ||
        value.status === "Draft"
        ? value.status
        : "Draft",
    visibility:
      value.visibility === "Checkout Only" || value.visibility === "Hidden"
        ? value.visibility
        : "Show on Event Page",
    placement:
      value.placement === "Checkout Coupon Box" ||
        value.placement === "Home Promotional Banner" ||
        value.placement === "Event Card Badge" ||
        value.placement === "Organizer Campaign Link"
        ? value.placement
        : "Event Details Page",
    thumbnailUrl: String(value.thumbnailUrl ?? ""),
    organizerAcceptedLiability: Boolean(value.organizerAcceptedLiability),
  };
}

function readOrganizerOffersFromStorage() {
  if (typeof window === "undefined") return initialOrganizerOffers;

  try {
    const stored = window.localStorage.getItem(organizerOffersStorageKey);
    if (!stored) return initialOrganizerOffers;

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return initialOrganizerOffers;

    const normalized = parsed.map((item, index) =>
      normalizeOrganizerOffer(item as Partial<OrganizerOffer>, index),
    );

    return normalized.length ? normalized : initialOrganizerOffers;
  } catch {
    return initialOrganizerOffers;
  }
}

function writeOrganizerOffersToStorage(offers: OrganizerOffer[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(organizerOffersStorageKey, JSON.stringify(offers));
}

function offerDateTimeValue(date: string, time: string) {
  if (!date) return null;
  const parsed = new Date(`${date}T${time || "00:00"}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEffectiveOfferStatus(offer: OrganizerOffer): OrganizerOfferStatus {
  if (offer.status === "Draft" || offer.status === "Paused") return offer.status;

  const end = offerDateTimeValue(offer.endDate, offer.endTime);
  if (end && end.getTime() < Date.now()) return "Expired";

  if (offer.usedCount >= offer.usageLimit) return "Expired";

  return offer.status;
}

function getOfferDiscountLabel(offer: Pick<OrganizerOffer, "discountType" | "discountValue">) {
  return offer.discountType === "Percentage"
    ? `${offer.discountValue}% Off`
    : `₹${Number(offer.discountValue || 0).toLocaleString("en-IN")} Off`;
}

function getOfferValidityLabel(offer: Pick<OrganizerOffer, "startDate" | "startTime" | "endDate" | "endTime">) {
  const start = offer.startDate ? `${offer.startDate} ${offer.startTime || ""}` : "Start pending";
  const end = offer.endDate ? `${offer.endDate} ${offer.endTime || ""}` : "End pending";
  return `${start} → ${end}`;
}

function validateOrganizerOfferForm(
  form: OrganizerOfferForm,
  existingOffers: OrganizerOffer[],
  editingOfferId?: string,
) {
  if (!form.name.trim()) return "Offer title is required.";
  if (!form.body.trim()) return "Offer body/description is required.";
  if (!form.code.trim()) return "Coupon code is required.";
  if (!/^[A-Z0-9_-]{3,24}$/.test(form.code.trim().toUpperCase())) {
    return "Coupon code must be 3-24 characters and use only letters, numbers, underscore, or dash.";
  }
  if (!form.eventName.trim()) return "Select an event for this offer.";
  if (form.discountValue <= 0) return "Discount worth must be greater than 0.";
  if (form.discountType === "Percentage" && form.discountValue > 100) {
    return "Percentage discount cannot be more than 100%.";
  }
  if (form.minOrderValue < 0) return "Minimum order amount cannot be negative.";
  if (form.maxDiscount < 0) return "Maximum discount cannot be negative.";
  if (form.usageLimit <= 0) return "Usage limit must be greater than 0.";
  if (!form.startDate || !form.startTime) return "Offer start date and time are required.";
  if (!form.endDate || !form.endTime) return "Offer expiry date and time are required.";

  const start = offerDateTimeValue(form.startDate, form.startTime);
  const end = offerDateTimeValue(form.endDate, form.endTime);

  if (!start || !end) return "Offer date/time is invalid.";
  if (end.getTime() <= start.getTime()) return "Expiry date/time must be after start date/time.";

  const codeExists = existingOffers.some(
    (offer) =>
      offer.code.toUpperCase() === form.code.trim().toUpperCase() &&
      offer.id !== editingOfferId,
  );

  if (codeExists) return "This coupon code already exists. Use a unique code.";
  if (!form.organizerAcceptedLiability) {
    return "Please confirm that the offer discount will be borne by the organizer.";
  }

  return "";
}

function OrganizerOffersView() {
  const [offers, setOffers] = useState<OrganizerOffer[]>(initialOrganizerOffers);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All Events");
  const [statusFilter, setStatusFilter] = useState<"All Status" | OrganizerOfferStatus>("All Status");
  const [placementFilter, setPlacementFilter] = useState<"All Placements" | OrganizerOfferPlacement>("All Placements");
  const [showCreate, setShowCreate] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OrganizerOffer | null>(null);
  const [viewOffer, setViewOffer] = useState<OrganizerOffer | null>(null);
  const [previewOffer, setPreviewOffer] = useState<OrganizerOffer | null>(null);
  const [form, setForm] = useState<OrganizerOfferForm>(emptyOfferForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setOffers(readOrganizerOffersFromStorage());
  }, []);

  const organizerEventNames = useOrganizerEventNames(offers.map((offer) => offer.eventName));
  const events = useMemo(() => ["All Events", ...organizerEventNames], [organizerEventNames]);

  const persistOffers = (nextOffers: OrganizerOffer[]) => {
    setOffers(nextOffers);
    writeOrganizerOffersToStorage(nextOffers);
  };

  const filteredOffers = offers.filter((offer) => {
    const query = search.trim().toLowerCase();
    const effectiveStatus = getEffectiveOfferStatus(offer);

    const matchesSearch =
      !query ||
      offer.name.toLowerCase().includes(query) ||
      offer.body.toLowerCase().includes(query) ||
      offer.code.toLowerCase().includes(query) ||
      offer.eventName.toLowerCase().includes(query);

    const matchesEvent = eventFilter === "All Events" || offer.eventName === eventFilter;
    const matchesStatus = statusFilter === "All Status" || effectiveStatus === statusFilter;
    const matchesPlacement = placementFilter === "All Placements" || offer.placement === placementFilter;

    return matchesSearch && matchesEvent && matchesStatus && matchesPlacement;
  });

  const totalRedemptions = offers.reduce((sum, offer) => sum + offer.usedCount, 0);
  const activeOffers = offers.filter((offer) => getEffectiveOfferStatus(offer) === "Active").length;
  const discountGiven = offers.reduce((sum, offer) => {
    const averageDiscount = offer.discountType === "Percentage" ? offer.maxDiscount || 250 : offer.discountValue;
    return sum + averageDiscount * offer.usedCount;
  }, 0);

  const resetFilters = () => {
    setSearch("");
    setEventFilter("All Events");
    setStatusFilter("All Status");
    setPlacementFilter("All Placements");
  };

  const openCreate = () => {
    const firstEvent = organizerEventNames[0] ?? "";
    setEditingOffer(null);
    setForm({
      ...emptyOfferForm,
      eventName: firstEvent || emptyOfferForm.eventName,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
    });
    setFormError("");
    setShowCreate(true);
  };

  const openEdit = (offer: OrganizerOffer) => {
    setEditingOffer(offer);
    setForm({
      name: offer.name,
      body: offer.body,
      code: offer.code,
      eventName: offer.eventName,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      minOrderValue: offer.minOrderValue,
      maxDiscount: offer.maxDiscount,
      usageLimit: offer.usageLimit,
      startDate: offer.startDate,
      startTime: offer.startTime,
      endDate: offer.endDate,
      endTime: offer.endTime,
      status: offer.status === "Expired" ? "Paused" : offer.status,
      visibility: offer.visibility,
      placement: offer.placement,
      thumbnailUrl: offer.thumbnailUrl,
      organizerAcceptedLiability: offer.organizerAcceptedLiability,
    });
    setFormError("");
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setEditingOffer(null);
    setForm(emptyOfferForm);
    setFormError("");
  };

  const saveOffer = () => {
    const error = validateOrganizerOfferForm(form, offers, editingOffer?.id);
    if (error) {
      setFormError(error);
      return;
    }

    if (editingOffer) {
      const nextOffers = offers.map((offer) =>
        offer.id === editingOffer.id
          ? normalizeOrganizerOffer({
            ...offer,
            ...form,
            code: form.code.toUpperCase(),
          })
          : offer,
      );

      persistOffers(nextOffers);
    } else {
      const newOffer: OrganizerOffer = normalizeOrganizerOffer({
        id: `OFF-${Date.now().toString().slice(-6)}`,
        ...form,
        code: form.code.toUpperCase(),
        usedCount: 0,
      });

      persistOffers([newOffer, ...offers]);
    }

    closeCreate();
  };

  const toggleOfferStatus = (id: string) => {
    const nextOffers: OrganizerOffer[] = offers.map((offer): OrganizerOffer => {
      if (offer.id !== id) return offer;

      const nextStatus: OrganizerOfferStatus =
        getEffectiveOfferStatus(offer) === "Active" ? "Paused" : "Active";

      return {
        ...offer,
        status: nextStatus,
      };
    });

    persistOffers(nextOffers);
  };

  const duplicateOffer = (offer: OrganizerOffer) => {
    const copy: OrganizerOffer = normalizeOrganizerOffer({
      ...offer,
      id: `OFF-${Date.now().toString().slice(-6)}`,
      name: `${offer.name} Copy`,
      code: `${offer.code}COPY`.slice(0, 24).toUpperCase(),
      status: "Draft",
      usedCount: 0,
    });

    persistOffers([copy, ...offers]);
  };

  const deleteOffer = (id: string) => {
    const confirmed = window.confirm("Delete this offer?");
    if (!confirmed) return;

    persistOffers(offers.filter((offer) => offer.id !== id));
  };

  const formatMoney = (value: number) => `₹${value.toLocaleString("en-IN")}`;

  return (
    <Panel
      title="Offers & Coupons"
      description="Create, preview, and manage event-specific offers, coupon codes, campaign placements, validity windows, and checkout discount rules."
    >
      <div className="grid w-full min-w-0 gap-3 overflow-x-hidden sm:gap-5">
        <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_14px_38px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem]">
          <div className="grid min-w-0 gap-3 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
                Organizer Offer Manager
              </p>
              <h2 className="mt-1 break-words text-xl font-black tracking-tight text-[var(--app-foreground)] sm:mt-2 sm:text-3xl">
                Create campaign-ready coupons
              </h2>
              <p className="mt-1 max-w-3xl break-words text-xs font-semibold leading-5 text-[var(--app-muted)] sm:mt-2 sm:text-sm sm:leading-6">
                Configure coupon code, discount rules, validity, placement, and customer preview before activating the offer.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(236,27,114,0.20)] sm:min-h-12 sm:w-auto sm:px-5"
            >
              <PlusCircle className="size-4" />
              Create New Offer
            </button>
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <OfferStatCard title="Total Offers" value={offers.length} detail="All campaigns" />
          <OfferStatCard title="Active Offers" value={activeOffers} detail="Available now" />
          <OfferStatCard title="Redemptions" value={totalRedemptions} detail="Usage count" />
          <OfferStatCard title="Discount Given" value={formatMoney(discountGiven)} detail="Est. savings" />
        </section>

        <section className="grid min-w-0 gap-3 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-4">
          <div className="grid gap-3 2xl:hidden">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search offer, coupon code, event..."
              className="min-h-11 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
            />

            <details className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-black">
                Filters
                <span className="shrink-0 rounded-full bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                  Open
                </span>
              </summary>

              <div className="grid gap-3 border-t border-[var(--app-border)] p-3 sm:grid-cols-2">
                <select
                  value={eventFilter}
                  onChange={(event) => setEventFilter(event.target.value)}
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black outline-none"
                >
                  {events.map((event) => (
                    <option key={event}>{event}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "All Status" | OrganizerOfferStatus)
                  }
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black outline-none"
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Paused</option>
                  <option>Expired</option>
                  <option>Draft</option>
                </select>

                <select
                  value={placementFilter}
                  onChange={(event) =>
                    setPlacementFilter(event.target.value as "All Placements" | OrganizerOfferPlacement)
                  }
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black outline-none sm:col-span-2"
                >
                  <option>All Placements</option>
                  <option>Event Details Page</option>
                  <option>Checkout Coupon Box</option>
                  <option>Home Promotional Banner</option>
                  <option>Event Card Badge</option>
                  <option>Organizer Campaign Link</option>
                </select>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-3 text-sm font-black text-white"
                >
                  <PlusCircle className="size-4" />
                  Create Offer
                </button>
              </div>
            </details>
          </div>

          <div className="hidden gap-3 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_220px_160px_230px_auto_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search offer name, coupon code, description, or event..."
              className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold outline-none focus:border-[var(--color-brand-primary)]"
            />

            <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black outline-none">
              {events.map((event) => (
                <option key={event}>{event}</option>
              ))}
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All Status" | OrganizerOfferStatus)} className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black outline-none">
              <option>All Status</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Expired</option>
              <option>Draft</option>
            </select>

            <select value={placementFilter} onChange={(event) => setPlacementFilter(event.target.value as "All Placements" | OrganizerOfferPlacement)} className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black outline-none">
              <option>All Placements</option>
              <option>Event Details Page</option>
              <option>Checkout Coupon Box</option>
              <option>Home Promotional Banner</option>
              <option>Event Card Badge</option>
              <option>Organizer Campaign Link</option>
            </select>

            <button type="button" onClick={resetFilters} className="min-h-11 rounded-xl border border-[var(--app-border)] px-4 text-sm font-black">
              Reset
            </button>

            <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white">
              <PlusCircle className="size-4" />
              Create Offer
            </button>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 xl:grid-cols-2 2xl:hidden">
          {filteredOffers.map((offer) => (
            <article
              key={`mobile-offer-${offer.id}`}
              className="min-w-0 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                    {offer.id} • {offer.code}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-base font-black text-[var(--app-foreground)]">
                    {offer.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                    {offer.body}
                  </p>
                </div>

                <OfferStatusBadge status={getEffectiveOfferStatus(offer)} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <OfferMiniMetric label="Event" value={offer.eventName} />
                <OfferMiniMetric label="Discount" value={getOfferDiscountLabel(offer)} />
                <OfferMiniMetric label="Min Order" value={formatMoney(offer.minOrderValue)} />
                <OfferMiniMetric label="Usage" value={`${offer.usedCount} / ${offer.usageLimit}`} />
              </div>

              <div className="mt-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  Validity
                </p>
                <p className="mt-1 break-words text-xs font-black text-[var(--app-foreground)]">
                  {getOfferValidityLabel(offer)}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                  {offer.placement} • {offer.visibility}
                </p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => setViewOffer(offer)} className="min-h-10 rounded-xl border border-[var(--app-border)] px-2 text-xs font-black">
                  View
                </button>
                <button type="button" onClick={() => openEdit(offer)} className="min-h-10 rounded-xl border border-[var(--app-border)] px-2 text-xs font-black">
                  Edit
                </button>
                <button type="button" onClick={() => setPreviewOffer(offer)} className="min-h-10 rounded-xl bg-[var(--color-brand-primary)] px-2 text-xs font-black text-white">
                  Preview
                </button>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => toggleOfferStatus(offer.id)} className="min-h-10 rounded-xl border border-[var(--app-border)] px-2 text-xs font-black">
                  {getEffectiveOfferStatus(offer) === "Active" ? "Pause" : "Activate"}
                </button>
                <button type="button" onClick={() => duplicateOffer(offer)} className="min-h-10 rounded-xl border border-[var(--app-border)] px-2 text-xs font-black">
                  Duplicate
                </button>
                <button type="button" onClick={() => deleteOffer(offer.id)} className="min-h-10 rounded-xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-2 text-xs font-black text-[var(--color-brand-primary)]">
                  Delete
                </button>
              </div>
            </article>
          ))}

          {!filteredOffers.length ? (
            <div className="rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center xl:col-span-2">
              <p className="text-lg font-black">No offers found</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Try changing filters or create a new offer.
              </p>
            </div>
          ) : null}
        </section>

        <section className="hidden overflow-x-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_14px_40px_rgba(15,23,42,0.06)] 2xl:block">
          <table className="w-full min-w-[1320px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase text-[var(--app-muted)]">
                <th className="px-4 py-4">Offer</th>
                <th className="px-4 py-4">Coupon Code</th>
                <th className="px-4 py-4">Event</th>
                <th className="px-4 py-4">Discount Rules</th>
                <th className="px-4 py-4">Usage</th>
                <th className="px-4 py-4">Validity</th>
                <th className="px-4 py-4">Placement</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredOffers.map((offer) => (
                <tr key={offer.id} className="border-b border-[var(--app-border)] transition hover:bg-[var(--app-subtle)] last:border-0">
                  <td className="max-w-[280px] px-4 py-4 align-top">
                    <p className="font-black">{offer.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                      {offer.body}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{offer.id}</p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <span className="rounded-xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-3 py-2 text-xs font-black text-[var(--color-brand-primary)]">
                      {offer.code}
                    </span>
                  </td>

                  <td className="max-w-[220px] px-4 py-4 align-top font-semibold">{offer.eventName}</td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{getOfferDiscountLabel(offer)}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      Min {formatMoney(offer.minOrderValue)} • Max {formatMoney(offer.maxDiscount)}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black">
                      {offer.usedCount} / {offer.usageLimit}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-brand-primary)]"
                        style={{ width: `${Math.min(100, (offer.usedCount / offer.usageLimit) * 100)}%` }}
                      />
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold">{offer.startDate} {offer.startTime}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">to {offer.endDate} {offer.endTime}</p>
                  </td>

                  <td className="max-w-[220px] px-4 py-4 align-top">
                    <p className="font-semibold">{offer.placement}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{offer.visibility}</p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <OfferStatusBadge status={getEffectiveOfferStatus(offer)} />
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setViewOffer(offer)} className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black">
                        View
                      </button>
                      <button type="button" onClick={() => openEdit(offer)} className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black">
                        Edit
                      </button>
                      <button type="button" onClick={() => toggleOfferStatus(offer.id)} className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black">
                        {getEffectiveOfferStatus(offer) === "Active" ? "Pause" : "Activate"}
                      </button>
                      <button type="button" onClick={() => duplicateOffer(offer)} className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black">
                        Duplicate
                      </button>
                      <button type="button" onClick={() => setPreviewOffer(offer)} className="rounded-xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white">
                        Preview
                      </button>
                      <button type="button" onClick={() => deleteOffer(offer.id)} className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredOffers.length ? (
            <div className="p-10 text-center">
              <p className="text-xl font-black">No offers found</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Try changing filters or create a new offer.
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-5">
          <div className="flex items-start gap-3">
            <Megaphone className="mt-1 size-5 shrink-0 text-[var(--color-brand-secondary)]" />
            <div className="min-w-0">
              <h3 className="text-lg font-black text-[var(--color-brand-secondary)]">
                Production backend rule
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                Frontend stores offers locally for MVP. Backend must re-check coupon status, expiry, event mapping, usage limit, minimum order value, and redemption count during checkout before applying any discount.
              </p>
            </div>
          </div>
        </section>
      </div>

      {showCreate ? (
        <OfferCreateEditModal
          form={form}
          editing={Boolean(editingOffer)}
          error={formError}
          eventOptions={organizerEventNames}
          onChange={(nextForm) => {
            setForm(nextForm);
            if (formError) setFormError("");
          }}
          onClose={closeCreate}
          onSave={saveOffer}
        />
      ) : null}

      {viewOffer ? (
        <OfferDetailsModal offer={viewOffer} onClose={() => setViewOffer(null)} />
      ) : null}

      {previewOffer ? (
        <OfferPlacementPreviewModal offer={previewOffer} onClose={() => setPreviewOffer(null)} />
      ) : null}
    </Panel>
  );
}

function OfferStatCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="buizz-dashboard-card min-w-0 overflow-hidden rounded-2xl p-2.5 sm:rounded-3xl sm:p-5">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)] sm:text-xs sm:tracking-[0.14em]">
        {title}
      </p>

      <p className="mt-2 break-words text-[clamp(1.35rem,7vw,2.25rem)] font-black leading-none tracking-tight text-[var(--app-foreground)] sm:mt-3">
        {value}
      </p>

      <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-[var(--app-muted)] sm:text-xs sm:leading-5">
        {detail}
      </p>
    </article>
  );
}

function OfferMiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-black text-[var(--app-foreground)] sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function OfferStatusBadge({ status }: { status: OrganizerOfferStatus }) {
  const tone =
    status === "Active"
      ? "bg-[#22C55E]/15 text-[#16A34A]"
      : status === "Paused"
        ? "bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]"
        : status === "Expired"
          ? "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]"
          : "bg-[var(--app-muted)]/15 text-[var(--app-muted)]";

  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${tone}`}>{status}</span>;
}

function OfferCreateEditModal({
  form,
  editing,
  error,
  eventOptions,
  onChange,
  onClose,
  onSave,
}: {
  form: OrganizerOfferForm;
  editing: boolean;
  error: string;
  eventOptions: string[];
  onChange: (form: OrganizerOfferForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const canSave = Boolean(
    form.name.trim() &&
    form.body.trim() &&
    form.code.trim() &&
    form.eventName.trim() &&
    form.startDate &&
    form.startTime &&
    form.endDate &&
    form.endTime &&
    form.organizerAcceptedLiability,
  );

  const safeEventOptions = eventOptions.length
    ? eventOptions
    : form.eventName
      ? [form.eventName]
      : [];

  const previewOffer: OrganizerOffer = normalizeOrganizerOffer({
    id: editing ? "EDITING" : "NEW",
    ...form,
    usedCount: 0,
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:p-4 lg:place-items-center">
      <div className="flex max-h-[94dvh] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-t-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-2xl sm:max-h-[92dvh] sm:max-w-6xl sm:rounded-[2rem] buizz-dashboard-enter">
        <div className="shrink-0 border-b border-[var(--app-border)] bg-[var(--app-elevated)] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                {editing ? "Edit Campaign" : "Create a New Offer"}
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--app-foreground)] sm:text-2xl">
                {editing ? "Edit Offer" : "Create Offer"}
              </h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm">
                Fill discount details, validity, thumbnail, and customer placement preview.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]"
              aria-label="Close offer modal"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="grid min-w-0 gap-4">
              <OfferFormSection title="Description" detail="This is shown to customers when the offer appears on the event page or checkout.">
                <div className="grid gap-3 md:grid-cols-2">
                  <OfferTextField
                    label="Offer Title"
                    value={form.name}
                    onChange={(value) => onChange({ ...form, name: value })}
                    placeholder="Example: Early Bird, Student Pass"
                    required
                  />

                  <OfferTextField
                    label="Coupon Code"
                    value={form.code}
                    onChange={(value) => onChange({ ...form, code: value.toUpperCase().replace(/\s+/g, "") })}
                    placeholder="Example: EARLY10"
                    required
                  />

                  <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)] md:col-span-2">
                    Body Text <span className="text-[var(--color-brand-primary)]">*</span>
                    <textarea
                      value={form.body}
                      onChange={(event) => onChange({ ...form, body: event.target.value })}
                      maxLength={220}
                      placeholder="Write the customer-facing offer message, terms, or short benefit."
                      className="min-h-28 w-full resize-y rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-semibold normal-case leading-6 text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
                    />
                    <span className="text-[10px] font-bold normal-case tracking-normal text-[var(--app-muted)]">
                      {form.body.length}/220 characters
                    </span>
                  </label>
                </div>
              </OfferFormSection>

              <OfferFormSection title="Discount Type" detail="Backend will validate all discount calculations again at checkout.">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
                    Discount Type
                    <select
                      value={form.discountType}
                      onChange={(event) =>
                        onChange({
                          ...form,
                          discountType: event.target.value as OrganizerOfferDiscountType,
                          maxDiscount:
                            event.target.value === "Fixed Amount"
                              ? Number(form.discountValue || 0)
                              : form.maxDiscount,
                        })
                      }
                      className="min-h-12 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
                    >
                      <option>Percentage</option>
                      <option>Fixed Amount</option>
                    </select>
                  </label>

                  <OfferNumberField
                    label="Discount Worth"
                    value={form.discountValue}
                    onChange={(value) => onChange({ ...form, discountValue: value })}
                    placeholder={form.discountType === "Percentage" ? "Example: 10" : "Example: 150"}
                    suffix={form.discountType === "Percentage" ? "%" : "₹"}
                    required
                  />

                  <OfferNumberField
                    label="Minimum Order Amount"
                    value={form.minOrderValue}
                    onChange={(value) => onChange({ ...form, minOrderValue: value })}
                    placeholder="Example: 999"
                  />

                  <OfferNumberField
                    label="Maximum Discount"
                    value={form.maxDiscount}
                    onChange={(value) => onChange({ ...form, maxDiscount: value })}
                    placeholder="Example: 500"
                  />

                  <OfferNumberField
                    label="Usage Limit"
                    value={form.usageLimit}
                    onChange={(value) => onChange({ ...form, usageLimit: value })}
                    placeholder="Example: 500"
                  />

                  <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
                    Status
                    <select
                      value={form.status === "Expired" ? "Paused" : form.status}
                      onChange={(event) =>
                        onChange({ ...form, status: event.target.value as OrganizerOfferStatus })
                      }
                      className="min-h-12 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
                    >
                      <option>Draft</option>
                      <option>Active</option>
                      <option>Paused</option>
                    </select>
                  </label>
                </div>
              </OfferFormSection>

              <OfferFormSection title="Offer Validity Period" detail="Customers can apply the coupon only during this start/end window.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <OfferTextField
                    label="Starting On"
                    type="date"
                    value={form.startDate}
                    onChange={(value) => onChange({ ...form, startDate: value })}
                    required
                  />

                  <OfferTextField
                    label="Start Time"
                    type="time"
                    value={form.startTime}
                    onChange={(value) => onChange({ ...form, startTime: value })}
                    required
                  />

                  <OfferTextField
                    label="Expires On"
                    type="date"
                    value={form.endDate}
                    onChange={(value) => onChange({ ...form, endDate: value })}
                    required
                  />

                  <OfferTextField
                    label="End Time"
                    type="time"
                    value={form.endTime}
                    onChange={(value) => onChange({ ...form, endTime: value })}
                    required
                  />
                </div>
              </OfferFormSection>

              <OfferFormSection title="Customer Placement" detail="Choose where this campaign appears for customers.">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
                    Event
                    <select
                      value={form.eventName}
                      onChange={(event) => onChange({ ...form, eventName: event.target.value })}
                      className="min-h-12 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
                    >
                      {safeEventOptions.length ? (
                        safeEventOptions.map((eventName) => (
                          <option key={eventName} value={eventName}>
                            {eventName}
                          </option>
                        ))
                      ) : (
                        <option value="">Create an event first</option>
                      )}
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
                    Visibility
                    <select
                      value={form.visibility}
                      onChange={(event) =>
                        onChange({ ...form, visibility: event.target.value as OrganizerOfferVisibility })
                      }
                      className="min-h-12 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
                    >
                      <option>Show on Event Page</option>
                      <option>Checkout Only</option>
                      <option>Hidden</option>
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)] md:col-span-2">
                    Placement
                    <select
                      value={form.placement}
                      onChange={(event) =>
                        onChange({ ...form, placement: event.target.value as OrganizerOfferPlacement })
                      }
                      className="min-h-12 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
                    >
                      <option>Event Details Page</option>
                      <option>Checkout Coupon Box</option>
                      <option>Home Promotional Banner</option>
                      <option>Event Card Badge</option>
                      <option>Organizer Campaign Link</option>
                    </select>
                  </label>
                </div>
              </OfferFormSection>

              <OfferFormSection title="Upload Thumbnail" detail="MVP accepts a thumbnail URL. Backend can replace this with file upload later.">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <OfferTextField
                    label="Thumbnail URL"
                    value={form.thumbnailUrl}
                    onChange={(value) => onChange({ ...form, thumbnailUrl: value })}
                    placeholder="Paste image URL or leave blank"
                  />

                  <div className="grid min-h-28 place-items-center rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-center">
                    <div>
                      <FileText className="mx-auto size-6 text-[var(--color-brand-primary)]" />
                      <p className="mt-2 text-xs font-black text-[var(--app-foreground)]">
                        JPG / PNG / WEBP
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-[var(--app-muted)]">
                        Max file size will be handled by backend.
                      </p>
                    </div>
                  </div>
                </div>

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                  <input
                    type="checkbox"
                    checked={form.organizerAcceptedLiability}
                    onChange={(event) =>
                      onChange({ ...form, organizerAcceptedLiability: event.target.checked })
                    }
                    className="mt-1 size-4 accent-[var(--color-brand-primary)]"
                  />
                  <span className="text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm">
                    I understand the discount given in this offer will be borne by the organizer and backend will validate final redemption rules at checkout.
                  </span>
                </label>
              </OfferFormSection>

              {error ? (
                <p className="rounded-2xl border border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 p-4 text-sm font-black text-[var(--color-brand-primary)]">
                  {error}
                </p>
              ) : null}
            </div>

            <aside className="grid min-w-0 content-start gap-4 xl:sticky xl:top-4">
              <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                  How customers see it
                </p>
                <h3 className="mt-1 text-xl font-black">Offer preview</h3>
                <div className="mt-4">
                  <OfferCustomerPreviewCard offer={previewOffer} />
                </div>
              </section>

              <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--app-muted)]">
                  Backend Ready
                </p>
                <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                  <p>• Validate coupon code uniqueness on server.</p>
                  <p>• Recheck expiry and usage limit during checkout.</p>
                  <p>• Lock redemption count atomically after payment success.</p>
                  <p>• Keep organizer liability acceptance in audit logs.</p>
                </div>
              </section>
            </aside>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-elevated)] p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-2xl border border-[var(--app-border)] px-4 text-sm font-black"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="min-h-11 rounded-2xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editing ? "Save Changes" : "Create Offer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferFormSection({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
      <div className="mb-4">
        <h3 className="text-lg font-black text-[var(--app-foreground)]">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">{detail}</p>
      </div>
      {children}
    </section>
  );
}

function OfferTextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
      <span>
        {label} {required ? <span className="text-[var(--color-brand-primary)]">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
      />
    </label>
  );
}

function OfferNumberField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  required = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  suffix?: string;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
      <span>
        {label} {required ? <span className="text-[var(--color-brand-primary)]">*</span> : null}
      </span>
      <div className="flex min-h-12 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] focus-within:border-[var(--color-brand-primary)]">
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)]"
        />
        {suffix ? (
          <span className="grid min-w-12 place-items-center border-l border-[var(--app-border)] text-sm font-black text-[var(--app-muted)]">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function OfferCustomerPreviewCard({ offer }: { offer: OrganizerOffer }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div
        className="min-h-36 p-4 text-white"
        style={{
          background:
            offer.thumbnailUrl.trim()
              ? `linear-gradient(135deg, rgba(16,24,40,0.72), rgba(236,27,114,0.42)), url("${offer.thumbnailUrl}") center/cover`
              : "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))",
        }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/75">
          Special Offer
        </p>
        <h3 className="mt-3 line-clamp-2 text-2xl font-black">
          {offer.name || "Offer title"}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm font-semibold text-white/85">
          {offer.body || "Offer description will appear here for customers."}
        </p>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-2xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-3 py-2 text-sm font-black text-[var(--color-brand-primary)]">
            {offer.code || "COUPON"}
          </span>
          <span className="rounded-2xl bg-[var(--app-subtle)] px-3 py-2 text-sm font-black text-[var(--app-foreground)]">
            {getOfferDiscountLabel(offer)}
          </span>
        </div>

        <p className="mt-3 text-sm font-black text-[var(--app-foreground)]">
          {offer.eventName || "Selected event"}
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
          Minimum order ₹{offer.minOrderValue.toLocaleString("en-IN")} • Max discount ₹{offer.maxDiscount.toLocaleString("en-IN")}
        </p>
        <p className="mt-2 text-[11px] font-bold leading-5 text-[var(--app-muted)]">
          Valid: {getOfferValidityLabel(offer)}
        </p>

        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded-2xl bg-[var(--color-brand-primary)] text-sm font-black text-white"
        >
          Apply Coupon
        </button>
      </div>
    </article>
  );
}

function OfferDetailsModal({ offer, onClose }: { offer: OrganizerOffer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:p-4 lg:place-items-center">
      <div className="max-h-[94dvh] w-full max-w-full overflow-y-auto rounded-t-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-2xl sm:max-w-4xl sm:rounded-[2rem] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <OfferStatusBadge status={getEffectiveOfferStatus(offer)} />
            <h2 className="mt-3 break-words text-2xl font-black">{offer.name}</h2>
            <p className="mt-1 break-words text-sm font-semibold text-[var(--app-muted)]">
              {offer.eventName} • {offer.code}
            </p>
          </div>
          <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--app-border)]">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <SectionBox title="Offer Details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailBox label="Offer ID" value={offer.id} />
              <DetailBox label="Coupon Code" value={offer.code} />
              <DetailBox label="Event" value={offer.eventName} />
              <DetailBox label="Status" value={getEffectiveOfferStatus(offer)} />
              <DetailBox label="Discount Type" value={offer.discountType} />
              <DetailBox label="Discount Value" value={getOfferDiscountLabel(offer)} />
              <DetailBox label="Min Order" value={`₹${offer.minOrderValue.toLocaleString("en-IN")}`} />
              <DetailBox label="Max Discount" value={`₹${offer.maxDiscount.toLocaleString("en-IN")}`} />
              <DetailBox label="Usage" value={`${offer.usedCount} / ${offer.usageLimit}`} />
              <DetailBox label="Start" value={`${offer.startDate} ${offer.startTime}`} />
              <DetailBox label="End" value={`${offer.endDate} ${offer.endTime}`} />
              <DetailBox label="Visibility" value={offer.visibility} />
              <DetailBox label="Placement" value={offer.placement} />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                Description
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:mt-2 sm:text-sm sm:leading-6">
                {offer.body}
              </p>
            </div>
          </SectionBox>

          <OfferCustomerPreviewCard offer={offer} />
        </div>
      </div>
    </div>
  );
}

function OfferPlacementPreviewModal({ offer, onClose }: { offer: OrganizerOffer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:p-4 lg:place-items-center">
      <div className="max-h-[94dvh] w-full max-w-full overflow-y-auto rounded-t-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-2xl sm:max-w-5xl sm:rounded-[2rem] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-black">Offer Placement Preview</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
              {offer.code} customer-side preview
            </p>
          </div>
          <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--app-border)]">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
          <OfferCustomerPreviewCard offer={offer} />

          <div className="grid content-start gap-4">
            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                Event Details Page
              </p>
              <div className="mt-3 rounded-2xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 p-4">
                <p className="text-sm font-black text-[var(--app-foreground)]">
                  Save with {offer.code}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                  {offer.body}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                Checkout Coupon Box
              </p>
              <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 sm:flex-row sm:items-center">
                <span className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-sm font-black">
                  {offer.code}
                </span>
                <span className="text-sm font-semibold text-[var(--app-muted)]">
                  {getOfferDiscountLabel(offer)} on eligible orders
                </span>
                <button className="min-h-10 rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white sm:ml-auto">
                  Apply
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                Event Card Badge
              </p>
              <div className="mt-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
                <span className="rounded-full bg-[var(--color-brand-primary)] px-3 py-1 text-xs font-black text-white">
                  {getOfferDiscountLabel(offer)}
                </span>
                <p className="mt-3 font-black">{offer.eventName}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                  Coupon {offer.code} visible on event listing card.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PremiumDashboardCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "red" | "blue" | "purple" | "green";
}) {
  const toneClass = {
    red: "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] ring-[var(--color-brand-primary)]/10",
    blue: "bg-[var(--color-brand-secondary)]/10 text-[var(--color-brand-secondary)] ring-[var(--color-brand-secondary)]/10",
    purple: "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] ring-[var(--color-brand-primary)]/10",
    green: "bg-[#22C55E]/10 text-[#22C55E] ring-[#22C55E]/10",
  }[tone];

  return (
    <article className="buizz-dashboard-card rounded-3xl p-5">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
            {title}
          </p>

          <p className="mt-3 truncate text-3xl font-black tracking-tight text-[var(--app-foreground)]">
            {value}
          </p>

          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
            {detail}
          </p>
        </div>

        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ring-8 transition duration-300 group-hover:scale-105 ${toneClass}`}>
          <Icon className="size-4 sm:size-5" />
        </span>
      </div>
    </article>
  );
}

function DashboardFocusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 py-3">
      <span className="text-sm font-semibold text-[var(--app-muted)]">{label}</span>
      <span className="text-lg font-black text-[var(--app-foreground)]">{value}</span>
    </div>
  );
}

function DashboardQueueCard({
  href,
  title,
  value,
  icon: Icon,
}: {
  href: string;
  title: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]/35 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <Icon className="size-4 sm:size-5" />
        </span>
        <div>
          <p className="font-black">{title}</p>
          <p className="text-xs font-semibold text-[var(--app-muted)]">Needs review</p>
        </div>
      </div>
      <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/10 px-3 text-xs font-black text-[var(--color-brand-primary)] transition duration-300 group-hover:bg-[var(--color-brand-primary)] group-hover:text-white">
        {value}
        <span>View</span>
      </span>
    </Link>
  );
}

function PremiumActivityItem({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <article className="relative flex gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
      <span className="absolute left-[31px] top-14 h-[calc(100%-3.5rem)] w-px bg-[var(--app-border)]" />
      <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-[#22C55E]/10 text-[#22C55E] ring-8 ring-[#22C55E]/5">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="font-black">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
          {detail}
        </p>
      </div>
    </article>
  );
}




function OrganizerEventsView({
  title,
  status,
}: {
  title: string;
  status: "All" | OrganizerEventStatus;
}) {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<"All" | OrganizerEventStatus>(status);
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<OrganizerEventItem | null>(null);
  const { loadingKey, successMessage, errorMessage, runAction } = useActionFeedback();
  const offlineBookings = useOrganizerOfflineBookings();
  const unifiedBookings = useOrganizerUnifiedBookings();
  const {
    data: organizerEventsResponse,
    refetch: refetchOrganizerEvents,
  } = useGetOrganizerEventsQuery({ page: 1, limit: 100 });
  const organizerApiEvents = organizerEventsResponse?.data ?? [];
  const [submitEventForReview] = useSubmitEventForReviewMutation();
  const [deleteEventApi] = useDeleteEventMutation();
  const [publishEventApi] = usePublishEventMutation();
  const defaultEvents: OrganizerEventItem[] = [];

  const [events, setEvents] = useState<OrganizerEventItem[]>(defaultEvents);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(organizerEventsStorageKey);
      const parsed = stored ? (JSON.parse(stored) as OrganizerEventItem[]) : [];
      const storedEvents = Array.isArray(parsed) ? parsed : [];
      const backendEvents = organizerApiEvents.map(createOrganizerSummaryFromBackendEvent);

      const unifiedEvents = readUnifiedEvents()
        .filter((event) => Boolean(event.organizerName))
        .map(createOrganizerSummaryFromUnifiedEvent);
      const localEvents = [...storedEvents, ...unifiedEvents].filter((event) => {
        const localKey = getDashboardEventContentKey(event);
        const localName = event.name.trim().toLowerCase();
        const localVenue = event.venue.trim().toLowerCase();
        const localCity = event.city.trim().toLowerCase();

        return !backendEvents.some((backendEvent) => {
          const backendKey = getDashboardEventContentKey(backendEvent);
          const backendName = backendEvent.name.trim().toLowerCase();
          const backendVenue = backendEvent.venue.trim().toLowerCase();
          const backendCity = backendEvent.city.trim().toLowerCase();

          return (
            (localKey && backendKey && localKey === backendKey) ||
            (localName === backendName &&
              (!localVenue || !backendVenue || localVenue === backendVenue) &&
              (!localCity || !backendCity || localCity === backendCity))
          );
        });
      });

      const merged = dedupeDashboardEvents([
        ...defaultEvents,
        ...localEvents,
        ...backendEvents,
      ]);

      setEvents(merged);
      writeOrganizerEventsCache(merged);
    } catch {
      setEvents(defaultEvents);
    }
  }, [organizerApiEvents]);

  const persistEvents = (
    updater: (current: OrganizerEventItem[]) => OrganizerEventItem[],
  ) => {
    setEvents((current) => {
      const backendEvents = organizerApiEvents.map(createOrganizerSummaryFromBackendEvent);
      const updatedEvents = updater(current).filter((event) => {
        const eventId = String(event.id ?? "");
        const eventKey = getDashboardEventContentKey(event);
        return !backendEvents.some((backendEvent) => {
          const backendId = String(backendEvent.id ?? "");
          const backendKey = getDashboardEventContentKey(backendEvent);
          return (eventId && eventId === backendId) || (eventKey && backendKey && eventKey === backendKey);
        });
      });
      const next = dedupeDashboardEvents([...updatedEvents, ...backendEvents]);
      writeOrganizerEventsCache(next);
      next.forEach((event) => saveUnifiedEvent(organizerEventToUnifiedEvent(event)));
      return next;
    });
  };

  const statusTabs: Array<"All" | OrganizerEventStatus> = [
    "All",
    "Draft",
    "Pending Review",
    "Changes Requested",
    "Approved",
    "Published",
    "Rejected",
    "Completed",
    "Cancelled",
    "Expired",
  ];

  const getEventKey = (event: OrganizerEventItem) => getUnifiedEventKey(event);

  const getBackendIdForOrganizerEvent = (event: OrganizerEventItem) => {
    const directId = Number(event.id);
    if (isLikelyBackendEventId(directId)) return directId;

    const normalizedName = event.name.trim().toLowerCase();
    const normalizedVenue = event.venue.trim().toLowerCase();
    const match = organizerApiEvents.find((apiEvent: any) => {
      const apiName = String(apiEvent.title ?? "").trim().toLowerCase();
      const apiVenue = String(apiEvent.venueName ?? apiEvent.venue?.name ?? "").trim().toLowerCase();
      return apiName === normalizedName && (!normalizedVenue || !apiVenue || apiVenue === normalizedVenue);
    });
    const matchedId = Number(match?.id);
    return isLikelyBackendEventId(matchedId) ? matchedId : null;
  };

  const createOrganizerSummaryFromBackendEvent = (event: any): OrganizerEventItem => {
    const status = unifiedStatusToOrganizer(backendEventStatusToUnified(event.status));
    const startDate = event.startDate ? new Date(String(event.startDate)) : null;
    const endDate = event.endDate ? new Date(String(event.endDate)) : null;
    const ticketTypes = Array.isArray(event.ticketTypes) ? event.ticketTypes : [];
    const capacity = Number(event.totalSeats ?? event.capacity ?? 0);
    const prices = ticketTypes
      .map((ticket: any) => Number(ticket.price ?? 0))
      .filter((price: number) => Number.isFinite(price) && price > 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : minPrice;

    return {
      id: String(event.id),
      source: "backend",
      name: String(event.title ?? "Untitled Event"),
      category: String(event.category ?? "Event"),
      eventType: prices.length ? "Paid" : "Free",
      date: startDate && !Number.isNaN(startDate.getTime())
        ? startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "Date pending",
      time: startDate && !Number.isNaN(startDate.getTime())
        ? startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "Time pending",
      endTime: endDate && !Number.isNaN(endDate.getTime())
        ? endDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : undefined,
      city: String(event.city ?? event.venue?.city ?? "City pending"),
      venue: String(event.venueName ?? event.venue?.name ?? "Venue pending"),
      address: event.venue?.address,
      banner: String(event.banner || "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80"),
      description: String(event.description ?? "Organizer-created event."),
      shortDescription: String(event.description ?? "Organizer-created event."),
      priceRange: maxPrice > minPrice
        ? `Rs. ${minPrice.toLocaleString("en-IN")} - Rs. ${maxPrice.toLocaleString("en-IN")}`
        : minPrice > 0
          ? `Rs. ${minPrice.toLocaleString("en-IN")}`
          : "Free / price pending",
      status,
      seatBlocks: ticketTypes.length
        ? ticketTypes.map((ticket: any) => ({
            name: String(ticket.name ?? "Entry Pass"),
            price: String(ticket.price ?? 0),
            capacity: String(ticket.quantity ?? ticket.availableQuantity ?? ticket.available_quantity ?? 0),
            offer: "No offer",
            gate: "Main Gate",
          }))
        : [{ name: "Entry Pass", price: "0", capacity: String(capacity), offer: "No offer", gate: "Main Gate" }],
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      approvalNote: getOrganizerDashboardApprovalNote(status),
      lifecycleMetadata: {
        approvalBlockers: {
          eventReviewStatus: backendEventStatusToUnified(event.status),
        },
      } as any,
      inventorySummary: `${capacity.toLocaleString("en-IN")} seats`,
      ticketDesignStatus: "Default ticket design",
      publicSlug: event.slug,
    };
  };

  const openFullEventEdit = (event: OrganizerEventItem) => {
    const backendEventId = getBackendIdForOrganizerEvent(event);
    const eventId = backendEventId ? String(backendEventId) : event.id ?? getEventKey(event);
    const eventForEdit = backendEventId ? { ...event, id: String(backendEventId) } : event;

    saveUnifiedEvent(organizerEventToUnifiedEvent(eventForEdit));
    router.push(
      `/organizer/create-event?mode=edit&eventId=${encodeURIComponent(eventId)}&from=my-events`,
    );
  };

  const visibleOrganizerEvents = useMemo(
    () => dedupeDashboardEvents(events),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visibleOrganizerEvents.filter((event) => {
      const matchesPageStatus = status === "All" || event.status === status;
      const matchesActiveStatus = activeStatus === "All" || event.status === activeStatus;

      const searchable = [
        event.name,
        event.category,
        event.city,
        event.venue,
        event.status,
        event.priceRange,
        event.lifecycleMetadata?.listingSection,
        event.lifecycleMetadata?.bookingModeLabel,
      ]
        .join(" ")
        .toLowerCase();

      return matchesPageStatus && matchesActiveStatus && searchable.includes(query);
    });
  }, [visibleOrganizerEvents, status, activeStatus, search]);

  const stats = {
    total: visibleOrganizerEvents.length,
    draft: visibleOrganizerEvents.filter((event) => event.status === "Draft").length,
    pending: visibleOrganizerEvents.filter((event) => event.status === "Pending Review").length,
    live: visibleOrganizerEvents.filter((event) => event.status === "Published").length,
  };

  const statusCounts = useMemo(() => {
    return statusTabs.reduce(
      (counts, item) => {
        counts[item] =
          item === "All"
            ? visibleOrganizerEvents.length
            : visibleOrganizerEvents.filter((event) => event.status === item).length;

        return counts;
      },
      {} as Record<"All" | OrganizerEventStatus, number>,
    );
  }, [visibleOrganizerEvents]);

  const getEventCapacity = (event: OrganizerEventItem) =>
    event.seatBlocks.reduce(
      (total, block) => total + Number(block.capacity || 0),
      0,
    );

  const getEventPriceRange = (event: OrganizerEventItem) => {
    const prices = event.seatBlocks
      .map((block) => Number(String(block.price).replace(/[^\d.]/g, "")))
      .filter((price) => Number.isFinite(price));

    if (!prices.length) return event.priceRange || "Price pending";

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return min === max
      ? `Rs. ${min.toLocaleString("en-IN")}`
      : `Rs. ${min.toLocaleString("en-IN")} - Rs. ${max.toLocaleString("en-IN")}`;
  };

  const totalInventory = visibleOrganizerEvents.reduce(
    (total, event) => total + getEventCapacity(event),
    0,
  );

  const updateSelectedEvent = (field: keyof OrganizerEventItem, value: string) => {
    if (!selectedEvent) return;
    setSelectedEvent({ ...selectedEvent, [field]: value });
  };

  const updateSeatBlock = (
    index: number,
    field: keyof OrganizerSeatBlock,
    value: string,
  ) => {
    if (!selectedEvent) return;

    setSelectedEvent({
      ...selectedEvent,
      seatBlocks: selectedEvent.seatBlocks.map((block, blockIndex) =>
        blockIndex === index ? { ...block, [field]: value } : block,
      ),
    });
  };

  const addSeatBlock = () => {
    if (!selectedEvent) return;

    setSelectedEvent({
      ...selectedEvent,
      seatBlocks: [
        ...selectedEvent.seatBlocks,
        {
          name: "New Block",
          price: "0",
          capacity: "0",
          offer: "No offer",
          gate: "Main Gate",
          themeKey: "",
          badgeLabel: "",
          benefits: "",
          entryInstructions: "Keep QR ready at entry.",
        },
      ],
    });
  };

  const removeSeatBlock = (index: number) => {
    if (!selectedEvent || selectedEvent.seatBlocks.length === 1) return;

    setSelectedEvent({
      ...selectedEvent,
      seatBlocks: selectedEvent.seatBlocks.filter((_, blockIndex) => blockIndex !== index),
    });
  };

  const saveSelectedTicketSettings = async (settings: TicketThemeSettings) => {
    if (!selectedEvent) return;

    const eventId = selectedEvent.id ?? getEventKey(selectedEvent);

    saveEventTicketSetting(eventId, settings);

    const nextEvent: OrganizerEventItem = {
      ...selectedEvent,
      ticketThemeSettings: settings,
      themeApprovalStatus: settings.approvalStatus,
      ticketDesignStatus: settings.approvalStatus,
      updatedAt: new Date().toISOString(),
    };

    setSelectedEvent(nextEvent);
    persistEvents((current) =>
      current.map((event) => (getEventKey(event) === eventId ? nextEvent : event)),
    );

    if (settings.approvalStatus === "Pending Admin Review") {
      const requests = await loadTicketThemeRequests();
      const request = {
        id: `REQ-${Date.now()}`,
        eventId,
        eventName: selectedEvent.name,
        organizerName: "Festlane Events",
        previousSettings:
          selectedEvent.ticketThemeSettings ??
          ({ ...settings, approvalStatus: "Approved" as const }),
        requestedSettings: settings,
        status: "Pending" as const,
        submittedAt: new Date().toLocaleString("en-IN"),
      };

      saveTicketThemeRequests([
        request,
        ...requests.filter(
          (item) => item.eventId !== eventId || item.status !== "Pending",
        ),
      ]);
    }
  };

  const saveEventChanges = () => {
    if (!selectedEvent) return;

    const eventId = getEventKey(selectedEvent);
    const nextEvent: OrganizerEventItem = {
      ...selectedEvent,
      id: selectedEvent.id ?? eventId,
      priceRange: getEventPriceRange(selectedEvent),
      updatedAt: new Date().toISOString(),
    };

    void runAction(
      `save-organizer-event-${eventId}`,
      () => {
        persistEvents((current) =>
          current.map((event) => (getEventKey(event) === eventId ? nextEvent : event)),
        );
        setSelectedEvent(nextEvent);
      },
      "Event changes saved.",
    );
  };

  const submitDraftForReview = (event: OrganizerEventItem) => {
    if (event.status !== "Draft" && event.status !== "Changes Requested") return;

    const eventId = getEventKey(event);
    const now = new Date().toISOString();

    const submittedAt = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    void runAction(
      `submit-event-${eventId}`,
      async () => {
        // Call backend API if event has a numeric backend ID
        const numericId = getBackendIdForOrganizerEvent(event);
        if (numericId) {
          try {
            await submitEventForReview(numericId).unwrap();
            await refetchOrganizerEvents();
          } catch (apiError: any) {
            const msg = apiError?.data?.message ?? apiError?.message ?? "Failed to submit event for review.";
            throw new Error(msg);
          }
        }

        const updatedEvent: OrganizerEventItem = {
          ...event,
          id: event.id ?? eventId,
          status: "Pending Review",
          submittedAt,
          updatedAt: now,
          approvalNote: "Submitted for Buizz review.",
          lifecycleMetadata: event.lifecycleMetadata
            ? {
              ...event.lifecycleMetadata,
              approvalBlockers: {
                ...event.lifecycleMetadata.approvalBlockers,
                eventReviewStatus: "pending_review",
              },
            }
            : undefined,
          reviewerName: undefined,
          reviewerRole: undefined,
          reviewedAt: undefined,
          reviewerComment: undefined,
        };

        persistEvents((current) => upsertDashboardEvent(current, updatedEvent));
        updateUnifiedEventStatus(eventId, "pending_review", { submittedAt: now });

        if (selectedEvent && getEventKey(selectedEvent) === eventId) {
          setSelectedEvent(updatedEvent);
        }
      },
      "Event submitted for admin review. Awaiting Super Admin approval.",
    );
  };

  const publishApprovedEvent = (event: OrganizerEventItem) => {
    if (event.status !== "Approved") return;

    const eventId = getEventKey(event);
    const numericEventId = getBackendIdForOrganizerEvent(event);
    if (!numericEventId) {
      window.alert("This event is missing a backend event ID. Open the event from Organizer Events and try again.");
      return;
    }

    const confirmed = window.confirm("Publish this approved event to the customer website?");
    if (!confirmed) return;

    void runAction(
      `publish-event-${eventId}`,
      async () => {
        await publishEventApi({ id: numericEventId, role: "organizer" }).unwrap();

        const updatedAt = new Date().toISOString();
        const updatedEvent: OrganizerEventItem = {
          ...event,
          id: String(numericEventId),
          status: "Published",
          approvalNote: "Published to customer website.",
          updatedAt,
        };

        setEvents((current) => {
          const next = dedupeDashboardEvents(
            current.map((item) => {
              const itemBackendId = getBackendIdForOrganizerEvent(item);
              return itemBackendId === numericEventId || getEventKey(item) === eventId
                ? updatedEvent
                : item;
            }),
          );
          writeOrganizerEventsCache(next);
          return next;
        });
        saveUnifiedEvent(organizerEventToUnifiedEvent(updatedEvent));
        updateUnifiedEventStatus(eventId, "published");

        if (selectedEvent && getEventKey(selectedEvent) === eventId) {
          setSelectedEvent(updatedEvent);
        }

        await refetchOrganizerEvents();
      },
      "Event published successfully.",
    );
  };

  const cancelEvent = (event: OrganizerEventItem) => {
    if (event.status !== "Draft") return;

    const bookingCount = getEventBookingCount(event);

    if (bookingCount > 0) {
      window.alert(
        `This event already has ${bookingCount} booking${bookingCount > 1 ? "s" : ""}. Organizer cannot cancel it directly. Please contact Admin/Super Admin for cancellation/refund workflow.`,
      );
      return;
    }

    const confirmed = window.confirm("Cancel this event?");
    if (!confirmed) return;

    void runAction(
      `cancel-event-${getEventKey(event)}`,
      () => {
        const eventId = getEventKey(event);
        const updatedAt = new Date().toISOString();

        persistEvents((current) =>
          current.map((item) =>
            getEventKey(item) === eventId
              ? { ...item, status: "Cancelled", updatedAt }
              : item,
          ),
        );
        updateUnifiedEventStatus(eventId, "cancelled");
      },
      "Event cancelled.",
    );
  };

  const deleteEvent = (event: OrganizerEventItem) => {
    const eventId = getEventKey(event);
    const numericEventId = getBackendIdForOrganizerEvent(event);
    const isBackendEvent = Boolean(numericEventId);
    const confirmed = window.confirm(
      event.status === "Draft"
        ? "Delete this draft event permanently?"
        : "Submit delete request for this event? Admin/Super Admin approval may be required.",
    );
    if (!confirmed) return;

    void runAction(
      `delete-event-${eventId}`,
      async () => {
        if (numericEventId) {
          await deleteEventApi(numericEventId).unwrap();
          await refetchOrganizerEvents();
        }

        if (event.status === "Draft") {
          deleteUnifiedEvent(eventId);
          persistEvents((current) =>
            current.filter((item) => getEventKey(item) !== eventId),
          );
        } else {
          const updatedAt = new Date().toISOString();
          persistEvents((current) =>
            current.map((item) =>
              getEventKey(item) === eventId
                ? {
                    ...item,
                    status: "Pending Review",
                    approvalNote: "Delete request submitted for Admin/Super Admin approval.",
                    updatedAt,
                  }
                : item,
            ),
          );
          updateUnifiedEventStatus(eventId, "pending_review");
        }

        setSelectedEvent(null);
      },
      event.status === "Draft" ? "Event deleted." : "Delete request submitted for approval.",
    );
  };

  const duplicateAsDraft = (event: OrganizerEventItem) => {
    const now = new Date().toISOString();
    const duplicateId = `event-${Date.now()}`;
    const duplicate: OrganizerEventItem = {
      ...event,
      id: duplicateId,
      name: `${event.name} Copy`,
      status: "Draft",
      createdAt: now,
      updatedAt: now,
      submittedAt: undefined,
      approvalNote: "Duplicated as a new draft.",
      rejectionReason: undefined,
      reviewerName: undefined,
      reviewerRole: undefined,
      reviewedAt: undefined,
      reviewerComment: undefined,
      publicSlug: undefined,
      historyCount: 0,
      seatBlocks: event.seatBlocks.map((block) => ({ ...block })),
      lifecycleMetadata: event.lifecycleMetadata
        ? {
          ...event.lifecycleMetadata,
          approvalBlockers: {
            ...event.lifecycleMetadata.approvalBlockers,
            eventReviewStatus: "draft",
          },
        }
        : undefined,
    };

    void runAction(
      `duplicate-event-${getEventKey(event)}`,
      () => {
        persistEvents((current) => upsertDashboardEvent(current, duplicate));
      },
      "Event duplicated as a draft.",
    );
  };

  const resetLocalEvents = () => {
    window.localStorage.removeItem(organizerEventsStorageKey);
    setEvents(defaultEvents);
    setSearch("");
    setActiveStatus(status);
    setSelectedEvent(null);
  };

  const getEventBookingCount = (event: OrganizerEventItem) => {
    const eventKey = getEventKey(event);
    const eventId = event.id ?? eventKey;
    const eventName = event.name.trim().toLowerCase();

    const offlineCount = offlineBookings
      .filter((booking) => {
        const bookingEventId = String(booking.eventId ?? "");
        const bookingEventName = String(booking.eventTitle ?? "").trim().toLowerCase();
        const isCancelled = String(booking.status ?? "").toLowerCase() === "cancelled";

        return !isCancelled && (bookingEventId === eventId || bookingEventName === eventName);
      })
      .reduce((total, booking) => total + Number(booking.quantity || 1), 0);

    const unifiedCount = unifiedBookings
      .filter((booking) => {
        const bookingEventId = String(booking.eventId ?? "");
        const bookingEventName = String(booking.eventTitle ?? "").trim().toLowerCase();
        const isCancelled = String(booking.status ?? "").toLowerCase() === "cancelled";

        return !isCancelled && (bookingEventId === eventId || bookingEventName === eventName);
      })
      .reduce((total, booking) => total + Number(booking.quantity || 1), 0);

    return offlineCount + unifiedCount;
  };

  const eventRows = filteredEvents.map((event, index) => {
    const eventKey = getEventKey(event);
    const capacity = getEventCapacity(event);
    const priceRange = getEventPriceRange(event);
    const bookingCount = getEventBookingCount(event);
    const hasBookings = bookingCount > 0;
    return {
      event,
      index,
      eventKey,
      capacity,
      priceRange,
      bookingCount,
      hasBookings,
      theme:
        event.ticketThemeSettings?.themeKey ??
        event.ticketDesignStatus ??
        "Default",
      inventory:
        event.inventorySummary ?? `${capacity.toLocaleString("en-IN")} seats`,
      ratio: event.ratioSummary ?? "Pending",
    };
  });
  return (
    <Panel
      title={title}
      description="Manage drafts, reviews, approvals, published events, rejected events, and backend-ready organizer event operations."
    >
      <div className="grid w-full max-w-full min-w-0 gap-5 overflow-x-hidden sm:gap-6">
        <ActionFeedback successMessage={successMessage} errorMessage={errorMessage} />

        <section className="grid min-w-0 grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-2 xl:grid-cols-4">
          <OrganizerStatCard title="Total Events" value={stats.total} />
          <OrganizerStatCard title="Drafts" value={stats.draft} />
          <OrganizerStatCard title="Pending Review" value={stats.pending} />
          <OrganizerStatCard title="Published" value={stats.live} />
        </section>

        <section className="grid min-w-0 gap-3 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-4">
          <div className="grid gap-3 2xl:hidden">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search event..."
              className="min-h-11 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
            />

            <details className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-black">
                Filters
                <span className="shrink-0 rounded-full bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                  Open
                </span>
              </summary>

              <div className="grid gap-3 border-t border-[var(--app-border)] p-3 sm:grid-cols-2">
                <select
                  value={activeStatus}
                  onChange={(event) =>
                    setActiveStatus(event.target.value as "All" | OrganizerEventStatus)
                  }
                  className="min-h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black outline-none"
                >
                  {statusTabs.map((item) => (
                    <option key={item} value={item}>
                      {item} ({statusCounts[item] ?? 0})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={resetLocalEvents}
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black"
                >
                  Reset
                </button>

                <Link href="/organizer/create-event" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-3 text-sm font-black text-white sm:col-span-2">
                  <PlusCircle className="size-4" />
                  Create Event
                </Link>
              </div>
            </details>
          </div>

          <div className="hidden gap-3 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search event name, venue, city, status..."
              className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold outline-none focus:border-[var(--color-brand-primary)]"
            />

            <select
              value={activeStatus}
              onChange={(event) =>
                setActiveStatus(event.target.value as "All" | OrganizerEventStatus)
              }
              className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black outline-none"
            >
              {statusTabs.map((item) => (
                <option key={item} value={item}>
                  {item} ({statusCounts[item] ?? 0})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetLocalEvents}
              className="min-h-11 rounded-xl border border-[var(--app-border)] px-4 text-sm font-black"
            >
              Reset
            </button>

            <Link href="/organizer/create-event" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white">
              <PlusCircle className="size-4" />
              Create Event
            </Link>
          </div>

          <div className="hidden min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden">
            {statusTabs.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveStatus(item)}
                className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-black transition ${activeStatus === item
                  ? "bg-[var(--color-brand-primary)] text-white shadow-[0_10px_24px_rgba(236,27,114,0.18)]"
                  : "border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)]"
                  }`}
              >
                {item} ({statusCounts[item] ?? 0})
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                Event Operations
              </p>
              <h2 className="mt-1 break-words text-lg font-black text-[var(--app-foreground)] sm:text-xl">
                Approval, inventory, ticket blocks, and booking readiness
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <span className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-center text-[11px] font-black text-[var(--app-muted)]">
                {filteredEvents.length} visible
              </span>
              <span className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-center text-[11px] font-black text-[var(--app-muted)]">
                {totalInventory.toLocaleString("en-IN")} capacity
              </span>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:hidden">
          {eventRows.map(
            ({
              event,
              index,
              eventKey,
              capacity,
              priceRange,
              bookingCount,
              hasBookings,
              theme,
              inventory,
              ratio,
            }) => (
              <article
                key={`mobile-event-${eventKey}-${event.status}-${index}`}
                className="min-w-0 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 sm:p-4"              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-all text-[10px] font-black uppercase text-[var(--color-brand-primary)] [overflow-wrap:anywhere]">
                      {event.id ?? eventKey}
                    </p>
                    <h3 className="mt-1 line-clamp-2 break-words text-sm font-black text-[var(--app-foreground)]">
                      {event.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 break-words text-[11px] font-semibold text-[var(--app-muted)] [overflow-wrap:anywhere]">
                      {event.venue || "Venue pending"}, {event.city || "City pending"}
                    </p>
                  </div>

                  <EventApprovalBadge status={event.status} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">
                      Date / Time
                    </p>
                    <p className="mt-1 truncate text-xs font-black">{event.date}</p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)]">
                      {event.time}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">
                      Price
                    </p>
                    <p className="mt-1 truncate text-xs font-black">{priceRange}</p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)]">
                      {getOrganizerEventCategoryLabel(event)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">
                      Inventory
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-black leading-4">
                      {inventory}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">
                      Ticket Sections
                    </p>
                    <p className="mt-1 text-xs font-black">
                      {event.seatBlocks.length} sections
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-[var(--app-muted)]">
                      {capacity.toLocaleString("en-IN")} capacity
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">
                      Booking Mode
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-black leading-4">
                      {getOrganizerEventBookingMode(event)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">
                      Seat Map
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-black leading-4">
                      {getOrganizerEventSeatMapLabel(event)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex max-w-full gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                    {theme}
                  </span>
                  <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                    {ratio}
                  </span>
                </div>

                {event.rejectionReason ? (
                  <p className="mt-2 rounded-xl border border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 p-2 text-[11px] font-bold leading-5 text-[var(--color-brand-primary)]">
                    Rejection: {event.rejectionReason}
                  </p>
                ) : null}

                {event.approvalNote ? (
                  <p className="mt-2 rounded-xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-2 text-[11px] font-bold leading-5 text-[var(--color-brand-secondary)]">
                    {event.approvalNote}
                  </p>
                ) : null}

                <OrganizerEventWorkflowDetails event={event} />

                <OrganizerEventActions
                  event={event}
                  loadingKey={loadingKey}
                  bookingCount={bookingCount}
                  hasBookings={hasBookings}
                  onView={() => setSelectedEvent(event)}
                  onEdit={() => openFullEventEdit(event)}
                  onPublish={() => publishApprovedEvent(event)}
                  onSubmit={() => submitDraftForReview(event)}
                  onDuplicate={() => duplicateAsDraft(event)}
                  onCancel={() => cancelEvent(event)}
                  onDelete={() => deleteEvent(event)}
                />
              </article>
            ),
          )}

          {!eventRows.length ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center xl:col-span-2">
              <p className="text-lg font-black">No events found</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Try changing filters or create a new event.
              </p>
            </div>
          ) : null}
        </section>

        <section className="hidden overflow-x-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_14px_40px_rgba(15,23,42,0.06)] 2xl:block">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] text-xs font-black uppercase text-[var(--app-muted)]">
                <th className="px-4 py-4">Event</th>
                <th className="px-4 py-4">Schedule</th>
                <th className="px-4 py-4">Inventory</th>
                <th className="px-4 py-4">Ticket Rules</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {eventRows.map(
                ({
                  event,
                  index,
                  eventKey,
                  capacity,
                  priceRange,
                  bookingCount,
                  hasBookings,
                  theme,
                  inventory,
                  ratio,
                }) => (
                  <tr
                    key={`desktop-event-${eventKey}-${event.status}-${index}`}
                    className="border-b border-[var(--app-border)] transition duration-200 hover:bg-[var(--app-subtle)] last:border-0"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{event.name}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                        {event.id ?? eventKey}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                        {event.category} • {event.city}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{event.date}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                        {event.time} {event.endTime ? `- ${event.endTime}` : ""}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                        {event.venue}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{inventory}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                        Total capacity: {capacity.toLocaleString("en-IN")}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                        {event.seatBlocks.length} ticket sections
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="font-black">{priceRange}</p>
                      <p className="mt-1 max-w-xs truncate text-xs font-semibold text-[var(--app-muted)]">
                        Theme: {theme}
                      </p>
                      <p className="mt-1 max-w-xs truncate text-xs font-semibold text-[var(--app-muted)]">
                        Ratio: {ratio}
                      </p>
                      <p className="mt-1 max-w-xs truncate text-xs font-semibold text-[var(--app-muted)]">
                        Booking: {getOrganizerEventBookingMode(event)}
                      </p>
                      <p className="mt-1 max-w-xs truncate text-xs font-semibold text-[var(--app-muted)]">
                        Seat map: {getOrganizerEventSeatMapLabel(event)}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <EventApprovalBadge status={event.status} />
                      {event.approvalNote ? (
                        <p className="mt-2 max-w-[220px] text-xs font-semibold leading-5 text-[var(--app-muted)]">
                          {event.approvalNote}
                        </p>
                      ) : null}
                      <OrganizerEventWorkflowDetails event={event} compact />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <OrganizerEventActions
                        event={event}
                        loadingKey={loadingKey}
                        bookingCount={bookingCount}
                        hasBookings={hasBookings}
                        onView={() => setSelectedEvent(event)}
                        onEdit={() => openFullEventEdit(event)}
                        onPublish={() => publishApprovedEvent(event)}
                        onSubmit={() => submitDraftForReview(event)}
                        onDuplicate={() => duplicateAsDraft(event)}
                        onCancel={() => cancelEvent(event)}
                        onDelete={() => deleteEvent(event)}
                      />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>

          {!eventRows.length ? (
            <div className="p-10 text-center">
              <p className="text-xl font-black">No events found</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Try changing filters or create a new event.
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-[var(--color-brand-secondary)]" />
            <div className="min-w-0">
              <h3 className="text-base font-black text-[var(--color-brand-secondary)]">
                Production backend rule
              </h3>
              <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
                Organizer can create drafts, edit rejected events, submit for review,
                cancel own events, and view approval status. Publishing and approval stay
                controlled by Admin/Super Admin.
              </p>
            </div>
          </div>
        </section>
      </div>

      {selectedEvent ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:p-4 lg:place-items-center">
          <div className="max-h-[94dvh] w-full max-w-full min-w-0 overflow-y-auto rounded-t-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-2xl sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-3xl buizz-dashboard-enter">
            <div className="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-elevated)]/95 p-3 backdrop-blur sm:p-5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <EventApprovalBadge status={selectedEvent.status} />
                    <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-[10px] font-black text-[var(--color-brand-primary)] sm:text-xs">
                      Preview Only
                    </span>
                  </div>

                  <h2 className="mt-3 break-words text-xl font-black leading-tight text-[var(--app-foreground)] sm:text-2xl">
                    {selectedEvent.name}
                  </h2>

                  <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm">
                    {selectedEvent.venue}, {selectedEvent.city}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)]"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid min-w-0 gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <div
                  className="h-40 rounded-2xl bg-cover bg-center sm:h-64"
                  style={{ backgroundImage: `url(${selectedEvent.banner})` }}
                />

                <section className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
                  <OrganizerMiniInfo label="Date" value={selectedEvent.date} />
                  <OrganizerMiniInfo label="Time" value={selectedEvent.time} />
                  <OrganizerMiniInfo label="Dynamic Category" value={getOrganizerEventCategoryLabel(selectedEvent)} />
                  <OrganizerMiniInfo label="Price" value={getEventPriceRange(selectedEvent)} />
                  <OrganizerMiniInfo label="Booking Mode" value={getOrganizerEventBookingMode(selectedEvent)} />
                  <OrganizerMiniInfo label="Seat Map" value={getOrganizerEventSeatMapLabel(selectedEvent)} />
                  <OrganizerMiniInfo
                    label="Bookings"
                    value={`${getEventBookingCount(selectedEvent).toLocaleString("en-IN")} booking${getEventBookingCount(selectedEvent) === 1 ? "" : "s"}`}
                  />
                  <OrganizerMiniInfo
                    label="Capacity"
                    value={`${getEventCapacity(selectedEvent).toLocaleString("en-IN")} seats`}
                  />
                  <OrganizerMiniInfo
                    label="Ticket Sections"
                    value={`${selectedEvent.seatBlocks.length} sections`}
                  />
                </section>

                <section className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                    Description
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold leading-6 text-[var(--app-muted)]">
                    {selectedEvent.description || selectedEvent.shortDescription || "No description added yet."}
                  </p>
                </section>

                <section className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                    Ticket Blocks
                  </p>

                  <div className="mt-3 grid gap-2">
                    {selectedEvent.seatBlocks.map((block, index) => (
                      <div
                        key={`${block.name}-${index}`}
                        className="grid gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 sm:grid-cols-4"
                      >
                        <OrganizerMiniInfo label="Block" value={block.name} subtle />
                        <OrganizerMiniInfo label="Price" value={`Rs. ${block.price}`} subtle />
                        <OrganizerMiniInfo label="Capacity" value={block.capacity} subtle />
                        <OrganizerMiniInfo label="Gate" value={block.gate ?? "Main Gate"} subtle />
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:p-4">
                <p className="text-lg font-black text-[var(--app-foreground)]">
                  Event Control
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                  Available actions follow the event lifecycle status.
                </p>

                <div className="mt-4 grid gap-2">
                  <OrganizerMiniInfo label="Status" value={selectedEvent.status} />
                  <OrganizerMiniInfo
                    label="Inventory"
                    value={selectedEvent.inventorySummary ?? `${getEventCapacity(selectedEvent).toLocaleString("en-IN")} seats`}
                  />
                  <OrganizerMiniInfo label="Ratio" value={selectedEvent.ratioSummary ?? "Pending"} />
                  <OrganizerMiniInfo
                    label="Ticket Design"
                    value={selectedEvent.ticketDesignStatus ?? selectedEvent.themeApprovalStatus ?? "Default"}
                  />
                  <OrganizerMiniInfo label="Platform Fee" value={selectedEvent.platformFeeStatus ?? "Pending"} />
                </div>
                <OrganizerEventWorkflowDetails event={selectedEvent} />

                {getEventBookingCount(selectedEvent) > 0 ? (
                  <div className="mt-4 rounded-2xl border border-[var(--color-brand-accent)]/30 bg-[var(--color-brand-accent)]/10 p-3">
                    <p className="text-sm font-black text-[var(--color-brand-accent)]">
                      Cancellation locked
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                      This event already has bookings. Admin/Super Admin must handle cancellation and refund workflow.
                    </p>
                  </div>
                ) : null}

                {(selectedEvent.status === "Approved" || selectedEvent.status === "Published") ? (
                  <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
                    <p className="text-sm font-black">Booking QR</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                      Backend will generate signed entry QR later.
                    </p>

                    <div className="mt-3 overflow-hidden rounded-xl">
                      <TicketQrPreview
                        type="booking"
                        payload={{
                          eventId: selectedEvent.id ?? getEventKey(selectedEvent),
                          eventSlug: selectedEvent.name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, ""),
                          bookingUrl: `/booking/${selectedEvent.id ?? getEventKey(selectedEvent)}`,
                        }}
                        previewMetadata
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2">
                  <OrganizerEventActions
                    event={selectedEvent}
                    loadingKey={loadingKey}
                    bookingCount={getEventBookingCount(selectedEvent)}
                    hasBookings={getEventBookingCount(selectedEvent) > 0}
                    onView={() => undefined}
                    onEdit={() => openFullEventEdit(selectedEvent)}
                    onPublish={() => publishApprovedEvent(selectedEvent)}
                    onSubmit={() => submitDraftForReview(selectedEvent)}
                    onDuplicate={() => duplicateAsDraft(selectedEvent)}
                    onCancel={() => cancelEvent(selectedEvent)}
                    onDelete={() => deleteEvent(selectedEvent)}
                    hideViewAction
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black"
                  >
                    Close Preview
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function formatOrganizerWorkflowValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getOrganizerEventCategoryLabel(event: OrganizerEventItem) {
  const section = event.lifecycleMetadata?.listingSection;
  const category = event.lifecycleMetadata?.listingCategory || event.category;
  return section ? `${section} / ${category}` : category;
}

function getOrganizerEventBookingMode(event: OrganizerEventItem) {
  return (
    event.lifecycleMetadata?.bookingModeLabel ||
    event.bookingModeLabel ||
    (event.lifecycleMetadata?.bookingMode
      ? formatOrganizerWorkflowValue(event.lifecycleMetadata.bookingMode)
      : "Standard ticket booking")
  );
}

function getOrganizerEventSeatMapLabel(event: OrganizerEventItem) {
  return (event.lifecycleMetadata?.requiresSeatMap ?? event.seatMapRequired)
    ? "Required"
    : "Not required";
}

function getOrganizerApprovalBlockerSummary(event: OrganizerEventItem) {
  const blockers = event.lifecycleMetadata?.approvalBlockers;
  if (!blockers) return "No blocker data recorded";

  const entries: Array<[string, EventApprovalBlockers[keyof EventApprovalBlockers] | undefined]> = [
    ["Venue", blockers.venueApprovalStatus],
    ["Seat map", blockers.seatMapApprovalStatus],
    ["Ticket design", blockers.ticketDesignApprovalStatus],
    ["Media", blockers.mediaReviewStatus],
    ["Event", blockers.eventReviewStatus],
  ];

  return entries
    .filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1]))
    .map(([label, value]) => `${label}: ${formatOrganizerWorkflowValue(value)}`)
    .join(" / ");
}

function getOrganizerReviewerSummary(event: OrganizerEventItem) {
  if (!event.reviewerName && !event.reviewerRole && !event.reviewedAt) return "";

  const identity = [
    event.reviewerName,
    event.reviewerRole ? `(${formatOrganizerWorkflowValue(event.reviewerRole)})` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const reviewedAt = event.reviewedAt
    ? new Date(event.reviewedAt).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    : "";

  return [identity, reviewedAt].filter(Boolean).join(" / ");
}

function OrganizerEventWorkflowDetails({
  event,
  compact = false,
}: {
  event: OrganizerEventItem;
  compact?: boolean;
}) {
  const reviewer = getOrganizerReviewerSummary(event);

  return (
    <div className={compact ? "mt-2 grid gap-1" : "mt-3 grid gap-2"}>
      <p className="break-words text-[10px] font-bold leading-4 text-[var(--app-muted)]">
        <span className="font-black text-[var(--app-foreground)]">Approval blockers:</span>{" "}
        {getOrganizerApprovalBlockerSummary(event)}
      </p>
      {reviewer ? (
        <p className="break-words text-[10px] font-bold leading-4 text-[var(--app-muted)]">
          <span className="font-black text-[var(--app-foreground)]">Reviewer:</span>{" "}
          {reviewer}
        </p>
      ) : null}
      {event.reviewerComment ? (
        <p className="break-words text-[10px] font-bold leading-4 text-[var(--app-muted)]">
          <span className="font-black text-[var(--app-foreground)]">Comment:</span>{" "}
          {event.reviewerComment}
        </p>
      ) : null}
    </div>
  );
}

function OrganizerEventActions({
  event,
  loadingKey,
  bookingCount,
  hasBookings,
  onView,
  onEdit,
  onPublish,
  onSubmit,
  onDuplicate,
  onCancel,
  onDelete,
  hideViewAction = false,
}: {
  event: OrganizerEventItem;
  loadingKey: string | null;
  bookingCount: number;
  hasBookings: boolean;
  onView: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onSubmit: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
  onDelete: () => void;
  hideViewAction?: boolean;
}) {
  const router = useRouter();
  const eventId = event.id ?? getUnifiedEventKey(event);
  const encodedEventId = encodeURIComponent(eventId);
  const secondaryClass =
    "min-h-9 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black";
  const primaryClass =
    "min-h-9 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white";
  const isTerminal =
    event.status === "Completed" ||
    event.status === "Cancelled" ||
    event.status === "Expired";

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {event.status === "Draft" ? (
        <>
          {!hideViewAction ? (
            <button type="button" onClick={onView} className={secondaryClass}>View</button>
          ) : null}
          <button type="button" onClick={onEdit} className={primaryClass}>Edit</button>
          <LoadingButton
            loading={loadingKey === `submit-event-${eventId}`}
            loadingText="Submitting..."
            onClick={onSubmit}
            className="min-h-9 rounded-xl bg-[var(--color-brand-secondary)] px-3 text-xs font-black text-white"
          >
            Submit
          </LoadingButton>
          <LoadingButton
            loading={loadingKey === `duplicate-event-${eventId}`}
            loadingText="Duplicating..."
            onClick={onDuplicate}
            className={secondaryClass}
          >
            Duplicate
          </LoadingButton>
          <button
            type="button"
            disabled={hasBookings}
            title={hasBookings ? "Cancel is locked because this event has bookings." : "Cancel draft"}
            onClick={onCancel}
            className={`${secondaryClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {hasBookings ? `Cancel locked (${bookingCount})` : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-9 rounded-xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-3 text-xs font-black text-[var(--color-brand-primary)]"
          >
            Delete
          </button>
        </>
      ) : null}

      {event.status === "Pending Review" ? (
        <>
          {!hideViewAction ? (
            <button type="button" onClick={onView} className={secondaryClass}>View</button>
          ) : null}
          <button type="button" onClick={onEdit} className={secondaryClass}>Update</button>
          <button type="button" onClick={onDelete} className="min-h-9 rounded-xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-3 text-xs font-black text-[var(--color-brand-primary)]">
            Delete
          </button>
        </>
      ) : null}

      {event.status === "Changes Requested" ? (
        <>
          <button type="button" onClick={onEdit} className={primaryClass}>Edit</button>
          <LoadingButton
            loading={loadingKey === `submit-event-${eventId}`}
            loadingText="Resubmitting..."
            onClick={onSubmit}
            className="min-h-9 rounded-xl bg-[var(--color-brand-secondary)] px-3 text-xs font-black text-white"
          >
            Resubmit
          </LoadingButton>
          <button type="button" onClick={onDelete} className="min-h-9 rounded-xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-3 text-xs font-black text-[var(--color-brand-primary)]">
            Delete
          </button>
        </>
      ) : null}

      {event.status === "Approved" ? (
        <>
          {!hideViewAction ? (
            <button type="button" onClick={onView} className={secondaryClass}>View</button>
          ) : null}
          <LoadingButton
            loading={loadingKey === `publish-event-${eventId}`}
            loadingText="Publishing..."
            onClick={onPublish}
            className="min-h-9 rounded-xl bg-[#22C55E] px-3 text-xs font-black text-white"
          >
            Publish
          </LoadingButton>
          <button type="button" onClick={onEdit} className={secondaryClass}>Update</button>
          <button type="button" onClick={onDelete} className="min-h-9 rounded-xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-3 text-xs font-black text-[var(--color-brand-primary)]">
            Delete
          </button>
        </>
      ) : null}

      {event.status === "Rejected" ? (
        <>
          {!hideViewAction ? (
            <button type="button" onClick={onView} className={secondaryClass}>View Reason</button>
          ) : null}
          <LoadingButton
            loading={loadingKey === `duplicate-event-${eventId}`}
            loadingText="Duplicating..."
            onClick={onDuplicate}
            className={primaryClass}
          >
            Duplicate as Draft
          </LoadingButton>
          <button type="button" onClick={onEdit} className={secondaryClass}>Update</button>
          <button type="button" onClick={onDelete} className="min-h-9 rounded-xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-3 text-xs font-black text-[var(--color-brand-primary)]">
            Delete
          </button>
        </>
      ) : null}

      {event.status === "Published" ? (
        <>
          <button
            type="button"
            onClick={() => router.push(`/events/${encodeURIComponent(event.publicSlug || eventId)}`)}
            className={primaryClass}
          >
            View Public Page
          </button>
          <button type="button" onClick={() => router.push(`/organizer/bookings?eventId=${encodedEventId}`)} className={secondaryClass}>Bookings</button>
          <button type="button" onClick={() => router.push(`/organizer/attendees?eventId=${encodedEventId}`)} className={secondaryClass}>Attendees</button>
          <button type="button" onClick={() => router.push(`/organizer/revenue?eventId=${encodedEventId}`)} className={secondaryClass}>Revenue</button>
          <button type="button" onClick={onEdit} className={secondaryClass}>Update</button>
          <button type="button" onClick={onDelete} className="min-h-9 rounded-xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 px-3 text-xs font-black text-[var(--color-brand-primary)]">
            Delete
          </button>
        </>
      ) : null}

      {isTerminal ? (
        <>
          <button type="button" onClick={() => router.push(`/organizer/analytics?eventId=${encodedEventId}`)} className={primaryClass}>Report</button>
          <button type="button" onClick={() => router.push(`/organizer/history?eventId=${encodedEventId}`)} className={secondaryClass}>History</button>
        </>
      ) : null}

      {event.status === "Unpublished" ? (
        !hideViewAction ? (
          <button type="button" onClick={onView} className={secondaryClass}>View</button>
        ) : null
      ) : null}
    </div>
  );
}

function OrganizerMiniInfo({
  label,
  value,
  subtle = false,
}: {
  label: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-[var(--app-border)] p-3 ${subtle ? "bg-[var(--app-subtle)]" : "bg-[var(--app-elevated)]"
        }`}
    >
      <p className="break-words text-[10px] font-black uppercase tracking-[0.06em] text-[var(--app-muted)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold leading-5 text-[var(--app-foreground)] [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
      <p className="break-words text-[10px] font-black uppercase tracking-[0.06em] text-[var(--app-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold leading-5 text-[var(--app-foreground)] [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function SectionBox({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="mt-0 min-w-0 rounded-[22px] border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:p-4"
    >
      <h3 className="break-words text-xs font-black uppercase tracking-[0.10em] text-[var(--app-muted)]">
        {title}
      </h3>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

function EventApprovalBadge({ status }: { status: OrganizerEventStatus }) {
  const tone =
    status === "Published" || status === "Approved"
      ? "bg-[#22C55E]/15 text-[#22C55E]"
      : status === "Rejected" || status === "Cancelled"
        ? "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]"
        : status === "Pending Review" || status === "Changes Requested"
          ? "bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]"
          : "bg-[var(--app-muted)]/15 text-[var(--app-muted)]";

  return (
    <span
      className={`max-w-full truncate rounded-full px-3 py-1 text-[10px] font-black sm:text-xs ${tone}`}
    >
      {status}
    </span>
  );
}

function OrganizerEditInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
      />
    </label>
  );
}

function getUnifiedEventTimeValue(event: UnifiedBuizzEvent) {
  const item = event as UnifiedBuizzEvent & {
    createdAt?: string;
    updatedAt?: string;
    approval?: { submittedAt?: string };
  };

  return item.updatedAt ?? item.approval?.submittedAt ?? item.createdAt ?? "";
}

function dedupeOrganizerUnifiedEvents(events: UnifiedBuizzEvent[]) {
  const eventMap = new Map<string, UnifiedBuizzEvent>();

  events.forEach((event) => {
    const key =
      event.id ||
      `${event.title.trim().toLowerCase()}-${event.city ?? ""}-${event.venueName ?? ""}-${event.date ?? ""}-${event.time ?? ""}`;

    const existing = eventMap.get(key);

    if (!existing) {
      eventMap.set(key, event);
      return;
    }

    const existingTime = getUnifiedEventTimeValue(existing);
    const nextTime = getUnifiedEventTimeValue(event);

    if (nextTime.localeCompare(existingTime) >= 0) {
      eventMap.set(key, event);
    }
  });

  return Array.from(eventMap.values());
}

function getTicketBlockStableId(block: {
  id?: string;
  blockId?: string;
  name: string;
}) {
  return block.blockId ?? block.id ?? block.name;
}


function OrganizerTicketsView() {
  type TicketInventoryFilter = "All Inventory" | "Available" | "Low Stock" | "Sold Out" | "Setup Pending";

  const router = useRouter();
  const [events, setEvents] = useState<UnifiedBuizzEvent[]>([]);
  const offlineBookings = useOrganizerOfflineBookings();
  const unifiedBookings = useOrganizerUnifiedBookings();

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All Events");
  const [statusFilter, setStatusFilter] = useState<"All Status" | OrganizerEventStatus>("All Status");
  const [inventoryFilter, setInventoryFilter] = useState<TicketInventoryFilter>("All Inventory");
  type TicketSortKey = "event" | "block" | "capacity" | "issued" | "available" | "revenue";
  const [sortBy, setSortBy] = useState<TicketSortKey>("event");

  useEffect(() => {
    setEvents(
      readUnifiedEvents().filter(
        (event) => Boolean(event.organizerName),
      ),
    );
  }, []);

  const formatMoney = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

  const dedupedEvents = useMemo(() => {
    const map = new Map<string, UnifiedBuizzEvent>();

    for (const event of events) {
      const record = event as UnifiedBuizzEvent & Record<string, unknown>;
      const eventBlocks = Array.isArray(event.ticketBlocks) ? event.ticketBlocks : [];
      const blockKey = eventBlocks
        .map((block) => `${block.name}-${block.totalQuantity}-${block.price}`)
        .join("~");
      const naturalKey = [event.title, event.date, event.time, event.venueName, event.city, blockKey]
        .map((value) => String(value ?? "").trim().toLowerCase())
        .filter(Boolean)
        .join("|");
      const key = naturalKey || String(record.id ?? "").trim();

      if (!key) continue;

      const existing = map.get(key) as (UnifiedBuizzEvent & Record<string, unknown>) | undefined;
      const existingTime =
        new Date(String(existing?.updatedAt ?? existing?.createdAt ?? "")).getTime() || 0;
      const eventTime =
        new Date(String(record.updatedAt ?? record.createdAt ?? "")).getTime() || 0;

      if (!existing || eventTime >= existingTime) {
        map.set(key, event);
      }
    }

    return Array.from(map.values());
  }, [events]);

  const organizerEventNames = useOrganizerEventNames(dedupedEvents.map((event) => event.title));

  const offlineIds = useMemo(
    () => new Set(offlineBookings.flatMap((booking) => [booking.bookingId, booking.ticketId])),
    [offlineBookings],
  );

  const uniqueUnifiedBookings = useMemo(
    () =>
      unifiedBookings.filter(
        (booking) =>
          !offlineIds.has(booking.bookingId) && !offlineIds.has(booking.ticketId),
      ),
    [unifiedBookings, offlineIds],
  );

  const handleEditEvent = (row: { eventId?: string }) => {
    const eventId = String(row.eventId ?? "").trim();

    if (!eventId || eventId === "Pending" || eventId === "setup-pending") {
      router.push("/organizer/create-event");
      return;
    }

    router.push(
      `/organizer/create-event?mode=edit&eventId=${encodeURIComponent(eventId)}&from=tickets`,
    );
  };

  const handleIssueOffline = (row: { eventId?: string; block?: string; available?: number }) => {
    const eventId = String(row.eventId ?? "").trim();
    const blockName = String(row.block ?? "").trim();

    if (!eventId || eventId === "Pending" || eventId === "setup-pending") {
      router.push("/organizer/offline-booking");
      return;
    }

    if (typeof row.available === "number" && row.available <= 0) {
      window.alert("This ticket block has no available inventory.");
      return;
    }

    router.push(
      `/organizer/offline-booking?eventId=${encodeURIComponent(eventId)}&ticketBlock=${encodeURIComponent(blockName)}`,
    );
  };

  const ticketRows = useMemo(() => {
    const rows = dedupedEvents.flatMap((event) => {
      const eventStatus = unifiedStatusToOrganizer(event.status);
      const blocks = Array.isArray(event.ticketBlocks) ? event.ticketBlocks : [];

      if (!blocks.length) {
        return [
          {
            id: `${event.id}-setup-pending`,
            eventId: event.id,
            event: event.title || "Untitled Event",
            category: event.category || "Event",
            city: event.city || "City pending",
            venue: event.venueName || "Venue pending",
            date: event.date || "Date pending",
            block: "General",
            price: 0,
            total: 0,
            online: 0,
            offline: 0,
            reserved: 0,
            onlineIssued: 0,
            offlineIssued: 0,
            reservedIssued: 0,
            complimentaryIssued: 0,
            sold: 0,
            available: 0,
            revenue: 0,
            status: eventStatus,
            inventoryStatus: "Setup Pending" as const,
            allocationLabel: "Ticket blocks not created yet",
            designStatus: event.ticketDesignId || "Default ticket design",
          },
        ];
      }

      return blocks.map((block) => {
        const relatedOfflineBookings = offlineBookings.filter(
          (booking) =>
            String(booking.eventId) === String(event.id) &&
            booking.ticketBlock.trim().toLowerCase() === block.name.trim().toLowerCase(),
        );

        const relatedUnifiedBookings = uniqueUnifiedBookings.filter(
          (booking) =>
            String(booking.eventId) === String(event.id) &&
            booking.ticketBlock.trim().toLowerCase() === block.name.trim().toLowerCase(),
        );

        const onlineIssued = relatedUnifiedBookings
          .filter((booking) => normalizeOfflineSourceForDashboard(booking.source) === "Online")
          .reduce((sum, booking) => sum + Number(booking.quantity || 0), 0);

        const offlineIssued = relatedOfflineBookings
          .filter((booking) => normalizeOfflineSourceForDashboard(booking.source) === "Offline")
          .reduce((sum, booking) => sum + Number(booking.quantity || 0), 0);

        const reservedIssued = relatedOfflineBookings
          .filter((booking) => normalizeOfflineSourceForDashboard(booking.source) === "Reserved")
          .reduce((sum, booking) => sum + Number(booking.quantity || 0), 0);

        const complimentaryIssued = relatedOfflineBookings
          .filter((booking) => normalizeOfflineSourceForDashboard(booking.source) === "Free")
          .reduce((sum, booking) => sum + Number(booking.quantity || 0), 0);

        const sold = onlineIssued + offlineIssued + reservedIssued + complimentaryIssued;
        const available = Math.max(0, Number(block.totalQuantity || 0) - sold);
        const soldPercent = block.totalQuantity
          ? Math.round((sold / block.totalQuantity) * 100)
          : 0;

        const revenue =
          relatedOfflineBookings.reduce((sum, booking) => sum + Number(booking.amountCollected || 0), 0) +
          relatedUnifiedBookings.reduce((sum, booking) => sum + Number(booking.amountCollected || 0), 0);

        const inventoryStatus =
          block.totalQuantity <= 0
            ? "Setup Pending"
            : available <= 0
              ? "Sold Out"
              : available <= Math.max(5, Math.ceil(block.totalQuantity * 0.1)) || soldPercent >= 85
                ? "Low Stock"
                : "Available";

        return {
          id: `${event.id}-${(block as { id?: string }).id ?? block.name}`,
          eventId: event.id,
          event: event.title || "Untitled Event",
          category: event.category || "Event",
          city: event.city || "City pending",
          venue: event.venueName || "Venue pending",
          date: event.date || "Date pending",
          block: block.name || "General",
          price: Number(block.price || 0),
          total: Number(block.totalQuantity || 0),
          online: Number(block.onlineQuantity || 0),
          offline: Number(block.offlineQuantity || 0),
          reserved: Number(block.reservedQuantity || 0),
          onlineIssued,
          offlineIssued,
          reservedIssued,
          complimentaryIssued,
          sold,
          available,
          revenue,
          status: eventStatus,
          inventoryStatus,
          allocationLabel: `${Number(block.onlineQuantity || 0).toLocaleString("en-IN")} online / ${Number(block.offlineQuantity || 0).toLocaleString("en-IN")} offline / ${Number(block.reservedQuantity || 0).toLocaleString("en-IN")} reserved`,
          designStatus: event.ticketDesignId || "Default ticket design",
        };
      });
    });

    const existingEventNames = new Set(rows.map((row) => row.event.trim().toLowerCase()));

    const setupPendingRows = organizerEventNames
      .filter((eventName) => !existingEventNames.has(eventName.trim().toLowerCase()))
      .map((eventName) => ({
        id: `setup-pending-${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        eventId: "Pending",
        event: eventName,
        category: "Event",
        city: "City pending",
        venue: "Venue pending",
        date: "Date pending",
        block: "General",
        price: 0,
        total: 0,
        online: 0,
        offline: 0,
        reserved: 0,
        onlineIssued: 0,
        offlineIssued: 0,
        reservedIssued: 0,
        complimentaryIssued: 0,
        sold: 0,
        available: 0,
        revenue: 0,
        status: "Draft" as OrganizerEventStatus,
        inventoryStatus: "Setup Pending" as const,
        allocationLabel: "Create ticket blocks from event setup",
        designStatus: "Default ticket design",
      }));

    const mergedRows = [...rows, ...setupPendingRows];

    return Array.from(
      mergedRows
        .reduce((map, row) => {
          const key = [row.event, row.date, row.venue, row.city, row.block]
            .map((value) => String(value ?? "").trim().toLowerCase())
            .join("|");

          const existing = map.get(key);
          if (!existing || row.eventId !== "Pending") {
            map.set(key, row);
          }

          return map;
        }, new Map<string, (typeof mergedRows)[number]>())
        .values(),
    );
  }, [dedupedEvents, offlineBookings, uniqueUnifiedBookings, organizerEventNames]);

  const eventOptions = useOrganizerEventFilterOptions(ticketRows.map((row) => row.event));

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matchedRows = ticketRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.event.toLowerCase().includes(query) ||
        row.eventId.toLowerCase().includes(query) ||
        row.block.toLowerCase().includes(query) ||
        row.category.toLowerCase().includes(query) ||
        row.city.toLowerCase().includes(query) ||
        row.venue.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query) ||
        row.inventoryStatus.toLowerCase().includes(query);

      const matchesEvent = eventFilter === "All Events" || row.event === eventFilter;
      const matchesStatus = statusFilter === "All Status" || row.status === statusFilter;
      const matchesInventory =
        inventoryFilter === "All Inventory" || row.inventoryStatus === inventoryFilter;

      return matchesSearch && matchesEvent && matchesStatus && matchesInventory;
    });

    return [...matchedRows].sort((a, b) => {
      if (sortBy === "event") {
        return `${a.event} ${a.block}`.localeCompare(`${b.event} ${b.block}`);
      }

      if (sortBy === "block") {
        return `${a.block} ${a.event}`.localeCompare(`${b.block} ${b.event}`);
      }

      if (sortBy === "capacity") {
        return b.total - a.total;
      }

      if (sortBy === "issued") {
        return b.sold - a.sold;
      }

      if (sortBy === "available") {
        return b.available - a.available;
      }

      return b.revenue - a.revenue;
    });
  }, [eventFilter, inventoryFilter, search, sortBy, statusFilter, ticketRows]);

  const totalBlocks = filteredRows.length;
  const totalCapacity = filteredRows.reduce((sum, row) => sum + row.total, 0);
  const totalIssued = filteredRows.reduce((sum, row) => sum + row.sold, 0);
  const totalAvailable = filteredRows.reduce((sum, row) => sum + row.available, 0);
  const totalRevenue = filteredRows.reduce((sum, row) => sum + row.revenue, 0);
  const lowStockCount = filteredRows.filter((row) => row.inventoryStatus === "Low Stock").length;
  const soldOutCount = filteredRows.filter((row) => row.inventoryStatus === "Sold Out").length;
  const setupPendingCount = filteredRows.filter((row) => row.inventoryStatus === "Setup Pending").length;
  const issuedPercent = totalCapacity ? Math.min(100, Math.round((totalIssued / totalCapacity) * 100)) : 0;
  const activeFilterCount = [
    search.trim(),
    eventFilter !== "All Events" ? eventFilter : "",
    statusFilter !== "All Status" ? statusFilter : "",
    inventoryFilter !== "All Inventory" ? inventoryFilter : "",
  ].filter(Boolean).length;

  const exportTicketInventory = () => {
    if (typeof window === "undefined") return;

    const columns = [
      "Event ID",
      "Event",
      "Block",
      "City",
      "Venue",
      "Date",
      "Status",
      "Inventory Status",
      "Price",
      "Capacity",
      "Online Allocation",
      "Offline Allocation",
      "Reserved Allocation",
      "Online Issued",
      "Offline Issued",
      "Reserved Issued",
      "Total Issued",
      "Available",
      "Revenue",
    ];

    const escapeCsv = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const rows = filteredRows.map((row) => [
      row.eventId,
      row.event,
      row.block,
      row.city,
      row.venue,
      row.date,
      row.status,
      row.inventoryStatus,
      row.price,
      row.total,
      row.online,
      row.offline,
      row.reserved,
      row.onlineIssued,
      row.offlineIssued,
      row.reservedIssued,
      row.sold,
      row.available,
      row.revenue,
    ]);

    const csv = [columns, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `buizz-ticket-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch("");
    setEventFilter("All Events");
    setStatusFilter("All Status");
    setInventoryFilter("All Inventory");
    setSortBy("event");
  };

  const inventoryTone = (status: string) => {
    if (status === "Available") return "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#15803D]";
    if (status === "Low Stock") return "border-[var(--color-brand-accent)]/30 bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]";
    if (status === "Sold Out") return "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]";
    return "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)]";
  };

  const statusTone = (status: OrganizerEventStatus) => {
    if (status === "Approved" || status === "Published") return "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#15803D]";
    if (status === "Pending Review") return "border-[var(--color-brand-accent)]/30 bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]";
    if (status === "Rejected" || status === "Cancelled") return "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]";
    return "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)]";
  };

  const statCards = [
    { label: "Blocks", value: totalBlocks.toLocaleString("en-IN"), detail: "Ticket blocks", icon: Ticket },
    { label: "Capacity", value: totalCapacity.toLocaleString("en-IN"), detail: "All seats/passes", icon: Users },
    { label: "Issued", value: totalIssued.toLocaleString("en-IN"), detail: `${issuedPercent}% sold`, icon: CheckCircle2 },
    { label: "Available", value: totalAvailable.toLocaleString("en-IN"), detail: `${lowStockCount} low / ${soldOutCount} sold`, icon: ShieldCheck },
    { label: "Revenue", value: formatMoney(totalRevenue), detail: `${setupPendingCount} setup pending`, icon: DollarSign },
  ];

  const QuickActionButton = ({
    label,
    icon: Icon,
    onClick,
    primary = false,
  }: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    primary?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-2xl px-3 text-[11px] font-black transition active:scale-[0.98] sm:min-h-11 sm:px-4 sm:text-sm ${primary
        ? "bg-[var(--color-brand-primary)] text-white shadow-[0_14px_30px_rgb(var(--brand-primary-rgb)/0.20)]"
        : "border border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-foreground)] hover:border-[var(--color-brand-primary)]/40"
        }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="grid w-full min-w-0 gap-3 overflow-x-hidden sm:gap-5">
      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:rounded-[2rem]">
        <div className="grid gap-3 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
              Organizer Tickets
            </p>
            <h2 className="mt-1 break-words text-xl font-black leading-tight text-[var(--app-foreground)] sm:text-2xl">
              Tickets & Pricing Control
            </h2>
            <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
              Compact inventory, allocation, issued tickets, revenue, design, and offline issuing in one responsive workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:min-w-[520px]">
            <QuickActionButton primary label="Create Blocks" icon={PlusCircle} onClick={() => router.push("/organizer/create-event")} />
            <QuickActionButton label="Offline" icon={QrCode} onClick={() => router.push("/organizer/offline-booking")} />
            <QuickActionButton label="Export" icon={Download} onClick={exportTicketInventory} />
          </div>
        </div>

        <div className="border-t border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:p-4">
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {statCards.map(({ label, value, detail, icon: Icon }) => (
              <article
                key={label}
                className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-[var(--app-muted)] sm:text-[10px]">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-lg font-black leading-tight text-[var(--app-foreground)] sm:text-2xl">
                      {value}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[10px] font-bold text-[var(--app-muted)]">
                      {detail}
                    </p>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] sm:size-9">
                    <Icon className="size-4" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-2 rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:gap-3 sm:rounded-[2rem] sm:p-3">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_220px_165px_165px_165px_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search event, block, city..."
            className="min-h-10 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] sm:min-h-11 sm:px-4 sm:text-sm"
          />

          <details className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] xl:hidden">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-black text-[var(--app-foreground)] sm:min-h-11">
              Filters
              <span className="rounded-full bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                Open
              </span>
            </summary>

            <div className="grid gap-2 border-t border-[var(--app-border)] p-2 sm:grid-cols-2 sm:p-3">
              <select
                value={eventFilter}
                onChange={(event) => setEventFilter(event.target.value)}
                className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none sm:col-span-2"
              >
                {eventOptions.map((eventName) => (
                  <option key={eventName} value={eventName}>
                    {eventName}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "All Status" | OrganizerEventStatus)}
                className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none"
              >
                <option>All Status</option>
                <option>Draft</option>
                <option>Pending Review</option>
                <option>Approved</option>
                <option>Published</option>
                <option>Rejected</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>

              <select
                value={inventoryFilter}
                onChange={(event) => setInventoryFilter(event.target.value as TicketInventoryFilter)}
                className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none"
              >
                <option>All Inventory</option>
                <option>Available</option>
                <option>Low Stock</option>
                <option>Sold Out</option>
                <option>Setup Pending</option>
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as TicketSortKey)}
                className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none sm:col-span-2"
              >
                <option value="event">Sort: Event</option>
                <option value="block">Sort: Block</option>
                <option value="capacity">Sort: Capacity</option>
                <option value="issued">Sort: Issued</option>
                <option value="available">Sort: Available</option>
                <option value="revenue">Sort: Revenue</option>
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] sm:col-span-2"
              >
                Reset Filters
              </button>
            </div>
          </details>

          <select
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value)}
            className="hidden min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none xl:block"
          >
            {eventOptions.map((eventName) => (
              <option key={eventName} value={eventName}>
                {eventName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "All Status" | OrganizerEventStatus)}
            className="hidden min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none xl:block"
          >
            <option>All Status</option>
            <option>Draft</option>
            <option>Pending Review</option>
            <option>Approved</option>
            <option>Published</option>
            <option>Rejected</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>

          <select
            value={inventoryFilter}
            onChange={(event) => setInventoryFilter(event.target.value as TicketInventoryFilter)}
            className="hidden min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none xl:block"
          >
            <option>All Inventory</option>
            <option>Available</option>
            <option>Low Stock</option>
            <option>Sold Out</option>
            <option>Setup Pending</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as TicketSortKey)}
            className="hidden min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none xl:block"
          >
            <option value="event">Sort: Event</option>
            <option value="block">Sort: Block</option>
            <option value="capacity">Sort: Capacity</option>
            <option value="issued">Sort: Issued</option>
            <option value="available">Sort: Available</option>
            <option value="revenue">Sort: Revenue</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="hidden min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black text-[var(--app-foreground)] xl:block"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-[11px] font-black text-[var(--app-muted)] sm:text-xs">
          <span className="rounded-full bg-[var(--app-elevated)] px-3 py-1 text-[var(--app-foreground)]">
            Showing {filteredRows.length.toLocaleString("en-IN")} / {ticketRows.length.toLocaleString("en-IN")} blocks
          </span>
          <span className="rounded-full bg-[var(--app-elevated)] px-3 py-1">
            {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-[var(--app-elevated)] px-3 py-1">
            Sorted by {sortBy}
          </span>
          {search.trim() ? (
            <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-[var(--color-brand-primary)]">
              Search: {search.trim()}
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid min-w-0 gap-2 lg:grid-cols-2 xl:hidden">
        {filteredRows.map((row) => {
          const soldPercent = row.total ? Math.min(100, Math.round((row.sold / row.total) * 100)) : 0;

          return (
            <article
              key={`mobile-ticket-${row.id}`}
              className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:rounded-2xl sm:p-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-all text-[9px] font-black uppercase tracking-[0.08em] text-[var(--color-brand-primary)] [overflow-wrap:anywhere] sm:text-[10px]">
                    {row.eventId}
                  </p>
                  <h3 className="mt-1 line-clamp-2 break-words text-sm font-black leading-tight text-[var(--app-foreground)]">
                    {row.event}
                  </h3>
                  <p className="mt-1 truncate text-[11px] font-bold text-[var(--app-muted)]">
                    {row.block} • {row.city}
                  </p>
                </div>

                <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black sm:text-[10px] ${inventoryTone(row.inventoryStatus)}`}>
                  {row.inventoryStatus}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                  <p className="text-[8px] font-black uppercase text-[var(--app-muted)] sm:text-[9px]">Price</p>
                  <p className="mt-1 truncate text-[11px] font-black sm:text-xs">
                    {row.price > 0 ? formatMoney(row.price) : "Pending"}
                  </p>
                </div>

                <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                  <p className="text-[8px] font-black uppercase text-[var(--app-muted)] sm:text-[9px]">Issued</p>
                  <p className="mt-1 text-[11px] font-black sm:text-xs">
                    {row.sold.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="rounded-xl bg-[var(--app-subtle)] p-2">
                  <p className="text-[8px] font-black uppercase text-[var(--app-muted)] sm:text-[9px]">Left</p>
                  <p className="mt-1 text-[11px] font-black sm:text-xs">
                    {row.available.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="mt-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-black uppercase text-[var(--app-muted)]">Inventory</p>
                  <p className="text-[10px] font-black text-[var(--app-foreground)]">
                    {soldPercent}%
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-elevated)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-brand-primary)] transition-all duration-300"
                    style={{ width: `${soldPercent}%` }}
                  />
                </div>
                <p className="mt-2 truncate text-[10px] font-bold text-[var(--app-muted)]">
                  {row.allocationLabel}
                </p>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                <span className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-1.5 py-1 text-[9px] font-black text-[var(--app-muted)]">
                  Online {row.onlineIssued}/{row.online}
                </span>
                <span className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-1.5 py-1 text-[9px] font-black text-[var(--app-muted)]">
                  Offline {row.offlineIssued}/{row.offline}
                </span>
                <span className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-1.5 py-1 text-[9px] font-black text-[var(--app-muted)]">
                  Res {row.reservedIssued}/{row.reserved}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleEditEvent(row)}
                  className="min-h-9 rounded-xl border border-[var(--app-border)] px-2 text-xs font-black"
                >
                  Edit Event
                </button>

                <button
                  type="button"
                  disabled={row.available <= 0}
                  onClick={() => handleIssueOffline(row)}
                  className="min-h-9 rounded-xl bg-[var(--color-brand-primary)] px-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Issue Offline
                </button>
              </div>
            </article>
          );
        })}

        {!filteredRows.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center lg:col-span-2">
            <p className="text-lg font-black">No ticket blocks found</p>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
              Try changing filters or create ticket blocks from event setup.
            </p>
          </div>
        ) : null}
      </section>

      <section className="hidden min-w-0 overflow-x-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_14px_40px_rgba(15,23,42,0.06)] xl:block">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase text-[var(--app-muted)]">
              <th className="px-4 py-4">Event</th>
              <th className="px-4 py-4">Block</th>
              <th className="px-4 py-4">Allocation</th>
              <th className="px-4 py-4">Issued</th>
              <th className="px-4 py-4">Available</th>
              <th className="px-4 py-4">Revenue</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((row) => {
              const soldPercent = row.total ? Math.min(100, Math.round((row.sold / row.total) * 100)) : 0;

              return (
                <tr
                  key={`ticket-row-${row.id}`}
                  className="border-b border-[var(--app-border)] transition duration-200 hover:bg-[var(--app-subtle)] last:border-0"
                >
                  <td className="px-4 py-4 align-top">
                    <p className="font-black text-[var(--app-foreground)]">{row.event}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {row.eventId}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {row.venue}, {row.city} • {row.date}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black text-[var(--app-foreground)]">{row.block}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {row.price > 0 ? formatMoney(row.price) : "Price pending"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {row.designStatus}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black text-[var(--app-foreground)]">
                      {row.total.toLocaleString("en-IN")} total
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      Online {row.online.toLocaleString("en-IN")} • Offline {row.offline.toLocaleString("en-IN")} • Reserved {row.reserved.toLocaleString("en-IN")}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black text-[var(--app-foreground)]">
                      {row.sold.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      Online {row.onlineIssued} • Offline {row.offlineIssued} • Reserved {row.reservedIssued}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black text-[var(--app-foreground)]">
                      {row.available.toLocaleString("en-IN")}
                    </p>
                    <div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-[var(--app-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-brand-primary)]"
                        style={{ width: `${soldPercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {soldPercent}% issued
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top font-black text-[var(--app-foreground)]">
                    {formatMoney(row.revenue)}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="grid gap-2">
                      <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${inventoryTone(row.inventoryStatus)}`}>
                        {row.inventoryStatus}
                      </span>
                      <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${statusTone(row.status)}`}>
                        {row.status}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditEvent(row)}
                        className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={row.available <= 0}
                        onClick={() => handleIssueOffline(row)}
                        className="rounded-xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Issue
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!filteredRows.length ? (
          <div className="p-10 text-center">
            <p className="text-xl font-black">No ticket blocks found</p>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
              Try changing filters or create ticket blocks from event setup.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}


export function OrganizerBookingsView() {
  const router = useRouter();
  const offlineBookings = useOrganizerOfflineBookings();
  const unifiedBookings = useOrganizerUnifiedBookings();
  const { checkIns } = useOrganizerOfflineCheckIns();
  const { data: apiBookingsResponse } = useGetOrganizerBookingsQuery({ page: 1, limit: 100 });
  const apiBookings: any[] = apiBookingsResponse?.data ?? [];

  const [events, setEvents] = useState<UnifiedBuizzEvent[]>([]);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All Events");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All Status");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All Payments");
  const [scanFilter, setScanFilter] = useState("All Scan Modes");

  useEffect(() => {
    setEvents(readUnifiedEvents());
  }, []);

  type BookingDateState = "before" | "today" | "past" | "unknown";
  type BookingScanMode =
    | "Pre-event Ready"
    | "Gate Check-in Active"
    | "Already Checked In"
    | "Closed"
    | "Blocked"
    | "Date Pending";

  type BookingBlockSeatGroup = {
    block: string;
    section: string;
    quantity: number;
    seats: string[];
  };

  type BookingDashboardRow = OrganizerBookingRow & {
    blockGroups: BookingBlockSeatGroup[];
    eventDate: string;
    eventTime: string;
    dateState: BookingDateState;
    dateLabel: string;
    scanMode: BookingScanMode;
    scanHelp: string;
  };

  type DynamicSeat = string | {
    seatNumber?: string;
    label?: string;
    seat?: string;
    section?: string;
    row?: string;
  };

  type DynamicBookingShape = {
    date?: string;
    time?: string;
    section?: string;
    seatLabel?: string;
    seatNumbers?: string[] | string;
    seats?: DynamicSeat[];
    selectedSeats?: DynamicSeat[];
    lineItems?: Array<{
      label?: string;
      name?: string;
      ticketBlock?: string;
      block?: string;
      section?: string;
      quantity?: number;
      seats?: DynamicSeat[];
      selectedSeats?: DynamicSeat[];
      seatNumbers?: string[] | string;
    }>;
  };
  const [selectedEntryList, setSelectedEntryList] =
    useState<BookingDashboardRow | null>(null);

  const eventMap = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const formatDisplayDate = (dateValue: string) => {
    if (!dateValue || dateValue === "Date pending") return "Date pending";

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return dateValue;

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDateInfo = (dateValue?: string) => {
    if (!dateValue) {
      return {
        state: "unknown" as const,
        label: "Date pending",
      };
    }

    const parsed = new Date(dateValue);

    if (Number.isNaN(parsed.getTime())) {
      return {
        state: "unknown" as const,
        label: "Date pending",
      };
    }

    const today = new Date();
    const eventDay = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
    );
    const currentDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    if (eventDay.getTime() === currentDay.getTime()) {
      return {
        state: "today" as const,
        label: "Event Day",
      };
    }

    if (eventDay.getTime() > currentDay.getTime()) {
      return {
        state: "before" as const,
        label: "Before Event Date",
      };
    }

    return {
      state: "past" as const,
      label: "Event Passed",
    };
  };

  const seatLabelFromUnknown = (seat: DynamicSeat) => {
    if (typeof seat === "string") return seat;

    const label =
      seat.seatNumber ||
      seat.label ||
      seat.seat ||
      [seat.section, seat.row].filter(Boolean).join(" ");

    return label || "Seat";
  };

  const normalizeSeatNumbers = (
    value: string[] | string | undefined,
  ): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const getBookingBlockGroups = (
    booking: OfflineBookingRecord | UnifiedBookingRecord,
    fallbackBlock: string,
    fallbackQuantity: number,
  ): BookingBlockSeatGroup[] => {
    const dynamicBooking = booking as unknown as DynamicBookingShape;

    if (Array.isArray(dynamicBooking.lineItems) && dynamicBooking.lineItems.length) {
      return dynamicBooking.lineItems.map((line, index) => {
        const block =
          line.ticketBlock ||
          line.block ||
          line.label ||
          line.name ||
          fallbackBlock ||
          `Block ${index + 1}`;

        const quantity = Number(line.quantity ?? fallbackQuantity ?? 1) || 1;

        const directSeats = Array.isArray(line.seats)
          ? line.seats.map(seatLabelFromUnknown).filter(Boolean)
          : [];
        const selectedSeats = Array.isArray(line.selectedSeats)
          ? line.selectedSeats.map(seatLabelFromUnknown).filter(Boolean)
          : [];

        const seatNumbers = normalizeSeatNumbers(line.seatNumbers);

        return {
          block,
          section: line.section || block,
          quantity,
          seats:
            selectedSeats.length || directSeats.length || seatNumbers.length
              ? [...selectedSeats, ...directSeats, ...seatNumbers]
              : [`${block} / ${quantity} seat${quantity > 1 ? "s" : ""}`],
        };
      });
    }

    const directSeats = Array.isArray(dynamicBooking.seats)
      ? dynamicBooking.seats.map(seatLabelFromUnknown).filter(Boolean)
      : [];
    const selectedSeats = Array.isArray(dynamicBooking.selectedSeats)
      ? dynamicBooking.selectedSeats.map(seatLabelFromUnknown).filter(Boolean)
      : [];

    const seatNumbers = normalizeSeatNumbers(dynamicBooking.seatNumbers);

    return [
      {
        block: fallbackBlock || "Entry Pass",
        section: dynamicBooking.section || fallbackBlock || "General Section",
        quantity: fallbackQuantity || 1,
        seats:
          selectedSeats.length || directSeats.length || seatNumbers.length
            ? [...selectedSeats, ...directSeats, ...seatNumbers]
            : [
              `${fallbackBlock || "Entry Pass"} / ${fallbackQuantity || 1} seat${(fallbackQuantity || 1) > 1 ? "s" : ""
              }`,
            ],
      },
    ];
  };

  const getBookingEventDateTime = (
    booking: OfflineBookingRecord | UnifiedBookingRecord,
    eventId: string,
  ) => {
    const dynamicBooking = booking as unknown as DynamicBookingShape;
    const matchedEvent = eventMap.get(eventId);

    return {
      date: dynamicBooking.date || matchedEvent?.date || "Date pending",
      time: dynamicBooking.time || matchedEvent?.time || "Time pending",
    };
  };

  const getScanMode = (
    row: OrganizerBookingRow,
    dateState: BookingDateState,
  ): { mode: BookingScanMode; help: string } => {
    if (row.bookingStatus === "Cancelled" || row.paymentStatus === "Failed") {
      return {
        mode: "Blocked",
        help: "This booking is blocked for scan because it is cancelled or failed.",
      };
    }

    if (row.scanStatus === "Checked In") {
      return {
        mode: "Already Checked In",
        help: "This ticket has already been checked in at the gate.",
      };
    }

    if (dateState === "today") {
      return {
        mode: "Gate Check-in Active",
        help: "Event date is today. Actual QR check-in can be used now.",
      };
    }

    if (dateState === "before") {
      return {
        mode: "Pre-event Ready",
        help: "QR can be verified and prepared before the event. Final gate check-in should happen on event day.",
      };
    }

    if (dateState === "past") {
      return {
        mode: "Closed",
        help: "Event date has passed. Gate check-in should be closed.",
      };
    }

    return {
      mode: "Date Pending",
      help: "Event date is missing. Confirm event schedule before scanning.",
    };
  };

  const offlineIds = new Set(
    offlineBookings.flatMap((booking) => [booking.bookingId, booking.ticketId]),
  );

  const uniqueUnifiedBookings = unifiedBookings.filter(
    (booking) =>
      !offlineIds.has(booking.bookingId) && !offlineIds.has(booking.ticketId),
  );

  const unifiedRows: BookingDashboardRow[] = uniqueUnifiedBookings.map((booking) => {
    const baseRow = unifiedBookingToOrganizerBookingRow(booking, checkIns);
    const dateTime = getBookingEventDateTime(booking, baseRow.eventId);
    const dateInfo = getDateInfo(dateTime.date);
    const scanInfo = getScanMode(baseRow, dateInfo.state);

    return {
      ...baseRow,
      blockGroups: getBookingBlockGroups(booking, baseRow.ticketType, baseRow.quantity),
      eventDate: dateTime.date,
      eventTime: dateTime.time,
      dateState: dateInfo.state,
      dateLabel: dateInfo.label,
      scanMode: scanInfo.mode,
      scanHelp: scanInfo.help,
    };
  });

  const offlineRows: BookingDashboardRow[] = offlineBookings.map((booking) => {
    const baseRow = offlineBookingToOrganizerBookingRow(booking, checkIns);
    const dateTime = getBookingEventDateTime(booking, baseRow.eventId);
    const dateInfo = getDateInfo(dateTime.date);
    const scanInfo = getScanMode(baseRow, dateInfo.state);

    return {
      ...baseRow,
      blockGroups: getBookingBlockGroups(booking, baseRow.ticketType, baseRow.quantity),
      eventDate: dateTime.date,
      eventTime: dateTime.time,
      dateState: dateInfo.state,
      dateLabel: dateInfo.label,
      scanMode: scanInfo.mode,
      scanHelp: scanInfo.help,
    };
  });

  const apiRows: BookingDashboardRow[] = apiBookings.map((booking, index) => {
    const paymentValue = String(booking.paymentStatus ?? "").toLowerCase();
    const bookingValue = String(booking.bookingStatus ?? "").toLowerCase();
    const paymentStatus: OrganizerPaymentStatus =
      paymentValue.includes("refund")
        ? "Refunded"
        : paymentValue.includes("fail")
          ? "Failed"
          : ["paid", "completed", "success", "successful"].some((value) =>
            paymentValue.includes(value),
          )
            ? "Paid"
            : "Pending";
    const bookingStatus: OrganizerBookingStatus =
      bookingValue.includes("check")
        ? "Checked In"
        : bookingValue.includes("refund")
          ? "Refunded"
          : bookingValue.includes("cancel") || bookingValue.includes("fail")
            ? "Cancelled"
            : bookingValue.includes("pending") || paymentStatus === "Pending"
              ? "Pending Payment"
              : "Confirmed";
    const id = String(booking.id ?? booking.bookingNumber ?? `api-${index}`);
    const orderId = String(booking.bookingNumber ?? id);
    const quantity = Math.max(1, Number(booking.quantity) || 1);
    const amount = Number(booking.totalAmount ?? booking.amount ?? 0) || 0;
    const eventId = String(booking.eventId ?? "");
    const eventDate = String(booking.eventStartDate ?? "");
    const dateInfo = getDateInfo(eventDate);
    const baseRow: OrganizerBookingRow = {
      id,
      orderId,
      event: String(booking.eventTitle ?? "Untitled Event"),
      eventId,
      customerRef: String(booking.customerName ?? booking.customerEmail ?? "Customer"),
      ticketType: String(booking.ticketType ?? "General"),
      quantity,
      amount,
      bookingDate: String(booking.createdAt ?? ""),
      paymentStatus,
      bookingStatus,
      scanStatus: bookingStatus === "Checked In" ? "Checked In" : "Not Checked In",
      source: normalizeOfflineSourceForDashboard(
        String(booking.source ?? "").toLowerCase() === "offline" ? "Offline" : "Online",
      ),
      coupon: "No Coupon",
      ticketId: orderId,
      customerPhone: booking.customerPhone,
      paymentMode: "Online",
      balanceAmount: paymentStatus === "Pending" ? amount : 0,
    };
    const scanInfo = getScanMode(baseRow, dateInfo.state);

    return {
      ...baseRow,
      blockGroups: [{
        block: baseRow.ticketType,
        section: baseRow.ticketType,
        quantity,
        seats: [`${baseRow.ticketType} / ${quantity} seat${quantity > 1 ? "s" : ""}`],
      }],
      eventDate: eventDate || "Date pending",
      eventTime: eventDate
        ? new Date(eventDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "Time pending",
      dateState: dateInfo.state,
      dateLabel: dateInfo.label,
      scanMode: scanInfo.mode,
      scanHelp: scanInfo.help,
    };
  });

  const rows = useMemo(() => {
    const result = new Map<string, BookingDashboardRow>();
    [...apiRows, ...unifiedRows, ...offlineRows].forEach((row) => {
      const key = `${row.id}|${row.orderId}`.toLowerCase();
      if (!result.has(key)) result.set(key, row);
    });
    return [...result.values()];
  }, [apiBookingsResponse, unifiedBookings, offlineBookings, checkIns, events]);

  const eventOptions = useOrganizerEventFilterOptions(rows.map((row) => row.event));

  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();

    const blockText = row.blockGroups
      .flatMap((group) => [
        group.block,
        group.section,
        ...group.seats,
        String(group.quantity),
      ])
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !query ||
      row.id.toLowerCase().includes(query) ||
      row.orderId.toLowerCase().includes(query) ||
      (row.ticketId ?? "").toLowerCase().includes(query) ||
      row.event.toLowerCase().includes(query) ||
      row.eventId.toLowerCase().includes(query) ||
      row.customerRef.toLowerCase().includes(query) ||
      row.ticketType.toLowerCase().includes(query) ||
      row.source.toLowerCase().includes(query) ||
      row.paymentStatus.toLowerCase().includes(query) ||
      row.bookingStatus.toLowerCase().includes(query) ||
      row.scanMode.toLowerCase().includes(query) ||
      blockText.includes(query);

    const matchesEvent = eventFilter === "All Events" || row.event === eventFilter;

    const matchesSource =
      sourceFilter === "All Sources" || row.source === sourceFilter;

    const matchesBookingStatus =
      bookingStatusFilter === "All Status" ||
      row.bookingStatus === bookingStatusFilter;

    const matchesPaymentStatus =
      paymentStatusFilter === "All Payments" ||
      row.paymentStatus === paymentStatusFilter ||
      row.paymentMode === paymentStatusFilter;

    const matchesScan =
      scanFilter === "All Scan Modes" ||
      row.scanMode === scanFilter ||
      row.dateLabel === scanFilter;

    return (
      matchesSearch &&
      matchesEvent &&
      matchesSource &&
      matchesBookingStatus &&
      matchesPaymentStatus &&
      matchesScan
    );
  });

  const totalBookings = filteredRows.length;
  const totalTickets = filteredRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalBlocks = filteredRows.reduce(
    (sum, row) => sum + row.blockGroups.length,
    0,
  );
  const checkedInCount = filteredRows.filter(
    (row) => row.scanStatus === "Checked In",
  ).length;
  const preEventReadyCount = filteredRows.filter(
    (row) => row.scanMode === "Pre-event Ready",
  ).length;
  const activeTodayCount = filteredRows.filter(
    (row) => row.scanMode === "Gate Check-in Active",
  ).length;
  const pendingPayments = filteredRows.filter(
    (row) =>
      row.paymentStatus === "Pending" ||
      row.bookingStatus === "Pending Payment" ||
      Number(row.balanceAmount ?? 0) > 0,
  ).length;
  const completedBookings = filteredRows.filter(
    (row) =>
      row.bookingStatus === "Confirmed" ||
      row.bookingStatus === "Checked In",
  ).length;
  const failedBookings = filteredRows.filter(
    (row) =>
      row.paymentStatus === "Failed" ||
      row.bookingStatus === "Cancelled" ||
      row.bookingStatus === "Refunded",
  ).length;
  const totalRevenue = filteredRows.reduce((sum, row) => sum + row.amount, 0);

  const resetFilters = () => {
    setSearch("");
    setEventFilter("All Events");
    setSourceFilter("All Sources");
    setBookingStatusFilter("All Status");
    setPaymentStatusFilter("All Payments");
    setScanFilter("All Scan Modes");
  };

  const chipClass = (
    tone: "success" | "warning" | "danger" | "brand" | "muted",
  ) => {
    if (tone === "success") {
      return "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]";
    }

    if (tone === "warning") {
      return "border-[var(--color-brand-accent)]/30 bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]";
    }

    if (tone === "danger") {
      return "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]";
    }

    if (tone === "brand") {
      return "border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 text-[var(--color-brand-secondary)]";
    }

    return "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)]";
  };

  const chip = (
    label: string,
    tone: "success" | "warning" | "danger" | "brand" | "muted" = "muted",
  ) => (
    <span
      className={`inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.04em] ${chipClass(tone)}`}
    >
      {label}
    </span>
  );

  const getSourceTone = (source: OrganizerBookingRow["source"]) => {
    if (source === "Online" || source === "Website" || source === "App") {
      return "brand" as const;
    }

    if (source === "Offline" || source === "Counter") {
      return "warning" as const;
    }

    if (source === "Reserved") {
      return "success" as const;
    }

    if (source === "Free") {
      return "muted" as const;
    }

    return "muted" as const;
  };

  const getPaymentTone = (status: OrganizerPaymentStatus) => {
    if (status === "Paid" || status === "Complimentary") return "success" as const;
    if (status === "Pending") return "warning" as const;
    if (status === "Failed" || status === "Refunded") return "danger" as const;
    return "muted" as const;
  };

  const getBookingTone = (status: OrganizerBookingStatus) => {
    if (status === "Confirmed" || status === "Checked In") return "success" as const;
    if (status === "Pending Payment" || status === "Refund Requested") return "warning" as const;
    if (status === "Cancelled" || status === "Refunded") return "danger" as const;
    return "muted" as const;
  };

  const getScanTone = (mode: BookingScanMode) => {
    if (mode === "Gate Check-in Active" || mode === "Already Checked In") {
      return "success" as const;
    }

    if (mode === "Pre-event Ready") {
      return "brand" as const;
    }

    if (mode === "Closed" || mode === "Date Pending") {
      return "muted" as const;
    }

    return "danger" as const;
  };

  const createBookingTicketPreview = (row: BookingDashboardRow) => {
    const matchedEvent = eventMap.get(row.eventId);

    const sourceForTicket: "Online" | "Offline" | "Reserved" | "Free" =
      row.source === "Reserved"
        ? "Reserved"
        : row.source === "Free"
          ? "Free"
          : row.source === "Offline" || row.source === "Counter"
            ? "Offline"
            : "Online";

    const ticketTypeForPreview =
      sourceForTicket === "Reserved"
        ? "reserved"
        : sourceForTicket === "Free"
          ? "free"
          : sourceForTicket === "Offline"
            ? "offline"
            : undefined;

    const themeKey =
      sourceForTicket === "Reserved"
        ? "reserved-vip-pass"
        : sourceForTicket === "Offline"
          ? "offline-counter-ticket"
          : "event-ticket";

    const draft = createTicketDesignDraft(themeKey);

    const primaryBlock = row.blockGroups[0];

    const content = createDefaultTicketContent(draft, {
      eventTitle: row.event,
      category: matchedEvent?.category ?? "Event",
      ticketType: ticketTypeForPreview,
      venueName: matchedEvent?.venueName ?? "Venue details",
      city: matchedEvent?.city ?? "City",
      date: formatDisplayDate(row.eventDate),
      time: row.eventTime,
      blockName: primaryBlock?.block ?? row.ticketType,
      seatLabel: primaryBlock?.section ?? row.ticketType,
      amountPaid: row.amount,
      source: sourceForTicket,
      bookingId: row.id,
      ticketId: row.ticketId ?? row.orderId,
      organizerName: "Buizz Organizer",
      customerName: row.customerRef || "Guest",
      quantity: row.quantity,
      paymentMode: row.paymentMode ?? row.paymentStatus,
      seats: row.blockGroups.map((group) => ({
        section: group.section,
        totalSeats: group.quantity,
        seatNumbers: group.seats.join(", "),
        amount: row.amount,
      })),
    });

    return { draft, content };
  };
  const summaryCards = [
    {
      label: "Total Bookings",
      value: totalBookings.toLocaleString("en-IN"),
      detail: "Filtered booking records",
      icon: Ticket,
      tone: "brand" as const,
    },
    {
      label: "Completed",
      value: completedBookings.toLocaleString("en-IN"),
      detail: "Confirmed and checked in",
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Pending",
      value: pendingPayments.toLocaleString("en-IN"),
      detail: "Awaiting payment or confirmation",
      icon: Clock,
      tone: "warning" as const,
    },
    {
      label: "Failed",
      value: failedBookings.toLocaleString("en-IN"),
      detail: "Failed, cancelled or refunded",
      icon: AlertCircle,
      tone: "warning" as const,
    },
    {
      label: "Ticket Qty",
      value: totalTickets.toLocaleString("en-IN"),
      detail: `${totalBlocks} blocks / sections`,
      icon: Users,
      tone: "brand" as const,
    },
    {
      label: "Revenue",
      value: `Rs. ${totalRevenue.toLocaleString("en-IN")}`,
      detail: `${pendingPayments} pending payments`,
      icon: DollarSign,
      tone: "success" as const,
    },
  ];

  return (
    <Panel
      title="Organizer Bookings"
      description="Review online, offline, reserved, and complimentary bookings with block, section, seat, and pre-event QR readiness tracking."
    >
      <div className="grid min-w-0 max-w-full gap-3 overflow-hidden sm:gap-4 lg:gap-5">
        <section className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3 2xl:grid-cols-6 [&::-webkit-scrollbar]:hidden">
          {summaryCards.map(({ label, value, detail, icon: Icon, tone }) => (
            <article
              key={label}
              className="min-w-[158px] rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:min-w-0 sm:p-4"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-[var(--app-muted)] sm:text-xs">
                    {label}
                  </p>

                  <p className="mt-2 truncate text-lg font-black text-[var(--app-foreground)] sm:text-2xl">
                    {value}
                  </p>

                  <p className="mt-1 truncate text-[10px] font-semibold text-[var(--app-muted)] sm:text-xs">
                    {detail}
                  </p>
                </div>

                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-xl sm:size-10 ${tone === "success"
                    ? "bg-[#22C55E]/10 text-[#22C55E]"
                    : tone === "warning"
                      ? "bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]"
                      : "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                    }`}
                >
                  <Icon className="size-4" />
                </span>
              </div>
            </article>
          ))}
        </section>
        <section className="grid min-w-0 gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:gap-3 sm:p-3 2xl:p-4">
          <div className="grid gap-2 2xl:hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search booking, event, seat..."
                className="min-h-10 min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] sm:min-h-11 sm:px-4 sm:text-sm"
              />

              <button
                type="button"
                onClick={resetFilters}
                className="grid min-h-10 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)] sm:min-h-11 sm:flex sm:items-center sm:justify-center sm:gap-2 sm:px-3 sm:text-xs sm:font-black sm:text-[var(--app-foreground)]"
                title="Reset filters"
              >
                <RefreshCw className="size-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            <details className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 text-sm font-black text-[var(--app-foreground)] sm:min-h-11 sm:px-4">
                Filters
                <span className="rounded-full bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                  Open
                </span>
              </summary>

              <div className="grid gap-2 border-t border-[var(--app-border)] p-2 sm:p-3">
                <select
                  value={eventFilter}
                  onChange={(event) => setEventFilter(event.target.value)}
                  className="min-h-9 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none sm:min-h-10"
                >
                  {eventOptions.map((event) => (
                    <option key={event}>{event}</option>
                  ))}
                </select>

                <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
                  <select
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                    className="min-h-9 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none sm:min-h-10"
                  >
                    <option>All Sources</option>
                    <option>Online</option>
                    <option>Offline</option>
                    <option>Reserved</option>
                    <option>Free</option>
                  </select>

                  <select
                    value={bookingStatusFilter}
                    onChange={(event) => setBookingStatusFilter(event.target.value)}
                    className="min-h-9 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none sm:min-h-10"
                  >
                    <option>All Status</option>
                    <option>Confirmed</option>
                    <option>Pending Payment</option>
                    <option>Checked In</option>
                    <option>Cancelled</option>
                    <option>Refunded</option>
                  </select>

                  <select
                    value={paymentStatusFilter}
                    onChange={(event) => setPaymentStatusFilter(event.target.value)}
                    className="min-h-9 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none sm:min-h-10"
                  >
                    <option>All Payments</option>
                    <option>Paid</option>
                    <option>Pending</option>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Free Registration</option>
                  </select>

                  <select
                    value={scanFilter}
                    onChange={(event) => setScanFilter(event.target.value)}
                    className="min-h-9 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none sm:min-h-10"
                  >
                    <option>All Scan Modes</option>
                    <option>Pre-event Ready</option>
                    <option>Gate Check-in Active</option>
                    <option>Already Checked In</option>
                    <option>Closed</option>
                    <option>Blocked</option>
                  </select>
                </div>
              </div>
            </details>
          </div>

          <div className="hidden gap-2 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_170px_145px_160px_160px_170px_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search booking, event, block, section, seat..."
              className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
            />

            <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none">
              {eventOptions.map((event) => (
                <option key={event}>{event}</option>
              ))}
            </select>

            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none">
              <option>All Sources</option>
              <option>Online</option>
              <option>Offline</option>
              <option>Reserved</option>
              <option>Free</option>
            </select>

            <select value={bookingStatusFilter} onChange={(event) => setBookingStatusFilter(event.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none">
              <option>All Status</option>
              <option>Confirmed</option>
              <option>Pending Payment</option>
              <option>Checked In</option>
              <option>Cancelled</option>
              <option>Refunded</option>
            </select>

            <select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none">
              <option>All Payments</option>
              <option>Paid</option>
              <option>Pending</option>
              <option>Cash</option>
              <option>UPI</option>
              <option>Free Registration</option>
            </select>

            <select value={scanFilter} onChange={(event) => setScanFilter(event.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none">
              <option>All Scan Modes</option>
              <option>Pre-event Ready</option>
              <option>Gate Check-in Active</option>
              <option>Already Checked In</option>
              <option>Closed</option>
              <option>Blocked</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black text-[var(--app-foreground)]"
            >
              Reset
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/5 p-2.5 sm:p-3">
            <div className="flex items-start gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)] text-white sm:size-8">
                <AlertCircle className="size-3.5 sm:size-4" />
              </span>

              <div className="min-w-0">
                <p className="text-[11px] font-black text-[var(--app-foreground)] sm:text-xs">
                  Pre-event QR readiness
                </p>
                <p className="mt-0.5 text-[10px] font-semibold leading-4 text-[var(--app-muted)] sm:text-xs sm:leading-5">
                  Prepare entry list before event day. Use QR check-in only on event day.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-2 xl:grid-cols-2 2xl:hidden">
          {filteredRows.map((row, index) => {
            const firstGroup = row.blockGroups[0];

            return (
              <article
                key={`mobile-booking-${row.source}-${row.id}-${row.ticketId ?? row.orderId ?? "no-ticket"}-${index}`}
                className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-3"
              >
                <div className="grid min-w-0 grid-cols-[1fr_auto] gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 break-all text-[10px] font-black uppercase leading-4 tracking-[0.05em] text-[var(--color-brand-primary)]">
                      {row.id}
                    </p>

                    <h3 className="mt-0.5 line-clamp-1 text-sm font-black leading-5 text-[var(--app-foreground)]">
                      {row.event}
                    </h3>

                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)] sm:text-[11px]">
                      {formatDisplayDate(row.eventDate)} • {row.eventTime}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-[var(--app-subtle)] px-2 py-0.5 text-[10px] font-black text-[var(--app-muted)]">
                      Qty {row.quantity}
                    </span>
                    <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-2 py-0.5 text-[10px] font-black text-[var(--color-brand-primary)]">
                      Rs. {row.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
                  <div className="min-w-0 rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[9px] font-black uppercase text-[var(--app-muted)] sm:text-[10px]">
                      Block / Seat
                    </p>
                    <p className="mt-0.5 truncate text-xs font-black text-[var(--app-foreground)]">
                      {firstGroup?.block ?? row.ticketType}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)]">
                      {firstGroup?.section ?? "General"} • {firstGroup?.seats?.[0] ?? "Seat pending"}
                    </p>
                  </div>

                  <div className="min-w-0 rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[9px] font-black uppercase text-[var(--app-muted)] sm:text-[10px]">
                      Customer
                    </p>
                    <p className="mt-0.5 truncate text-xs font-black text-[var(--app-foreground)]">
                      {row.customerRef || "Hidden"}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)]">
                      {row.ticketId ?? row.orderId}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[row.source, row.paymentStatus, row.scanStatus, row.scanMode].map((label) => (
                    <span
                      key={`${row.id}-${label}`}
                      className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 py-0.5 text-[10px] font-black text-[var(--app-muted)]"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/organizer/qr-check-in")}
                    className="min-h-9 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white"
                  >
                    QR
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedEntryList(row)}
                    className="min-h-9 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)]"
                  >
                    Details
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid min-w-0 gap-2 xl:grid-cols-2 2xl:hidden">
          {filteredRows.map((row, index) => {
            const firstGroup = row.blockGroups[0];

            return (
              <article
                key={`mobile-booking-${row.source}-${row.id}-${row.ticketId ?? row.orderId ?? "no-ticket"}-${index}`}
                className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
              >
                <div className="grid min-w-0 grid-cols-[1fr_auto] gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-all text-[10px] font-black uppercase leading-4 tracking-[0.06em] text-[var(--color-brand-primary)]">
                      {row.id}
                    </p>

                    <h3 className="mt-1 line-clamp-1 text-sm font-black leading-5 text-[var(--app-foreground)]">
                      {row.event}
                    </h3>

                    <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--app-muted)]">
                      {formatDisplayDate(row.eventDate)} • {row.eventTime}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-[var(--app-subtle)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                      Qty {row.quantity}
                    </span>
                    <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-2 py-1 text-[10px] font-black text-[var(--color-brand-primary)]">
                      Rs. {row.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="min-w-0 rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">Block / Seat</p>
                    <p className="mt-1 truncate text-xs font-black text-[var(--app-foreground)]">
                      {firstGroup?.block ?? row.ticketType}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)]">
                      {firstGroup?.section ?? "General"} • {firstGroup?.seats?.[0] ?? "Seat pending"}
                    </p>
                  </div>

                  <div className="min-w-0 rounded-xl bg-[var(--app-subtle)] p-2">
                    <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">Customer</p>
                    <p className="mt-1 truncate text-xs font-black text-[var(--app-foreground)]">
                      {row.customerRef || "Hidden"}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--app-muted)]">
                      {row.ticketId ?? row.orderId}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                    {row.source}
                  </span>
                  <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                    {row.paymentStatus}
                  </span>
                  <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                    {row.scanStatus}
                  </span>
                  <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                    {row.scanMode}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/organizer/qr-check-in")}
                    className="min-h-9 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white"
                  >
                    QR Page
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedEntryList(row)}
                    className="min-h-9 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)]"
                  >
                    Details
                  </button>
                </div>
              </article>
            );
          })}
        </section>
        <section className="hidden min-w-0 overflow-x-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_14px_40px_rgba(15,23,42,0.06)] 2xl:block">
          <table className="w-full min-w-[1180px] text-left text-sm text-[var(--app-foreground)]">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase tracking-[0.04em] text-[var(--app-muted)]">
                <th className="px-4 py-4">Booking</th>
                <th className="px-4 py-4">Event / Date</th>
                <th className="px-4 py-4">Customer Ref</th>
                <th className="px-4 py-4">Blocks / Sections / Seats</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Payment</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Scan</th>
                <th className="px-4 py-4 text-right">Amount</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row, index) => (
                <tr
                  key={`organizer-booking-${row.source}-${row.id}-${row.ticketId ?? row.orderId ?? "no-ticket"}-${index}`}
                  className="border-b border-[var(--app-border)] transition hover:bg-[var(--app-subtle)] last:border-0"
                >
                  <td className="px-4 py-4 align-top">
                    <p className="max-w-[170px] break-all font-black text-[var(--app-foreground)]">
                      {row.id}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {row.ticketId ?? row.orderId}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="max-w-[230px] font-black text-[var(--app-foreground)]">
                      {row.event}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {formatDisplayDate(row.eventDate)} • {row.eventTime}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold text-[var(--app-foreground)]">
                      {row.customerRef || "Hidden"}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="grid max-w-[280px] gap-2">
                      {row.blockGroups.map((group, groupIndex) => (
                        <div key={`${row.id}-${group.block}-${groupIndex}`} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-black text-[var(--app-foreground)]">
                              {group.block}
                            </p>
                            <span className="text-[10px] font-black text-[var(--color-brand-primary)]">
                              Qty {group.quantity}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[10px] font-semibold text-[var(--app-muted)]">
                            {group.section} • {group.seats.slice(0, 2).join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">{chip(row.source, getSourceTone(row.source))}</td>
                  <td className="px-4 py-4 align-top">{chip(row.paymentStatus, getPaymentTone(row.paymentStatus))}</td>

                  <td className="px-4 py-4 align-top">
                    {chip(row.bookingStatus, getBookingTone(row.bookingStatus))}
                  </td>

                  <td className="px-4 py-4 align-top">
                    {chip(row.scanMode, getScanTone(row.scanMode))}
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {row.dateLabel}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-right align-top">
                    <p className="font-black text-[var(--app-foreground)]">
                      Rs. {row.amount.toLocaleString("en-IN")}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => router.push("/organizer/qr-check-in")}
                        className="rounded-xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white"
                      >
                        QR
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedEntryList(row)}
                        className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {!filteredRows.length ? (
          <section className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center">
            <Ticket className="mx-auto size-8 text-[var(--color-brand-primary)]" />
            <h3 className="mt-3 text-lg font-black text-[var(--app-foreground)]">
              No bookings found
            </h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
              Try changing filters or search another booking.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 min-h-10 rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white"
            >
              Clear Filters
            </button>
          </section>
        ) : null}

        <section className="rounded-2xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-3 sm:p-5">
          <div className="flex items-start gap-2 sm:gap-3">
            <ShieldCheck className="mt-1 size-4 shrink-0 text-[var(--color-brand-secondary)] sm:size-5" />
            <div className="min-w-0">
              <h3 className="text-sm font-black text-[var(--color-brand-secondary)] sm:text-lg">
                Booking scan rule
              </h3>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
                Before event date, prepare entry list. On event day, use QR Check-in for actual gate entry.
              </p>
            </div>
          </div>
        </section>
      </div>
      {
        selectedEntryList ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {chip(selectedEntryList.scanMode, getScanTone(selectedEntryList.scanMode))}
                    {chip(
                      selectedEntryList.dateLabel,
                      selectedEntryList.dateState === "today"
                        ? "success"
                        : selectedEntryList.dateState === "before"
                          ? "brand"
                          : "muted",
                    )}
                  </div>

                  <h2 className="mt-3 text-2xl font-black text-[var(--app-foreground)]">
                    Entry List
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
                    {selectedEntryList.event} • {selectedEntryList.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEntryList(null)}
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--app-border)]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="grid gap-4">
                  <section className="grid min-w-0 gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-4">
                    <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search booking, event, block, section, seat..."
                        className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
                      />

                      <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)]"
                        >
                          <RefreshCw className="size-4" />
                          Reset
                        </button>

                        <button
                          type="button"
                          onClick={() => router.push("/organizer/qr-check-in")}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white"
                        >
                          <QrCode className="size-4" />
                          QR
                        </button>
                      </div>
                    </div>

                    <details className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] xl:hidden">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-black text-[var(--app-foreground)]">
                        More Filters
                        <span className="rounded-full bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">
                          Tap
                        </span>
                      </summary>

                      <div className="grid gap-2 border-t border-[var(--app-border)] p-3">
                        <select
                          value={eventFilter}
                          onChange={(event) => setEventFilter(event.target.value)}
                          className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none"
                        >
                          {eventOptions.map((event) => (
                            <option key={event}>{event}</option>
                          ))}
                        </select>

                        <select
                          value={sourceFilter}
                          onChange={(event) => setSourceFilter(event.target.value)}
                          className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none"
                        >
                          <option>All Sources</option>
                          <option>Online</option>
                          <option>Offline</option>
                          <option>Reserved</option>
                          <option>Free</option>
                        </select>

                        <select
                          value={bookingStatusFilter}
                          onChange={(event) => setBookingStatusFilter(event.target.value)}
                          className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none"
                        >
                          <option>All Status</option>
                          <option>Confirmed</option>
                          <option>Pending Payment</option>
                          <option>Checked In</option>
                          <option>Cancelled</option>
                          <option>Refunded</option>
                        </select>

                        <select
                          value={paymentStatusFilter}
                          onChange={(event) => setPaymentStatusFilter(event.target.value)}
                          className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none"
                        >
                          <option>All Payments</option>
                          <option>Paid</option>
                          <option>Pending</option>
                          <option>Cash</option>
                          <option>UPI</option>
                          <option>Free Registration</option>
                        </select>

                        <select
                          value={scanFilter}
                          onChange={(event) => setScanFilter(event.target.value)}
                          className="min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none"
                        >
                          <option>All Scan Modes</option>
                          <option>Pre-event Ready</option>
                          <option>Gate Check-in Active</option>
                          <option>Already Checked In</option>
                          <option>Closed</option>
                          <option>Blocked</option>
                        </select>
                      </div>
                    </details>

                    <div className="hidden min-w-0 gap-2 xl:grid xl:grid-cols-5">
                      <select
                        value={eventFilter}
                        onChange={(event) => setEventFilter(event.target.value)}
                        className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none"
                      >
                        {eventOptions.map((event) => (
                          <option key={event}>{event}</option>
                        ))}
                      </select>

                      <select
                        value={sourceFilter}
                        onChange={(event) => setSourceFilter(event.target.value)}
                        className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none"
                      >
                        <option>All Sources</option>
                        <option>Online</option>
                        <option>Website</option>
                        <option>App</option>
                        <option>Offline</option>
                        <option>Counter</option>
                        <option>Reserved</option>
                        <option>Free</option>
                      </select>

                      <select
                        value={bookingStatusFilter}
                        onChange={(event) => setBookingStatusFilter(event.target.value)}
                        className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none"
                      >
                        <option>All Status</option>
                        <option>Confirmed</option>
                        <option>Pending Payment</option>
                        <option>Checked In</option>
                        <option>Cancelled</option>
                        <option>Refund Requested</option>
                        <option>Refunded</option>
                      </select>

                      <select
                        value={paymentStatusFilter}
                        onChange={(event) => setPaymentStatusFilter(event.target.value)}
                        className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none"
                      >
                        <option>All Payments</option>
                        <option>Paid</option>
                        <option>Pending</option>
                        <option>Failed</option>
                        <option>Refunded</option>
                        <option>Complimentary</option>
                        <option>Cash</option>
                        <option>UPI</option>
                        <option>Razorpay</option>
                        <option>Other</option>
                        <option>Free Registration</option>
                      </select>

                      <select
                        value={scanFilter}
                        onChange={(event) => setScanFilter(event.target.value)}
                        className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none"
                      >
                        <option>All Scan Modes</option>
                        <option>Pre-event Ready</option>
                        <option>Gate Check-in Active</option>
                        <option>Already Checked In</option>
                        <option>Before Event Date</option>
                        <option>Event Day</option>
                        <option>Event Passed</option>
                        <option>Closed</option>
                        <option>Blocked</option>
                        <option>Date Pending</option>
                      </select>
                    </div>

                    <div className="rounded-xl border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/5 p-3">
                      <div className="flex items-start gap-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)] text-white">
                          <AlertCircle className="size-4" />
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-black text-[var(--app-foreground)]">
                            Pre-event QR readiness
                          </p>
                          <p className="mt-1 text-[11px] font-semibold leading-5 text-[var(--app-muted)] sm:text-xs">
                            Prepare entry list before event day. Final QR check-in is for event day.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:p-4">
                    <h3 className="text-sm font-black uppercase text-[var(--app-muted)]">
                      Blocks / Sections / Seats
                    </h3>

                    <div className="mt-4 grid gap-3">
                      {selectedEntryList.blockGroups.map((group, index) => (
                        <article
                          key={`entry-list-${selectedEntryList.id}-${group.block}-${index}`}
                          className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-black text-[var(--app-foreground)]">
                                {group.block}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
                                {group.section}
                              </p>
                            </div>

                            <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-black text-[var(--color-brand-primary)]">
                              Qty {group.quantity}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {group.seats.map((seat, seatIndex) => (
                              <span
                                key={`${selectedEntryList.id}-${group.block}-${seat}-${seatIndex}`}
                                className="rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1 text-xs font-black text-[var(--app-foreground)]"
                              >
                                {seat}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:p-4">
                    <h3 className="text-sm font-black uppercase text-[var(--app-muted)]">
                      Scan Rule
                    </h3>

                    <p className="mt-3 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                      {selectedEntryList.scanHelp}
                    </p>
                  </section>
                </div>

                <aside className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                        Real Buizz Ticket
                      </p>
                      <h3 className="mt-2 text-xl font-black text-[var(--app-foreground)]">
                        Ticket Preview
                      </h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                        This preview uses the same Buizz ticket design system used for issued tickets.
                      </p>
                    </div>

                    <Ticket className="size-6 shrink-0 text-[var(--color-brand-primary)]" />
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
                    {(() => {
                      const preview = createBookingTicketPreview(selectedEntryList!);

                      return (
                        <BuizzTicketPreview
                          design={preview.draft}
                          data={preview.content}
                          mode="offline-issued"
                        />
                      );
                    })()}
                  </div>

                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/organizer/qr-check-in")}
                      className="min-h-11 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white"
                    >
                      Open QR Check-in
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black text-[var(--app-foreground)]"
                    >
                      Print Ticket
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedEntryList(null)}
                      className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black text-[var(--app-foreground)]"
                    >
                      Close
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        ) : null
      }
    </Panel >
  );
}

type OrganizerVenueEntryAttemptResult =
  | "Valid Ticket"
  | "Checked In"
  | "Already Used"
  | "Invalid Ticket"
  | "Blocked Ticket"
  | "Rejected Entry";

type OrganizerVenueEntryAttempt = {
  id: string;
  ticketId: string;
  bookingId: string;
  eventId: string;
  event: string;
  attendeeName: string;
  contactRef?: string;
  ticketType: string;
  seat: string;
  gate: string;
  source?: "Online" | "Offline" | "Reserved" | "Free";
  paymentMode?: string;
  result: OrganizerVenueEntryAttemptResult;
  message: string;
  attemptedAt: string;
  verifiedBy: string;
  rawInput?: string;
};

const organizerVenueEntryAttemptsKey = "buizz-venue-entry-attempts";

function formatVenueAttemptTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Now";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readOrganizerVenueEntryAttempts(): OrganizerVenueEntryAttempt[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(organizerVenueEntryAttemptsKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): OrganizerVenueEntryAttempt | null => {
        if (!item || typeof item !== "object") return null;
        const record = item as Partial<OrganizerVenueEntryAttempt>;
        const result = String(record.result ?? "Invalid Ticket") as OrganizerVenueEntryAttemptResult;

        return {
          id: String(record.id ?? `TRY-${Date.now()}`),
          ticketId: String(record.ticketId ?? ""),
          bookingId: String(record.bookingId ?? ""),
          eventId: String(record.eventId ?? ""),
          event: String(record.event ?? "Unknown / invalid ticket"),
          attendeeName: String(record.attendeeName ?? "Unknown visitor"),
          contactRef: String(record.contactRef ?? "Not available"),
          ticketType: String(record.ticketType ?? "Unknown"),
          seat: String(record.seat ?? "Not available"),
          gate: String(record.gate ?? "Gate attempt"),
          source:
            record.source === "Offline" || record.source === "Reserved" || record.source === "Free"
              ? record.source
              : "Online",
          paymentMode: record.paymentMode ? String(record.paymentMode) : undefined,
          result:
            result === "Valid Ticket" ||
              result === "Checked In" ||
              result === "Already Used" ||
              result === "Blocked Ticket" ||
              result === "Rejected Entry"
              ? result
              : "Invalid Ticket",
          message: String(record.message ?? "Venue entry attempt recorded."),
          attemptedAt: String(record.attemptedAt ?? new Date().toISOString()),
          verifiedBy: String(record.verifiedBy ?? "Organizer Scanner"),
          rawInput: record.rawInput ? String(record.rawInput) : undefined,
        } satisfies OrganizerVenueEntryAttempt;
      })
      .filter((item): item is OrganizerVenueEntryAttempt => Boolean(item));
  } catch {
    return [];
  }
}

function saveOrganizerVenueEntryAttempts(records: OrganizerVenueEntryAttempt[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(organizerVenueEntryAttemptsKey, JSON.stringify(records.slice(0, 250)));
}

function appendOrganizerVenueEntryAttempt(record: OrganizerVenueEntryAttempt) {
  const existing = readOrganizerVenueEntryAttempts();
  saveOrganizerVenueEntryAttempts([record, ...existing].slice(0, 250));
}

function createVenueEntryAttemptFromRow(
  row: ScannerTicketRow,
  result: OrganizerVenueEntryAttemptResult,
  message: string,
  rawInput?: string,
): OrganizerVenueEntryAttempt {
  return {
    id: `VENUE-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    ticketId: row.ticketId,
    bookingId: row.bookingId,
    eventId: row.eventId,
    event: row.event,
    attendeeName: row.attendeeName,
    ticketType: row.ticketType,
    seat: row.seat,
    gate: row.gate,
    source: row.source ?? "Online",
    paymentMode: row.paymentMode,
    result,
    message,
    attemptedAt: new Date().toISOString(),
    verifiedBy: "Organizer Scanner",
    rawInput,
  };
}

function createInvalidVenueEntryAttempt(rawInput: string, message: string): OrganizerVenueEntryAttempt {
  return {
    id: `VENUE-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    ticketId: "Not matched",
    bookingId: rawInput || "Not provided",
    eventId: "Not matched",
    event: "Unknown / invalid ticket",
    attendeeName: "Unknown visitor",
    contactRef: "Not available",
    ticketType: "Invalid ticket",
    seat: "Not available",
    gate: "Gate attempt",
    source: "Online",
    result: "Invalid Ticket",
    message,
    attemptedAt: new Date().toISOString(),
    verifiedBy: "Organizer Scanner",
    rawInput,
  };
}

function parseScannerInputPayload(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return { rawValue: "" };

  try {
    const parsed = JSON.parse(trimmed) as {
      ticketId?: unknown;
      bookingId?: unknown;
      eventId?: unknown;
      id?: unknown;
    };

    return {
      rawValue: trimmed,
      ticketId: parsed.ticketId ? String(parsed.ticketId) : undefined,
      bookingId: parsed.bookingId ? String(parsed.bookingId) : undefined,
      eventId: parsed.eventId ? String(parsed.eventId) : undefined,
      id: parsed.id ? String(parsed.id) : undefined,
    };
  } catch {
    return { rawValue: trimmed };
  }
}

function TicketScannerView() {
  const offlineBookings = useOrganizerOfflineBookings();
  const unifiedBookings = useOrganizerUnifiedBookings();
  const { checkIns, save } = useOrganizerOfflineCheckIns();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [query, setQuery] = useState("");
  const [bookingLookup, setBookingLookup] = useState("");
  const [eventFilter, setEventFilter] = useState("All Events");
  const [gateFilter, setGateFilter] = useState("All Gates");
  const [entryFilter, setEntryFilter] = useState<"All Entries" | ScannerCheckInStatus>("All Entries");
  const [selectedRow, setSelectedRow] = useState<ScannerTicketRow | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraScanning, setCameraScanning] = useState(false);

  const rows = useMemo(
    () => [
      ...unifiedBookings.map((booking) => unifiedBookingToScannerRow(booking, checkIns)),
      ...offlineBookings.map((booking) => offlineBookingToScannerRow(booking, checkIns)),
    ],
    [checkIns, offlineBookings, unifiedBookings],
  );

  const eventOptions = useOrganizerEventFilterOptions(rows.map((row) => row.event));

  const gateOptions = [
    "All Gates",
    ...Array.from(new Set(rows.map((row) => row.gate).filter(Boolean))),
  ];

  const filteredRows = rows.filter((row) => {
    const value = query.trim().toLowerCase();

    const matchesSearch =
      !value ||
      row.ticketId.toLowerCase().includes(value) ||
      row.bookingId.toLowerCase().includes(value) ||
      row.attendeeName.toLowerCase().includes(value) ||
      row.event.toLowerCase().includes(value) ||
      row.ticketType.toLowerCase().includes(value) ||
      row.seat.toLowerCase().includes(value) ||
      row.gate.toLowerCase().includes(value);

    const matchesEvent = eventFilter === "All Events" || row.event === eventFilter;
    const matchesGate = gateFilter === "All Gates" || row.gate === gateFilter;
    const matchesEntry = entryFilter === "All Entries" || row.checkInStatus === entryFilter;

    return matchesSearch && matchesEvent && matchesGate && matchesEntry;
  });

  const totalTickets = filteredRows.length;
  const checkedInCount = filteredRows.filter((row) => row.checkInStatus === "Checked In").length;
  const pendingCount = filteredRows.filter((row) => row.checkInStatus === "Not Checked In").length;
  const blockedCount = filteredRows.filter(
    (row) => row.ticketStatus === "Cancelled" || row.ticketStatus === "Refunded" || row.checkInStatus === "Rejected",
  ).length;

  const findMatchingTicket = (rawValue: string) => {
    const payload = parseScannerInputPayload(rawValue);
    const lookupValues = [payload.bookingId, payload.ticketId, payload.eventId, payload.id, payload.rawValue]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);

    return rows.find((row) => {
      const rowValues = [row.bookingId, row.ticketId, row.eventId, row.id]
        .map((value) => String(value ?? "").trim().toLowerCase())
        .filter(Boolean);

      return lookupValues.some((value) => rowValues.includes(value));
    }) ?? null;
  };

  const recordAttempt = (
    row: ScannerTicketRow | null,
    result: OrganizerVenueEntryAttemptResult,
    message: string,
    rawInput?: string,
  ) => {
    appendOrganizerVenueEntryAttempt(
      row
        ? createVenueEntryAttemptFromRow(row, result, message, rawInput)
        : createInvalidVenueEntryAttempt(rawInput ?? "", message),
    );
  };

  const scanCurrentValue = (rawValue: string, mode: "qr" | "booking" | "camera" = "qr") => {
    const value = rawValue.trim();

    if (!value) {
      setSelectedRow(null);
      setScanMessage("Enter booking ID, ticket ID, or scan a QR first.");
      return;
    }

    const found = findMatchingTicket(value);

    if (!found) {
      const message = `Invalid ticket. No booking found for ${mode === "camera" ? "camera QR" : "this booking/ticket ID"}.`;
      setSelectedRow(null);
      setScanMessage(message);
      recordAttempt(null, "Invalid Ticket", message, value);
      return;
    }

    setSelectedRow(found);

    if (found.checkInStatus === "Checked In" || found.ticketStatus === "Used") {
      const message = "Already used ticket. Entry should not be allowed again.";
      setScanMessage(message);
      recordAttempt(found, "Already Used", message, value);
      return;
    }

    if (found.ticketStatus === "Cancelled" || found.ticketStatus === "Refunded" || found.checkInStatus === "Rejected") {
      const message = "Blocked ticket. This ticket is cancelled, refunded, or rejected.";
      setScanMessage(message);
      recordAttempt(found, "Blocked Ticket", message, value);
      return;
    }

    const message = "Valid ticket found. Review booking details and mark check-in.";
    setScanMessage(message);
    recordAttempt(found, "Valid Ticket", message, value);
  };

  const resetScannerFilters = () => {
    setQuery("");
    setBookingLookup("");
    setEventFilter("All Events");
    setGateFilter("All Gates");
    setEntryFilter("All Entries");
    setSelectedRow(null);
    setScanMessage("");
    setCameraError("");
  };

  const stopCamera = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setCameraScanning(false);
  };

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readCameraFrame = async () => {
    setCameraError("");
    setCameraScanning(true);

    const video = videoRef.current;
    if (!video) return;

    type BarcodeDetectorShape = new (options?: { formats?: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
    };

    const BarcodeDetectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorShape }).BarcodeDetector;

    if (!BarcodeDetectorConstructor) {
      setCameraError("Camera is open, but this browser cannot read QR automatically. Paste booking ID/ticket ID below.");
      setCameraScanning(false);
      return;
    }

    try {
      const detector = new BarcodeDetectorConstructor({ formats: ["qr_code"] });
      const detectedCodes = await detector.detect(video);
      const rawValue = detectedCodes[0]?.rawValue?.trim();

      if (!rawValue) {
        setCameraError("No QR detected yet. Keep the QR inside the scanner box.");
        setCameraScanning(false);
        return;
      }

      setQuery(rawValue);
      stopCamera();
      scanCurrentValue(rawValue, "camera");
    } catch {
      setCameraError("Could not read camera QR. Paste the booking ID or ticket ID manually.");
      setCameraScanning(false);
    }
  };

  const startCamera = async () => {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not available in this browser. Use booking ID / ticket ID check.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setCameraScanning(false);

      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      scanTimerRef.current = setInterval(() => {
        void readCameraFrame();
      }, 1400);
    } catch {
      setCameraError("Camera permission denied or camera not found. Use booking ID / ticket ID check.");
      setCameraActive(false);
      setCameraScanning(false);
    }
  };

  const markCheckedIn = (row: ScannerTicketRow) => {
    if (row.ticketStatus !== "Valid") {
      const message = "This ticket is not valid for entry.";
      setSelectedRow(row);
      setScanMessage(message);
      recordAttempt(row, "Blocked Ticket", message, row.bookingId);
      return;
    }

    if (row.checkInStatus === "Checked In") {
      const message = "This ticket is already checked in.";
      setSelectedRow(row);
      setScanMessage(message);
      recordAttempt(row, "Already Used", message, row.bookingId);
      return;
    }

    const checkedInAt = new Date().toISOString();
    const time = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    save({
      ticketId: row.ticketId,
      bookingId: row.bookingId,
      checkedInAt,
      verifiedBy: "Organizer Gate Staff",
      source: normalizeOfflineSourceForCheckIn(row.source ?? "Online"),
    });

    if (row.id.startsWith("UNI-SCAN-")) {
      saveUnifiedCheckIn({
        id: `CHK-${row.ticketId}`,
        ticketId: row.ticketId,
        bookingId: row.bookingId,
        eventId: row.eventId,
        customerName: row.attendeeName,
        source: normalizeOfflineSourceForCheckIn(row.source ?? "Online"),
        selectedSeats: row.selectedSeats,
        gate: row.gate,
        status: "checked_in",
        checkedInAt,
        checkedInBy: "Organizer Gate Staff",
      });
    }

    const updatedRow: ScannerTicketRow = {
      ...row,
      ticketStatus: "Used",
      checkInStatus: "Checked In",
      checkInTime: time,
      verifiedBy: "Organizer Gate Staff",
    };

    setSelectedRow(updatedRow);

    const message = "Check-in successful. This ticket is now used and cannot be used again.";
    setScanMessage(message);
    recordAttempt(updatedRow, "Checked In", message, row.bookingId);
  };

  const rejectEntry = (row: ScannerTicketRow) => {
    const updatedRow: ScannerTicketRow = {
      ...row,
      checkInStatus: "Rejected",
      ticketStatus: row.ticketStatus === "Valid" ? "Cancelled" : row.ticketStatus,
      verifiedBy: "Organizer Scanner",
      checkInTime: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setSelectedRow(updatedRow);
    const message = "Entry rejected by organizer scanner.";
    setScanMessage(message);
    recordAttempt(updatedRow, "Rejected Entry", message, row.bookingId);
  };

  const statCards = [
    {
      label: "Scan Records",
      value: totalTickets.toLocaleString("en-IN"),
      detail: "Filtered booking records",
      icon: Ticket,
    },
    {
      label: "Pending Entry",
      value: pendingCount.toLocaleString("en-IN"),
      detail: "Can be checked in",
      icon: ShieldCheck,
    },
    {
      label: "Checked In",
      value: checkedInCount.toLocaleString("en-IN"),
      detail: "Already used tickets",
      icon: CheckCircle2,
    },
    {
      label: "Blocked",
      value: blockedCount.toLocaleString("en-IN"),
      detail: "Cancelled / invalid",
      icon: AlertCircle,
    },
  ];

  return (
    <Panel
      title="QR Check-in"
      description="Scan ticket QR with camera or check by booking ID/ticket ID before allowing venue entry."
    >
      <div className="grid w-full min-w-0 gap-4 overflow-x-hidden sm:gap-5">
        <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          {statCards.map(({ label, value, detail, icon: Icon }) => (
            <article
              key={label}
              className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:rounded-3xl sm:p-4"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--app-muted)] sm:text-xs">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black leading-none text-[var(--app-foreground)] sm:text-3xl">
                    {value}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-[var(--app-muted)] sm:text-xs">
                    {detail}
                  </p>
                </div>

                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] sm:size-11">
                  <Icon className="size-4 sm:size-5" />
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] xl:grid-cols-[0.9fr_1.1fr] xl:p-4">
          <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--color-brand-ink)] p-3 text-white sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                  Camera scanner
                </p>
                <h2 className="mt-1 text-lg font-black sm:text-xl">Scan QR at venue gate</h2>
              </div>

              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)] text-white">
                <QrCode className="size-5" />
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="aspect-[4/3] w-full bg-black object-cover"
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center p-5 text-center">
                  <div>
                    <QrCode className="mx-auto size-16 text-white/75 sm:size-20" />
                    <p className="mt-4 text-base font-black">Camera scanner ready</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-white/55 sm:text-sm">
                      Start camera and place the ticket QR inside the frame. If camera QR is not supported, use booking ID below.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {cameraError ? (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-xs font-bold leading-5 text-white/80">
                {cameraError}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white sm:min-h-11 sm:text-sm"
              >
                {cameraActive ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
                {cameraActive ? "Stop Camera" : "Start Camera"}
              </button>

              <button
                type="button"
                disabled={!cameraActive || cameraScanning}
                onClick={() => void readCameraFrame()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:text-sm"
              >
                <QrCode className="size-4" />
                Read QR
              </button>
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="grid gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                Booking ID / Ticket ID check
              </p>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={bookingLookup}
                  onChange={(event) => setBookingLookup(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") scanCurrentValue(bookingLookup, "booking");
                  }}
                  placeholder="Enter booking ID or ticket ID..."
                  className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
                />

                <button
                  type="button"
                  onClick={() => scanCurrentValue(bookingLookup, "booking")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white"
                >
                  <ShieldCheck className="size-4" />
                  Check Booking
                </button>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                QR payload / quick search
              </p>
              <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_150px_150px_auto]">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") scanCurrentValue(query, "qr");
                  }}
                  placeholder="Paste QR payload, ticket ID, booking ID..."
                  className="min-h-11 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
                />

                <select
                  value={eventFilter}
                  onChange={(event) => setEventFilter(event.target.value)}
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
                >
                  {eventOptions.map((eventName) => (
                    <option key={eventName} value={eventName}>
                      {eventName}
                    </option>
                  ))}
                </select>

                <select
                  value={gateFilter}
                  onChange={(event) => setGateFilter(event.target.value)}
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
                >
                  {gateOptions.map((gate) => (
                    <option key={gate} value={gate}>
                      {gate}
                    </option>
                  ))}
                </select>

                <select
                  value={entryFilter}
                  onChange={(event) => setEntryFilter(event.target.value as "All Entries" | ScannerCheckInStatus)}
                  className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
                >
                  <option>All Entries</option>
                  <option>Not Checked In</option>
                  <option>Verified</option>
                  <option>Checked In</option>
                  <option>Rejected</option>
                </select>

                <button
                  type="button"
                  onClick={() => scanCurrentValue(query, "qr")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white"
                >
                  <QrCode className="size-4" />
                  Validate
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={resetScannerFilters}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black text-[var(--app-foreground)]"
            >
              <RefreshCw className="size-4" />
              Reset Scanner
            </button>
          </div>
        </section>

        {scanMessage ? (
          <section className="rounded-2xl border border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-primary)]" />
              <p className="text-sm font-bold leading-6 text-[var(--app-foreground)]">
                {scanMessage}
              </p>
            </div>
          </section>
        ) : null}

        {selectedRow ? (
          <section className="grid gap-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)] xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                    Selected ticket
                  </p>
                  <h3 className="mt-1 break-words text-2xl font-black text-[var(--app-foreground)]">
                    {selectedRow.attendeeName}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
                    {selectedRow.event} • {selectedRow.ticketType}
                  </p>
                </div>

                <OrganizerCheckInBadge status={selectedRow.checkInStatus} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailBox label="Ticket ID" value={selectedRow.ticketId} />
                <DetailBox label="Booking ID" value={selectedRow.bookingId} />
                <DetailBox label="Event ID" value={selectedRow.eventId} />
                <DetailBox label="Source" value={selectedRow.source ?? "Online"} />
                <DetailBox label="Seat / Qty" value={selectedRow.seat} />
                <DetailBox label="Gate" value={selectedRow.gate} />
                <DetailBox label="Checked In At" value={selectedRow.checkInTime} />
                <DetailBox label="Verified By" value={selectedRow.verifiedBy} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={selectedRow.ticketStatus !== "Valid" || selectedRow.checkInStatus === "Checked In"}
                  onClick={() => markCheckedIn(selectedRow)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4" />
                  Mark Checked In
                </button>

                <button
                  type="button"
                  disabled={selectedRow.checkInStatus === "Checked In"}
                  onClick={() => rejectEntry(selectedRow)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject Entry
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] px-4 text-sm font-black"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <aside className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                QR / Booking Preview
              </p>

              <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-white p-4 text-slate-950">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Buizz Verified Ticket
                    </p>
                    <p className="mt-2 line-clamp-2 text-lg font-black">
                      {selectedRow.event}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {selectedRow.ticketType} • {selectedRow.gate}
                    </p>
                  </div>

                  <QrCode className="size-20 shrink-0" />
                </div>

                <div className="mt-4 grid gap-1 text-xs font-bold">
                  <p>Ticket: {selectedRow.ticketId}</p>
                  <p>Booking: {selectedRow.bookingId}</p>
                  <p>Status: {selectedRow.checkInStatus}</p>
                </div>
              </div>
            </aside>
          </section>
        ) : null}

        <section className="grid gap-3 xl:hidden">
          {filteredRows.map((row, index) => (
            <article
              key={`scan-mobile-${row.source ?? "online"}-${row.ticketId}-${row.bookingId}-${index}`}
              className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                    {row.ticketId}
                  </p>
                  <h3 className="mt-1 line-clamp-1 text-lg font-black text-[var(--app-foreground)]">
                    {row.attendeeName}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-[var(--app-muted)]">
                    {row.event}
                  </p>
                </div>

                <OrganizerCheckInBadge status={row.checkInStatus} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[var(--app-subtle)] p-3">
                  <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">Ticket</p>
                  <p className="mt-1 truncate text-sm font-black">{row.ticketType}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-[var(--app-muted)]">{row.bookingId}</p>
                </div>

                <div className="rounded-2xl bg-[var(--app-subtle)] p-3">
                  <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">Gate / Seat</p>
                  <p className="mt-1 truncate text-sm font-black">{row.gate}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-[var(--app-muted)]">{row.seat}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <StatusPill label={row.source ?? "Online"} />
                <OrganizerTicketValidBadge status={row.ticketStatus} />
                <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1 text-xs font-black text-[var(--app-muted)]">
                  {row.paymentMode ?? "Online"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRow(row)}
                  className="min-h-10 rounded-xl border border-[var(--app-border)] px-3 text-xs font-black"
                >
                  View
                </button>

                <button
                  type="button"
                  disabled={row.ticketStatus !== "Valid" || row.checkInStatus === "Checked In"}
                  onClick={() => markCheckedIn(row)}
                  className="min-h-10 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Check In
                </button>
              </div>
            </article>
          ))}

          {!filteredRows.length ? (
            <div className="rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center">
              <p className="text-xl font-black text-[var(--app-foreground)]">No tickets found</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Try another ticket ID, booking ID, event, or gate filter.
              </p>
            </div>
          ) : null}
        </section>

        <section className="hidden overflow-x-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_14px_40px_rgba(15,23,42,0.06)] xl:block">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase text-[var(--app-muted)]">
                <th className="px-4 py-4">Ticket / Booking</th>
                <th className="px-4 py-4">Event</th>
                <th className="px-4 py-4">Attendee</th>
                <th className="px-4 py-4">Type / Seat</th>
                <th className="px-4 py-4">Gate</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Entry Status</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row, index) => (
                <tr
                  key={`scan-row-${row.source ?? "online"}-${row.ticketId}-${row.bookingId}-${index}`}
                  className="border-b border-[var(--app-border)] transition duration-200 hover:bg-[var(--app-subtle)] last:border-0"
                >
                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{row.ticketId}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{row.bookingId}</p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{row.event}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{row.eventId}</p>
                  </td>

                  <td className="px-4 py-4 align-top font-semibold">{row.attendeeName}</td>

                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{row.ticketType}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{row.seat}</p>
                  </td>

                  <td className="px-4 py-4 align-top font-black">{row.gate}</td>

                  <td className="px-4 py-4 align-top">
                    <StatusPill label={row.source ?? "Online"} />
                    {row.paymentMode ? <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{row.paymentMode}</p> : null}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <OrganizerCheckInBadge status={row.checkInStatus} />
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{row.checkInTime}</p>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedRow(row)} className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black">
                        View
                      </button>

                      <button
                        type="button"
                        disabled={row.ticketStatus !== "Valid" || row.checkInStatus === "Checked In"}
                        onClick={() => markCheckedIn(row)}
                        className="rounded-xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Check In
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredRows.length ? (
            <div className="p-10 text-center">
              <p className="text-xl font-black text-[var(--app-foreground)]">No tickets found</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Try another ticket ID, booking ID, event, or gate filter.
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-[var(--color-brand-secondary)]" />
            <div>
              <h3 className="text-lg font-black text-[var(--color-brand-secondary)]">QR check-in rule</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                Camera QR scan, booking ID check, invalid attempt, already-used attempt, and successful check-in are saved into the venue entry log. The Attendees page now shows only those venue entry records, not every booking.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Panel>
  );
}
function SettlementsView() {
  const offlineBookings = useOrganizerOfflineBookings();
  const collected = offlineBookings.reduce((sum, booking) => sum + booking.amountCollected, 0);
  const pending = offlineBookings.reduce((sum, booking) => sum + booking.balanceAmount, 0);

  return (
    <Panel title="Settlements" description="Track organizer collection, pending balances, and payout readiness.">
      <div className="grid gap-3 sm:grid-cols-3">
        <OrganizerStatCard title="Collected" value={collected} />
        <OrganizerStatCard title="Pending Balance" value={pending} />
        <OrganizerStatCard title="Ready Records" value={offlineBookings.length} />
      </div>
    </Panel>
  );
}

function ReportsView({ title }: { title: string; role: "organizer" }) {
  const offlineBookings = useOrganizerOfflineBookings();
  const unifiedBookings = useOrganizerUnifiedBookings();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Reports");
  const [periodFilter, setPeriodFilter] = useState("This Month");

  const money = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

  const onlineRevenue = unifiedBookings.reduce(
    (sum, booking) => sum + booking.amountCollected,
    0,
  );

  const offlineRevenue = offlineBookings.reduce(
    (sum, booking) => sum + booking.amountCollected,
    0,
  );

  const totalRevenue = onlineRevenue + offlineRevenue;

  const totalTickets =
    unifiedBookings.reduce((sum, booking) => sum + booking.quantity, 0) +
    offlineBookings.reduce((sum, booking) => sum + booking.quantity, 0);

  const totalBookings = unifiedBookings.length + offlineBookings.length;

  const checkedInBookings =
    unifiedBookings.filter((booking) => booking.status === "checked_in").length +
    readOrganizerOfflineCheckIns().length;

  const uniqueEventNames = Array.from(
    new Set([
      ...unifiedBookings.map((booking) => booking.eventTitle),
      ...offlineBookings.map((booking) => booking.eventTitle),
    ]),
  ).filter(Boolean);

  const reportRows = useMemo(() => {
    const eventRows = uniqueEventNames.map((eventName) => {
      const eventUnifiedBookings = unifiedBookings.filter(
        (booking) => booking.eventTitle === eventName,
      );

      const eventOfflineBookings = offlineBookings.filter(
        (booking) => booking.eventTitle === eventName,
      );

      const eventAmount =
        eventUnifiedBookings.reduce((sum, booking) => sum + booking.amountCollected, 0) +
        eventOfflineBookings.reduce((sum, booking) => sum + booking.amountCollected, 0);

      const eventTickets =
        eventUnifiedBookings.reduce((sum, booking) => sum + booking.quantity, 0) +
        eventOfflineBookings.reduce((sum, booking) => sum + booking.quantity, 0);

      return {
        id: `REP-EVENT-${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: `${eventName} Event Report`,
        type: "Event Report",
        period: periodFilter,
        event: eventName,
        records: eventUnifiedBookings.length + eventOfflineBookings.length,
        tickets: eventTickets,
        amount: eventAmount,
        status: eventAmount > 0 || eventTickets > 0 ? "Ready" : "No Data",
        description: "Event-wise booking, ticket, revenue, and source summary.",
      };
    });

    return [
      {
        id: "REP-SALES-SUMMARY",
        title: "Sales Summary",
        type: "Sales",
        period: periodFilter,
        event: "All Events",
        records: totalBookings,
        tickets: totalTickets,
        amount: totalRevenue,
        status: "Ready",
        description: "Online, offline, reserved, and free ticket sales summary.",
      },
      {
        id: "REP-ATTENDANCE-SUMMARY",
        title: "Attendance Summary",
        type: "Attendance",
        period: periodFilter,
        event: "All Events",
        records: checkedInBookings,
        tickets: checkedInBookings,
        amount: 0,
        status: "Ready",
        description: "Checked-in tickets and gate entry report.",
      },
      {
        id: "REP-OFFLINE-COLLECTIONS",
        title: "Offline Collections",
        type: "Collections",
        period: periodFilter,
        event: "Offline Counter",
        records: offlineBookings.length,
        tickets: offlineBookings.reduce((sum, booking) => sum + booking.quantity, 0),
        amount: offlineRevenue,
        status: offlineBookings.length ? "Ready" : "No Data",
        description: "Cash, UPI, card, reserved, complimentary, and pay-at-venue records.",
      },
      {
        id: "REP-PAYOUT-READINESS",
        title: "Payout Readiness",
        type: "Settlement",
        period: periodFilter,
        event: "All Events",
        records: totalBookings,
        tickets: totalTickets,
        amount: totalRevenue,
        status: totalRevenue > 0 ? "Ready" : "No Data",
        description: "Organizer payout-ready amount before final admin settlement approval.",
      },
      ...eventRows,
    ];
  }, [
    checkedInBookings,
    offlineBookings,
    offlineRevenue,
    periodFilter,
    totalBookings,
    totalRevenue,
    totalTickets,
    unifiedBookings,
    uniqueEventNames,
  ]);

  const reportTypes = ["All Reports", ...Array.from(new Set(reportRows.map((row) => row.type)))];

  const filteredReports = reportRows.filter((row) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      row.title.toLowerCase().includes(query) ||
      row.type.toLowerCase().includes(query) ||
      row.event.toLowerCase().includes(query) ||
      row.description.toLowerCase().includes(query);

    const matchesType = typeFilter === "All Reports" || row.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const downloadReport = (reportTitle: string, format: "PDF" | "Excel" = "PDF") => {
    window.alert(`${reportTitle} ${format} export will connect with backend report API.`);
  };

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("All Reports");
    setPeriodFilter("This Month");
  };

  const reportStats = [
    {
      label: "Total Reports",
      value: reportRows.length.toLocaleString("en-IN"),
      detail: "Available report templates",
      icon: FileText,
    },
    {
      label: "Bookings",
      value: totalBookings.toLocaleString("en-IN"),
      detail: "Online + offline records",
      icon: Ticket,
    },
    {
      label: "Tickets",
      value: totalTickets.toLocaleString("en-IN"),
      detail: "Total quantity issued",
      icon: Users,
    },
    {
      label: "Revenue",
      value: money(totalRevenue),
      detail: "Collected booking amount",
      icon: DollarSign,
    },
  ];

  return (
    <Panel
      title={title}
      description="Download-ready operational reports for organizer events, ticket sales, attendance, collections, and payout readiness."
    >
      <div className="grid gap-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {reportStats.map(({ label, value, detail, icon: Icon }) => (
            <article
              key={label}
              className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                    {label}
                  </p>
                  <p className="mt-3 truncate text-2xl font-black text-[var(--app-foreground)]">
                    {value}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                    {detail}
                  </p>
                </div>

                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
                  <Icon className="size-5" />
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-3 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1fr)_190px_170px_auto_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search report, event, collection, sales..."
            className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold outline-none focus:border-[var(--color-brand-primary)]"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black outline-none focus:border-[var(--color-brand-primary)]"
          >
            {reportTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>

          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black outline-none focus:border-[var(--color-brand-primary)]"
          >
            <option>Today</option>
            <option>Last 7 Days</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="min-h-11 rounded-xl border border-[var(--app-border)] px-4 text-sm font-black"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={() => downloadReport("All organizer reports", "Excel")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white"
          >
            <Download className="size-4" />
            Export All
          </button>
        </section>

        <section className="grid gap-3 xl:hidden">
          {filteredReports.map((report) => (
            <article
              key={`mobile-report-${report.id}`}
              className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                    {report.type}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-lg font-black text-[var(--app-foreground)]">
                    {report.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                    {report.event} • {report.period}
                  </p>
                </div>

                <StatusPill label={report.status} />
              </div>

              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                {report.description}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-[var(--app-subtle)] p-3">
                  <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">
                    Records
                  </p>
                  <p className="mt-1 text-sm font-black">{report.records}</p>
                </div>

                <div className="rounded-2xl bg-[var(--app-subtle)] p-3">
                  <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">
                    Tickets
                  </p>
                  <p className="mt-1 text-sm font-black">{report.tickets}</p>
                </div>

                <div className="rounded-2xl bg-[var(--app-subtle)] p-3">
                  <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">
                    Amount
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {report.amount ? money(report.amount) : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => downloadReport(report.title, "PDF")}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white"
                >
                  <Download className="size-4" />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={() => downloadReport(report.title, "Excel")}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] px-3 text-xs font-black"
                >
                  <FileText className="size-4" />
                  Excel
                </button>
              </div>
            </article>
          ))}

          {!filteredReports.length ? (
            <div className="rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center">
              <p className="text-xl font-black">No reports found</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Try changing search or report type.
              </p>
            </div>
          ) : null}
        </section>

        <section className="hidden overflow-x-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_14px_40px_rgba(15,23,42,0.06)] xl:block">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] text-xs font-black uppercase text-[var(--app-muted)]">
                <th className="px-4 py-4">Report</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Event</th>
                <th className="px-4 py-4">Period</th>
                <th className="px-4 py-4">Records</th>
                <th className="px-4 py-4">Tickets</th>
                <th className="px-4 py-4">Amount</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-[var(--app-border)] transition hover:bg-[var(--app-subtle)] last:border-0"
                >
                  <td className="px-4 py-4 align-top">
                    <p className="font-black">{report.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {report.description}
                    </p>
                  </td>

                  <td className="px-4 py-4 align-top font-semibold">{report.type}</td>
                  <td className="px-4 py-4 align-top font-semibold">{report.event}</td>
                  <td className="px-4 py-4 align-top font-semibold">{report.period}</td>
                  <td className="px-4 py-4 align-top font-black">{report.records}</td>
                  <td className="px-4 py-4 align-top font-black">{report.tickets}</td>
                  <td className="px-4 py-4 align-top font-black">
                    {report.amount ? money(report.amount) : "-"}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <StatusPill label={report.status} />
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadReport(report.title, "PDF")}
                        className="rounded-xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white"
                      >
                        PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadReport(report.title, "Excel")}
                        className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black"
                      >
                        Excel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredReports.length ? (
            <div className="p-10 text-center">
              <p className="text-xl font-black">No reports found</p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Try changing search or report type.
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 size-5 shrink-0 text-[var(--color-brand-secondary)]" />
            <div>
              <h3 className="text-lg font-black text-[var(--color-brand-secondary)]">
                Reports backend note
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                Report exports are connected to organizer records. Backend-generated PDF/Excel downloads should use signed URLs, date filters, organizer ownership checks, and audit logs.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Panel>
  );
}

function OrganizerSupportView() {
  const currentOrganizerId = getCurrentOrganizerId();
  const organizerEventNames = useOrganizerEventNames();

  const organizerIssueOptions: Array<{
    label: string;
    category: SupportTicketCategory;
    helper: string;
  }> = [
      {
        label: "Booking Issue",
        category: "Booking Issue",
        helper: "Use this when customer booking, confirmation, slot, venue, or ticket quantity has an issue.",
      },
      {
        label: "Payment Failed",
        category: "Payment Failed",
        helper: "Use this when customer payment failed, money was deducted, or payment status is not updated.",
      },
      {
        label: "Ticket QR Issue",
        category: "Ticket QR Issue",
        helper: "Use this when QR scanning, duplicate check-in, invalid QR, or gate validation has a problem.",
      },
      {
        label: "Ticket Not Received",
        category: "Ticket Not Received",
        helper: "Use this when customer ticket delivery, profile ticket, email, or WhatsApp ticket is missing.",
      },
      {
        label: "Seat Issue",
        category: "Seat Issue",
        helper: "Use this when seat map, ticket block, gate, section, or capacity mapping has an issue.",
      },
      {
        label: "Payout Issue",
        category: "Other",
        helper: "Use this for payout, settlement, platform fee, pending balance, or bank transfer questions.",
      },
      {
        label: "Event Approval Issue",
        category: "Other",
        helper: "Use this when event approval, rejection reason, document review, or publish status needs help.",
      },
      {
        label: "Technical Issue",
        category: "Other",
        helper: "Use this when dashboard, upload, ticket design, QR scanner, or page loading has a technical issue.",
      },
      {
        label: "Other",
        category: "Other",
        helper: "Use this when the issue does not match the listed categories.",
      },
    ];

  const organizerFaqs = [
    {
      question: "Who reviews organizer support tickets?",
      answer:
        "Organizer support tickets are visible to Admin and Super Admin in the support queue. They can review, assign, reply, resolve, or close the ticket.",
    },
    {
      question: "Can organizer see and close support tickets?",
      answer:
        "No. Organizer can only create support requests from this page. Ticket management belongs to Admin and Super Admin.",
    },
    {
      question: "Can I raise event approval or rejection issues?",
      answer:
        "Yes. Select Event Approval Issue and include event name, rejection reason, document reference, and what needs to be reviewed.",
    },
    {
      question: "Can I raise payout or settlement issues?",
      answer:
        "Yes. Select Payout Issue and include event name, expected payout, settlement cycle, payment mode, or transaction reference.",
    },
    {
      question: "What happens after I submit a ticket?",
      answer:
        "The ticket is saved in the shared support system. Admin/Super Admin can review it from their dashboard. Backend will later send email/WhatsApp updates.",
    },
  ];

  const [form, setForm] = useState({
    organizerName: "Buizz Organizer",
    email: "organizer@buizz.local",
    whatsapp: "",
    eventName: "",
    bookingId: "",
    ticketId: "",
    issueType: organizerIssueOptions[0].label,
    subject: "",
    description: "",
  });

  const [message, setMessage] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [submittedFileNames, setSubmittedFileNames] = useState<string[]>([]);

  const [localSupportTickets, setLocalSupportTickets] = useState<SupportTicket[]>(() =>
    getSupportTickets(),
  );
  const [createSupportTicket] = useCreateSupportTicketMutation();

  const selectedIssue =
    organizerIssueOptions.find((option) => option.label === form.issueType) ??
    organizerIssueOptions[0];

  const organizerTickets = localSupportTickets.filter((ticket) => ticket.sourceType === "Organizer");

  const canSubmit = Boolean(
    form.organizerName.trim() &&
    form.email.trim() &&
    form.subject.trim() &&
    form.description.trim(),
  );
  const resetForm = () => {
    setForm({
      organizerName: "Buizz Organizer",
      email: "organizer@buizz.local",
      whatsapp: "",
      eventName: "",
      bookingId: "",
      ticketId: "",
      issueType: organizerIssueOptions[0].label,
      subject: "",
      description: "",
    });

    setMessage("");
    setSubmittedTicket(null);
    setSupportFiles([]);
    setSubmittedFileNames([]);
  };

  const toApiSupportPriority = (priority: string): "low" | "medium" | "high" | "urgent" => {
    if (priority === "Critical") return "urgent";
    return priority.toLowerCase() as "low" | "medium" | "high";
  };

  const toApiSupportCategory = (category: SupportTicketCategory): "general" | "booking" | "payment" | "technical" | "account" => {
    if (category.includes("Booking") || category.includes("Ticket") || category.includes("Seat")) return "booking";
    if (category.includes("Payment") || category.includes("Refund")) return "payment";
    return "technical";
  };

  // const submitTicket = () => {
  const submitTicket = async () => {
    if (!canSubmit) {
      setMessage("Organizer name, email, subject, and description are required.");
      return;
    }

    const now = getSupportTimestamp();

    const attachmentNames = supportFiles.map((file) => file.name);

    const references = [
      "Source: Organizer Dashboard",
      `Issue type: ${form.issueType}`,
      form.whatsapp.trim() ? `WhatsApp: ${form.whatsapp.trim()}` : "",
      form.eventName.trim() ? `Event: ${form.eventName.trim()}` : "",
      form.bookingId.trim() ? `Booking ID: ${form.bookingId.trim()}` : "",
      form.ticketId.trim() ? `Ticket ID: ${form.ticketId.trim()}` : "",
      attachmentNames.length ? `Reference attachments: ${attachmentNames.join(", ")}` : "",
    ].filter(Boolean);

    const ticket: SupportTicket = {
      id: createSupportTicketId(),
      sourceType: "Organizer",
      requesterName: form.organizerName.trim(),
      requesterEmail: form.email.trim(),
      subject: form.subject.trim(),
      description: `${form.description.trim()}\n\n${references.join("\n")}`,
      category: selectedIssue.category,
      priority: getAutoSupportPriority(selectedIssue.category),
      status: "Open",
      assignedTo: "Unassigned",
      createdAt: now,
      lastUpdated: now,
    };

    try {
      await createSupportTicket({
        id: ticket.id,
        ticketId: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        priority: toApiSupportPriority(ticket.priority),
        category: toApiSupportCategory(ticket.category),
        status: "open",
        createdAt: ticket.createdAt,
        updatedAt: ticket.lastUpdated,
        user: {
          id: currentOrganizerId || "organizer",
          name: ticket.requesterName,
          email: ticket.requesterEmail,
          role: "organizer",
        },
      }).unwrap();
      setLocalSupportTickets((current) => {
        const updated = [ticket, ...current];
        saveSupportTickets(updated);

        return updated;
      });
      setSubmittedTicket(ticket);
      setSubmittedFileNames(attachmentNames);
      setMessage(`Support ticket ${ticket.id} created and sent to Admin/Super Admin support queue.`);
    } catch (error) {
      setMessage("Failed to create support ticket. Please try again.");
    }

    setForm({
      organizerName: "Buizz Organizer",
      email: "organizer@buizz.local",
      whatsapp: "",
      eventName: "",
      bookingId: "",
      ticketId: "",
      issueType: organizerIssueOptions[0].label,
      subject: "",
      description: "",
    });
    setSupportFiles([]);

  };

  return (
    <Panel
      title="Organizer Support"
      description="Create support requests for bookings, payouts, ticket issues, event approval, QR scanner, or technical help."
    >
      <div className="mx-auto grid w-full min-w-0 max-w-[1500px] gap-4 overflow-x-hidden sm:gap-5">
        <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:rounded-[2rem] lg:shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <div
            className="grid gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:p-7"
            style={{
              background:
                "radial-gradient(circle at top right, color-mix(in srgb, var(--color-brand-primary) 16%, transparent), transparent 42%), var(--app-elevated)",
            }}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-[10px] font-black text-[var(--color-brand-primary)] sm:text-xs">
                  <HeadphonesIcon className="size-4 shrink-0" />
                  <span className="truncate">Organizer Help Center</span>
                </span>

                <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1 text-[10px] font-black text-[var(--app-muted)] sm:text-xs">
                  Create request only
                </span>
              </div>

              <h1 className="mt-4 max-w-3xl text-2xl font-black tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Need help with your event operations?
              </h1>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[var(--app-muted)] sm:mt-4 sm:leading-7 lg:text-base">
                Raise support tickets for booking problems, payment issues, QR check-in,
                payout questions, event approval, ticket delivery, seat mapping, or dashboard bugs.
                Admin and Super Admin will review these requests from their support queue.
              </p>
            </div>

            <aside className="grid gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:grid-cols-3 lg:grid-cols-1 lg:p-4">
              {[
                ["Existing Requests", organizerTickets.length.toLocaleString("en-IN"), "Saved organizer tickets"],
                ["Default Status", "Open", "Admin/Super Admin reviews"],
                ["Assignment", "Unassigned", "Support team will assign"],
              ].map(([label, value, detail]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 sm:p-4"
                >
                  <p className="line-clamp-1 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--app-muted)] sm:text-[10px]">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-xl font-black sm:text-2xl">
                    {value}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">
                    {detail}
                  </p>
                </div>
              ))}
            </aside>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:rounded-[2rem] sm:p-5 lg:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)] sm:text-xs">
                  Create New Support Ticket
                </p>
                <h2 className="mt-2 text-xl font-black text-[var(--app-foreground)] sm:text-2xl">
                  Tell Buizz what happened
                </h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:mt-2 sm:text-sm sm:leading-6">
                  Add exact event, booking, ticket, payout, or approval reference so support can resolve faster.
                </p>
              </div>

              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] sm:size-12">
                <HeadphonesIcon className="size-5" />
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
              <SupportInput
                label="Organizer Name *"
                value={form.organizerName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, organizerName: value }))
                }
              />

              <SupportInput
                label="Email *"
                value={form.email}
                onChange={(value) =>
                  setForm((current) => ({ ...current, email: value }))
                }
              />

              <SupportInput
                label="WhatsApp"
                value={form.whatsapp}
                onChange={(value) =>
                  setForm((current) => ({ ...current, whatsapp: value }))
                }
              />

              <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
                Event Name
                <select
                  value={form.eventName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, eventName: event.target.value }))
                  }
                  className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black normal-case text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] sm:px-4"
                >
                  <option value="">General Support</option>
                  {organizerEventNames.map((eventName) => (
                    <option key={eventName} value={eventName}>
                      {eventName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
                Request Type *
                <select
                  value={form.issueType}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, issueType: event.target.value }))
                  }
                  className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black normal-case text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] sm:px-4"
                >
                  {organizerIssueOptions.map((option) => (
                    <option key={option.label}>{option.label}</option>
                  ))}
                </select>
              </label>

              <SupportInput
                label="Booking ID"
                value={form.bookingId}
                onChange={(value) =>
                  setForm((current) => ({ ...current, bookingId: value }))
                }
              />

              <SupportInput
                label="Ticket ID"
                value={form.ticketId}
                onChange={(value) =>
                  setForm((current) => ({ ...current, ticketId: value }))
                }
              />

              <div className="rounded-2xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-3 sm:col-span-2 sm:p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-secondary)]" />
                  <p className="text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
                    {selectedIssue.helper} Priority will be assigned automatically based on the support category.
                  </p>
                </div>
              </div>

              <label className="flex min-h-12 cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-3 text-sm font-semibold text-[var(--app-muted)] transition hover:border-[var(--color-brand-primary)] sm:col-span-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <span className="min-w-0 truncate">
                  {supportFiles.length
                    ? `${supportFiles.length} reference file${supportFiles.length > 1 ? "s" : ""} selected`
                    : "Attach reference image, file, or video optional"}
                </span>

                <span className="w-fit shrink-0 rounded-xl bg-[var(--app-elevated)] px-3 py-2 text-xs font-black text-[var(--color-brand-primary)]">
                  Choose
                </span>

                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    setSupportFiles(files);
                  }}
                  className="sr-only"
                />
              </label>

              {supportFiles.length ? (
                <div className="flex min-w-0 flex-wrap gap-2 sm:col-span-2">
                  {supportFiles.map((file) => (
                    <span
                      key={`${file.name}-${file.size}`}
                      className="max-w-full truncate rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 py-1 text-xs font-black text-[var(--app-muted)]"
                    >
                      {file.name}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="sm:col-span-2">
                <SupportInput
                  label="Subject *"
                  value={form.subject}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, subject: value }))
                  }
                />
              </div>

              <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)] sm:col-span-2">
                Remarks / Description *
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Explain the issue clearly. Add event name, booking ID, payout reference, QR issue, screenshots info, or any important support details."
                  className="min-h-36 w-full min-w-0 resize-y rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] sm:min-h-40 sm:p-4"
                />
              </label>
            </div>

            {message ? (
              <p
                className={`mt-4 break-words rounded-2xl border px-3 py-3 text-sm font-black sm:mt-5 sm:px-4 ${submittedTicket
                  ? "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]"
                  : "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                  }`}
              >
                {message}
              </p>
            ) : null}

            {submittedTicket ? (
              <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:mt-5 sm:p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  Submitted Ticket
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <DetailBox label="Ticket ID" value={submittedTicket.id} />
                  <DetailBox label="Status" value={submittedTicket.status} />
                  <DetailBox label="Priority" value={submittedTicket.priority} />
                </div>

                {submittedFileNames.length ? (
                  <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                      Reference Attachments
                    </p>

                    <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                      {submittedFileNames.map((fileName) => (
                        <span
                          key={fileName}
                          className="max-w-full truncate rounded-full bg-[var(--app-subtle)] px-3 py-1 text-xs font-black text-[var(--app-muted)]"
                        >
                          {fileName}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 grid gap-2 sm:mt-6 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="min-h-11 rounded-2xl border border-[var(--app-border)] px-5 text-sm font-black sm:min-h-12"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={submitTicket}
                disabled={!canSubmit}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-6 text-sm font-black text-white shadow-[0_16px_36px_rgba(236,27,114,0.22)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12"
              >
                <Send className="size-4" />
                Submit Ticket
              </button>
            </div>
          </div>

          <aside className="grid min-w-0 content-start gap-4 sm:gap-5">
            <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:rounded-[2rem] sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                Support Process
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {[
                  ["01", "Create ticket", "Organizer submits issue from this page."],
                  ["02", "Admin review", "Admin/Super Admin checks it in support queue."],
                  ["03", "Resolution", "Support team updates status, reply, or action."],
                ].map(([step, title, detail]) => (
                  <div
                    key={step}
                    className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4"
                  >
                    <p className="text-2xl font-black text-[var(--color-brand-primary)]">
                      {step}
                    </p>
                    <p className="mt-2 text-sm font-black">{title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:rounded-[2rem] sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                Frequently Asked Questions
              </p>
              <h3 className="mt-2 text-lg font-black sm:text-xl">
                Organizer FAQs
              </h3>

              <div className="mt-4 grid gap-3">
                {organizerFaqs.map((item) => (
                  <details
                    key={item.question}
                    className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:p-4"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-black">
                      <span className="min-w-0">{item.question}</span>
                      <span className="shrink-0 text-[var(--app-muted)] transition group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-4 sm:rounded-[2rem] sm:p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 size-5 shrink-0 text-[var(--color-brand-secondary)]" />
                <div className="min-w-0">
                  <h3 className="text-base font-black text-[var(--color-brand-secondary)] sm:text-lg">
                    Connected support flow
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                    Public customer support and organizer support both save into the shared support ticket system. Admin and Super Admin can review from one queue.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </Panel>
  );
}
function SupportInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] sm:px-4"
      />
    </label>
  );
}

function NotificationsView({ role }: { role: "Organizer" }) {
  return (
    <Panel title={`${role} Notifications`} description="Operational updates for event review, bookings, settlements, and support.">
      <div className="grid gap-3">
        {["Event review updates", "Ticket design status", "Booking and settlement alerts"].map((item) => (
          <article key={item} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
            <p className="font-black">{item}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">No unread updates.</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function OrganizerProfileView() {
  return (
    <Panel title="Organizer Profile" description="Business profile, public identity, and payout readiness details.">
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailBox label="Organizer" value="Buizz Organizer" />
        <DetailBox label="Role" value="Organizer" />
        <DetailBox label="Approval" value="Admin and Super Admin approved" />
        <DetailBox label="Profile Image" value="/images/profile.jpg" />
      </div>
    </Panel>
  );
}

function OrganizerStatCard({ title, value }: { title: string; value: number }) {
  return (
    <article className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] sm:rounded-[24px] sm:p-4">
      <p className="line-clamp-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--app-muted)] sm:text-xs">
        {title}
      </p>

      <p className="mt-1 text-2xl font-black leading-none text-[var(--app-foreground)] sm:mt-2 sm:text-3xl">
        {value.toLocaleString("en-IN")}
      </p>
    </article>
  );
}



type OrganizerSeatBlock = {
  name: string;
  price: string;
  capacity: string;
  offer: string;
  themeKey?: string;
  gate?: string;
  badgeLabel?: string;
  benefits?: string;
  entryInstructions?: string;
};

type OrganizerEventItem = {
  id?: string;
  source?: "backend" | "local" | string;
  organizerId?: string;
  organizerName?: string;
  name: string;
  category: string;
  eventType?: string;
  date: string;
  time: string;
  endTime?: string;
  city: string;
  state?: string;
  venue: string;
  address?: string;
  banner: string;
  description: string;
  shortDescription?: string;
  priceRange: string;
  status: OrganizerEventStatus;
  rejectionReason?: string;
  seatBlocks: OrganizerSeatBlock[];
  ticketThemeSettings?: TicketThemeSettings;
  themeApprovalStatus?: TicketThemeSettings["approvalStatus"];
  createdAt?: string;
  submittedAt?: string;
  updatedAt?: string;
  approvalNote?: string;
  inventorySummary?: string;
  ratioSummary?: string;
  ticketDesignStatus?: string;
  platformFeeStatus?: string;
  lifecycleMetadata?: UnifiedBuizzEvent["lifecycleMetadata"];
  bookingModeLabel?: string;
  seatMapRequired?: boolean;
  reviewerName?: string;
  reviewerRole?: string;
  reviewedAt?: string;
  reviewerComment?: string;
  publicSlug?: string;
  historyCount?: number;
};

type ScannerTicketStatus = "Valid" | "Used" | "Cancelled" | "Refunded";
type ScannerCheckInStatus = "Not Checked In" | "Verified" | "Checked In" | "Rejected";

type ScannerTicketRow = {
  id: string;
  ticketId: string;
  bookingId: string;
  eventId: string;
  event: string;
  attendeeName: string;
  ticketType: string;
  seat: string;
  gate: string;
  ticketStatus: ScannerTicketStatus;
  checkInStatus: ScannerCheckInStatus;
  checkInTime: string;
  verifiedBy: string;
  themeKey: string;
  source?: "Online" | "Offline" | "Reserved" | "Free";
  paymentMode?: string;
  amountCollected?: number;
  selectedSeats?: SelectedSeatData[];
};

type OrganizerBookingStatus =
  | "Confirmed"
  | "Pending Payment"
  | "Checked In"
  | "Cancelled"
  | "Refund Requested"
  | "Refunded";

type OrganizerPaymentStatus =
  | "Paid"
  | "Pending"
  | "Failed"
  | "Refunded"
  | "Complimentary";

type OrganizerBookingRow = {
  id: string;
  orderId: string;
  event: string;
  eventId: string;
  customerRef: string;
  ticketType: string;
  quantity: number;
  amount: number;
  bookingDate: string;
  paymentStatus: OrganizerPaymentStatus;
  bookingStatus: OrganizerBookingStatus;
  scanStatus: "Not Checked In" | "Checked In";
  source: "Website" | "App" | "Counter" | "Online" | "Offline" | "Reserved" | "Free";
  coupon: string;
  ticketId?: string;
  customerPhone?: string;
  paymentMode?:
  | "Cash"
  | "UPI"
  | "Razorpay"
  | "Card"
  | "Other"
  | "Online"
  | "Complimentary"
  | "Free Registration";
  balanceAmount?: number;
};

const organizerEventsStorageKey = LEGACY_ORGANIZER_EVENTS_STORAGE_KEY;

function writeOrganizerEventsCache(events: OrganizerEventItem[]) {
  if (typeof window === "undefined") return;

  const recentEvents = events.slice(0, 50);
  try {
    window.localStorage.setItem(organizerEventsStorageKey, JSON.stringify(recentEvents));
    return;
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }

  const compactEvents = recentEvents.slice(0, 20).map((event) => ({
    id: event.id,
    name: event.name,
    status: event.status,
    date: event.date,
    time: event.time,
    city: event.city,
    venue: event.venue,
    category: event.category,
    eventType: event.eventType,
    priceRange: event.priceRange,
    submittedAt: event.submittedAt,
    updatedAt: event.updatedAt,
  }));

  try {
    window.localStorage.setItem(organizerEventsStorageKey, JSON.stringify(compactEvents));
  } catch {
    window.localStorage.removeItem(organizerEventsStorageKey);
  }
}

function getOrganizerEventStatus(event: UnifiedBuizzEvent): OrganizerEventStatus {
  if (event.lifecycleMetadata?.approvalBlockers.eventReviewStatus === "changes_requested") {
    return "Changes Requested";
  }

  return unifiedStatusToOrganizer(event.status);
}

function createOrganizerSummaryFromUnifiedEvent(event: UnifiedBuizzEvent): OrganizerEventItem {
  const status = getOrganizerEventStatus(event);
  const reviewerName =
    event.approval?.reviewedBy ??
    event.approval?.approvedBy ??
    event.approval?.rejectedBy;
  const reviewedAt =
    event.approval?.reviewedAt ??
    event.approval?.approvedAt ??
    event.approval?.rejectedAt;

  return {
    id: event.id,
    name: event.title,
    category:
      event.lifecycleMetadata?.listingCategory ||
      event.subCategory ||
      event.category,
    eventType: event.priceMax > 0 ? "Paid" : "Free",
    date: event.date || "Date pending",
    time: event.time || "Time pending",
    endTime: event.endTime,
    city: event.city || "City pending",
    venue: event.venueName || "Venue pending",
    address: event.venueAddress,
    banner: event.bannerImage || "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    description: event.description || "Organizer-created event.",
    shortDescription: event.description || "Organizer-created event.",
    priceRange:
      event.priceMax > event.priceMin
        ? `Rs. ${event.priceMin.toLocaleString("en-IN")} - Rs. ${event.priceMax.toLocaleString("en-IN")}`
        : event.priceMin > 0
          ? `Rs. ${event.priceMin.toLocaleString("en-IN")}`
          : "Free / price pending",
    status,
    rejectionReason: event.approval?.rejectedReason,
    seatBlocks: event.ticketBlocks.length
      ? event.ticketBlocks.map((block) => ({
        name: block.name,
        price: String(block.price),
        capacity: String(block.totalQuantity),
        offer: "No offer",
        gate: "Main Gate",
      }))
      : [{ name: "Entry Pass", price: "0", capacity: String(event.capacity || 0), offer: "No offer", gate: "Main Gate" }],
    createdAt: event.createdAt,
    submittedAt: event.approval?.submittedAt,
    updatedAt: event.updatedAt,
    approvalNote:
      status === "Pending Review"
        ? "Submitted for Buizz review."
        : status === "Changes Requested"
          ? "Reviewer requested updates before approval."
          : status === "Approved"
          ? "Admin approved. Waiting for publish."
          : status === "Published"
            ? "Published to customer website."
            : status === "Rejected"
              ? "Rejected by admin."
              : undefined,
    inventorySummary: `${event.ticketBlocks.reduce((sum, block) => sum + block.onlineQuantity, 0).toLocaleString("en-IN")} online / ${event.ticketBlocks.reduce((sum, block) => sum + block.offlineQuantity, 0).toLocaleString("en-IN")} offline / ${event.ticketBlocks.reduce((sum, block) => sum + block.reservedQuantity, 0).toLocaleString("en-IN")} reserved`,
    ratioSummary: `${event.ratio.online}% online / ${event.ratio.offline}% offline / ${event.ratio.reserved}% reserved`,
    ticketDesignStatus: event.ticketDesignId || "Default ticket design",
    lifecycleMetadata: event.lifecycleMetadata,
    bookingModeLabel:
      event.lifecycleMetadata?.bookingModeLabel ??
      (event.bookingType ? formatOrganizerWorkflowValue(event.bookingType) : undefined),
    seatMapRequired:
      event.lifecycleMetadata?.requiresSeatMap ??
      event.seatMapMode === "seat_map",
    reviewerName,
    reviewerRole: event.approval?.reviewedRole,
    reviewedAt,
    reviewerComment:
      event.approval?.reviewerComment ??
      event.approval?.rejectedReason,
    publicSlug: event.slug,
    historyCount: event.history?.length ?? 0,
  };
}

function organizerEventToUnifiedEvent(event: OrganizerEventItem): UnifiedBuizzEvent {
  const now = new Date().toISOString();
  const blocks = event.seatBlocks.map((block, index) => {
    const totalQuantity = parseDashboardMoney(block.capacity);
    const offlineQuantity = Math.round(totalQuantity * 0.25);
    const reservedQuantity = Math.round(totalQuantity * 0.1);
    return {
      id: `${getUnifiedEventKey(event)}-${block.name || index}`,
      name: block.name || "Entry Pass",
      price: parseDashboardMoney(block.price),
      totalQuantity,
      onlineQuantity: Math.max(totalQuantity - offlineQuantity - reservedQuantity, 0),
      offlineQuantity,
      reservedQuantity,
    };
  });
  const prices = blocks.map((block) => block.price).filter((price) => price > 0);
  const capacity = blocks.reduce((sum, block) => sum + block.totalQuantity, 0);
  const online = blocks.reduce((sum, block) => sum + block.onlineQuantity, 0);
  const offline = blocks.reduce((sum, block) => sum + block.offlineQuantity, 0);
  const reserved = blocks.reduce((sum, block) => sum + block.reservedQuantity, 0);
  const allocated = online + offline + reserved;

  return {
    id: getUnifiedEventKey(event),
    slug: event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || getUnifiedEventKey(event),
    title: event.name,
    category: event.category || "event",
    subCategory: event.category || undefined,
    organizerId: event.organizerId || "",
    organizerName: event.organizerName || "",
    status: organizerStatusToUnified(event.status),
    city: event.city || "City pending",
    venueName: event.venue || "Venue pending",
    venueAddress: event.address,
    date: event.date || "",
    time: event.time || "",
    endTime: event.endTime,
    bannerImage: event.banner,
    gallery: [],
    description: event.description || event.shortDescription || "",
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    capacity,
    ticketBlocks: blocks,
    ratio: allocated
      ? {
        online: Math.round((online / allocated) * 100),
        offline: Math.round((offline / allocated) * 100),
        reserved: Math.round((reserved / allocated) * 100),
      }
      : { online: 0, offline: 0, reserved: 0 },
    policies: [],
    ticketDesignId: event.ticketThemeSettings?.themeKey,
    seatMapMode: event.seatMapRequired ? "seat_map" : "capacity_only",
    lifecycleMetadata: event.lifecycleMetadata,
    approval: {
      submittedAt: event.submittedAt,
      rejectedReason: event.rejectionReason,
      reviewedBy: event.reviewerName,
      reviewedRole: event.reviewerRole,
      reviewedAt: event.reviewedAt,
      reviewerComment: event.reviewerComment,
    },
    createdAt: event.createdAt || now,
    updatedAt: event.updatedAt || now,
  };
}

