// import type {
//   GeneralAdmissionArea,
//   PricingZone,
//   SeatEngineStatus,
//   SeatMapLayout,
//   SeatMapRole,
//   SeatMapRow,
//   SeatMapSeat,
//   SeatMapSection,
//   SeatStatus,
//   TicketTemplate,
//   VenueObject,
// } from "@/features/seat-map/types";

// export type SeatEngineVenue = {
//   id: string;
//   name: string;
//   type: string;
//   city: string;
// };

// export type SeatEngineEvent = {
//   id: string;
//   name: string;
//   date: string;
//   venueId: string;
// };

// export const seatEngineVenues: SeatEngineVenue[] = [
//   { id: "venue-dy-patil", name: "DY Patil Stadium", type: "Stadium", city: "Mumbai" },
//   { id: "venue-phoenix", name: "Phoenix Marketcity Arena", type: "Sports Arena", city: "Mumbai" },
//   { id: "venue-mmrda", name: "MMRDA Grounds", type: "Concert Ground", city: "Mumbai" },
//   { id: "venue-shivaji", name: "Shivaji Maharaj Stadium", type: "Stadium", city: "Pune" },
// ];

// export const seatEngineEvents: SeatEngineEvent[] = [
//   { id: "event-sunburn-arena", name: "Sunburn Arena ft. Martin Garrix", date: "Aug 15, 2026", venueId: "venue-dy-patil" },
//   { id: "event-tech-summit", name: "Tech Summit Maharashtra 2026", date: "Sep 5, 2026", venueId: "venue-phoenix" },
//   { id: "event-indie-festival", name: "Indie Music Festival", date: "Sep 15, 2026", venueId: "venue-mmrda" },
// ];

// export const defaultPricingZones: PricingZone[] = [
//   { id: "zone-vip", name: "VIP", color: "var(--color-brand-primary)", ticketCategory: "VIP", price: 7999 },
//   { id: "zone-premium", name: "Premium", color: "#3B82F6", ticketCategory: "Premium", price: 3499 },
//   { id: "zone-general", name: "General", color: "#22C55E", ticketCategory: "General", price: 1499 },
//   { id: "zone-couple", name: "Couple", color: "var(--color-brand-accent)", ticketCategory: "Couple Pass", price: 4999 },
//   { id: "zone-early", name: "Early Bird", color: "#7c3aed", ticketCategory: "Early Bird", price: 999 },
// ];

// export const defaultTicketTemplates: TicketTemplate[] = [
//   { id: "template-premium-concert", name: "Premium Concert Ticket", accentColor: "var(--color-brand-primary)", selectedBy: "super-admin" },
//   { id: "template-arena-pass", name: "Arena Access Pass", accentColor: "#3B82F6", selectedBy: "super-admin" },
//   { id: "template-festival-band", name: "Festival Wristband", accentColor: "#22C55E", selectedBy: "super-admin" },
// ];

// const sectionBlueprints = [
//   { id: "section-vip-a", label: "VIP A", rows: ["A", "B", "C"], seatsPerRow: 12, zoneId: "zone-vip", x: 70, y: 130 },
//   { id: "section-vip-b", label: "VIP B", rows: ["A", "B", "C"], seatsPerRow: 12, zoneId: "zone-vip", x: 390, y: 130 },
//   { id: "section-premium-a", label: "Premium A", rows: ["D", "E", "F"], seatsPerRow: 14, zoneId: "zone-premium", x: 70, y: 300 },
//   { id: "section-general-a", label: "General A", rows: ["G", "H", "I"], seatsPerRow: 14, zoneId: "zone-general", x: 390, y: 300 },
// ];

// export function createSeatEngineLayout({
//   role,
//   venueId = "venue-dy-patil",
//   eventId = "event-sunburn-arena",
//   status = "Draft",
// }: {
//   role: SeatMapRole;
//   venueId?: string;
//   eventId?: string;
//   status?: SeatEngineStatus;
// }): SeatMapLayout {
//   const venue = seatEngineVenues.find((item) => item.id === venueId) ?? seatEngineVenues[0];
//   const rows: SeatMapRow[] = [];
//   const seats: SeatMapSeat[] = [];

