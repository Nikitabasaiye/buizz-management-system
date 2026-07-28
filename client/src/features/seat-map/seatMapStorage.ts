// import type {
//   OrganizerSeatMapOverride,
//   OrganizerBlueprintRequest,
//   PublicSeatAvailability,
//   SeatMapAuditEntry,
//   SeatMapSummary,
//   SeatMapTemplate,
//   SeatNode,
//   SeatNodeStatus,
//   SeatNodeType,
//   SeatTicketTier,
//   SelectedSeatData,
// } from "@/features/seat-map/seatMapTypes";

// export const BUIZZ_SEAT_MAP_TEMPLATES_KEY = "buizz-seat-map-templates-v1";
// export const BUIZZ_ORGANIZER_SEAT_OVERRIDES_KEY = "buizz-organizer-seat-overrides-v1";
// export const BUIZZ_PUBLIC_SEAT_LOCKS_KEY = "buizz-public-seat-locks-v1";
// export const BUIZZ_PUBLIC_SEAT_AVAILABILITY_KEY = "buizz-public-seat-availability-v1";
// export const BUIZZ_SEAT_MAP_AUDIT_KEY = "buizz-seat-map-audit-v1";
// export const BUIZZ_ORGANIZER_BLUEPRINT_REQUESTS_KEY = "buizz-organizer-blueprint-requests-v1";
// export const BUIZZ_ORGANIZER_CREATE_EVENT_SEAT_MAP_DRAFT_KEY = "buizz-organizer-create-event-seat-map-draft-v1";

// // Future backend:
// // GET /api/admin/seat-map-templates
// // POST /api/super-admin/seat-map-templates
// // PATCH /api/super-admin/seat-map-templates/:id
// // POST /api/organizer/events/:eventId/seat-map-overrides
// // GET /api/events/:eventId/seat-map
// // POST /api/booking/seat-locks
// // DELETE /api/booking/seat-locks/:lockId
// // Backend must validate ownership, role permissions, seat availability, and lock expiry.
// // Frontend seat status must never be trusted for final payment confirmation.
// // Backend must store audit logs, prevent double booking, scan uploaded images, serve CDN files,
// // and atomically re-check selected seats during payment confirmation.
// // Frontend localStorage is MVP only.
// // Backend must store seat map templates in database.
// // Backend must store images in CDN/object storage.
// // Backend must store coordinates as percentages.
// // Backend must enforce role permissions.
// // Backend must validate organizer ownership.
// // Backend must prevent double booking.
// // Backend must lock seats server-side.
// // Backend must expire locks automatically.
// // Payment confirmation must atomically verify selected seats before creating tickets.
// // Production availability should stream through WebSocket or Server-Sent Events with polling fallback.
// // Backend schema blueprint: venue_templates, venue_template_versions, seat_nodes, seat_sections,
// // event_seat_overrides, seat_locks, booking_selected_seats, seat_audit_logs.

// export function readSeatMapTemplates(): SeatMapTemplate[] {
//   if (typeof window === "undefined") return [createDefaultSeatMapTemplate()];
//   const records = readStorageArray<SeatMapTemplate>(BUIZZ_SEAT_MAP_TEMPLATES_KEY);
//   if (records.length) {
//     const normalized = records.map(normalizeTemplate);
//     if (!normalized.some((template) => template.status === "Active") && normalized.every((template) => template.status === "Archived")) {
//       const activeSeed = createDefaultSeatMapTemplate();
//       const next = [activeSeed, ...normalized];
//       writeSeatMapTemplates(next);
//       return next;
//     }
//     return normalized;
//   }
//   const seeded = [createDefaultSeatMapTemplate()];
//   writeSeatMapTemplates(seeded);
//   return seeded;
// }

// export function writeSeatMapTemplates(templates: SeatMapTemplate[]): void {
//   writeStorageValue(BUIZZ_SEAT_MAP_TEMPLATES_KEY, templates.map(normalizeTemplate));
// }

// export function readOrganizerSeatOverrides(): OrganizerSeatMapOverride[] {
//   return readStorageArray<OrganizerSeatMapOverride>(BUIZZ_ORGANIZER_SEAT_OVERRIDES_KEY);
// }

