import {
  getEventFinalEndDateTime,
  getEventPrimaryStartDateTime,
  shouldMoveToHistory,
} from "./event-utils";
import type { BuizzEvent, EventStatus } from "./types";

export const PHASE3_EVENTS_STORAGE_KEY = "buizz-organizer-events-v2";
export const LEGACY_ORGANIZER_EVENTS_STORAGE_KEY = "buizz-organizer-events";

export type Phase3StatusLabel =
  | "Draft"
  | "Pending Review"
  | "Changes Requested"
  | "Needs Super Admin Review"
  | "Approved"
  | "Rejected"
  | "Platform Fee Assigned"
  | "Fee Acceptance Pending"
  | "Published"
  | "Cancelled"
  | "Completed"
  | "Expired"
  | "History";

export type Phase3OrganizerEventSummary = {
  id: string;
  name: string;
  category: string;
  eventType: string;
  date: string;
  time: string;
  endTime?: string;
  city: string;
  venue: string;
  address?: string;
  banner: string;
  description: string;
  shortDescription?: string;
  priceRange: string;
  status: Phase3StatusLabel;
  rejectionReason?: string;
  seatBlocks: Array<{ name: string; price: string; capacity: string; offer: string }>;
  createdAt?: string;
  submittedAt?: string;
  inventorySummary: string;
  ratioSummary: string;
  ticketDesignStatus: string;
  platformFeeStatus: string;
};

export type Phase3ApprovalSummary = {
  id: string;
  sourceEventId: string;
  name: string;
  organizer: string;
  category: string;
  status: Phase3StatusLabel;
  dateTime: string;
  venue: string;
  city: string;
  capacity: number;
  ticketTypes: number;
  priceRange: string;
  submittedAt: string;
  adminReview: string;
  rejectionReason?: string;
  banner: string;
  eventType: string;
  description: string;
  terms: string;
  ticketList: { name: string; price: string; quantity: number }[];
  schedule: { time: string; activity: string }[];
  inventorySummary: string;
  ratioSummary: string;
  ticketDesignSummary: string;
  mediaSummary: string;
  offerSummary: string;
  policySummary: string;
  platformFeeStatus: string;
  approvalTrail: string;
  superAdminFeeRuleSummary: string;
  requiresSuperAdminApproval: boolean;
  adminApprovalIsFinal: boolean;
};

