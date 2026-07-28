import { apiSlice } from '../apiSlice';
import { toastUtils } from '@/utils/toast';

export interface BookingTicket {
  ticketNumber: string;
  ticketType: string;
  price: number;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  qrCode: string;
}

export interface BookingDetails {
  orderId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  transactionId?: string;
  event?: { id?: number; title?: string; startDate?: string; venue?: { name?: string; city?: string } | string; banner?: string };
  tickets?: BookingTicket[];
  // Legacy fields returned by older API deployments.
  eventTitle?: string;
  eventDate?: string;
  eventId?: number;
  ticketCount?: number;
  createdAt: string;
}

export interface AdminBookingDetails {
  id: string;
  orderId: string;
  bookingNumber: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  transactionId: string;
  event: { id: string; title: string; startDate: string; venue?: { name: string; city?: string } | string; type: string };
  user: { id: string; name: string; email: string; phone: string };
  totalTickets: number;
  paymentStatus: string;
  createdAt: string;
}

export interface InitiateBookingRequest {
  eventId: number;
  ticketTypeId: number;
  quantity: number;
  platformFee?: number;
  convenienceFee?: number;
  taxes?: number;
}

export interface InitiateBookingResponse {
  success: boolean;
  message: string;
  data: {
    orderId: string;
    bookingNumber: string;
    gateway: 'phonepe' | 'razorpay';
    // PhonePe
    paymentUrl?: string;
    // Razorpay
    razorpayOrderId?: string;
    razorpayKeyId?: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    // Common
    amount: number;
    currency: string;
    ticketType: string;
    quantity: number;
    expiresAt: string;
  };
}

export const bookingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    initiateBooking: builder.mutation<InitiateBookingResponse, InitiateBookingRequest>({
      query: (body) => ({ url: '/bookings/initiate', method: 'POST', body }),
      invalidatesTags: ['Booking', 'Event'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Booking initiated successfully');
        } catch (error) {
          toastUtils.error('Failed to initiate booking');
        }
      },
    }),

    verifyPayment: builder.query<{ success: boolean; data: { status: string; transactionId: string; amount: number } }, string>({
      query: (orderId) => `/bookings/verify/${orderId}`,
      providesTags: (_, __, orderId) => [{ type: 'Booking', id: orderId }],
    }),

    getBookingDetails: builder.query<{ success: boolean; data: BookingDetails }, string>({
      query: (orderId) => `/bookings/${orderId}`,
      providesTags: (_, __, orderId) => [{ type: 'Booking', id: orderId }],
    }),

    getUserBookings: builder.query<{
      success: boolean;
      data: { bookings: BookingDetails[]; page: number; limit: number };
    }, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/bookings', params }),
      providesTags: ['Booking'],
    }),

    getAllBookings: builder.query<{
      success: boolean;
      data: AdminBookingDetails[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }, { page?: number; limit?: number; status?: string; eventId?: string }>({
      query: (params) => ({ url: '/bookings-management', params }),
      transformResponse: (response: {
        success?: boolean;
        data?: AdminBookingDetails[] | { bookings?: AdminBookingDetails[]; pagination?: unknown };
        pagination?: unknown;
      }) => {
        const d = response?.data;
        const bookings = Array.isArray(d)
          ? d
          : Array.isArray((d as { bookings?: AdminBookingDetails[] })?.bookings)
            ? (d as { bookings: AdminBookingDetails[] }).bookings
            : [];
        const pagination = response?.pagination ??
          (Array.isArray(d) ? undefined : (d as { pagination?: unknown })?.pagination);
        return {
          success: response?.success ?? true,
          data: bookings,
          pagination: (pagination as { page: number; limit: number; total: number; pages: number }) ?? {
            page: 1,
            limit: 10,
            total: bookings.length,
            pages: 1,
          },
        };
      },
      providesTags: ['Booking'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useInitiateBookingMutation,
  useVerifyPaymentQuery,
  useGetBookingDetailsQuery,
  useGetUserBookingsQuery,
  useGetAllBookingsQuery,
} = bookingsApi;
