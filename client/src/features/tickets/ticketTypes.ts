import type { SelectedSeatData } from "@/features/seat-map/seatMapTypes";

export type TicketStatus =
  | "Valid"
  | "Used"
  | "Cancelled"
  | "Refunded"
  | "Expired"
  | "Transferred"
  | "Blocked";

export type QrStatus =
  | "QR Ready"
  | "Already Scanned"
  | "Entry Blocked"
  | "Refunded Ticket"
  | "Expired Pass"
  | "Transfer Pending";

export type TicketLayoutType =
  | "standard"
  | "premium"
  | "luxury"
  | "wallet"
  | "boardingPass"
  | "cinema"
  | "stadium"
  | "theatre"
  | "workshop"
  | "festival"
  | "kids"
  | "business"
  | "table"
  | "wristband"
  | "qrCard"
  | "minimal";

export type TicketThemeKey = string;
export type TicketQrStatus = QrStatus;
export type TicketQrPosition = "right" | "bottom" | "center";
export type TicketMode = "preview" | "customer" | "organizer" | "admin" | "super-admin" | "print";
export type TicketTemplateShape = "premium-pass" | "stub-cutout" | "classic-card";
export type TicketSectionKey =
  | "hero"
  | "bookingInfo"
  | "qr"
  | "seatTable"
  | "amount"
  | "note"
  | "actions";

export type TicketDesignUpdatedByRole = "organizer" | "admin" | "super-admin" | "system";

export const defaultTicketSectionOrder: TicketSectionKey[] = [
  "hero",
  "bookingInfo",
  "qr",
  "seatTable",
  "amount",
  "note",
  "actions",
];

export type TicketDesignConfig = {
  showOrganizerLogo: boolean;
  showActions: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  heroImage?: string;
  backgroundTexture?: string;
  templateShape: TicketTemplateShape;
  sectionOrder: TicketSectionKey[];
  termsNote: string;
  cornerRadius: number;
  borderStyle: "solid" | "dashed" | "double";
  sponsorLogoUrl?: string;
  watermarkText?: string;
  updatedByRole: TicketDesignUpdatedByRole;
  updatedAt: string;
};

export type TicketThemeSettings = {
  themeKey: TicketThemeKey;
  layoutType: TicketLayoutType;
  accentColor?: string;
  showOrganizerLogo: boolean;
  showBuyerName: boolean;
  showAmount: boolean;
  qrPosition: TicketQrPosition;
  sponsorLogoUrl?: string;
  tagline?: string;
  approvalStatus: "Approved" | "Pending Admin Review" | "Rejected";
} & Partial<TicketDesignConfig>;

export type BuizzTicketData = {
  bookingId: string;
  ticketId: string;
  ticketStatus: TicketStatus;
  qrStatus: QrStatus;
  qrPayload: string;
  issuedAt: string;
  checkedInAt?: string;
  scannedBy?: string;
  transferStatus?: string;
  event: {
    id: string;
    slug: string;
    title: string;
    category: string;
    eventType: string;
    bannerUrl: string;
    ticketImageUrl?: string;
    date: string;
    startTime: string;
    endTime: string;
    venueName: string;
    venueAddress: string;
    city: string;
    state: string;
    ageLimit?: string;
    language?: string;
  };
  organizer: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  buyer: {
    name: string;
    contactMasked: string;
    emailMasked?: string;
  };
  ticket: {
    ticketType: string;
    ticketTypeId: string;
    section: string;
    seatBlock: string;
    seatBlockType: string;
    seats: string[];
    selectedSeats?: SelectedSeatData[];
    seatMapTemplateId?: string;
    seatMapOverrideId?: string;
    seatMapSource?: string;
    tableNumber?: string;
    quantity: number;
    gate: string;
    amountPaid: number;
    currency: string;
    benefits?: string[];
    instructions: string[];
  };
  seatGroups?: Array<{
    section: string;
    seats: string[];
    quantity: number;
    amount: number;
  }>;
  payment: {
    paymentStatus: string;
    transactionIdMasked: string;
    paidAt: string;
  };
  theme: {
    customThemeKey?: TicketThemeKey;
    organizerSelectedThemeKey?: TicketThemeKey;
    adminApprovedThemeKey?: TicketThemeKey;
    layoutType?: TicketLayoutType;
    qrPosition?: TicketQrPosition;
    showAmount: boolean;
    showBuyerName: boolean;
    showOrganizerLogo: boolean;
    sponsorLogoUrl?: string;
    badgeText?: string;
    accentColor?: string;
    settings?: TicketThemeSettings;
  };
};

export type TicketDesignElementType =
  | TicketSectionKey
  | "buizzLogo"
  | "organizerLogo"
  | "eventBanner"
  | "eventTitle"
  | "categoryBadge"
  | "dateTime"
  | "venue"
  | "ticketType"
  | "seatBlock"
  | "gate"
  | "buyerName"
  | "amount"
  | "qrCode"
  | "sponsorLogo"
  | "benefits"
  | "instructions"
  | "terms";

export type TicketDesignElement = {
  id: string;
  type: TicketDesignElementType;
  label: string;
  locked: boolean;
  visible: boolean;
};

export type TicketDesignLayout = {
  elements: TicketDesignElement[];
  desktopColumns: 1 | 2;
  mobileStacked: boolean;
};

export type TicketDesignDraft = {
  id: string;
  name: string;
  organizerId?: string;
  eventId?: string;
  status: "Draft" | "Pending Review" | "Approved" | "Rejected";
  themeKey: TicketThemeKey;
  settings: TicketThemeSettings;
  layout: TicketDesignLayout;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
};

