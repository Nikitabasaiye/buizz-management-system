import { CATEGORY_BOOKING_RULES } from "./constants";
import type {
  AvailabilityBreakdown,
  BookingRecord,
  BookingSource,
  BookingType,
  BuizzEvent,
  BuizzUserRole,
  CapacityConfig,
  EventApprovalFlow,
  EventCategory,
  EventHistoryRecord,
  EventHistoryType,
  EventMediaConfig,
  EventNotification,
  EventNotificationType,
  EventStatus,
  MediaAsset,
  MediaVisibility,
  RevenueFilter,
  RevenueSummary,
  SeatSection,
  ValidationResult,
} from "./types";

const RATIO_EDIT_LOCK_HOURS = 12;
const VALID_IMAGE_TYPES = new Set(["jpg", "jpeg", "png"]);

const buildDateTime = (date: string, time: string): Date | null => {
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toComparableDate = (value: string | Date): Date => (value instanceof Date ? value : new Date(value));

const availableCount = (allocated: number, sold: number): number => Math.max(allocated - sold, 0);

const calculateAppliedPlatformFees = (event: BuizzEvent): number =>
  event.platformFees.reduce((total, fee) => total + fee.calculatedAmount, 0);

const isValidImageAsset = (asset?: MediaAsset): boolean => {
  if (!asset?.fileType) {
    return true;
  }

  return VALID_IMAGE_TYPES.has(asset.fileType.toLowerCase().replace(".", ""));
};

export const getDefaultBookingType = (category: EventCategory): BookingType =>
  CATEGORY_BOOKING_RULES[category].defaultBookingType;

export const getRatioEditableUntil = (eventStartTime: string | Date): string => {
  const startTime = toComparableDate(eventStartTime);
  return new Date(startTime.getTime() - RATIO_EDIT_LOCK_HOURS * 60 * 60 * 1000).toISOString();
};

export const canEditRatio = (eventStartTime: string | Date, currentTime: string | Date = new Date()): boolean => {
  const current = toComparableDate(currentTime);
  const editableUntil = new Date(getRatioEditableUntil(eventStartTime));
  return current.getTime() < editableUntil.getTime();
};

export const calculateSeatAvailability = (section: SeatSection): AvailabilityBreakdown => {
  const availableOnline = availableCount(section.onlineSeats, section.soldOnline);
  const availableOffline = availableCount(section.offlineSeats, section.soldOffline);
  const availableReserved = availableCount(section.reservedSeats, section.soldReserved);

  return {
    availableOnline,
    availableOffline,
    availableReserved,
    totalAvailable: availableOnline + availableOffline + availableReserved,
  };
};

export const calculateSectionAvailability = calculateSeatAvailability;

export const validateSeatRatio = (section: SeatSection): ValidationResult => {
  const allocatedSeats = section.onlineSeats + section.offlineSeats + section.reservedSeats;

  if (allocatedSeats !== section.totalSeats) {
    return {
      isValid: false,
      message: "Online, offline, and reserved seats must equal total seats.",
    };
  }

  if (section.soldOnline > section.onlineSeats) {
    return {
      isValid: false,
      message: "Sold online seats cannot exceed online seat allocation.",
    };
  }

  if (section.soldOffline > section.offlineSeats) {
    return {
      isValid: false,
      message: "Sold offline seats cannot exceed offline seat allocation.",
    };
  }

  if (section.soldReserved > section.reservedSeats) {
    return {
      isValid: false,
      message: "Sold reserved seats cannot exceed reserved seat allocation.",
    };
  }

  return {
    isValid: true,
    message: "Seat ratio is valid.",
  };
};

export const calculateCapacityAvailability = (capacityConfig: CapacityConfig): AvailabilityBreakdown => {
  const availableOnline = availableCount(capacityConfig.onlineCapacity, capacityConfig.soldOnline);
  const availableOffline = availableCount(capacityConfig.offlineCapacity, capacityConfig.soldOffline);
  const availableReserved = availableCount(capacityConfig.reservedCapacity, capacityConfig.soldReserved);

  return {
    availableOnline,
    availableOffline,
    availableReserved,
    totalAvailable: availableOnline + availableOffline + availableReserved,
  };
};

export const validateCapacityRatio = (capacityConfig: CapacityConfig): ValidationResult => {
  const allocatedCapacity =
    capacityConfig.onlineCapacity + capacityConfig.offlineCapacity + capacityConfig.reservedCapacity;

  if (allocatedCapacity !== capacityConfig.totalCapacity) {
    return {
      isValid: false,
      message: "Online, offline, and reserved capacity must equal total capacity.",
    };
  }

  if (capacityConfig.soldOnline > capacityConfig.onlineCapacity) {
    return {
      isValid: false,
      message: "Sold online capacity cannot exceed online capacity allocation.",
    };
  }

  if (capacityConfig.soldOffline > capacityConfig.offlineCapacity) {
    return {
      isValid: false,
      message: "Sold offline capacity cannot exceed offline capacity allocation.",
    };
  }

  if (capacityConfig.soldReserved > capacityConfig.reservedCapacity) {
    return {
      isValid: false,
      message: "Sold reserved capacity cannot exceed reserved capacity allocation.",
    };
  }

  return {
    isValid: true,
    message: "Capacity ratio is valid.",
  };
};

export const normalizeInventoryNumber = (value: string | number): number => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(Math.floor(numericValue), 0);
};