//   const sections: SeatMapSection[] = sectionBlueprints.map((section) => {
//     const zone = defaultPricingZones.find((item) => item.id === section.zoneId) ?? defaultPricingZones[0];
//     const sectionRows = section.rows.map((rowLabel, rowIndex) => {
//       const row: SeatMapRow = {
//         id: `${section.id}-row-${rowLabel.toLowerCase()}`,
//         label: rowLabel,
//         sectionId: section.id,
//         sectionName: section.label,
//         seats: Array.from({ length: section.seatsPerRow }, (_, index) => {
//           const seatNumber = String(index + 1).padStart(2, "0");
//           const statusValue = resolveDemoStatus(rowLabel, index);
//           const seat: SeatMapSeat = {
//             id: `${section.id}-${rowLabel}-${seatNumber}`,
//             label: `${rowLabel}${seatNumber}`,
//             sectionId: section.id,
//             sectionName: section.label,
//             rowId: `${section.id}-row-${rowLabel.toLowerCase()}`,
//             rowName: rowLabel,
//             number: seatNumber,
//             pricingZoneId: zone.id,
//             price: zone.price,
//             status: statusValue,
//             color: zone.color,
//             x: section.x + index * 18,
//             y: section.y + rowIndex * 24,
//           };
//           seats.push(seat);
//           return seat;
//         }),
//       };
//       rows.push(row);
//       return row;
//     });

//     return {
//       id: section.id,
//       label: section.label,
//       name: section.label,
//       kind: "seated",
//       color: zone.color,
//       pricingZoneId: zone.id,
//       price: zone.price,
//       capacity: sectionRows.reduce((sum, row) => sum + row.seats.length, 0),
//       status: "available",
//       x: section.x - 22,
//       y: section.y - 42,
//       width: 292,
//       height: 126,
//       rows: sectionRows,
//     };
//   });

//   const generalAdmissionAreas: GeneralAdmissionArea[] = [
//     {
//       id: "ga-standing",
//       name: "General Admission Standing",
//       capacity: 600,
//       selectedQuantity: 0,
//       pricingZoneId: "zone-general",
//       color: "#22C55E",
//       x: 78,
//       y: 480,
//       width: 584,
//       height: 90,
//     },
//   ];

//   const tables: VenueObject[] = Array.from({ length: 6 }, (_, index) => ({
//     id: `table-${index + 1}`,
//     type: "table",
//     name: `Table ${index + 1}`,
//     capacity: 4,
//     pricingZoneId: "zone-couple",
//     status: "available" as SeatStatus,
//     color: "var(--color-brand-accent)",
//     x: 120 + (index % 3) * 130,
//     y: 610 + Math.floor(index / 3) * 86,
//     width: 58,
//     height: 58,
//   }));

//   const stage: VenueObject = {
//     id: "stage-main",
//     type: "stage",
//     name: "Main Stage",
//     color: "var(--color-brand-primary)",
//     x: 150,
//     y: 28,
//     width: 440,
//     height: 58,
//   };

//   const gates: VenueObject[] = [
//     { id: "gate-east", type: "gate", name: "Entry Gate East", color: "#3B82F6", x: 24, y: 34, width: 94, height: 36 },
//     { id: "gate-west", type: "gate", name: "Entry Gate West", color: "#3B82F6", x: 626, y: 34, width: 94, height: 36 },
//   ];

//   const zones: VenueObject[] = [];

//   return {
//     id: `layout-${venue.id}`,
//     layoutId: `layout-${venue.id}`,
//     eventId,
//     venueId: venue.id,
//     venueName: venue.name,
//     venueType: venue.type,
//     provider: "custom",
//     layoutType: "custom-layout",
//     stagePosition: "top",
//     currency: "INR",
//     floors: [{ id: "floor-main", label: "Main Bowl", sections }],
//     sections,
//     rows,
//     seats,
//     generalAdmissionAreas,
//     tables,
//     stage,
//     gates,
//     zones,
//     pricingZones: defaultPricingZones,
//     ticketTemplates: defaultTicketTemplates,
//     selectedTicketTemplateId: "template-premium-concert",
//     status,
//     metadata: {
//       version: 1,
//       createdByRole: role,
//       createdById: `${role}-demo-user`,
//       status: status === "Published" ? "published" : "draft",
//       updatedAt: new Date().toISOString(),
//       notes: "TODO: fetch layout from backend API when persistence is connected.",
//     },
//   };
// }

