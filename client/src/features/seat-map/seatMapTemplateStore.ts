// import {
//   SEAT_MAP_AUDIT_STORAGE_KEY,
//   SEAT_MAP_TEMPLATE_STORAGE_KEY,
// } from "@/features/seat-map/constants";
// import type {
//   SeatMapAuditItem,
//   SeatMapTemplate,
//   SeatNode,
//   SeatTier,
//   VenueMasterType,
// } from "@/features/seat-map/types";

// const nowIso = () => new Date().toISOString();

// export function readSeatMapTemplates(): SeatMapTemplate[] {
//   const records = readArray<SeatMapTemplate>(SEAT_MAP_TEMPLATE_STORAGE_KEY);
//   if (records.length) return normalizeTemplates(records);

//   const seeded = [createDefaultSeatMapTemplate()];
//   writeSeatMapTemplates(seeded);
//   return seeded;
// }

// export function writeSeatMapTemplates(templates: SeatMapTemplate[]) {
//   writeValue(SEAT_MAP_TEMPLATE_STORAGE_KEY, normalizeTemplates(templates));
// }

// export function saveSeatMapTemplate(template: SeatMapTemplate, actorName = "Admin") {
//   const normalized = normalizeTemplate({
//     ...template,
//     updatedAt: nowIso(),
//     auditTrail: [
//       createSeatMapAudit("admin", actorName, "template_saved", "Master venue template saved locally."),
//       ...template.auditTrail,
//     ].slice(0, 50),
//   });
//   const next = [normalized, ...readSeatMapTemplates().filter((item) => item.id !== normalized.id)];
//   writeSeatMapTemplates(next);
//   appendSeatMapAudit(normalized.auditTrail[0]);
//   return normalized;
// }

// export function publishSeatMapTemplate(template: SeatMapTemplate, actorName = "Admin") {
//   return saveSeatMapTemplate({
//     ...template,
//     status: "active",
//     publishedAt: nowIso(),
//     allowOrganizerStructureEdits: false,
//   }, actorName);
// }

// export function duplicateSeatMapTemplate(template: SeatMapTemplate) {
//   const now = nowIso();
//   return normalizeTemplate({
//     ...template,
//     id: createSeatMapId("template"),
//     venueId: createSeatMapId("venue"),
//     venueName: `${template.venueName} Copy`,
//     status: "draft",
//     createdAt: now,
//     updatedAt: now,
//     publishedAt: undefined,
//     auditTrail: [createSeatMapAudit("admin", "Admin", "template_duplicated", "Template duplicated as draft.")],
//   });
// }

// export function appendSeatMapAudit(entry: SeatMapAuditItem) {
//   writeValue(SEAT_MAP_AUDIT_STORAGE_KEY, [entry, ...readSeatMapAudit()].slice(0, 150));
// }

// export function readSeatMapAudit(): SeatMapAuditItem[] {
//   return readArray<SeatMapAuditItem>(SEAT_MAP_AUDIT_STORAGE_KEY);
// }

// export function createDefaultSeatMapTemplate(): SeatMapTemplate {
//   const now = nowIso();
//   const tiers: SeatTier[] = [
//     { id: "tier-vip", name: "VIP", color: "#8B1CF6", price: 2499, active: true },
//     { id: "tier-gold", name: "Gold", color: "#F59E0B", price: 1499, active: true },
//     { id: "tier-silver", name: "Silver", color: "#2563EB", price: 799, active: true },
//   ];
//   const seats = [
//     ...buildSeatRows("VIP", "A", "B", 14, 20, 28, 4.25, 5.5, "tier-vip", "Gate A"),
//     ...buildSeatRows("Gold", "F", "I", 16, 17, 52, 4, 5.5, "tier-gold", "Gate B"),
//     ...buildSeatRows("Silver", "J", "L", 16, 17, 75, 4, 5.5, "tier-silver", "Gate B"),
//   ];