export const validateSectionInventory = (section: SeatSection): ValidationResult => {
  if (section.totalSeats <= 0) {
    return { isValid: false, message: `${section.name} needs total seats greater than 0.` };
  }

  if (section.price < 0) {
    return { isValid: false, message: `${section.name} price cannot be negative.` };
  }

  return validateSeatRatio(section);
};

export const calculateInventoryTotals = (sections: SeatSection[], capacityConfig?: CapacityConfig) => {
  if (capacityConfig) {
    const availability = calculateCapacityAvailability(capacityConfig);
    return {
      total: capacityConfig.totalCapacity,
      online: capacityConfig.onlineCapacity,
      offline: capacityConfig.offlineCapacity,
      reserved: capacityConfig.reservedCapacity,
      soldOnline: capacityConfig.soldOnline,
      soldOffline: capacityConfig.soldOffline,
      soldReserved: capacityConfig.soldReserved,
      available: availability.totalAvailable,
    };
  }

  return sections.reduce(
    (totals, section) => {
      const availability = calculateSeatAvailability(section);
      return {
        total: totals.total + section.totalSeats,
        online: totals.online + section.onlineSeats,
        offline: totals.offline + section.offlineSeats,
        reserved: totals.reserved + section.reservedSeats,
        soldOnline: totals.soldOnline + section.soldOnline,
        soldOffline: totals.soldOffline + section.soldOffline,
        soldReserved: totals.soldReserved + section.soldReserved,
        available: totals.available + availability.totalAvailable,
      };
    },
    { total: 0, online: 0, offline: 0, reserved: 0, soldOnline: 0, soldOffline: 0, soldReserved: 0, available: 0 },
  );
};

export const buildDefaultSeatSections = (): SeatSection[] => [
  {
    sectionId: "section-vip",
    name: "VIP",
    label: "VIP",
    totalSeats: 120,
    onlineSeats: 84,
    offlineSeats: 24,
    reservedSeats: 12,
    soldOnline: 0,
    soldOffline: 0,
    soldReserved: 0,
    price: 2999,
    currency: "INR",
    availabilityStatus: "available",
  },
  {
    sectionId: "section-premium",
    name: "Premium",
    label: "Premium",
    totalSeats: 250,
    onlineSeats: 175,
    offlineSeats: 50,
    reservedSeats: 25,
    soldOnline: 0,
    soldOffline: 0,
    soldReserved: 0,
    price: 1499,
    currency: "INR",
    availabilityStatus: "available",
  },
  {
    sectionId: "section-general",
    name: "General",
    label: "General",
    totalSeats: 600,
    onlineSeats: 420,
    offlineSeats: 120,
    reservedSeats: 60,
    soldOnline: 0,
    soldOffline: 0,
    soldReserved: 0,
    price: 799,
    currency: "INR",
    availabilityStatus: "available",
  },
];

