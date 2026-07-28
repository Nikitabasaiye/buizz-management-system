// export type SeatMapRole = "super_admin" | "admin" | "organizer" | "customer";

// export type SeatMapTemplateStatus =
//   | "Draft"
//   | "Active"
//   | "Archived"
//   | "Pending Review";

// export type SeatNodeStatus =
//   | "draft"
//   | "available"
//   | "sold"
//   | "locked"
//   | "selected"
//   | "blocked"
//   | "reserved"
//   | "checked_in"
//   | "cancelled"
//   | "refunded"
//   | "disabled";

// export type SeatLifecycleStatus = SeatNodeStatus;

// export type SeatNodeType =
//   | "seat"
//   | "standing_zone"
//   | "stage"
//   | "entry_gate"
//   | "exit_gate"
//   | "section_label"
//   | "row_label"
//   | "custom_label";

// export type SeatSalesChannel =
//   | "buizz_online"
//   | "offline_counter"
//   | "external_platform"
//   | "complimentary";

// export type SeatMapApprovalStatus = "Draft" | "Pending Review" | "Approved" | "Rejected";

// export type SeatTicketTier = {
//   id: string;
//   name: string;
//   price: number;
//   color: string;
//   description?: string;
//   totalSeats?: number;
//   soldSeats?: number;
//   blockedSeats?: number;
//   reservedSeats?: number;
// };

// export type SeatSectionType =
//   | "vip"
//   | "premium"
//   | "gold"
//   | "silver"
//   | "balcony"
//   | "general"
//   | "standing"
//   | "fan_pit"
//   | "front_row"
//   | "family_zone"
//   | "custom"
//   | "seated"
//   | "box"
//   | "lawn";

// export type SeatSectionStatus =
//   | "active"
//   | "hidden"
//   | "locked"
//   | "disabled"
//   | "sold_out";

// export type SeatSectionInventorySummary = {
//   totalSeats: number;
//   buizzOnlineSeats: number;
//   offlineCounterSeats: number;
//   bookMyShowSeats: number;
//   reservedSeats: number;
//   complimentarySeats: number;
//   blockedSeats: number;
//   disabledSeats: number;
//   soldSeats: number;
//   lockedSeats: number;
//   availableOnlineSeats: number;
//   availableOfflineSeats: number;
// };

// export type MasterSeatSectionConfig = {
//   id: string;
//   templateId: string;
//   name: string;
//   label: string;
//   type: SeatSectionType;
//   color: string;
//   rowStart?: string;
//   rowEnd?: string;
//   rows: string[];
//   seatIds: string[];
//   defaultTierId?: string;
//   defaultPrice?: number;
//   defaultGate?: string;
//   totalSeats: number;
//   displayOrder: number;
//   status: SeatSectionStatus;
//   visibleOnPublic: boolean;
//   locked: boolean;
//   createdAt: string;
//   updatedAt: string;
// };

// export type EventSectionOverride = {
//   id: string;
//   eventId: string;
//   templateId: string;
//   sectionId: string;
//   sectionName: string;
//   sectionType: SeatSectionType;
//   tierId?: string;
//   tierName?: string;
//   price: number;
//   gate?: string;
//   salesChannelSplit: {
//     buizzOnline: number;
//     offlineCounter: number;
//     bookMyShow: number;
//     organizerReserved: number;
//     complimentary: number;
//     blocked: number;
//     disabled: number;
//   };
//   inventorySummary: SeatSectionInventorySummary;
//   publicDisplay: {
//     visible: boolean;
//     showPrice: boolean;
//     showAvailableCount: boolean;
//     displayLabel: string;
//     displayOrder: number;
//   };
//   lockedForEditing: boolean;
//   allowPublicBooking: boolean;
//   notes?: string;
//   validationIssues: string[];
//   createdAt: string;
//   updatedAt: string;
// };

// export type SeatSection = {
//   id: string;
//   name: string;
//   label: string;
//   type: SeatSectionType;
//   color: string;
//   defaultTierId?: string;
//   defaultPrice?: number;
//   gate?: string;
//   capacity: number;
//   seatIds: string[];
//   rows?: string[];
//   rowStart?: string;
//   rowEnd?: string;
//   displayOrder?: number;
//   status?: SeatSectionStatus;
//   visibleOnPublic?: boolean;
//   hidden?: boolean;
//   locked?: boolean;
//   notes?: string;
// };

// export type SeatNode = {
//   id: string;
//   type: SeatNodeType;
//   label: string;
//   section: string;
//   row?: string;
//   seatNumber?: string;
//   xPercent: number;
//   yPercent: number;
//   widthPercent?: number;
//   heightPercent?: number;
//   rotation?: number;
//   status: SeatNodeStatus;
//   tierId?: string;
//   price?: number;
//   gate?: string;
//   notes?: string;
//   salesChannel?: SeatSalesChannel;
// };

// export type SeatBlock = {
//   id: string;
//   name: string;
//   type: "seated" | "standing" | "reserved" | "vip" | "disabled";
//   color: string;
//   capacity: number;
//   tierId?: string;
//   nodeIds: string[];
// };