// export function writeOrganizerSeatOverrides(overrides: OrganizerSeatMapOverride[]): void {
//   writeStorageValue(BUIZZ_ORGANIZER_SEAT_OVERRIDES_KEY, overrides);
// }

// export function readOrganizerBlueprintRequests(): OrganizerBlueprintRequest[] {
//   return readStorageArray<OrganizerBlueprintRequest>(BUIZZ_ORGANIZER_BLUEPRINT_REQUESTS_KEY);
// }

// export function writeOrganizerBlueprintRequests(requests: OrganizerBlueprintRequest[]): void {
//   writeStorageValue(BUIZZ_ORGANIZER_BLUEPRINT_REQUESTS_KEY, requests);
// }

// export function saveOrganizerSeatMapDraft(draft: {
//   eventId?: string;
//   seatMapMode: "capacity_only" | "seat_map";
//   seatMapSource: "capacity_only" | "master_template" | "blueprint_request";
//   requiresSeatMap: boolean;
//   updatedAt: string;
// }): void {
//   writeStorageValue(BUIZZ_ORGANIZER_CREATE_EVENT_SEAT_MAP_DRAFT_KEY, draft);
// }

// export function readPublicSeatLocks(): PublicSeatAvailability[] {
//   const now = Date.now();
//   const locks = readStorageArray<PublicSeatAvailability>(BUIZZ_PUBLIC_SEAT_AVAILABILITY_KEY)
//     .concat(readStorageArray<PublicSeatAvailability>(BUIZZ_PUBLIC_SEAT_LOCKS_KEY))
//     .filter((lock) => {
//     if (!lock.lockedUntil) return true;
//     return new Date(lock.lockedUntil).getTime() > now;
//   });
//   writeStorageValue(BUIZZ_PUBLIC_SEAT_AVAILABILITY_KEY, locks);
//   return locks;
// }

// export function writePublicSeatLocks(locks: PublicSeatAvailability[]): void {
//   writeStorageValue(BUIZZ_PUBLIC_SEAT_AVAILABILITY_KEY, locks);
// }

// export function getSeatAvailabilityKey(eventId: string, venueId: string, scheduleId: string, seatId: string) {
//   return `${eventId}:${venueId}:${scheduleId}:${seatId}`;
// }

// export function readSeatMapAuditLog(): SeatMapAuditEntry[] {
//   return readStorageArray<SeatMapAuditEntry>(BUIZZ_SEAT_MAP_AUDIT_KEY);
// }

// export function appendSeatMapAudit(entry: Omit<SeatMapAuditEntry, "id" | "createdAt">): void {
//   const next: SeatMapAuditEntry = {
//     ...entry,
//     id: createSeatMapId("audit"),
//     createdAt: new Date().toISOString(),
//   };
//   writeStorageValue(BUIZZ_SEAT_MAP_AUDIT_KEY, [next, ...readSeatMapAuditLog()].slice(0, 100));
// }

// export function calculateSeatMapCapacity(nodes: SeatNode[]): number {
//   return nodes.reduce((sum, node) => {
//     if (node.type === "seat") return node.status === "disabled" ? sum : sum + 1;
//     if (node.type === "standing_zone") return sum + Math.max(0, Math.round(node.price ?? node.widthPercent ?? 0));
//     return sum;
//   }, 0);
// }

// export function getSeatMapSummary(
//   template?: SeatMapTemplate,
//   override?: OrganizerSeatMapOverride,
// ): SeatMapSummary {
//   if (!template) {
//     return { totalCapacity: 0, activeSeats: 0, blockedSeats: 0, reservedSeats: 0, tierCount: 0 };
//   }

//   const nodes = resolveOverrideNodes(template, override);
//   return {
//     totalCapacity: calculateSeatMapCapacity(nodes),
//     activeSeats: nodes.filter((node) => node.type === "seat" && node.status === "available").length,
//     blockedSeats: nodes.filter((node) => node.status === "blocked").length,
//     reservedSeats: nodes.filter((node) => node.status === "reserved").length,
//     soldSeats: nodes.filter((node) => node.status === "sold").length,
//     tierCount: (override?.tiers ?? template.tiers).length,
//   };
// }

