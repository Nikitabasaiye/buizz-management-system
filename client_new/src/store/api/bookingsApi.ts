import { baseApi } from './baseApi';

interface Booking {
  id: number;
  order_id: string;
  user_id: number;
  event_id: number;
  ticket_type_id: number;
  quantity: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded';
  created_at: string;
  updated_at: string;
}

interface BookingResponse {
  status: string;
  data: Booking;
}

interface InitiateBookingRequest {
  eventId: number;
  ticketTypeId: number;
  quantity?: number;
}

interface InitiateBookingResponse {
  status: string;
  data: {
    booking: Booking;
    payment: {
      order_id: string;
      redirect_url: string;
    };
  };
}

interface UserBookingsResponse {
  status: string;
  data: Booking[];
}

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserBookings: builder.query<UserBookingsResponse, void>({
      query: () => '/bookings',
      providesTags: ['Bookings'],
    }),
    initiateBooking: builder.mutation<InitiateBookingResponse, InitiateBookingRequest>({
      query: (booking) => ({
        url: '/bookings/initiate',
        method: 'POST',
        body: booking,
      }),
      invalidatesTags: ['Bookings', 'Payments'],
    }),
    verifyPayment: builder.query<BookingResponse, string>({
      query: (orderId) => `/bookings/verify/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: 'Bookings', id: orderId }],
    }),
    getBookingDetails: builder.query<BookingResponse, string>({
      query: (orderId) => `/bookings/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: 'Bookings', id: orderId }],
    }),
  }),
});

export const {
  useGetUserBookingsQuery,
  useInitiateBookingMutation,
  useVerifyPaymentQuery,
  useLazyVerifyPaymentQuery,
  useGetBookingDetailsQuery,
} = bookingsApi;
