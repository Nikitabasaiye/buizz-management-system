import {
  readOrganizerSeatOverrides,
  readSeatMapTemplates,
  resolveOverrideNodes,
} from "@/features/seat-map/seatMapStorage";
import type {
  OrganizerSeatMapOverride,
  SeatMapMode,
  SeatMapTemplate,
  SeatNode,
} from "@/features/seat-map/seatMapTypes";

export type PublicSeatMapBundle = {
  template?: SeatMapTemplate;
  override?: OrganizerSeatMapOverride;
  seats: SeatNode[];
};

export type PublicSeatMapDecisionInput = {
  eventId: string;
  seatMapMode?: SeatMapMode;
  templateId?: string;
  overrideId?: string;
};

export function getPublicSeatMapBundle({
  eventId,
  templateId,
  overrideId,
}: Omit<PublicSeatMapDecisionInput, "seatMapMode">): PublicSeatMapBundle {
  const templates = readSeatMapTemplates();
  const overrides = readOrganizerSeatOverrides();
  const template = templateId
    ? templates.find((item) => item.id === templateId && isPublishedTemplate(item))
    : templates.find(isPublishedTemplate);
  const override = overrideId
    ? overrides.find((item) => item.id === overrideId)
    : overrides.find((item) => item.eventId === eventId && item.templateId === template?.id);
  const seats = template ? resolveOverrideNodes(template, override).filter(isBookingSeatNode) : [];

  return { template, override, seats };
}

export function shouldShowPublicSeatMap(input: PublicSeatMapDecisionInput) {
  const publicSeatMap = getPublicSeatMapBundle(input);

  return (
    input.seatMapMode === "seat_map" &&
    Boolean(publicSeatMap.template) &&
    Boolean(publicSeatMap.override) &&
    publicSeatMap.override?.approvalStatus !== "Rejected" &&
    publicSeatMap.seats.some(isPublicSelectableSeat)
  );
}

export function isBookingSeatNode(seat: SeatNode) {
  return seat.type === "seat" || seat.type === "standing_zone";
}

export function isPublicSelectableSeat(seat: SeatNode) {
  return seat.salesChannel === "buizz_online" && seat.status === "available";
}

function isPublishedTemplate(template: SeatMapTemplate) {
  return template.status === "Active" || template.status === "active";
}
