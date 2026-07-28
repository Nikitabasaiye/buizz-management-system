// "use client";

// import {
//   LEGACY_ORGANIZER_EVENTS_STORAGE_KEY,
//   PHASE3_EVENTS_STORAGE_KEY,
//   loadPhase3EventsFromStorage,
//   savePhase3EventToStorage,
// } from "@/features/events";
// import type {
//   BookingType,
//   BuizzEvent,
//   EventStatus,
//   EventVenue,
//   PricingMode,
//   TicketBlock,
// } from "@/features/events";

// import {
//   buizzIntegrationStorageKeys,
//   readStorageArray,
//   uniqueBy,
//   upsertStorageRecord,
//   writeStorageValue,
// } from "./frontendStorage";

// export type UnifiedEventStatus =
//   | "draft"
//   | "pending_review"
//   | "approved"
//   | "published"
//   | "rejected"
//   | "cancelled"
//   | "completed";

// export type UnifiedPlatformFeeState = "not_assigned" | "fee_pending" | "accepted" | "rejected_or_clarification";

// export type UnifiedPlatformFee = {
//   type: "fixed" | "percentage";
//   value: number;
//   visibleToOrganizer: boolean;
//   status: UnifiedPlatformFeeState;
//   assignedBy?: string;
//   assignedAt?: string;
//   acceptedAt?: string;
// };

// export type UnifiedEventHistoryItem = {
//   id: string;
//   action: string;
//   message: string;
//   actor: string;
//   createdAt: string;
// };

// export type UnifiedTicketBlock = {
//   id: string;
//   name: string;
//   price: number;
//   totalQuantity: number;
//   onlineQuantity: number;
//   offlineQuantity: number;
//   reservedQuantity: number;
// };

// export type UnifiedBuizzEvent = {
//   id: string;
//   slug: string;
//   title: string;
//   category: "event" | "play" | "activity" | string;
//   subCategory?: string;
//   bookingType?: BookingType;
//   pricingMode?: PricingMode;
//   venues?: EventVenue[];
//   organizerId: string;
//   organizerName: string;
//   status: UnifiedEventStatus;
//   city: string;
//   venueName: string;
//   venueAddress?: string;
//   date: string;
//   time: string;
//   endDate?: string;
//   endTime?: string;
//   bannerImage?: string;
//   gallery?: string[];
//   description: string;
//   priceMin: number;
//   priceMax: number;
//   capacity: number;
//   ticketBlocks: UnifiedTicketBlock[];
//   ratio: {
//     online: number;
//     offline: number;
//     reserved: number;
//   };
//   policies?: string[];
//   ticketDesignId?: string;
//   platformFees?: UnifiedPlatformFee;
//   history?: UnifiedEventHistoryItem[];
//   approval?: {
//     submittedAt?: string;
//     approvedBy?: string;
//     approvedAt?: string;
//     rejectedBy?: string;
//     rejectedAt?: string;
//     rejectedReason?: string;
//   };
//   createdAt: string;
//   updatedAt: string;
// };

// type LegacyOrganizerEventSummary = {
//   id?: string;
//   name?: string;
//   title?: string;
//   category?: string;
//   city?: string;
//   venue?: string;
//   venueName?: string;
//   address?: string;
//   date?: string;
//   time?: string;
//   banner?: string;
//   description?: string;
//   priceRange?: string;
//   status?: string;
//   seatBlocks?: Array<{ name?: string; price?: string; capacity?: string }>;
//   createdAt?: string;
//   submittedAt?: string;
//   rejectionReason?: string;
// };

// const lifecycleStatusMap: Record<string, UnifiedEventStatus> = {
//   draft: "draft",
//   "Draft": "draft",
//   pending_review: "pending_review",
//   "Pending Review": "pending_review",
//   "Needs Super Admin Review": "pending_review",
//   approved: "approved",
//   "Approved": "approved",
//   published: "published",
//   "Published": "published",
//   rejected: "rejected",
//   "Rejected": "rejected",
//   cancelled: "cancelled",
//   "Cancelled": "cancelled",
//   completed: "completed",
//   "Completed": "completed",
//   history: "completed",
//   "History": "completed",
// };

// export function normalizeEventStatus(value: unknown): UnifiedEventStatus {
//   return lifecycleStatusMap[String(value ?? "")] ?? "draft";
// }

// export function normalizeBuizzEvent(event: BuizzEvent): UnifiedBuizzEvent {
//   const venue = event.venues?.[0];
//   const schedule = venue?.schedules?.[0];
//   const slot = schedule?.timeSlots?.[0];
//   const blocks = Array.isArray(event.ticketBlocks) ? event.ticketBlocks.map(normalizeTicketBlock) : [];
//   const prices = blocks.map((block) => block.price).filter((price) => price > 0);
//   const capacity = event.capacityConfig?.totalCapacity ?? blocks.reduce((sum, block) => sum + block.totalQuantity, 0);
//   const online = blocks.reduce((sum, block) => sum + block.onlineQuantity, 0);
//   const offline = blocks.reduce((sum, block) => sum + block.offlineQuantity, 0);
//   const reserved = blocks.reduce((sum, block) => sum + block.reservedQuantity, 0);
//   const allocated = online + offline + reserved;
//   const approvalRecord = event.approval as Record<string, unknown> | undefined;
//   const firstPlatformFee = Array.isArray(event.platformFees) ? event.platformFees[0] : undefined;
//   const normalizedPlatformFee = normalizeUnifiedPlatformFee(firstPlatformFee);

//   const platformFeeAssigned = Boolean(
//     event.approval?.platformFeeAssigned || event.platformFees?.length,
//   );

//   const platformFeeAssignedAt = approvalRecord?.platformFeeAssignedAt
//     ? String(approvalRecord.platformFeeAssignedAt)
//     : undefined;

//   const platformFeeAcceptedAt = approvalRecord?.platformFeeAcceptedAt
//     ? String(approvalRecord.platformFeeAcceptedAt)
//     : undefined;

//   const platformFeeStatus: UnifiedPlatformFeeState = platformFeeAcceptedAt
//     ? "accepted"
//     : platformFeeAssigned
//       ? "fee_pending"
//       : normalizedPlatformFee.status;

//   const platformFees: UnifiedPlatformFee = {
//     ...normalizedPlatformFee,
//     visibleToOrganizer: platformFeeAssigned || normalizedPlatformFee.visibleToOrganizer,
//     status: platformFeeStatus,
//     assignedBy: platformFeeAssigned
//       ? String(approvalRecord?.reviewedBy ?? normalizedPlatformFee.assignedBy ?? "Admin")
//       : normalizedPlatformFee.assignedBy,
//     assignedAt: platformFeeAssignedAt ?? normalizedPlatformFee.assignedAt,
//     acceptedAt: platformFeeAcceptedAt ?? normalizedPlatformFee.acceptedAt,
//   };
//   return {
//     id: event.id,
//     slug: slugify(event.title || event.id),
//     title: event.title,
//     category: event.category,
//     subCategory: event.subCategory,
//     bookingType: event.bookingType,
//     pricingMode: event.pricingMode,
//     venues: event.venues ?? [],


