export type EventCategory = "event" | "play" | "activity";

export type BookingType =
  | "seated"
  | "theatre_seating"
  | "block_seating"
  | "capacity"
  | "slot_based"
  | "free_registration";

export type PricingMode = "paid" | "free";

export type EventStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "platform_fee_assigned"
  | "organizer_fee_acceptance_pending"
  | "published"
  | "cancel_requested"
  | "cancelled"
  | "completed"
  | "expired"
  | "history";

export type AvailabilityStatus = "available" | "limited" | "sold_out" | "disabled";

export type BookingSource = "online" | "offline" | "reserved";

export type PaymentMode = "online_payment" | "cash" | "upi" | "card" | "other";

export type BuizzUserRole = "organizer" | "admin" | "super_admin" | "system";

export type OrganizerStatus = "pending" | "approved" | "rejected" | "suspended";

export type VenueType = "auditorium" | "stadium" | "open_ground" | "theatre" | "activity_zone" | "other";

export type SeatLayoutType = "seat_map" | "theatre" | "block" | "sectioned" | "custom";
export type EventSeatMapMode = "capacity_only" | "seat_map";

export type EventSeatMapSummary = {
  totalCapacity: number;
  activeSeats: number;
  blockedSeats: number;
  reservedSeats: number;
  soldSeats?: number;
  tierCount: number;
};

export type EventVenueSeatMapConfig = {
  venueId: string;
  venueName: string;
  city: string;
  address?: string;
  seatMapMode: EventSeatMapMode;
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  totalCapacity: number;
  activeSeats: number;
  blockedSeats: number;
  reservedSeats: number;
  soldSeats?: number;
  ticketTiers: Array<{
    tierId: string;
    name: string;
    price: number;
    color: string;
    capacity: number;
    soldCount?: number;
  }>;
};

export type EventScheduleSeatMapConfig = {
  scheduleId: string;
  venueId: string;
  date: string;
  startTime: string;
  endTime?: string;
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  availabilitySnapshot?: {
    availableSeats: number;
    soldSeats: number;
    lockedSeats: number;
    blockedSeats: number;
    reservedSeats: number;
  };
};

export type TicketBlockType = "seat_section" | "entry_pass" | "slot_pass" | "registration" | "bundle";

export type TicketBlockStatus = "active" | "paused" | "sold_out" | "disabled";

export type TicketDesignCategory = "event" | "play" | "activity" | "custom";

export type MediaAssetType = "image" | "logo" | "video" | "document";

export type DiscountType = "percentage" | "flat";

export type OfferStatus = "draft" | "active" | "expired" | "paused";

export type PlatformFeeType = "percentage" | "flat" | "per_ticket";

export type PlatformFeeStatus = "active" | "inactive" | "archived";

export type PlatformFeeAppliedTo =
  | "event"
  | "venue"
  | "section"
  | "ticket_block"
  | "booking"
  | "settlement";

export type BookingStatus = "confirmed" | "pending" | "cancelled" | "refunded" | "checked_in";

export type SettlementStatus = "not_started" | "pending" | "partially_paid" | "paid" | "on_hold";

export type RevenueFilter = "all" | BookingSource;

export type EventHistoryType =
  | "created"
  | "updated"
  | "submitted"
  | "approved"
  | "rejected"
  | "published"
  | "fee_updated"
  | "cancelled"
  | "moved_to_history"
  | "settlement_updated";

export type EventNotificationType =
  | "event_submitted"
  | "event_approved"
  | "event_rejected"
  | "platform_fee_assigned"
  | "fee_acceptance_pending"
  | "event_published"
  | "event_cancel_requested"
  | "event_completed"
  | "settlement_updated";

export type OrganizerSnapshot = {
  id: string;
  name: string;
  email: string;
  phone: string;
  logoUrl?: string;
  city: string;
  status: OrganizerStatus;
  verified: boolean;
};

export type EventVenue = {
  venueId: string;
  venueName: string;
  city: string;
  address: string;
  mapUrl?: string;
  capacity: number;
  venueType: VenueType;
  schedules: EventSchedule[];
};

export type EventSchedule = {
  scheduleId: string;
  date: string;
  timeSlots: EventTimeSlot[];
};

export type EventTimeSlot = {
  slotId: string;
  startTime: string;
  endTime: string;
  bookingType: BookingType;
  availabilityStatus: AvailabilityStatus;
  seatConfig?: SeatConfig;
  capacityConfig?: CapacityConfig;
  ratioConfig?: RatioConfig;
  ticketBlocks?: TicketBlock[];
};

