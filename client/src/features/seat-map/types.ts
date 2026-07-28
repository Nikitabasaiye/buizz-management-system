// export type SeatStatus =
//   | "available"
//   | "selected"
//   | "booked"
//   | "blocked"
//   | "reserved"
//   | "locked"
//   | "sold"
//   | "disabled"
//   | "offline"
//   | "partner"
//   | "complimentary"
//   | "unavailable";

// export type LayoutType =
//   | "general-entry"
//   | "exact-seat"
//   | "section-seat"
//   | "zone"
//   | "table"
//   | "time-slot"
//   | "room-hall"
//   | "custom-layout";

// export type SeatMapLayoutType = LayoutType;
// export type SeatMapProvider = "custom" | "seatsio";
// export type SeatMapMode = "builder" | "customer";
// export type SeatMapRole = "super-admin" | "admin" | "organizer";
// export type SeatMapStatus = "draft" | "pending" | "approved" | "published";
// export type SeatEngineStatus = "Draft" | "Published";
// export type StagePosition = "top" | "bottom" | "left" | "right" | "center" | "none";

// export type VenueType =
//   | "Cinema"
//   | "Theatre"
//   | "Auditorium"
//   | "Stadium"
//   | "Sports Arena"
//   | "Concert Ground"
//   | "Festival Ground"
//   | "Club"
//   | "Lounge"
//   | "Restaurant"
//   | "Wedding Hall"
//   | "Banquet Hall"
//   | "Conference Room"
//   | "Custom";

// export type SeatMapPermissions = {
//   canManageSeatMap: boolean;
// };

// export type SeatMapSectionKind = "seated" | "standing" | "table" | "zone" | "room" | "hall" | "vip-box";
// export type SectionKind = SeatMapSectionKind;

// export type Seat = {
//   id: string;
//   label: string;
//   price: number;
//   status: SeatStatus;
//   color?: string;
//   x?: number;
//   y?: number;
// };

// export type PricingZone = {
//   id: string;
//   name: string;
//   color: string;
//   ticketCategory: string;
//   price: number;
// };

// export type SeatMapSeat = Seat & {
//   sectionId?: string;
//   sectionName?: string;
//   rowId?: string;
//   rowName?: string;
//   number?: string;
//   pricingZoneId?: string;
// };

// export type SeatRow = {
//   id: string;
//   label: string;
//   seats: Seat[];
// };

// export type SeatMapRow = SeatRow & {
//   sectionId?: string;
//   sectionName?: string;
//   seats: SeatMapSeat[];
// };

// export type SeatMapSection = {
//   id: string;
//   label: string;
//   name?: string;
//   kind: SeatMapSectionKind;
//   color: string;
//   pricingZoneId?: string;
//   price: number;
//   capacity: number;
//   status: SeatStatus;
//   ticketThemeKey?: string;
//   gateName?: string;
//   entryInstruction?: string;
//   x?: number;
//   y?: number;
//   width?: number;
//   height?: number;
//   rows?: SeatMapRow[];
// };

// export type GeneralAdmissionArea = {
//   id: string;
//   name: string;
//   capacity: number;
//   selectedQuantity: number;
//   pricingZoneId: string;
//   color: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// };

// export type VenueObjectType = "section" | "row" | "seat" | "table" | "ga" | "stage" | "gate" | "background";

// export type VenueObject = {
//   id: string;
//   type: VenueObjectType;
//   name: string;
//   sectionId?: string;
//   rowId?: string;
//   seatId?: string;
//   capacity?: number;
//   pricingZoneId?: string;
//   status?: SeatStatus | SeatEngineStatus;
//   color?: string;
//   x: number;
//   y: number;
//   width?: number;
//   height?: number;
// };

// export type TicketTemplate = {
//   id: string;
//   name: string;
//   accentColor: string;
//   selectedBy: SeatMapRole;
// };

// export type SeatSelection = {
//   seatId: string;
//   label: string;
//   sectionName: string;
//   rowName: string;
//   price: number;
//   pricingZoneName: string;
// };