//     organizerId: event.organizer?.id ?? "organizer-demo",
//     organizerName: event.organizer?.name ?? "Buizz Organizer",
//     status: normalizeEventStatus(event.status),
//     city: venue?.city || event.organizer?.city || "City pending",
//     venueName: venue?.venueName || "Venue pending",
//     venueAddress: venue?.address,
//     date: schedule?.date || "",
//     time: slot?.startTime || "",
//     endTime: slot?.endTime,
//     bannerImage: event.media?.bannerImage?.url,
//     gallery: event.media?.galleryImages?.map((image) => image.url).filter(Boolean) ?? [],
//     description: event.description || event.subtitle || "",
//     priceMin: prices.length ? Math.min(...prices) : 0,
//     priceMax: prices.length ? Math.max(...prices) : 0,
//     capacity,
//     ticketBlocks: blocks,
//     ratio: allocated
//       ? {
//         online: Math.round((online / allocated) * 100),
//         offline: Math.round((offline / allocated) * 100),
//         reserved: Math.round((reserved / allocated) * 100),
//       }
//       : { online: 0, offline: 0, reserved: 0 },
//     policies: [
//       ...(event.policies?.entryRules ?? []),
//       ...(event.policies?.customTerms ?? []),
//     ],
//     ticketDesignId: event.ticketDesign?.templateId,


//     platformFees,

//     history: Array.isArray(event.history)
//       ? event.history.map((item) => ({
//         id: item.id,
//         action: item.type,
//         message: item.description || item.title,
//         actor: item.createdByRole || item.createdBy,
//         createdAt: item.createdAt,
//       }))
//       : [],
//     approval: {
//       submittedAt: event.approval?.submittedAt,
//       approvedBy: event.approval?.reviewedRole === "admin" || event.approval?.reviewedRole === "super_admin" ? event.approval.reviewedBy : undefined,
//       approvedAt: event.status === "approved" || event.status === "published" ? event.approval?.reviewedAt : undefined,
//       rejectedBy: event.status === "rejected" ? event.approval?.reviewedBy : undefined,
//       rejectedAt: event.status === "rejected" ? event.approval?.reviewedAt : undefined,
//       rejectedReason: event.approval?.rejectionReason,
//     },
//     createdAt: event.createdAt,
//     updatedAt: event.updatedAt,
//   };
// }

// function normalizeUnifiedPlatformFee(value: unknown): UnifiedPlatformFee {
//   if (!value || typeof value !== "object") {
//     return {
//       type: "fixed",
//       value: 0,
//       visibleToOrganizer: false,
//       status: "not_assigned",
//     };
//   }

//   const candidate = value as Record<string, unknown>;

//   const type: UnifiedPlatformFee["type"] =
//     candidate.type === "percentage" ||
//       candidate.feeType === "percentage" ||
//       candidate.mode === "percentage"
//       ? "percentage"
//       : "fixed";

//   const status: UnifiedPlatformFeeState =
//     candidate.status === "fee_pending" ||
//       candidate.status === "accepted" ||
//       candidate.status === "rejected_or_clarification" ||
//       candidate.status === "not_assigned"
//       ? candidate.status
//       : "not_assigned";

//   return {
//     type,
//     value: Number(
//       candidate.value ??
//       candidate.amount ??
//       candidate.feeAmount ??
//       candidate.platformFee ??
//       0,
//     ),
//     visibleToOrganizer: Boolean(candidate.visibleToOrganizer),
//     status,
//     assignedBy: candidate.assignedBy ? String(candidate.assignedBy) : undefined,
//     assignedAt: candidate.assignedAt ? String(candidate.assignedAt) : undefined,
//     acceptedAt: candidate.acceptedAt ? String(candidate.acceptedAt) : undefined,
//   };
// }

// function normalizeUnifiedHistory(value: unknown) {
//   if (!Array.isArray(value)) return [];

//   return value
//     .filter((item) => item && typeof item === "object")
//     .map((item, index) => {
//       const candidate = item as Record<string, unknown>;

//       return {
//         id: String(candidate.id ?? `history-${Date.now()}-${index}`),
//         action: String(candidate.action ?? "updated"),
//         message: String(candidate.message ?? "Event updated"),
//         actor: String(candidate.actor ?? "System"),
//         createdAt: String(candidate.createdAt ?? new Date().toISOString()),
//       };
//     });
// }

// export function normalizeUnifiedEvent(value: unknown): UnifiedBuizzEvent | null {
//   if (!value || typeof value !== "object") return null;
//   const candidate = value as Partial<UnifiedBuizzEvent>;
//   if (!candidate.id && !candidate.title) return null;
//   const ticketBlocks = Array.isArray(candidate.ticketBlocks)
//     ? candidate.ticketBlocks.map(normalizeUnifiedTicketBlock).filter(Boolean) as UnifiedTicketBlock[]
//     : [];
//   const now = new Date().toISOString();

//   return {
//     id: String(candidate.id ?? `event-${slugify(String(candidate.title))}`),
//     slug: String(candidate.slug ?? slugify(String(candidate.title ?? candidate.id ?? "event"))),
//     title: String(candidate.title ?? "Untitled Event"),
//     category: String(candidate.category ?? "event"),
//     subCategory: candidate.subCategory ? String(candidate.subCategory) : undefined,
//     organizerId: String(candidate.organizerId ?? "organizer-demo"),
//     organizerName: String(candidate.organizerName ?? "Buizz Organizer"),
//     status: normalizeEventStatus(candidate.status),
//     city: String(candidate.city ?? "City pending"),
//     venueName: String(candidate.venueName ?? "Venue pending"),
//     venueAddress: candidate.venueAddress ? String(candidate.venueAddress) : undefined,
//     date: String(candidate.date ?? ""),
//     time: String(candidate.time ?? ""),
//     endDate: candidate.endDate ? String(candidate.endDate) : undefined,
//     endTime: candidate.endTime ? String(candidate.endTime) : undefined,
//     bannerImage: candidate.bannerImage ? String(candidate.bannerImage) : undefined,
//     gallery: Array.isArray(candidate.gallery) ? candidate.gallery.map(String) : [],
//     description: String(candidate.description ?? ""),
//     priceMin: Number(candidate.priceMin ?? 0),
//     priceMax: Number(candidate.priceMax ?? 0),
//     capacity: Number(candidate.capacity ?? ticketBlocks.reduce((sum, block) => sum + block.totalQuantity, 0)),
//     ticketBlocks,
//     ratio: {
//       online: Number(candidate.ratio?.online ?? 0),
//       offline: Number(candidate.ratio?.offline ?? 0),
//       reserved: Number(candidate.ratio?.reserved ?? 0),
//     },
//     policies: Array.isArray(candidate.policies) ? candidate.policies.map(String) : [],
//     ticketDesignId: candidate.ticketDesignId ? String(candidate.ticketDesignId) : undefined,
//     platformFees: normalizeUnifiedPlatformFee(candidate.platformFees),
//     history: normalizeUnifiedHistory(candidate.history),
//     approval: candidate.approval,
//     createdAt: String(candidate.createdAt ?? now),
//     updatedAt: String(candidate.updatedAt ?? now),
//   };
// }

