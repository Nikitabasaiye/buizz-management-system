"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Copy,
  ExternalLink,
  ImageIcon,
  Info,
  Link2,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  Upload,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getTicketRatioLockStatus } from "@/lib/ticketRatioLock";
import { ActionFeedback } from "@/components/common/ActionFeedback";
import { LoadingButton } from "@/components/common/LoadingButton";
import { cn } from "@/lib/cn";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { useCreateEventMutation, useSaveDraftMutation, useSubmitEventForReviewMutation, useUpdateEventMutation, useUploadEventImageMutation, type CreateEventBody } from "@/store/api/eventsApi";
import { getApiError } from "@/utils/apiError";
import { toastUtils } from "@/utils/toast";
import { BuizzBookingPass } from "@/features/tickets";
import {
  OrganizerSeatMapPersonalizationPanel,
  readOrganizerSeatMapSnapshot,
  type OrganizerSeatMapSnapshot,
} from "@/features/seat-map";
import type { SeatMapMode, SeatMapSummary } from "@/features/seat-map/seatMapTypes";
import {
  CATEGORY_BOOKING_RULES,
  DEFAULT_TICKET_BLOCK_NAMES,
  LEGACY_ORGANIZER_EVENTS_STORAGE_KEY,
  buildCapacityConfigFromInput,
  buildDefaultSeatSections,
  buildEventHistoryRecord,
  buildEventNotification,
  calculateCapacityAvailability,
  calculateInventoryTotals,
  calculateSectionAvailability,
  canEditRatio,
  createOrganizerSummaryFromEvent,
  getDefaultBookingType,
  getMediaVisibility,
  getRatioEditableUntil,
  isSeatMapRequired,
  loadPhase3EventsFromStorage,
  normalizeInventoryNumber,
  validateCapacityRatio,
  validateEventMedia,
  validateSectionInventory,
  type BookingType,
  type BuizzEvent,
  type CapacityConfig,
  type EventCategory,
  type EventMediaConfig,
  type EventVenue,
  type MediaAsset,
  type PricingMode,
  type RatioConfig,
  type SeatConfig,
  type SeatSection,
  type TicketBlock,
  type TicketDesignConfig,
  type VenueType,
} from "@/features/events";



import {
  normalizeEventStatus,
  readUnifiedEvents,
  saveBuizzEventToIntegration,
  type UnifiedBuizzEvent,
} from "@/features/integration";


type WizardStep = {
  id: WizardStepId;
  title: string;
  shortTitle: string;
};

type WizardStepId =
  | "basic"
  | "category"
  | "venue"
  | "setup"
  | "pricing"
  | "media"
  | "policies"
  | "submit";

type DraftBasicDetails = {
  title: string;
  subtitle: string;
  description: string;
  category: EventCategory;
  subCategory: string;
  language: string;
  duration: string;
  ageRestriction: string;
  tags: string;
};

type DraftOrganizer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
};

type DraftTimeSlot = {
  slotId: string;
  startTime: string;
  endTime: string;
};

type DraftSchedule = {
  scheduleId: string;
  date: string;
  timeSlots: DraftTimeSlot[];
};

type DraftVenue = {
  venueId: string;
  venueName: string;
  city: string;
  address: string;
  venueType: VenueType;
  capacity: number;
  schedules: DraftSchedule[];
  eventStartDate: string;
  eventEndDate: string;
};

type DraftSocialLink = {
  id: string;
  platform: string;
  url: string;
  visible: boolean;
};

type DraftMedia = {
  bannerUrl: string;
  galleryUrls: string[];
  logoUrl: string;
  videoUrl: string;
  socialLinks: DraftSocialLink[];
};

type DraftPolicies = {
  refundPolicy: string;
  cancellationPolicy: string;
  entryRules: string[];
  customTerms: string[];
  organizerTermsAccepted: boolean;
};

type DraftApproval = {
  status: "draft" | "pending_review";
  submittedAt?: string;
  notes: string;
};

type OrganizerEventSummary = {
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
  status: "Draft" | "Pending Review";
  seatBlocks: Array<{ name: string; price: string; capacity: string; offer: string }>;
  createdAt?: string;
  submittedAt?: string;
};


type OrganizerCategoryOption = {
  id: string;
  sectionId: string;
  sectionName: string;
  sectionSlug: string;
  categoryName: string;
  categorySlug: string;
  description: string;
  internalCategory: EventCategory;
  defaultBookingType: BookingType;
  iconKey?: string;
};

type SelectedListingCategory = {
  sectionName: string;
  sectionSlug: string;
  categoryName: string;
  categorySlug: string;
};

type BookingModeKey = "ticket_quantity" | "seat_map" | "slot_capacity" | "free_registration";

type PlatformFeeSettings = {
  userConvenienceFeePercent: number;
  minimumUserFlatFee: number;
  organizerCommissionPercent: number;
  platformTaxPercent: number;
  source: "event_override" | "organizer_override" | "global_default";
};

const platformTaxonomyStorageKey = "buizz-platform-taxonomy";
const platformFeeSettingsStorageKey = "buizz-platform-fee-settings";
const fallbackPlatformFeeSettings: PlatformFeeSettings = {
  userConvenienceFeePercent: 7,
  minimumUserFlatFee: 0,
  organizerCommissionPercent: 7,
  platformTaxPercent: 18,
  source: "global_default",
};

const createPlatformSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const mapSectionToInternalCategory = (sectionName: string, categoryName = ""): EventCategory => {
  const source = `${sectionName} ${categoryName}`.toLowerCase();
  if (source.includes("play") || source.includes("theatre") || source.includes("drama")) return "play";
  if (
    source.includes("activit") ||
    source.includes("game") ||
    source.includes("adventure") ||
    source.includes("workshop") ||
    source.includes("experience")
  ) {
    return "activity";
  }
  return "event";
};

const getDefaultBookingTypeForSection = (sectionName: string, categoryName: string): BookingType => {
  const internalCategory = mapSectionToInternalCategory(sectionName, categoryName);
  const source = `${sectionName} ${categoryName}`.toLowerCase();
  if (source.includes("play") || source.includes("theatre")) return "theatre_seating";
  if (source.includes("activit") || source.includes("workshop") || source.includes("game") || source.includes("slot")) return "slot_based";
  return getDefaultBookingType(internalCategory);
};

const hiddenOrganizerCategoryKeywords = ["movie", "movies", "cinema", "film", "screening"];

const isHiddenOrganizerCategory = (sectionName: string, categoryName = "") => {
  const source = `${sectionName} ${categoryName}`.toLowerCase();
  return hiddenOrganizerCategoryKeywords.some((keyword) => source.includes(keyword));
};

const fallbackOrganizerCategories = (): OrganizerCategoryOption[] => {
  const sections = [
    {
      sectionName: "Events",
      categories: ["Music Events", "Comedy Events", "Festivals", "Sports Events", "Business Events", "College Events", "Community Events"],
    },
    {
      sectionName: "Plays",
      categories: ["Marathi Plays", "Hindi Plays", "English Plays", "Theatre Shows"],
    },
    {
      sectionName: "Activities",
      categories: ["Game Zones", "Adventure", "Kids Activities", "Workshops", "Food Experiences"],
    },
  ];

  return sections.flatMap((section, sectionIndex) => {
    const sectionSlug = createPlatformSlug(section.sectionName);

    return section.categories
      .filter((categoryName) => !isHiddenOrganizerCategory(section.sectionName, categoryName))
      .map((categoryName) => ({
        id: `fallback-${sectionSlug}-${createPlatformSlug(categoryName)}`,
        sectionId: `fallback-section-${sectionSlug}`,
        sectionName: section.sectionName,
        sectionSlug,
        categoryName,
        categorySlug: createPlatformSlug(categoryName),
        description: `${categoryName} listing type for Buizz organizer event creation.`,
        internalCategory: mapSectionToInternalCategory(section.sectionName, categoryName),
        defaultBookingType: getDefaultBookingTypeForSection(section.sectionName, categoryName),
        iconKey: sectionIndex === 1 ? "Star" : sectionIndex === 2 ? "Ticket" : "Calendar",
      }));
  });
};

const normalizeOrganizerCategoryOption = (section: Record<string, unknown>, category: Record<string, unknown>): OrganizerCategoryOption => {
  const sectionName = String(section.name || "Events");
  const categoryName = String(category.name || "General");
  const sectionSlug = String(section.slug || createPlatformSlug(sectionName));
  const categorySlug = String(category.slug || createPlatformSlug(categoryName));
  const internalCategory = mapSectionToInternalCategory(sectionName, categoryName);

  return {
    id: String(category.id || `${sectionSlug}-${categorySlug}`),
    sectionId: String(section.id || `section-${sectionSlug}`),
    sectionName,
    sectionSlug,
    categoryName,
    categorySlug,
    description: String(category.description || section.description || `${categoryName} category.`),
    internalCategory,
    defaultBookingType: getDefaultBookingTypeForSection(sectionName, categoryName),
    iconKey: String(category.iconKey || section.iconKey || "Ticket"),
  };
};

function readOrganizerSelectableCategories(): OrganizerCategoryOption[] {
  const fallback = fallbackOrganizerCategories();
  if (typeof window === "undefined") return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(platformTaxonomyStorageKey) || "null") as unknown;
    if (!Array.isArray(parsed)) return fallback;

    const options = parsed.flatMap((rawSection) => {
      if (!rawSection || typeof rawSection !== "object") return [];
      const section = rawSection as Record<string, unknown>;
      const sectionActive = section.isActive !== false;
      const sectionVisible = section.showInOrganizerCreateEvent !== false;
      const sectionName = String(section.name || "Events");
      const categories = Array.isArray(section.categories) ? section.categories : [];

      if (!sectionActive || !sectionVisible || isHiddenOrganizerCategory(sectionName)) return [];

      return categories
        .filter((rawCategory): rawCategory is Record<string, unknown> => Boolean(rawCategory && typeof rawCategory === "object"))
        .filter((category) => category.isActive !== false && category.showInOrganizerCreateEvent !== false)
        .filter((category) => !isHiddenOrganizerCategory(sectionName, String(category.name || "")))
        .map((category) => normalizeOrganizerCategoryOption(section, category));
    });

    return options.length ? options : fallback;
  } catch {
    return fallback;
  }
}

function readPlatformFeeSettings(): PlatformFeeSettings {
  if (typeof window === "undefined") return fallbackPlatformFeeSettings;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(platformFeeSettingsStorageKey) || "null") as Partial<PlatformFeeSettings> | null;
    if (!parsed || typeof parsed !== "object") return fallbackPlatformFeeSettings;

    const normalizePercent = (value: unknown, fallback: number) => {
      const numeric = Number(value ?? fallback);
      if (!Number.isFinite(numeric)) return fallback;
      return Math.min(Math.max(numeric, 0), 100);
    };

    return {
      userConvenienceFeePercent: normalizePercent(parsed.userConvenienceFeePercent, fallbackPlatformFeeSettings.userConvenienceFeePercent),
      minimumUserFlatFee: Math.max(0, Number(parsed.minimumUserFlatFee ?? fallbackPlatformFeeSettings.minimumUserFlatFee) || 0),
      organizerCommissionPercent: normalizePercent(parsed.organizerCommissionPercent, fallbackPlatformFeeSettings.organizerCommissionPercent),
      platformTaxPercent: normalizePercent(parsed.platformTaxPercent, fallbackPlatformFeeSettings.platformTaxPercent),
      source: parsed.source === "event_override" || parsed.source === "organizer_override" ? parsed.source : "global_default",
    };
  } catch {
    return fallbackPlatformFeeSettings;
  }
}

function calculateFeePreview(basePrice: number, settings: PlatformFeeSettings) {
  const safeBasePrice = Math.max(0, Number(basePrice) || 0);
  const organizerCommission = Math.round((safeBasePrice * settings.organizerCommissionPercent) / 100);
  const organizerNet = Math.max(safeBasePrice - organizerCommission, 0);
  const convenienceFee = Math.max(
    Math.round((safeBasePrice * settings.userConvenienceFeePercent) / 100),
    settings.minimumUserFlatFee,
  );
  const taxOnFee = Math.round((convenienceFee * settings.platformTaxPercent) / 100);

  return {
    basePrice: safeBasePrice,
    organizerCommission,
    organizerNet,
    convenienceFee,
    taxOnFee,
    customerPayable: safeBasePrice + convenienceFee + taxOnFee,
  };
}

function createDefaultTicketQuantityBlocks(capacity: CapacityConfig, pricingMode: PricingMode): TicketBlock[] {
  if (pricingMode === "free") return [createRegistrationPassBlock(capacity)];

  const totalQuantity = Math.max(capacity.totalCapacity, 1);
  const onlineQuantity = Math.floor((totalQuantity * 70) / 100);
  const offlineQuantity = Math.floor((totalQuantity * 20) / 100);

  return [{
    blockId: "block-general",
    name: "General",
    type: "entry_pass",
    price: Math.max(capacity.price || 0, 0),
    currency: capacity.currency,
    totalQuantity,
    onlineQuantity,
    offlineQuantity,
    reservedQuantity: Math.max(totalQuantity - onlineQuantity - offlineQuantity, 0),
    soldOnline: 0,
    soldOffline: 0,
    soldReserved: 0,
    minPerBooking: 1,
    maxPerBooking: 10,
    status: "active",
  }];
}

const bookingModeCards: Array<{
  key: BookingModeKey;
  title: string;
  description: string;
  publicFlow: string;
  recommendedFor: string;
}> = [
    {
      key: "ticket_quantity",
      title: "Simple Ticket Booking",
      description: "Public users choose ticket section cards and continue with a sticky order summary.",
      publicFlow: "Ticket cards → checkout summary → payment → one booking ticket",
      recommendedFor: "Concerts, comedy, workshops, festivals and simple venue events",
    },
    {
      key: "seat_map",
      title: "Seat Map Booking",
      description: "Public users choose how many seats, pick exact seats on the approved event-specific map, then pay.",
      publicFlow: "How many seats → seat map → terms → payment → one ticket with all seats",
      recommendedFor: "Theatres, auditoriums, mapped venues, concerts and plays",
    },
    {
      key: "slot_capacity",
      title: "Slot / Capacity Booking",
      description: "Public users select a venue/date/time slot and book from available capacity without choosing exact seats.",
      publicFlow: "Slot selection → capacity tickets → checkout → QR pass",
      recommendedFor: "Activities, games, workshops and timed experiences",
    },
    {
      key: "free_registration",
      title: "Free Registration",
      description: "No payment. Customer registers, receives one QR ticket/pass, and can be checked in at the gate.",
      publicFlow: "Registration → confirmation → QR pass",
      recommendedFor: "Free events, invites, community events and internal passes",
    },
  ];

const steps: WizardStep[] = [
  { id: "basic", title: "Event Information", shortTitle: "Info" },
  { id: "category", title: "Category & Booking Style", shortTitle: "Category" },
  { id: "venue", title: "Venue & Schedule", shortTitle: "Venue" },
  { id: "setup", title: "Capacity / Seat Map Setup", shortTitle: "Setup" },
  { id: "pricing", title: "Ticket Sections & Inventory", shortTitle: "Inventory" },
  { id: "media", title: "Images & Media", shortTitle: "Media" },
  { id: "policies", title: "Policies", shortTitle: "Policies" },
  { id: "submit", title: "Review & Submit", shortTitle: "Review" },
];

function getWizardStepIcon(stepId: WizardStepId): LucideIcon {
  switch (stepId) {
    case "basic":
      return Info;
    case "category":
      return Sparkles;
    case "venue":
      return MapPin;
    case "setup":
      return CalendarDays;
    case "pricing":
      return Ticket;
    case "media":
      return ImageIcon;
    case "policies":
      return ShieldCheck;
    case "submit":
      return Check;
    default:
      return Info;
  }
}

const defaultOrganizer: DraftOrganizer = {
  id: "",
  name: "",
  email: "",
  phone: "",
  city: "",
};

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const maxGalleryImages = 4;
const maxEventImageBytes = 5 * 1024 * 1024;
const minBannerImageSize = { width: 1600, height: 900 };
const minGalleryImageSize = { width: 1200, height: 800 };
const allowedImageTypes = ["image/jpeg", "image/png"];
const allowedImageExtensions = /\.(jpe?g|png)$/i;
const allowedImageAccept = "image/jpeg,image/png,.jpg,.jpeg,.png";
const allowedVideoAccept = "video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg";

function isAllowedEventImage(file: File) {
  return allowedImageTypes.includes(file.type) || allowedImageExtensions.test(file.name);
}

function getImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    image.src = url;
  });
}

async function getEventImageValidationMessage(file: File, kind: "banner" | "gallery" | "logo") {
  if (!isAllowedEventImage(file)) return "Only JPG, JPEG, and PNG images are allowed.";
  if (file.size > maxEventImageBytes) return "Image size must be 5 MB or less.";
  const minimum = kind === "banner" ? minBannerImageSize : minGalleryImageSize;
  const dimensions = await getImageDimensions(file);
  if (dimensions.width < minimum.width || dimensions.height < minimum.height) {
    return `${kind === "banner" ? "Banner" : "Image"} must be HD: minimum ${minimum.width}x${minimum.height}px.`;
  }
  return "";
}

function isAllowedImageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("data:image/jpeg") || trimmed.startsWith("data:image/png")) return true;
  if (trimmed.startsWith("blob:")) return true;

  try {
    const url = new URL(trimmed);
    return allowedImageExtensions.test(url.pathname);
  } catch {
    return allowedImageExtensions.test(trimmed);
  }
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Image could not be read."));
    reader.onerror = () => reject(reader.error ?? new Error("Image could not be read."));
    reader.readAsDataURL(file);
  });
}

function isLocalPreviewMediaUrl(value?: string) {
  if (!value) return false;
  return value.startsWith("blob:");
}

function isQuotaExceededError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function stripLocalPreviewMediaFromConfig(mediaConfig: EventMediaConfig): EventMediaConfig {
  return {
    ...mediaConfig,
    bannerImage:
      mediaConfig.bannerImage && !isLocalPreviewMediaUrl(mediaConfig.bannerImage.url)
        ? mediaConfig.bannerImage
        : undefined,
    galleryImages: (mediaConfig.galleryImages ?? []).filter(
      (asset) => !isLocalPreviewMediaUrl(asset.url),
    ),
    organizerLogo:
      mediaConfig.organizerLogo && !isLocalPreviewMediaUrl(mediaConfig.organizerLogo.url)
        ? mediaConfig.organizerLogo
        : undefined,
    videoUrl:
      mediaConfig.videoUrl && !isLocalPreviewMediaUrl(mediaConfig.videoUrl)
        ? mediaConfig.videoUrl
        : undefined,
    socialLinks: mediaConfig.socialLinks,
  };
}

function stripLocalPreviewMediaFromEvent(event: BuizzEvent): BuizzEvent {
  return {
    ...event,
    media: stripLocalPreviewMediaFromConfig(event.media),
  };
}

function cleanupHeavyEventStorage() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem("buizz-events");
    if (!raw) return;

    const parsed = JSON.parse(raw) as BuizzEvent[];
    if (!Array.isArray(parsed)) return;

    const cleaned = parsed.map((event) =>
      event?.media ? stripLocalPreviewMediaFromEvent(event) : event,
    );

    window.localStorage.setItem("buizz-events", JSON.stringify(cleaned));
  } catch {
    window.localStorage.removeItem("buizz-events");
  }
}


const createDefaultSlot = (): DraftTimeSlot => ({
  slotId: createId("slot"),
  startTime: "",
  endTime: "",
});

const createDefaultSchedule = (): DraftSchedule => ({
  scheduleId: createId("schedule"),
  date: "",
  timeSlots: [createDefaultSlot()],
});