export const buildCapacityConfigFromInput = (
  input: Partial<CapacityConfig> = {},
): CapacityConfig => ({
  totalCapacity: normalizeInventoryNumber(input.totalCapacity ?? 500),
  onlineCapacity: normalizeInventoryNumber(input.onlineCapacity ?? 350),
  offlineCapacity: normalizeInventoryNumber(input.offlineCapacity ?? 100),
  reservedCapacity: normalizeInventoryNumber(input.reservedCapacity ?? 50),
  soldOnline: normalizeInventoryNumber(input.soldOnline ?? 0),
  soldOffline: normalizeInventoryNumber(input.soldOffline ?? 0),
  soldReserved: normalizeInventoryNumber(input.soldReserved ?? 0),
  price: Math.max(Number(input.price ?? 499), 0),
  currency: input.currency ?? "INR",
  availabilityStatus: input.availabilityStatus ?? "available",
});

export const calculateRevenueSummary = (event: BuizzEvent, bookings?: BookingRecord[]): RevenueSummary => {
  if (!bookings) {
    return { ...event.revenueSummary };
  }

  const eventBookings = bookings.filter((booking) => booking.eventId === event.id && booking.status !== "cancelled");
  const revenueBySource = (source: BookingSource): number =>
    eventBookings
      .filter((booking) => booking.source === source)
      .reduce((total, booking) => total + booking.amount, 0);

  const onlineRevenue = revenueBySource("online");
  const offlineRevenue = revenueBySource("offline");
  const reservedValue = revenueBySource("reserved");
  const grossRevenue = onlineRevenue + offlineRevenue + reservedValue;
  const platformFees = calculateAppliedPlatformFees(event);
  const netOrganizerAmount = Math.max(grossRevenue - platformFees, 0);
  const paidAmount = Math.min(event.settlement.paidAmount, netOrganizerAmount);

  return {
    onlineRevenue,
    offlineRevenue,
    reservedValue,
    grossRevenue,
    platformFees,
    netOrganizerAmount,
    paidAmount,
    remainingAmount: Math.max(netOrganizerAmount - paidAmount, 0),
    currency: event.revenueSummary.currency,
  };
};

export const getEventPrimaryStartDateTime = (event: BuizzEvent): string | null => {
  const startDates = event.venues.flatMap((venue) =>
    venue.schedules.flatMap((schedule) =>
      schedule.timeSlots
        .map((slot) => buildDateTime(schedule.date, slot.startTime))
        .filter((dateTime): dateTime is Date => Boolean(dateTime)),
    ),
  );

  if (startDates.length === 0) {
    return null;
  }

  return new Date(Math.min(...startDates.map((date) => date.getTime()))).toISOString();
};

export const getEventFinalEndDateTime = (event: BuizzEvent): string | null => {
  const endDates = event.venues.flatMap((venue) =>
    venue.schedules.flatMap((schedule) =>
      schedule.timeSlots
        .map((slot) => buildDateTime(schedule.date, slot.endTime))
        .filter((dateTime): dateTime is Date => Boolean(dateTime)),
    ),
  );

  if (endDates.length === 0) {
    return null;
  }

  return new Date(Math.max(...endDates.map((date) => date.getTime()))).toISOString();
};

