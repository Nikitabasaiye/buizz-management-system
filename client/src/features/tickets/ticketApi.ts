import { builtInTicketThemes, type TicketThemeConfig } from "./ticketThemes";
import { safeReadStorage, safeWriteStorage, ticketStorage } from "./ticketStorage";
import type {
  BuizzTicketData,
  TicketDesignDraft,
  TicketThemeRequest,
} from "./ticketTypes";
import { createTicketQrPayload, parseTicketQrPayload, ticketStorageKeys } from "./ticketTypes";

const wait = () => new Promise((resolve) => setTimeout(resolve, 180));

export async function getTicketThemes() {
  // Future endpoint: GET /api/ticket-themes
  await wait();
  return ticketStorage.getThemes(builtInTicketThemes);
}

export async function createTicketTheme(payload: TicketThemeConfig) {
  // Future endpoint: POST /api/ticket-themes
  await wait();
  const themes = ticketStorage.getThemes(builtInTicketThemes);
  ticketStorage.setThemes([payload, ...themes.filter((theme) => theme.key !== payload.key)]);
  return payload;
}

export async function updateTicketTheme(id: string, payload: Partial<TicketThemeConfig>) {
  // Future endpoint: PATCH /api/ticket-themes/:id
  await wait();
  const themes = ticketStorage.getThemes(builtInTicketThemes);
  const next = themes.map((theme) => theme.key === id ? { ...theme, ...payload } : theme);
  ticketStorage.setThemes(next);
  return next.find((theme) => theme.key === id);
}

export async function deleteTicketTheme(id: string) {
  // Future endpoint: DELETE /api/ticket-themes/:id
  await wait();
  ticketStorage.setThemes(ticketStorage.getThemes(builtInTicketThemes).filter((theme) => theme.key !== id));
  return { ok: true };
}

export async function getOrganizerTicketDesigns() {
  // Future endpoint: GET /api/organizer/ticket-designs
  await wait();
  return ticketStorage.getDesignDrafts().filter(isLegacyTicketDesignDraft);
}

export async function createOrganizerTicketDesign(payload: TicketDesignDraft) {
  // Future endpoint: POST /api/organizer/ticket-designs
  await wait();
  const drafts = getMixedDesignDrafts();
  setLegacyDesignDraftsPreservingOrganizerRecords([payload, ...drafts.filter(isLegacyTicketDesignDraft).filter((draft) => draft.id !== payload.id)]);
  return payload;
}

export async function updateOrganizerTicketDesign(id: string, payload: Partial<TicketDesignDraft>) {
  // Future endpoint: PATCH /api/organizer/ticket-designs/:id
  await wait();
  const next = getMixedDesignDrafts()
    .filter(isLegacyTicketDesignDraft)
    .map((draft) => draft.id === id ? { ...draft, ...payload, updatedAt: new Date().toISOString() } : draft);
  setLegacyDesignDraftsPreservingOrganizerRecords(next);
  return next.find((draft) => draft.id === id);
}

export async function deleteOrganizerTicketDesign(id: string) {
  // Future endpoint: DELETE /api/organizer/ticket-designs/:id
  await wait();
  setLegacyDesignDraftsPreservingOrganizerRecords(getMixedDesignDrafts().filter(isLegacyTicketDesignDraft).filter((draft) => draft.id !== id));
  return { ok: true };
}

export async function submitTicketDesignForReview(id: string) {
  // Future endpoint: POST /api/organizer/ticket-designs/:id/submit
  const draft = await updateOrganizerTicketDesign(id, { status: "Pending Review" });
  return draft;
}

export async function approveTicketDesign(id: string, reviewerNote: string) {
  // Future endpoint: POST /api/admin/ticket-design-reviews/:id/approve
  await wait();
  const requests = ticketStorage.getThemeRequests([]);
  const next = requests.map((request) => request.id === id ? {
    ...request,
    status: "Approved" as const,
    reviewedAt: new Date().toISOString(),
    reviewerNote: reviewerNote || undefined,
    rejectionReason: undefined,
  } : request);
  ticketStorage.setThemeRequests(next);
  return next.find((request) => request.id === id);
}