const createDefaultVenue = (): DraftVenue => ({
  venueId: createId("venue"),
  venueName: "",
  city: "",
  address: "",
  venueType: "open_ground",
  capacity: 0,
  schedules: [createDefaultSchedule()],
  eventStartDate: "",
  eventEndDate: "",
});

const createSeatSections = (): SeatSection[] => buildDefaultSeatSections();

const createCapacityConfig = (): CapacityConfig => buildCapacityConfigFromInput();

const createTicketBlocksFromSections = (sections: SeatSection[]): TicketBlock[] =>
  sections.map((section) => ({
    blockId: `block-${section.sectionId}`,
    name: section.name,
    type: "seat_section",
    sectionId: section.sectionId,
    price: section.price,
    currency: section.currency,
    totalQuantity: section.totalSeats,
    onlineQuantity: section.onlineSeats,
    offlineQuantity: section.offlineSeats,
    reservedQuantity: section.reservedSeats,
    soldOnline: 0,
    soldOffline: 0,
    soldReserved: 0,
    minPerBooking: 1,
    maxPerBooking: 8,
    status: "active",
  }));

const createEntryTicketBlock = (capacity: CapacityConfig, bookingType: BookingType, pricingMode: PricingMode): TicketBlock => ({
  blockId: "block-entry-pass",
  name: pricingMode === "free" ? "Registration Pass" : bookingType === "slot_based" ? "Slot Pass" : "Entry Pass",
  type: pricingMode === "free" || bookingType === "free_registration" ? "registration" : "entry_pass",
  price: pricingMode === "free" || bookingType === "free_registration" ? 0 : capacity.price,
  currency: capacity.currency,
  totalQuantity: capacity.totalCapacity,
  onlineQuantity: capacity.onlineCapacity,
  offlineQuantity: capacity.offlineCapacity,
  reservedQuantity: capacity.reservedCapacity,
  soldOnline: 0,
  soldOffline: 0,
  soldReserved: 0,
  minPerBooking: 1,
  maxPerBooking: 10,
  status: "active",
});

const createSeatMapTicketBlocks = (
  summary: SeatMapSummary,
  price: number,
  pricingMode: PricingMode,
  snapshot?: OrganizerSeatMapSnapshot,
): TicketBlock[] => {
  if (snapshot?.ticketTiers.length) {
    return snapshot.ticketTiers.map((tier) => ({
      blockId: `block-${tier.tierId}`,
      name: tier.name,
      type: "seat_section",
      sectionId: tier.tierId,
      price: pricingMode === "free" ? 0 : tier.price,
      currency: "INR",
      totalQuantity: tier.totalQuantity,
      onlineQuantity: tier.onlineQuantity,
      offlineQuantity: tier.offlineQuantity,
      reservedQuantity: tier.reservedQuantity,
      soldOnline: 0,
      soldOffline: 0,
      soldReserved: 0,
      minPerBooking: 1,
      maxPerBooking: 10,
      status: "active",
    }));
  }

  return [
    {
      blockId: "block-event-seat-map",
      name: "General Admission",
      type: "seat_section",
      sectionId: "event-seat-map",
      price: pricingMode === "free" ? 0 : price,
      currency: "INR",
      totalQuantity: summary.activeSeats,
      onlineQuantity: summary.activeSeats,
      offlineQuantity: 0,
      reservedQuantity: 0,
      soldOnline: 0,
      soldOffline: 0,
      soldReserved: 0,
      minPerBooking: 1,
      maxPerBooking: 10,
      status: "active",
    },
  ];
};

const ticketBlocksToSeatSections = (ticketBlocks: TicketBlock[]): SeatSection[] =>
  ticketBlocks.map((block) => ({
    sectionId: block.sectionId || `section-${block.blockId}`,
    name: block.name,
    label: block.name,
    totalSeats: block.totalQuantity,
    onlineSeats: block.onlineQuantity,
    offlineSeats: block.offlineQuantity,
    reservedSeats: block.reservedQuantity,
    soldOnline: block.soldOnline,
    soldOffline: block.soldOffline,
    soldReserved: block.soldReserved,
    price: block.price,
    currency: block.currency,
    availabilityStatus: block.status === "sold_out" ? "sold_out" : block.status === "disabled" ? "disabled" : "available",
  }));

type SeatMapSummaryInput = Partial<SeatMapSummary> & {
  total?: number;
  available?: number;
  blocked?: number;
  reserved?: number;
  sold?: number;
};

const normalizeSeatMapSummary = (summary: SeatMapSummaryInput): SeatMapSummary => ({
  totalCapacity: Math.max(0, Number(summary.totalCapacity ?? summary.total ?? 0)),
  activeSeats: Math.max(0, Number(summary.activeSeats ?? summary.available ?? 0)),
  blockedSeats: Math.max(0, Number(summary.blockedSeats ?? summary.blocked ?? 0)),
  reservedSeats: Math.max(0, Number(summary.reservedSeats ?? summary.reserved ?? 0)),
  soldSeats: Math.max(0, Number(summary.soldSeats ?? summary.sold ?? 0)),
  tierCount: Math.max(0, Number(summary.tierCount ?? 0)),
});

const createRegistrationPassBlock = (capacity: CapacityConfig): TicketBlock => ({
  blockId: "block-registration-pass",
  name: "Registration Pass",
  type: "registration",
  price: 0,
  currency: capacity.currency,
  totalQuantity: capacity.totalCapacity,
  onlineQuantity: capacity.onlineCapacity,
  offlineQuantity: capacity.offlineCapacity,
  reservedQuantity: capacity.reservedCapacity,
  soldOnline: 0,
  soldOffline: 0,
  soldReserved: 0,
  minPerBooking: 1,
  maxPerBooking: 10,
  status: "active",
});

const allowedBookingTypesForPricing = (category: EventCategory, pricingMode: PricingMode): BookingType[] => {
  if (pricingMode === "paid") {
    if (category === "activity") return ["slot_based", "capacity"];
    return CATEGORY_BOOKING_RULES[category].allowedBookingTypes;
  }

  if (category === "event") return ["capacity"];
  if (category === "play") return ["theatre_seating"];
  return ["slot_based", "free_registration"];
};

const defaultBookingTypeForPricing = (category: EventCategory, pricingMode: PricingMode): BookingType => {
  if (pricingMode === "free") {
    if (category === "event") return "capacity";
    if (category === "play") return "theatre_seating";
    return "free_registration";
  }

  return getDefaultBookingType(category);
};

const createRatioConfig = (eventStartTime: string): RatioConfig => ({
  onlinePercentage: 70,
  offlinePercentage: 20,
  reservedPercentage: 10,
  editableUntil: getRatioEditableUntil(eventStartTime),
  isLocked: !canEditRatio(eventStartTime),
});

const toTitle = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getPrimaryStartDateTime = (venues: DraftVenue[]) => {
  const venue = venues[0];
  const schedule = venue?.schedules[0];
  const slot = schedule?.timeSlots[0];
  return `${schedule?.date || "2026-11-14"}T${slot?.startTime || "19:00"}:00`;
};

const buildMediaConfig = (media: DraftMedia): EventMediaConfig => {
  const createImageAsset = (url: string, id: string, alt: string, type: MediaAsset["type"] = "image"): MediaAsset => {
    const normalizedUrl = url.toLowerCase();

    return {
      id,
      url,
      alt,
      type,
      fileType: normalizedUrl.startsWith("data:image/png") || normalizedUrl.endsWith(".png") ? "png" : "jpg",
    };
  };

  return {
    bannerImage: media.bannerUrl.trim() ? createImageAsset(media.bannerUrl.trim(), "media-banner", "Event banner") : undefined,
    galleryImages: media.galleryUrls
      .filter((url) => url.trim())
      .slice(0, maxGalleryImages)
      .map((url, index) => createImageAsset(url.trim(), `media-gallery-${index + 1}`, `Gallery image ${index + 1}`)),
    organizerLogo: media.logoUrl.trim() ? createImageAsset(media.logoUrl.trim(), "media-logo", "Organizer logo", "logo") : undefined,
    videoUrl: media.videoUrl.trim() || undefined,
    socialLinks: media.socialLinks.filter((link) => link.visible !== false && link.platform.trim() && link.url.trim()),
  };
};

const normalizeCategory = (value?: string): EventCategory => {
  if (value === "play" || value === "activity") return value;
  return "event";
};

const normalizeBookingTypeForDraft = (value?: string): BookingType => {
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

  return "capacity";
};

const normalizePricingModeForDraft = (value?: string): PricingMode =>
  value === "free" ? "free" : "paid";

const draftVenueFromEventVenue = (venue: EventVenue & { eventStartDate?: string; eventEndDate?: string }): DraftVenue => {
  const firstSchedule = venue.schedules[0];
  const firstSlot = firstSchedule?.timeSlots[0];
  return {
    venueId: venue.venueId || createId("venue"),
    venueName: venue.venueName || "Venue pending",
    city: venue.city || "City pending",
    address: venue.address || "",
    venueType: venue.venueType || "other",
    capacity: venue.capacity || 0,
    schedules: venue.schedules.length
      ? venue.schedules.map((schedule) => ({
        scheduleId: schedule.scheduleId || createId("schedule"),
        date: schedule.date || "",
        timeSlots: schedule.timeSlots.length
          ? schedule.timeSlots.map((slot) => ({
            slotId: slot.slotId || createId("slot"),
            startTime: slot.startTime || "",
            endTime: slot.endTime || "",
          }))
          : [createDefaultSlot()],
      }))
      : [createDefaultSchedule()],
    eventStartDate: venue.eventStartDate || firstSchedule?.date || "",
    eventEndDate: venue.eventEndDate || firstSchedule?.date || "",
  };
};

const draftMediaFromEvent = (event: BuizzEvent): DraftMedia => ({
  bannerUrl: event.media.bannerImage?.url ?? "",
  galleryUrls: event.media.galleryImages.map((image) => image.url).filter(Boolean).slice(0, maxGalleryImages),
  logoUrl: event.media.organizerLogo?.url ?? "",
  videoUrl: event.media.videoUrl ?? "",
  socialLinks: event.media.socialLinks.map((link) => ({
    id: link.id || createId("social"),
    platform: link.platform,
    url: link.url,
    visible: link.visible,
  })),
});

const draftPoliciesFromEvent = (event: BuizzEvent): DraftPolicies => ({
  refundPolicy: event.policies.refundPolicy || "",
  cancellationPolicy: event.policies.cancellationPolicy || "",
  entryRules: event.policies.entryRules.length ? event.policies.entryRules : [""],
  customTerms: event.policies.customTerms.length ? event.policies.customTerms : [""],
  organizerTermsAccepted: event.policies.organizerTermsAccepted,
});

const ratioPercentagesFromEvent = (event: BuizzEvent) => {
  const ratio = event.venues[0]?.schedules[0]?.timeSlots[0]?.ratioConfig;
  if (ratio) {
    return {
      online: ratio.onlinePercentage,
      offline: ratio.offlinePercentage,
      reserved: ratio.reservedPercentage,
    };
  }

  const block = event.ticketBlocks[0];
  const total = (block?.onlineQuantity ?? 0) + (block?.offlineQuantity ?? 0) + (block?.reservedQuantity ?? 0);
  if (!block || !total) return { online: 70, offline: 20, reserved: 10 };

  return {
    online: Math.round((block.onlineQuantity / total) * 100),
    offline: Math.round((block.offlineQuantity / total) * 100),
    reserved: Math.max(0, 100 - Math.round((block.onlineQuantity / total) * 100) - Math.round((block.offlineQuantity / total) * 100)),
  };
};