export type SeatConfig = {
  seatMapId?: string;
  layoutName: string;
  layoutType: SeatLayoutType;
  isDefaultLayout: boolean;
  createdByRole: BuizzUserRole;
  colorCustomizationAllowed: boolean;
  sections: SeatSection[];
};

export type SeatSection = {
  sectionId: string;
  name: string;
  label: string;
  totalSeats: number;
  onlineSeats: number;
  offlineSeats: number;
  reservedSeats: number;
  soldOnline: number;
  soldOffline: number;
  soldReserved: number;
  price: number;
  currency: string;
  availabilityStatus: AvailabilityStatus;
};

export type CapacityConfig = {
  totalCapacity: number;
  onlineCapacity: number;
  offlineCapacity: number;
  reservedCapacity: number;
  soldOnline: number;
  soldOffline: number;
  soldReserved: number;
  price: number;
  currency: string;
  availabilityStatus: AvailabilityStatus;
};

export type RatioConfig = {
  onlinePercentage: number;
  offlinePercentage: number;
  reservedPercentage: number;
  editableUntil: string;
  isLocked: boolean;
  changedBy?: string;
  changedByRole?: BuizzUserRole;
  changedAt?: string;
};

export type TicketBlock = {
  blockId: string;
  name: string;
  type: TicketBlockType;
  sectionId?: string;
  price: number;
  currency: string;
  totalQuantity: number;
  onlineQuantity: number;
  offlineQuantity: number;
  reservedQuantity: number;
  soldOnline: number;
  soldOffline: number;
  soldReserved: number;
  minPerBooking: number;
  maxPerBooking: number;
  status: TicketBlockStatus;
};

export type TicketDesignConfig = {
  templateId: string;
  templateName: string;
  category: TicketDesignCategory;
  allowOrganizerLogo: boolean;
  organizerLogoVisible: boolean;
  qrPreviewVisible?: boolean;
  termsVisible?: boolean;
  allowTextCustomization: boolean;
  allowDragDrop: boolean;
  requiredFields: string[];
  optionalFields: string[];
  restrictions: string[];
};

export type EventMediaConfig = {
  bannerImage?: MediaAsset;
  galleryImages: MediaAsset[];
  organizerLogo?: MediaAsset;
  videoUrl?: string;
  socialLinks: SocialLink[];
};

export type MediaAsset = {
  id: string;
  url: string;
  alt: string;
  type: MediaAssetType;
  fileType?: string;
  sizeKb?: number;
};

export type SocialLink = {
  id: string;
  platform: string;
  url: string;
  visible: boolean;
};

export type EventPolicyConfig = {
  organizerTermsAccepted: boolean;
  userTerms: string;
  refundPolicy: string;
  cancellationPolicy: string;
  ageRestriction?: string;
  entryRules: string[];
  customTerms: string[];
};

export type EventOffer = {
  offerId: string;
  title: string;
  code?: string;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  appliesToBlocks: string[];
  status: OfferStatus;
};