// export function resolveOverrideNodes(
//   template: SeatMapTemplate,
//   override?: OrganizerSeatMapOverride,
// ): SeatNode[] {
//   if (!override) return template.nodes;
//   return template.nodes.map((node) => ({
//     ...node,
//     ...override.nodeOverrides[node.id],
//   }));
// }

// export function getSeatTier(template: SeatMapTemplate, tierId?: string) {
//   return template.tiers.find((tier) => tier.id === tierId) ?? template.tiers[0];
// }

// export function seatNodeToSelectedSeat(
//   node: SeatNode,
//   template: SeatMapTemplate,
//   override?: OrganizerSeatMapOverride,
// ): SelectedSeatData {
//   const tier = (override?.tiers ?? template.tiers).find((item) => item.id === node.tierId) ?? template.tiers[0];
//   return {
//     seatId: node.id,
//     label: node.label,
//     section: node.section,
//     row: node.row,
//     seatNumber: node.seatNumber,
//     gate: node.gate,
//     tierId: tier?.id,
//     tierName: tier?.name,
//     price: Number(node.price ?? tier?.price ?? 0),
//   };
// }

// export function createDefaultSeatMapTemplate(): SeatMapTemplate {
//   const now = new Date().toISOString();
//   const tiers: SeatTicketTier[] = [
//     { id: "tier-vip", name: "VIP", price: 2499, color: "#6626B9", description: "Front premium section" },
//     { id: "tier-gold", name: "Gold", price: 1499, color: "#EC1B72", description: "Central view section" },
//     { id: "tier-silver", name: "Silver", price: 799, color: "#2563EB", description: "Standard seated access" },
//   ];

//   const nodes: SeatNode[] = [
//     { id: "stage-main", type: "stage", label: "Stage", section: "Stage", xPercent: 38, yPercent: 8, widthPercent: 24, heightPercent: 8, status: "disabled" },
//     { id: "gate-a", type: "entry_gate", label: "Gate A", section: "Entry", xPercent: 8, yPercent: 86, widthPercent: 8, heightPercent: 6, status: "available", gate: "Gate A" },
//     { id: "gate-b", type: "entry_gate", label: "Gate B", section: "Entry", xPercent: 84, yPercent: 86, widthPercent: 8, heightPercent: 6, status: "available", gate: "Gate B" },
//     ...buildSeatRow("VIP", "A", 1, 10, 24, 26, 5, "tier-vip", "Gate A", 2499),
//     ...buildSeatRow("VIP", "B", 1, 10, 24, 34, 5, "tier-vip", "Gate A", 2499),
//     ...buildSeatRow("Gold", "C", 1, 14, 17, 48, 4.8, "tier-gold", "Gate B", 1499),
//     ...buildSeatRow("Gold", "D", 1, 14, 17, 56, 4.8, "tier-gold", "Gate B", 1499),
//     ...buildSeatRow("Silver", "E", 1, 16, 12, 70, 4.6, "tier-silver", "Gate B", 799),
//     ...buildSeatRow("Silver", "F", 1, 16, 12, 78, 4.6, "tier-silver", "Gate B", 799),
//   ];