// export function normalizeLegacyOrganizerEvent(value: unknown): UnifiedBuizzEvent | null {
//   if (!value || typeof value !== "object") return null;
//   const candidate = value as LegacyOrganizerEventSummary;
//   if (!candidate.id && !candidate.name && !candidate.title) return null;
//   const now = new Date().toISOString();
//   const blocks = Array.isArray(candidate.seatBlocks)
//     ? candidate.seatBlocks.map((block, index) => ({
//       id: `legacy-block-${index}`,
//       name: String(block.name ?? "Entry Pass"),
//       price: parseNumber(block.price),
//       totalQuantity: parseNumber(block.capacity),
//       onlineQuantity: parseNumber(block.capacity),
//       offlineQuantity: 0,
//       reservedQuantity: 0,
//     }))
//     : [];
//   const prices = blocks.map((block) => block.price).filter((price) => price > 0);
//   return {
//     id: String(candidate.id ?? `legacy-${slugify(String(candidate.name ?? candidate.title))}`),
//     slug: slugify(String(candidate.name ?? candidate.title ?? candidate.id ?? "event")),
//     title: String(candidate.name ?? candidate.title ?? "Untitled Event"),
//     category: String(candidate.category ?? "event"),
//     organizerId: "organizer-demo",
//     organizerName: "Buizz Organizer",
//     status: normalizeEventStatus(candidate.status),
//     city: String(candidate.city ?? "City pending"),
//     venueName: String(candidate.venue ?? candidate.venueName ?? "Venue pending"),
//     venueAddress: candidate.address,
//     date: String(candidate.date ?? ""),
//     time: String(candidate.time ?? ""),
//     bannerImage: candidate.banner,
//     description: String(candidate.description ?? ""),
//     priceMin: prices.length ? Math.min(...prices) : 0,
//     priceMax: prices.length ? Math.max(...prices) : 0,
//     capacity: blocks.reduce((sum, block) => sum + block.totalQuantity, 0),
//     ticketBlocks: blocks,
//     ratio: { online: 100, offline: 0, reserved: 0 },
//     platformFees: { type: "fixed", value: 0, visibleToOrganizer: false, status: "not_assigned" },
//     history: [],
//     approval: {
//       submittedAt: candidate.submittedAt,
//       rejectedReason: candidate.rejectionReason,
//     },
//     createdAt: String(candidate.createdAt ?? now),
//     updatedAt: now,
//   };
// }

// export function readUnifiedEvents(): UnifiedBuizzEvent[] {
//   const phase3Events = typeof window === "undefined" ? [] : loadPhase3EventsFromStorage(window.localStorage).map(normalizeBuizzEvent);
//   const unifiedEvents = readStorageArray<unknown>(buizzIntegrationStorageKeys.unifiedEvents)
//     .map(normalizeUnifiedEvent)
//     .filter(Boolean) as UnifiedBuizzEvent[];
//   const legacyEvents = readStorageArray<unknown>(LEGACY_ORGANIZER_EVENTS_STORAGE_KEY)
//     .map(normalizeLegacyOrganizerEvent)
//     .filter(Boolean) as UnifiedBuizzEvent[];

//   return uniqueBy([...phase3Events, ...unifiedEvents, ...legacyEvents], (event) => event.id);
// }

// export function saveUnifiedEvent(event: UnifiedBuizzEvent) {
//   upsertStorageRecord(buizzIntegrationStorageKeys.unifiedEvents, event, (item) => item.id);
// }

// export function saveBuizzEventToIntegration(event: BuizzEvent) {
//   saveUnifiedEvent(normalizeBuizzEvent(event));
//   if (typeof window !== "undefined") savePhase3EventToStorage(event, window.localStorage);
// }

// export function updateUnifiedEventStatus(
//   eventId: string,
//   status: UnifiedEventStatus,
//   metadata: Partial<UnifiedBuizzEvent["approval"]> = {},
// ) {
//   const next = readUnifiedEvents().map((event) =>
//     event.id === eventId
//       ? {
//         ...event,
//         status,
//         approval: { ...event.approval, ...metadata },
//         updatedAt: new Date().toISOString(),
//       }
//       : event,
//   );
//   writeStorageValue(buizzIntegrationStorageKeys.unifiedEvents, next);
//   updatePhase3Status(eventId, status, metadata);
//   return next.find((event) => event.id === eventId) ?? null;
// }

// export function readPublishedEvents() {
//   return readUnifiedEvents().filter((event) => event.status === "published");
// }

// export function readPendingApprovalEvents() {
//   return readUnifiedEvents().filter((event) => event.status === "pending_review");
// }

// export function readOrganizerEvents(organizerId?: string) {
//   const events = readUnifiedEvents();
//   return organizerId ? events.filter((event) => event.organizerId === organizerId) : events;
// }

// function normalizeTicketBlock(block: TicketBlock): UnifiedTicketBlock {
//   return {
//     id: block.blockId,
//     name: block.name,
//     price: Number(block.price ?? 0),
//     totalQuantity: Number(block.totalQuantity ?? 0),
//     onlineQuantity: Number(block.onlineQuantity ?? 0),
//     offlineQuantity: Number(block.offlineQuantity ?? 0),
//     reservedQuantity: Number(block.reservedQuantity ?? 0),
//   };
// }

// function normalizeUnifiedTicketBlock(value: unknown): UnifiedTicketBlock | null {
//   if (!value || typeof value !== "object") return null;
//   const block = value as Partial<UnifiedTicketBlock>;
//   return {
//     id: String(block.id ?? block.name ?? "ticket-block"),
//     name: String(block.name ?? "Entry Pass"),
//     price: Number(block.price ?? 0),
//     totalQuantity: Number(block.totalQuantity ?? 0),
//     onlineQuantity: Number(block.onlineQuantity ?? 0),
//     offlineQuantity: Number(block.offlineQuantity ?? 0),
//     reservedQuantity: Number(block.reservedQuantity ?? 0),
//   };
// }

