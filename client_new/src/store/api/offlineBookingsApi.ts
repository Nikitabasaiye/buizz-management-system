import { baseApi } from './baseApi';

interface OfflineBookingRequest {
  eventId: number;
  ticketTypeId: number;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  userId?: number;
}

interface OfflineBooking {
  bookingId: number;
  bookingNumber: string;
  orderId: string;
  amount: number;
  quantity: number;
  paymentMethod: string;
}

interface Ticket {
  ticket_id: number;
  ticket_number: string;
  ticket_type: string;
  price: number;
  status: string;
  qr_code: string;
}

interface OfflineBookingResponse {
  status: string;
  data: {
    booking: OfflineBooking;
    tickets: Ticket[];
    event: {
      id: number;
      title: string;
      startDate: string;
      venue: string;
    };
  };
}

interface OfflineBookingListResponse {
  status: string;
  data: {
    bookings: any[];
    page: number;
    limit: number;
  };
}

interface TicketLimitResponse {
  status: string;
  data: {
    currentTickets: number;
    remaining: number;
  };
}

export const offlineBookingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createOfflineBooking: builder.mutation<OfflineBookingResponse, OfflineBookingRequest>({
      query: (booking) => ({
        url: '/bookings/offline',
        method: 'POST',
        body: booking,
      }),
      invalidatesTags: ['OfflineBookings', 'Bookings', 'Tickets'],
    }),
    getOfflineBookings: builder.query<OfflineBookingListResponse, { eventId?: number; page?: number; limit?: number }>({
      query: (params = {}) => ({
        url: '/bookings/offline/list',
        params,
      }),
      providesTags: ['OfflineBookings'],
    }),
    checkTicketLimit: builder.query<TicketLimitResponse, number>({
      query: (eventId) => `/bookings/limit/${eventId}`,
    }),
  }),
});

export const {
  useCreateOfflineBookingMutation,
  useGetOfflineBookingsQuery,
  useCheckTicketLimitQuery,
} = offlineBookingsApi;
