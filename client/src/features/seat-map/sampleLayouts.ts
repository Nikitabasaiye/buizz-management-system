// import type { DiscoveryItem } from "@/features/discovery/data";
// import type { BookingLineItem } from "@/store/ticket.store";
// import type {
//   LayoutType,
//   Seat,
//   SeatStatus,
//   SeatMapBuilderDraft,
//   SeatMapLayout,
//   SeatMapRole,
//   SeatMapSection,
//   SeatMapSelectionItem,
//   SeatRow,
// } from "@/features/seat-map/types";

// const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// export const defaultSeatMapPermissions = {
//   canManageSeatMap: true,
// };

// export const bookingTechniqueLabels: Record<LayoutType, string> = {
//   "general-entry": "General Entry",
//   "exact-seat": "Exact Seat Booking",
//   "section-seat": "Section Booking",
//   zone: "Zone Booking",
//   table: "Table Booking",
//   "time-slot": "Time Slot Booking",
//   "room-hall": "Room/Hall Booking",
//   "custom-layout": "Custom Layout",
// };

// export const defaultBuilderDraft: SeatMapBuilderDraft = {
//   eventId: "demo-event",
//   venueName: "Buizz Grand Auditorium",
//   venueType: "Auditorium",
//   provider: "custom",
//   layoutType: "exact-seat",
//   stagePosition: "top",
//   floors: 1,
//   sectionsPerFloor: 3,
//   rowsPerSection: 6,
//   seatsPerRow: 12,
//   basePrice: 499,
//   baseCapacity: 600,
//   sectionName: "General Entry",
//   sectionPrice: 499,
//   sectionCapacity: 600,
//   vipPrice: 2499,
//   goldPrice: 1499,
//   silverPrice: 799,
//   zoneName: "Front Zone",
//   tableNumber: "Table 1",
//   tableCapacity: 4,
//   slotDate: "2026-06-18",
//   slotTime: "07:30 PM",
//   roomName: "Main Hall",
//   customX: 18,
//   customY: 22,
//   customWidth: 30,
//   customHeight: 18,
//   color: "var(--color-brand-primary)",
//   seatsIoChartKey: "",
//   seatsIoEventKey: "",
//   seatsIoWorkspaceKey: "",
//   notes: "Frontend-only layout draft. Backend can persist this JSON unchanged.",
// };

// export const mockSeatMapLayouts: SeatMapLayout[] = [
//   buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: "arijit-live-pune", venueName: "Mahalaxmi Lawns", layoutType: "exact-seat" }, "organizer", "org-festlane"),
//   buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: "champions-turf-league", venueName: "Shiv Chhatrapati Sports City", venueType: "Stadium", layoutType: "section-seat", sectionsPerFloor: 4, basePrice: 349 }, "admin", "admin-ops"),
//   buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: "neon-nights-social", venueName: "High Street Social", venueType: "Club", layoutType: "table", basePrice: 699 }, "super-admin", "super-admin-root"),
// ];

// export function getVenueLayoutForItem(item: DiscoveryItem): SeatMapLayout {
//   const text = `${item.title} ${item.kind} ${item.category} ${item.genre} ${item.tags.join(" ")}`.toLowerCase();
//   const basePrice = item.price || 399;

//   if (item.kind === "activities" || text.includes("workshop") || text.includes("pass")) {
//     return buildLayoutFromDraft({
//       ...defaultBuilderDraft,
//       eventId: item.id,
//       venueName: item.venue,
//       venueType: "Custom",
//       layoutType: text.includes("slot") || text.includes("court") ? "time-slot" : "general-entry",
//       basePrice,
//       sectionPrice: basePrice,
//     });
//   }

//   if (text.includes("nightlife") || text.includes("club") || text.includes("social")) {
//     return buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: item.id, venueName: item.venue, venueType: "Club", layoutType: "table", basePrice });
//   }

//   if (text.includes("stadium") || text.includes("sport") || text.includes("arena")) {
//     return buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: item.id, venueName: item.venue, venueType: "Stadium", layoutType: "section-seat", basePrice, sectionsPerFloor: 5 });
//   }

//   return buildLayoutFromDraft({
//     ...defaultBuilderDraft,
//     eventId: item.id,
//     venueName: item.venue,
//     venueType: item.kind === "plays" ? "Theatre" : "Auditorium",
//     layoutType: "exact-seat",
//     basePrice,
//   });
// }