export type PlatformFeeRule = {
  id: string;
  name: string;
  appliesToCity?: string;
  appliesToCategory?: EventCategory;
  appliesToEventId?: string;
  appliesToVenueId?: string;
  appliesToSectionId?: string;
  appliesToTicketBlockId?: string;
  feeType: PlatformFeeType;
  amount: number;
  currency: string;
  showToOrganizer: boolean;
  status: PlatformFeeStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AppliedPlatformFee = {
  ruleId: string;
  name: string;
  feeType: PlatformFeeType;
  amount: number;
  calculatedAmount: number;
  showToOrganizer: boolean;
  appliedTo: PlatformFeeAppliedTo;
};

export type EventApprovalFlow = {
  currentStatus: EventStatus;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedRole?: BuizzUserRole;
  reviewedAt?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  requiresSuperAdminApproval: boolean;
  adminApprovalIsFinal: boolean;
  platformFeeAssigned: boolean;
  organizerAcceptedFees: boolean;
  organizerAcceptedAt?: string;
};

export type BookingSummary = {
  totalBookings: number;
  onlineBookings: number;
  offlineBookings: number;
  reservedBookings: number;
  totalTickets: number;
  onlineTickets: number;
  offlineTickets: number;
  reservedTickets: number;
};

export type BookingRecord = {
  bookingId: string;
  source: BookingSource;
  eventId: string;
  organizerId: string;
  createdByOrganizerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  venueId: string;
  scheduleId: string;
  slotId: string;
  sectionId?: string;
  ticketBlockId: string;
  quantity: number;
  paymentMode: PaymentMode;
  amount: number;
  status: BookingStatus;
  createdAt: string;
};

export type RevenueSummary = {
  onlineRevenue: number;
  offlineRevenue: number;
  reservedValue: number;
  grossRevenue: number;
  platformFees: number;
  netOrganizerAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
};

export type SettlementSummary = {
  settlementId: string;
  status: SettlementStatus;
  grossRevenue: number;
  platformFees: number;
  organizerPayable: number;
  paidAmount: number;
  remainingAmount: number;
  paymentProofUrl?: string;
  notes?: string;
  updatedBy?: string;
  updatedAt?: string;
};

export type EventVisibilityConfig = {
  isPublic: boolean;
  publicFrom?: string;
  publicUntil?: string;
  autoHideAfterMinutes: number;
  movedToHistoryAt?: string;
  hideReason?: string;
};

export type EventHistoryRecord = {
  id: string;
  type: EventHistoryType | string;
  title: string;
  description: string;
  snapshot?: Record<string, unknown>;
  createdBy: string;
  createdByRole: BuizzUserRole;
  createdAt: string;
};

export type EventNotification = {
  id: string;
  type: EventNotificationType | string;
  title: string;
  message: string;
  targetRole: BuizzUserRole;
  targetUserId?: string;
  relatedEventId: string;
  isRead: boolean;
  createdAt: string;
};

export type EventActivityLog = {
  id: string;
  action: string;
  description: string;
  actorId: string;
  actorRole: BuizzUserRole;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type EventApprovalBlockers = {
  venueApprovalStatus: "not_required" | "pending_setup" | "pending_review" | "approved" | "rejected";
  seatMapApprovalStatus: "not_required" | "pending_setup" | "pending_review" | "approved" | "rejected";
  ticketDesignApprovalStatus: "not_required" | "pending_setup" | "pending_review" | "approved" | "rejected";
  mediaReviewStatus?: "not_required" | "pending_review" | "approved" | "rejected";
  eventReviewStatus?: "draft" | "pending_review" | "approved" | "rejected" | "changes_requested";
};

export type EventLifecycleMetadata = {
  listingSection: string;
  listingSectionSlug: string;
  listingCategory: string;
  listingCategorySlug: string;
  bookingMode: string;
  bookingModeLabel: string;
  publicBookingFlow: string;
  requiresSeatMap: boolean;
  seatMapMode: EventSeatMapMode;
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  approvalBlockers: EventApprovalBlockers;
  platformFeeSnapshot: Record<string, unknown>;
  oneBookingOneTicket: true;
};

export type BuizzEvent = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  category: EventCategory;
  subCategory?: string;
  duration?: string;
  status: EventStatus;
  date: string;
  organizer: OrganizerSnapshot;
  venues: EventVenue[];
  bookingType: BookingType;
  pricingMode: PricingMode;
  seatMapMode?: EventSeatMapMode;
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  seatMapSummary?: EventSeatMapSummary;
  venueSeatMaps?: EventVenueSeatMapConfig[];
  scheduleSeatMaps?: EventScheduleSeatMapConfig[];
  seatConfig?: SeatConfig;
  capacityConfig?: CapacityConfig;
  ticketBlocks: TicketBlock[];
  ticketDesign: TicketDesignConfig;
  media: EventMediaConfig;
  policies: EventPolicyConfig;
  offers: EventOffer[];
  platformFees: AppliedPlatformFee[];
  approval: EventApprovalFlow;
  bookingsSummary: BookingSummary;
  revenueSummary: RevenueSummary;
  settlement: SettlementSummary;
  visibility: EventVisibilityConfig;
  lifecycleMetadata?: EventLifecycleMetadata;
  history: EventHistoryRecord[];
  notifications: EventNotification[];
  activityLogs: EventActivityLog[];
  createdAt: string;
  updatedAt: string;
};

export type AvailabilityBreakdown = {
  availableOnline: number;
  availableOffline: number;
  availableReserved: number;
  totalAvailable: number;
};

export type ValidationResult = {
  isValid: boolean;
  message: string;
};

export type MediaVisibility = {
  showBanner: boolean;
  showGallery: boolean;
  showVideo: boolean;
  showSocialLinks: boolean;
  galleryCount: number;
};
