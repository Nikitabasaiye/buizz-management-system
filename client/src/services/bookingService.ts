export {
  useInitiateBookingMutation,
  useVerifyPaymentQuery,
  useGetBookingDetailsQuery,
  useGetUserBookingsQuery,
} from "@/store/api/bookingsApi";

export type DashboardBookingRecord = Record<string, any> & {
  eventId?: string;
  source?: "online" | "offline" | "reserved" | string;
  totalAmount?: number;
  amount?: number;
  amountCollected?: number;
};

export const bookingService = {
  getOrganizerBookings: (_organizerId?: string): DashboardBookingRecord[] => [],
  getAdminBookings: (): DashboardBookingRecord[] => [],
  getSuperAdminBookings: (): DashboardBookingRecord[] => [],
};
