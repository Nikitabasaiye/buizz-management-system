import { createTicketQrPayload, getQrStatusForTicketStatus, type BuizzTicketData, type TicketStatus, type TicketThemeSettings } from "./ticketTypes";

type TicketPreviewOverrides = Partial<Omit<BuizzTicketData, "event" | "organizer" | "buyer" | "ticket" | "payment" | "theme">> & {
  event?: Partial<BuizzTicketData["event"]>;
  organizer?: Partial<BuizzTicketData["organizer"]>;
  buyer?: Partial<BuizzTicketData["buyer"]>;
  ticket?: Partial<BuizzTicketData["ticket"]>;
  payment?: Partial<BuizzTicketData["payment"]>;
  theme?: Partial<BuizzTicketData["theme"]>;
};

const previewSettings: TicketThemeSettings = {
  themeKey: "defaultPremium",
  layoutType: "premium",
  showOrganizerLogo: true,
  showBuyerName: true,
  showAmount: true,
  showActions: true,
  qrPosition: "right",
  tagline: "Your Buizz access pass",
  primaryColor: "#EC1B72",
  secondaryColor: "#7C2BD9",
  backgroundColor: "#08000B",
  textColor: "#FFFFFF",
  borderColor: "#EC1B72",
  templateShape: "stub-cutout",
  sectionOrder: ["hero", "bookingInfo", "qr", "seatTable", "amount", "note", "actions"],
  termsNote: "Please show this ticket at venue entry. This is a single entry ticket for all selected seats.",
  cornerRadius: 32,
  borderStyle: "solid",
  updatedByRole: "system",
  updatedAt: new Date(0).toISOString(),
  approvalStatus: "Approved",
};

export function createBlankTicketPreview(overrides: TicketPreviewOverrides = {}): BuizzTicketData {
  const bookingId = overrides.bookingId ?? "";
  const ticketId = overrides.ticketId ?? bookingId;
  const ticketStatus: TicketStatus = overrides.ticketStatus ?? "Valid";

  return {
    bookingId,
    ticketId,
    ticketStatus,
    qrStatus: overrides.qrStatus ?? getQrStatusForTicketStatus(ticketStatus),
    qrPayload: overrides.qrPayload ?? createTicketQrPayload({ type: "buizz-booking-pass", bookingId, eventId: "" }),
    issuedAt: overrides.issuedAt ?? "",
    event: {
      id: "",
      slug: "",
      title: "",
      category: "",
      eventType: "",
      bannerUrl: "",
      date: "",
      startTime: "",
      endTime: "",
      venueName: "",
      venueAddress: "",
      city: "",
      state: "",
      ageLimit: "",
      language: "",
      ...overrides.event,
    },
    organizer: {
      id: "",
      name: "",
      logoUrl: "",
      ...overrides.organizer,
    },
    buyer: {
      name: "",
      contactMasked: "",
      emailMasked: "",
      ...overrides.buyer,
    },
    ticket: {
      ticketType: "",
      ticketTypeId: "",
      section: "",
      seatBlock: "",
      seatBlockType: "",
      seats: [],
      quantity: 0,
      gate: "",
      amountPaid: 0,
      currency: "INR",
      benefits: [],
      instructions: [],
      ...overrides.ticket,
    },
    payment: {
      paymentStatus: "",
      transactionIdMasked: "",
      paidAt: "",
      ...overrides.payment,
    },
    theme: {
      layoutType: "premium",
      qrPosition: "right",
      showAmount: true,
      showBuyerName: true,
      showOrganizerLogo: true,
      settings: previewSettings,
      ...overrides.theme,
    },
    seatGroups: overrides.seatGroups,
  };
}
