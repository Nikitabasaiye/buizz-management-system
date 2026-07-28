import type { BookingFilters, EventFilters, RevenueFilters } from "@/types/buizz";
import { bookingService } from "./bookingService";
import { eventService } from "./eventService";
import { revenueService } from "./revenueService";
import { settlementService } from "./settlementService";

export const reportService = {
  getBookingReport: (_filters?: BookingFilters) => bookingService.getAdminBookings(),
  getRevenueReport: (_filters?: RevenueFilters) => revenueService.getSuperAdminRevenue(),
  getEventReport: (_filters?: EventFilters) => eventService.getEventHistory().concat(eventService.getPublicEvents()),
  getOrganizerReport: (organizerId: string) => ({
    events: eventService.getOrganizerEvents({ organizerId }),
    bookings: bookingService.getOrganizerBookings(organizerId),
    revenue: revenueService.getOrganizerRevenue(organizerId),
    settlements: settlementService.getSettlementSummary({ organizerId }),
  }),
  getSettlementReport: (_filters?: RevenueFilters) => settlementService.getSettlementSummary(),
  exportPlaceholder: (name: string) => ({ fileName: `${name}-${Date.now()}.csv`, status: "ready" as const }),
};