// export type SeatMapFloor = {
//   id: string;
//   label: string;
//   sections: SeatMapSection[];
// };

// export type SeatMapLayout = {
//   id: string;
//   eventId?: string;
//   venueId?: string;
//   layoutId?: string;
//   venueName: string;
//   venueType: string;
//   provider: SeatMapProvider;
//   layoutType: LayoutType;
//   stagePosition?: "top" | "bottom" | "left" | "right" | "center";
//   currency: "INR";
//   seatsIoChartKey?: string;
//   seatsIoEventKey?: string;
//   seatsIoWorkspaceKey?: string;
//   floors: SeatMapFloor[];
//   sections?: SeatMapSection[];
//   rows?: SeatMapRow[];
//   seats?: SeatMapSeat[];
//   generalAdmissionAreas?: GeneralAdmissionArea[];
//   tables?: VenueObject[];
//   stage?: VenueObject;
//   gates?: VenueObject[];
//   zones?: VenueObject[];
//   pricingZones?: PricingZone[];
//   ticketTemplates?: TicketTemplate[];
//   selectedTicketTemplateId?: string;
//   status?: SeatEngineStatus;
//   metadata: {
//     version: number;
//     createdByRole: SeatMapRole;
//     createdById: string;
//     status: SeatMapStatus;
//     updatedAt: string;
//     notes?: string;
//   };
// };

// export type SeatMapSelectionItem = {
//   id: string;
//   label: string;
//   sectionId: string;
//   sectionLabel: string;
//   floorLabel: string;
//   price: number;
//   kind: "seat" | "section" | "zone" | "table" | "pass" | "slot" | "room";
// };

// export type SeatMapBuilderDraft = {
//   eventId: string;
//   venueName: string;
//   venueType: VenueType;
//   provider: SeatMapProvider;
//   layoutType: LayoutType;
//   stagePosition: StagePosition;
//   floors: number;
//   sectionsPerFloor: number;
//   rowsPerSection: number;
//   seatsPerRow: number;
//   basePrice: number;
//   baseCapacity: number;
//   sectionName: string;
//   sectionPrice: number;
//   sectionCapacity: number;
//   vipPrice: number;
//   goldPrice: number;
//   silverPrice: number;
//   zoneName: string;
//   tableNumber: string;
//   tableCapacity: number;
//   slotDate: string;
//   slotTime: string;
//   roomName: string;
//   customX: number;
//   customY: number;
//   customWidth: number;
//   customHeight: number;
//   color: string;
//   seatsIoChartKey: string;
//   seatsIoEventKey: string;
//   seatsIoWorkspaceKey: string;
//   notes: string;
// };

// export type SeatMapBookingPayload = {
//   eventId: string;
//   provider: SeatMapProvider;
//   selectedItems: string[];
//   holdToken?: string;
//   totalPrice: number;
// };

// export type SeatMapTemplateStatusV2 = "draft" | "active" | "archived";
// export type EventSeatConfigStatus = "draft" | "submitted" | "approved" | "rejected" | "published";
// export type VenueMasterType = "auditorium" | "concert" | "stadium" | "theatre" | "club" | "banquet" | "outdoor" | "custom";
// export type SeatSalesChannelV2 = "buizz_online" | "offline_counter" | "bookmyshow" | "external_partner" | "complimentary" | "none";

// export type SeatMapAuditItem = {
//   id: string;
//   actorId: string;
//   actorName: string;
//   actorRole: "super-admin" | "admin" | "organizer" | "customer";
//   action: string;
//   message: string;
//   createdAt: string;
// };

// export type SeatTier = {
//   id: string;
//   name: string;
//   color: string;
//   price: number;
//   active: boolean;
// };

// export type SeatNode = {
//   id: string;
//   section: string;
//   row: string;
//   number: string;
//   x: number;
//   y: number;
//   status: SeatStatus;
//   tierId?: string;
//   gate?: string;
//   channel?: SeatSalesChannelV2;
//   locked: boolean;
//   notes?: string;
// };