// export function buildLayoutFromDraft(draft: SeatMapBuilderDraft, role: SeatMapRole = "organizer", createdById = `${role}-demo`): SeatMapLayout {
//   const sections = buildSectionsForDraft(draft);
//   return {
//     id: slugify(`${draft.eventId || draft.venueName}-${draft.provider}-${draft.layoutType}`),
//     eventId: draft.eventId,
//     venueName: draft.venueName,
//     venueType: draft.venueType,
//     provider: draft.provider,
//     layoutType: draft.layoutType,
//     stagePosition: draft.stagePosition === "none" ? undefined : draft.stagePosition,
//     currency: "INR",
//     seatsIoChartKey: draft.seatsIoChartKey || undefined,
//     seatsIoEventKey: draft.seatsIoEventKey || undefined,
//     seatsIoWorkspaceKey: draft.seatsIoWorkspaceKey || undefined,
//     floors: [{ id: "floor-1", label: draft.layoutType === "time-slot" ? "Schedule" : "Main Floor", sections }],
//     metadata: {
//       version: 1,
//       createdByRole: role,
//       createdById,
//       status: "draft",
//       updatedAt: new Date().toISOString(),
//       notes: draft.notes,
//     },
//   };
// }

// export function buildLineItemsFromSeatSelection(selection: SeatMapSelectionItem[]): BookingLineItem[] {
//   const grouped = new Map<string, BookingLineItem>();
//   for (const item of selection) {
//     const key = `${item.sectionLabel}-${item.price}`;
//     const current = grouped.get(key);
//     if (current) {
//       current.quantity += 1;
//       current.seats = [...(current.seats ?? []), item.label];
//       continue;
//     }
//     grouped.set(key, { label: item.sectionLabel, quantity: 1, price: item.price, seats: [item.label] });
//   }
//   return Array.from(grouped.values());
// }

// export function getLayoutStats(layout: SeatMapLayout) {
//   const sections = layout.floors.flatMap((floor) => floor.sections);
//   const seats = sections.flatMap((section) => section.rows?.flatMap((row) => row.seats) ?? []);
//   const sectionCapacity = sections.reduce((sum, section) => sum + section.capacity, 0);
//   return {
//     floors: layout.floors.length,
//     sections: sections.length,
//     seats: seats.length,
//     capacity: seats.length || sectionCapacity,
//     minPrice: Math.min(...sections.map((section) => section.price)),
//   };
// }

// export function selectionTotal(selection: SeatMapSelectionItem[]) {
//   return selection.reduce((sum, item) => sum + item.price, 0);
// }

// export function formatLayoutType(value: LayoutType) {
//   return bookingTechniqueLabels[value] ?? value;
// }

// export function formatSeatMapDate(value: string) {
//   return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
// }

// function buildSectionsForDraft(draft: SeatMapBuilderDraft): SeatMapSection[] {
//   if (draft.provider === "seatsio") {
//     return [flatSection("seatsio-placeholder", "Seats.io Chart", "seated", "#3B82F6", draft.basePrice, draft.baseCapacity, 16, 22, 64, 42)];
//   }

//   if (draft.layoutType === "general-entry") {
//     return [
//       flatSection("general-entry", draft.sectionName || "General Entry", "standing", draft.color, draft.sectionPrice, draft.sectionCapacity, 18, 24, 62, 34),
//       flatSection("premium-entry", "Premium Entry", "zone", "#3B82F6", draft.sectionPrice + 500, Math.max(40, Math.round(draft.sectionCapacity * 0.25)), 52, 24, 26, 34),
//     ];
//   }

//   if (draft.layoutType === "exact-seat") {
//     return Array.from({ length: clamp(draft.sectionsPerFloor, 1, 4) }, (_, index) => buildSeatedSection(draft, index));
//   }

//   if (draft.layoutType === "section-seat") {
//     return [
//       flatSection("vip", "VIP", "vip-box", "#7c3aed", draft.vipPrice, Math.max(20, Math.round(draft.sectionCapacity * 0.15)), 10, 24, 22, 26),
//       flatSection("gold", "Gold", "seated", "var(--color-brand-accent)", draft.goldPrice, Math.max(80, Math.round(draft.sectionCapacity * 0.35)), 38, 24, 24, 30),
//       flatSection("silver", "Silver", "seated", "#3B82F6", draft.silverPrice, Math.max(120, Math.round(draft.sectionCapacity * 0.5)), 68, 24, 22, 34),
//     ];
//   }

