"use client";

import type { BuizzTicketData } from "@/features/tickets";
import { ticketStorage } from "@/features/tickets/ticketStorage";

export function readUserTickets() {
  return ticketStorage.getUserTickets();
}

export function saveUserTicket(ticket: BuizzTicketData) {
  const existing = ticketStorage.getUserTickets();
  ticketStorage.setUserTickets([
    ticket,
    ...existing.filter((item) => item.ticketId !== ticket.ticketId && item.bookingId !== ticket.bookingId),
  ]);
}

export function saveUserTickets(tickets: BuizzTicketData[]) {
  const seen = new Set<string>();
  ticketStorage.setUserTickets(tickets.filter((ticket) => {
    const key = ticket.bookingId || ticket.ticketId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
}
