import type { Event, TicketBlock, UpdateTicketRatioPayload } from "@/types/buizz";

import { getEventStartDate } from "./eventLifecycle";
import { hoursUntil } from "./dateTime";

export function canChangeTicketRatio(event: Event, now = new Date()) {
  const start = getEventStartDate(event);
  if (!start) return true;
  return hoursUntil(start, now) > 12;
}

export function calculateOnlineOfflineReservedCounts(ticketBlock: TicketBlock) {
  return {
    online: ticketBlock.onlineQuantity,
    offline: ticketBlock.offlineQuantity,
    reserved: ticketBlock.reservedQuantity,
    soldOnline: ticketBlock.soldOnline,
    soldOffline: ticketBlock.soldOffline,
    soldReserved: ticketBlock.soldReserved,
  };
}

export function validateTicketRatio(payload: UpdateTicketRatioPayload) {
  const total =
    payload.ratio.onlinePercentage +
    payload.ratio.offlinePercentage +
    payload.ratio.reservedPercentage;

  return {
    isValid: total === 100,
    message: total === 100 ? "Ticket ratio is valid." : "Online, offline, and reserved percentages must total 100.",
  };
}