// export type SeatMapSectionNode = {
//   id: string;
//   name: string;
//   capacity: number;
//   gate?: string;
//   tierId?: string;
//   hidden?: boolean;
//   locked?: boolean;
// };

// export type SeatMapRowNode = {
//   id: string;
//   section: string;
//   label: string;
//   seatIds: string[];
//   locked?: boolean;
// };

// export type SeatMapGateNode = {
//   id: string;
//   label: string;
//   type: "entry" | "exit";
//   x: number;
//   y: number;
// };

// export type SeatMapStageNode = {
//   id: string;
//   label: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// };

// export type SeatMapBlueprint = {
//   url?: string;
//   name?: string;
//   opacity: number;
//   scale: number;
//   visible: boolean;
// };

// export type SeatMapTemplate = {
//   id: string;
//   venueId: string;
//   venueName: string;
//   city: string;
//   venueType: VenueMasterType;
//   status: SeatMapTemplateStatusV2;
//   totalCapacity: number;
//   sections: SeatMapSectionNode[];
//   rows: SeatMapRowNode[];
//   seats: SeatNode[];
//   gates: SeatMapGateNode[];
//   stage: SeatMapStageNode;
//   blueprint: SeatMapBlueprint;
//   tiers: SeatTier[];
//   allowOrganizerStructureEdits: boolean;
//   createdBy: string;
//   createdAt: string;
//   updatedAt: string;
//   publishedAt?: string;
//   auditTrail: SeatMapAuditItem[];
// };

// export type EventSeatConfig = {
//   id: string;
//   eventId: string;
//   organizerId: string;
//   templateId: string;
//   status: EventSeatConfigStatus;
//   seatStatuses: Record<string, SeatStatus>;
//   tiers: SeatTier[];
//   channelAllocations: Record<string, SeatSalesChannelV2>;
//   blockedSeats: string[];
//   reservedSeats: string[];
//   complimentarySeats: string[];
//   offlineSeats: string[];
//   partnerSeats: string[];
//   notes: Record<string, string>;
//   submittedAt?: string;
//   reviewedAt?: string;
//   reviewedBy?: string;
//   auditTrail: SeatMapAuditItem[];
// };

// export type SeatHold = {
//   id: string;
//   eventId: string;
//   seatIds: string[];
//   sessionId: string;
//   expiresAt: string;
//   createdAt: string;
// };
export type SeatMapRole = "super-admin" | "super_admin" | "admin" | "organizer" | "customer";
export type MasterSeatMapRole = "super-admin" | "admin";
export type SeatMapTemplateStatusV2 = "draft" | "active" | "inactive" | "archived";
export type EventSeatConfigStatus = "draft" | "submitted" | "approved" | "rejected" | "published";
export type SeatMapApprovalStatus = "Draft" | "Pending Review" | "Approved" | "Rejected";
export type SeatMapTemplateStatus = "Draft" | "Active" | "Archived" | "Pending Review" | SeatMapTemplateStatusV2;

export type SeatStatus =
  | "available"
  | "selected"
  | "booked"
  | "blocked"
  | "reserved"
  | "locked"
  | "sold"
  | "disabled"
  | "offline"
  | "partner"
  | "complimentary"
  | "unavailable"
  | "hold"
  | "vip"
  | "staff";

export type SeatNodeStatus = SeatStatus | "draft" | "checked_in" | "cancelled" | "refunded";
export type SeatLifecycleStatus = SeatNodeStatus;

export type SeatSalesChannel = "online" | "offline" | "reserved" | "complimentary" | "none";
export type SeatSalesChannelV2 = "buizz_online" | "offline_counter" | "bookmyshow" | "external_partner" | "complimentary" | "none";
export type FinalSeatSalesChannel = SeatSalesChannel | SeatSalesChannelV2;

export type VenueMasterType = "auditorium" | "concert" | "stadium" | "theatre" | "club" | "banquet" | "outdoor" | "custom";
export type VenueType =
  | "Cinema"
  | "Theatre"
  | "Auditorium"
  | "Stadium"
  | "Sports Arena"
  | "Concert Ground"
  | "Festival Ground"
  | "Club"
  | "Lounge"
  | "Restaurant"
  | "Wedding Hall"
  | "Banquet Hall"
  | "Conference Room"
  | "Custom"
  | VenueMasterType;

