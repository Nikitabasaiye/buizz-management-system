import type {
  AppliedPlatformFee,
  BookingRecord,
  BookingSource,
  BookingStatus,
  BuizzEvent,
  BuizzUserRole,
  EventActivityLog,
  EventCategory,
  EventHistoryRecord,
  EventMediaConfig,
  EventNotification,
  EventOffer,
  EventPolicyConfig,
  EventSchedule,
  EventStatus,
  EventVenue,
  MediaAsset,
  PlatformFeeRule,
  RevenueFilter,
  RevenueSummary,
  SeatConfig,
  SeatSection,
  SettlementSummary,
  SocialLink,
  TicketBlock,
  TicketDesignConfig,
} from "@/features/events/types";
import type { AdminPermissionKey, AdminPermissions } from "@/store/permissionStore";

export type UserRole = "customer" | "organizer" | "admin" | "super_admin" | "system";

export type User = {
  id: string;
  displayId?: string | number;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status: "active" | "pending" | "suspended" | "deleted";
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type Customer = User & {
  role: "customer";
  savedEventIds?: string[];
};

export type Organizer = User & {
  role: "organizer";
  businessName: string;
  city: string;
  approvalStatus: "pending" | "approved" | "rejected" | "suspended";
  documentsStatus: "missing" | "submitted" | "verified";
};

export type Admin = User & {
  role: "admin";
  permissions: AdminPermissions;
};

export type SuperAdmin = User & {
  role: "super_admin";
};

export type Event = BuizzEvent;
export type EventLifecycleStatus = EventStatus;
export type EventSubCategory = string;
export type TicketRatio = {
  onlinePercentage: number;
  offlinePercentage: number;
  reservedPercentage: number;
  editableUntil: string;
  isLocked: boolean;
};
export type SeatMap = SeatConfig;
export type SeatBlock = SeatSection;
export type ReservedSeat = {
  id: string;
  eventId: string;
  ticketBlockId: string;
  seatLabel: string;
  heldFor: string;
  expiresAt?: string;
};

export type Booking = BookingRecord & {
  id?: string;
  ticketId?: string;
  totalAmount?: number;
};
export type OnlineBooking = Booking & { source: "online" };
export type OfflineBooking = Booking & { source: "offline" };

export type Ticket = {
  id: string;
  ticketId: string;
  bookingId: string;
  eventId: string;
  eventName: string;
  customerId?: string;
  customerName: string;
  venueName: string;
  date: string;
  time: string;
  ticketBlock: string;
  quantity: number;
  source: BookingSource;
  status: BookingStatus;
  qrPayload: TicketQrPayload;
  issuedAt: string;
};

export type TicketDesign = TicketDesignConfig;

export type TicketQrPayload = {
  ticketId: string;
  bookingId: string;
  eventId: string;
  customerId?: string;
  signedToken: string;
  issuedAt: string;
};

export type Payment = {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  mode: "online_payment" | "cash" | "upi" | "card" | "other";
  status: "initiated" | "paid" | "failed" | "refunded";
  providerReference?: string;
  createdAt: string;
};

export type Revenue = RevenueSummary & {
  eventId?: string;
  organizerId?: string;
};

export type Settlement = SettlementSummary;
export type PlatformFee = AppliedPlatformFee | PlatformFeeRule;

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalAction = {
  id: string;
  targetType: "event" | "organizer" | "refund" | "ticket_design" | "seat_map";
  targetId: string;
  action: "submitted" | "approved" | "rejected" | "cancelled";
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  permissionUsed?: AdminPermissionKey;
  comment?: string;
  reason?: string;
  platformFee?: AppliedPlatformFee;
  createdAt: string;
};

export type ApprovalRequest = {
  id: string;
  targetType: ApprovalAction["targetType"];
  targetId: string;
  status: ApprovalStatus;
  submittedBy: string;
  submittedAt: string;
  actions: ApprovalAction[];
};

export type Permission = {
  key: string;
  label: string;
  enabled: boolean;
};
export type AdminPermission = AdminPermissionKey;

export type Notification = EventNotification & {
  link?: string;
  status?: "read" | "unread";
};

export type ActivityLog = EventActivityLog & {
  targetType?: string;
  targetId?: string;
  targetName?: string;
  reason?: string;
  timestamp?: string;
};

export type RefundRequest = {
  id: string;
  bookingId: string;
  ticketId?: string;
  eventId: string;
  customerName: string;
  amount: number;
  status: "requested" | "approved" | "rejected" | "processed";
  reason: string;
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
};

export type Coupon = {
  id: string;
  code: string;
  title: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  applicableEventId?: string;
  applicableCategory?: EventCategory;
  status: "active" | "inactive" | "expired";
};

export type CMSBanner = {
  id: string;
  title: string;
  placement: "home_hero" | "home_promo" | "category" | "detail";
  imageUrl: string;
  href?: string;
  startsAt: string;
  endsAt: string;
  status: "active" | "inactive";
  updatedAt: string;
};

export type Offer = EventOffer;
export type OrganizerTerms = {
  id: string;
  title: string;
  body: string;
  version: string;
  updatedAt: string;
};

export type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  requesterId: string;
  requesterRole: UserRole;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateEventPayload = Partial<Event> & {
  organizerId: string;
  title: string;
  category: EventCategory;
};
export type UpdateEventPayload = Partial<Event>;
export type SubmitEventForApprovalPayload = { eventId: string; actorId: string; actorName: string; comment?: string };
export type ApproveEventPayload = {
  eventId: string;
  actorId: string;
  actorName: string;
  actorRole: "admin" | "super_admin";
  permissionUsed?: AdminPermissionKey;
  comment?: string;
  platformFee?: AppliedPlatformFee;
};
export type RejectEventPayload = ApproveEventPayload & { reason: string };
export type PublishEventPayload = { eventId: string; actorId: string; actorName: string; comment?: string };
export type CancelEventPayload = { eventId: string; actorId: string; actorName: string; reason: string };

export type CreateOnlineBookingPayload = {
  eventId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  venueId: string;
  scheduleId: string;
  slotId: string;
  ticketBlockId: string;
  quantity: number;
  paymentReference?: string;
};
export type CreateOfflineBookingPayload = Omit<CreateOnlineBookingPayload, "customerId" | "paymentReference"> & {
  organizerId: string;
  paymentMode: "cash" | "upi" | "card" | "other";
  amountCollected?: number;
};

export type UpdateTicketRatioPayload = { eventId: string; ticketBlockId?: string; ratio: TicketRatio };
export type UpdatePlatformFeePayload = { eventId: string; platformFee: AppliedPlatformFee; updatedBy: string };
export type UpdateSettlementPayload = { settlementId: string; status: Settlement["status"]; paidAmount?: number; notes?: string; updatedBy: string };
export type UpdatePermissionPayload = { adminId: string; permissions: AdminPermissions; updatedBy: string };
export type CreateRefundRequestPayload = Omit<RefundRequest, "id" | "status" | "createdAt" | "updatedAt">;
export type UpdateCouponPayload = Partial<Omit<Coupon, "id">> & { id?: string };
export type CreateSupportTicketPayload = Omit<SupportTicket, "id" | "status" | "createdAt" | "updatedAt">;
export type UpdateCMSBannerPayload = Partial<Omit<CMSBanner, "id" | "updatedAt">> & { id?: string };

export type EventFilters = {
  category?: EventCategory;
  status?: EventStatus;
  organizerId?: string;
  query?: string;
};
export type BookingFilters = {
  eventId?: string;
  organizerId?: string;
  source?: BookingSource | "all";
  status?: BookingStatus | "all";
};
export type RevenueFilters = {
  eventId?: string;
  organizerId?: string;
  source?: RevenueFilter;
  from?: string;
  to?: string;
};

export type BuizzBackendState = {
  events: Event[];
  bookings: Booking[];
  tickets: Ticket[];
  approvals: ApprovalAction[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  refunds: RefundRequest[];
  coupons: Coupon[];
  cmsBanners: CMSBanner[];
  supportTickets: SupportTicket[];
  settlements: Settlement[];
  seatMaps: SeatMap[];
  organizerTerms: OrganizerTerms[];
  mediaAssets: MediaAsset[];
  socialLinks: SocialLink[];
  policies: EventPolicyConfig[];
};

export type { AdminPermissions, BuizzUserRole, EventMediaConfig, EventSchedule, EventVenue };
export type {
  BookingSource,
  BookingStatus,
  EventCategory,
  EventHistoryRecord,
  EventNotification,
  MediaAsset,
  RevenueFilter,
  TicketBlock,
};