//   return normalizeTemplate({
//     id: "template-buizz-grand-arena",
//     venueId: "venue-buizz-grand-arena",
//     venueName: "Buizz Grand Arena",
//     city: "Pune",
//     venueType: "concert",
//     status: "active",
//     totalCapacity: seats.length,
//     sections: [
//       { id: "section-vip", name: "VIP", capacity: 28, gate: "Gate A", tierId: "tier-vip", locked: true },
//       { id: "section-gold", name: "Gold", capacity: 64, gate: "Gate B", tierId: "tier-gold", locked: true },
//       { id: "section-silver", name: "Silver", capacity: 48, gate: "Gate B", tierId: "tier-silver", locked: true },
//     ],
//     rows: rowsFromSeats(seats),
//     seats,
//     gates: [
//       { id: "gate-a", label: "GATE A", type: "entry", x: 8, y: 36 },
//       { id: "gate-b", label: "GATE B", type: "entry", x: 92, y: 36 },
//       { id: "exit-west", label: "EXIT", type: "exit", x: 8, y: 92 },
//     ],
//     stage: { id: "stage-main", label: "STAGE", x: 50, y: 12, width: 24, height: 7 },
//     blueprint: { url: "", name: "", opacity: 0.4, scale: 1, visible: false },
//     tiers,
//     allowOrganizerStructureEdits: false,
//     createdBy: "Super Admin",
//     createdAt: now,
//     updatedAt: now,
//     publishedAt: now,
//     auditTrail: [createSeatMapAudit("admin", "Super Admin", "template_seeded", "Default venue master template created.")],
//   });
// }

// export function createSeatMapId(prefix: string) {
//   return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
// }

// export function createSeatMapAudit(
//   actorRole: SeatMapAuditItem["actorRole"],
//   actorName: string,
//   action: string,
//   message: string,
// ): SeatMapAuditItem {
//   return {
//     id: createSeatMapId("audit"),
//     actorId: actorName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "system",
//     actorName,
//     actorRole,
//     action,
//     message,
//     createdAt: nowIso(),
//   };
// }

// function normalizeTemplates(templates: SeatMapTemplate[]) {
//   return templates.map(normalizeTemplate);
// }

// function normalizeTemplate(template: SeatMapTemplate): SeatMapTemplate {
//   const seats = Array.isArray(template.seats) ? template.seats : [];
//   const tiers = Array.isArray(template.tiers) && template.tiers.length
//     ? template.tiers
//     : [{ id: "tier-general", name: "General", color: "#22C55E", price: 799, active: true }];

//   return {
//     ...template,
//     venueType: (template.venueType || "custom") as VenueMasterType,
//     status: template.status ?? "draft",
//     seats,
//     tiers,
//     sections: Array.isArray(template.sections) ? template.sections : [],
//     rows: Array.isArray(template.rows) && template.rows.length ? template.rows : rowsFromSeats(seats),
//     gates: Array.isArray(template.gates) ? template.gates : [],
//     blueprint: normalizeBlueprint(template.blueprint),
//     totalCapacity: seats.length,
//     auditTrail: Array.isArray(template.auditTrail) ? template.auditTrail : [],
//   };
// }

// function buildSeatRows(
//   section: string,
//   startRow: string,
//   endRow: string,
//   seatsPerRow: number,
//   startX: number,
//   startY: number,
//   seatSpacing: number,
//   rowSpacing: number,
//   tierId: string,
//   gate: string,
// ): SeatNode[] {
//   const start = startRow.charCodeAt(0);
//   const end = endRow.charCodeAt(0);
//   const rows = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => String.fromCharCode(start + index));

//   return rows.flatMap((row, rowIndex) =>
//     Array.from({ length: seatsPerRow }, (_, seatIndex) => {
//       const number = String(seatIndex + 1);
//       return {
//         id: `seat-${section.toLowerCase()}-${row.toLowerCase()}-${number}`,
//         section,
//         row,
//         number,
//         x: startX + seatIndex * seatSpacing,
//         y: startY + rowIndex * rowSpacing,
//         status: "available" as const,
//         tierId,
//         gate,
//         channel: "buizz_online" as const,
//         locked: true,
//       };
//     }),
//   );
// }