//   return normalizeTemplate({
//     id: "template-buizz-grand-auditorium",
//     venueName: "Buizz Grand Auditorium",
//     city: "Pune",
//     categoryTags: ["concert", "play", "premium"],
//     backgroundImageUrl: "/images/events/arijit-singh.jpg",
//     backgroundImageName: "Default venue blueprint",
//     backgroundImageSize: 0,
//     canvasAspectRatio: "16:9",
//     nodes,
//     blocks: [
//       { id: "block-vip", name: "VIP", type: "vip", color: tiers[0].color, capacity: 20, tierId: "tier-vip", nodeIds: nodes.filter((node) => node.section === "VIP").map((node) => node.id) },
//       { id: "block-gold", name: "Gold", type: "seated", color: tiers[1].color, capacity: 28, tierId: "tier-gold", nodeIds: nodes.filter((node) => node.section === "Gold").map((node) => node.id) },
//       { id: "block-silver", name: "Silver", type: "seated", color: tiers[2].color, capacity: 32, tierId: "tier-silver", nodeIds: nodes.filter((node) => node.section === "Silver").map((node) => node.id) },
//     ],
//     tiers,
//     totalCapacity: 0,
//     status: "Active",
//     createdByRole: "super_admin",
//     createdByName: "Super Admin",
//     allowAdminOverride: true,
//     allowOrganizerStructureEdit: false,
//     version: 1,
//     publishedVersion: 1,
//     lastSavedAt: now,
//     lastPublishedAt: now,
//     backgroundOpacity: 0.55,
//     backgroundLocked: true,
//     backgroundVisible: true,
//     backgroundScale: 1,
//     backgroundOffsetX: 0,
//     backgroundOffsetY: 0,
//     sections: [
//       { id: "section-vip", name: "VIP", label: "VIP", type: "vip", color: tiers[0].color, defaultTierId: "tier-vip", gate: "Gate A", capacity: 20, seatIds: nodes.filter((node) => node.section === "VIP").map((node) => node.id) },
//       { id: "section-gold", name: "Gold", label: "Gold", type: "seated", color: tiers[1].color, defaultTierId: "tier-gold", gate: "Gate B", capacity: 28, seatIds: nodes.filter((node) => node.section === "Gold").map((node) => node.id) },
//       { id: "section-silver", name: "Silver", label: "Silver", type: "balcony", color: tiers[2].color, defaultTierId: "tier-silver", gate: "Gate B", capacity: 32, seatIds: nodes.filter((node) => node.section === "Silver").map((node) => node.id) },
//     ],
//     showGrid: true,
//     snapToGrid: true,
//     gridSizePercent: 2,
//     createdAt: now,
//     updatedAt: now,
//   });
// }

// export function createSeatMapId(prefix: string) {
//   return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
// }

// export function isSeatNodeStatus(value: unknown): value is SeatNodeStatus {
//   return (
//     value === "draft" ||
//     value === "available" ||
//     value === "sold" ||
//     value === "locked" ||
//     value === "selected" ||
//     value === "blocked" ||
//     value === "reserved" ||
//     value === "checked_in" ||
//     value === "cancelled" ||
//     value === "refunded" ||
//     value === "disabled"
//   );
// }

// function buildSeatRow(
//   section: string,
//   row: string,
//   start: number,
//   end: number,
//   xStart: number,
//   yPercent: number,
//   spacing: number,
//   tierId: string,
//   gate: string,
//   price: number,
// ): SeatNode[] {
//   return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => {
//     const seatNumber = String(start + index);
//     return {
//       id: `seat-${section.toLowerCase()}-${row.toLowerCase()}-${seatNumber}`,
//       type: "seat",
//       label: `${row}-${seatNumber}`,
//       section,
//       row,
//       seatNumber,
//       xPercent: xStart + index * spacing,
//       yPercent,
//       status: "available",
//       salesChannel: "buizz_online",
//       tierId,
//       price,
//       gate,
//     };
//   });
// }