// function updatePhase3Status(eventId: string, status: UnifiedEventStatus, metadata: Partial<UnifiedBuizzEvent["approval"]>) {
//   if (typeof window === "undefined") return;
//   const mappedStatus: EventStatus =
//     status === "pending_review" ? "pending_review" :
//       status === "published" ? "published" :
//         status === "approved" ? "approved" :
//           status === "rejected" ? "rejected" :
//             status === "cancelled" ? "cancelled" :
//               status === "completed" ? "completed" :
//                 "draft";
//   const events = loadPhase3EventsFromStorage(window.localStorage).map((event) =>
//     event.id === eventId
//       ? {
//         ...event,
//         status: mappedStatus,
//         approval: {
//           ...event.approval,
//           reviewedBy: metadata?.approvedBy ?? metadata?.rejectedBy ?? event.approval.reviewedBy,
//           reviewedAt: metadata?.approvedAt ?? metadata?.rejectedAt ?? event.approval.reviewedAt,
//           rejectionReason: metadata?.rejectedReason ?? event.approval.rejectionReason,
//         },
//         updatedAt: new Date().toISOString(),
//       }
//       : event,
//   );
//   writeStorageValue(PHASE3_EVENTS_STORAGE_KEY, events);
// }

// function parseNumber(value: unknown) {
//   const next = Number(String(value ?? "0").replace(/[^0-9.]/g, ""));
//   return Number.isFinite(next) ? next : 0;
// }

// function slugify(value: string) {
//   return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
// }




"use client";

import {
  LEGACY_ORGANIZER_EVENTS_STORAGE_KEY,
  PHASE3_EVENTS_STORAGE_KEY,
  loadPhase3EventsFromStorage,
  savePhase3EventToStorage,
} from "@/features/events";
import type {
  BookingType,
  BuizzEvent,
  EventSeatMapMode,
  EventSeatMapSummary,
  EventScheduleSeatMapConfig,
  EventLifecycleMetadata,
  EventStatus,
  EventVenue,
  EventVenueSeatMapConfig,
  PricingMode,
  TicketBlock,
} from "@/features/events";

import {
  buizzIntegrationStorageKeys,
  readStorageArray,
  uniqueBy,
  upsertStorageRecord,
  writeStorageValue,
} from "./frontendStorage";

export type UnifiedEventStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "rejected"
  | "cancelled"
  | "completed"
  | "expired";

export type UnifiedPlatformFeeState = "not_assigned" | "fee_pending" | "accepted" | "rejected_or_clarification";

export type UnifiedPlatformFee = {
  type: "fixed" | "percentage";
  value: number;
  visibleToOrganizer: boolean;
  status: UnifiedPlatformFeeState;
  assignedBy?: string;
  assignedAt?: string;
  acceptedAt?: string;
};

export type UnifiedEventHistoryItem = {
  id: string;
  action: string;
  message: string;
  actor: string;
  createdAt: string;
};

export type UnifiedTicketBlock = {
  id: string;
  name: string;
  price: number;
  totalQuantity: number;
  onlineQuantity: number;
  offlineQuantity: number;
  reservedQuantity: number;
};

export type UnifiedSeatMapMode = EventSeatMapMode;
export type UnifiedSeatMapSummary = EventSeatMapSummary;
export type UnifiedVenueSeatMapConfig = EventVenueSeatMapConfig;
export type UnifiedScheduleSeatMapConfig = EventScheduleSeatMapConfig;

export type UnifiedBuizzEvent = {
  id: string;
  slug: string;
  title: string;
  category: "event" | "play" | "activity" | string;
  subCategory?: string;
  bookingType?: BookingType;
  pricingMode?: PricingMode;
  venues?: EventVenue[];
  organizerId: string;
  organizerName: string;
  status: UnifiedEventStatus;
  seatMapMode?: UnifiedSeatMapMode;
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  seatMapSummary?: UnifiedSeatMapSummary;
  venueSeatMaps?: UnifiedVenueSeatMapConfig[];
  scheduleSeatMaps?: UnifiedScheduleSeatMapConfig[];
  city: string;
  venueName: string;
  venueAddress?: string;
  date: string;
  time: string;
  duration?: string;
  endDate?: string;
  endTime?: string;
  bannerImage?: string;
  gallery?: string[];
  organizerLogo?: string;
  logoUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  socialLinks?: NonNullable<BuizzEvent["media"]>["socialLinks"];
  media?: BuizzEvent["media"];
  description: string;
  priceMin: number;
  priceMax: number;
  capacity: number;
  ticketBlocks: UnifiedTicketBlock[];
  ratio: {
    online: number;
    offline: number;
    reserved: number;
  };
  policies?: string[];
  ticketDesignId?: string;
  lifecycleMetadata?: EventLifecycleMetadata;
  platformFees?: UnifiedPlatformFee;
  history?: UnifiedEventHistoryItem[];
  approval?: {
    currentStatus?: UnifiedEventStatus;
    submittedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectedReason?: string;
    reviewedBy?: string;
    reviewedRole?: string;
    reviewedAt?: string;
    reviewerComment?: string;
  };
  visibility?: Partial<BuizzEvent["visibility"]>;
  createdAt: string;
  updatedAt: string;
};

type LegacyOrganizerEventSummary = {
  id?: string;
  name?: string;
  title?: string;
  category?: string;
  city?: string;
  venue?: string;
  venueName?: string;
  address?: string;
  date?: string;
  time?: string;
  banner?: string;
  description?: string;
  priceRange?: string;
  status?: string;
  seatBlocks?: Array<{ name?: string; price?: string; capacity?: string }>;
  createdAt?: string;
  submittedAt?: string;
  rejectionReason?: string;
};

const lifecycleStatusMap: Record<string, UnifiedEventStatus> = {
  draft: "draft",
  "Draft": "draft",
  submitted: "pending_review",
  "Submitted": "pending_review",
  under_review: "pending_review",
  "Under Review": "pending_review",
  pending_review: "pending_review",
  "Pending Review": "pending_review",
  "Needs Super Admin Review": "pending_review",
  changes_requested: "changes_requested",
  "Changes Requested": "changes_requested",
  approved: "approved",
  "Approved": "approved",
  published: "published",
  "Published": "published",
  rejected: "rejected",
  "Rejected": "rejected",
  cancelled: "cancelled",
  "Cancelled": "cancelled",
  completed: "completed",
  "Completed": "completed",
  expired: "expired",
  "Expired": "expired",
  history: "completed",
  "History": "completed",
};

