// import { EVENT_SEAT_CONFIG_STORAGE_KEY } from "@/features/seat-map/constants";
// import {
//   createSeatMapAudit,
//   createSeatMapId,
// } from "@/features/seat-map/seatMapTemplateStore";
// import type {
//   EventSeatConfig,
//   EventSeatConfigStatus,
//   SeatMapTemplate,
//   SeatSalesChannelV2,
//   SeatStatus,
// } from "@/features/seat-map/types";

// export function readEventSeatConfigs(): EventSeatConfig[] {
//   return readArray<EventSeatConfig>(EVENT_SEAT_CONFIG_STORAGE_KEY);
// }

// export function writeEventSeatConfigs(configs: EventSeatConfig[]) {
//   writeValue(EVENT_SEAT_CONFIG_STORAGE_KEY, configs.map(normalizeConfig));
// }

// export function getEventSeatConfig(eventId: string, templateId?: string) {
//   return readEventSeatConfigs().find((config) =>
//     config.eventId === eventId && (!templateId || config.templateId === templateId),
//   );
// }

// export function getPublishedEventSeatConfig(eventId: string, templateId?: string) {
//   return readEventSeatConfigs().find((config) =>
//     config.eventId === eventId &&
//     (!templateId || config.templateId === templateId) &&
//     (config.status === "approved" || config.status === "published"),
//   );
// }

// export function createEventSeatConfig(
//   eventId: string,
//   organizerId: string,
//   template: SeatMapTemplate,
// ): EventSeatConfig {
//   const audit = createSeatMapAudit("organizer", organizerId, "event_config_created", "Organizer allocation draft created from approved master template.");
//   return {
//     id: createSeatMapId("event-seat-config"),
//     eventId,
//     organizerId,
//     templateId: template.id,
//     status: "draft",
//     seatStatuses: Object.fromEntries(template.seats.map((seat) => [seat.id, seat.status])),
//     tiers: template.tiers,
//     channelAllocations: Object.fromEntries(template.seats.map((seat) => [seat.id, seat.channel ?? "buizz_online"])),
//     blockedSeats: [],
//     reservedSeats: [],
//     complimentarySeats: [],
//     offlineSeats: [],
//     partnerSeats: [],
//     notes: {},
//     auditTrail: [audit],
//   };
// }

// export function saveEventSeatConfig(config: EventSeatConfig, status: EventSeatConfigStatus = config.status) {
//   const normalized = normalizeConfig({
//     ...config,
//     status,
//     submittedAt: status === "submitted" ? new Date().toISOString() : config.submittedAt,
//     auditTrail: [
//       createSeatMapAudit(
//         "organizer",
//         config.organizerId,
//         status === "submitted" ? "event_config_submitted" : "event_config_saved",
//         status === "submitted" ? "Seat allocation submitted for Admin/Super Admin review." : "Seat allocation draft saved locally.",
//       ),
//       ...config.auditTrail,
//     ].slice(0, 50),
//   });
//   const next = [normalized, ...readEventSeatConfigs().filter((item) => item.id !== normalized.id)];
//   writeEventSeatConfigs(next);
//   return normalized;
// }

// export function approveEventSeatConfig(config: EventSeatConfig, reviewedBy = "Admin") {
//   return saveReviewedConfig(config, "approved", reviewedBy);
// }

// export function publishEventSeatConfig(config: EventSeatConfig, reviewedBy = "Admin") {
//   return saveReviewedConfig(config, "published", reviewedBy);
// }

// export function validateEventSeatConfig(config: EventSeatConfig, template?: SeatMapTemplate) {
//   const saleableSeatIds = Object.entries(config.seatStatuses)
//     .filter(([, status]) => status === "available" || status === "offline" || status === "partner" || status === "complimentary")
//     .map(([seatId]) => seatId);
//   const issues: string[] = [];

//   if (!config.eventId) issues.push("Event ID is required.");
//   if (!config.templateId) issues.push("Template ID is required.");
//   if (!saleableSeatIds.length) issues.push("At least one saleable seat is required.");
//   if (template && saleableSeatIds.length > template.totalCapacity) issues.push("Configured capacity cannot exceed template capacity.");

//   saleableSeatIds.forEach((seatId) => {
//     const seat = template?.seats.find((item) => item.id === seatId);
//     const tier = config.tiers.find((item) => item.id === seat?.tierId);
//     if (!seat?.tierId) issues.push(`${seat?.row ?? "Seat"} ${seat?.number ?? seatId} needs a tier.`);
//     if (tier && tier.price <= 0) issues.push(`${tier.name} needs a valid price.`);
//     if (!config.channelAllocations[seatId]) issues.push(`${seat?.row ?? "Seat"} ${seat?.number ?? seatId} needs a sales channel.`);
//   });

//   return {
//     ok: issues.length === 0,
//     issues,
//     saleableSeatCount: saleableSeatIds.length,
//   };
// }