export type TicketQrPayload = {
  type?: "buizz-ticket" | "buizz-booking-pass";
  bookingId: string;
  ticketId?: string;
  eventId: string;
  eventSlug?: string;
  totalSeats?: number;
  seatNumbers?: string[];
  seatGroups?: Array<{
    section: string;
    sectionColor?: string;
    totalSeats: number;
    seatNumbers: string[];
    amount: number;
  }>;
  status?: "valid" | "used" | "cancelled" | "refunded" | "preview";
  signedToken?: string;
  gate?: string;
  selectedSeats?: SelectedSeatData[];
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  tierId?: string;
  source?: "Online" | "Offline" | "Reserved" | "Free";
};

export type TicketThemeRequest = {
  id: string;
  eventId: string;
  eventName: string;
  organizerName: string;
  previousSettings: TicketThemeSettings;
  requestedSettings: TicketThemeSettings;
  status: "Pending" | "Approved" | "Rejected" | "Changes Requested";
  submittedAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
  rejectionReason?: string;
};

export const ticketStorageKeys = {
  themes: "buizz-ticket-themes",
  designDrafts: "buizz-ticket-design-drafts",
  themeRequests: "buizz-ticket-theme-requests",
  eventSettings: "buizz-event-ticket-settings",
  userTickets: "buizz-user-tickets",
  scans: "buizz-ticket-scans",
} as const;

export const defaultTicketCategories = [
  "Music", "Comedy", "Movies", "Sports", "Theatre", "Workshop", "Festival",
  "Kids", "Business", "Food", "Nightlife", "Technology", "Education",
  "Health & Fitness", "Art & Culture", "Gaming", "Fashion", "Exhibition",
  "Tourism", "Religious", "College Fest", "Corporate", "Startup", "Auto Expo",
  "Pet Show", "Custom",
] as const;

export const defaultTicketTypes = [
  "General", "Regular", "Early Bird", "VIP", "VVIP", "Student", "Kids",
  "Couple", "Family", "Delegate", "Speaker", "Sponsor", "Artist", "Media",
  "Crew", "Volunteer", "Fan Pit", "Backstage", "Meet & Greet", "Table for 4",
  "Table for 6", "Table for 8", "Parking", "Premium Parking", "Day Pass",
  "Weekend Pass", "Season Pass", "Custom",
] as const;

export function createTicketQrPayload(payload: TicketQrPayload) {
  // Production backend must generate signed QR token and verify scans server-side.
  // Simplified QR payload to avoid exceeding QR code capacity
  const ticketId = payload.ticketId ?? payload.bookingId;
  if (!ticketId) {
    return JSON.stringify({
      type: payload.type ?? "buizz-booking-pass",
      ...payload,
    });
  }
  
  // Use only the ticket ID for QR code to keep it small and scannable
  // The full data can be fetched from the server using this ID
  return ticketId;
}

export function parseTicketQrPayload(value: string): TicketQrPayload | null {
  try {
    // Handle simple ticket ID format (new simplified QR codes)
    if (!value.startsWith('{')) {
      return {
        ticketId: value,
        bookingId: value,
        eventId: '', // Will be fetched from server using ticket ID
        type: "buizz-booking-pass",
      };
    }
    
    // Handle JSON format (old QR codes or fallback)
    const parsed = JSON.parse(value) as Partial<TicketQrPayload>;
    if (!parsed.bookingId || !parsed.eventId) return null;
    return {
      bookingId: parsed.bookingId,
      ticketId: parsed.ticketId ?? parsed.bookingId,
      eventId: parsed.eventId,
      type: parsed.type,
      eventSlug: parsed.eventSlug,
      totalSeats: typeof parsed.totalSeats === "number" ? parsed.totalSeats : undefined,
      seatNumbers: Array.isArray(parsed.seatNumbers) ? parsed.seatNumbers.map(String) : undefined,
      seatGroups: Array.isArray(parsed.seatGroups)
        ? parsed.seatGroups.map((group) => ({
            section: String(group.section ?? "General"),
            sectionColor: group.sectionColor ? String(group.sectionColor) : undefined,
            totalSeats: Number.isFinite(Number(group.totalSeats)) ? Number(group.totalSeats) : 1,
            seatNumbers: Array.isArray(group.seatNumbers) ? group.seatNumbers.map(String) : [],
            amount: Number.isFinite(Number(group.amount)) ? Number(group.amount) : 0,
          }))
        : undefined,
      status: parsed.status,
      signedToken: parsed.signedToken,
      gate: parsed.gate,
      selectedSeats: Array.isArray(parsed.selectedSeats) ? parsed.selectedSeats as SelectedSeatData[] : undefined,
      seatMapTemplateId: parsed.seatMapTemplateId,
      seatMapOverrideId: parsed.seatMapOverrideId,
      tierId: parsed.tierId,
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

export function getQrStatusForTicketStatus(status: TicketStatus): QrStatus {
  if (status === "Used") return "Already Scanned";
  if (status === "Cancelled" || status === "Blocked") return "Entry Blocked";
  if (status === "Refunded") return "Refunded Ticket";
  if (status === "Expired") return "Expired Pass";
  if (status === "Transferred") return "Transfer Pending";
  return "QR Ready";
}

export function maskTicketContact(value?: string) {
  const contact = value?.trim();
  if (!contact) return "Contact unavailable";

  if (contact.includes("@")) return maskTicketEmail(contact) ?? "Email protected";

  const digits = contact.replace(/\D/g, "");
  if (digits.length < 4) return "Contact protected";
  const countryCode = digits.length > 10 ? digits.slice(0, digits.length - 10) : "91";
  return `+${countryCode} ******${digits.slice(-4)}`;
}

export function maskTicketEmail(value?: string) {
  const contact = value?.trim();
  if (!contact || !contact.includes("@")) return undefined;
  const [local, domain] = contact.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}