// function normalizeTemplate(template: SeatMapTemplate): SeatMapTemplate {
//   const nodes = (Array.isArray(template.nodes) ? template.nodes : [])
//     .map(normalizeSeatNode)
//     .filter((node): node is SeatNode => Boolean(node));
//   const tiers = Array.isArray(template.tiers) && template.tiers.length ? template.tiers : [
//     { id: "tier-general", name: "General", price: 0, color: "#6626B9" },
//   ];
//   const now = new Date().toISOString();
//   return {
//     ...template,
//     nodes,
//     blocks: Array.isArray(template.blocks) ? template.blocks : [],
//     sections: (Array.isArray(template.sections) ? template.sections : buildSectionsFromNodes(nodes, tiers)).map((section, index) => {
//       const sectionNodes = nodes.filter((node) => section.seatIds.includes(node.id) || node.section === section.name);
//       const tier = tiers.find((item) => item.id === section.defaultTierId) ?? tiers.find((item) => sectionNodes.some((node) => node.tierId === item.id));
//       return {
//         ...section,
//         label: section.label || section.name,
//         color: section.color || tier?.color || "#6626B9",
//         defaultTierId: section.defaultTierId ?? tier?.id,
//         defaultPrice: section.defaultPrice ?? tier?.price,
//         gate: section.gate ?? sectionNodes.find((node) => node.gate)?.gate,
//         capacity: sectionNodes.length || section.capacity || section.seatIds.length,
//         seatIds: sectionNodes.length ? sectionNodes.map((node) => node.id) : section.seatIds,
//         rows: section.rows ?? Array.from(new Set(sectionNodes.map((node) => node.row).filter(Boolean))) as string[],
//         rowStart: section.rowStart ?? sectionNodes.find((node) => node.row)?.row,
//         rowEnd: section.rowEnd ?? [...sectionNodes].reverse().find((node) => node.row)?.row,
//         displayOrder: section.displayOrder ?? index + 1,
//         status: section.status ?? (section.hidden ? "hidden" : section.locked ? "locked" : "active"),
//         visibleOnPublic: section.visibleOnPublic ?? !section.hidden,
//       };
//     }),
//     tiers,
//     categoryTags: Array.isArray(template.categoryTags) ? template.categoryTags : [],
//     backgroundOpacity: typeof template.backgroundOpacity === "number" ? template.backgroundOpacity : 0.55,
//     backgroundLocked: template.backgroundLocked ?? true,
//     backgroundVisible: template.backgroundVisible ?? true,
//     backgroundScale: typeof template.backgroundScale === "number" ? template.backgroundScale : 1,
//     backgroundOffsetX: typeof template.backgroundOffsetX === "number" ? template.backgroundOffsetX : 0,
//     backgroundOffsetY: typeof template.backgroundOffsetY === "number" ? template.backgroundOffsetY : 0,
//     publishedVersion: template.publishedVersion ?? (template.status === "Active" ? template.version : 0),
//     lastSavedAt: template.lastSavedAt ?? template.updatedAt ?? now,
//     showGrid: template.showGrid ?? true,
//     snapToGrid: template.snapToGrid ?? false,
//     gridSizePercent: template.gridSizePercent ?? 2,
//     totalCapacity: calculateSeatMapCapacity(nodes),
//   };
// }

// function normalizeSeatNode(node: SeatNode): SeatNode | null {
//   const type = normalizeSeatNodeType(node.type);
//   if (!type) return null;

//   return {
//     ...node,
//     type,
//     salesChannel: node.type === "seat" || node.type === "standing_zone"
//       ? node.salesChannel ?? "buizz_online"
//       : node.salesChannel,
//   };
// }

// function normalizeSeatNodeType(type: SeatNodeType | string): SeatNodeType | null {
//   if (
//     type === "seat" ||
//     type === "standing_zone" ||
//     type === "stage" ||
//     type === "entry_gate" ||
//     type === "exit_gate" ||
//     type === "section_label" ||
//     type === "row_label" ||
//     type === "custom_label"
//   ) {
//     return type;
//   }

//   if (type === "gate") return "entry_gate";
//   if (type === "screen") return "stage";
//   if (type === "text_label") return "custom_label";

//   return null;
// }

// function buildSectionsFromNodes(nodes: SeatNode[], tiers: SeatTicketTier[] = []) {
//   const groups = new Map<string, SeatNode[]>();
//   nodes.filter((node) => node.type === "seat" || node.type === "standing_zone").forEach((node) => {
//     groups.set(node.section, [...(groups.get(node.section) ?? []), node]);
//   });

//   return Array.from(groups.entries()).map(([name, sectionNodes], index) => {
//     const tier = tiers.find((item) => sectionNodes.some((node) => node.tierId === item.id)) ?? tiers[index % Math.max(1, tiers.length)];
//     return {
//       id: `section-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || index}`,
//       name,
//       label: name,
//       type: "seated" as const,
//       color: tier?.color ?? "#6626B9",
//       defaultTierId: tier?.id,
//       defaultPrice: tier?.price,
//       gate: sectionNodes.find((node) => node.gate)?.gate,
//       capacity: sectionNodes.length,
//       seatIds: sectionNodes.map((node) => node.id),
//       rows: Array.from(new Set(sectionNodes.map((node) => node.row).filter(Boolean))) as string[],
//       rowStart: sectionNodes.find((node) => node.row)?.row,
//       rowEnd: [...sectionNodes].reverse().find((node) => node.row)?.row,
//       displayOrder: index + 1,
//       status: "active" as const,
//       visibleOnPublic: true,
//     };
//   });
// }