// function normalizeBlueprint(blueprint: SeatMapTemplate["blueprint"]) {
//   return {
//     url: blueprint?.url ?? "",
//     name: blueprint?.name ?? "",
//     opacity: typeof blueprint?.opacity === "number" ? blueprint.opacity : 0.4,
//     scale: typeof blueprint?.scale === "number" ? blueprint.scale : 1,
//     visible: blueprint?.visible ?? false,
//   };
// }

// function rowsFromSeats(seats: SeatNode[]) {
//   const grouped = new Map<string, SeatNode[]>();
//   seats.forEach((seat) => {
//     const key = `${seat.section}:${seat.row}`;
//     grouped.set(key, [...(grouped.get(key) ?? []), seat]);
//   });

//   return Array.from(grouped.entries()).map(([key, rowSeats]) => {
//     const [section, label] = key.split(":");
//     return {
//       id: `row-${section.toLowerCase()}-${label.toLowerCase()}`,
//       section,
//       label,
//       seatIds: rowSeats.map((seat) => seat.id),
//       locked: true,
//     };
//   });
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
// }
import {
  SEAT_MAP_AUDIT_STORAGE_KEY,
  SEAT_MAP_TEMPLATE_STORAGE_KEY,
} from "@/features/seat-map/constants";
import type {
  CanvasObject,
  MasterSeatMapRole,
  SeatMapAuditItem,
  SeatMapCanvasState,
  SeatMapTemplate,
  SeatMapTemplateStatusV2,
  SeatNode,
  SeatSalesChannel,
  SeatSalesChannelV2,
  SeatSection,
  SeatTier,
  VenueMasterType,
} from "@/features/seat-map/types";

const nowIso = () => new Date().toISOString();
const seedDate = "2026-06-28T09:00:00.000Z";

export function readSeatMapTemplates(): SeatMapTemplate[] {
  const records = readArray<SeatMapTemplate>(SEAT_MAP_TEMPLATE_STORAGE_KEY);
  if (records.length) return normalizeTemplates(records);

  const seeded = [createDefaultSeatMapTemplate()];
  writeSeatMapTemplates(seeded);
  return seeded;
}

export function readPublishedSeatMapTemplates(): SeatMapTemplate[] {
  return readSeatMapTemplates().filter((template) => isPublishedTemplate(template));
}

export function writeSeatMapTemplates(templates: SeatMapTemplate[]) {
  writeValue(SEAT_MAP_TEMPLATE_STORAGE_KEY, normalizeTemplates(templates));
  // TODO: Replace localStorage save with POST/PATCH /api/admin/seat-map-templates.
}

export function getSeatMapTemplateById(templateId?: string) {
  if (!templateId) return undefined;
  return readSeatMapTemplates().find((template) => template.id === templateId);
}

export function getDefaultSeatMapTemplateForVenue(venueName?: string, city?: string) {
  const normalizedVenue = venueName?.trim().toLowerCase();
  const normalizedCity = city?.trim().toLowerCase();
  const publishedTemplates = readPublishedSeatMapTemplates();

  return (
    publishedTemplates.find(
      (template) =>
        (!normalizedVenue || template.venueName.toLowerCase() === normalizedVenue) &&
        (!normalizedCity || template.city.toLowerCase() === normalizedCity) &&
        template.isDefaultForOrganizers,
    ) ??
    publishedTemplates.find(
      (template) =>
        (!normalizedVenue || template.venueName.toLowerCase() === normalizedVenue) &&
        (!normalizedCity || template.city.toLowerCase() === normalizedCity),
    ) ??
    publishedTemplates.find((template) => template.isDefaultForOrganizers) ??
    publishedTemplates[0]
  );
}

export function getSeatMapTemplatesForVenue(venueName?: string, city?: string) {
  const normalizedVenue = venueName?.trim().toLowerCase();
  const normalizedCity = city?.trim().toLowerCase();

  return readSeatMapTemplates().filter(
    (template) =>
      (!normalizedVenue || template.venueName.toLowerCase() === normalizedVenue) &&
      (!normalizedCity || template.city.toLowerCase() === normalizedCity),
  );
}