export function normalizeEventStatus(value: unknown): UnifiedEventStatus {
  return lifecycleStatusMap[String(value ?? "")] ?? "draft";
}

function normalizeBookingType(value: unknown): BookingType | undefined {
  if (
    value === "seated" ||
    value === "theatre_seating" ||
    value === "block_seating" ||
    value === "capacity" ||
    value === "slot_based" ||
    value === "free_registration"
  ) {
    return value;
  }

  return undefined;
}

function normalizePricingMode(
  value: unknown,
  ticketBlocks: UnifiedTicketBlock[] = [],
  fallbackPrice?: unknown,
): PricingMode | undefined {
  if (value === "paid" || value === "free") return value;

  const prices = ticketBlocks.map((block) => block.price).filter((price) => price > 0);
  const price = Number(fallbackPrice ?? (prices.length ? Math.min(...prices) : 0));
  return price <= 0 ? "free" : "paid";
}

function normalizeSeatMapMode(value: unknown): UnifiedSeatMapMode | undefined {
  if (value === "capacity_only" || value === "seat_map") return value;
  return undefined;
}

function normalizeSeatMapSummary(value: unknown): UnifiedSeatMapSummary | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<UnifiedSeatMapSummary>;
  return {
    totalCapacity: Number(candidate.totalCapacity ?? 0),
    activeSeats: Number(candidate.activeSeats ?? 0),
    blockedSeats: Number(candidate.blockedSeats ?? 0),
    reservedSeats: Number(candidate.reservedSeats ?? 0),
    soldSeats: candidate.soldSeats === undefined ? undefined : Number(candidate.soldSeats),
    tierCount: Number(candidate.tierCount ?? 0),
  };
}

function normalizeVenueSeatMaps(value: unknown): UnifiedVenueSeatMapConfig[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map((item) => ({
    venueId: String(item.venueId ?? ""),
    venueName: String(item.venueName ?? "Venue pending"),
    city: String(item.city ?? "City pending"),
    address: item.address ? String(item.address) : undefined,
    seatMapMode: normalizeSeatMapMode(item.seatMapMode) ?? "capacity_only",
    seatMapTemplateId: item.seatMapTemplateId ? String(item.seatMapTemplateId) : undefined,
    seatMapOverrideId: item.seatMapOverrideId ? String(item.seatMapOverrideId) : undefined,
    totalCapacity: Number(item.totalCapacity ?? 0),
    activeSeats: Number(item.activeSeats ?? 0),
    blockedSeats: Number(item.blockedSeats ?? 0),
    reservedSeats: Number(item.reservedSeats ?? 0),
    soldSeats: item.soldSeats === undefined ? undefined : Number(item.soldSeats),
    ticketTiers: Array.isArray(item.ticketTiers)
      ? item.ticketTiers.filter((tier): tier is Record<string, unknown> => Boolean(tier && typeof tier === "object")).map((tier) => ({
          tierId: String(tier.tierId ?? tier.id ?? ""),
          name: String(tier.name ?? "General"),
          price: Number(tier.price ?? 0),
          color: String(tier.color ?? "#6626B9"),
          capacity: Number(tier.capacity ?? 0),
          soldCount: tier.soldCount === undefined ? undefined : Number(tier.soldCount),
        }))
      : [],
  }));
}

function normalizeScheduleSeatMaps(value: unknown): UnifiedScheduleSeatMapConfig[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map((item) => {
    const snapshot = item.availabilitySnapshot && typeof item.availabilitySnapshot === "object"
      ? item.availabilitySnapshot as Record<string, unknown>
      : undefined;
    return {
      scheduleId: String(item.scheduleId ?? ""),
      venueId: String(item.venueId ?? ""),
      date: String(item.date ?? ""),
      startTime: String(item.startTime ?? ""),
      endTime: item.endTime ? String(item.endTime) : undefined,
      seatMapTemplateId: item.seatMapTemplateId ? String(item.seatMapTemplateId) : undefined,
      seatMapOverrideId: item.seatMapOverrideId ? String(item.seatMapOverrideId) : undefined,
      availabilitySnapshot: snapshot
        ? {
            availableSeats: Number(snapshot.availableSeats ?? 0),
            soldSeats: Number(snapshot.soldSeats ?? 0),
            lockedSeats: Number(snapshot.lockedSeats ?? 0),
            blockedSeats: Number(snapshot.blockedSeats ?? 0),
            reservedSeats: Number(snapshot.reservedSeats ?? 0),
          }
        : undefined,
    };
  });
}