// function readStorageArray<T>(key: string): T[] {
//   if (typeof window === "undefined") return [];
//   try {
//     const raw = window.localStorage.getItem(key);
//     if (!raw) return [];
//     const parsed: unknown = JSON.parse(raw);
//     return Array.isArray(parsed) ? (parsed as T[]) : [];
//   } catch {
//     return [];
//   }
// }

// function writeStorageValue<T>(key: string, value: T): void {
//   if (typeof window === "undefined") return;
//   window.localStorage.setItem(key, JSON.stringify(value));
// }
// Legacy import adapter for old pages.
// The final system lives in seatMapTemplateStore.ts, eventSeatConfigStore.ts and publicSeatMapService.ts.

// Legacy import adapter for old pages.
// The final system lives in seatMapTemplateStore.ts, eventSeatConfigStore.ts and publicSeatMapService.ts.

import {
  ORGANIZER_BLUEPRINT_REQUEST_STORAGE_KEY,
  ORGANIZER_SEAT_OVERRIDE_STORAGE_KEY,
  SEAT_HOLD_STORAGE_KEY,
} from "@/features/seat-map/constants";
import {
  createSeatMapAudit,
  createSeatMapId,
  getDefaultSeatMapTemplateForVenue,
  getSeatMapTemplateById,
  getSeatMapTemplatesForVenue,
  normalizeTemplate,
  readPublishedSeatMapTemplates,
  readSeatMapAudit,
  readSeatMapTemplates,
  saveSeatMapTemplate,
  writeSeatMapTemplates,
} from "@/features/seat-map/seatMapTemplateStore";
import type {
  OrganizerBlueprintRequest,
  OrganizerSeatMapOverride,
  PublicSeatAvailability,
  SeatMapApprovalStatus,
  SeatMapTemplate,
  SeatNode,
  SelectedSeatData,
} from "@/features/seat-map/types";

export {
  createSeatMapAudit,
  createSeatMapId,
  getDefaultSeatMapTemplateForVenue,
  getSeatMapTemplateById,
  getSeatMapTemplatesForVenue,
  normalizeTemplate,
  readPublishedSeatMapTemplates,
  readSeatMapAudit,
  readSeatMapTemplates,
  saveSeatMapTemplate,
  writeSeatMapTemplates,
};

export function readOrganizerSeatOverrides(): OrganizerSeatMapOverride[] {
  const templates = readSeatMapTemplates();
  return readArray<unknown>(ORGANIZER_SEAT_OVERRIDE_STORAGE_KEY)
    .map((record) => normalizeOrganizerSeatOverride(record, templates))
    .filter((record): record is OrganizerSeatMapOverride => Boolean(record));
}

export function writeOrganizerSeatOverrides(overrides: OrganizerSeatMapOverride[]) {
  writeValue(ORGANIZER_SEAT_OVERRIDE_STORAGE_KEY, overrides);
}

export function updateOrganizerSeatOverrideApprovalStatus(
  overrideId: string | undefined,
  approvalStatus: SeatMapApprovalStatus,
  approvedBy?: string,
) {
  if (!overrideId) return;
  const overrides = readOrganizerSeatOverrides();
  const now = new Date().toISOString();
  const next = overrides.map((override) =>
    override.id === overrideId
      ? {
        ...override,
        approvalStatus,
        submittedAt:
          approvalStatus === "Pending Review"
            ? override.submittedAt ?? now
            : override.submittedAt,
        approvedAt: approvalStatus === "Approved" ? now : undefined,
        approvedBy: approvalStatus === "Approved" ? approvedBy : undefined,
        updatedAt: now,
      }
      : override,
  );
  writeOrganizerSeatOverrides(next);
}

export function resolveOverrideNodes(template: SeatMapTemplate, override?: OrganizerSeatMapOverride): SeatNode[] {
  if (!override) return template.seats;
  return template.seats.map((seat) => {
    const patch = override.nodeOverrides?.[seat.id];
    return patch
      ? {
        ...seat,
        status: patch.status ?? seat.status,
        tierId: patch.tierId ?? seat.tierId,
        price: patch.price ?? seat.price,
        notes: patch.notes ?? seat.notes,
        gate: patch.gate ?? seat.gate,
        salesChannel: patch.salesChannel ?? seat.salesChannel,
        channel: patch.salesChannel ?? seat.channel,
      }
      : seat;
  });
}