export const shouldMoveToHistory = (event: BuizzEvent, currentTime: string | Date = new Date()): boolean => {
  const finalEndTime = getEventFinalEndDateTime(event);

  if (!finalEndTime) {
    return false;
  }

  const hideAt = new Date(new Date(finalEndTime).getTime() + event.visibility.autoHideAfterMinutes * 60 * 1000);
  return toComparableDate(currentTime).getTime() > hideAt.getTime();
};

export const shouldShowPublicEvent = (event: BuizzEvent, currentTime: string | Date = new Date()): boolean => {
  const current = toComparableDate(currentTime);

  if (!event.visibility.isPublic || event.status !== "published") {
    return false;
  }

  if (event.visibility.publicFrom && current.getTime() < new Date(event.visibility.publicFrom).getTime()) {
    return false;
  }

  if (event.visibility.publicUntil && current.getTime() > new Date(event.visibility.publicUntil).getTime()) {
    return false;
  }

  return !shouldMoveToHistory(event, current);
};

export const getMediaVisibility = (media: EventMediaConfig): MediaVisibility => {
  const visibleSocialLinks = media.socialLinks.filter((link) => link.visible);

  return {
    showBanner: Boolean(media.bannerImage?.url),
    showGallery: media.galleryImages.length > 0,
    showVideo: Boolean(media.videoUrl),
    showSocialLinks: visibleSocialLinks.length > 0,
    galleryCount: media.galleryImages.length,
  };
};

export const getApprovalNextStatus = (
  approval: EventApprovalFlow,
  reviewerRole: BuizzUserRole,
): EventStatus => {
  if (reviewerRole === "super_admin") {
    return "approved";
  }

  if (reviewerRole === "admin" && approval.adminApprovalIsFinal) {
    return "approved";
  }

  return approval.requiresSuperAdminApproval ? "pending_review" : "approved";
};

export const filterRevenueBySource = (
  bookings: BookingRecord[],
  source: RevenueFilter,
): BookingRecord[] => {
  if (source === "all") {
    return bookings;
  }

  return bookings.filter((booking) => booking.source === source);
};

export const buildEventHistoryRecord = (
  type: EventHistoryType | string,
  title: string,
  description: string,
  actor: { id: string; role: BuizzUserRole },
): EventHistoryRecord => ({
  id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  title,
  description,
  createdBy: actor.id,
  createdByRole: actor.role,
  createdAt: new Date().toISOString(),
});

export const buildEventNotification = (
  type: EventNotificationType | string,
  title: string,
  message: string,
  targetRole: BuizzUserRole,
  relatedEventId: string,
): EventNotification => ({
  id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  title,
  message,
  targetRole,
  relatedEventId,
  isRead: false,
  createdAt: new Date().toISOString(),
});

export const isSeatMapRequired = (category: EventCategory, bookingType: BookingType): boolean => {
  if (category === "play" && bookingType === "theatre_seating") {
    return true;
  }

  return bookingType === "seated" || bookingType === "block_seating";
};

export const canOrganizerCustomizeSeatColors = (role: BuizzUserRole): boolean => role === "super_admin";

export const validateEventMedia = (media: EventMediaConfig): ValidationResult => {
  if (media.galleryImages.length > 4) {
    return {
      isValid: false,
      message: "Gallery images cannot exceed 4 assets.",
    };
  }

  if (!isValidImageAsset(media.bannerImage)) {
    return {
      isValid: false,
      message: "Banner image must be jpg, jpeg, or png when file type is provided.",
    };
  }

  if (!isValidImageAsset(media.organizerLogo)) {
    return {
      isValid: false,
      message: "Organizer logo must be jpg, jpeg, or png when file type is provided.",
    };
  }

  const invalidGalleryImage = media.galleryImages.find((asset) => !isValidImageAsset(asset));

  if (invalidGalleryImage) {
    return {
      isValid: false,
      message: "Gallery images must be jpg, jpeg, or png when file type is provided.",
    };
  }

  return {
    isValid: true,
    message: "Event media is valid.",
  };
};
