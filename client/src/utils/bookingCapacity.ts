import type { BookingSource, TicketBlock } from "@/types/buizz";

export function calculateAvailableSeats(ticketBlock: TicketBlock, source: BookingSource = "online") {
  if (source === "offline") return Math.max(0, ticketBlock.offlineQuantity - ticketBlock.soldOffline);
  if (source === "reserved") return Math.max(0, ticketBlock.reservedQuantity - ticketBlock.soldReserved);
  return Math.max(0, ticketBlock.onlineQuantity - ticketBlock.soldOnline);
}

export function hasCapacity(ticketBlock: TicketBlock, quantity: number, source: BookingSource = "online") {
  return calculateAvailableSeats(ticketBlock, source) >= quantity;
}