export function readOrganizerBlueprintRequests(): OrganizerBlueprintRequest[] {
  return readArray<OrganizerBlueprintRequest>(ORGANIZER_BLUEPRINT_REQUEST_STORAGE_KEY);
}

export function writeOrganizerBlueprintRequests(requests: OrganizerBlueprintRequest[]) {
  writeValue(ORGANIZER_BLUEPRINT_REQUEST_STORAGE_KEY, requests);
}

export function readPublicSeatLocks(): PublicSeatAvailability[] {
  const now = Date.now();

  const records = readArray<Partial<PublicSeatAvailability>>(SEAT_HOLD_STORAGE_KEY)
    .map(normalizePublicSeatAvailability)
    .filter((record): record is PublicSeatAvailability => Boolean(record))
    .filter((record) => {
      if (!record.lockedUntil) return true;
      return new Date(record.lockedUntil).getTime() > now;
    });

  writeValue(SEAT_HOLD_STORAGE_KEY, records);
  return records;
}

export function writePublicSeatLocks(locks: PublicSeatAvailability[]): void {
  writeValue(SEAT_HOLD_STORAGE_KEY, locks);
}

export function getSeatAvailabilityKey(
  eventId: string,
  venueId: string,
  scheduleId: string,
  seatId: string,
) {
  return `${eventId}:${venueId}:${scheduleId}:${seatId}`;
}

export function seatNodeToSelectedSeat(
  node: SeatNode,
  template?: SeatMapTemplate,
  override?: OrganizerSeatMapOverride,
): SelectedSeatData {
  const tier =
    (override?.tiers ?? template?.tiers ?? []).find((item) => item.id === node.tierId);

  return {
    seatId: node.id,
    label: node.label ?? node.seatNumber ?? node.number ?? node.id,
    section: node.section ?? node.sectionName ?? "General",
    row: node.row ?? node.rowName ?? "",
    seatNumber: node.seatNumber ?? node.number ?? "",
    gate: node.gate ?? "",
    tierId: tier?.id ?? node.tierId,
    tierName: tier?.name ?? "General",
    price: Number(node.price ?? tier?.price ?? 0),
  };
}

function normalizePublicSeatAvailability(record: Partial<PublicSeatAvailability>): PublicSeatAvailability | null {
  if (!record || typeof record.seatId !== "string" || !isPublicAvailabilityStatus(record.status)) {
    return null;
  }

  return {
    eventId: typeof record.eventId === "string" ? record.eventId : undefined,
    venueId: typeof record.venueId === "string" ? record.venueId : undefined,
    scheduleId: typeof record.scheduleId === "string" ? record.scheduleId : undefined,
    seatId: record.seatId,
    status: record.status,
    lockedUntil: typeof record.lockedUntil === "string" ? record.lockedUntil : undefined,
    lockedBySessionId: typeof record.lockedBySessionId === "string" ? record.lockedBySessionId : undefined,
    bookingId: typeof record.bookingId === "string" ? record.bookingId : undefined,
  };
}

function isPublicAvailabilityStatus(value: unknown): value is PublicSeatAvailability["status"] {
  return (
    value === "available" ||
    value === "sold" ||
    value === "locked" ||
    value === "selected" ||
    value === "blocked" ||
    value === "reserved"
  );
}