export function saveSeatMapTemplate(template: SeatMapTemplate, actorName = "Admin") {
  const normalized = normalizeTemplate({
    ...template,
    updatedAt: nowIso(),
    auditTrail: [
      createSeatMapAudit("admin", actorName, "template_saved", "Master venue template saved."),
      ...(template.auditTrail ?? []),
    ].slice(0, 50),
  });
  const next = [normalized, ...readSeatMapTemplates().filter((item) => item.id !== normalized.id)];
  writeSeatMapTemplates(next);
  appendSeatMapAudit(normalized.auditTrail?.[0]);
  return normalized;
}

export function publishSeatMapTemplate(template: SeatMapTemplate, actorName = "Admin") {
  const published = normalizeTemplate({
    ...template,
    status: "active",
    publishedAt: nowIso(),
    publishedBy: actorName,
    allowOrganizerStructureEdits: false,
    isDefaultForOrganizers: true,
    auditTrail: [
      createSeatMapAudit("admin", actorName, "template_published", "Master venue template published for organizer event copies."),
      ...(template.auditTrail ?? []),
    ].slice(0, 50),
  });
  const existing = readSeatMapTemplates().map((item) => ({
    ...item,
    isDefaultForOrganizers: item.id === published.id ? true : item.isDefaultForOrganizers && item.venueName !== published.venueName,
  }));
  const next = [published, ...existing.filter((item) => item.id !== published.id)];
  writeSeatMapTemplates(next);
  appendSeatMapAudit(published.auditTrail?.[0]);
  return published;
}

export function duplicateSeatMapTemplate(template: SeatMapTemplate, actorName = "Admin") {
  const now = nowIso();
  return normalizeTemplate({
    ...template,
    id: createSeatMapId("template"),
    venueId: createSeatMapId("venue"),
    venueName: `${template.venueName} Copy`,
    status: "draft",
    isDefaultForOrganizers: false,
    version: (template.version ?? 1) + 1,
    createdAt: now,
    updatedAt: now,
    publishedAt: undefined,
    publishedBy: undefined,
    auditTrail: [createSeatMapAudit("admin", actorName, "template_duplicated", "Template duplicated as draft.")],
  });
}

export function archiveSeatMapTemplate(template: SeatMapTemplate, actorName = "Admin") {
  return saveSeatMapTemplate(
    {
      ...template,
      status: "archived",
      isDefaultForOrganizers: false,
      auditTrail: [
        createSeatMapAudit("admin", actorName, "template_archived", "Template archived."),
        ...(template.auditTrail ?? []),
      ].slice(0, 50),
    },
    actorName,
  );
}

export function appendSeatMapAudit(entry?: SeatMapAuditItem) {
  if (!entry) return;
  writeValue(SEAT_MAP_AUDIT_STORAGE_KEY, [entry, ...readSeatMapAudit()].slice(0, 150));
}

export function readSeatMapAudit(): SeatMapAuditItem[] {
  return readArray<SeatMapAuditItem>(SEAT_MAP_AUDIT_STORAGE_KEY);
}

