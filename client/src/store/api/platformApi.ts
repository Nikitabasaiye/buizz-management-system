import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { toastUtils } from '@/utils/toast';

const PLATFORM_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const SESSION_KEYS = [
  'buizz-super-admin-session',
  'buizz-super_admin-session',
  'buizz-super-admin',
  'buizz-admin-session',
  'buizz-admin',
];

type StoredPlatformSession = {
  token?: string;
  refreshToken?: string;
  role?: string;
  [key: string]: any;
};

function getSessionToken(session: StoredPlatformSession): string | undefined {
  return session?.token ?? session?.state?.session?.token ?? session?.state?.token;
}

function getSessionRefreshToken(session: StoredPlatformSession): string | undefined {
  return session?.refreshToken ?? session?.state?.session?.refreshToken ?? session?.state?.refreshToken;
}

function readStoredSession(): { key: string; session: StoredPlatformSession } | undefined {
  if (typeof window === 'undefined') return undefined;
  for (const key of SESSION_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const session = JSON.parse(raw);
      const token = getSessionToken(session);
      if (token) return { key, session: { ...session, token, refreshToken: getSessionRefreshToken(session) } };
    } catch {}
  }
  return undefined;
}

function getStoredToken(): string | undefined {
  return readStoredSession()?.session.token;
}

function updateStoredSession(key: string, session: StoredPlatformSession, token: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify({
    ...session,
    token,
    refreshToken: refreshToken ?? session.refreshToken,
  }));
}

function clearStoredSession(key?: string) {
  if (typeof window === 'undefined') return;
  if (key) {
    localStorage.removeItem(key);
    return;
  }
  SESSION_KEYS.forEach((sessionKey) => localStorage.removeItem(sessionKey));
}

const rawPlatformBaseQuery = fetchBaseQuery({
  baseUrl: PLATFORM_API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as any;
    const stateRole = state?.auth?.user?.role;
    const stateToken =
      stateRole === 'admin' || stateRole === 'super_admin'
        ? state?.auth?.token
        : undefined;
    const token = getStoredToken() || stateToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    headers.set('content-type', 'application/json');
    return headers;
  },
  credentials: 'include',
});

const platformBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawPlatformBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) {
    return result;
  }

  const stored = readStoredSession();
  const refreshToken = stored?.session.refreshToken;
  if (!stored || !refreshToken) {
    return result;
  }

  const refreshResult = await rawPlatformBaseQuery(
    {
      url: '/auth/refresh-token',
      method: 'POST',
      body: { refreshToken },
    },
    api,
    extraOptions,
  ) as any;

  const nextToken: string | undefined =
    refreshResult.data?.data?.token ?? refreshResult.data?.token;
  const nextRefreshToken: string | undefined =
    refreshResult.data?.data?.refreshToken ?? refreshResult.data?.refreshToken;

  if (!nextToken) {
    clearStoredSession(stored.key);
    return result;
  }

  updateStoredSession(stored.key, stored.session, nextToken, nextRefreshToken);
  result = await rawPlatformBaseQuery(args, api, extraOptions);
  return result;
};

// Types
export interface Organizer {
  id: string;
  organizationName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  city: string;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  events?: number;
  revenue?: number;
  createdAt?: string;
  verifiedAt?: string;
}

export interface Event {
  id: string;
  name: string;
  organizerId: string;
  organizerName?: string;
  description?: string;
  city: string;
  category: string;
  ticketType: 'free' | 'paid';
  status: 'pending' | 'approved' | 'rejected' | 'live' | 'completed';
  startDate: string;
  endDate: string;
  revenue?: number;
  bookings?: number;
  totalCapacity?: number;
  createdAt?: string;
}