function normalizeOrganizerSeatOverride(
  value: unknown,
  templates: SeatMapTemplate[],
): OrganizerSeatMapOverride | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const id = String(candidate.id ?? "");
  const eventId = String(candidate.eventId ?? "");
  const templateId = String(candidate.templateId ?? "");
  if (!id || !eventId || !templateId) return null;

  const template = templates.find((item) => item.id === templateId);
  const statusOverrides = isRecord(candidate.statusOverrides) ? candidate.statusOverrides : {};
  const channelOverrides = isRecord(candidate.channelOverrides) ? candidate.channelOverrides : {};
  const tierOverrides = isRecord(candidate.tierOverrides) ? candidate.tierOverrides : {};
  const existingNodeOverrides = isRecord(candidate.nodeOverrides) ? candidate.nodeOverrides : {};
  const nodeOverrides: OrganizerSeatMapOverride["nodeOverrides"] = {};

  for (const seat of template?.seats ?? []) {
    const existingPatch = isRecord(existingNodeOverrides[seat.id])
      ? existingNodeOverrides[seat.id] as Record<string, unknown>
      : {};
    const status = String(statusOverrides[seat.id] ?? existingPatch.status ?? seat.status);
    const channel = String(
      channelOverrides[seat.id] ??
      existingPatch.salesChannel ??
      seat.salesChannel ??
      seat.channel ??
      "buizz_online",
    );
    nodeOverrides[seat.id] = {
      status: status as NonNullable<OrganizerSeatMapOverride["nodeOverrides"][string]["status"]>,
      tierId: String(tierOverrides[seat.id] ?? existingPatch.tierId ?? seat.tierId ?? "") || undefined,
      price: existingPatch.price === undefined ? seat.price : Number(existingPatch.price),
      notes: existingPatch.notes ? String(existingPatch.notes) : seat.notes,
      gate: existingPatch.gate ? String(existingPatch.gate) : seat.gate,
      salesChannel: normalizeOverrideSalesChannel(channel),
    };
  }

  const resolvedSeats = template
    ? resolveOverrideNodes(template, {
      ...(candidate as unknown as OrganizerSeatMapOverride),
      nodeOverrides,
    })
    : [];
  const tiers = Array.isArray(candidate.tiers) && candidate.tiers.length
    ? candidate.tiers as OrganizerSeatMapOverride["tiers"]
    : (template?.tiers ?? []).map((tier) => ({
      id: tier.id,
      name: tier.name,
      price: Number(tier.price ?? 0),
      color: tier.color,
      description: tier.description,
      active: tier.active ?? true,
    }));

  return {
    id,
    eventId,
    templateId,
    organizerId: String(candidate.organizerId ?? "organizer"),
    customBackgroundImageUrl: candidate.customBackgroundImageUrl
      ? String(candidate.customBackgroundImageUrl)
      : undefined,
    nodeOverrides,
    approvalStatus: normalizeSeatMapApprovalStatus(candidate.approvalStatus),
    approvalNotes: candidate.approvalNotes ? String(candidate.approvalNotes) : undefined,
    submittedAt: candidate.submittedAt ? String(candidate.submittedAt) : undefined,
    approvedAt: candidate.approvedAt ? String(candidate.approvedAt) : undefined,
    approvedBy: candidate.approvedBy ? String(candidate.approvedBy) : undefined,
    tiers,
    sectionOverrides: Array.isArray(candidate.sectionOverrides)
      ? candidate.sectionOverrides as OrganizerSeatMapOverride["sectionOverrides"]
      : undefined,
    totalActiveSeats: Number(
      candidate.totalActiveSeats ??
      resolvedSeats.filter((seat) => seat.status === "available").length,
    ),
    totalBlockedSeats: Number(
      candidate.totalBlockedSeats ??
      resolvedSeats.filter((seat) => seat.status === "blocked" || seat.status === "disabled").length,
    ),
    totalReservedSeats: Number(
      candidate.totalReservedSeats ??
      resolvedSeats.filter((seat) => seat.status === "reserved").length,
    ),
    updatedAt: String(candidate.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeSeatMapApprovalStatus(value: unknown): SeatMapApprovalStatus {
  if (
    value === "Draft" ||
    value === "Pending Review" ||
    value === "Approved" ||
    value === "Rejected"
  ) {
    return value;
  }
  return "Draft";
}

function normalizeOverrideSalesChannel(
  value: string,
): NonNullable<OrganizerSeatMapOverride["nodeOverrides"][string]["salesChannel"]> {
  if (value === "offline" || value === "offline_counter") return "offline_counter";
  if (value === "reserved") return "reserved";
  if (value === "complimentary") return "complimentary";
  if (value === "bookmyshow") return "bookmyshow";
  if (value === "external_partner" || value === "partner") return "external_partner";
  if (value === "none") return "none";
  return "buizz_online";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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