export function createDefaultSeatMapTemplate(): SeatMapTemplate {
  const tiers: SeatTier[] = [
    { id: "tier-vip", name: "VIP", color: "#EC1B72", price: 2499, priceLabel: "₹2,499", channel: "online", active: true },
    { id: "tier-premium", name: "Premium", color: "#EF4444", price: 1499, priceLabel: "₹1,499", channel: "online", active: true },
    { id: "tier-balcony", name: "Balcony", color: "#84CC16", price: 899, priceLabel: "₹899", channel: "online", active: true },
    { id: "tier-silver", name: "Silver", color: "#3B82F6", price: 599, priceLabel: "₹599", channel: "offline", active: true },
  ];

  const sections: SeatSection[] = [
    { id: "section-vip", name: "VIP Center", type: "vip", color: "#EC1B72", tierId: "tier-vip", capacity: 0, x: 50, y: 35, width: 32, height: 18, rotation: 0, locked: false },
    { id: "section-ground", name: "Ground Floor", type: "seated", color: "#EF4444", tierId: "tier-premium", capacity: 0, x: 50, y: 55, width: 42, height: 28, rotation: 0, locked: false },
    { id: "section-left-balcony", name: "Left Balcony", type: "balcony", color: "#84CC16", tierId: "tier-balcony", capacity: 0, x: 23, y: 58, width: 24, height: 42, rotation: -16, locked: false },
    { id: "section-right-balcony", name: "Right Balcony", type: "balcony", color: "#84CC16", tierId: "tier-balcony", capacity: 0, x: 77, y: 58, width: 24, height: 42, rotation: 16, locked: false },
    { id: "section-silver", name: "Back Silver", type: "seated", color: "#3B82F6", tierId: "tier-silver", capacity: 0, x: 50, y: 82, width: 36, height: 12, rotation: 0, locked: false },
  ];

  const seats: SeatNode[] = [
    ...buildRowSeats(sections[0], "A", 1, 12, 38, 31, 3.8, 0, "tier-vip", "online"),
    ...buildRowSeats(sections[0], "B", 1, 12, 38, 37, 3.8, 0, "tier-vip", "online"),
    ...buildRowSeats(sections[1], "C", 1, 16, 32, 47, 3.1, 0, "tier-premium", "online"),
    ...buildRowSeats(sections[1], "D", 1, 16, 32, 53, 3.1, 0, "tier-premium", "online"),
    ...buildRowSeats(sections[1], "E", 1, 16, 32, 61, 3.1, 0, "tier-premium", "reserved", "reserved"),
    ...buildRowSeats(sections[2], "F", 1, 11, 10, 35, 3.6, 78, "tier-balcony", "online"),
    ...buildRowSeats(sections[2], "G", 1, 11, 16, 38, 3.6, 78, "tier-balcony", "online"),
    ...buildRowSeats(sections[3], "H", 1, 11, 90, 35, -3.6, 102, "tier-balcony", "online"),
    ...buildRowSeats(sections[3], "I", 1, 11, 84, 38, -3.6, 102, "tier-balcony", "online"),
    ...buildRowSeats(sections[4], "J", 1, 18, 28, 80, 2.6, 0, "tier-silver", "offline"),
  ];

  const objects: CanvasObject[] = [
    { id: "object-stage-main", type: "stage", label: "STAGE", x: 50, y: 13, width: 19, height: 7, rotation: 0, color: "#111827" },
    { id: "object-ga", type: "standing", label: "General Admission", x: 50, y: 23, width: 23, height: 7, rotation: 0, color: "#EF4444", capacity: 180, tierId: "tier-premium" },
    { id: "object-gate-a", type: "entry", label: "GATE A", x: 22, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
    { id: "object-gate-b", type: "entry", label: "GATE B", x: 78, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
    { id: "object-organ", type: "label", label: "ORGAN", text: "ORGAN", x: 50, y: 96, width: 14, height: 5, rotation: 0, color: "#64748B" },
  ];

  return normalizeTemplate({
    id: "venue-template-grand-auditorium",
    venueId: "venue-buizz-grand-auditorium",
    venueName: "Buizz Grand Auditorium",
    venueCode: "BGA-PUNE-001",
    city: "Pune",
    address: "Pune, Maharashtra",
    venueType: "auditorium",
    status: "active",
    version: 1,
    totalCapacity: seats.length + 180,
    allowOrganizerStructureEdits: false,
    isDefaultForOrganizers: true,
    sections,
    tiers,
    seats,
    objects,
    canvas: createDefaultCanvas(),
    createdAt: seedDate,
    updatedAt: seedDate,
    createdByRole: "super-admin",
    updatedByRole: "super-admin",
    publishedAt: seedDate,
    publishedBy: "super-admin",
    auditTrail: [createSeatMapAudit("admin", "Super Admin", "template_seeded", "Default auditorium master template created.")],
  });
}

export function createBlankSeatMapTemplate(actorRole: MasterSeatMapRole = "admin", base?: Partial<SeatMapTemplate>): SeatMapTemplate {
  const now = nowIso();
  const tier: SeatTier = { id: "tier-general", name: "General", color: "#22C55E", price: 999, priceLabel: "₹999", channel: "online", active: true };
  const section: SeatSection = { id: "section-general", name: "General", type: "seated", color: "#22C55E", tierId: "tier-general", capacity: 0, x: 50, y: 55, width: 40, height: 32, rotation: 0, locked: false };

  return normalizeTemplate({
    id: createSeatMapId("template"),
    venueId: createSeatMapId("venue"),
    venueName: base?.venueName ? `${base.venueName} Blank` : "New Venue Seat Map",
    venueCode: base?.venueCode ? `${base.venueCode}-NEW` : "VENUE-NEW",
    city: base?.city || "Pune",
    address: base?.address || "",
    venueType: (base?.venueType as VenueMasterType) || "auditorium",
    status: "draft",
    version: 1,
    totalCapacity: 0,
    allowOrganizerStructureEdits: false,
    isDefaultForOrganizers: false,
    sections: [section],
    tiers: [tier],
    seats: [],
    objects: [
      { id: createSeatMapId("stage"), type: "stage", label: "STAGE", x: 50, y: 14, width: 18, height: 7, rotation: 0, color: "#111827" },
      { id: createSeatMapId("entry"), type: "entry", label: "GATE A", x: 25, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
      { id: createSeatMapId("entry"), type: "entry", label: "GATE B", x: 75, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
    ],
    canvas: createDefaultCanvas(),
    createdAt: now,
    updatedAt: now,
    createdByRole: actorRole,
    updatedByRole: actorRole,
    auditTrail: [createSeatMapAudit(actorRole, actorRole, "template_created", "Blank venue master template created.")],
  });
}

export function createSeatMapId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSeatMapAudit(
  actorRole: SeatMapAuditItem["actorRole"],
  actorName: string,
  action: string,
  message: string,
): SeatMapAuditItem {
  return {
    id: createSeatMapId("audit"),
    actorId: actorName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "system",
    actorName,
    actorRole,
    action,
    message,
    createdAt: nowIso(),
  };
}

export function normalizeTemplates(templates: SeatMapTemplate[]) {
  return templates.map(normalizeTemplate);
}

export function normalizeTemplate(template: SeatMapTemplate): SeatMapTemplate {
  const seats = Array.isArray(template.seats) ? template.seats.map(normalizeSeat) : [];
  const tiers = Array.isArray(template.tiers) && template.tiers.length ? template.tiers.map(normalizeTier) : [createDefaultTier()];
  const objects = Array.isArray(template.objects) ? template.objects : [];
  const standingCapacity = objects.filter((object) => object.type === "standing").reduce((sum, object) => sum + (object.capacity || 0), 0);
  const sections = Array.isArray(template.sections) ? template.sections.map((section) => ({ ...section, capacity: seats.filter((seat) => (seat.sectionId || seat.section) === section.id || seat.sectionName === section.name).length })) : [];

  return {
    ...template,
    venueId: template.venueId || createSeatMapId("venue"),
    venueCode: template.venueCode || template.venueId || template.id,
    address: template.address || "",
    venueType: normalizeVenueType(template.venueType),
    status: normalizeTemplateStatus(template.status),
    version: template.version ?? 1,
    allowOrganizerStructureEdits: template.allowOrganizerStructureEdits ?? template.allowOrganizerStructureEdit ?? false,
    isDefaultForOrganizers: template.isDefaultForOrganizers ?? false,
    sections,
    tiers,
    seats,
    objects,
    canvas: normalizeCanvas(template.canvas),
    totalCapacity: seats.length + standingCapacity,
    createdAt: template.createdAt || nowIso(),
    updatedAt: template.updatedAt || nowIso(),
    auditTrail: Array.isArray(template.auditTrail) ? template.auditTrail : [],
  };
}

function normalizeSeat(seat: SeatNode): SeatNode {
  const channel = normalizeEditorChannel(seat.channel ?? seat.salesChannel);
  return {
    ...seat,
    label: seat.label || `${seat.row || ""}${seat.number || seat.seatNumber || ""}`,
    sectionId: seat.sectionId || seat.section,
    sectionName: seat.sectionName || seat.section || "General",
    number: seat.number || seat.seatNumber || "",
    x: typeof seat.x === "number" ? seat.x : seat.xPercent,
    y: typeof seat.y === "number" ? seat.y : seat.yPercent,
    radius: seat.radius ?? 1.35,
    status: normalizeSeatStatus(seat.status),
    channel,
    salesChannel: toBackendChannel(channel),
    locked: seat.locked ?? true,
  };
}

function normalizeTier(tier: SeatTier): SeatTier {
  return {
    ...tier,
    priceLabel: tier.priceLabel || `₹${Math.round(tier.price || 0).toLocaleString("en-IN")}`,
    channel: normalizeEditorChannel(tier.channel),
    active: tier.active ?? true,
  };
}

function createDefaultTier(): SeatTier {
  return { id: "tier-general", name: "General", color: "#22C55E", price: 999, priceLabel: "₹999", channel: "online", active: true };
}

function createDefaultCanvas(): SeatMapCanvasState {
  return { width: 1200, height: 780, gridSize: 2, snapToGrid: true, showGrid: true, zoom: 1, panX: 0, panY: 0 };
}

function normalizeCanvas(canvas?: SeatMapCanvasState): SeatMapCanvasState {
  return { ...createDefaultCanvas(), ...(canvas ?? {}) };
}

function normalizeTemplateStatus(status: SeatMapTemplate["status"]): SeatMapTemplateStatusV2 {
  const value = String(status || "draft").toLowerCase();
  if (value === "active" || value === "published" || value === "approved") return "active";
  if (value === "archived") return "archived";
  if (value === "inactive") return "inactive";
  return "draft";
}

function normalizeSeatStatus(status: SeatNode["status"]): SeatNode["status"] {
  if (status === "booked") return "sold";
  if (status === "locked") return "blocked";
  if (status === "unavailable") return "disabled";
  return status || "available";
}

function normalizeVenueType(value: SeatMapTemplate["venueType"]): VenueMasterType {
  const normalized = String(value || "custom").toLowerCase().replace(/\s+/g, "-");
  if (["auditorium", "concert", "stadium", "theatre", "club", "banquet", "outdoor", "custom"].includes(normalized)) return normalized as VenueMasterType;
  if (normalized.includes("ground")) return "outdoor";
  if (normalized.includes("hall")) return "banquet";
  return "custom";
}

export function normalizeEditorChannel(channel?: string): SeatSalesChannel {
  if (channel === "offline" || channel === "offline_counter") return "offline";
  if (channel === "reserved") return "reserved";
  if (channel === "complimentary") return "complimentary";
  if (channel === "none") return "none";
  return "online";
}

export function toBackendChannel(channel?: string): SeatSalesChannelV2 {
  if (channel === "offline" || channel === "offline_counter") return "offline_counter";
  if (channel === "reserved") return "none";
  if (channel === "complimentary") return "complimentary";
  if (channel === "bookmyshow") return "bookmyshow";
  if (channel === "external_partner" || channel === "partner") return "external_partner";
  if (channel === "none") return "none";
  return "buizz_online";
}

function isPublishedTemplate(template: SeatMapTemplate) {
  return normalizeTemplateStatus(template.status) === "active" || Boolean(template.isDefaultForOrganizers);
}

function buildRowSeats(section: SeatSection, row: string, startNo: number, endNo: number, startX: number, startY: number, spacing: number, angle: number, tierId: string, channel: SeatSalesChannel, status: SeatNode["status"] = "available"): SeatNode[] {
  return Array.from({ length: Math.max(0, endNo - startNo + 1) }, (_, index) => {
    const number = String(startNo + index);
    return {
      id: `seat-${section.id}-${row.toLowerCase()}-${number}`,
      type: "seat",
      label: `${row}${number}`,
      section: section.id,
      sectionId: section.id,
      sectionName: section.name,
      row,
      number,
      seatNumber: number,
      x: startX + index * spacing,
      y: startY + Math.sin((index / Math.max(1, endNo - startNo)) * Math.PI) * 1,
      xPercent: startX + index * spacing,
      yPercent: startY,
      radius: 1.35,
      rotation: angle,
      status,
      tierId,
      channel,
      salesChannel: toBackendChannel(channel),
      locked: true,
    };
  });
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
