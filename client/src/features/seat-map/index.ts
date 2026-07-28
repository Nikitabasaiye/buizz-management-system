export {
  SeatMapBuilderPage,
  EventSeatMapPreview,
  OrganizerSeatMapPersonalizationPanel,
  readSeatMapTemplates as readSeatMapTemplatesFromBuilder,
  writeSeatMapTemplates as writeSeatMapTemplatesFromBuilder,
  readPublishedSeatMapTemplates as readPublishedSeatMapTemplatesFromBuilder,
  getDefaultSeatMapTemplateForVenue as getDefaultSeatMapTemplateForVenueFromBuilder,
  getSeatMapTemplatesForVenue as getSeatMapTemplatesForVenueFromBuilder,
  readOrCreateOrganizerOverride,
  readOrganizerOverrideById,
  readOrganizerSeatMapSnapshot,
  saveOrganizerOverride,
  type OrganizerSeatMapSnapshot,
} from "./SeatMapBuilderPage";

// Legacy booking components used by BookingFlow.tsx
export { SeatLegend } from "@/components/seat-map/SeatLegend";
export { SeatMapRenderer } from "@/components/seat-map/SeatMapRenderer";
export { PriceSummary } from "@/components/seat-map/PriceSummary";
export { SelectedItemsPanel } from "@/components/seat-map/SelectedItemsPanel";

// Final shared exports
export * from "./types";
export * from "./constants";
export * from "./seatHoldStore";
export * from "./eventSeatConfigStore";
export * from "./publicSeatMapService";

// Avoid export * from sampleLayouts because it duplicates utils names.
export {
  bookingTechniqueLabels,
  buildLayoutFromDraft,
  buildLineItemsFromSeatSelection,
  defaultBuilderDraft,
  defaultSeatMapPermissions,
  getLayoutStats,
  getVenueLayoutForItem,
  mockSeatMapLayouts,
} from "./sampleLayouts";

export {
  disabledSeatStatuses,
  formatCurrency,
  formatLayoutType,
  formatSeatMapDate,
  getEventSeatCounts,
  getSeatStatusLabel,
  resolveSelectionKind,
  seatStatusStyles,
  selectionTotal,
} from "./utils";