const draftFromUnifiedEvent = (event: UnifiedBuizzEvent): BuizzEvent => {
  const category = normalizeCategory(event.category);
  const ticketBlocks: TicketBlock[] = event.ticketBlocks.length
    ? event.ticketBlocks.map((block) => ({
      blockId: block.id,
      name: block.name,
      type: "entry_pass",
      price: block.price,
      currency: "INR",
      totalQuantity: block.totalQuantity,
      onlineQuantity: block.onlineQuantity,
      offlineQuantity: block.offlineQuantity,
      reservedQuantity: block.reservedQuantity,
      soldOnline: 0,
      soldOffline: 0,
      soldReserved: 0,
      minPerBooking: 1,
      maxPerBooking: 10,
      status: "active",
    }))
    : [];
  const capacity = Math.max(event.capacity, ticketBlocks.reduce((sum, block) => sum + block.totalQuantity, 0));
  const venue: EventVenue = {
    venueId: event.venues?.[0]?.venueId ?? "venue-edit-fallback",
    venueName: event.venueName,
    city: event.city,
    address: event.venueAddress ?? event.venueName,
    capacity,
    venueType: "other",
    schedules: [
      {
        scheduleId: "schedule-edit-fallback",
        date: (event as UnifiedBuizzEvent).date,
        timeSlots: [
          {
            slotId: "slot-edit-fallback",
            startTime: (event as UnifiedBuizzEvent).time,
            endTime: (event as UnifiedBuizzEvent).endTime ?? (event as UnifiedBuizzEvent).time,
            bookingType: normalizeBookingTypeForDraft(event.bookingType),
            availabilityStatus: "available",
            ratioConfig: {
              onlinePercentage: event.ratio.online,
              offlinePercentage: event.ratio.offline,
              reservedPercentage: event.ratio.reserved,
              editableUntil: getRatioEditableUntil(`${(event as UnifiedBuizzEvent).date || "2026-11-14"}T${(event as UnifiedBuizzEvent).time || "19:00"}:00`),
              isLocked: false,
            },
            ticketBlocks,
          },
        ],
      },
    ],
  };

  const result: BuizzEvent = {
    id: event.id,
    slug: event.slug,
    title: event.title,
    subtitle: "",
    description: event.description,
    category,
    subCategory: event.subCategory,
    status: event.status === "pending_review" ? "pending_review" : event.status === "approved" ? "approved" : event.status === "published" ? "published" : event.status === "rejected" ? "rejected" : event.status === "cancelled" ? "cancelled" : event.status === "completed" ? "completed" : "draft",
    date: event.date,
    organizer: {
      id: event.organizerId,
      name: event.organizerName,
      email: "",
      phone: "",
      city: event.city,
      status: "approved",
      verified: true,
    },
    venues: [venue],
    bookingType: normalizeBookingTypeForDraft(event.bookingType),
    pricingMode: normalizePricingModeForDraft(event.pricingMode),
    ticketBlocks,
    ticketDesign: {
      templateId: event.ticketDesignId ?? `template-${category}-premium`,
      templateName: event.ticketDesignId ?? "Buizz Verified Event Ticket",
      category,
      allowOrganizerLogo: true,
      organizerLogoVisible: true,
      qrPreviewVisible: true,
      termsVisible: true,
      allowTextCustomization: true,
      allowDragDrop: false,
      requiredFields: ["eventTitle", "venue", "date", "time", "ticketBlock", "qrCode"],
      optionalFields: ["organizerLogo", "tagline", "entryGate"],
      restrictions: ["QR code cannot be removed", "Buyer details stay locked after booking"],
    },
    media: {
      bannerImage: event.bannerImage ? { id: "media-banner", url: event.bannerImage, alt: event.title, type: "image" } : undefined,
      galleryImages: (event.gallery ?? []).map((url, index) => ({ id: `media-gallery-${index + 1}`, url, alt: `${event.title} gallery ${index + 1}`, type: "image" })),
      socialLinks: [],
    },
    policies: {
      organizerTermsAccepted: true,
      userTerms: "Users must follow Buizz and venue rules shown before checkout.",
      refundPolicy: event.policies?.[0] ?? "",
      cancellationPolicy: "",
      entryRules: event.policies ?? [],
      customTerms: [],
    },
    offers: [],
    platformFees: [],
    approval: {
      currentStatus: "draft",
      submittedAt: event.approval?.submittedAt,
      reviewedBy: event.approval?.approvedBy ?? event.approval?.rejectedBy,
      reviewedAt: event.approval?.approvedAt ?? event.approval?.rejectedAt,
      rejectionReason: event.approval?.rejectedReason,
      requiresSuperAdminApproval: false,
      adminApprovalIsFinal: true,
      platformFeeAssigned: Boolean(event.platformFees?.value),
      organizerAcceptedFees: false,
    },
    bookingsSummary: {
      totalBookings: 0,
      onlineBookings: 0,
      offlineBookings: 0,
      reservedBookings: 0,
      totalTickets: 0,
      onlineTickets: 0,
      offlineTickets: 0,
      reservedTickets: 0,
    },
    revenueSummary: {
      onlineRevenue: 0,
      offlineRevenue: 0,
      reservedValue: 0,
      grossRevenue: 0,
      platformFees: 0,
      netOrganizerAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      currency: "INR",
    },
    settlement: {
      settlementId: `settlement-${event.id}`,
      status: "not_started",
      grossRevenue: 0,
      platformFees: 0,
      organizerPayable: 0,
      paidAmount: 0,
      remainingAmount: 0,
    },
    visibility: {
      isPublic: event.status === "published",
      autoHideAfterMinutes: 30,
    },
    history: [],
    notifications: [],
    activityLogs: [],
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
  return result;
};

const getInventoryTotal = (sections: SeatSection[], capacityConfig: CapacityConfig, bookingType: BookingType) => {
  if (isSeatMapRequired("event", bookingType) || bookingType === "theatre_seating") {
    return sections.reduce((total, section) => total + section.totalSeats, 0);
  }

  return capacityConfig.totalCapacity;
};

const getEditString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getEditNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const isLikelyBackendEventId = (value: number) =>
  Number.isInteger(value) && value > 0 && value < 1000000000;

const resolveBackendEventId = (event: BuizzEvent | null, editEventId: string) => {
  const candidates = [
    (event as unknown as Record<string, unknown> | null)?.eventId,
    (event as unknown as Record<string, unknown> | null)?.event_id,
    (event as unknown as Record<string, unknown> | null)?.backendEventId,
    (event as unknown as Record<string, unknown> | null)?.backend_event_id,
    editEventId,
    event?.id,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const value = String(candidate).trim();
    if (/^\d+$/.test(value)) {
      const numericValue = Number(value);
      if (isLikelyBackendEventId(numericValue)) return numericValue;
      continue;
    }

    const match = value.match(/(?:event|evt)[-_]?(\d+)/i) ?? value.match(/(\d+)/);
    if (match?.[1]) {
      const numericValue = Number(match[1]);
      if (isLikelyBackendEventId(numericValue)) return numericValue;
    }
  }

  return null;
};

const extractBackendEventFromResponse = (response: unknown): Record<string, unknown> | null => {
  const responseObj = response as { data?: unknown };
  const data = responseObj?.data;
  if (data && typeof data === "object" && "event" in data) {
    const event = (data as { event?: unknown }).event;
    return event && typeof event === "object" ? event as Record<string, unknown> : null;
  }
  return data && typeof data === "object" ? data as Record<string, unknown> : null;
};

const mergeBackendEventIdentity = (event: BuizzEvent, response: unknown): BuizzEvent => {
  const backendEvent = extractBackendEventFromResponse(response);
  const backendEventId = Number(backendEvent?.id ?? backendEvent?.event_id ?? backendEvent?.eventId);
  if (!isLikelyBackendEventId(backendEventId)) return event;

  return {
    ...event,
    id: String(backendEventId),
    slug: String(backendEvent?.slug ?? event.slug),
    updatedAt: String(backendEvent?.updatedAt ?? backendEvent?.updated_at ?? event.updatedAt),
    ...(backendEvent?.status ? { status: normalizeEventStatus(backendEvent.status) } : {}),
    backendEventId,
    eventId: backendEventId,
  } as BuizzEvent;
};

const getPriceRange = (ticketBlocks: TicketBlock[]) => {
  const prices = ticketBlocks.map((block) => block.price).filter((price) => price > 0);
  if (!prices.length) return "Free";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? `INR ${min.toLocaleString("en-IN")}`
    : `INR ${min.toLocaleString("en-IN")} - INR ${max.toLocaleString("en-IN")}`;
};

const getTicketBlockValidationMessage = (block: TicketBlock, pricingMode: PricingMode) => {
  if (!block.name.trim()) return "Section name is required.";
  if (block.totalQuantity <= 0) return `${block.name || "Section"} total quantity must be greater than 0.`;
  if (block.price < 0) return `${block.name || "Section"} price cannot be negative.`;
  if (pricingMode === "free" && block.price !== 0) return "Free registration sections must have price 0.";
  if (block.onlineQuantity + block.offlineQuantity + block.reservedQuantity !== block.totalQuantity) {
    return `${block.name || "Section"} online, offline, and reserved quantities must equal total quantity.`;
  }
  if (block.maxPerBooking < block.minPerBooking) {
    return `${block.name || "Section"} max booking cannot be less than min booking.`;
  }
  return "";
};

export function OrganizerCreateEventFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loadingKey, successMessage, errorMessage, runAction } = useActionFeedback();
  const [createEvent] = useCreateEventMutation();
  const [saveDraftApi] = useSaveDraftMutation();
  const [updateEvent] = useUpdateEventMutation();
  const [submitEventForReviewApi] = useSubmitEventForReviewMutation();
  const [uploadEventImage] = useUploadEventImageMutation();

  const editMode = searchParams?.get("mode") === "edit";
  const editEventId = searchParams?.get("eventId") ?? "";
  const returnFrom = searchParams?.get("from") ?? "";
  const isEditMode = editMode && Boolean(editEventId);
  const editReturnPath = returnFrom === "tickets" ? "/organizer/tickets" : "/organizer/my-events";
  const editHydratedRef = useRef(false);
  const skipNextDefaultResetRef = useRef(false);
  const [draftEventId] = useState(() => editEventId || createId("event"));
  const [activeStep, setActiveStep] = useState(0);
  const [showStepSidebar, setShowStepSidebar] = useState(false);
  const [submittedEvent, setSubmittedEvent] = useState<BuizzEvent | null>(null);
  const [submittedApprovalReference, setSubmittedApprovalReference] = useState("");
  const [editingEvent, setEditingEvent] = useState<BuizzEvent | null>(null);
  const [editingEventNumericId, setEditingEventNumericId] = useState<number | null>(null);
  const [editBlocked, setEditBlocked] = useState(false);
  const [editBlockedReason, setEditBlockedReason] = useState("");
  const [basic, setBasic] = useState<DraftBasicDetails>({
    title: "",
    subtitle: "",
    description: "",
    category: "event",
    subCategory: "",
    language: "",
    duration: "",
    ageRestriction: "",
    tags: "",
  });
  const [organizer, setOrganizer] = useState(defaultOrganizer);
  const [venues, setVenues] = useState<DraftVenue[]>([createDefaultVenue()]);
  const [organizerCategories, setOrganizerCategories] = useState<OrganizerCategoryOption[]>(() => readOrganizerSelectableCategories());
  const [selectedListingCategory, setSelectedListingCategory] = useState<SelectedListingCategory>(() => ({
    sectionName: "Events",
    sectionSlug: "events",
    categoryName: "",
    categorySlug: "",
  }));
  const [bookingMode, setBookingMode] = useState<BookingModeKey>("ticket_quantity");
  const [bookingType, setBookingType] = useState<BookingType>("capacity");
  const [pricingMode, setPricingMode] = useState<PricingMode>("paid");
  const [requiresSeatMap, setRequiresSeatMap] = useState(false);
  const [platformFeeSettings, setPlatformFeeSettings] = useState<PlatformFeeSettings>(() => readPlatformFeeSettings());
  const [seatMapMode, setSeatMapMode] = useState<SeatMapMode>("capacity_only");
  const [seatMapTemplateId, setSeatMapTemplateId] = useState("");
  const [seatMapOverrideId, setSeatMapOverrideId] = useState("");
  const [seatMapSummary, setSeatMapSummary] = useState<SeatMapSummary | undefined>();
  const [seatMapTouched, setSeatMapTouched] = useState(false);
  const [sections, setSections] = useState<SeatSection[]>(createSeatSections);
  const [capacityConfig, setCapacityConfig] = useState<CapacityConfig>(createCapacityConfig);
  const [ratioPercentages, setRatioPercentages] = useState({ online: 70, offline: 20, reserved: 10 });
  const [ticketBlocks, setTicketBlocks] = useState<TicketBlock[]>(() => createTicketBlocksFromSections(createSeatSections()));
  const [ticketSectionsTouched, setTicketSectionsTouched] = useState(false);
  const [ticketDesign, setTicketDesign] = useState<TicketDesignConfig>({
    templateId: "template-event-premium",
    templateName: "Buizz Verified Event Ticket",
    category: "event",
    allowOrganizerLogo: true,
    organizerLogoVisible: true,
    qrPreviewVisible: true,
    termsVisible: true,
    allowTextCustomization: false,
    allowDragDrop: false,
    requiredFields: ["eventTitle", "venue", "date", "time", "ticketBlock", "qrCode"],
    optionalFields: ["organizerLogo", "tagline", "entryGate"],
    restrictions: ["Global Buizz ticket layout is locked", "QR code cannot be removed", "Buyer details stay locked after booking"],
  });
  const [media, setMedia] = useState<DraftMedia>({
    bannerUrl: "",
    galleryUrls: [],
    logoUrl: "",
    videoUrl: "",
    socialLinks: [],
  });
  const [mediaError, setMediaError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [policies, setPolicies] = useState<DraftPolicies>({
    refundPolicy: "Refunds are available only if the event is cancelled by the organizer or platform.",
    cancellationPolicy: "Cancellation requests are reviewed by Buizz Admin before public communication.",
    entryRules: ["QR ticket is mandatory", "Outside food is not allowed"],
    customTerms: ["Schedule may change due to operational reasons."],
    organizerTermsAccepted: false,
  });
  const [approval, setApproval] = useState<DraftApproval>({
    status: "draft",
    notes: "Ready for Buizz review.",
  });

  const eventStartTime = useMemo(() => getPrimaryStartDateTime(venues), [venues]);

  const ticketRatioLock = useMemo(
    () => getTicketRatioLockStatus({ venues }),
    [venues],
  );

  const visibleSteps = steps;

  const currentStep = visibleSteps[Math.min(activeStep, visibleSteps.length - 1)]?.id ?? "basic";

  const ratioConfig = useMemo(() => {
    const baseRatioConfig = createRatioConfig(eventStartTime);

    return {
      ...baseRatioConfig,
      editableUntil: ticketRatioLock.lockAt?.toISOString() ?? baseRatioConfig.editableUntil,
      isLocked: ticketRatioLock.locked,
      onlinePercentage: ratioPercentages.online,
      offlinePercentage: ratioPercentages.offline,
      reservedPercentage: ratioPercentages.reserved,
    };
  }, [
    eventStartTime,
    ratioPercentages.offline,
    ratioPercentages.online,
    ratioPercentages.reserved,
    ticketRatioLock.lockAt,
    ticketRatioLock.locked,
  ]);
  const seatMode = requiresSeatMap;
  const usesSeatMapTemplate = requiresSeatMap && seatMapMode === "seat_map";
  const usesCapacityOnly = !requiresSeatMap || seatMapMode === "capacity_only";
  const totalInventory = seatMode
    ? usesSeatMapTemplate
      ? seatMapSummary?.totalCapacity ?? 0
      : capacityConfig.totalCapacity
    : capacityConfig.totalCapacity;
  const displayTicketBlocks = useMemo(
    () => (pricingMode === "free" ? [createRegistrationPassBlock(capacityConfig)] : ticketBlocks),
    [capacityConfig, pricingMode, ticketBlocks],
  );
  const pricingPreviewBlock = displayTicketBlocks.find((block) => block.price > 0) ?? displayTicketBlocks[0];
  const platformFeePreview = useMemo(
    () => calculateFeePreview(pricingMode === "free" ? 0 : pricingPreviewBlock?.price ?? capacityConfig.price, platformFeeSettings),
    [capacityConfig.price, platformFeeSettings, pricingMode, pricingPreviewBlock?.price],
  );
  const selectedBookingModeCard = bookingModeCards.find((mode) => mode.key === bookingMode) ?? bookingModeCards[0];
  const inventoryTotals = useMemo(
    () => (usesCapacityOnly ? calculateInventoryTotals([], capacityConfig) : calculateInventoryTotals(sections)),
    [capacityConfig, sections, usesCapacityOnly],
  );
  const setupValidationMessages = useMemo(() => {
    if (usesSeatMapTemplate) {
      const messages: string[] = [];
      const savedSeatMap = readOrganizerSeatMapSnapshot({
        overrideId: seatMapOverrideId,
        eventId: draftEventId,
        templateId: seatMapTemplateId,
      });
      if (!seatMapTemplateId || !seatMapOverrideId || !savedSeatMap) {
        messages.push("Save event-specific seat map before continuing.");
      }
      if (!seatMapSummary || seatMapSummary.activeSeats <= 0) messages.push("Seat map must have at least one active available seat.");
      if (ticketBlocks.some((block) => block.price < 0)) messages.push("Ticket tiers must have valid prices.");
      const tierCapacity = ticketBlocks.reduce((sum, block) => sum + block.totalQuantity, 0);
      if (seatMapSummary && tierCapacity > 0 && tierCapacity !== seatMapSummary.activeSeats) {
        messages.push("Ticket blocks must match active seat tier capacity.");
      }
      return messages;
    }

    if (seatMode && !usesCapacityOnly) {
      return sections.map(validateSectionInventory).filter((result) => !result.isValid).map((result) => result.message);
    }

    const capacityValidation = validateCapacityRatio(capacityConfig);
    const messages = capacityValidation.isValid ? [] : [capacityValidation.message];
    if (capacityConfig.totalCapacity <= 0) messages.unshift("Total capacity must be greater than 0.");
    if (capacityConfig.price < 0) messages.push("Base price cannot be negative.");
    return messages;
  }, [capacityConfig, draftEventId, seatMapOverrideId, seatMapSummary, seatMapTemplateId, seatMapTouched, seatMode, ticketBlocks, usesCapacityOnly, usesSeatMapTemplate, sections]);
  const mediaConfig = useMemo(() => buildMediaConfig(media), [media]);
  const mediaValidation = useMemo(() => validateEventMedia(mediaConfig), [mediaConfig]);
  const mediaVisibility = useMemo(() => getMediaVisibility(mediaConfig), [mediaConfig]);
  const visibleSocialLinksCount = useMemo(
    () => media.socialLinks.filter((link) => link.visible !== false && link.platform.trim() && link.url.trim()).length,
    [media.socialLinks],
  );
  const hasAnyMediaContent = useMemo(
    () =>
      Boolean(
        media.bannerUrl.trim() ||
        media.logoUrl.trim() ||
        media.galleryUrls.some((url) => url.trim()) ||
        media.videoUrl.trim() ||
        visibleSocialLinksCount,
      ),
    [media.bannerUrl, media.logoUrl, media.galleryUrls, media.videoUrl, visibleSocialLinksCount],
  );

  useEffect(() => {
    setShowStepSidebar(window.matchMedia("(min-width: 1280px)").matches);
  }, []);

  useEffect(() => {
    const syncDynamicSettings = () => {
      setOrganizerCategories(readOrganizerSelectableCategories());
      setPlatformFeeSettings(readPlatformFeeSettings());
    };

    syncDynamicSettings();
    window.addEventListener("storage", syncDynamicSettings);
    window.addEventListener("buizz-platform-taxonomy-updated", syncDynamicSettings);

    return () => {
      window.removeEventListener("storage", syncDynamicSettings);
      window.removeEventListener("buizz-platform-taxonomy-updated", syncDynamicSettings);
    };
  }, []);

  useEffect(() => {
    if (!isEditMode || !editEventId || editHydratedRef.current || typeof window === "undefined") return;

    const unifiedEvent = readUnifiedEvents().find((event) => event.id === editEventId);
    const phase3Event = loadPhase3EventsFromStorage(window.localStorage).find((event) => event.id === editEventId);
    const event = phase3Event ?? (unifiedEvent ? draftFromUnifiedEvent(unifiedEvent) : null);

    if (!event) {
      const message = "Could not find this event. Opening a fresh create event form instead.";
      setValidationMessage(message);
      toastUtils.error(message);
      editHydratedRef.current = true;
      return;
    }

    skipNextDefaultResetRef.current = true;
    editHydratedRef.current = true;
    setEditingEvent(event);
    
    setEditingEventNumericId(resolveBackendEventId(event, editEventId));

    // Temporarily disabled: organizers can update events even inside the old 2-day lock window.
    // const eventStartDate = new Date(event.venues[0]?.schedules[0]?.date || event.createdAt);
    // const now = new Date();
    // const twoDaysBeforeEvent = new Date(eventStartDate);
    // twoDaysBeforeEvent.setDate(twoDaysBeforeEvent.getDate() - 2);
    //
    // if (now >= twoDaysBeforeEvent) {
    //   setEditBlocked(true);
    //   setEditBlockedReason("Event can only be edited at least 2 days before the event start date");
    // } else {
    //   setEditBlocked(false);
    //   setEditBlockedReason("");
    // }
    setEditBlocked(false);
    setEditBlockedReason("");

    setBasic({
      title: event.title,
      subtitle: event.subtitle ?? "",
      description: event.description,
      category: event.category,
      subCategory: event.subCategory ?? "",
      language: "Hindi",
      duration: "3 hours",
      ageRestriction: event.policies.ageRestriction ?? "All ages",
      tags: event.subCategory ?? event.category,
    });
    const matchedCategory = readOrganizerSelectableCategories().find(
      (option) =>
        option.categoryName.toLowerCase() === String(event.subCategory || "").toLowerCase() ||
        option.internalCategory === event.category,
    );
    if (matchedCategory) {
      setSelectedListingCategory({
        sectionName: matchedCategory.sectionName,
        sectionSlug: matchedCategory.sectionSlug,
        categoryName: matchedCategory.categoryName,
        categorySlug: matchedCategory.categorySlug,
      });
    }
    setOrganizer({
      id: event.organizer.id,
      name: event.organizer.name,
      email: event.organizer.email,
      phone: event.organizer.phone,
      city: event.organizer.city,
    });
    setVenues(event.venues.length ? event.venues.map(draftVenueFromEventVenue) : [createDefaultVenue()]);
    const nextRequiresSeatMap = Boolean(event.seatMapTemplateId || event.seatConfig || event.seatMapMode === "seat_map");
    setRequiresSeatMap(nextRequiresSeatMap);
    setBookingMode(
      event.pricingMode === "free" || event.bookingType === "free_registration"
        ? "free_registration"
        : nextRequiresSeatMap
          ? "seat_map"
          : event.bookingType === "slot_based"
            ? "slot_capacity"
            : "ticket_quantity",
    );
    setBookingType(event.bookingType);
    setPricingMode(event.pricingMode);
    setSeatMapMode(nextRequiresSeatMap ? "seat_map" : event.seatMapMode ?? (event.seatMapTemplateId ? "seat_map" : "capacity_only"));
    setSeatMapTemplateId(event.seatMapTemplateId ?? "");
    setSeatMapOverrideId(event.seatMapOverrideId ?? "");
    setSeatMapSummary(event.seatMapSummary);
    setSeatMapTouched(Boolean(event.seatMapOverrideId));
    setSections(event.seatConfig?.sections?.length ? event.seatConfig.sections : createSeatSections());
    setCapacityConfig(event.capacityConfig ?? event.venues[0]?.schedules[0]?.timeSlots[0]?.capacityConfig ?? createCapacityConfig());
    setRatioPercentages(ratioPercentagesFromEvent(event));
    setTicketBlocks(event.ticketBlocks.length ? event.ticketBlocks : createTicketBlocksFromSections(event.seatConfig?.sections ?? createSeatSections()));
    setTicketSectionsTouched(Boolean(event.ticketBlocks.length));
    setTicketDesign({
      ...event.ticketDesign,
      allowTextCustomization: false,
      allowDragDrop: false,
      restrictions: ["Global Buizz ticket layout is locked", ...(event.ticketDesign.restrictions ?? [])],
    });
    setMedia(draftMediaFromEvent(event));
    setPolicies(draftPoliciesFromEvent(event));
    setApproval({
      status: event.status === "pending_review" || event.status === "approved" || event.status === "published" ? "pending_review" : "draft",
      submittedAt: event.approval.submittedAt,
      notes: event.approval.approvalNotes ?? event.approval.rejectionReason ?? "Editing existing event details.",
    });
    setActiveStep(0);
    setValidationMessage(
      event.status === "approved" || event.status === "published"
        ? "This event is already approved or published. Organizer edits will be saved as changes requiring admin review."
        : "",
    );
  }, [editEventId, isEditMode]);

  useEffect(() => {
    if (skipNextDefaultResetRef.current) {
      skipNextDefaultResetRef.current = false;
      return;
    }

    // Don't overwrite data the organizer has already set
    if (ticketSectionsTouched) return;

    const defaultType = defaultBookingTypeForPricing(basic.category, pricingMode);
    if (bookingMode === "free_registration") {
      setBookingType("free_registration");
      setPricingMode("free");
      setRequiresSeatMap(false);
      setSeatMapMode("capacity_only");
    } else if (bookingMode === "seat_map") {
      setBookingType(basic.category === "play" ? "theatre_seating" : "seated");
      setPricingMode("paid");
      setRequiresSeatMap(true);
      setSeatMapMode("seat_map");
    } else if (bookingMode === "slot_capacity") {
      setBookingType("slot_based");
      setPricingMode("paid");
      setRequiresSeatMap(false);
      setSeatMapMode("capacity_only");
    } else {
      setBookingType(defaultType === "free_registration" ? "capacity" : defaultType === "theatre_seating" ? "capacity" : defaultType);
      setPricingMode("paid");
      setRequiresSeatMap(false);
      setSeatMapMode("capacity_only");
    }

    setTicketDesign((current) => ({
      ...current,
      templateId: `template-${basic.category}-premium`,
      templateName:
        basic.category === "play"
          ? "Buizz Verified Play Ticket"
          : basic.category === "activity"
            ? "Buizz Verified Activity Pass"
            : "Buizz Verified Event Ticket",
      category: basic.category,
      allowTextCustomization: false,
      allowDragDrop: false,
      restrictions: ["Global Buizz ticket layout is locked", "QR code cannot be removed", "Buyer details stay locked after booking"],
    }));

    if (ticketSectionsTouched || ticketBlocks.length) return;

    if (pricingMode === "free" || bookingMode === "free_registration") {
      const capacity = createCapacityConfig();
      setCapacityConfig(capacity);
      setTicketBlocks([createRegistrationPassBlock(capacity)]);
      return;
    }

    if (bookingMode === "seat_map") {
      return;
    }

    const capacity = createCapacityConfig();
    setCapacityConfig(capacity);
    setTicketBlocks(createDefaultTicketQuantityBlocks(capacity, pricingMode));
  }, [basic.category, pricingMode, bookingMode, ticketSectionsTouched]);

  useEffect(() => {
    setActiveStep((current) => Math.min(current, visibleSteps.length - 1));
  }, [visibleSteps.length]);

  const selectBookingMode = (mode: BookingModeKey) => {
    if (mode === "seat_map" && !ticketSectionsTouched) {
      setTicketBlocks([]);
    }
    setBookingMode(mode);
  };

  const updateBasic = (field: keyof DraftBasicDetails, value: string) => {
    setBasic((current) => ({ ...current, [field]: value }));
  };

  const updateOrganizer = (field: keyof DraftOrganizer, value: string) => {
    setOrganizer((current) => ({ ...current, [field]: value }));
  };

  const updateVenue = (venueId: string, field: keyof DraftVenue, value: string | number) => {
    setVenues((current) =>
      current.map((venue) => (venue.venueId === venueId ? { ...venue, [field]: value } : venue)),
    );
  };

  const updateSchedule = (venueId: string, scheduleId: string, date: string) => {
    setVenues((current) =>
      current.map((venue) =>
        venue.venueId === venueId
          ? {
            ...venue,
            schedules: venue.schedules.map((schedule) =>
              schedule.scheduleId === scheduleId ? { ...schedule, date } : schedule,
            ),
          }
          : venue,
      ),
    );
  };

  const updateSlot = (venueId: string, scheduleId: string, slotId: string, field: keyof DraftTimeSlot, value: string) => {
    setVenues((current) =>
      current.map((venue) =>
        venue.venueId === venueId
          ? {
            ...venue,
            schedules: venue.schedules.map((schedule) =>
              schedule.scheduleId === scheduleId
                ? {
                  ...schedule,
                  timeSlots: schedule.timeSlots.map((slot) =>
                    slot.slotId === slotId ? { ...slot, [field]: value } : slot,
                  ),
                }
                : schedule,
            ),
          }
          : venue,
      ),
    );
  };

  const addVenue = () => setVenues((current) => [...current, createDefaultVenue()]);

  const removeVenue = (venueId: string) => {
    setVenues((current) => (current.length === 1 ? current : current.filter((venue) => venue.venueId !== venueId)));
  };

  const updateEventDate = (venueId: string, field: "eventStartDate" | "eventEndDate", value: string) => {
    setVenues((current) =>
      current.map((venue) => {
        if (venue.venueId !== venueId) return venue;
        
        // Update the event date field
        const updatedVenue = { ...venue, [field]: value };
        
        // Also update the schedule date if updating eventStartDate
        if (field === "eventStartDate" && updatedVenue.schedules[0]) {
          updatedVenue.schedules = updatedVenue.schedules.map((schedule) => ({
            ...schedule,
            date: value,
          }));
        }
        
        return updatedVenue;
      }),
    );
  };

  const addSchedule = (venueId: string) => {
    setVenues((current) =>
      current.map((venue) =>
        venue.venueId === venueId ? { ...venue, schedules: [...venue.schedules, createDefaultSchedule()] } : venue,
      ),
    );
  };

  const addSlot = (venueId: string, scheduleId: string) => {
    setVenues((current) =>
      current.map((venue) =>
        venue.venueId === venueId
          ? {
            ...venue,
            schedules: venue.schedules.map((schedule) =>
              schedule.scheduleId === scheduleId
                ? { ...schedule, timeSlots: [...schedule.timeSlots, createDefaultSlot()] }
                : schedule,
            ),
          }
          : venue,
      ),
    );
  };

  const updateSection = (sectionId: string, field: keyof SeatSection, value: string | number) => {
    const ratioLockedFields = ["onlineSeats", "offlineSeats", "reservedSeats"];

    if (ticketRatioLock.locked && ratioLockedFields.includes(String(field))) {
      setValidationMessage(ticketRatioLock.message);
      return;
    }

    setSections((current) =>
      current.map((section) => {
        if (section.sectionId !== sectionId) return section;
        if (typeof value === "number") {
          return { ...section, [field]: field === "price" && pricingMode === "free" ? 0 : normalizeInventoryNumber(value) };
        }
        return { ...section, [field]: value };
      }),
    );
  };

  const addSection = () => {
    setSections((current) => [
      ...current,
      {
        sectionId: createId("section"),
        name: `Section ${current.length + 1}`,
        label: `Section ${current.length + 1}`,
        totalSeats: 100,
        onlineSeats: 70,
        offlineSeats: 20,
        reservedSeats: 10,
        soldOnline: 0,
        soldOffline: 0,
        soldReserved: 0,
        price: pricingMode === "free" ? 0 : 499,
        currency: "INR",
        availabilityStatus: "available",
      },
    ]);
  };

  const removeSection = (sectionId: string) => {
    setSections((current) => (current.length === 1 ? current : current.filter((section) => section.sectionId !== sectionId)));
  };

  const resetDefaultSections = () => {
    setSections(createSeatSections().map((section) => (pricingMode === "free" ? { ...section, price: 0 } : section)));
  };


  const updateCapacity = (field: keyof CapacityConfig, value: number) => {
    const ratioLockedFields = ["onlineCapacity", "offlineCapacity", "reservedCapacity"];

    if (ticketRatioLock.locked && ratioLockedFields.includes(String(field))) {
      setValidationMessage(ticketRatioLock.message);
      return;
    }

    setCapacityConfig((current) => ({
      ...current,
      [field]: field === "price" && pricingMode === "free" ? 0 : normalizeInventoryNumber(value),
    }));
  };

  const syncTicketsFromSetup = () => {
    if (ticketRatioLock.locked) {
      setValidationMessage(ticketRatioLock.message);
      return;
    }

    if (pricingMode === "free") {
      setTicketBlocks([createRegistrationPassBlock(capacityConfig)]);
      setTicketSectionsTouched(true);
      return;
    }

    if (usesSeatMapTemplate && seatMapSummary) {
      const snapshot = readOrganizerSeatMapSnapshot({
        overrideId: seatMapOverrideId,
        eventId: draftEventId,
        templateId: seatMapTemplateId,
      });
      if (!snapshot) {
        setValidationMessage("Save event-specific seat map before continuing.");
        return;
      }
      setTicketBlocks(createSeatMapTicketBlocks(seatMapSummary, capacityConfig.price, pricingMode, snapshot));
      setTicketSectionsTouched(true);
      return;
    }

    if (bookingMode === "slot_capacity") {
      setTicketBlocks([createEntryTicketBlock(capacityConfig, bookingType, pricingMode)]);
      setTicketSectionsTouched(true);
      return;
    }

    setTicketBlocks(createDefaultTicketQuantityBlocks(capacityConfig, pricingMode));
    setTicketSectionsTouched(true);
  };

  const updateTicketBlock = (blockId: string, field: keyof TicketBlock, value: string | number) => {
    const ratioLockedFields = ["onlineQuantity", "offlineQuantity", "reservedQuantity"];

    if (ticketRatioLock.locked && ratioLockedFields.includes(String(field))) {
      setValidationMessage(ticketRatioLock.message);
      return;
    }

    setTicketSectionsTouched(true);
    setTicketBlocks((current) =>
      current.map((block) => {
        if (block.blockId !== blockId) return block;
        const normalizedValue =
          typeof value === "number"
            ? field === "price" && pricingMode === "free"
              ? 0
              : normalizeInventoryNumber(value)
            : value;
        return { ...block, [field]: normalizedValue };
      }),
    );
  };

  const addTicketBlock = () => {
    setTicketSectionsTouched(true);
    setTicketBlocks((current) => {
      const nextIndex = current.length + 1;
      const totalQuantity = pricingMode === "free" ? capacityConfig.totalCapacity : 100;
      const onlineQuantity = Math.floor(totalQuantity * 0.7);
      const offlineQuantity = Math.floor(totalQuantity * 0.2);

      return [
        ...current,
        {
          blockId: createId("block"),
          name: `Section ${nextIndex}`,
          type: pricingMode === "free" ? "registration" : "entry_pass",
          price: pricingMode === "free" ? 0 : 499,
          currency: capacityConfig.currency,
          totalQuantity,
          onlineQuantity,
          offlineQuantity,
          reservedQuantity: totalQuantity - onlineQuantity - offlineQuantity,
          soldOnline: 0,
          soldOffline: 0,
          soldReserved: 0,
          minPerBooking: 1,
          maxPerBooking: pricingMode === "free" ? 1 : 10,
          status: "active",
        },
      ];
    });
  };

  const removeTicketBlock = (blockId: string) => {
    setTicketSectionsTouched(true);
    setTicketBlocks((current) => (current.length === 1 ? current : current.filter((block) => block.blockId !== blockId)));
  };

  const autoSplitTicketBlock = (blockId: string) => {
    if (ticketRatioLock.locked) {
      setValidationMessage(ticketRatioLock.message);
      return;
    }

    setTicketSectionsTouched(true);
    setTicketBlocks((current) =>
      current.map((block) => {
        if (block.blockId !== blockId) return block;
        const onlineQuantity = Math.floor(block.totalQuantity * 0.7);
        const offlineQuantity = Math.floor(block.totalQuantity * 0.2);
        return {
          ...block,
          onlineQuantity,
          offlineQuantity,
          reservedQuantity: block.totalQuantity - onlineQuantity - offlineQuantity,
          price: pricingMode === "free" ? 0 : block.price,
        };
      }),
    );
  };

  const autoSplitAllTicketBlocks = () => {
    if (ticketRatioLock.locked) {
      setValidationMessage(ticketRatioLock.message);
      return;
    }

    setTicketSectionsTouched(true);
    setTicketBlocks((current) =>
      current.map((block) => {
        const onlineQuantity = Math.floor(block.totalQuantity * 0.7);
        const offlineQuantity = Math.floor(block.totalQuantity * 0.2);
        return {
          ...block,
          onlineQuantity,
          offlineQuantity,
          reservedQuantity: block.totalQuantity - onlineQuantity - offlineQuantity,
          price: pricingMode === "free" ? 0 : block.price,
        };
      }),
    );
  };

  const setBannerUrl = (value: string) => {
    if (!isAllowedImageUrl(value)) {
      setMediaError("Only JPG and PNG image URLs are allowed for banner.");
      return;
    }

    setMedia((current) => ({ ...current, bannerUrl: value }));
    setMediaError("");
  };

  const handleBannerImageUpload = async (file: File | null) => {
    if (!file) return;

    const validationError = await getEventImageValidationMessage(file, "banner");
    if (validationError) {
      setMediaError(validationError);
      return;
    }

    try {
      const result = await uploadEventImage(file).unwrap();
      setMedia((current) => ({ ...current, bannerUrl: result.url }));
      setMediaError("");
    } catch (error) {
      setMediaError(getApiError(error, "Banner upload failed. Try another JPG or PNG image."));
    }
  };

  const removeBannerImage = () => {
    setMedia((current) => ({ ...current, bannerUrl: "" }));
    setMediaError("");
  };

  const setLogoUrl = (value: string) => {
    if (!isAllowedImageUrl(value)) {
      setMediaError("Only JPG and PNG image URLs are allowed for organizer logo.");
      return;
    }

    setMedia((current) => ({ ...current, logoUrl: value }));
    setMediaError("");
  };

  const handleLogoImageUpload = async (file: File | null) => {
    if (!file) return;

    const validationError = await getEventImageValidationMessage(file, "logo");
    if (validationError) {
      setMediaError(validationError);
      return;
    }

    try {
      const result = await uploadEventImage(file).unwrap();
      setMedia((current) => ({ ...current, logoUrl: result.url }));
      setMediaError("");
    } catch (error) {
      setMediaError(getApiError(error, "Logo upload failed. Try another JPG or PNG image."));
    }
  };

  const removeLogoImage = () => {
    setMedia((current) => ({ ...current, logoUrl: "" }));
    setMediaError("");
  };

  const updateGalleryImage = (index: number, value: string) => {
    if (!isAllowedImageUrl(value)) {
      setMediaError("Only JPG and PNG image URLs are allowed for gallery.");
      return;
    }

    setMedia((current) => ({
      ...current,
      galleryUrls: current.galleryUrls.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
    setMediaError("");
  };

  const handleGalleryImagesUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    const selectedFiles = Array.from(files);
    for (const file of selectedFiles) {
      const validationError = await getEventImageValidationMessage(file, "gallery");
      if (validationError) {
        setMediaError(validationError);
        return;
      }
    }

    setMediaError("");

    let uploadedUrls: string[];
    try {
      uploadedUrls = await Promise.all(selectedFiles.map((file) => uploadEventImage(file).unwrap().then((result) => result.url)));
    } catch (error) {
      setMediaError(getApiError(error, "One or more gallery images could not be uploaded."));
      return;
    }

    setMedia((current) => {
      const availableSlots = maxGalleryImages - current.galleryUrls.filter(Boolean).length;

      if (availableSlots <= 0) {
        setMediaError("Only 4 gallery images are allowed.");
        return current;
      }

      return {
        ...current,
        galleryUrls: [...current.galleryUrls.filter(Boolean), ...uploadedUrls.slice(0, availableSlots)].slice(0, maxGalleryImages),
      };
    });
  };

  const removeGalleryImage = (index: number) => {
    setMedia((current) => ({
      ...current,
      galleryUrls: current.galleryUrls.filter((_, itemIndex) => itemIndex !== index),
    }));
    setMediaError("");
  };

  const moveGalleryImage = (index: number, direction: "left" | "right") => {
    setMedia((current) => {
      const next = [...current.galleryUrls];
      const targetIndex = direction === "left" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) return current;

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...current, galleryUrls: next };
    });
  };

  const addGalleryUrlSlot = () => {
    setMedia((current) => {
      if (current.galleryUrls.length >= maxGalleryImages) {
        setMediaError("Only 4 gallery images are allowed.");
        return current;
      }

      setMediaError("");
      return { ...current, galleryUrls: [...current.galleryUrls, ""] };
    });
  };

  const handleVideoFileUpload = (file: File | null) => {
    if (!file) return;

    setMedia((current) => ({ ...current, videoUrl: URL.createObjectURL(file) }));
    setMediaError("");
  };

  const addSocialLink = () => {
    setMedia((current) => ({
      ...current,
      socialLinks: [
        ...current.socialLinks,
        { id: createId("social"), platform: "instagram", url: "", visible: true },
      ],
    }));
  };

  const updateSocialLink = (id: string, field: keyof DraftSocialLink, value: string | boolean) => {
    setMedia((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link) =>
        link.id === id ? { ...link, [field]: value } : link,
      ),
    }));
  };

  const removeSocialLink = (id: string) => {
    setMedia((current) => ({
      ...current,
      socialLinks: current.socialLinks.filter((link) => link.id !== id),
    }));
  };

  const updatePolicyList = (field: "entryRules" | "customTerms", index: number, value: string) => {
    setPolicies((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const removePolicyListItem = (field: "entryRules" | "customTerms", index: number) => {
    setPolicies((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const resetDefaultPolicies = () => {
    setPolicies((current) => ({
      ...current,
      refundPolicy: "Refunds are available only if the event is cancelled by the organizer or platform.",
      cancellationPolicy: "Cancellation requests are reviewed by Buizz Admin before public communication.",
      entryRules: ["QR ticket is mandatory", "Outside food is not allowed"],
      customTerms: ["Schedule may change due to operational reasons."],
    }));
  };

  const validateStep = (stepId: WizardStepId = currentStep) => {
    if (stepId === "basic" && (!basic.title.trim() || !basic.description.trim() || !basic.duration.trim())) {
      return "Title, description, and duration are required.";
    }

    if (stepId === "venue") {
      const hasInvalidVenue = venues.some(
        (venue) =>
          !venue.venueName.trim() ||
          !venue.city.trim() ||
          !venue.address.trim() ||
          !venue.capacity ||
          !venue.eventStartDate ||
          !venue.eventEndDate ||
          venue.schedules.length === 0 ||
          venue.schedules.some((schedule) => schedule.timeSlots.some((slot) => !slot.startTime || !slot.endTime)),
      );
      if (hasInvalidVenue) return "Add at least one complete venue, event start date, event end date, and time slot.";
    }

    if (stepId === "setup") {
      if (usesSeatMapTemplate && (!seatMapTemplateId || !seatMapOverrideId)) return "Save event-specific seat map before continuing.";
      if (seatMode && !usesSeatMapTemplate && capacityConfig.totalCapacity <= 0) return "Capacity-only setup needs total capacity greater than 0.";
      if (setupValidationMessages.length) return setupValidationMessages[0];
    }

    if (stepId === "pricing") {
      const invalidBlock = ticketBlocks.find((block) => getTicketBlockValidationMessage(block, pricingMode));
      if (invalidBlock) return getTicketBlockValidationMessage(invalidBlock, pricingMode);
    }

    if (stepId === "media" && !media.bannerUrl.trim()) return "Upload one banner image before submitting the event.";
    if (stepId === "media" && mediaError) return mediaError;
    if (stepId === "media" && hasAnyMediaContent && !mediaValidation.isValid) return mediaValidation.message;

    if (stepId === "policies") {
      if (!policies.refundPolicy.trim() || !policies.cancellationPolicy.trim()) {
        return "Refund and cancellation policies are required.";
      }
      if (!policies.organizerTermsAccepted) return "Organizer terms acceptance is required before submitting.";
    }

    return "";
  };

  const getFirstInvalidStepIndex = (targetIndex = visibleSteps.length) => {
    for (let index = 0; index < targetIndex; index += 1) {
      const message = validateStep(visibleSteps[index].id);
      if (message) return { index, message };
    }

    return null;
  };

  const getStepStatus = (index: number) => {
    if (index < activeStep) return "completed";
    if (index === activeStep) return "active";
    return "locked";
  };

  const goNext = () => {
    const message = validateStep(currentStep);
    if (message) {
      setValidationMessage(message);
      toastUtils.error(message);
      return;
    }

    setValidationMessage("");
    setActiveStep((current) => Math.min(current + 1, visibleSteps.length - 1));
  };

  const canOpenStep = (targetIndex: number) => {
    if (targetIndex <= activeStep) return true;

    const invalid = getFirstInvalidStepIndex(targetIndex);

    if (invalid) {
      setActiveStep(invalid.index);
      setValidationMessage(invalid.message);
      toastUtils.error(invalid.message);
      return false;
    }

    return true;
  };

  const goToStep = (targetIndex: number) => {
    if (!canOpenStep(targetIndex)) return;

    setValidationMessage("");
    setActiveStep(targetIndex);
  };

  const resolveEditableStatus = (requestedStatus: "draft" | "pending_review") => {
    if (!isEditMode || !editingEvent) return requestedStatus;
    if (editingEvent.status === "approved" || editingEvent.status === "published") return "pending_review";
    if (editingEvent.status === "pending_review") return "pending_review";
    return requestedStatus;
  };

  const buildEvent = (status: "draft" | "pending_review"): BuizzEvent => {
    const effectiveStatus = resolveEditableStatus(status);
    const eventId = isEditMode && editEventId ? editEventId : draftEventId;
    const slug =
      basic.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || eventId;
    const seatMapSnapshot = usesSeatMapTemplate
      ? readOrganizerSeatMapSnapshot({
        overrideId: seatMapOverrideId,
        eventId,
        templateId: seatMapTemplateId,
      })
      : undefined;
    const effectiveTicketBlocks =
      pricingMode === "free"
        ? [createRegistrationPassBlock(capacityConfig)]
        : ticketBlocks.length
          ? ticketBlocks
          : usesSeatMapTemplate && seatMapSummary
            ? createSeatMapTicketBlocks(
              seatMapSummary,
              capacityConfig.price,
              pricingMode,
              seatMapSnapshot,
            )
            : [];
    const selectedSeatConfig: SeatConfig | undefined = usesSeatMapTemplate
      ? {
        seatMapId: seatMapOverrideId || seatMapTemplateId,
        layoutName: seatMapOverrideId
          ? `${basic.title || "Event"} event-specific seat map`
          : `${basic.title || "Event"} seat map pending setup`,
        layoutType: bookingType === "theatre_seating" ? "theatre" : "sectioned",
        isDefaultLayout: false,
        createdByRole: "organizer",
        colorCustomizationAllowed: false,
        sections: ticketBlocksToSeatSections(effectiveTicketBlocks),
      }
      : undefined;
    const appliedCapacityConfig = usesCapacityOnly ? capacityConfig : undefined;
    const mappedVenues: EventVenue[] = venues.map((venue) => ({
      venueId: venue.venueId,
      venueName: venue.venueName,
      city: venue.city,
      address: venue.address,
      capacity: venue.capacity,
      venueType: venue.venueType,
      schedules: venue.schedules.map((schedule) => ({
        scheduleId: schedule.scheduleId,
        date: schedule.date,
        timeSlots: schedule.timeSlots.map((slot) => ({
          slotId: slot.slotId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          bookingType,
          availabilityStatus: "available",
          seatConfig: selectedSeatConfig,
          capacityConfig: appliedCapacityConfig,
          ratioConfig,
          ticketBlocks: effectiveTicketBlocks,
        })),
      })),
    }));
    const updatedAt = new Date().toISOString();
    const createdAt = editingEvent?.createdAt ?? updatedAt;
    const mappedOffers: BuizzEvent["offers"] = [];
    const grossRevenue =
      pricingMode === "free"
        ? 0
        : effectiveTicketBlocks.reduce((total, block) => total + block.price * block.totalQuantity, 0);
    const venueSeatMaps = usesSeatMapTemplate
      ? mappedVenues.map((venue) => ({
        venueId: venue.venueId,
        venueName: venue.venueName,
        city: venue.city,
        address: venue.address,
        seatMapMode: "seat_map" as const,
        seatMapTemplateId,
        seatMapOverrideId,
        totalCapacity: seatMapSummary?.totalCapacity ?? 0,
        activeSeats: seatMapSummary?.activeSeats ?? 0,
        blockedSeats: seatMapSummary?.blockedSeats ?? 0,
        reservedSeats: seatMapSummary?.reservedSeats ?? 0,
        soldSeats: seatMapSummary?.soldSeats ?? 0,
        ticketTiers: effectiveTicketBlocks.map((block, index) => ({
          tierId: `tier-${block.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || index + 1}`,
          name: block.name,
          price: block.price,
          color: index === 0 ? "#6626B9" : index === 1 ? "#EC1B72" : "#2563EB",
          capacity: block.totalQuantity,
          soldCount: 0,
        })),
      }))
      : undefined;
    const scheduleSeatMaps = usesSeatMapTemplate
      ? mappedVenues.flatMap((venue) =>
        venue.schedules.flatMap((schedule) =>
          schedule.timeSlots.map((slot) => ({
            scheduleId: [venue.venueId, schedule.date, slot.startTime]
              .map((part) => String(part || "default").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
              .filter(Boolean)
              .join(":"),
            venueId: venue.venueId,
            date: schedule.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            seatMapTemplateId,
            seatMapOverrideId,
            availabilitySnapshot: {
              availableSeats: seatMapSummary?.activeSeats ?? 0,
              soldSeats: seatMapSummary?.soldSeats ?? 0,
              lockedSeats: 0,
              blockedSeats: seatMapSummary?.blockedSeats ?? 0,
              reservedSeats: seatMapSummary?.reservedSeats ?? 0,
            },
          })),
        ),
      )
      : undefined;
    const submittedAt = effectiveStatus === "pending_review" ? updatedAt : editingEvent?.approval.submittedAt;
    const existingHistory = editingEvent?.history ?? [];
    const existingNotifications = editingEvent?.notifications ?? [];
    const existingActivityLogs = editingEvent?.activityLogs ?? [];
    const existingApproval = editingEvent?.approval;
    const platformCommissionEstimate = Math.round((grossRevenue * platformFeeSettings.organizerCommissionPercent) / 100);
    const organizerPayableEstimate = Math.max(grossRevenue - platformCommissionEstimate, 0);
    const approvalBlockers: NonNullable<BuizzEvent["lifecycleMetadata"]>["approvalBlockers"] = {
      venueApprovalStatus: "approved",
      seatMapApprovalStatus: requiresSeatMap
        ? usesSeatMapTemplate && seatMapOverrideId && seatMapSnapshot
          ? "pending_review"
          : "pending_setup"
        : "not_required",
      ticketDesignApprovalStatus: "not_required",
      mediaReviewStatus: hasAnyMediaContent ? "pending_review" : "not_required",
      eventReviewStatus: effectiveStatus,
    };
    const lifecycleMetadata: NonNullable<BuizzEvent["lifecycleMetadata"]> = {
      listingSection: selectedListingCategory.sectionName,
      listingSectionSlug: selectedListingCategory.sectionSlug,
      listingCategory: selectedListingCategory.categoryName || basic.subCategory,
      listingCategorySlug: selectedListingCategory.categorySlug || createPlatformSlug(basic.subCategory),
      bookingMode,
      bookingModeLabel: selectedBookingModeCard.title,
      publicBookingFlow: selectedBookingModeCard.publicFlow,
      requiresSeatMap,
      seatMapMode: usesSeatMapTemplate ? "seat_map" : "capacity_only",
      seatMapTemplateId: usesSeatMapTemplate ? seatMapTemplateId : undefined,
      seatMapOverrideId: usesSeatMapTemplate ? seatMapOverrideId : undefined,
      approvalBlockers,
      platformFeeSnapshot: {
        ...platformFeeSettings,
        estimatedGrossRevenue: grossRevenue,
        estimatedPlatformCommission: platformCommissionEstimate,
        estimatedOrganizerPayable: organizerPayableEstimate,
      },
      oneBookingOneTicket: true,
    };

    return {
      id: eventId,
      slug: editingEvent?.slug ?? slug,
      title: basic.title.trim() || "Untitled Event",
      subtitle: basic.subtitle,
      description: basic.description,
      category: basic.category,
      subCategory: selectedListingCategory.categoryName || basic.subCategory,
      status: effectiveStatus,
      date: mappedVenues[0]?.schedules[0]?.date || new Date().toISOString().split('T')[0],
      organizer: {
        ...organizer,
        status: "approved",
        verified: true,
      },
      venues: mappedVenues,
      bookingType,
      pricingMode,
      seatMapMode: usesSeatMapTemplate ? "seat_map" : "capacity_only",
      seatMapTemplateId: usesSeatMapTemplate ? seatMapTemplateId : undefined,
      seatMapOverrideId: usesSeatMapTemplate ? seatMapOverrideId : undefined,
      seatMapSummary: usesSeatMapTemplate ? seatMapSummary : undefined,
      venueSeatMaps,
      scheduleSeatMaps,
      seatConfig: selectedSeatConfig,
      capacityConfig: appliedCapacityConfig,
      ticketBlocks: effectiveTicketBlocks,
      ticketDesign,
      media: mediaConfig,
      policies: {
        organizerTermsAccepted: policies.organizerTermsAccepted,
        userTerms: "Users must follow Buizz and venue rules shown before checkout.",
        refundPolicy: policies.refundPolicy,
        cancellationPolicy: policies.cancellationPolicy,
        ageRestriction: basic.ageRestriction,
        entryRules: policies.entryRules.filter(Boolean),
        customTerms: policies.customTerms.filter(Boolean),
      },
      offers: mappedOffers,
      platformFees: editingEvent?.platformFees ?? [],
      approval: {
        ...existingApproval,
        currentStatus: effectiveStatus,
        submittedAt,
        approvalNotes: approval.notes,
        requiresSuperAdminApproval: existingApproval?.requiresSuperAdminApproval ?? false,
        adminApprovalIsFinal: existingApproval?.adminApprovalIsFinal ?? true,
        platformFeeAssigned: existingApproval?.platformFeeAssigned ?? false,
        organizerAcceptedFees: effectiveStatus === "pending_review" ? false : existingApproval?.organizerAcceptedFees ?? false,
      },
      bookingsSummary: editingEvent?.bookingsSummary ?? {
        totalBookings: 0,
        onlineBookings: 0,
        offlineBookings: 0,
        reservedBookings: 0,
        totalTickets: 0,
        onlineTickets: 0,
        offlineTickets: 0,
        reservedTickets: 0,
      },
      revenueSummary: editingEvent?.revenueSummary ?? {
        onlineRevenue: 0,
        offlineRevenue: 0,
        reservedValue: 0,
        grossRevenue,
        platformFees: platformCommissionEstimate,
        netOrganizerAmount: organizerPayableEstimate,
        paidAmount: 0,
        remainingAmount: organizerPayableEstimate,
        currency: "INR",
      },
      settlement: editingEvent?.settlement ?? {
        settlementId: `settlement-${eventId}`,
        status: "not_started",
        grossRevenue,
        platformFees: platformCommissionEstimate,
        organizerPayable: organizerPayableEstimate,
        paidAmount: 0,
        remainingAmount: organizerPayableEstimate,
      },
      visibility: {
        ...editingEvent?.visibility,
        isPublic: false,
        autoHideAfterMinutes: 30,
        hideReason: effectiveStatus === "pending_review" ? "Pending platform review after organizer edits." : "Organizer draft.",
      },
      lifecycleMetadata,
      history: [
        buildEventHistoryRecord(
          effectiveStatus === "pending_review" ? "submitted" : "updated",
          effectiveStatus === "pending_review" ? "Event changes submitted" : isEditMode ? "Event changes saved" : "Draft saved",
          effectiveStatus === "pending_review"
            ? "Organizer submitted event changes for Buizz review."
            : isEditMode
              ? "Organizer saved event changes."
              : "Organizer saved the event as a draft.",
          { id: organizer.id, role: "organizer" },
        ),
        ...existingHistory,
      ],
      notifications:
        effectiveStatus === "pending_review"
          ? [
            buildEventNotification(
              "event_submitted",
              isEditMode ? "Event changes submitted for review" : "Event submitted for review",
              `${basic.title || "Organizer event"} is waiting for admin review.`,
              "admin",
              eventId,
            ),
            ...existingNotifications,
          ]
          : existingNotifications,
      activityLogs: [
        {
          id: createId("log"),
          action: effectiveStatus === "pending_review" ? "submitted_for_review" : isEditMode ? "event_updated" : "draft_saved",
          description: effectiveStatus === "pending_review" ? "Organizer submitted event changes." : isEditMode ? "Organizer saved event changes." : "Organizer saved event draft.",
          actorId: organizer.id,
          actorRole: "organizer",
          metadata: { category: basic.category, bookingType, pricingMode, editMode: isEditMode, ...lifecycleMetadata },
          createdAt: updatedAt,
        },
        ...existingActivityLogs,
      ],
      createdAt,
      updatedAt,
    };
  };

  const persistEvent = (event: BuizzEvent) => {
    cleanupHeavyEventStorage();

    try {
      saveBuizzEventToIntegration(event);
    } catch (error) {
      if (!isQuotaExceededError(error)) throw error;

      cleanupHeavyEventStorage();
      saveBuizzEventToIntegration(stripLocalPreviewMediaFromEvent(event));
      setMediaError(
        "Uploaded preview files are not stored in browser storage. For saved events, use public image/video URLs or backend upload URLs.",
      );
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_ORGANIZER_EVENTS_STORAGE_KEY);
    const legacyExisting = legacyRaw ? (JSON.parse(legacyRaw) as OrganizerEventSummary[]) : [];
    const safeLegacy = Array.isArray(legacyExisting) ? legacyExisting : [];
    const legacyEvent = createOrganizerSummaryFromEvent(stripLocalPreviewMediaFromEvent(event));
    window.localStorage.setItem(
      LEGACY_ORGANIZER_EVENTS_STORAGE_KEY,
      JSON.stringify([legacyEvent, ...safeLegacy.filter((item) => item.id !== legacyEvent.id)].slice(0, 20)),
    );
  };

  const buildIsoDateTime = (date?: string, time?: string) => {
    const safeDate = date?.trim();
    const safeTime = time?.trim();

    if (!safeDate || !safeTime) {
      throw new Error("Add a valid event date, start time, and end time before submitting.");
    }

    const normalizedTime = safeTime.length === 5 ? `${safeTime}:00` : safeTime;
    const value = new Date(`${safeDate}T${normalizedTime}`);

    if (Number.isNaN(value.getTime())) {
      throw new Error("Add a valid event date and time before submitting.");
    }

    return value.toISOString();
  };

  const buildBackendEventPayload = (event: BuizzEvent): CreateEventBody => {
    const primaryVenue = venues[0] ?? createDefaultVenue();
    const primarySchedule = primaryVenue?.schedules[0];
    const primarySlot = primarySchedule?.timeSlots[0];
    const ticketTypes = (event.ticketBlocks.length ? event.ticketBlocks : displayTicketBlocks)
      .filter((block) => block.status !== "disabled")
      .map((block) => ({
        name: block.name.trim() || "Entry Pass",
        description: `${selectedBookingModeCard.title} - ${block.type.replace(/_/g, " ")}`,
        price: pricingMode === "free" ? 0 : Number(block.price) || 0,
        quantity: Math.max(Number(block.totalQuantity) || 0, 1),
      }));
    const galleryImages = event.media.galleryImages
      .map((asset) => asset.url)
      .filter((url) => url && !isLocalPreviewMediaUrl(url));
    const banner = event.media.bannerImage?.url && !isLocalPreviewMediaUrl(event.media.bannerImage.url)
      ? event.media.bannerImage.url
      : undefined;

    if (!ticketTypes.length) {
      throw new Error("Add at least one active ticket section before submitting.");
    }

    // Build terms and conditions from policies
    const termsConditions = policies.refundPolicy || policies.cancellationPolicy || policies.customTerms?.join('\n') 
      ? JSON.stringify({
          refundPolicy: policies.refundPolicy,
          cancellationPolicy: policies.cancellationPolicy,
          customTerms: policies.customTerms,
          entryRules: policies.entryRules,
        })
      : undefined;

    return {
      title: event.title,
      subtitle: basic.subtitle || undefined,
      description: event.description,
      category: selectedListingCategory.categorySlug || event.subCategory || event.category,
      customCategory: selectedListingCategory.categoryName || event.subCategory,
      language: basic.language || undefined,
      ageRestriction: basic.ageRestriction || undefined,
      duration: basic.duration || undefined,
      type: "offline",
      customType: selectedBookingModeCard.title,
      startDate: buildIsoDateTime(primaryVenue?.eventStartDate, primarySlot?.startTime),
      endDate: buildIsoDateTime(primaryVenue?.eventEndDate, primarySlot?.endTime),
      venue: {
        name: primaryVenue.venueName.trim(),
        address: primaryVenue.address.trim(),
        city: primaryVenue.city.trim(),
        state: "",
        country: "India",
      },
      banner,
      images: galleryImages,
      ticketTypes,
      tags: basic.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      totalSeats: Math.max(totalInventory, ticketTypes.reduce((total, ticket) => total + ticket.quantity, 0), 1),
      termsConditions,
    };
  };

  const extractApprovalReference = (response: unknown) => {
    // Handle different response types from create and update operations
    const responseObj = response as { success?: boolean; status?: string; data?: unknown };
    const data = responseObj?.data;
    
    // Check if data has approvalRequest structure (from createEvent)
    if (data && typeof data === 'object' && 'approvalRequest' in data) {
      const approval = (data as { approvalRequest?: Record<string, unknown> }).approvalRequest;
      const reference = approval?.id ?? approval?.approval_id ?? approval?.request_id;
      if (reference) return `Approval request #${reference}`;
    }
    
    // Check if data has message structure (from createEvent)
    if (data && typeof data === 'object' && 'message' in data) {
      return (data as { message?: string }).message ?? "Submitted to admin review";
    }
    
    // Default fallback for Event responses (from updateEvent)
    return "Submitted to admin review";
  };

  const saveDraft = () => {
    if (isEditMode && editBlocked) {
      setValidationMessage(editBlockedReason);
      toastUtils.error(editBlockedReason);
      return;
    }

    const event = buildEvent("draft");
    void runAction(
      "save-phase3-event-draft",
      async () => {
        if (isEditMode) {
          if (!editingEventNumericId) {
            throw new Error("Cannot update this event because the backend event ID is missing. Open the event from Organizer Events and try again.");
          }

          // In edit mode, call the update API
          const backendPayload = buildBackendEventPayload(event);
          let backendResponse;
          try {
            backendResponse = await updateEvent({ id: editingEventNumericId, data: backendPayload }).unwrap();
          } catch (error) {
            throw new Error(getApiError(error, "Unable to update this event."));
          }
          const persistedEvent = mergeBackendEventIdentity(event, backendResponse);
          persistEvent(persistedEvent);
          setSubmittedEvent(persistedEvent);
          setEditingEvent(persistedEvent);
          setEditingEventNumericId(resolveBackendEventId(persistedEvent, String(editingEventNumericId)));
        } else {
          const backendPayload = buildBackendEventPayload(event);
          const backendResponse = await saveDraftApi(backendPayload).unwrap().catch((error) => {
            throw new Error(getApiError(error, "Unable to save this draft in database."));
          });
          const persistedEvent = mergeBackendEventIdentity(event, backendResponse as unknown);
          const persistedEventId = resolveBackendEventId(persistedEvent, persistedEvent.id);
          persistEvent(persistedEvent);
          setSubmittedEvent(persistedEvent);
          setEditingEvent(persistedEvent);
          if (persistedEventId) setEditingEventNumericId(persistedEventId);
        }
        setSubmittedApprovalReference("");
        setApproval({
          status: event.status === "pending_review" ? "pending_review" : "draft",
          submittedAt: event.approval.submittedAt,
        notes: isEditMode ? "Changes saved." : "Draft saved in database.",
      });
      if (isEditMode) router.push(editReturnPath);
    },
      isEditMode ? "Event changes saved." : "Event draft saved in database.",
    );
  };

  const submitForApproval = () => {
    if (isEditMode && editBlocked) {
      setValidationMessage(editBlockedReason);
      toastUtils.error(editBlockedReason);
      return;
    }

    const submitStepIndex = visibleSteps.findIndex((step) => step.id === "submit");
    const invalid = getFirstInvalidStepIndex(submitStepIndex);

    if (invalid) {
      setActiveStep(invalid.index);
      setValidationMessage(invalid.message);
      toastUtils.error(invalid.message);
      return;
    }

    setValidationMessage("");
    const event = buildEvent("pending_review");
    void runAction(
      "submit-phase3-event",
      async () => {
        const backendPayload = buildBackendEventPayload(event);
        let backendResponse;

        if (isEditMode) {
          if (!editingEventNumericId) {
            throw new Error("Cannot update this event because the backend event ID is missing. Open the event from Organizer Events and try again.");
          }

          // In edit mode, call the update API
          backendResponse = await updateEvent({ id: editingEventNumericId, data: backendPayload }).unwrap().catch((error) => {
            throw new Error(getApiError(error, "Unable to update this event for review."));
          });

          const backendEvent = (backendResponse as any)?.data?.event ?? (backendResponse as any)?.data;
          const backendStatus = String(backendEvent?.status ?? "").toLowerCase();
          if (backendStatus === "draft" || backendStatus === "changes_requested" || backendStatus === "rejected") {
            backendResponse = await submitEventForReviewApi(editingEventNumericId).unwrap().catch((error) => {
              throw new Error(getApiError(error, "Event updated but could not be submitted for review."));
            });
          }
        } else {
          // In create mode, call the create API
          backendResponse = await createEvent(backendPayload).unwrap().catch((error) => {
            throw new Error(getApiError(error, "Unable to submit this event for review."));
          });
        }

        const persistedEvent = mergeBackendEventIdentity(event, backendResponse as unknown);
        const persistedEventId = resolveBackendEventId(persistedEvent, persistedEvent.id);
        persistEvent(persistedEvent);
        setSubmittedEvent(persistedEvent);
        setEditingEvent(persistedEvent);
        if (persistedEventId) setEditingEventNumericId(persistedEventId);
        setSubmittedApprovalReference(extractApprovalReference(backendResponse as unknown));
        setApproval({ status: "pending_review", submittedAt: persistedEvent.approval.submittedAt, notes: "Submitted for Buizz review." });
        if (isEditMode) router.push(editReturnPath);
      },
      isEditMode ? "Event changes submitted to admin for review." : "Event submitted to admin for review successfully.",
    );
  };

  const stepContent = (
    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-5">
      {currentStep === "basic" ? (
        <StepSection
          title="Basic Details"
          description="This information will be visible on the public event page."
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <TextInput label="Event title" value={basic.title} onChange={(value) => updateBasic("title", value)} required />
            <TextInput label="Subtitle" value={basic.subtitle} onChange={(value) => updateBasic("subtitle", value)} />
            <TextInput label="Language" value={basic.language} onChange={(value) => updateBasic("language", value)} />
            <TextInput label="Duration" value={basic.duration} onChange={(value) => updateBasic("duration", value)} required />
            <TextInput label="Age restriction" value={basic.ageRestriction} onChange={(value) => updateBasic("ageRestriction", value)} />
            <TextInput label="Tags" value={basic.tags} onChange={(value) => updateBasic("tags", value)} />
            <div className="md:col-span-2">
              <TextArea
                label="Description"
                value={basic.description}
                onChange={(value) => updateBasic("description", value)}
                helper={`${basic.description.length}/900 characters`}
                required
              />
            </div>
          </div>
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
            <TextInput label="Organizer name" value={organizer.name} onChange={(value) => updateOrganizer("name", value)} />
            <TextInput label="Organizer email" value={organizer.email} onChange={(value) => updateOrganizer("email", value)} />
            <TextInput label="Organizer phone" value={organizer.phone} onChange={(value) => updateOrganizer("phone", value)} />
            <TextInput label="Organizer city" value={organizer.city} onChange={(value) => updateOrganizer("city", value)} />
          </div>
        </StepSection>
      ) : null}

      {currentStep === "category" ? (
        <StepSection
          title="Dynamic Category, Booking Flow & Pricing Mode"
          description="Use Super Admin-created sections and categories. Then choose how the public booking flow should work for this listing."
        >
          <div className="grid min-w-0 gap-5">
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black">Dynamic platform category</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                    These categories are loaded from Super Admin taxonomy. Organizer Create Event shows event-first sections and hides non-event booking categories automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOrganizerCategories(readOrganizerSelectableCategories())}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-xs font-black"
                >
                  Refresh Categories
                </button>
              </div>
            </div>

            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
              <span>Event Category</span>
              <select
                value={`${selectedListingCategory.sectionSlug}::${selectedListingCategory.categorySlug}`}
                onChange={(event) => {
                  const [sectionSlug, categorySlug] = event.target.value.split("::");
                  const option = organizerCategories.find((item) => item.sectionSlug === sectionSlug && item.categorySlug === categorySlug);
                  if (!option) return;
                  setSelectedListingCategory({
                    sectionName: option.sectionName,
                    sectionSlug: option.sectionSlug,
                    categoryName: option.categoryName,
                    categorySlug: option.categorySlug,
                  });
                  updateBasic("category", option.internalCategory);
                  updateBasic("subCategory", option.categoryName);
                  setBookingType(option.defaultBookingType);
                  selectBookingMode(option.defaultBookingType === "slot_based" ? "slot_capacity" : option.defaultBookingType === "theatre_seating" ? "seat_map" : "ticket_quantity");
                  setRequiresSeatMap(option.defaultBookingType === "theatre_seating");
                  setSeatMapMode(option.defaultBookingType === "theatre_seating" ? "seat_map" : "capacity_only");
                }}
                className="min-h-12 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]"
              >
                <option value="events::">Select event category</option>
                {organizerCategories.map((option) => (
                  <option key={`${option.sectionSlug}-${option.categorySlug}`} value={`${option.sectionSlug}::${option.categorySlug}`}>
                    {option.sectionName} - {option.categoryName}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {bookingModeCards.map((mode) => {
                const isSelected = bookingMode === mode.key;

                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => {
                      selectBookingMode(mode.key);
                      if (mode.key === "free_registration") {
                        setPricingMode("free");
                        setBookingType("free_registration");
                        setRequiresSeatMap(false);
                        setSeatMapMode("capacity_only");
                        return;
                      }
                      setPricingMode("paid");
                      if (mode.key === "seat_map") {
                        setBookingType(basic.category === "play" ? "theatre_seating" : "seated");
                        setRequiresSeatMap(true);
                        setSeatMapMode("seat_map");
                        return;
                      }
                      if (mode.key === "slot_capacity") {
                        setBookingType("slot_based");
                        setRequiresSeatMap(false);
                        setSeatMapMode("capacity_only");
                        return;
                      }
                      setBookingType("capacity");
                      setRequiresSeatMap(false);
                      setSeatMapMode("capacity_only");
                    }}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition hover:border-[var(--color-brand-primary)]/50",
                      isSelected ? "border-[var(--color-brand-primary)] bg-[var(--app-elevated)] shadow-[0_18px_42px_rgb(var(--brand-primary-rgb)/0.13)]" : "border-[var(--app-border)] bg-[var(--app-subtle)]",
                    )}
                  >
                    <p className="text-sm font-black">{mode.title}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">{mode.description}</p>
                    <div className="mt-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.10em] text-[var(--app-muted)]">Public flow</p>
                      <p className="mt-1 text-xs font-black leading-5 text-[var(--app-foreground)]">{mode.publicFlow}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid min-w-0 gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:grid-cols-2 xl:grid-cols-4">
              <MediaSummary label="Selected section" value={selectedListingCategory.sectionName} />
              <MediaSummary label="Selected category" value={selectedListingCategory.categoryName || basic.subCategory || toTitle(basic.category)} />
              <MediaSummary label="Booking mode" value={selectedBookingModeCard.title} />
              <MediaSummary label="Seat map required" value={requiresSeatMap ? "Yes, use approved event-specific seat map" : "No, use ticket quantity / capacity flow"} />
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {(["paid", "free"] as PricingMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setPricingMode(mode);
                    if (mode === "free") {
                      selectBookingMode("free_registration");
                      setBookingType("free_registration");
                      setRequiresSeatMap(false);
                      setSeatMapMode("capacity_only");
                    } else if (bookingMode === "free_registration") {
                      selectBookingMode("ticket_quantity");
                      setBookingType("capacity");
                    }
                  }}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition hover:-translate-y-0.5",
                    pricingMode === mode
                      ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 shadow-[0_18px_42px_rgb(var(--brand-primary-rgb)/0.16)]"
                      : "border-[var(--app-border)] bg-[var(--app-subtle)]",
                  )}
                >
                  <p className="text-sm font-black">{mode === "paid" ? "Paid Listing" : "Free Registration"}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                    {mode === "paid"
                      ? "Collect payment and keep ticket pricing, revenue, platform fee and settlement sections."
                      : "No payment required. Creates a Registration Pass at price 0 and skips payment while keeping QR check-in."}
                  </p>
                </button>
              ))}
            </div>

            {pricingMode === "free" ? (
              <div className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-4 text-sm font-bold text-[#15803D]">
                Free flow: Customer books, skips payment, registration succeeds, ticket/QR is generated, booking source is stored, and attendance tracking still works.
              </div>
            ) : null}

            <TextInput
              label="Display sub category"
              value={basic.subCategory}
              onChange={(value) => {
                updateBasic("subCategory", value);
                setSelectedListingCategory((current) => ({
                  ...current,
                  categoryName: value,
                  categorySlug: createPlatformSlug(value),
                }));
              }}
              helper="This is what Admin, Super Admin and public pages will display."
            />
          </div>
        </StepSection>
      ) : null}


      {currentStep === "venue" ? (
        <StepSection title="Venue / Date / Time" description="Set the venue details, event start and end dates, and show times.">
          <div className="grid min-w-0 gap-4">
            {venues.map((venue, venueIndex) => (
              <div key={venue.venueId} className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base font-black">Venue {venueIndex + 1}</p>
                  {venues.length > 1 ? (
                    <button type="button" onClick={() => removeVenue(venue.venueId)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black">
                      <Trash2 className="size-4" /> Remove
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextInput label="Venue name" value={venue.venueName} onChange={(value) => updateVenue(venue.venueId, "venueName", value)} />
                  <TextInput label="City" value={venue.city} onChange={(value) => updateVenue(venue.venueId, "city", value)} />
                  <TextInput label="Address" value={venue.address} onChange={(value) => updateVenue(venue.venueId, "address", value)} />
                  <SelectInput
                    label="Venue type"
                    value={venue.venueType}
                    options={["auditorium", "stadium", "open_ground", "theatre", "activity_zone", "other"]}
                    onChange={(value) => updateVenue(venue.venueId, "venueType", value as VenueType)}
                  />
                  <NumberInput label="Capacity" value={venue.capacity} onChange={(value) => updateVenue(venue.venueId, "capacity", value)} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <TextInput label="Event Start Date" type="date" value={venue.eventStartDate} onChange={(value) => updateEventDate(venue.venueId, "eventStartDate", value)} />
                  <TextInput label="Event End Date" type="date" value={venue.eventEndDate} onChange={(value) => updateEventDate(venue.venueId, "eventEndDate", value)} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <TextInput label="Start Time" type="time" value={venue.schedules[0]?.timeSlots[0]?.startTime || ""} onChange={(value) => updateSlot(venue.venueId, venue.schedules[0]?.scheduleId || "", venue.schedules[0]?.timeSlots[0]?.slotId || "", "startTime", value)} />
                  <TextInput label="End Time" type="time" value={venue.schedules[0]?.timeSlots[0]?.endTime || ""} onChange={(value) => updateSlot(venue.venueId, venue.schedules[0]?.scheduleId || "", venue.schedules[0]?.timeSlots[0]?.slotId || "", "endTime", value)} />
                </div>
              </div>
            ))}
          </div>
          {basic.category !== "event" ? (
            <button type="button" onClick={addVenue} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white">
              <Plus className="size-4" /> Add another venue
            </button>
          ) : null}
        </StepSection>
      ) : null}
      {currentStep === "setup" ? (
        <StepSection
          title="Seat Map or Capacity Setup"
          description="Choose a safe layout option and define simple inventory. Seat colors and final map rules will be controlled by Super Admin."
        >
          <div className="grid min-w-0 gap-5">
            {seatMode ? (
              <>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {([
                    ["capacity_only", "Use Capacity Only", "Keep current capacity and ticket-section inventory logic. No seat map is required."],
                    ["seat_map", "Use Event Seat Map", "Start from an approved venue design, then save the event-specific allocation used everywhere."],
                  ] as const).map(([mode, title, description]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setSeatMapMode(mode);
                        setValidationMessage("");
                        if (mode === "capacity_only") {
                          setSeatMapTemplateId("");
                          setSeatMapOverrideId("");
                          setSeatMapSummary(undefined);
                          setSeatMapTouched(false);
                        }
                      }}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]",
                        seatMapMode === mode
                          ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10"
                          : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:border-[var(--color-brand-primary)]/40",
                      )}
                    >
                      <p className="text-sm font-black">{title}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">{description}</p>
                    </button>
                  ))}
                </div>

                {usesSeatMapTemplate ? (
                  <div className="grid gap-4">
                    <OrganizerSeatMapPersonalizationPanel
                      eventId={editingEvent?.id ?? draftEventId}
                      eventName={basic.title || "Untitled Event"}
                      organizerId={organizer.id}
                      initialTemplateId={seatMapTemplateId}
                      initialOverrideId={seatMapOverrideId}
                      onSave={({ templateId, overrideId, summary }) => {
                        const normalizedSummary = normalizeSeatMapSummary(summary);
                        const snapshot = readOrganizerSeatMapSnapshot({
                          overrideId,
                          eventId: editingEvent?.id ?? draftEventId,
                          templateId,
                        });
                        setSeatMapTemplateId(templateId);
                        setSeatMapOverrideId(overrideId);
                        setSeatMapSummary(normalizedSummary);
                        setSeatMapTouched(true);
                        if (!ticketBlocks.length) {
                          setTicketBlocks(
                            createSeatMapTicketBlocks(
                              normalizedSummary,
                              capacityConfig.price,
                              pricingMode,
                              snapshot,
                            ),
                          );
                          setTicketSectionsTouched(true);
                        }
                      }}
                    />
                    {seatMapSummary ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <MediaSummary label="Starting venue design" value={seatMapTemplateId || "Saved venue design"} />
                        <MediaSummary label="Event-specific override" value={seatMapOverrideId || "Save required"} />
                        <MediaSummary label="Active seats" value={seatMapSummary.activeSeats.toLocaleString("en-IN")} />
                        <MediaSummary label="Blocked seats" value={seatMapSummary.blockedSeats.toLocaleString("en-IN")} />
                        <MediaSummary label="Reserved seats" value={seatMapSummary.reservedSeats.toLocaleString("en-IN")} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <NumberInput
                          label="Total capacity"
                          value={capacityConfig.totalCapacity}
                          onChange={(value) => updateCapacity("totalCapacity", value)}
                        />
                        <NumberInput
                          label="Online capacity"
                          value={capacityConfig.onlineCapacity}
                          onChange={(value) => updateCapacity("onlineCapacity", value)}
                          disabled={ticketRatioLock.locked}
                        />
                        <NumberInput
                          label="Offline capacity"
                          value={capacityConfig.offlineCapacity}
                          onChange={(value) => updateCapacity("offlineCapacity", value)}
                          disabled={ticketRatioLock.locked}
                        />
                        <NumberInput
                          label="Reserved capacity"
                          value={capacityConfig.reservedCapacity}
                          onChange={(value) => updateCapacity("reservedCapacity", value)}
                          disabled={ticketRatioLock.locked}
                        />
                        {pricingMode === "free" ? (
                          <MediaSummary label="Price" value="Free registration" />
                        ) : (
                          <NumberInput
                            label="Base price"
                            value={capacityConfig.price}
                            onChange={(value) => updateCapacity("price", value)}
                          />
                        )}
                        <MediaSummary
                          label="Available"
                          value={calculateCapacityAvailability(capacityConfig).totalAvailable.toLocaleString("en-IN")}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <MediaSummary label="Total" value={inventoryTotals.total.toLocaleString("en-IN")} />
                      <MediaSummary label="Online" value={inventoryTotals.online.toLocaleString("en-IN")} />
                      <MediaSummary label="Offline" value={inventoryTotals.offline.toLocaleString("en-IN")} />
                      <MediaSummary label="Reserved" value={inventoryTotals.reserved.toLocaleString("en-IN")} />
                      <MediaSummary label="Available" value={inventoryTotals.available.toLocaleString("en-IN")} />
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black">Section Inventory</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                            Simple editable rows for approval-ready inventory.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                          <button
                            type="button"
                            onClick={addSection}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-xs font-black"
                          >
                            <Plus className="size-4" />
                            Add Section
                          </button>

                          <button
                            type="button"
                            onClick={resetDefaultSections}
                            className="inline-flex min-h-10 items-center rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {sections.map((section) => {
                          const availability = calculateSectionAvailability(section);

                          return (
                            <div
                              key={section.sectionId}
                              className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4"
                            >
                              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                                <TextInput
                                  label="Section"
                                  value={section.name}
                                  onChange={(value) => updateSection(section.sectionId, "name", value)}
                                />

                                <NumberInput
                                  label="Seats"
                                  value={section.totalSeats}
                                  onChange={(value) => updateSection(section.sectionId, "totalSeats", value)}
                                />

                                <NumberInput
                                  label="Online"
                                  value={section.onlineSeats}
                                  onChange={(value) => updateSection(section.sectionId, "onlineSeats", value)}
                                  disabled={ticketRatioLock.locked}
                                />

                                <NumberInput
                                  label="Offline"
                                  value={section.offlineSeats}
                                  onChange={(value) => updateSection(section.sectionId, "offlineSeats", value)}
                                  disabled={ticketRatioLock.locked}
                                />

                                <NumberInput
                                  label="Reserved"
                                  value={section.reservedSeats}
                                  onChange={(value) => updateSection(section.sectionId, "reservedSeats", value)}
                                  disabled={ticketRatioLock.locked}
                                />

                                {pricingMode === "free" ? (
                                  <MediaSummary label="Price" value="Free" />
                                ) : (
                                  <NumberInput
                                    label="Price"
                                    value={section.price}
                                    onChange={(value) => updateSection(section.sectionId, "price", value)}
                                  />
                                )}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] pt-3">
                                <p className="text-xs font-black text-[var(--app-muted)]">
                                  Available:{" "}
                                  <span className="text-[var(--app-foreground)]">
                                    {availability.totalAvailable.toLocaleString("en-IN")}
                                  </span>
                                </p>

                                <button
                                  type="button"
                                  disabled={sections.length === 1}
                                  onClick={() => removeSection(section.sectionId)}
                                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <NumberInput
                    label={bookingType === "slot_based" ? "Capacity per slot" : "Total capacity"}
                    value={capacityConfig.totalCapacity}
                    onChange={(value) => updateCapacity("totalCapacity", value)}
                  />
                  <NumberInput
                    label="Online capacity"
                    value={capacityConfig.onlineCapacity}
                    onChange={(value) => updateCapacity("onlineCapacity", value)}
                    disabled={ticketRatioLock.locked}
                  />
                  <NumberInput
                    label="Offline capacity"
                    value={capacityConfig.offlineCapacity}
                    onChange={(value) => updateCapacity("offlineCapacity", value)}
                    disabled={ticketRatioLock.locked}
                  />
                  <NumberInput
                    label="Reserved capacity"
                    value={capacityConfig.reservedCapacity}
                    onChange={(value) => updateCapacity("reservedCapacity", value)}
                    disabled={ticketRatioLock.locked}
                  />

                  {pricingMode === "free" ? (
                    <MediaSummary label="Price" value="Free registration" />
                  ) : (
                    <NumberInput
                      label="Base price"
                      value={capacityConfig.price}
                      onChange={(value) => updateCapacity("price", value)}
                    />
                  )}

                  <MediaSummary
                    label="Available"
                    value={calculateCapacityAvailability(capacityConfig).totalAvailable.toLocaleString("en-IN")}
                  />
                </div>
              </div>
            )}

            <div
              className={cn(
                "rounded-2xl border p-4 text-sm font-bold",
                setupValidationMessages.length
                  ? "border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                  : "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#15803D]",
              )}
            >
              {setupValidationMessages.length
                ? setupValidationMessages[0]
                : "Inventory setup is ready."}
            </div>
          </div>
        </StepSection>
      ) : null}
      {currentStep === "pricing" ? (
        <StepSection
          title="Ticket Sections & Inventory"
          description="Create, edit, remove, and split ticket sections. Online, offline, and reserved quantities must match each section total."
        >
          <div className="grid min-w-0 gap-5">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black">Pricing Source</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                    Ticket sections should match your latest capacity or seat-map setup. You can still add custom sections manually.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={addTicketBlock}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-xs font-black"
                  >
                    <Plus className="size-4" />
                    Add Section
                  </button>

                  <button
                    type="button"
                    disabled={ticketRatioLock.locked}
                    onClick={() => {
                      setValidationMessage("");
                      syncTicketsFromSetup();
                    }}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy className="size-4" />
                    Sync From Setup
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MediaSummary label="Price range" value={getPriceRange(ticketBlocks)} />
              <MediaSummary label="Sections" value={`${ticketBlocks.length} sections`} />
              <MediaSummary
                label="Total quantity"
                value={ticketBlocks.reduce((total, block) => total + block.totalQuantity, 0).toLocaleString("en-IN")}
              />
              <MediaSummary
                label="Online quantity"
                value={ticketBlocks.reduce((total, block) => total + block.onlineQuantity, 0).toLocaleString("en-IN")}
              />
            </div>

            <div className="grid min-w-0 gap-4 rounded-2xl border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/5 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
              <div className="min-w-0">
                <p className="text-sm font-black">Organizer payout simulator</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                  Uses Super Admin fee settings now from localStorage. Later backend can replace this without changing the Create Event UI.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MediaSummary label="Sample ticket base price" value={`INR ${platformFeePreview.basePrice.toLocaleString("en-IN")}`} />
                  <MediaSummary label="Organizer platform fee" value={`- INR ${platformFeePreview.organizerCommission.toLocaleString("en-IN")} (${platformFeeSettings.organizerCommissionPercent}%)`} />
                  <MediaSummary label="Organizer net payout" value={`INR ${platformFeePreview.organizerNet.toLocaleString("en-IN")}`} />
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">Buyer checkout preview</p>
                <div className="mt-3 grid gap-2 text-sm font-bold">
                  <div className="flex justify-between gap-3"><span>Subtotal</span><span>₹{platformFeePreview.basePrice.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between gap-3"><span>User convenience fee</span><span>₹{platformFeePreview.convenienceFee.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between gap-3"><span>GST/tax on fee</span><span>₹{platformFeePreview.taxOnFee.toLocaleString("en-IN")}</span></div>
                  <div className="mt-2 flex justify-between gap-3 border-t border-[var(--app-border)] pt-3 text-base font-black"><span>Total buyer payable</span><span>₹{platformFeePreview.customerPayable.toLocaleString("en-IN")}</span></div>
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black">Ticket Sections & Inventory</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                    Edit public section name, price, quantity split, booking limits, and status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addTicketBlock}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white"
                >
                  <Plus className="size-4" />
                  Add Section
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {ticketBlocks.map((block) => {
                  const blockTotal =
                    block.onlineQuantity + block.offlineQuantity + block.reservedQuantity;
                  const validationMessage = getTicketBlockValidationMessage(block, pricingMode);
                  const isBlockValid = !validationMessage;

                  return (
                    <div
                      key={block.blockId}
                      className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4"
                    >
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black">{block.name}</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                            {blockTotal.toLocaleString("en-IN")} allocated of{" "}
                            {block.totalQuantity.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">

                          <button
                            type="button"
                            disabled={ticketBlocks.length === 1}
                            onClick={() => removeTicketBlock(block.blockId)}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black text-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="size-4" />
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <TextInput
                          label="Section name"
                          value={block.name}
                          onChange={(value) => updateTicketBlock(block.blockId, "name", value)}
                        />

                        <NumberInput
                          label="Price"
                          value={block.price}
                          onChange={(value) => updateTicketBlock(block.blockId, "price", value)}
                          disabled={pricingMode === "free"}
                        />

                        <NumberInput
                          label="Total qty"
                          value={block.totalQuantity}
                          onChange={(value) => updateTicketBlock(block.blockId, "totalQuantity", value)}
                        />

                        <NumberInput
                          label="Online qty"
                          value={block.onlineQuantity}
                          onChange={(value) => updateTicketBlock(block.blockId, "onlineQuantity", value)}
                          disabled={ticketRatioLock.locked}
                        />

                        <NumberInput
                          label="Offline qty"
                          value={block.offlineQuantity}
                          onChange={(value) => updateTicketBlock(block.blockId, "offlineQuantity", value)}
                          disabled={ticketRatioLock.locked}
                        />

                        <NumberInput
                          label="Reserved qty"
                          value={block.reservedQuantity}
                          onChange={(value) => updateTicketBlock(block.blockId, "reservedQuantity", value)}
                          disabled={ticketRatioLock.locked}
                        />

                        <NumberInput
                          label="Min booking"
                          value={block.minPerBooking}
                          onChange={(value) => updateTicketBlock(block.blockId, "minPerBooking", value)}
                        />

                        <NumberInput
                          label="Max booking"
                          value={block.maxPerBooking}
                          onChange={(value) => updateTicketBlock(block.blockId, "maxPerBooking", value)}
                        />

                        <SelectInput
                          label="Status"
                          value={block.status}
                          options={["active", "paused", "sold_out", "disabled"]}
                          onChange={(value) => updateTicketBlock(block.blockId, "status", value)}
                        />
                      </div>

                      <div
                        className={cn(
                          "mt-3 rounded-xl border p-3 text-xs font-black",
                          isBlockValid
                            ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#15803D]"
                            : "border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]",
                        )}
                      >
                        {isBlockValid ? "Section inventory is valid." : validationMessage}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <p className="text-sm font-black">Default section guidance</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                Suggested names: {DEFAULT_TICKET_BLOCK_NAMES.join(", ")}. Organizer can adjust names and prices, but final public visibility depends on Admin/Super Admin approval.
              </p>
            </div>

            <div
              className={cn(
                "rounded-2xl border p-4 text-sm font-bold",
                validateStep("pricing")
                  ? "border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                  : "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#15803D]",
              )}
            >
              {validateStep("pricing") || "Ticket sections and inventory are ready."}
            </div>
          </div>
        </StepSection>
      ) : null}
      {currentStep === "media" ? (
        <StepSection
          title="Media Upload"
          description="Organizer controls what appears publicly. Empty banner, gallery, video, or social fields stay hidden on the public detail page."
        >
          <div className="grid min-w-0 gap-5">
            {mediaError ? (
              <div className="rounded-2xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 p-4 text-sm font-black text-[var(--color-brand-primary)]">
                {mediaError}
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                      <ImageIcon className="size-4" />
                      Banner Image
                    </p>
                    <h3 className="mt-2 text-xl font-black">Main public page banner</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                      Upload exactly one HD banner. JPG/JPEG/PNG only, max 5 MB, minimum 1600x900 px.
                    </p>
                  </div>

                  {media.bannerUrl ? (
                    <button
                      type="button"
                      onClick={removeBannerImage}
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--color-brand-primary)]"
                    >
                      <X className="size-4" />
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3">
                  <label className="grid min-h-[170px] cursor-pointer place-items-center rounded-[1.5rem] border border-dashed border-[var(--color-brand-primary)]/35 bg-[var(--app-elevated)] p-5 text-center transition hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]">
                    <input
                      type="file"
                      accept={allowedImageAccept}
                      className="sr-only"
                      onChange={(event) => void handleBannerImageUpload(event.target.files?.[0] ?? null)}
                    />
                    <span>
                      <Upload className="mx-auto size-8 text-[var(--color-brand-primary)]" />
                      <span className="mt-3 block text-sm font-black text-[var(--app-foreground)]">
                        Upload banner image
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-[var(--app-muted)]">
                        JPG / PNG, max 5 MB, minimum 1600x900 px
                      </span>
                    </span>
                  </label>

                  <TextInput
                    label="Or paste banner image URL"
                    value={media.bannerUrl}
                    onChange={setBannerUrl}
                    helper="Only .jpg, .jpeg, or .png URLs are accepted."
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
                {media.bannerUrl ? (
                  <img src={media.bannerUrl} alt="Event banner preview" className="aspect-[16/10] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[16/10] place-items-center bg-[var(--app-subtle)] p-6 text-center">
                    <div>
                      <ImageIcon className="mx-auto size-9 text-[var(--color-brand-primary)]" />
                      <p className="mt-3 text-sm font-black text-[var(--app-foreground)]">Banner hidden until uploaded</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">Public detail page will hide this media block if no media is added.</p>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <MediaSummary label="Banner visibility" value={media.bannerUrl.trim() ? "Visible on public page" : "Hidden"} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                    <Sparkles className="size-4" />
                    Gallery Photos
                  </p>
                  <h3 className="mt-2 text-xl font-black">Premium collage photos</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                    Organizer can upload 0 to 4 HD photos. JPG/JPEG/PNG only, max 5 MB each, minimum 1200x800 px.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={addGalleryUrlSlot}
                    disabled={media.galleryUrls.length >= maxGalleryImages}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="size-4" />
                    Add URL
                  </button>

                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white shadow-[0_14px_34px_rgb(var(--brand-primary-rgb)/0.20)]">
                    <Upload className="size-4" />
                    Upload photos
                    <input
                      type="file"
                      accept={allowedImageAccept}
                      multiple
                      className="sr-only"
                      onChange={(event) => void handleGalleryImagesUpload(event.target.files)}
                    />
                  </label>
                </div>
              </div>

              {media.galleryUrls.length ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  {media.galleryUrls.map((url, index) => (
                    <div key={`${url}-${index}`} className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)]">
                      {url ? (
                        <img src={url} alt={`Gallery preview ${index + 1}`} className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="grid aspect-square place-items-center bg-[var(--app-subtle)] p-5 text-center">
                          <ImageIcon className="size-8 text-[var(--color-brand-primary)]" />
                        </div>
                      )}

                      <div className="grid gap-3 p-3">
                        <TextInput
                          label={`Gallery image ${index + 1}`}
                          value={url}
                          onChange={(value) => updateGalleryImage(index, value)}
                          helper="JPG / PNG only"
                        />

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                          <button
                            type="button"
                            onClick={() => moveGalleryImage(index, "left")}
                            disabled={index === 0}
                            className="min-h-9 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black disabled:opacity-40"
                          >
                            Left
                          </button>
                          <button
                            type="button"
                            onClick={() => moveGalleryImage(index, "right")}
                            disabled={index === media.galleryUrls.length - 1}
                            className="min-h-9 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black disabled:opacity-40"
                          >
                            Right
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="grid size-9 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--color-brand-primary)]"
                            aria-label={`Remove gallery image ${index + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 grid min-h-[180px] place-items-center rounded-[1.5rem] border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center">
                  <div>
                    <ImageIcon className="mx-auto size-9 text-[var(--color-brand-primary)]" />
                    <p className="mt-3 text-sm font-black text-[var(--app-foreground)]">Gallery hidden until photos are added</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">Upload or paste up to 4 JPG/PNG images.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                    <ImageIcon className="size-4" />
                    Organizer Logo
                  </p>
                  <h3 className="mt-2 text-xl font-black">Optional logo</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                    Upload logo only when needed. JPG/PNG only. If empty, logo stays hidden.
                  </p>
                </div>

                {media.logoUrl ? (
                  <button
                    type="button"
                    onClick={removeLogoImage}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--color-brand-primary)]"
                  >
                    <X className="size-4" />
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)]">
                  {media.logoUrl ? (
                    <img src={media.logoUrl} alt="Organizer logo preview" className="size-full object-cover" />
                  ) : (
                    <ImageIcon className="size-8 text-[var(--color-brand-primary)]" />
                  )}
                </div>

                <div className="grid gap-3">
                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white">
                    <Upload className="size-4" />
                    Upload logo
                    <input
                      type="file"
                      accept={allowedImageAccept}
                      className="sr-only"
                      onChange={(event) => handleLogoImageUpload(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  <TextInput
                    label="Or paste logo URL"
                    value={media.logoUrl}
                    onChange={setLogoUrl}
                    helper="Optional .jpg, .jpeg, or .png URL."
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                  <Video className="size-4" />
                  Video
                </p>
                <h3 className="mt-2 text-xl font-black">Optional event video</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                  Add a YouTube link, MP4/WebM URL, or upload a video preview. If empty, video block stays hidden.
                </p>

                <div className="mt-4 grid gap-3">
                  <TextInput
                    label="Video URL optional"
                    value={media.videoUrl}
                    onChange={(value) => setMedia((current) => ({ ...current, videoUrl: value }))}
                    helper="YouTube, MP4, WebM, or public video link."
                  />

                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-xs font-black text-[var(--app-foreground)]">
                    <Upload className="size-4 text-[var(--color-brand-primary)]" />
                    Upload video preview
                    <input
                      type="file"
                      accept={allowedVideoAccept}
                      className="sr-only"
                      onChange={(event) => handleVideoFileUpload(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                      <Link2 className="size-4" />
                      Social Media
                    </p>
                    <h3 className="mt-2 text-xl font-black">Optional social links</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                      If organizer adds links, they appear on the public detail page. Otherwise the section stays hidden.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addSocialLink}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white"
                  >
                    <Plus className="size-4" />
                    Add link
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  {media.socialLinks.length ? (
                    media.socialLinks.map((link) => (
                      <div key={link.id} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
                        <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                          <SelectInput
                            label="Platform"
                            value={link.platform}
                            options={["instagram", "facebook", "youtube", "linkedin", "x", "website"]}
                            onChange={(value) => updateSocialLink(link.id, "platform", value)}
                          />
                          <TextInput
                            label="Profile / post URL"
                            value={link.url}
                            onChange={(value) => updateSocialLink(link.id, "url", value)}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-2 text-xs font-black text-[var(--app-muted)]">
                            <input
                              type="checkbox"
                              checked={link.visible}
                              onChange={(event) => updateSocialLink(link.id, "visible", event.target.checked)}
                              className="size-4"
                            />
                            Visible publicly
                          </label>

                          <div className="flex gap-2">
                            {link.url ? (
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black"
                              >
                                Open
                                <ExternalLink className="size-3.5" />
                              </a>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => removeSocialLink(link.id)}
                              className="grid size-9 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--color-brand-primary)]"
                              aria-label="Remove social link"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="grid min-h-[150px] place-items-center rounded-[1.5rem] border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-5 text-center">
                      <div>
                        <Link2 className="mx-auto size-8 text-[var(--color-brand-primary)]" />
                        <p className="mt-3 text-sm font-black text-[var(--app-foreground)]">Social section hidden</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">Add links only if organizer wants them public.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MediaSummary label="Banner" value={media.bannerUrl.trim() ? "Visible" : "Hidden"} />
              <MediaSummary label="Logo" value={media.logoUrl.trim() ? "Visible" : "Hidden"} />
              <MediaSummary label="Gallery" value={media.galleryUrls.filter(Boolean).length ? `${media.galleryUrls.filter(Boolean).length}/4 visible` : "Hidden"} />
              <MediaSummary label="Video" value={media.videoUrl.trim() ? "Visible" : "Hidden"} />
              <MediaSummary label="Social" value={visibleSocialLinksCount ? `${visibleSocialLinksCount} visible` : "Hidden"} />
            </div>

            <DefaultTicketPreview
              basic={basic}
              organizer={organizer}
              venues={venues}
              media={media}
              ticketBlocks={displayTicketBlocks}
              pricingMode={pricingMode}
              selectedListingCategory={selectedListingCategory}
            />
          </div>
        </StepSection>
      ) : null}

      {currentStep === "policies" ? (
        <StepSection title="Policies / Terms" description="Organizer terms are configured by Super Admin later and must be accepted before submission.">
          <div className="grid min-w-0 gap-4">
            <TextArea label="Refund policy" value={policies.refundPolicy} onChange={(value) => setPolicies((current) => ({ ...current, refundPolicy: value }))} required />
            <TextArea label="Cancellation policy" value={policies.cancellationPolicy} onChange={(value) => setPolicies((current) => ({ ...current, cancellationPolicy: value }))} required />
            <TextInput label="Age rule" value={basic.ageRestriction} onChange={(value) => updateBasic("ageRestriction", value)} />
            <ListEditor title="Entry rules" items={policies.entryRules} onChange={(index, value) => updatePolicyList("entryRules", index, value)} onAdd={() => setPolicies((current) => ({ ...current, entryRules: [...current.entryRules, ""] }))} onRemove={(index) => removePolicyListItem("entryRules", index)} />
            <ListEditor title="Custom terms" items={policies.customTerms} onChange={(index, value) => updatePolicyList("customTerms", index, value)} onAdd={() => setPolicies((current) => ({ ...current, customTerms: [...current.customTerms, ""] }))} onRemove={(index) => removePolicyListItem("customTerms", index)} />
            <label className="flex items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-bold">
              <input type="checkbox" checked={policies.organizerTermsAccepted} onChange={(event) => setPolicies((current) => ({ ...current, organizerTermsAccepted: event.target.checked }))} className="mt-1 size-4" />
              <span>Organizer accepts Buizz organizer terms before submitting this event for review.</span>
            </label>
            <button type="button" onClick={resetDefaultPolicies} className="w-fit rounded-xl border border-[var(--app-border)] px-4 py-2 text-xs font-black">
              Reset default policies
            </button>
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-semibold leading-6 text-[var(--app-muted)]">
              Policies will be reviewed by Admin/Super Admin. After approval, these policies will be visible on the public event page and ticket flow.
            </div>
          </div>
        </StepSection>
      ) : null}

      {currentStep === "submit" ? (
        <StepSection
          title={isEditMode ? "Update for Review" : "Submit for Approval"}
          description={isEditMode ? "Save changes to the existing event and send them for review." : "Create the final event object and move it into pending review."}
        >
          {submittedEvent?.status === "pending_review" ? (
            <div className="rounded-3xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-6">
              <Check className="size-10 text-[#22C55E]" />
              <h2 className="mt-4 text-2xl font-black">Event submitted to admin for review successfully.</h2>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                Organizer can track progress from Organizer Events page after the admin review queue refreshes.
              </p>
              {submittedApprovalReference ? (
                <p className="mt-3 w-fit rounded-xl border border-[#22C55E]/25 bg-white/70 px-3 py-2 text-xs font-black text-[#15803D]">
                  {submittedApprovalReference}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4">
              <PreviewSummary
                basic={basic}
                organizer={organizer}
                venues={venues}
                bookingType={bookingType}
                pricingMode={pricingMode}
                totalInventory={totalInventory}
                ticketBlocks={displayTicketBlocks}
                media={media}
                mediaVisibility={mediaVisibility}
                policies={policies}
                approvalStatus="draft"
                selectedListingCategory={selectedListingCategory}
                bookingMode={bookingMode}
                bookingModeLabel={selectedBookingModeCard.title}
                publicBookingFlow={selectedBookingModeCard.publicFlow}
                requiresSeatMap={requiresSeatMap}
                platformFeeSettings={platformFeeSettings}
                platformFeePreview={platformFeePreview}
                seatMapMode={seatMapMode}
                seatMapTemplateId={seatMapTemplateId}
                seatMapOverrideId={seatMapOverrideId}
                seatMapSummary={seatMapSummary}
              />
            </div>
          )}
        </StepSection>
      ) : null}
    </div>
  );


  return (
    <section className="relative -mx-2 grid w-full max-w-[100vw] min-w-0 gap-3 overflow-x-hidden px-2 pb-24 sm:mx-0 sm:gap-5 sm:px-0 sm:pb-0">
      <ActionFeedback successMessage={successMessage} errorMessage={errorMessage} />

      {validationMessage ? (
        <div className="rounded-2xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 p-4 text-sm font-black text-[var(--color-brand-primary)]">
          {validationMessage}
        </div>
      ) : null}

      {isEditMode ? (
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-bold text-[var(--app-muted)]">
          Editing event ID{" "}
          <span className="font-black text-[var(--app-foreground)]">
            {editEventId}
          </span>
          . Draft, rejected, and pending review edits update the same event.
          Approved or published event edits are saved as changes requiring admin review.
        </div>
      ) : null}

      <div className="w-full max-w-[100vw] min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:rounded-[2rem] sm:p-3 lg:p-4">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2 sm:p-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
              Step {activeStep + 1} of {visibleSteps.length}
            </p>
            <p className="truncate text-sm font-black text-[var(--app-foreground)]">
              {visibleSteps[activeStep]?.title ?? "Create Event"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowStepSidebar((current) => !current)}
            className="shrink-0 rounded-xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white sm:px-4"
          >
            {showStepSidebar ? "Hide Sidebar" : "Show Sidebar"}
          </button>
        </div>

        <div
          className={cn(
            "grid min-w-0 gap-3 transition-all duration-300 xl:gap-5",
            showStepSidebar
              ? "grid-cols-[56px_minmax(0,1fr)] sm:grid-cols-[64px_minmax(0,1fr)] xl:grid-cols-[76px_minmax(0,1fr)]"
              : "grid-cols-1",
          )}
        >
          {showStepSidebar ? (
            <aside className="group/wizard relative z-30 min-w-0 overflow-visible">
              <div className="sticky top-3 h-[calc(100dvh-1.5rem)] min-w-0 overflow-visible">
                <div className="absolute left-0 top-0 flex h-full w-14 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)]/95 shadow-[0_20px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] sm:w-16 xl:w-[76px] xl:group-hover/wizard:w-[292px] xl:group-focus-within/wizard:w-[292px]">
                  <div className="relative shrink-0 overflow-hidden border-b border-[var(--app-border)] p-2 sm:p-3">
                    <div className="relative z-10 flex min-w-0 items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)] text-sm font-black text-white shadow-[0_14px_30px_rgba(236,27,114,0.22)] sm:size-11">
                        {activeStep + 1}
                      </div>

                      <div className="min-w-0 translate-x-2 opacity-0 transition-all duration-500 xl:group-hover/wizard:translate-x-0 xl:group-hover/wizard:opacity-100 xl:group-focus-within/wizard:translate-x-0 xl:group-focus-within/wizard:opacity-100">
                        <p className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.16em] text-[var(--app-muted)]">
                          Step {activeStep + 1} of {visibleSteps.length}
                        </p>
                        <h2 className="mt-1 w-[190px] truncate text-base font-black text-[var(--app-foreground)]">
                          {visibleSteps[activeStep]?.title ?? "Create Event"}
                        </h2>
                      </div>
                    </div>

                    <div className="relative z-10 mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-subtle)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-brand-primary)] transition-all duration-700 ease-out"
                          style={{
                            width: `${((activeStep + 1) / visibleSteps.length) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-center text-[10px] font-black text-[var(--app-muted)] xl:text-left xl:opacity-0 xl:transition-opacity xl:duration-500 xl:group-hover/wizard:opacity-100 xl:group-focus-within/wizard:opacity-100">
                        {Math.round(((activeStep + 1) / visibleSteps.length) * 100)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:none] sm:p-2.5 [&::-webkit-scrollbar]:hidden">
                    <div className="grid gap-2">
                      {visibleSteps.map((item, index) => {
                        const stepStatus = getStepStatus(index);
                        const isActive = stepStatus === "active";
                        const isDone = stepStatus === "completed";
                        const isLocked = stepStatus === "locked";
                        const StepIcon = getWizardStepIcon(item.id);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => goToStep(index)}
                            title={isLocked ? "Complete previous step first" : item.title}
                            aria-label={isLocked ? `${item.title}. Complete previous step first.` : item.title}
                            className={cn(
                              "group/step relative flex min-h-11 w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.1rem] border px-2 text-left transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] hover:translate-x-0.5 sm:min-h-12",
                              isActive &&
                              "border-transparent bg-[var(--color-brand-primary)] text-white shadow-[0_16px_34px_rgba(236,27,114,0.22)]",
                              isDone &&
                              !isActive &&
                              "border-[#22C55E]/25 bg-[#22C55E]/10 text-[var(--app-foreground)] hover:border-[#22C55E]",
                              isLocked &&
                              "border-transparent bg-transparent text-[var(--app-muted)] opacity-70 hover:bg-[var(--app-subtle)] hover:text-[var(--app-foreground)] hover:opacity-100",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-2xl text-xs font-black transition-all duration-500 sm:size-9",
                                isActive && "bg-white/20 text-white ring-4 ring-white/10",
                                isDone && !isActive && "bg-[#22C55E] text-white",
                                isLocked &&
                                "bg-[var(--app-subtle)] text-[var(--app-muted)] group-hover/step:bg-[var(--app-elevated)]",
                              )}
                            >
                              {isDone ? (
                                <Check className="size-4" />
                              ) : isLocked ? (
                                <Lock className="size-3.5" />
                              ) : (
                                <StepIcon className="size-4" />
                              )}
                            </span>

                            <span className="min-w-0 translate-x-2 opacity-0 transition-all duration-500 xl:group-hover/wizard:translate-x-0 xl:group-hover/wizard:opacity-100 xl:group-focus-within/wizard:translate-x-0 xl:group-focus-within/wizard:opacity-100">
                              <span className="block w-[190px] truncate text-xs font-black">
                                {index + 1}. {item.shortTitle}
                              </span>
                              <span
                                className={cn(
                                  "mt-0.5 block w-[190px] truncate text-[10px] font-bold",
                                  isActive ? "text-white/75" : "text-[var(--app-muted)]",
                                )}
                              >
                                {item.title}
                              </span>
                            </span>

                            {isActive ? (
                              <span className="absolute right-2 top-1/2 hidden size-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.18)] xl:group-hover/wizard:block xl:group-focus-within/wizard:block" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-[var(--app-border)] p-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)] sm:p-2.5">
                    Draft save is on final review
                  </div>
                </div>
              </div>
            </aside>
          ) : null}

          <main className="w-full max-w-full min-w-0 overflow-hidden">
            <div className="mb-4 w-full max-w-full min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:mb-5 sm:p-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black">Live Summary</p>
                  <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">
                    Compact organizer preview before approval.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-[var(--app-elevated)] px-4 py-2 text-xs font-black text-[var(--color-brand-primary)]">
                  {approval.status === "pending_review" ? "Pending Review" : "Draft"}
                </span>
              </div>

              <div className="mt-4 hidden min-w-0 gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4">
                <SummaryLine icon={<Ticket className="size-4" />} label="Title" value={basic.title || "Untitled event"} />
                <SummaryLine icon={<Sparkles className="size-4" />} label="Category" value={`${toTitle(basic.category)} / ${toTitle(bookingType)}`} />
                <SummaryLine icon={<MapPin className="size-4" />} label="Venue" value={venues[0]?.venueName || "Venue pending"} />
                <SummaryLine icon={<CalendarDays className="size-4" />} label="Date" value={venues[0]?.schedules[0]?.date || "Date pending"} />
                <SummaryLine icon={<Clock className="size-4" />} label="Inventory" value={`${totalInventory.toLocaleString("en-IN")} total`} />
                <SummaryLine icon={<Ticket className="size-4" />} label="Price" value={getPriceRange(displayTicketBlocks)} />
                <SummaryLine icon={<ImageIcon className="size-4" />} label="Media" value={`${media.bannerUrl.trim() ? "1 banner, " : ""}${media.logoUrl.trim() ? "logo, " : ""}${media.galleryUrls.filter(Boolean).length}/4 photos, video ${media.videoUrl.trim() ? "on" : "off"}`} />
                <SummaryLine icon={<ShieldCheck className="size-4" />} label="Approval" value={approval.status === "pending_review" ? "Pending Review" : "Draft"} />
              </div>
            </div>

            {stepContent}

            <div className="fixed inset-x-2 bottom-2 z-40 flex flex-col gap-2 rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-elevated)]/95 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:sticky sm:inset-auto sm:bottom-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <button
                type="button"
                onClick={() => {
                  setValidationMessage("");
                  setActiveStep((current) => Math.max(current - 1, 0));
                }}
                disabled={activeStep === 0}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 text-sm font-black disabled:opacity-50 sm:w-auto"
              >
                <ArrowLeft className="size-4" />
                Previous
              </button>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                {activeStep === visibleSteps.length - 1 ? (
                  <LoadingButton
                    loading={loadingKey === "save-phase3-event-draft"}
                    loadingText="Saving..."
                    onClick={saveDraft}
                    className="min-h-11 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black sm:w-auto"
                  >
                    {isEditMode ? "Save Changes" : "Save Draft"}
                  </LoadingButton>
                ) : null}

                {activeStep < visibleSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(236,27,114,0.22)] sm:w-auto"
                  >
                    Next
                    <ArrowRight className="size-4" />
                  </button>
                ) : (
                  <LoadingButton
                    loading={loadingKey === "submit-phase3-event"}
                    loadingText="Submitting..."
                    onClick={submitForApproval}
                    className="min-h-11 w-full rounded-2xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white sm:w-auto"
                  >
                    {isEditMode ? "Update & Submit for Review" : "Submit for Approval"}
                  </LoadingButton>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}

const bookingTypeDescription: Record<BookingType, string> = {
  seated: "For concerts, shows, and plays where seat or section inventory matters.",
  theatre_seating: "For theatre shows with strict seat map and showtime control.",
  block_seating: "For arena or zone-based tickets without seat-level selection.",
  capacity: "For general entry events with a total capacity limit.",
  slot_based: "For activities, workshops, games, and timed experiences.",
  free_registration: "For free events that still need registration and QR access.",
};

function StepSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="w-full max-w-full min-w-0 overflow-hidden">
      <div className="mb-4 flex min-w-0 items-start gap-3 sm:mb-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] sm:size-11">
          <Info className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-lg font-black tracking-tight sm:text-xl [overflow-wrap:anywhere]">{title}</h2>
          <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6 [overflow-wrap:anywhere]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled = false,
  className,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helper?: string;
}) {
  return (
    <label className={cn("grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]", className)}>
      <span className="flex min-w-0 items-center gap-1 break-words [overflow-wrap:anywhere]">
        {label} {required ? <span className="text-[var(--color-brand-primary)]">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      {helper ? <span className="text-[11px] font-bold normal-case text-[var(--app-muted)]">{helper}</span> : null}
    </label>
  );
}

function NumberInput({ label, value, onChange, disabled = false }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <TextInput label={label} type="number" value={String(value)} onChange={(next) => onChange(Math.max(Number(next || 0), 0))} disabled={disabled} />
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {toTitle(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  helper,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
      <span className="flex min-w-0 items-center gap-1 break-words [overflow-wrap:anywhere]">
        {label} {required ? <span className="text-[var(--color-brand-primary)]">*</span> : null}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-36 w-full min-w-0 resize-y rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-semibold normal-case leading-6 text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] [overflow-wrap:anywhere]"
      />
      {helper ? <span className="text-right text-[11px] font-bold normal-case text-[var(--app-muted)]">{helper}</span> : null}
    </label>
  );
}

function DefaultTicketPreview({
  basic,
  organizer,
  venues,
  media,
  ticketBlocks,
  pricingMode,
  selectedListingCategory,
}: {
  basic: DraftBasicDetails;
  organizer: DraftOrganizer;
  venues: DraftVenue[];
  media: DraftMedia;
  ticketBlocks: TicketBlock[];
  pricingMode: PricingMode;
  selectedListingCategory: SelectedListingCategory;
}) {
  const venue = venues[0];
  const schedule = venue?.schedules[0];
  const slot = schedule?.timeSlots[0];
  const visibleBlocks = ticketBlocks.length ? ticketBlocks.slice(0, 4) : [createRegistrationPassBlock(createCapacityConfig())];
  const bookingId = "PREVIEW-ONLY";
  const seatGroups = visibleBlocks.map((block) => ({
    section: block.name,
    totalSeats: Math.max(block.minPerBooking, 1),
    seatNumbers: [`${block.name} x${Math.max(block.minPerBooking, 1)}`],
    amount: pricingMode === "free" ? 0 : block.price * Math.max(block.minPerBooking, 1),
  }));
  const totalSeats = seatGroups.reduce((total, group) => total + group.totalSeats, 0) || 1;
  const totalAmount = seatGroups.reduce((total, group) => total + group.amount, 0);

  return (
    <div className="grid min-w-0 gap-3 rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black">Buizz ticket content preview</p>
        <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-[10px] font-black uppercase text-[var(--color-brand-primary)]">
          Buizz.com verified ticket/pass
        </span>
      </div>
      <BuizzBookingPass
        bookingId={bookingId}
        eventTitle={basic.title || "Untitled Event"}
        eventImage={media.bannerUrl.trim() || undefined}
        organizerName={organizer.name || "Organizer name pending"}
        organizerLogo={media.logoUrl.trim() || undefined}
        category={selectedListingCategory.categoryName || toTitle(basic.category)}
        categoryIcon={<Ticket className="size-4" />}
        dateLabel={schedule?.date || "Date pending"}
        timeLabel={slot?.startTime || "Time pending"}
        venueName={venue?.venueName || "Venue pending"}
        venueCity={venue?.city}
        status="preview"
        seatGroups={seatGroups}
        totalSeats={totalSeats}
        totalAmountPaid={totalAmount}
        qrValue={JSON.stringify({
          type: "buizz-ticket",
          bookingId,
          eventId: "preview-event",
          totalSeats,
          sections: seatGroups.map((group) => group.section),
          status: "preview",
          signedToken: "pending-backend-signature",
        })}
        showActions={false}
        previewMode
      />
      <div className="grid gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-xs font-bold text-[var(--app-muted)]">
        <p className="font-black text-[var(--app-foreground)]">Selected sections</p>
        <p>{seatGroups.map((group) => `${group.section} (${group.totalSeats})`).join(", ") || "Registration Pass"}</p>
        <p>Total amount preview: INR {totalAmount.toLocaleString("en-IN")}</p>
        <p>One booking will generate one ticket with all selected seats/sections inside it.</p>
      </div>
    </div>
  );
}

function MediaSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <p className="text-xs font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-2 break-words text-sm font-black [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

function ListEditor({
  title,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black">{title}</p>
        <button type="button" onClick={onAdd} className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-black">Add</button>
      </div>
      <div className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <TextInput label={`${title} ${index + 1}`} value={item} onChange={(value) => onChange(index, value)} />
            <button type="button" onClick={() => onRemove(index)} className="min-h-11 self-end rounded-xl border border-[var(--app-border)] px-3 text-xs font-black">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewSummary({
  basic,
  organizer,
  venues,
  bookingType,
  pricingMode,
  totalInventory,
  ticketBlocks,
  media,
  mediaVisibility,
  policies,
  approvalStatus,
  selectedListingCategory,
  bookingMode,
  bookingModeLabel,
  publicBookingFlow,
  requiresSeatMap,
  platformFeeSettings,
  platformFeePreview,
  seatMapMode,
  seatMapTemplateId,
  seatMapOverrideId,
  seatMapSummary,
}: {
  basic: DraftBasicDetails;
  organizer: DraftOrganizer;
  venues: DraftVenue[];
  bookingType: BookingType;
  pricingMode: PricingMode;
  totalInventory: number;
  ticketBlocks: TicketBlock[];
  media: DraftMedia;
  mediaVisibility: ReturnType<typeof getMediaVisibility>;
  policies: DraftPolicies;
  approvalStatus: "draft" | "pending_review";
  selectedListingCategory: SelectedListingCategory;
  bookingMode: BookingModeKey;
  bookingModeLabel: string;
  publicBookingFlow: string;
  requiresSeatMap: boolean;
  platformFeeSettings: PlatformFeeSettings;
  platformFeePreview: ReturnType<typeof calculateFeePreview>;
  seatMapMode: SeatMapMode;
  seatMapTemplateId: string;
  seatMapOverrideId: string;
  seatMapSummary?: SeatMapSummary;
}) {
  return (
    <StepSection title="Review & Submit" description="Review exactly what Admin/Super Admin will inspect before approval.">
      <div className="grid min-w-0 gap-4">
        <div className="min-w-0 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">Approval status: {approvalStatus === "pending_review" ? "Pending Review" : "Draft"}</p>
              <h2 className="mt-2 text-2xl font-black">{basic.title || "Untitled Event"}</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--app-muted)]">{basic.description}</p>
            </div>
            <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-2 text-xs font-black text-[var(--color-brand-primary)]">
              {selectedListingCategory.sectionName} / {selectedListingCategory.categoryName || toTitle(basic.category)} / {pricingMode === "free" ? "Free" : "Paid"}
            </span>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MediaSummary label="Venue / date" value={`${venues[0]?.venueName || "Venue"} / ${venues[0]?.schedules[0]?.date || "Date"}`} />
          <MediaSummary label="Dynamic category" value={`${selectedListingCategory.sectionName} / ${selectedListingCategory.categoryName || basic.subCategory || toTitle(basic.category)}`} />
          <MediaSummary label="Booking mode" value={bookingModeLabel} />
          <MediaSummary label="Public booking flow" value={publicBookingFlow} />
          <MediaSummary label="Seat mapping" value={requiresSeatMap ? "Required, event-specific map review needed" : "Not required, use ticket quantity/capacity"} />
          <MediaSummary label="Seat or capacity setup" value={seatMapMode === "seat_map" ? "Event-specific saved seat map" : `${totalInventory.toLocaleString("en-IN")} total inventory`} />
          {seatMapMode === "seat_map" ? (
            <>
              <MediaSummary label="Starting venue design" value={seatMapTemplateId || "Not selected yet"} />
              <MediaSummary label="Event-specific override" value={seatMapOverrideId || "Save required"} />
              <MediaSummary label="Active seats" value={(seatMapSummary?.activeSeats ?? 0).toLocaleString("en-IN")} />
              <MediaSummary label="Blocked seats" value={(seatMapSummary?.blockedSeats ?? 0).toLocaleString("en-IN")} />
              <MediaSummary label="Reserved seats" value={(seatMapSummary?.reservedSeats ?? 0).toLocaleString("en-IN")} />
              <MediaSummary label="Seat tiers" value={(seatMapSummary?.tierCount ?? 0).toLocaleString("en-IN")} />
            </>
          ) : null}
          <MediaSummary
            label={pricingMode === "free" ? "Registration pass" : "Ticket sections"}
            value={pricingMode === "free" ? "Registration Pass, Price: Free" : `${ticketBlocks.length} sections, ${getPriceRange(ticketBlocks)}`}
          />
          <MediaSummary label="Default ticket/pass preview" value="Buizz Verified layout, locked by platform" />
          <MediaSummary label="Media summary" value={`${mediaVisibility.showBanner ? "banner visible, " : ""}${media.logoUrl ? "organizer logo visible, " : ""}${mediaVisibility.galleryCount} gallery, video ${mediaVisibility.showVideo ? "visible" : "hidden"}`} />
          <MediaSummary label="Policies" value={`${policies.entryRules.length} entry rules, ${policies.customTerms.length} custom terms`} />
          <MediaSummary label="Inventory split" value="Online / offline / reserved split ready" />
          {pricingMode === "paid" ? (
            <>
              <MediaSummary label="Organizer commission" value={`${platformFeeSettings.organizerCommissionPercent}% = INR ${platformFeePreview.organizerCommission.toLocaleString("en-IN")}`} />
              <MediaSummary label="Organizer net payout" value={`INR ${platformFeePreview.organizerNet.toLocaleString("en-IN")} per sample ticket`} />
              <MediaSummary label="Buyer fee preview" value={`Fee INR ${platformFeePreview.convenienceFee.toLocaleString("en-IN")} + GST INR ${platformFeePreview.taxOnFee.toLocaleString("en-IN")}`} />
            </>
          ) : null}
          <MediaSummary label="Ticket generation" value="One booking will generate one ticket, with all seats/sections inside it." />
          <MediaSummary label="History" value="Draft history record will be created" />
        </div>
        <DefaultTicketPreview
          basic={basic}
          organizer={organizer}
          venues={venues}
          media={media}
          ticketBlocks={ticketBlocks}
          pricingMode={pricingMode}
          selectedListingCategory={selectedListingCategory}
        />
      </div>
    </StepSection>
  );
}

function SummaryLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
      <span className="mt-0.5 text-[var(--color-brand-primary)]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[11px] font-black uppercase text-[var(--app-muted)]">{label}</span>
        <span className="block break-words text-sm font-black [overflow-wrap:anywhere]" title={value}>{value}</span>
      </span>
    </div>
  );
}
