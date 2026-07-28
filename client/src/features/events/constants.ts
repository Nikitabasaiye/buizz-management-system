import type {
  AvailabilityStatus,
  BookingSource,
  BookingType,
  EventCategory,
  EventNotificationType,
  EventStatus,
  PlatformFeeType,
  PricingMode,
  RatioConfig,
  RevenueFilter,
} from "./types";

export const EVENT_CATEGORIES = ["event", "play", "activity"] as const satisfies readonly EventCategory[];

export const BOOKING_TYPES = [
  "seated",
  "theatre_seating",
  "block_seating",
  "capacity",
  "slot_based",
  "free_registration",
] as const satisfies readonly BookingType[];

export const PRICING_MODES = ["paid", "free"] as const satisfies readonly PricingMode[];

export const EVENT_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "platform_fee_assigned",
  "organizer_fee_acceptance_pending",
  "published",
  "cancel_requested",
  "cancelled",
  "completed",
  "history",
] as const satisfies readonly EventStatus[];

export const AVAILABILITY_STATUSES = [
  "available",
  "limited",
  "sold_out",
  "disabled",
] as const satisfies readonly AvailabilityStatus[];

export const BOOKING_SOURCES = ["online", "offline", "reserved"] as const satisfies readonly BookingSource[];

export const PAYMENT_MODES = ["online_payment", "cash", "upi", "card", "other"] as const;

export const REVENUE_FILTERS = ["all", "online", "offline", "reserved"] as const satisfies readonly RevenueFilter[];

export const NOTIFICATION_TYPES = [
  "event_submitted",
  "event_approved",
  "event_rejected",
  "platform_fee_assigned",
  "fee_acceptance_pending",
  "event_published",
  "event_cancel_requested",
  "event_completed",
  "settlement_updated",
] as const satisfies readonly EventNotificationType[];

export const PLATFORM_FEE_TYPES = ["percentage", "flat", "per_ticket"] as const satisfies readonly PlatformFeeType[];

export const DEFAULT_RATIO_CONFIG: RatioConfig = {
  onlinePercentage: 70,
  offlinePercentage: 20,
  reservedPercentage: 10,
  editableUntil: "",
  isLocked: false,
};

export const CATEGORY_BOOKING_RULES: Record<
  EventCategory,
  {
    allowedBookingTypes: BookingType[];
    defaultBookingType: BookingType;
    seatMapOptional: boolean;
  }
> = {
  event: {
    allowedBookingTypes: ["seated", "block_seating", "capacity"],
    defaultBookingType: "seated",
    seatMapOptional: true,
  },
  play: {
    allowedBookingTypes: ["theatre_seating", "seated"],
    defaultBookingType: "theatre_seating",
    seatMapOptional: false,
  },
  activity: {
    allowedBookingTypes: ["slot_based", "capacity", "free_registration"],
    defaultBookingType: "slot_based",
    seatMapOptional: true,
  },
};

export const DEFAULT_TICKET_BLOCK_NAMES = ["VIP", "Premium", "General", "Entry Pass"] as const;
