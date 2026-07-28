import { apiSlice } from '../apiSlice';

export interface BankAccount {
  id: number;
  organizerId: number;
  accountHolderName: string;
  bankAccountNumber: string | null;
  bankIfscCode: string;
  bankName: string | null;
  upiId: string | null;
  isVerified: boolean;
  isActive: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt: string | null;
  rejectionReason: string | null;
  hasDocuments: boolean;
}

export interface SettlementItem {
  id: number;
  paymentId: number;
  bookingId: number | null;
  eventId: number;
  organizerId: number;
  grossAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  netAmount: number;
  currency: string;
  eligibleAt: string;
  status: 'pending' | 'included' | 'settled' | 'cancelled';
  settlementId: number | null;
  orderId?: string;
  transactionId?: string;
  bookingNumber?: string;
}

export interface Settlement {
  settlement_id: number;
  settlement_number: string;
  organizer_id: number;
  event_id: number;
  gross_amount: number;
  platform_fee_percent: number;
  platform_fee_amount: number;
  net_amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  scheduled_at: string;
  processed_at: string | null;
  paid_at: string | null;
  payout_reference: string | null;
  bank_reference_id: string | null;
  notes: string | null;
  bank_account_snapshot: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  organizer_name: string;
  organizer_email: string;
  event_title: string;
  event_end_date: string;
  items?: SettlementItem[];
}

export interface OrganizerSummary {
  totals: {
    totalPaymentCount: number;
    totalGrossAmount: number;
    totalPlatformFeeAmount: number;
    totalNetAmount: number;
    pendingNetAmount: number;
    eligibleNetAmount: number;
    processingNetAmount: number;
    settledNetAmount: number;
    cancelledNetAmount: number;
  };
  settlementsByStatus: Array<{ status: string; settlementCount: number; netAmount: number }>;
  upcoming: Array<{
    eventId: number;
    eventTitle: string;
    eventStatus: string;
    paymentCount: number;
    netAmount: number;
    eligibleAt: string;
  }>;
}

export interface EligibleGroup {
  organizer_id: number;
  event_id: number;
  payment_count: number;
  gross_amount: number;
  platform_fee_percent: number;
  platform_fee_amount: number;
  net_amount: number;
  first_eligible_at: string;
  event_title: string;
  event_end_date: string;
  organizer_name: string;
  organizer_email: string;
}

export const settlementApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Organizer: get own bank account
    getMyBankAccount: builder.query<{ success: boolean; data: BankAccount | null }, void>({
      query: () => '/settlements/bank-account/me',
      providesTags: ['Settlement'],
    }),

    // Admin: get organizer bank account
    getOrganizerBankAccount: builder.query<{ success: boolean; data: BankAccount | null }, number>({
      query: (organizerId) => `/settlements/bank-account/${organizerId}`,
      providesTags: (_, __, id) => [{ type: 'Settlement', id }],
    }),

    // Organizer: save own bank account (with documents via FormData)
    saveMyBankAccount: builder.mutation<{ success: boolean; message: string; data: BankAccount }, FormData>({
      query: (body) => ({
        url: '/settlements/bank-account',
        method: 'POST',
        body,
        // Don't set Content-Type — browser sets multipart/form-data with boundary
        formData: true,
      }),
      invalidatesTags: ['Settlement'],
    }),

    // Admin: verify organizer bank account
    adminVerifyBankAccount: builder.mutation<
      { success: boolean; message: string; data: BankAccount },
      { organizerId: number; status: 'verified' | 'rejected'; rejectionReason?: string }
    >({
      query: ({ organizerId, ...body }) => ({
        url: `/settlements/bank-account/${organizerId}/verify`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Settlement'],
    }),

    // Organizer: get own settlement summary
    getMySummary: builder.query<{ success: boolean; data: OrganizerSummary }, void>({
      query: () => '/settlements/summary/me',
      providesTags: ['Settlement'],
    }),

    // Admin: get organizer settlement summary
    getOrganizerSummary: builder.query<{ success: boolean; data: OrganizerSummary }, number>({
      query: (organizerId) => `/settlements/summary/${organizerId}`,
      providesTags: (_, __, id) => [{ type: 'Settlement', id }],
    }),

    // Admin: get eligible settlement groups
    getEligibleGroups: builder.query<
      { success: boolean; data: EligibleGroup[] },
      { organizerId?: number; eventId?: number } | void
    >({
      query: (params) => ({ url: '/settlements/eligible', params: params ?? undefined }),
      providesTags: ['Settlement'],
    }),

    // Admin: generate settlement for one organizer+event
    generateSettlement: builder.mutation<
      { success: boolean; message: string; data: Settlement },
      { organizerId: number; eventId: number }
    >({
      query: (body) => ({ url: '/settlements/generate', method: 'POST', body }),
      invalidatesTags: ['Settlement'],
    }),

    // Admin: generate all eligible settlements
    generateAllEligibleSettlements: builder.mutation<
      { success: boolean; message: string; data: { generatedCount: number; skippedCount: number; results: any[] } },
      void
    >({
      query: () => ({ url: '/settlements/generate/all-eligible', method: 'POST' }),
      invalidatesTags: ['Settlement'],
    }),

    // List settlements (organizer sees own, admin sees all)
    getSettlements: builder.query<
      { success: boolean; data: { settlements: Settlement[]; pagination: any } },
      { organizerId?: number; eventId?: number; status?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({ url: '/settlements', params: params ?? undefined }),
      providesTags: ['Settlement'],
    }),

    // Get single settlement with items
    getSettlementById: builder.query<{ success: boolean; data: Settlement }, number>({
      query: (id) => `/settlements/${id}`,
      providesTags: (_, __, id) => [{ type: 'Settlement', id }],
    }),

    // Admin: update settlement status (processing, paid, failed, cancelled)
    updateSettlementStatus: builder.mutation<
      { success: boolean; message: string; data: Settlement },
      {
        id: number;
        status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
        payoutReference?: string;
        bankReferenceId?: string;
        notes?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/settlements/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Settlement'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyBankAccountQuery,
  useGetOrganizerBankAccountQuery,
  useSaveMyBankAccountMutation,
  useAdminVerifyBankAccountMutation,
  useGetMySummaryQuery,
  useGetOrganizerSummaryQuery,
  useGetEligibleGroupsQuery,
  useGenerateSettlementMutation,
  useGenerateAllEligibleSettlementsMutation,
  useGetSettlementsQuery,
  useGetSettlementByIdQuery,
  useUpdateSettlementStatusMutation,
} = settlementApi;