//   if (draft.layoutType === "zone") {
//     return [
//       flatSection("zone-front", draft.zoneName || "Front Zone", "zone", draft.color, draft.sectionPrice, draft.sectionCapacity, 12, 20, 34, 34),
//       flatSection("zone-social", "Social Zone", "standing", "#3B82F6", Math.max(0, draft.sectionPrice - 100), Math.round(draft.sectionCapacity * 1.5), 52, 22, 34, 34),
//       flatSection("zone-family", "Family Zone", "zone", "#22C55E", draft.sectionPrice + 150, Math.round(draft.sectionCapacity * 0.7), 30, 62, 42, 20),
//     ];
//   }

//   if (draft.layoutType === "table") {
//     return Array.from({ length: 8 }, (_, index) =>
//       flatSection(`table-${index + 1}`, index === 0 ? draft.tableNumber || "Table 1" : `Table ${index + 1}`, "table", index < 2 ? "#7c3aed" : draft.color, draft.basePrice + (index < 2 ? 800 : 0), draft.tableCapacity, 10 + (index % 4) * 21, 20 + Math.floor(index / 4) * 34, 14, 18)
//     );
//   }

//   if (draft.layoutType === "time-slot") {
//     return ["10:00 AM", draft.slotTime, "06:00 PM", "08:30 PM"].map((slot, index) =>
//       flatSection(`slot-${index + 1}`, `${draft.slotDate} - ${slot}`, "zone", "#3B82F6", draft.sectionPrice, draft.sectionCapacity, 10 + index * 21, 30, 17, 30)
//     );
//   }

//   if (draft.layoutType === "room-hall") {
//     return [
//       flatSection("main-hall", draft.roomName || "Main Hall", "hall", draft.color, draft.sectionPrice, draft.sectionCapacity, 16, 20, 42, 48),
//       flatSection("side-room", "Breakout Room", "room", "#3B82F6", Math.max(0, draft.sectionPrice - 300), Math.round(draft.sectionCapacity * 0.35), 64, 24, 22, 36),
//     ];
//   }

//   return [
//     flatSection("custom-1", draft.sectionName || "Custom Section", "zone", draft.color, draft.sectionPrice, draft.sectionCapacity, draft.customX, draft.customY, draft.customWidth, draft.customHeight),
//   ];
// }

// function buildSeatedSection(draft: SeatMapBuilderDraft, sectionIndex: number): SeatMapSection {
//   const sectionId = `section-${sectionIndex + 1}`;
//   const rowCount = clamp(draft.rowsPerSection, 1, 14);
//   const seatsPerRow = clamp(draft.seatsPerRow, 4, 28);
//   const price = draft.basePrice + sectionIndex * 250;
//   const rows: SeatRow[] = Array.from({ length: rowCount }, (_, rowIndex) => {
//     const rowLabel = rowLabels[rowIndex] ?? `R${rowIndex + 1}`;
//     return {
//       id: `${sectionId}-${rowLabel}`,
//       label: rowLabel,
//       seats: Array.from({ length: seatsPerRow }, (_, seatIndex): Seat => {
//         const id = `${sectionId}-${rowLabel}-${seatIndex + 1}`;
//         return {
//           id,
//           label: `${rowLabel}${seatIndex + 1}`,
//           price,
//           status: resolveDemoSeatStatus(rowIndex, seatIndex, sectionIndex),
//         };
//       }),
//     };
//   });

//   return {
//     id: sectionId,
//     label: ["Left", "Center", "Right", "Balcony"][sectionIndex] ?? `Section ${sectionIndex + 1}`,
//     kind: "seated",
//     color: sectionIndex === 0 ? draft.color : ["#3B82F6", "#22C55E", "var(--color-brand-accent)"][sectionIndex % 3],
//     price,
//     capacity: rowCount * seatsPerRow,
//     status: "available",
//     x: 10 + sectionIndex * 28,
//     y: 26,
//     width: 24,
//     height: 42,
//     rows,
//   };
// }

// function flatSection(id: string, label: string, kind: SeatMapSection["kind"], color: string, price: number, capacity: number, x: number, y: number, width: number, height: number): SeatMapSection {
//   return { id, label, kind, color, price, capacity, status: "available", x, y, width, height };
// }