export async function rejectTicketDesign(id: string, reason: string) {
  // Future endpoint: POST /api/admin/ticket-design-reviews/:id/reject
  await wait();
  const requests = ticketStorage.getThemeRequests([]);
  const next = requests.map((request) => request.id === id ? { ...request, status: "Rejected" as const, reviewedAt: new Date().toISOString(), rejectionReason: reason } : request);
  ticketStorage.setThemeRequests(next);
  return next.find((request) => request.id === id);
}

export async function generateBookingQr(eventId: string) {
  // Future endpoint: POST /api/events/:eventId/booking-qr
  await wait();
  return JSON.stringify({
    type: "event-booking",
    eventId,
    eventSlug: eventId.toLowerCase(),
    bookingUrl: `/booking/${eventId}`,
  });
}

export async function generateTicketQr(ticketId: string) {
  // Future endpoint: POST /api/tickets/:ticketId/qr
  await wait();
  const ticket = ticketStorage.getUserTickets().find((item) => item.bookingId === ticketId || item.ticketId === ticketId);
  if (!ticket) return "";
  return createTicketQrPayload({
    type: "buizz-booking-pass",
    bookingId: ticket.bookingId,
    eventId: ticket.event.id,
    eventSlug: ticket.event.slug,
    totalSeats: ticket.ticket.quantity,
    seatGroups: ticket.seatGroups?.map((group) => ({
      section: group.section,
      totalSeats: group.quantity,
      seatNumbers: group.seats,
      amount: group.amount,
    })),
    status: ticket.ticketStatus === "Used" ? "used" : ticket.ticketStatus === "Cancelled" ? "cancelled" : ticket.ticketStatus === "Refunded" ? "refunded" : "valid",
    gate: ticket.ticket.gate,
  });
}

export async function verifyTicketQr(payload: string) {
  // Future endpoint: POST /api/ticket-scans/verify
  // Backend must verify signed token, status, event, gate, timestamp, and scanner account.
  await wait();
  const parsed = parseTicketQrPayload(payload);
  if (!parsed) return { ok: false, status: "Entry Blocked", message: "Invalid QR payload" };
  const scans = ticketStorage.getScans();
  if (scans.some((scan) => scan.bookingId === parsed.bookingId)) {
    return { ok: false, status: "Already Scanned", message: "Duplicate scan blocked" };
  }
  ticketStorage.setScans([
    {
      bookingId: parsed.bookingId,
      ticketId: parsed.bookingId,
      eventId: parsed.eventId,
      gate: parsed.gate ?? "",
      selectedSeats: parsed.selectedSeats ? JSON.stringify(parsed.selectedSeats) : "",
      seatMapTemplateId: parsed.seatMapTemplateId ?? "",
      seatMapOverrideId: parsed.seatMapOverrideId ?? "",
      tierId: parsed.tierId ?? "",
      source: parsed.source ?? "",
      scannedAt: new Date().toISOString(),
      scannerAccount: "",
    },
    ...scans,
  ]);
  return { ok: true, status: "Used", message: "Entry Approved", data: parsed };
}

export async function getUserTickets(): Promise<BuizzTicketData[]> {
  // Future endpoint: GET /api/me/tickets
  await wait();
  return ticketStorage.getUserTickets();
}

export async function downloadTicket(ticketId: string) {
  // Future endpoint: GET /api/tickets/:ticketId/pdf
  await wait();
  return { ok: true, ticketId, message: "Backend PDF download placeholder" };
}

export type { TicketThemeRequest };

function isLegacyTicketDesignDraft(value: unknown): value is TicketDesignDraft {
  const draft = value as Partial<TicketDesignDraft> | null;
  return Boolean(draft?.id && draft?.name && draft?.settings && draft?.layout);
}

function getMixedDesignDrafts() {
  const value = safeReadStorage<unknown[]>(ticketStorageKeys.designDrafts, []);
  return Array.isArray(value) ? value : [];
}

function setLegacyDesignDraftsPreservingOrganizerRecords(legacyDrafts: TicketDesignDraft[]) {
  const organizerRecords = getMixedDesignDrafts().filter((draft) => !isLegacyTicketDesignDraft(draft as TicketDesignDraft));
  safeWriteStorage(ticketStorageKeys.designDrafts, [...legacyDrafts, ...organizerRecords]);
}