export type LayoutType =
  | "general-entry"
  | "exact-seat"
  | "section-seat"
  | "zone"
  | "table"
  | "time-slot"
  | "room-hall"
  | "custom-layout";

export type SeatMapLayoutType = LayoutType;
export type SeatMapProvider = "custom" | "seatsio";
export type SeatMapStatus = "draft" | "pending" | "approved" | "published";
export type SeatEngineStatus = "Draft" | "Published";
export type StagePosition = "top" | "bottom" | "left" | "right" | "center" | "none";
export type SeatMapMode = "capacity_only" | "seat_map" | "builder" | "customer";

export type SeatMapPermissions = {
  canManageSeatMap: boolean;
};

export type SeatTier = {
  id: string;
  name: string;
  color: string;
  price: number;
  priceLabel?: string;
  channel?: SeatSalesChannel;
  description?: string;
  active: boolean;
};

export type SeatTicketTier = SeatTier & {
  totalSeats?: number;
  soldSeats?: number;
  blockedSeats?: number;
  reservedSeats?: number;
};

export type SeatSectionType =
  | "vip"
  | "premium"
  | "gold"
  | "silver"
  | "balcony"
  | "general"
  | "standing"
  | "fan_pit"
  | "front_row"
  | "family_zone"
  | "custom"
  | "seated"
  | "box"
  | "lawn";

export type SeatSectionStatus = "active" | "hidden" | "locked" | "disabled" | "sold_out";
export type SectionType = "seated" | "standing" | "vip" | "box" | "balcony";
export type SeatMapSectionKind = "seated" | "standing" | "table" | "zone" | "room" | "hall" | "vip-box";
export type SectionKind = SeatMapSectionKind;

export type SeatSectionInventorySummary = {
  totalSeats: number;
  buizzOnlineSeats: number;
  offlineCounterSeats: number;
  bookMyShowSeats: number;
  reservedSeats: number;
  complimentarySeats: number;
  blockedSeats: number;
  disabledSeats: number;
  soldSeats: number;
  lockedSeats: number;
  availableOnlineSeats: number;
  availableOfflineSeats: number;
};

export type SeatSection = {
  id: string;
  name: string;
  label?: string;
  type?: SeatSectionType | SectionType;
  kind?: SeatMapSectionKind;
  color: string;
  defaultTierId?: string;
  tierId?: string;
  defaultPrice?: number;
  price?: number;
  gate?: string;
  capacity: number;
  seatIds?: string[];
  rows?: string[] | SeatMapRow[];
  rowStart?: string;
  rowEnd?: string;
  displayOrder?: number;
  status?: SeatStatus | SeatSectionStatus;
  visibleOnPublic?: boolean;
  hidden?: boolean;
  locked?: boolean;
  notes?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
};