// function resolveDemoStatus(rowLabel: string, index: number): SeatStatus {
//   if (rowLabel === "A" && index === 0) return "sold";
//   if (rowLabel === "B" && index === 5) return "locked";
//   if (rowLabel === "F" && index === 10) return "disabled";
//   if (index === 9 && ["C", "H"].includes(rowLabel)) return "sold";
//   return "available";
// }
// LEGACY / DEMO adapter only.
// Do not build new seat-map pages on this file.
// Final production flow uses SeatMapBuilderPage.tsx + seatMapTemplateStore.ts + eventSeatConfigStore.ts.

// LEGACY / DEMO adapter only.
// Do not build new seat-map pages on this file.
// Final production flow uses SeatMapBuilderPage.tsx + seatMapTemplateStore.ts + eventSeatConfigStore.ts.

import type {
  GeneralAdmissionArea,
  PricingZone,
  SeatEngineStatus,
  SeatMapLayout,
  SeatMapRole,
  SeatMapRow,
  SeatMapSeat,
  SeatMapSection,
  SeatStatus,
  TicketTemplate,
  VenueObject,
} from "@/features/seat-map/types";

export type SeatEngineVenue = {
  id: string;
  name: string;
  type: string;
  city: string;
};

export type SeatEngineEvent = {
  id: string;
  name: string;
  date: string;
  venueId: string;
};

export const seatEngineVenues: SeatEngineVenue[] = [
  { id: "venue-dy-patil", name: "DY Patil Stadium", type: "Stadium", city: "Mumbai" },
  { id: "venue-phoenix", name: "Phoenix Marketcity Arena", type: "Sports Arena", city: "Mumbai" },
  { id: "venue-mmrda", name: "MMRDA Grounds", type: "Concert Ground", city: "Mumbai" },
  { id: "venue-shivaji", name: "Shivaji Maharaj Stadium", type: "Stadium", city: "Pune" },
];

export const seatEngineEvents: SeatEngineEvent[] = [
  { id: "event-sunburn-arena", name: "Sunburn Arena ft. Martin Garrix", date: "Aug 15, 2026", venueId: "venue-dy-patil" },
  { id: "event-tech-summit", name: "Tech Summit Maharashtra 2026", date: "Sep 5, 2026", venueId: "venue-phoenix" },
  { id: "event-indie-festival", name: "Indie Music Festival", date: "Sep 15, 2026", venueId: "venue-mmrda" },
];

export const defaultPricingZones: PricingZone[] = [
  { id: "zone-vip", name: "VIP", color: "var(--color-brand-primary)", ticketCategory: "VIP", price: 7999 },
  { id: "zone-premium", name: "Premium", color: "#3B82F6", ticketCategory: "Premium", price: 3499 },
  { id: "zone-general", name: "General", color: "#22C55E", ticketCategory: "General", price: 1499 },
  { id: "zone-couple", name: "Couple", color: "var(--color-brand-accent)", ticketCategory: "Couple Pass", price: 4999 },
  { id: "zone-early", name: "Early Bird", color: "#7c3aed", ticketCategory: "Early Bird", price: 999 },
];

export const defaultTicketTemplates: TicketTemplate[] = [
  { id: "template-premium-concert", name: "Premium Concert Ticket", accentColor: "var(--color-brand-primary)", selectedBy: "super-admin" },
  { id: "template-arena-pass", name: "Arena Access Pass", accentColor: "#3B82F6", selectedBy: "super-admin" },
  { id: "template-festival-band", name: "Festival Wristband", accentColor: "#22C55E", selectedBy: "super-admin" },
];

const sectionBlueprints = [
  { id: "section-vip-a", label: "VIP A", rows: ["A", "B", "C"], seatsPerRow: 12, zoneId: "zone-vip", x: 70, y: 130 },
  { id: "section-vip-b", label: "VIP B", rows: ["A", "B", "C"], seatsPerRow: 12, zoneId: "zone-vip", x: 390, y: 130 },
  { id: "section-premium-a", label: "Premium A", rows: ["D", "E", "F"], seatsPerRow: 14, zoneId: "zone-premium", x: 70, y: 300 },
  { id: "section-general-a", label: "General A", rows: ["G", "H", "I"], seatsPerRow: 14, zoneId: "zone-general", x: 390, y: 300 },
];

