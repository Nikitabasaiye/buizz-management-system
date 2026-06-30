import { baseApi } from './baseApi';

interface Payment {
  id: number;
  order_id: string;
  booking_id: number;
  user_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  provider: string;
  provider_payment_id?: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  gateway_response?: unknown;
  created_at: string;
  updated_at: string;
}

interface PaymentResponse {
  status: string;
  data: Payment;
}

interface CreatePaymentRequest {
  eventId: number;
  amount: number;
  tickets?: unknown[];
}

interface CreatePaymentResponse {
  status: string;
  data: {
    payment: Payment;
    redirect_url: string;
  };
}

interface RefundRequest {
  orderId: string;
  amount?: number;
  reason?: string;
}

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createPayment: builder.mutation<CreatePaymentResponse, CreatePaymentRequest>({
      query: (payment) => ({
        url: '/payments/create',
        method: 'POST',
        body: payment,
      }),
      invalidatesTags: ['Payments'],
    }),
    verifyPayment: builder.query<PaymentResponse, string>({
      query: (orderId) => `/payments/verify/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: 'Payments', id: orderId }],
    }),
    getPaymentStatus: builder.query<PaymentResponse, string>({
      query: (orderId) => `/payments/status/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: 'Payments', id: orderId }],
    }),
    initiateRefund: builder.mutation<{ status: string; message: string }, RefundRequest>({
      query: (refund) => ({
        url: '/payments/refund',
        method: 'POST',
        body: refund,
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Payments', id: orderId }, 'Payments', 'Bookings'],
    }),
  }),
});

export const {
  useCreatePaymentMutation,
  useVerifyPaymentQuery,
  useLazyVerifyPaymentQuery,
  useGetPaymentStatusQuery,
  useLazyGetPaymentStatusQuery,
  useInitiateRefundMutation,
} = paymentsApi;