// export function resolveEventSeatStatus(config: EventSeatConfig | undefined, seatId: string, fallback: SeatStatus) {
//   return config?.seatStatuses[seatId] ?? fallback;
// }

// export function resolveEventSeatChannel(config: EventSeatConfig | undefined, seatId: string, fallback: SeatSalesChannelV2 = "buizz_online") {
//   return config?.channelAllocations[seatId] ?? fallback;
// }

// function saveReviewedConfig(config: EventSeatConfig, status: EventSeatConfigStatus, reviewedBy: string) {
//   return saveEventSeatConfig({
//     ...config,
//     status,
//     reviewedAt: new Date().toISOString(),
//     reviewedBy,
//   }, status);
// }

// function normalizeConfig(config: EventSeatConfig): EventSeatConfig {
//   return {
//     ...config,
//     seatStatuses: config.seatStatuses ?? {},
//     tiers: Array.isArray(config.tiers) ? config.tiers : [],
//     channelAllocations: config.channelAllocations ?? {},
//     blockedSeats: Array.isArray(config.blockedSeats) ? config.blockedSeats : [],
//     reservedSeats: Array.isArray(config.reservedSeats) ? config.reservedSeats : [],
//     complimentarySeats: Array.isArray(config.complimentarySeats) ? config.complimentarySeats : [],
//     offlineSeats: Array.isArray(config.offlineSeats) ? config.offlineSeats : [],
//     partnerSeats: Array.isArray(config.partnerSeats) ? config.partnerSeats : [],
//     notes: config.notes ?? {},
//     auditTrail: Array.isArray(config.auditTrail) ? config.auditTrail : [],
//   };
// }

// function readArray<T>(key: string): T[] {
//   if (typeof window === "undefined") return [];
//   try {
//     const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
//     return Array.isArray(parsed) ? (parsed as T[]) : [];
//   } catch {
//     return [];
//   }
// }

// function writeValue<T>(key: string, value: T) {
//   if (typeof window === "undefined") return;
//   window.localStorage.setItem(key, JSON.stringify(value));
// }import { EVENT_SEAT_CONFIG_STORAGE_KEY } from "@/features/seat-map/constants";
import {
  createSeatMapAudit,
  createSeatMapId,
  toBackendChannel,
} from "@/features/seat-map/seatMapTemplateStore";
import type {
  EventSeatConfig,
  EventSeatConfigStatus,
  SeatMapTemplate,
  SeatSalesChannelV2,
  SeatStatus,
} from "@/features/seat-map/types";
import { EVENT_SEAT_CONFIG_STORAGE_KEY } from "@/features/seat-map/constants";
export function readEventSeatConfigs(): EventSeatConfig[] {
  return readArray<EventSeatConfig>(EVENT_SEAT_CONFIG_STORAGE_KEY).map(normalizeConfig);
}

export function writeEventSeatConfigs(configs: EventSeatConfig[]) {
  writeValue(EVENT_SEAT_CONFIG_STORAGE_KEY, configs.map(normalizeConfig));
  // TODO: Replace localStorage save with POST/PATCH /api/organizer/events/:eventId/seat-map-config.
}

export function getEventSeatConfig(eventId: string, templateId?: string) {
  return readEventSeatConfigs().find((config) =>
    config.eventId === eventId && (!templateId || config.templateId === templateId),
  );
}

export function getPublishedEventSeatConfig(eventId: string, templateId?: string) {
  return readEventSeatConfigs().find((config) =>
    config.eventId === eventId &&
    (!templateId || config.templateId === templateId) &&
    (config.status === "approved" || config.status === "published"),
  );
}

export function createEventSeatConfig(
  eventId: string,
  organizerId: string,
  template: SeatMapTemplate,
): EventSeatConfig {
  const audit = createSeatMapAudit("organizer", organizerId, "event_config_created", "Organizer allocation draft created from approved master template.");
  return normalizeConfig({
    id: createSeatMapId("event-seat-config"),
    eventId,
    organizerId,
    templateId: template.id,
    status: "draft",
    seatStatuses: Object.fromEntries(template.seats.map((seat) => [seat.id, normalizeSeatStatus(seat.status)])),
    tiers: template.tiers,
    channelAllocations: Object.fromEntries(template.seats.map((seat) => [seat.id, toBackendChannel(String(seat.channel ?? seat.salesChannel ?? "buizz_online"))])),
    blockedSeats: [],
    reservedSeats: [],
    complimentarySeats: [],
    offlineSeats: [],
    partnerSeats: [],
    notes: {},
    auditTrail: [audit],
  });
}

export function getOrCreateEventSeatConfig(eventId: string, organizerId: string, template: SeatMapTemplate) {
  return getEventSeatConfig(eventId, template.id) ?? createEventSeatConfig(eventId, organizerId, template);
}