// function resolveDemoSeatStatus(rowIndex: number, seatIndex: number, sectionIndex: number): SeatStatus {
//   if (rowIndex === 1 && seatIndex === 3 && sectionIndex === 1) return "blocked";
//   if (rowIndex === 0 && seatIndex < 2 && sectionIndex === 0) return "reserved";
//   if (rowIndex === 2 && seatIndex > 7 && sectionIndex === 2) return "booked";
//   return "available";
// }

// function slugify(value: string) {
//   return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "seat-map-layout";
// }

// function clamp(value: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
// }
import type { DiscoveryItem } from "@/features/discovery/data";
import type { BookingLineItem } from "@/store/ticket.store";
import type {
  LayoutType,
  Seat,
  SeatStatus,
  SeatMapBuilderDraft,
  SeatMapLayout,
  SeatMapRole,
  SeatMapSection,
  SeatMapSelectionItem,
  SeatRow,
} from "@/features/seat-map/types";

const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const defaultSeatMapPermissions = {
  canManageSeatMap: true,
};

export const bookingTechniqueLabels: Record<LayoutType, string> = {
  "general-entry": "General Entry",
  "exact-seat": "Exact Seat Booking",
  "section-seat": "Section Booking",
  zone: "Zone Booking",
  table: "Table Booking",
  "time-slot": "Time Slot Booking",
  "room-hall": "Room/Hall Booking",
  "custom-layout": "Custom Layout",
};

export const defaultBuilderDraft: SeatMapBuilderDraft = {
  eventId: "",
  venueName: "",
  venueType: "Auditorium",
  provider: "custom",
  layoutType: "exact-seat",
  stagePosition: "top",
  floors: 1,
  sectionsPerFloor: 3,
  rowsPerSection: 6,
  seatsPerRow: 12,
  basePrice: 499,
  baseCapacity: 600,
  sectionName: "General Entry",
  sectionPrice: 499,
  sectionCapacity: 600,
  vipPrice: 2499,
  goldPrice: 1499,
  silverPrice: 799,
  zoneName: "Front Zone",
  tableNumber: "Table 1",
  tableCapacity: 4,
  slotDate: "",
  slotTime: "",
  roomName: "",
  customX: 18,
  customY: 22,
  customWidth: 30,
  customHeight: 18,
  color: "var(--color-brand-primary)",
  seatsIoChartKey: "",
  seatsIoEventKey: "",
  seatsIoWorkspaceKey: "",
  notes: "Frontend-only layout draft. Backend can persist this JSON unchanged.",
};

export const mockSeatMapLayouts: SeatMapLayout[] = [
  buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: "arijit-live-pune", venueName: "Mahalaxmi Lawns", layoutType: "exact-seat" }, "organizer", "org-festlane"),
  buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: "champions-turf-league", venueName: "Shiv Chhatrapati Sports City", venueType: "Stadium", layoutType: "section-seat", sectionsPerFloor: 4, basePrice: 349 }, "admin", "admin-ops"),
  buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: "neon-nights-social", venueName: "High Street Social", venueType: "Club", layoutType: "table", basePrice: 699 }, "super-admin", "super-admin-root"),
];

export function getVenueLayoutForItem(item: DiscoveryItem): SeatMapLayout {
  const text = `${item.title} ${item.kind} ${item.category} ${item.genre} ${item.tags.join(" ")}`.toLowerCase();
  const basePrice = item.price || 399;

  if (item.kind === "activities" || text.includes("workshop") || text.includes("pass")) {
    return buildLayoutFromDraft({
      ...defaultBuilderDraft,
      eventId: item.id,
      venueName: item.venue,
      venueType: "Custom",
      layoutType: text.includes("slot") || text.includes("court") ? "time-slot" : "general-entry",
      basePrice,
      sectionPrice: basePrice,
    });
  }

  if (text.includes("nightlife") || text.includes("club") || text.includes("social")) {
    return buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: item.id, venueName: item.venue, venueType: "Club", layoutType: "table", basePrice });
  }

  if (text.includes("stadium") || text.includes("sport") || text.includes("arena")) {
    return buildLayoutFromDraft({ ...defaultBuilderDraft, eventId: item.id, venueName: item.venue, venueType: "Stadium", layoutType: "section-seat", basePrice, sectionsPerFloor: 5 });
  }

  return buildLayoutFromDraft({
    ...defaultBuilderDraft,
    eventId: item.id,
    venueName: item.venue,
    venueType: item.kind === "plays" ? "Theatre" : "Auditorium",
    layoutType: "exact-seat",
    basePrice,
  });
}