export function normalizeBuizzEvent(event: BuizzEvent): UnifiedBuizzEvent {
  const venue = event.venues?.[0];
  const schedule = venue?.schedules?.[0];
  const slot = schedule?.timeSlots?.[0];
  const blocks = Array.isArray(event.ticketBlocks) ? event.ticketBlocks.map(normalizeTicketBlock) : [];
  const prices = blocks.map((block) => block.price).filter((price) => price > 0);
  const capacity = event.capacityConfig?.totalCapacity ?? blocks.reduce((sum, block) => sum + block.totalQuantity, 0);
  const online = blocks.reduce((sum, block) => sum + block.onlineQuantity, 0);
  const offline = blocks.reduce((sum, block) => sum + block.offlineQuantity, 0);
  const reserved = blocks.reduce((sum, block) => sum + block.reservedQuantity, 0);
  const allocated = online + offline + reserved;
  const approvalRecord = event.approval as Record<string, unknown> | undefined;
  const firstPlatformFee = Array.isArray(event.platformFees) ? event.platformFees[0] : undefined;
  const normalizedPlatformFee = normalizeUnifiedPlatformFee(firstPlatformFee);

  const platformFeeAssigned = Boolean(
    event.approval?.platformFeeAssigned || event.platformFees?.length,
  );

  const platformFeeAssignedAt = approvalRecord?.platformFeeAssignedAt
    ? String(approvalRecord.platformFeeAssignedAt)
    : undefined;

  const platformFeeAcceptedAt = approvalRecord?.platformFeeAcceptedAt
    ? String(approvalRecord.platformFeeAcceptedAt)
    : undefined;

  const platformFeeStatus: UnifiedPlatformFeeState = platformFeeAcceptedAt
    ? "accepted"
    : platformFeeAssigned
      ? "fee_pending"
      : normalizedPlatformFee.status;

  const platformFees: UnifiedPlatformFee = {
    ...normalizedPlatformFee,
    visibleToOrganizer: platformFeeAssigned || normalizedPlatformFee.visibleToOrganizer,
    status: platformFeeStatus,
    assignedBy: platformFeeAssigned
      ? String(approvalRecord?.reviewedBy ?? normalizedPlatformFee.assignedBy ?? "Admin")
      : normalizedPlatformFee.assignedBy,
    assignedAt: platformFeeAssignedAt ?? normalizedPlatformFee.assignedAt,
    acceptedAt: platformFeeAcceptedAt ?? normalizedPlatformFee.acceptedAt,
  };
  return {
    id: event.id,
    slug: slugify(event.title || event.id),
    title: event.title,
    category: event.category,
    subCategory: event.subCategory,
    bookingType: normalizeBookingType(event.bookingType),
    pricingMode: normalizePricingMode(event.pricingMode, blocks, prices.length ? Math.min(...prices) : 0),
    venues: event.venues ?? [],


    organizerId: event.organizer?.id ?? "organizer-demo",
    organizerName: event.organizer?.name ?? "Buizz Organizer",
    status: normalizeEventStatus(event.status),
    seatMapMode: event.seatMapMode,
    seatMapTemplateId: event.seatMapTemplateId,
    seatMapOverrideId: event.seatMapOverrideId,
    seatMapSummary: event.seatMapSummary,
    venueSeatMaps: event.venueSeatMaps ?? [],
    scheduleSeatMaps: event.scheduleSeatMaps ?? [],
    city: venue?.city || event.organizer?.city || "City pending",
    venueName: venue?.venueName || "Venue pending",
    venueAddress: venue?.address,
    date: schedule?.date || "",
    time: slot?.startTime || "",
    duration: event.duration,
    endTime: slot?.endTime,
    bannerImage: event.media?.bannerImage?.url,
    gallery: event.media?.galleryImages?.map((image) => image.url).filter(Boolean) ?? [],
    organizerLogo: event.media?.organizerLogo?.url,
    logoUrl: event.media?.organizerLogo?.url,
    videoUrl: event.media?.videoUrl,
    youtubeUrl: event.media?.videoUrl,
    socialLinks: event.media?.socialLinks ?? [],
    media: event.media,
    description: event.description || event.subtitle || "",
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
    policies: [
      ...(event.policies?.entryRules ?? []),
      ...(event.policies?.customTerms ?? []),
    ],
    ticketDesignId: event.ticketDesign?.templateId,
    lifecycleMetadata: event.lifecycleMetadata,


    platformFees,

    history: Array.isArray(event.history)
      ? event.history.map((item) => ({
        id: item.id,
        action: item.type,
        message: item.description || item.title,
        actor: item.createdByRole || item.createdBy,
        createdAt: item.createdAt,
      }))
      : [],
    approval: {
      currentStatus: normalizeEventStatus(event.approval?.currentStatus ?? event.status),
      submittedAt: event.approval?.submittedAt,
      approvedBy: event.approval?.reviewedRole === "admin" || event.approval?.reviewedRole === "super_admin" ? event.approval.reviewedBy : undefined,
      approvedAt: event.status === "approved" || event.status === "published" ? event.approval?.reviewedAt : undefined,
      rejectedBy: event.status === "rejected" ? event.approval?.reviewedBy : undefined,
      rejectedAt: event.status === "rejected" ? event.approval?.reviewedAt : undefined,
      rejectedReason: event.approval?.rejectionReason,
      reviewedBy: event.approval?.reviewedBy,
      reviewedRole: event.approval?.reviewedRole,
      reviewedAt: event.approval?.reviewedAt,
      reviewerComment: event.approval?.approvalNotes ?? event.approval?.rejectionReason,
    },
    visibility: event.visibility,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function normalizeUnifiedPlatformFee(value: unknown): UnifiedPlatformFee {
  if (!value || typeof value !== "object") {
    return {
      type: "fixed",
      value: 0,
      visibleToOrganizer: false,
      status: "not_assigned",
    };
  }

  const candidate = value as Record<string, unknown>;

  const type: UnifiedPlatformFee["type"] =
    candidate.type === "percentage" ||
      candidate.feeType === "percentage" ||
      candidate.mode === "percentage"
      ? "percentage"
      : "fixed";

  const status: UnifiedPlatformFeeState =
    candidate.status === "fee_pending" ||
      candidate.status === "accepted" ||
      candidate.status === "rejected_or_clarification" ||
      candidate.status === "not_assigned"
      ? candidate.status
      : "not_assigned";

  return {
    type,
    value: Number(
      candidate.value ??
      candidate.amount ??
      candidate.feeAmount ??
      candidate.platformFee ??
      0,
    ),
    visibleToOrganizer: Boolean(candidate.visibleToOrganizer),
    status,
    assignedBy: candidate.assignedBy ? String(candidate.assignedBy) : undefined,
    assignedAt: candidate.assignedAt ? String(candidate.assignedAt) : undefined,
    acceptedAt: candidate.acceptedAt ? String(candidate.acceptedAt) : undefined,
  };
}

function normalizeUnifiedHistory(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const candidate = item as Record<string, unknown>;

      return {
        id: String(candidate.id ?? `history-${Date.now()}-${index}`),
        action: String(candidate.action ?? "updated"),
        message: String(candidate.message ?? "Event updated"),
        actor: String(candidate.actor ?? "System"),
        createdAt: String(candidate.createdAt ?? new Date().toISOString()),
      };
    });
}