export function saveEventSeatConfig(config: EventSeatConfig, status: EventSeatConfigStatus = config.status) {
  const normalized = normalizeConfig({
    ...config,
    status,
    submittedAt: status === "submitted" ? new Date().toISOString() : config.submittedAt,
    auditTrail: [
      createSeatMapAudit(
        "organizer",
        config.organizerId,
        status === "submitted" ? "event_config_submitted" : "event_config_saved",
        status === "submitted" ? "Seat allocation submitted for Admin/Super Admin review." : "Seat allocation draft saved.",
      ),
      ...config.auditTrail,
    ].slice(0, 50),
  });
  const next = [normalized, ...readEventSeatConfigs().filter((item) => item.id !== normalized.id)];
  writeEventSeatConfigs(next);
  return normalized;
}

export function approveEventSeatConfig(config: EventSeatConfig, reviewedBy = "Admin") {
  return saveReviewedConfig(config, "approved", reviewedBy);
}

export function rejectEventSeatConfig(config: EventSeatConfig, reviewedBy = "Admin") {
  return saveReviewedConfig(config, "rejected", reviewedBy);
}

export function publishEventSeatConfig(config: EventSeatConfig, reviewedBy = "Admin") {
  return saveReviewedConfig(config, "published", reviewedBy);
}

export function validateEventSeatConfig(config: EventSeatConfig, template?: SeatMapTemplate) {
  const saleableSeatIds = Object.entries(config.seatStatuses)
    .filter(([seatId, status]) => {
      const channel = config.channelAllocations[seatId];
      return (
        status === "available" ||
        status === "offline" ||
        status === "partner" ||
        status === "complimentary" ||
        channel === "buizz_online" ||
        channel === "offline_counter" ||
        channel === "bookmyshow" ||
        channel === "external_partner" ||
        channel === "complimentary"
      );
    })
    .map(([seatId]) => seatId);
  const issues: string[] = [];

  if (!config.eventId) issues.push("Event ID is required.");
  if (!config.templateId) issues.push("Template ID is required.");
  if (!saleableSeatIds.length) issues.push("At least one saleable seat is required.");
  if (template && saleableSeatIds.length > template.totalCapacity) issues.push("Configured capacity cannot exceed template capacity.");

  saleableSeatIds.forEach((seatId) => {
    const seat = template?.seats.find((item) => item.id === seatId);
    const tier = config.tiers.find((item) => item.id === seat?.tierId);
    if (!seat?.tierId) issues.push(`${seat?.row ?? "Seat"} ${seat?.number ?? seatId} needs a tier.`);
    if (tier && tier.price <= 0) issues.push(`${tier.name} needs a valid price.`);
    if (!config.channelAllocations[seatId]) issues.push(`${seat?.row ?? "Seat"} ${seat?.number ?? seatId} needs a sales channel.`);
  });

  return {
    ok: issues.length === 0,
    issues,
    saleableSeatCount: saleableSeatIds.length,
  };
}

export function resolveEventSeatStatus(config: EventSeatConfig | undefined, seatId: string, fallback: SeatStatus) {
  return config?.seatStatuses[seatId] ?? fallback;
}

export function resolveEventSeatChannel(config: EventSeatConfig | undefined, seatId: string, fallback: SeatSalesChannelV2 = "buizz_online") {
  return config?.channelAllocations[seatId] ?? fallback;
}

function saveReviewedConfig(config: EventSeatConfig, status: EventSeatConfigStatus, reviewedBy: string) {
  return saveEventSeatConfig({
    ...config,
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    auditTrail: [
      createSeatMapAudit("admin", reviewedBy, `event_config_${status}`, `Event seat allocation ${status}.`),
      ...config.auditTrail,
    ].slice(0, 50),
  }, status);
}

function normalizeConfig(config: EventSeatConfig): EventSeatConfig {
  return {
    ...config,
    seatStatuses: config.seatStatuses ?? {},
    tiers: Array.isArray(config.tiers) ? config.tiers : [],
    channelAllocations: config.channelAllocations ?? {},
    blockedSeats: Array.isArray(config.blockedSeats) ? config.blockedSeats : [],
    reservedSeats: Array.isArray(config.reservedSeats) ? config.reservedSeats : [],
    complimentarySeats: Array.isArray(config.complimentarySeats) ? config.complimentarySeats : [],
    offlineSeats: Array.isArray(config.offlineSeats) ? config.offlineSeats : [],
    partnerSeats: Array.isArray(config.partnerSeats) ? config.partnerSeats : [],
    notes: config.notes ?? {},
    auditTrail: Array.isArray(config.auditTrail) ? config.auditTrail : [],
  };
}

function normalizeSeatStatus(status: unknown): SeatStatus {
  if (status === "booked") return "sold";
  if (status === "locked") return "blocked";
  if (status === "unavailable") return "disabled";
  return (status as SeatStatus) || "available";
}

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