export interface PlatformUser {
  id: string;
  displayId?: string | number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'organizer' | 'admin' | 'super_admin';
  status: 'active' | 'blocked' | 'watchlist';
  tickets?: number;
  city?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface DashboardMetrics {
  totalOrganizers: number;
  totalEvents: number;
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  pendingApprovals: number;
  activeEvents: number;
  liveEvents: number;
}

export interface ApprovalQueueItem {
  id: string;
  type: 'organizer' | 'event' | 'payout';
  title: string;
  owner: string;
  city?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high';
  details?: Record<string, any>;
}

export interface KycRequest {
  id: string | number;
  user_id: string | number;
  role: string;
  status: 'pending' | 'verified' | 'rejected';
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  legal_name?: string;
  business_name?: string;
  city?: string;
  state?: string;
  pincode?: string;
  pan_number?: string;
  gst_number?: string | null;
  address_line?: string;
  documents?: any[];
  bank_documents?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface RevenueMetric {
  label: string;
  value: number;
  currency: string;
  change: number;
  changePercent: number;
}

export const platformApi = createApi({
  reducerPath: 'platformApi',
  baseQuery: platformBaseQuery,
  tagTypes: ['Organizers', 'Events', 'Users', 'Approvals', 'Metrics', 'Revenue', 'Bookings', 'Reviews', 'Approval'],
  endpoints: (builder) => ({
    // Dashboard Metrics
    getDashboardMetrics: builder.query<{ status: 'success'; data: DashboardMetrics }, void>({
      query: () => '/dashboard/metrics',
      providesTags: ['Metrics'],
    }),

    // Organizers
    getOrganizers: builder.query<
      { status: 'success'; data: Organizer[]; total: number },
      { page?: number; limit?: number; status?: string; search?: string }
    >({
      query: (params) => ({
        url: '/organizers',
        params,
      }),
      providesTags: ['Organizers'],
    }),

    getOrganizerById: builder.query<{ status: 'success'; data: Organizer }, string>({
      query: (id) => `/organizers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Organizers', id }],
    }),

    getOrganizerKycDetails: builder.query<{ success: boolean; data: any }, string>({
      query: (id) => ({
        url: `/admin/analytics/organizers/${id}/kyc`,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      providesTags: (result, error, id) => [{ type: 'Organizers', id }],
    }),

    updateOrganizerStatus: builder.mutation<
      { status: 'success'; data: Organizer },
      { id: string; newStatus: string; reason?: string }
    >({
      query: ({ id, newStatus, reason }) => ({
        url: `/organizers/${id}/status`,
        method: 'PATCH',
        body: { status: newStatus, reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Organizers', id },
        'Approvals',
        'Metrics',
      ],
    }),

    // Events
    getEvents: builder.query<
      { status: 'success'; data: Event[]; total: number },
      { page?: number; limit?: number; status?: string; organizerId?: string; search?: string }
    >({
      query: (params) => ({
        url: '/events',
        params,
      }),
      providesTags: ['Events'],
    }),

    getEventById: builder.query<{ status: 'success'; data: Event }, string>({
      query: (id) => `/events/${id}`,
      providesTags: (result, error, id) => [{ type: 'Events', id }],
    }),

    getEventBySlug: builder.query<{ status: 'success'; data: Event }, string>({
      query: (slug) => `/events/slug/${slug}`,
      providesTags: (result, error, slug) => [{ type: 'Events', id: slug }],
    }),

    updateEventStatus: builder.mutation<
      { status: 'success'; data: Event },
      { id: string; newStatus: string; reason?: string }
    >({
      query: ({ id, newStatus, reason }) => ({
        url: `/events/${id}/status`,
        method: 'PATCH',
        body: { status: newStatus, reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Events', id },
        'Approvals',
        'Metrics',
      ],
    }),

    // Bookings
    getUserBookings: builder.query<
      { status: 'success'; data: any[]; total: number },
      { page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/bookings',
        params,
      }),
      providesTags: ['Bookings'],
    }),

    getOrganizerBookings: builder.query<
      { status: 'success'; data: any[]; total: number },
      { organizerId: string; page?: number; limit?: number }
    >({
      query: ({ organizerId, ...params }) => ({
        url: `/bookings/organizer/${organizerId}`,
        params,
      }),
      providesTags: ['Bookings'],
    }),

    getAllBookings: builder.query<
      { status: 'success'; data: any[]; total: number },
      { page?: number; limit?: number; status?: string; search?: string }
    >({
      query: (params) => ({
        url: '/bookings-management',
        params,
      }),
      providesTags: ['Bookings'],
    }),

    getBookingById: builder.query<{ status: 'success'; data: any }, string>({
      query: (orderId) => `/bookings/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: 'Bookings', id: orderId }],
    }),

    initiateBooking: builder.mutation<
      { status: 'success'; data: any },
      { eventId: number; ticketTypeId: number; quantity?: number }
    >({
      query: (body) => ({
        url: '/bookings/initiate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bookings'],
    }),

    createOfflineBooking: builder.mutation<
      { status: 'success'; data: any },
      { eventId: number; ticketTypeId: number; quantity: number; customerEmail: string; customerName: string; customerPhone: string; customerPhoneVerificationToken: string; paymentMode?: string; paymentReference?: string }
    >({
      query: (body) => ({
        url: '/bookings/offline',
        method: 'POST',
        body,
        headers: { 'x-buizz-role': 'organizer' },
      }),
      invalidatesTags: ['Bookings'],
    }),

    // Users
    getPlatformUsers: builder.query<
      { status: 'success'; data: PlatformUser[]; total: number },
      { page?: number; limit?: number; role?: string; status?: string; search?: string }
    >({
      query: (params) => ({
        url: '/users',
        params,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      providesTags: ['Users'],
    }),

    getPlatformUserById: builder.query<{ status: 'success'; data: PlatformUser }, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'Users', id }],
    }),

    updateUserStatus: builder.mutation<
      { status: 'success'; data: PlatformUser },
      { id: string; newStatus: string; reason?: string }
    >({
      query: ({ id, newStatus, reason }) => ({
        url: `/users/${id}/status`,
        method: 'PATCH',
        body: { status: newStatus, reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Users', id }, 'Metrics'],
    }),

    // Approvals Queue
    getApprovalQueue: builder.query<
      { status: 'success'; data: ApprovalQueueItem[]; total: number },
      { page?: number; limit?: number; type?: string; status?: string }
    >({
      query: (params) => ({
        url: '/approvals',
        params,
      }),
      providesTags: ['Approvals'],
    }),

    getApprovalStats: builder.query<{ status: 'success'; data: any }, void>({
      query: () => '/approvals/stats',
      providesTags: ['Approvals'],
    }),

    getKycRequests: builder.query<
      { success: boolean; data: { requests: KycRequest[]; pagination: any } },
      { page?: number; limit?: number; status?: string; role?: string }
    >({
      query: (params) => ({
        url: '/kyc/all-requests',
        params,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      providesTags: ['Approvals', 'Organizers'],
    }),

    reviewKycRequest: builder.mutation<
      any,
      { requestId: string | number; status: 'verified' | 'rejected'; bankStatus?: 'verified' | 'rejected'; rejectionReason?: string; reviewNotes?: string }
    >({
      query: ({ requestId, ...body }) => ({
        url: `/kyc/requests/${requestId}/review`,
        method: 'PATCH',
        body,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      invalidatesTags: ['Approvals', 'Organizers'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('KYC review completed successfully');
        } catch (error) {
          toastUtils.error('Failed to review KYC request');
        }
      },
    }),

    approveItem: builder.mutation<
      { status: 'success'; data: ApprovalQueueItem },
      { id: string; type: string; remarks?: string }
    >({
      query: ({ id, type, remarks }) => ({
        url: `/approvals/${id}/admin-review`,
        method: 'POST',
        body: { status: 'approved', comments: remarks },
      }),
      invalidatesTags: ['Approvals', 'Organizers', 'Events', 'Metrics'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Item approved successfully');
        } catch (error) {
          toastUtils.error('Failed to approve item');
        }
      },
    }),

    rejectItem: builder.mutation<
      { status: 'success'; data: ApprovalQueueItem },
      { id: string; type: string; reason: string }
    >({
      query: ({ id, type, reason }) => ({
        url: `/approvals/${id}/admin-review`,
        method: 'POST',
        body: { status: 'rejected', comments: reason },
      }),
      invalidatesTags: ['Approvals', 'Organizers', 'Events'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Item rejected successfully');
        } catch (error) {
          toastUtils.error('Failed to reject item');
        }
      },
    }),

    reviewEventApproval: builder.mutation<
      { success?: boolean; status?: string; message?: string; data?: any },
      { id: string | number; status: 'approved' | 'rejected'; comments?: string }
    >({
      query: ({ id, status, comments }) => ({
        url: `/approvals/${id}/super-admin-review`,
        method: 'POST',
        body: { status, comments },
      }),
      invalidatesTags: ['Approvals', 'Events', 'Metrics'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Event review completed successfully');
        } catch (error) {
          toastUtils.error('Failed to review event');
        }
      },
    }),

    // Revenue Analytics
    getRevenueMetrics: builder.query<
      { status: 'success'; data: RevenueMetric[] },
      { period?: '7d' | '30d' | '90d' | 'all' }
    >({
      query: (params) => ({
        url: '/analytics/revenue',
        params,
      }),
      providesTags: ['Revenue'],
    }),

    getRevenueChart: builder.query<
      { status: 'success'; data: Array<{ date: string; revenue: number; bookings: number }> },
      { period?: '7d' | '30d' | '90d' }
    >({
      query: (params) => ({
        url: '/analytics/revenue-chart',
        params,
      }),
      providesTags: ['Revenue'],
    }),

    // Reviews (user-facing - server API)
    getEventReviews: builder.query<any, { eventId: string; page?: number; limit?: number; rating?: number; sort?: string }>({
      query: (params) => ({
        url: `/reviews/event/${params.eventId}`,
        params: { page: params.page, limit: params.limit, rating: params.rating, sort: params.sort },
      }),
      providesTags: ['Reviews'],
    }),

    getUserReviews: builder.query<any, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/reviews/my-reviews',
        params,
      }),
      providesTags: ['Reviews'],
    }),

