import type { TicketType } from "./event";

export type BookingStatus = "pending" | "confirmed" | "failed" | "cancelled" | "refunded";

export type BookingTicketSelection = {
  ticketType: TicketType;
  quantity: number;
};