export function createSeatEngineLayout({
  role,
  venueId = "venue-dy-patil",
  eventId = "event-sunburn-arena",
  status = "Draft",
}: {
  role: SeatMapRole;
  venueId?: string;
  eventId?: string;
  status?: SeatEngineStatus;
}): SeatMapLayout {
  const venue = seatEngineVenues.find((item) => item.id === venueId) ?? seatEngineVenues[0];
  const rows: SeatMapRow[] = [];
  const seats: SeatMapSeat[] = [];

  const sections: SeatMapSection[] = sectionBlueprints.map((section) => {
    const zone = defaultPricingZones.find((item) => item.id === section.zoneId) ?? defaultPricingZones[0];
    const sectionRows = section.rows.map((rowLabel, rowIndex) => {
      const row: SeatMapRow = {
        id: `${section.id}-row-${rowLabel.toLowerCase()}`,
        label: rowLabel,
        sectionId: section.id,
        sectionName: section.label,
        seats: Array.from({ length: section.seatsPerRow }, (_, index) => {
          const seatNumber = String(index + 1).padStart(2, "0");
          const statusValue = resolveDemoStatus(rowLabel, index);
          const seat: SeatMapSeat = {
            id: `${section.id}-${rowLabel}-${seatNumber}`,
            label: `${rowLabel}${seatNumber}`,
            sectionId: section.id,
            sectionName: section.label,
            rowId: `${section.id}-row-${rowLabel.toLowerCase()}`,
            rowName: rowLabel,
            number: seatNumber,
            pricingZoneId: zone.id,
            price: zone.price,
            status: statusValue,
            color: zone.color,
            x: section.x + index * 18,
            y: section.y + rowIndex * 24,
          };
          seats.push(seat);
          return seat;
        }),
      };
      rows.push(row);
      return row;
    });

    return {
      id: section.id,
      label: section.label,
      name: section.label,
      kind: "seated",
      color: zone.color,
      pricingZoneId: zone.id,
      price: zone.price,
      capacity: sectionRows.reduce((sum, row) => sum + row.seats.length, 0),
      status: "available",
      x: section.x - 22,
      y: section.y - 42,
      width: 292,
      height: 126,
      rows: sectionRows,
    };
  });

  const generalAdmissionAreas: GeneralAdmissionArea[] = [
    { id: "ga-standing", name: "General Admission Standing", capacity: 600, selectedQuantity: 0, pricingZoneId: "zone-general", color: "#22C55E", x: 78, y: 480, width: 584, height: 90 },
  ];

  const tables: VenueObject[] = Array.from({ length: 6 }, (_, index) => ({
    id: `table-${index + 1}`,
    type: "table",
    name: `Table ${index + 1}`,
    capacity: 4,
    pricingZoneId: "zone-couple",
    status: "available" as SeatStatus,
    color: "var(--color-brand-accent)",
    x: 120 + (index % 3) * 130,
    y: 610 + Math.floor(index / 3) * 86,
    width: 58,
    height: 58,
  }));

  const stage: VenueObject = { id: "stage-main", type: "stage", name: "Main Stage", color: "var(--color-brand-primary)", x: 150, y: 28, width: 440, height: 58 };
  const gates: VenueObject[] = [
    { id: "gate-east", type: "gate", name: "Entry Gate East", color: "#3B82F6", x: 24, y: 34, width: 94, height: 36 },
    { id: "gate-west", type: "gate", name: "Entry Gate West", color: "#3B82F6", x: 626, y: 34, width: 94, height: 36 },
  ];

  return {
    id: `layout-${venue.id}`,
    layoutId: `layout-${venue.id}`,
    eventId,
    venueId: venue.id,
    venueName: venue.name,
    venueType: venue.type,
    provider: "custom",
    layoutType: "custom-layout",
    stagePosition: "top",
    currency: "INR",
    floors: [{ id: "floor-main", label: "Main Bowl", sections }],
    sections,
    rows,
    seats,
    generalAdmissionAreas,
    tables,
    stage,
    gates,
    zones: [],
    pricingZones: defaultPricingZones,
    ticketTemplates: defaultTicketTemplates,
    selectedTicketTemplateId: "template-premium-concert",
    status,
    metadata: {
      version: 1,
      createdByRole: role,
      createdById: `${role}-demo-user`,
      status: status === "Published" ? "published" : "draft",
      updatedAt: new Date().toISOString(),
      notes: "Legacy demo only. Final seat maps use seatMapTemplateStore.ts.",
    },
  };
}

function resolveDemoStatus(rowLabel: string, index: number): SeatStatus {
  if (rowLabel === "A" && index === 0) return "sold";
  if (rowLabel === "B" && index === 5) return "locked";
  if (rowLabel === "F" && index === 10) return "disabled";
  if (index === 9 && ["C", "H"].includes(rowLabel)) return "sold";
  return "available";
}