    createReview: builder.mutation<any, any>({
      query: (body) => ({
        url: '/reviews',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Reviews'],
    }),

    updateReview: builder.mutation<any, { reviewId: string; body: any }>({
      query: ({ reviewId, body }) => ({
        url: `/reviews/${reviewId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Reviews'],
    }),

    deleteReview: builder.mutation<
      { status: 'success' },
      { reviewId: string }
    >({
      query: (reviewId) => ({
        url: `/reviews/${reviewId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reviews'],
    }),

    markReviewHelpful: builder.mutation<any, { reviewId: string; isHelpful?: boolean }>({
      query: ({ reviewId, isHelpful }) => ({
        url: `/reviews/${reviewId}/helpful`,
        method: 'POST',
        body: { is_helpful: isHelpful },
      }),
      invalidatesTags: ['Reviews'],
    }),

    reportReview: builder.mutation<any, { reviewId: string; reason: string; description?: string }>({
      query: ({ reviewId, reason, description }) => ({
        url: `/reviews/${reviewId}/report`,
        method: 'POST',
        body: { reason, description },
      }),
      invalidatesTags: ['Reviews'],
    }),

    // Admin review management
    getAllReviews: builder.query<any, { page?: number; limit?: number; status?: string }>({
      query: (params) => ({ url: '/reviews-admin', params }),
      providesTags: ['Reviews'],
    }),

    updateReviewStatus: builder.mutation<any, { reviewId: string; status: string; admin_notes?: string }>({
      query: ({ reviewId, ...body }) => ({
        url: `/reviews-admin/${reviewId}/status`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Reviews'],
    }),

    adminDeleteReview: builder.mutation<any, string>({
      query: (reviewId) => ({
        url: `/reviews-admin/${reviewId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reviews'],
    }),
  }),
});

export const {
  useGetDashboardMetricsQuery,
  useGetOrganizersQuery,
  useGetOrganizerByIdQuery,
  useGetOrganizerKycDetailsQuery,
  useUpdateOrganizerStatusMutation,
  useGetEventsQuery,
  useGetEventByIdQuery,
  useGetEventBySlugQuery,
  useUpdateEventStatusMutation,
  useGetUserBookingsQuery,
  useGetOrganizerBookingsQuery,
  useGetAllBookingsQuery,
  useGetBookingByIdQuery,
  useInitiateBookingMutation,
  useCreateOfflineBookingMutation,
  useGetPlatformUsersQuery,
  useGetPlatformUserByIdQuery,
  useUpdateUserStatusMutation,
  useGetApprovalQueueQuery,
  useGetApprovalStatsQuery,
  useGetKycRequestsQuery,
  useReviewKycRequestMutation,
  useApproveItemMutation,
  useRejectItemMutation,
  useReviewEventApprovalMutation,
  useGetRevenueMetricsQuery,
  useGetRevenueChartQuery,
  useGetEventReviewsQuery,
  useGetUserReviewsQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
  useMarkReviewHelpfulMutation,
  useReportReviewMutation,
  useGetAllReviewsQuery,
  useUpdateReviewStatusMutation,
  useAdminDeleteReviewMutation,
} = platformApi;
