// import { getPublishedEventSeatConfig } from "@/features/seat-map/eventSeatConfigStore";
// import {
//   getSeatMapTemplateById,
//   readPublishedSeatMapTemplates,
//   toBackendChannel,
// } from "@/features/seat-map/seatMapTemplateStore";
// import type {
//   EventSeatConfig,
//   SeatMapDraftFields,
//   SeatMapTemplate,
//   SeatNode,
// } from "@/features/seat-map/types";

// export type PublicSeatMapBundle = {
//   template?: SeatMapTemplate;
//   config?: EventSeatConfig;
//   seats: SeatNode[];
// };

// export type PublicSeatMapDecisionInput = {
//   eventId: string;
//   seatMapMode?: SeatMapDraftFields["seatMapMode"];
//   templateId?: string;
//   overrideId?: string;
// };

// export function getPublicSeatMapBundle({
//   eventId,
//   templateId,
// }: Omit<PublicSeatMapDecisionInput, "seatMapMode">): PublicSeatMapBundle {
//   const template = templateId
//     ? getSeatMapTemplateById(templateId)
//     : readPublishedSeatMapTemplates()[0];
//   const config = template ? getPublishedEventSeatConfig(eventId, template.id) : undefined;
//   const seats = template ? resolvePublicSeats(template, config).filter(isBookingSeatNode) : [];

//   return { template, config, seats };
// }

// export function shouldShowPublicSeatMap(input: PublicSeatMapDecisionInput) {
//   const publicSeatMap = getPublicSeatMapBundle(input);

//   return (
//     input.seatMapMode === "seat_map" &&
//     Boolean(publicSeatMap.template) &&
//     Boolean(publicSeatMap.config) &&
//     (publicSeatMap.config?.status === "approved" || publicSeatMap.config?.status === "published") &&
//     publicSeatMap.seats.some(isPublicSelectableSeat)
//   );
// }

// export function resolvePublicSeats(template: SeatMapTemplate, config?: EventSeatConfig): SeatNode[] {
//   return template.seats.map((seat) => {
//     const status = config?.seatStatuses[seat.id] ?? seat.status;
//     const salesChannel = config?.channelAllocations[seat.id] ?? toBackendChannel(String(seat.channel ?? seat.salesChannel ?? "buizz_online"));
//     return {
//       ...seat,
//       status,
//       salesChannel,
//       channel: salesChannel,
//       tierId: config?.tiers.find((tier) => tier.id === seat.tierId)?.id ?? seat.tierId,
//     };
//   });
// }

// export function isBookingSeatNode(seat: SeatNode) {
//   return !seat.type || seat.type === "seat" || seat.type === "standing_zone";
// }

// export function isPublicSelectableSeat(seat: SeatNode) {
//   const channel = String(seat.salesChannel ?? seat.channel ?? "");
//   return seat.status === "available" && (channel === "buizz_online" || channel === "online");
// }

import { getPublishedEventSeatConfig } from "@/features/seat-map/eventSeatConfigStore";
import {
  getSeatMapTemplateById,
  readPublishedSeatMapTemplates,
  toBackendChannel,
} from "@/features/seat-map/seatMapTemplateStore";
import type {
  EventSeatConfig,
  SeatMapDraftFields,
  SeatMapTemplate,
  SeatNode,
} from "@/features/seat-map/types";

export type PublicSeatMapBundle = {
  template?: SeatMapTemplate;
  config?: EventSeatConfig;
  seats: SeatNode[];
};

export type PublicSeatMapDecisionInput = {
  eventId: string;
  seatMapMode?: SeatMapDraftFields["seatMapMode"];
  templateId?: string;
  overrideId?: string;
};

export function getPublicSeatMapBundle({
  eventId,
  templateId,
}: Omit<PublicSeatMapDecisionInput, "seatMapMode">): PublicSeatMapBundle {
  const template = templateId
    ? getSeatMapTemplateById(templateId)
    : readPublishedSeatMapTemplates()[0];
  const config = template ? getPublishedEventSeatConfig(eventId, template.id) : undefined;
  const seats = template ? resolvePublicSeats(template, config).filter(isBookingSeatNode) : [];

  return { template, config, seats };
}

export function shouldShowPublicSeatMap(input: PublicSeatMapDecisionInput) {
  const publicSeatMap = getPublicSeatMapBundle(input);

  return (
    input.seatMapMode === "seat_map" &&
    Boolean(publicSeatMap.template) &&
    Boolean(publicSeatMap.config) &&
    (publicSeatMap.config?.status === "approved" || publicSeatMap.config?.status === "published") &&
    publicSeatMap.seats.some(isPublicSelectableSeat)
  );
}

export function resolvePublicSeats(template: SeatMapTemplate, config?: EventSeatConfig): SeatNode[] {
  return template.seats.map((seat) => {
    const status = config?.seatStatuses[seat.id] ?? seat.status;
    const salesChannel = config?.channelAllocations[seat.id] ?? toBackendChannel(String(seat.channel ?? seat.salesChannel ?? "buizz_online"));
    return {
      ...seat,
      status,
      salesChannel,
      channel: salesChannel,
      tierId: config?.tiers.find((tier) => tier.id === seat.tierId)?.id ?? seat.tierId,
    };
  });
}

export function isBookingSeatNode(seat: SeatNode) {
  return !seat.type || seat.type === "seat" || seat.type === "standing_zone";
}

export function isPublicSelectableSeat(seat: SeatNode) {
  const channel = String(seat.salesChannel ?? seat.channel ?? "");
  return seat.status === "available" && (channel === "buizz_online" || channel === "online");
}