export function normalizeUnifiedEvent(value: unknown): UnifiedBuizzEvent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<UnifiedBuizzEvent>;
  if (!candidate.id && !candidate.title) return null;
  const ticketBlocks = Array.isArray(candidate.ticketBlocks)
    ? candidate.ticketBlocks.map(normalizeUnifiedTicketBlock).filter(Boolean) as UnifiedTicketBlock[]
    : [];
  const now = new Date().toISOString();

  return {
    id: String(candidate.id ?? `event-${slugify(String(candidate.title))}`),
    slug: String(candidate.slug ?? slugify(String(candidate.title ?? candidate.id ?? "event"))),
    title: String(candidate.title ?? "Untitled Event"),
    category: String(candidate.category ?? "event"),
    subCategory: candidate.subCategory ? String(candidate.subCategory) : undefined,
    bookingType: normalizeBookingType(candidate.bookingType),
    pricingMode: normalizePricingMode(candidate.pricingMode, ticketBlocks, candidate.priceMin),
    venues: Array.isArray(candidate.venues) ? candidate.venues : [],
    organizerId: String(candidate.organizerId ?? "organizer-demo"),
    organizerName: String(candidate.organizerName ?? "Buizz Organizer"),
    status: normalizeEventStatus(candidate.status),
    seatMapMode: normalizeSeatMapMode(candidate.seatMapMode),
    seatMapTemplateId: candidate.seatMapTemplateId ? String(candidate.seatMapTemplateId) : undefined,
    seatMapOverrideId: candidate.seatMapOverrideId ? String(candidate.seatMapOverrideId) : undefined,
    seatMapSummary: normalizeSeatMapSummary(candidate.seatMapSummary),
    venueSeatMaps: normalizeVenueSeatMaps(candidate.venueSeatMaps),
    scheduleSeatMaps: normalizeScheduleSeatMaps(candidate.scheduleSeatMaps),
    city: String(candidate.city ?? "City pending"),
    venueName: String(candidate.venueName ?? "Venue pending"),
    venueAddress: candidate.venueAddress ? String(candidate.venueAddress) : undefined,
    date: String(candidate.date ?? ""),
    time: String(candidate.time ?? ""),
    duration: candidate.duration ? String(candidate.duration) : undefined,
    endDate: candidate.endDate ? String(candidate.endDate) : undefined,
    endTime: candidate.endTime ? String(candidate.endTime) : undefined,
    bannerImage: candidate.bannerImage ? String(candidate.bannerImage) : undefined,
    gallery: Array.isArray(candidate.gallery) ? candidate.gallery.map(String) : [],
    organizerLogo: candidate.organizerLogo ? String(candidate.organizerLogo) : undefined,
    logoUrl: candidate.logoUrl ? String(candidate.logoUrl) : undefined,
    videoUrl: candidate.videoUrl ? String(candidate.videoUrl) : undefined,
    youtubeUrl: candidate.youtubeUrl ? String(candidate.youtubeUrl) : undefined,
    socialLinks: Array.isArray(candidate.socialLinks) ? candidate.socialLinks : [],
    media: candidate.media && typeof candidate.media === "object" && !Array.isArray(candidate.media)
      ? candidate.media
      : {
        bannerImage: candidate.bannerImage
          ? { id: "banner", url: String(candidate.bannerImage), alt: String(candidate.title ?? "Event banner"), type: "image" }
          : undefined,
        galleryImages: Array.isArray(candidate.gallery)
          ? candidate.gallery.map((url, index) => ({
            id: `gallery-${index + 1}`,
            url: String(url),
            alt: `${String(candidate.title ?? "Event")} gallery ${index + 1}`,
            type: "image" as const,
          }))
          : [],
        organizerLogo: candidate.organizerLogo || candidate.logoUrl
          ? { id: "organizer-logo", url: String(candidate.organizerLogo ?? candidate.logoUrl), alt: "Organizer logo", type: "logo" as const }
          : undefined,
        videoUrl: candidate.videoUrl ? String(candidate.videoUrl) : candidate.youtubeUrl ? String(candidate.youtubeUrl) : undefined,
        socialLinks: Array.isArray(candidate.socialLinks) ? candidate.socialLinks : [],
      },
    description: String(candidate.description ?? ""),
    priceMin: Number(candidate.priceMin ?? 0),
    priceMax: Number(candidate.priceMax ?? 0),
    capacity: Number(candidate.capacity ?? ticketBlocks.reduce((sum, block) => sum + block.totalQuantity, 0)),
    ticketBlocks,
    ratio: {
      online: Number(candidate.ratio?.online ?? 0),
      offline: Number(candidate.ratio?.offline ?? 0),
      reserved: Number(candidate.ratio?.reserved ?? 0),
    },
    policies: Array.isArray(candidate.policies) ? candidate.policies.map(String) : [],
    ticketDesignId: candidate.ticketDesignId ? String(candidate.ticketDesignId) : undefined,
    lifecycleMetadata: candidate.lifecycleMetadata,
    platformFees: normalizeUnifiedPlatformFee(candidate.platformFees),
    history: normalizeUnifiedHistory(candidate.history),
    approval: candidate.approval
      ? {
        ...candidate.approval,
        currentStatus: normalizeEventStatus(candidate.approval.currentStatus ?? candidate.status),
      }
      : { currentStatus: normalizeEventStatus(candidate.status) },
    visibility: candidate.visibility,
    createdAt: String(candidate.createdAt ?? now),
    updatedAt: String(candidate.updatedAt ?? now),
  };
}

export function normalizeLegacyOrganizerEvent(value: unknown): UnifiedBuizzEvent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as LegacyOrganizerEventSummary;
  if (!candidate.id && !candidate.name && !candidate.title) return null;
  const now = new Date().toISOString();
  const blocks = Array.isArray(candidate.seatBlocks)
    ? candidate.seatBlocks.map((block, index) => ({
      id: `legacy-block-${index}`,
      name: String(block.name ?? "Entry Pass"),
      price: parseNumber(block.price),
      totalQuantity: parseNumber(block.capacity),
      onlineQuantity: parseNumber(block.capacity),
      offlineQuantity: 0,
      reservedQuantity: 0,
    }))
    : [];
  const prices = blocks.map((block) => block.price).filter((price) => price > 0);
  return {
    id: String(candidate.id ?? `legacy-${slugify(String(candidate.name ?? candidate.title))}`),
    slug: slugify(String(candidate.name ?? candidate.title ?? candidate.id ?? "event")),
    title: String(candidate.name ?? candidate.title ?? "Untitled Event"),
    category: String(candidate.category ?? "event"),
    bookingType: "capacity",
    pricingMode: prices.length ? "paid" : "free",
    venues: [],
    organizerId: "organizer-demo",
    organizerName: "Buizz Organizer",
    status: normalizeEventStatus(candidate.status),
    seatMapMode: "capacity_only",
    venueSeatMaps: [],
    scheduleSeatMaps: [],
    city: String(candidate.city ?? "City pending"),
    venueName: String(candidate.venue ?? candidate.venueName ?? "Venue pending"),
    venueAddress: candidate.address,
    date: String(candidate.date ?? ""),
    time: String(candidate.time ?? ""),
    bannerImage: candidate.banner,
    description: String(candidate.description ?? ""),
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    capacity: blocks.reduce((sum, block) => sum + block.totalQuantity, 0),
    ticketBlocks: blocks,
    ratio: { online: 100, offline: 0, reserved: 0 },
    platformFees: { type: "fixed", value: 0, visibleToOrganizer: false, status: "not_assigned" },
    history: [],
    approval: {
      currentStatus: normalizeEventStatus(candidate.status),
      submittedAt: candidate.submittedAt,
      rejectedReason: candidate.rejectionReason,
    },
    visibility: { isPublic: normalizeEventStatus(candidate.status) === "published" },
    createdAt: String(candidate.createdAt ?? now),
    updatedAt: now,
  };
}

export function readUnifiedEvents(): UnifiedBuizzEvent[] {
  // This function now returns empty array - use RTK Query hooks from platformApi instead
  // Import and use: useGetEventsQuery, useGetEventByIdQuery, useGetEventBySlugQuery
  return [];
}

