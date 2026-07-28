import { apiSlice } from '../apiSlice';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RazorpayVerifyRequest {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PaymentHistoryEntry {
  id: number;
  payment_id: number;
  order_id: string;
  user_id: number;
  event_id: number;
  booking_id: number;
  gateway: 'razorpay' | 'phonepe' | 'manual';
  gateway_order_id: string;
  gateway_payment_id: string;
  from_status: string | null;
  to_status: string;
  amount: number;
  currency: string;
  payment_method: string;
  source: 'webhook' | 'verify_api' | 'callback' | 'refund' | 'create' | 'manual';
  raw_payload: Record<string, unknown> | null;
  error_code: string | null;
  error_description: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface PaymentStatus {
  payment_id: number;
  order_id: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id: string | null;
  gateway_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  merchantTransactionId: string;
  phonePeTransactionId: string | null;
}

export interface VerifyPaymentResponse {
  success: boolean;
  data: {
    status: string;
    transactionId?: string;
    amount?: number;
    paymentMethod?: string;
    merchantTransactionId?: string;
    phonePeTransactionId?: string;
  };
}

export interface RazorpayVerifyResponse {
  success: boolean;
  message: string;
  data: {
    status: 'COMPLETED' | 'FAILED';
    transactionId: string;
    bookingConfirmation?: {
      tickets: Array<{ ticket_number: string; ticket_type: string; price: number; status: string; qr_code: string }>;
      event: { id: number; title: string; startDate: string; venue: string; banner: string };
      payment: { orderId: string; amount: number; transactionId: string };
    };
  };
}

export interface RefundRequest {
  orderId: string;
  amount?: number;
  reason?: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const paymentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // PhonePe: verify after redirect callback
    verifyPhonePePayment: builder.query<VerifyPaymentResponse, string>({
      query: (orderId) => `/payments/verify/${orderId}`,
      providesTags: (_, __, orderId) => [{ type: 'Payment', id: orderId }],
    }),

    // Get current payment status (polling-friendly)
    getPaymentStatus: builder.query<{ success: boolean; data: PaymentStatus }, string>({
      query: (orderId) => `/payments/status/${orderId}`,
      providesTags: (_, __, orderId) => [{ type: 'Payment', id: orderId }],
    }),

    // Razorpay: verify after popup handler fires
    verifyRazorpayPayment: builder.mutation<RazorpayVerifyResponse, RazorpayVerifyRequest>({
      query: (body) => ({ url: '/payments/razorpay/verify', method: 'POST', body }),
      invalidatesTags: ['Payment', 'Booking'],
    }),

    // Refund (works for both gateways)
    initiateRefund: builder.mutation<{ success: boolean; message: string; data: unknown }, RefundRequest>({
      query: (body) => ({ url: '/payments/refund', method: 'POST', body }),
      invalidatesTags: ['Payment', 'Booking', 'Settlement'],
    }),

    // Full payment history for an order (every status transition)
    getPaymentHistory: builder.query<{ success: boolean; data: PaymentHistoryEntry[] }, string>({
      query: (orderId) => `/payments/history/${orderId}`,
      providesTags: (_, __, orderId) => [{ type: 'Payment', id: `history-${orderId}` }],
    }),

    // User's own payment list
    getUserPayments: builder.query<{
      success: boolean;
      data: { bookings: PaymentStatus[]; page: number; limit: number };
    }, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/bookings', params }),
      providesTags: ['Payment'],
    }),

    // Admin: all payments with filters
    getAllPayments: builder.query<{
      success: boolean;
      data: PaymentStatus[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }, { page?: number; limit?: number; status?: string; gateway?: string; userId?: string; eventId?: string }>({
      query: (params) => ({ url: '/admin/payments', params }),
      providesTags: ['Payment'],
    }),

    // Gateway config check (authenticated)
    getPaymentConfig: builder.query<{
      success: boolean;
      config: {
        phonepe: { clientId: string; isConfigured: boolean; env: string };
        razorpay: { keyId: string; isConfigured: boolean; webhookUrl: string };
      };
    }, void>({
      query: () => '/payments/test-config',
    }),
  }),
  overrideExisting: true,
});

export const {
  useVerifyPhonePePaymentQuery,
  useGetPaymentStatusQuery,
  useVerifyRazorpayPaymentMutation,
  useInitiateRefundMutation,
  useGetPaymentHistoryQuery,
  useGetUserPaymentsQuery,
  useGetAllPaymentsQuery,
  useGetPaymentConfigQuery,
} = paymentsApi;