export function buildLayoutFromDraft(draft: SeatMapBuilderDraft, role: SeatMapRole = "organizer", createdById = `${role}-demo`): SeatMapLayout {
  const sections = buildSectionsForDraft(draft);
  return {
    id: slugify(`${draft.eventId || draft.venueName}-${draft.provider}-${draft.layoutType}`),
    eventId: draft.eventId,
    venueName: draft.venueName,
    venueType: draft.venueType,
    provider: draft.provider,
    layoutType: draft.layoutType,
    stagePosition: draft.stagePosition === "none" ? undefined : draft.stagePosition,
    currency: "INR",
    seatsIoChartKey: draft.seatsIoChartKey || undefined,
    seatsIoEventKey: draft.seatsIoEventKey || undefined,
    seatsIoWorkspaceKey: draft.seatsIoWorkspaceKey || undefined,
    floors: [{ id: "floor-1", label: draft.layoutType === "time-slot" ? "Schedule" : "Main Floor", sections }],
    metadata: {
      version: 1,
      createdByRole: role,
      createdById,
      status: "draft",
      updatedAt: new Date().toISOString(),
      notes: draft.notes,
    },
  };
}

export function buildLineItemsFromSeatSelection(selection: SeatMapSelectionItem[]): BookingLineItem[] {
  const grouped = new Map<string, BookingLineItem>();
  for (const item of selection) {
    const key = `${item.sectionLabel}-${item.price}`;
    const current = grouped.get(key);
    if (current) {
      current.quantity += 1;
      current.seats = [...(current.seats ?? []), item.label];
      continue;
    }
    grouped.set(key, { label: item.sectionLabel, quantity: 1, price: item.price, seats: [item.label] });
  }
  return Array.from(grouped.values());
}

export function getLayoutStats(layout: SeatMapLayout) {
  const sections = layout.floors.flatMap((floor) => floor.sections);
  const seats = sections.flatMap((section) => section.rows?.flatMap((row) => row.seats) ?? []);
  const sectionCapacity = sections.reduce((sum, section) => sum + section.capacity, 0);
  return {
    floors: layout.floors.length,
    sections: sections.length,
    seats: seats.length,
    capacity: seats.length || sectionCapacity,
    minPrice: Math.min(...sections.map((section) => section.price)),
  };
}

export function selectionTotal(selection: SeatMapSelectionItem[]) {
  return selection.reduce((sum, item) => sum + item.price, 0);
}

export function formatLayoutType(value: LayoutType) {
  return bookingTechniqueLabels[value] ?? value;
}