export function saveUnifiedEvent(event: UnifiedBuizzEvent) {
  upsertStorageRecord(buizzIntegrationStorageKeys.unifiedEvents, event, (item) => item.id);
}

export function deleteUnifiedEvent(eventId: string) {
  const matchesDifferentEvent = (item: { id?: unknown }) => String(item.id ?? "") !== eventId;

  writeStorageValue(
    buizzIntegrationStorageKeys.unifiedEvents,
    readStorageArray<{ id?: unknown }>(buizzIntegrationStorageKeys.unifiedEvents).filter(matchesDifferentEvent),
  );
  writeStorageValue(
    PHASE3_EVENTS_STORAGE_KEY,
    readStorageArray<{ id?: unknown }>(PHASE3_EVENTS_STORAGE_KEY).filter(matchesDifferentEvent),
  );
  writeStorageValue(
    LEGACY_ORGANIZER_EVENTS_STORAGE_KEY,
    readStorageArray<{ id?: unknown }>(LEGACY_ORGANIZER_EVENTS_STORAGE_KEY).filter(matchesDifferentEvent),
  );
}

export function saveBuizzEventToIntegration(event: BuizzEvent) {
  saveUnifiedEvent(normalizeBuizzEvent(event));
  if (typeof window !== "undefined") savePhase3EventToStorage(event, window.localStorage);
}

export function updateUnifiedEventStatus(
  eventId: string,
  status: UnifiedEventStatus,
  metadata: Partial<UnifiedBuizzEvent["approval"]> = {},
) {
  const now = new Date().toISOString();
  const next = readUnifiedEvents().map((event) =>
    event.id === eventId
      ? {
        ...event,
        status,
        approval: { ...event.approval, currentStatus: status, ...metadata },
        visibility: {
          ...event.visibility,
          isPublic: status === "published" ? true : status === "completed" ? event.visibility?.isPublic : false,
          publicFrom: status === "published" ? event.visibility?.publicFrom ?? now : event.visibility?.publicFrom,
          hideReason:
            status === "published"
              ? undefined
              : status === "approved"
                ? "Approved but not published publicly."
                : status === "rejected"
                  ? "Rejected by Buizz review."
                  : status === "changes_requested"
                    ? "Changes requested by Buizz review."
                    : event.visibility?.hideReason,
        },
        updatedAt: now,
      }
      : event,
  );
  writeStorageValue(buizzIntegrationStorageKeys.unifiedEvents, next);
  updatePhase3Status(eventId, status, metadata);
  return next.find((event) => event.id === eventId) ?? null;
}

export function readPublishedEvents() {
  return readUnifiedEvents().filter((event) => (event.status === "published" || event.visibility?.isPublic === true) && !isUnifiedEventExpired(event));
}

export function readPendingApprovalEvents() {
  return readUnifiedEvents().filter((event) => event.status === "pending_review");
}

export function readOrganizerEvents(organizerId?: string) {
  const events = readUnifiedEvents();
  return organizerId ? events.filter((event) => event.organizerId === organizerId) : events;
}

function normalizeTicketBlock(block: TicketBlock): UnifiedTicketBlock {
  return {
    id: block.blockId,
    name: block.name,
    price: Number(block.price ?? 0),
    totalQuantity: Number(block.totalQuantity ?? 0),
    onlineQuantity: Number(block.onlineQuantity ?? 0),
    offlineQuantity: Number(block.offlineQuantity ?? 0),
    reservedQuantity: Number(block.reservedQuantity ?? 0),
  };
}

function normalizeUnifiedTicketBlock(value: unknown): UnifiedTicketBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Partial<UnifiedTicketBlock>;
  return {
    id: String(block.id ?? block.name ?? "ticket-block"),
    name: String(block.name ?? "Entry Pass"),
    price: Number(block.price ?? 0),
    totalQuantity: Number(block.totalQuantity ?? 0),
    onlineQuantity: Number(block.onlineQuantity ?? 0),
    offlineQuantity: Number(block.offlineQuantity ?? 0),
    reservedQuantity: Number(block.reservedQuantity ?? 0),
  };
}

function updatePhase3Status(eventId: string, status: UnifiedEventStatus, metadata: Partial<UnifiedBuizzEvent["approval"]>) {
  if (typeof window === "undefined") return;
  const mappedStatus: EventStatus =
    status === "pending_review" ? "pending_review" :
      status === "changes_requested" ? "changes_requested" :
      status === "published" ? "published" :
        status === "approved" ? "approved" :
          status === "rejected" ? "rejected" :
            status === "cancelled" ? "cancelled" :
              status === "completed" ? "completed" :
                status === "expired" ? "expired" :
                "draft";
  const events = loadPhase3EventsFromStorage(window.localStorage).map((event) =>
    event.id === eventId
      ? {
        ...event,
        status: mappedStatus,
        approval: {
          ...event.approval,
          currentStatus: mappedStatus,
          reviewedBy: metadata?.reviewedBy ?? metadata?.approvedBy ?? metadata?.rejectedBy ?? event.approval.reviewedBy,
          reviewedRole: metadata?.reviewedRole ?? event.approval.reviewedRole,
          reviewedAt: metadata?.reviewedAt ?? metadata?.approvedAt ?? metadata?.rejectedAt ?? event.approval.reviewedAt,
          rejectionReason: metadata?.rejectedReason ?? event.approval.rejectionReason,
          approvalNotes: metadata?.reviewerComment ?? event.approval.approvalNotes,
        },
        lifecycleMetadata:
          event.lifecycleMetadata &&
            (mappedStatus === "draft" ||
              mappedStatus === "pending_review" ||
              mappedStatus === "changes_requested" ||
              mappedStatus === "approved" ||
              mappedStatus === "rejected")
            ? {
              ...event.lifecycleMetadata,
              approvalBlockers: {
                ...event.lifecycleMetadata.approvalBlockers,
                eventReviewStatus: mappedStatus,
              },
            }
            : event.lifecycleMetadata,
        updatedAt: new Date().toISOString(),
      }
      : event,
  );
  writeStorageValue(PHASE3_EVENTS_STORAGE_KEY, events);
}

function parseNumber(value: unknown) {
  const next = Number(String(value ?? "0").replace(/[^0-9.]/g, ""));
  return Number.isFinite(next) ? next : 0;
}

function isUnifiedEventExpired(event: UnifiedBuizzEvent, now = new Date()) {
  if (!event.date) return false;
  const start = new Date(`${event.date}T${event.time || "00:00"}:00`);
  if (Number.isNaN(start.getTime())) return false;
  return start.getTime() + 30 * 60_000 <= now.getTime();
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}