// export type SeatMapTemplate = {
//   id: string;
//   venueName: string;
//   city: string;
//   categoryTags: string[];
//   backgroundImageUrl: string;
//   backgroundImageName?: string;
//   backgroundImageSize?: number;
//   backgroundOpacity?: number;
//   backgroundLocked?: boolean;
//   backgroundVisible?: boolean;
//   backgroundScale?: number;
//   backgroundOffsetX?: number;
//   backgroundOffsetY?: number;
//   canvasAspectRatio: "16:9" | "4:3" | "1:1" | "custom";
//   nodes: SeatNode[];
//   blocks: SeatBlock[];
//   sections?: SeatSection[];
//   tiers: SeatTicketTier[];
//   totalCapacity: number;
//   status: SeatMapTemplateStatus;
//   createdByRole: "super_admin" | "admin";
//   createdByName: string;
//   allowAdminOverride: boolean;
//   allowOrganizerStructureEdit: boolean;
//   version: number;
//   publishedVersion?: number;
//   lastSavedAt?: string;
//   lastPublishedAt?: string;
//   approval?: {
//     approvedBy?: string;
//     role?: "super_admin" | "admin";
//     timestamp?: string;
//     reason?: string;
//     checkedSeatMap?: boolean;
//   };
//   showGrid?: boolean;
//   snapToGrid?: boolean;
//   gridSizePercent?: number;
//   createdAt: string;
//   updatedAt: string;
// };

// export type OrganizerSeatMapOverride = {
//   id: string;
//   eventId: string;
//   templateId: string;
//   organizerId: string;
//   customBackgroundImageUrl?: string;
//   nodeOverrides: Record<
//     string,
//     {
//       status?: SeatNodeStatus;
//       tierId?: string;
//       price?: number;
//       notes?: string;
//       gate?: string;
//       salesChannel?: SeatSalesChannel;
//     }
//   >;
//   approvalStatus?: SeatMapApprovalStatus;
//   approvalNotes?: string;
//   submittedAt?: string;
//   approvedAt?: string;
//   approvedBy?: string;
//   tiers: SeatTicketTier[];
//   sectionOverrides?: EventSectionOverride[];
//   totalActiveSeats: number;
//   totalBlockedSeats: number;
//   totalReservedSeats: number;
//   updatedAt: string;
// };

// export type PublicSeatAvailability = {
//   eventId?: string;
//   venueId?: string;
//   scheduleId?: string;
//   seatId: string;
//   status: "available" | "sold" | "locked" | "selected" | "blocked" | "reserved";
//   lockedUntil?: string;
//   lockedBySessionId?: string;
//   bookingId?: string;
// };

// export type SeatHoldToken = {
//   holdToken: string;
//   eventId: string;
//   seatIds: string[];
//   sessionId: string;
//   expiresAt: string;
// };

// export type SelectedSeatData = {
//   seatId: string;
//   label: string;
//   section: string;
//   row?: string;
//   seatNumber?: string;
//   gate?: string;
//   tierId?: string;
//   tierName?: string;
//   price: number;
//   venueId?: string;
//   scheduleId?: string;
// };

// export type PublicSelectedSeat = SelectedSeatData & {
//   tierName: string;
//   venueId: string;
//   scheduleId: string;
// };

// export type SeatMapMode = "capacity_only" | "seat_map";

// export type SeatMapSummary = {
//   totalCapacity: number;
//   activeSeats: number;
//   blockedSeats: number;
//   reservedSeats: number;
//   soldSeats?: number;
//   tierCount: number;
// };

// export type SeatMapAuditEntry = {
//   id: string;
//   templateId: string;
//   actorRole: SeatMapRole;
//   actorName: string;
//   action: string;
//   comment: string;
//   createdAt: string;
//   validationResult?: string;
// };

// export type SeatMapAuditLog = {
//   id: string;
//   action: string;
//   actorId: string;
//   actorName: string;
//   actorRole: "super_admin" | "admin" | "organizer" | "customer";
//   message: string;
//   createdAt: string;
// };

// export type SeatMapDraftFields = {
//   seatMapMode?: SeatMapMode;
//   seatMapSource?: "capacity_only" | "master_template" | "blueprint_request";
//   requiresSeatMap?: boolean;
//   seatMapTemplateId?: string;
//   seatMapOverrideId?: string;
//   seatMapSummary?: SeatMapSummary;
// };

// export type OrganizerBlueprintRequestStatus = "Draft" | "Pending Review" | "Approved" | "Rejected";

// export type OrganizerBlueprintRequest = {
//   id: string;
//   organizerId: string;
//   eventId?: string;
//   venueName: string;
//   city: string;
//   venueType: string;
//   blueprintName?: string;
//   blueprintUrl?: string;
//   layoutDetails: string;
//   autoGenerateRequested: boolean;
//   status: OrganizerBlueprintRequestStatus;
//   createdAt: string;
//   updatedAt: string;
//   submittedAt?: string;
// };
// Legacy import adapter. Do not add new types here.
// Move all final seat-map types to src/features/seat-map/types.ts.
// Legacy import adapter. Do not add new types here.
// Move all final seat-map types to src/features/seat-map/types.ts.
export * from "@/features/seat-map/types";
