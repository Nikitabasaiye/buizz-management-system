import type { CreateSupportTicketPayload, SupportTicket } from "@/types/buizz";

export const supportService = {
  getTickets(filters?: { status?: SupportTicket["status"] | "all"; priority?: SupportTicket["priority"] | "all"; requesterId?: string }) {
    // Stub: Mock API store removed, returning empty array
    return [];
  },
  createTicket(payload: CreateSupportTicketPayload) {
    // Stub: Mock API store removed, returning empty object
    return {} as any;
  },
  updateTicket(payload: Partial<SupportTicket> & { id: string }) {
    // Stub: Mock API store removed, returning null
    return null;
  },
};