const statusLabels: Record<EventStatus, Phase3StatusLabel> = {
  draft: "Draft",
  pending_review: "Pending Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  rejected: "Rejected",
  platform_fee_assigned: "Platform Fee Assigned",
  organizer_fee_acceptance_pending: "Fee Acceptance Pending",
  published: "Published",
  cancel_requested: "Cancelled",
  cancelled: "Cancelled",
  completed: "Completed",
  expired: "Expired",
  history: "History",
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getScheduleParts = (event: BuizzEvent) => {
  const venue = event.venues[0];
  const schedule = venue?.schedules[0];
  const slot = schedule?.timeSlots[0];

  return {
    venue,
    schedule,
    slot,
    date: schedule?.date ?? "Date pending",
    time: slot?.startTime ?? "Time pending",
    endTime: slot?.endTime,
  };
};

const getTicketPriceLabel = (price: number) => (price <= 0 ? "Free" : `INR ${price.toLocaleString("en-IN")}`);

export const getPhase3PriceRange = (event: BuizzEvent) => {
  if (event.pricingMode === "free") return "Free";

  const prices = event.ticketBlocks.map((block) => block.price).filter((price) => price > 0);
  if (!prices.length) return "Price pending";

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? getTicketPriceLabel(min) : `${getTicketPriceLabel(min)} - ${getTicketPriceLabel(max)}`;
};

export const getPhase3InventorySummary = (event: BuizzEvent) => {
  const source = event.seatConfig?.sections ?? [];
  const seatTotals = source.reduce(
    (total, section) => ({
      total: total.total + section.totalSeats,
      online: total.online + section.onlineSeats,
      offline: total.offline + section.offlineSeats,
      reserved: total.reserved + section.reservedSeats,
    }),
    { total: 0, online: 0, offline: 0, reserved: 0 },
  );

  const totals = event.capacityConfig
    ? {
        total: event.capacityConfig.totalCapacity,
        online: event.capacityConfig.onlineCapacity,
        offline: event.capacityConfig.offlineCapacity,
        reserved: event.capacityConfig.reservedCapacity,
      }
    : seatTotals;

  return `${totals.total.toLocaleString("en-IN")} total / ${totals.online.toLocaleString("en-IN")} online / ${totals.offline.toLocaleString("en-IN")} offline / ${totals.reserved.toLocaleString("en-IN")} reserved`;
};

export const getPhase3RatioSummary = (event: BuizzEvent) => {
  const ratio = event.venues[0]?.schedules[0]?.timeSlots[0]?.ratioConfig;
  const fallback = event.ticketBlocks[0];
  if (!ratio && !fallback) return "Ratio pending";

  if (ratio) {
    return `${ratio.onlinePercentage}% online / ${ratio.offlinePercentage}% offline / ${ratio.reservedPercentage}% reserved`;
  }

  const total = fallback.onlineQuantity + fallback.offlineQuantity + fallback.reservedQuantity;
  if (!total) return "Ratio pending";
  return `${Math.round((fallback.onlineQuantity / total) * 100)}% online / ${Math.round((fallback.offlineQuantity / total) * 100)}% offline / ${Math.round((fallback.reservedQuantity / total) * 100)}% reserved`;
};

export const getPhase3TicketDesignSummary = (event: BuizzEvent) =>
  `${event.ticketDesign.templateName} / ${event.ticketDesign.allowDragDrop ? "editor enabled" : "drag-drop locked"} / ${event.ticketDesign.restrictions.length} restriction notes`;

export const getPhase3PlatformFeeStatus = (event: BuizzEvent) => {
  if (event.approval.platformFeeAssigned || event.platformFees.length) return "Assigned";
  return "Pending";
};

export const getPhase3MediaSummary = (event: BuizzEvent) => {
  const gallery = event.media.galleryImages.length;
  const video = event.media.videoUrl ? "video visible" : "no video";
  const social = event.media.socialLinks.filter((link) => link.visible).length;
  return `${gallery} gallery image${gallery === 1 ? "" : "s"}, ${video}, ${social} social link${social === 1 ? "" : "s"}`;
};

export const getPhase3OfferSummary = (event: BuizzEvent) => {
  if (event.pricingMode === "free") return "Offers skipped for free event";
  if (!event.offers.length) return "No offers";
  const best = event.offers.reduce((current, offer) => (offer.discountValue > current.discountValue ? offer : current), event.offers[0]);
  return `${event.offers.length} offer${event.offers.length === 1 ? "" : "s"} / best: ${best.title || best.code || "Unnamed offer"}`;
};

export const getPhase3PolicySummary = (event: BuizzEvent) =>
  `${event.policies.entryRules.length} entry rules / ${event.policies.customTerms.length} custom terms / terms ${event.policies.organizerTermsAccepted ? "accepted" : "pending"}`;

export const mapPhase3Status = (event: BuizzEvent): Phase3StatusLabel => {
  if (event.status === "pending_review" && !event.approval.adminApprovalIsFinal && event.approval.reviewedRole === "admin") {
    return "Needs Super Admin Review";
  }
  if (event.status === "published" && shouldMoveToHistory(event)) return "History";
  return statusLabels[event.status] ?? "Draft";
};

export const loadPhase3EventsFromStorage = (storage?: Storage | null): BuizzEvent[] => {
  if (!storage) return [];

  try {
    const raw = storage.getItem(PHASE3_EVENTS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as BuizzEvent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    storage.removeItem(PHASE3_EVENTS_STORAGE_KEY);
    return [];
  }
};

const compactPhase3EventForStorage = (event: BuizzEvent): BuizzEvent => {
  const compact = JSON.parse(JSON.stringify(event)) as any;
  if (compact.media) {
    compact.media = {
      ...compact.media,
      galleryImages: [],
      socialLinks: compact.media.socialLinks ?? [],
    };
  }
  if (compact.ticketDesign) {
    compact.ticketDesign = {
      ...compact.ticketDesign,
      customBackground: undefined,
      qrLogo: undefined,
    };
  }
  return compact as BuizzEvent;
};

const writePhase3Events = (events: BuizzEvent[], storage: Storage) => {
  const recent = events.slice(0, 25);

  try {
    storage.setItem(PHASE3_EVENTS_STORAGE_KEY, JSON.stringify(recent));
    return;
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }

  const compact = recent.slice(0, 10).map(compactPhase3EventForStorage);
  try {
    storage.setItem(PHASE3_EVENTS_STORAGE_KEY, JSON.stringify(compact));
    return;
  } catch {
    storage.removeItem(PHASE3_EVENTS_STORAGE_KEY);
  }
};

export const savePhase3EventToStorage = (event: BuizzEvent, storage?: Storage | null) => {
  if (!storage) return;
  const existing = loadPhase3EventsFromStorage(storage);
  writePhase3Events([event, ...existing.filter((item) => item.id !== event.id)], storage);
};

export const createOrganizerSummaryFromEvent = (event: BuizzEvent): Phase3OrganizerEventSummary => {
  const { venue, schedule, slot, date, time, endTime } = getScheduleParts(event);
  const status = mapPhase3Status(event);

  return {
    id: event.id,
    name: event.title,
    category: event.subCategory || event.category,
    eventType: event.pricingMode === "free" ? "Free" : "Paid",
    date,
    time,
    endTime,
    city: venue?.city || event.organizer.city,
    venue: venue?.venueName || "Venue pending",
    address: venue?.address,
    banner: event.media.bannerImage?.url || "/images/profile.jpg",
    description: event.description,
    shortDescription: event.subtitle,
    priceRange: getPhase3PriceRange(event),
    status,
    rejectionReason: event.approval.rejectionReason,
    seatBlocks: event.ticketBlocks.map((block) => ({
      name: block.name,
      price: String(block.price),
      capacity: String(block.totalQuantity),
      offer: event.pricingMode === "free" ? "Free registration" : event.offers[0]?.title || "No offer",
    })),
    createdAt: formatDate(event.createdAt),
    submittedAt: formatDate(event.approval.submittedAt),
    inventorySummary: getPhase3InventorySummary(event),
    ratioSummary: getPhase3RatioSummary(event),
    ticketDesignStatus: getPhase3TicketDesignSummary(event),
    platformFeeStatus: getPhase3PlatformFeeStatus(event),
  };
};

export const createApprovalSummaryFromEvent = (event: BuizzEvent): Phase3ApprovalSummary => {
  const { venue, schedule, slot, date, time, endTime } = getScheduleParts(event);
  const status = mapPhase3Status(event);
  const dateTime = `${date}${time ? ` at ${time}` : ""}`;
  const capacity =
    event.capacityConfig?.totalCapacity ??
    event.seatConfig?.sections.reduce((total, section) => total + section.totalSeats, 0) ??
    event.ticketBlocks.reduce((total, block) => total + block.totalQuantity, 0);
  const adminReview =
    status === "Needs Super Admin Review"
      ? "Admin reviewed this event. Needs Super Admin Review because admin approval is not final."
      : event.approval.rejectionReason
        ? `Rejected: ${event.approval.rejectionReason}`
        : event.approval.approvalNotes || "Pending Buizz review";
  const approvalTrail = [
    event.approval.reviewedBy ? `${event.approval.reviewedRole}: ${event.approval.reviewedBy}` : "Organizer submitted",
    event.approval.reviewedAt ? formatDate(event.approval.reviewedAt) : "",
  ].filter(Boolean).join(" / ");

  return {
    id: event.id,
    sourceEventId: event.id,
    name: event.title,
    organizer: event.organizer.name,
    category: event.subCategory || event.category,
    status,
    dateTime,
    venue: venue?.venueName || "Venue pending",
    city: venue?.city || event.organizer.city,
    capacity,
    ticketTypes: event.ticketBlocks.length,
    priceRange: getPhase3PriceRange(event),
    submittedAt: formatDate(event.approval.submittedAt || event.createdAt),
    adminReview,
    rejectionReason: event.approval.rejectionReason,
    banner: event.media.bannerImage?.url || "/images/profile.jpg",
    eventType: `${event.pricingMode === "free" ? "Free" : "Paid"} / ${event.bookingType}`,
    description: event.description,
    terms: event.policies.userTerms || event.policies.cancellationPolicy,
    ticketList: event.ticketBlocks.map((block) => ({
      name: block.name,
      price: getTicketPriceLabel(block.price),
      quantity: block.totalQuantity,
    })),
    schedule: [
      { time, activity: "Entry opens / check-in starts" },
      { time: endTime || slot?.endTime || "End pending", activity: "Event ends" },
    ],
    inventorySummary: getPhase3InventorySummary(event),
    ratioSummary: getPhase3RatioSummary(event),
    ticketDesignSummary: getPhase3TicketDesignSummary(event),
    mediaSummary: getPhase3MediaSummary(event),
    offerSummary: getPhase3OfferSummary(event),
    policySummary: getPhase3PolicySummary(event),
    platformFeeStatus: getPhase3PlatformFeeStatus(event),
    approvalTrail: approvalTrail || "Organizer submitted",
    superAdminFeeRuleSummary: `${venue?.city || event.organizer.city} / ${event.category} / ${venue?.venueType || "venue"} / section rules placeholder`,
    requiresSuperAdminApproval: event.approval.requiresSuperAdminApproval,
    adminApprovalIsFinal: event.approval.adminApprovalIsFinal,
  };
};

export const getPublicPhase3Events = (events: BuizzEvent[], currentTime: string | Date = new Date()) =>
  events.filter((event) => event.status === "published" && event.visibility.isPublic && !shouldMoveToHistory(event, currentTime));

export const getPhase3HistoryStatus = (event: BuizzEvent) => {
  const finalEnd = getEventFinalEndDateTime(event);
  const primaryStart = getEventPrimaryStartDateTime(event);
  if (event.status === "published" && shouldMoveToHistory(event)) return "History";
  return finalEnd || primaryStart ? "Scheduled" : "Schedule pending";
};