export type MasterSeatSectionConfig = SeatSection & {
  templateId: string;
  totalSeats: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SeatNodeType =
  | "seat"
  | "standing_zone"
  | "stage"
  | "entry_gate"
  | "exit_gate"
  | "section_label"
  | "row_label"
  | "custom_label";

export type SeatNode = {
  id: string;
  type?: SeatNodeType;
  label?: string;
  section?: string;
  sectionId?: string;
  sectionName?: string;
  row?: string;
  rowId?: string;
  rowName?: string;
  number?: string;
  seatNumber?: string;
  x?: number;
  y?: number;
  xPercent?: number;
  yPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  radius?: number;
  rotation?: number;
  status: SeatStatus | SeatNodeStatus;
  tierId?: string;
  price?: number;
  gate?: string;
  notes?: string;
  channel?: FinalSeatSalesChannel;
  salesChannel?: FinalSeatSalesChannel;
  locked?: boolean;
  isAccessible?: boolean;
  isCompanion?: boolean;
};

export type CanvasObjectType = "stage" | "entry" | "exit" | "label" | "standing" | "section-box";

export type CanvasObject = {
  id: string;
  type: CanvasObjectType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  text?: string;
  capacity?: number;
  tierId?: string;
  locked?: boolean;
};

export type SeatMapCanvasState = {
  width: number;
  height: number;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  zoom: number;
  panX: number;
  panY: number;
};

export type SeatMapSectionNode = {
  id: string;
  name: string;
  capacity: number;
  gate?: string;
  tierId?: string;
  hidden?: boolean;
  locked?: boolean;
};

export type SeatMapRowNode = {
  id: string;
  section: string;
  label: string;
  seatIds: string[];
  locked?: boolean;
};

export type SeatMapGateNode = {
  id: string;
  label: string;
  type: "entry" | "exit";
  x: number;
  y: number;
};

export type SeatMapStageNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SeatMapBlueprint = {
  url?: string;
  name?: string;
  opacity: number;
  scale: number;
  visible: boolean;
};

export type SeatMapAuditItem = {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: "super-admin" | "admin" | "organizer" | "customer";
  action: string;
  message: string;
  createdAt: string;
};

export type SeatMapAuditEntry = {
  id: string;
  templateId: string;
  actorRole: SeatMapRole;
  actorName: string;
  action: string;
  comment: string;
  createdAt: string;
  validationResult?: string;
};

export type SeatMapAuditLog = SeatMapAuditItem;

export type SeatMapTemplate = {
  id: string;
  venueId?: string;
  venueName: string;
  venueCode?: string;
  city: string;
  address?: string;
  venueType: VenueMasterType | VenueType | string;
  categoryTags?: string[];
  backgroundImageUrl?: string;
  backgroundImageName?: string;
  backgroundImageSize?: number;
  backgroundOpacity?: number;
  backgroundLocked?: boolean;
  backgroundVisible?: boolean;
  backgroundScale?: number;
  backgroundOffsetX?: number;
  backgroundOffsetY?: number;
  canvasAspectRatio?: "16:9" | "4:3" | "1:1" | "custom";
  status: SeatMapTemplateStatusV2 | SeatMapTemplateStatus;
  version?: number;
  totalCapacity: number;
  allowOrganizerStructureEdits?: boolean;
  allowOrganizerStructureEdit?: boolean;
  allowAdminOverride?: boolean;
  isDefaultForOrganizers?: boolean;
  sections: SeatSection[];
  rows?: SeatMapRowNode[] | SeatMapRow[];
  seats: SeatNode[];
  nodes?: SeatNode[];
  blocks?: SeatBlock[];
  gates?: SeatMapGateNode[];
  stage?: SeatMapStageNode;
  blueprint?: SeatMapBlueprint;
  tiers: SeatTier[];
  objects?: CanvasObject[];
  canvas?: SeatMapCanvasState;
  createdBy?: string;
  createdByRole?: "super-admin" | "super_admin" | "admin";
  createdByName?: string;
  updatedByRole?: "super-admin" | "admin";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedBy?: string;
  lastSavedAt?: string;
  lastPublishedAt?: string;
  publishedVersion?: number;
  auditTrail?: SeatMapAuditItem[];
  approval?: {
    approvedBy?: string;
    role?: "super_admin" | "admin";
    timestamp?: string;
    reason?: string;
    checkedSeatMap?: boolean;
  };
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSizePercent?: number;
};

export type EventSeatConfig = {
  id: string;
  eventId: string;
  organizerId: string;
  templateId: string;
  status: EventSeatConfigStatus;
  seatStatuses: Record<string, SeatStatus>;
  tiers: SeatTier[];
  channelAllocations: Record<string, SeatSalesChannelV2>;
  blockedSeats: string[];
  reservedSeats: string[];
  complimentarySeats: string[];
  offlineSeats: string[];
  partnerSeats: string[];
  notes: Record<string, string>;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  auditTrail: SeatMapAuditItem[];
};

export type SeatHold = {
  id: string;
  eventId: string;
  seatIds: string[];
  sessionId: string;
  expiresAt: string;
  createdAt: string;
};

export type EventSectionOverride = {
  id: string;
  eventId: string;
  templateId: string;
  sectionId: string;
  sectionName: string;
  sectionType: SeatSectionType;
  tierId?: string;
  tierName?: string;
  price: number;
  gate?: string;
  salesChannelSplit: {
    buizzOnline: number;
    offlineCounter: number;
    bookMyShow: number;
    organizerReserved: number;
    complimentary: number;
    blocked: number;
    disabled: number;
  };
  inventorySummary: SeatSectionInventorySummary;
  publicDisplay: {
    visible: boolean;
    showPrice: boolean;
    showAvailableCount: boolean;
    displayLabel: string;
    displayOrder: number;
  };
  lockedForEditing: boolean;
  allowPublicBooking: boolean;
  notes?: string;
  validationIssues: string[];
  createdAt: string;
  updatedAt: string;
};

export type OrganizerSeatMapOverride = {
  id: string;
  eventId: string;
  templateId: string;
  organizerId: string;
  customBackgroundImageUrl?: string;
  nodeOverrides: Record<
    string,
    {
      status?: SeatNodeStatus | SeatStatus;
      tierId?: string;
      price?: number;
      notes?: string;
      gate?: string;
      salesChannel?: FinalSeatSalesChannel;
    }
  >;
  approvalStatus?: SeatMapApprovalStatus;
  approvalNotes?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  tiers: SeatTicketTier[];
  sectionOverrides?: EventSectionOverride[];
  totalActiveSeats: number;
  totalBlockedSeats: number;
  totalReservedSeats: number;
  updatedAt: string;
};

export type OrganizerBlueprintRequestStatus = "Draft" | "Pending Review" | "Approved" | "Rejected";

export type OrganizerBlueprintRequest = {
  id: string;
  organizerId: string;
  eventId?: string;
  venueName: string;
  city: string;
  venueType: string;
  blueprintName?: string;
  blueprintUrl?: string;
  layoutDetails: string;
  autoGenerateRequested: boolean;
  status: OrganizerBlueprintRequestStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
};

export type PublicSeatAvailability = {
  eventId?: string;
  venueId?: string;
  scheduleId?: string;
  seatId: string;
  status: "available" | "sold" | "locked" | "selected" | "blocked" | "reserved";
  lockedUntil?: string;
  lockedBySessionId?: string;
  bookingId?: string;
};

export type SeatHoldToken = {
  holdToken: string;
  eventId: string;
  seatIds: string[];
  sessionId: string;
  expiresAt: string;
};

export type SelectedSeatData = {
  seatId: string;
  label: string;
  section: string;
  row?: string;
  seatNumber?: string;
  gate?: string;
  tierId?: string;
  tierName?: string;
  price: number;
  venueId?: string;
  scheduleId?: string;
};

export type PublicSelectedSeat = SelectedSeatData & {
  tierName: string;
  venueId: string;
  scheduleId: string;
};

export type SeatMapSummary = {
  totalCapacity: number;
  activeSeats: number;
  blockedSeats: number;
  reservedSeats: number;
  soldSeats?: number;
  tierCount: number;
};

export type SeatMapDraftFields = {
  seatMapMode?: "capacity_only" | "seat_map";
  seatMapSource?: "capacity_only" | "master_template" | "blueprint_request";
  requiresSeatMap?: boolean;
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  seatMapSummary?: SeatMapSummary;
};

// Legacy layout engine types kept only so old imports keep compiling while pages migrate to SeatMapTemplate/EventSeatConfig.
export type Seat = {
  id: string;
  label: string;
  price: number;
  status: SeatStatus;
  color?: string;
  x?: number;
  y?: number;
};

export type PricingZone = {
  id: string;
  name: string;
  color: string;
  ticketCategory: string;
  price: number;
};

export type SeatMapSeat = Seat & {
  sectionId?: string;
  sectionName?: string;
  rowId?: string;
  rowName?: string;
  number?: string;
  pricingZoneId?: string;
};

export type SeatRow = {
  id: string;
  label: string;
  seats: Seat[];
};

export type SeatMapRow = SeatRow & {
  sectionId?: string;
  sectionName?: string;
  seats: SeatMapSeat[];
};

export type SeatMapSection = {
  id: string;
  label: string;
  name?: string;
  kind: SeatMapSectionKind;
  color: string;
  pricingZoneId?: string;
  price: number;
  capacity: number;
  status: SeatStatus;
  ticketThemeKey?: string;
  gateName?: string;
  entryInstruction?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rows?: SeatMapRow[];
};

export type GeneralAdmissionArea = {
  id: string;
  name: string;
  capacity: number;
  selectedQuantity: number;
  pricingZoneId: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VenueObjectType = "section" | "row" | "seat" | "table" | "ga" | "stage" | "gate" | "background";

export type VenueObject = {
  id: string;
  type: VenueObjectType;
  name: string;
  sectionId?: string;
  rowId?: string;
  seatId?: string;
  capacity?: number;
  pricingZoneId?: string;
  status?: SeatStatus | SeatEngineStatus;
  color?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type TicketTemplate = {
  id: string;
  name: string;
  accentColor: string;
  selectedBy: SeatMapRole;
};

export type SeatSelection = {
  seatId: string;
  label: string;
  sectionName: string;
  rowName: string;
  price: number;
  pricingZoneName: string;
};

export type SeatMapFloor = {
  id: string;
  label: string;
  sections: SeatMapSection[];
};

export type SeatMapLayout = {
  id: string;
  eventId?: string;
  venueId?: string;
  layoutId?: string;
  venueName: string;
  venueType: string;
  provider: SeatMapProvider;
  layoutType: LayoutType;
  stagePosition?: "top" | "bottom" | "left" | "right" | "center";
  currency: "INR";
  seatsIoChartKey?: string;
  seatsIoEventKey?: string;
  seatsIoWorkspaceKey?: string;
  floors: SeatMapFloor[];
  sections?: SeatMapSection[];
  rows?: SeatMapRow[];
  seats?: SeatMapSeat[];
  generalAdmissionAreas?: GeneralAdmissionArea[];
  tables?: VenueObject[];
  stage?: VenueObject;
  gates?: VenueObject[];
  zones?: VenueObject[];
  pricingZones?: PricingZone[];
  ticketTemplates?: TicketTemplate[];
  selectedTicketTemplateId?: string;
  status?: SeatEngineStatus;
  metadata: {
    version: number;
    createdByRole: SeatMapRole;
    createdById: string;
    status: SeatMapStatus;
    updatedAt: string;
    notes?: string;
  };
};

export type SeatMapSelectionItem = {
  id: string;
  label: string;
  sectionId: string;
  sectionLabel: string;
  floorLabel: string;
  price: number;
  kind: "seat" | "section" | "zone" | "table" | "pass" | "slot" | "room";
};

export type SeatMapBuilderDraft = {
  eventId: string;
  venueName: string;
  venueType: VenueType;
  provider: SeatMapProvider;
  layoutType: LayoutType;
  stagePosition: StagePosition;
  floors: number;
  sectionsPerFloor: number;
  rowsPerSection: number;
  seatsPerRow: number;
  basePrice: number;
  baseCapacity: number;
  sectionName: string;
  sectionPrice: number;
  sectionCapacity: number;
  vipPrice: number;
  goldPrice: number;
  silverPrice: number;
  zoneName: string;
  tableNumber: string;
  tableCapacity: number;
  slotDate: string;
  slotTime: string;
  roomName: string;
  customX: number;
  customY: number;
  customWidth: number;
  customHeight: number;
  color: string;
  seatsIoChartKey: string;
  seatsIoEventKey: string;
  seatsIoWorkspaceKey: string;
  notes: string;
};

export type SeatMapBookingPayload = {
  eventId: string;
  provider: SeatMapProvider;
  selectedItems: string[];
  holdToken?: string;
  totalPrice: number;
};

export type SeatBlock = {
  id: string;
  name: string;
  type: "seated" | "standing" | "reserved" | "vip" | "disabled";
  color: string;
  capacity: number;
  tierId?: string;
  nodeIds: string[];
};