export function formatSeatMapDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function buildSectionsForDraft(draft: SeatMapBuilderDraft): SeatMapSection[] {
  if (draft.provider === "seatsio") {
    return [flatSection("seatsio-placeholder", "Seats.io Chart", "seated", "#3B82F6", draft.basePrice, draft.baseCapacity, 16, 22, 64, 42)];
  }

  if (draft.layoutType === "general-entry") {
    return [
      flatSection("general-entry", draft.sectionName || "General Entry", "standing", draft.color, draft.sectionPrice, draft.sectionCapacity, 18, 24, 62, 34),
      flatSection("premium-entry", "Premium Entry", "zone", "#3B82F6", draft.sectionPrice + 500, Math.max(40, Math.round(draft.sectionCapacity * 0.25)), 52, 24, 26, 34),
    ];
  }

  if (draft.layoutType === "exact-seat") {
    return Array.from({ length: clamp(draft.sectionsPerFloor, 1, 4) }, (_, index) => buildSeatedSection(draft, index));
  }

  if (draft.layoutType === "section-seat") {
    return [
      flatSection("vip", "VIP", "vip-box", "#7c3aed", draft.vipPrice, Math.max(20, Math.round(draft.sectionCapacity * 0.15)), 10, 24, 22, 26),
      flatSection("gold", "Gold", "seated", "var(--color-brand-accent)", draft.goldPrice, Math.max(80, Math.round(draft.sectionCapacity * 0.35)), 38, 24, 24, 30),
      flatSection("silver", "Silver", "seated", "#3B82F6", draft.silverPrice, Math.max(120, Math.round(draft.sectionCapacity * 0.5)), 68, 24, 22, 34),
    ];
  }

  if (draft.layoutType === "zone") {
    return [
      flatSection("zone-front", draft.zoneName || "Front Zone", "zone", draft.color, draft.sectionPrice, draft.sectionCapacity, 12, 20, 34, 34),
      flatSection("zone-social", "Social Zone", "standing", "#3B82F6", Math.max(0, draft.sectionPrice - 100), Math.round(draft.sectionCapacity * 1.5), 52, 22, 34, 34),
      flatSection("zone-family", "Family Zone", "zone", "#22C55E", draft.sectionPrice + 150, Math.round(draft.sectionCapacity * 0.7), 30, 62, 42, 20),
    ];
  }

  if (draft.layoutType === "table") {
    return Array.from({ length: 8 }, (_, index) =>
      flatSection(`table-${index + 1}`, index === 0 ? draft.tableNumber || "Table 1" : `Table ${index + 1}`, "table", index < 2 ? "#7c3aed" : draft.color, draft.basePrice + (index < 2 ? 800 : 0), draft.tableCapacity, 10 + (index % 4) * 21, 20 + Math.floor(index / 4) * 34, 14, 18)
    );
  }

  if (draft.layoutType === "time-slot") {
    return ["10:00 AM", draft.slotTime, "06:00 PM", "08:30 PM"].map((slot, index) =>
      flatSection(`slot-${index + 1}`, `${draft.slotDate} - ${slot}`, "zone", "#3B82F6", draft.sectionPrice, draft.sectionCapacity, 10 + index * 21, 30, 17, 30)
    );
  }

  if (draft.layoutType === "room-hall") {
    return [
      flatSection("main-hall", draft.roomName || "Main Hall", "hall", draft.color, draft.sectionPrice, draft.sectionCapacity, 16, 20, 42, 48),
      flatSection("side-room", "Breakout Room", "room", "#3B82F6", Math.max(0, draft.sectionPrice - 300), Math.round(draft.sectionCapacity * 0.35), 64, 24, 22, 36),
    ];
  }

  return [
    flatSection("custom-1", draft.sectionName || "Custom Section", "zone", draft.color, draft.sectionPrice, draft.sectionCapacity, draft.customX, draft.customY, draft.customWidth, draft.customHeight),
  ];
}

function buildSeatedSection(draft: SeatMapBuilderDraft, sectionIndex: number): SeatMapSection {
  const sectionId = `section-${sectionIndex + 1}`;
  const rowCount = clamp(draft.rowsPerSection, 1, 14);
  const seatsPerRow = clamp(draft.seatsPerRow, 4, 28);
  const price = draft.basePrice + sectionIndex * 250;
  const rows: SeatRow[] = Array.from({ length: rowCount }, (_, rowIndex) => {
    const rowLabel = rowLabels[rowIndex] ?? `R${rowIndex + 1}`;
    return {
      id: `${sectionId}-${rowLabel}`,
      label: rowLabel,
      seats: Array.from({ length: seatsPerRow }, (_, seatIndex): Seat => {
        const id = `${sectionId}-${rowLabel}-${seatIndex + 1}`;
        return {
          id,
          label: `${rowLabel}${seatIndex + 1}`,
          price,
          status: resolveDemoSeatStatus(rowIndex, seatIndex, sectionIndex),
        };
      }),
    };
  });

  return {
    id: sectionId,
    label: ["Left", "Center", "Right", "Balcony"][sectionIndex] ?? `Section ${sectionIndex + 1}`,
    kind: "seated",
    color: sectionIndex === 0 ? draft.color : ["#3B82F6", "#22C55E", "var(--color-brand-accent)"][sectionIndex % 3],
    price,
    capacity: rowCount * seatsPerRow,
    status: "available",
    x: 10 + sectionIndex * 28,
    y: 26,
    width: 24,
    height: 42,
    rows,
  };
}

function flatSection(id: string, label: string, kind: SeatMapSection["kind"], color: string, price: number, capacity: number, x: number, y: number, width: number, height: number): SeatMapSection {
  return { id, label, kind, color, price, capacity, status: "available", x, y, width, height };
}

function resolveDemoSeatStatus(rowIndex: number, seatIndex: number, sectionIndex: number): SeatStatus {
  if (rowIndex === 1 && seatIndex === 3 && sectionIndex === 1) return "blocked";
  if (rowIndex === 0 && seatIndex < 2 && sectionIndex === 0) return "reserved";
  if (rowIndex === 2 && seatIndex > 7 && sectionIndex === 2) return "booked";
  return "available";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "seat-map-layout";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
