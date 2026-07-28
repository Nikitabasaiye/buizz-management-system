import { apiSlice } from '../apiSlice';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  action_type: string;
  resource_type: string | null;
  resource_id: string | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_method: string | null;
  request_url: string | null;
  response_status: number | null;
  metadata: Record<string, unknown> | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface UserSession {
  id: number;
  user_id: number;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  last_activity: string | null;
  logout_at: string | null;
  login_at: string;
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  userId?: string;
  userRole?: string;
  action?: string;
  actionType?: string;
  resourceType?: string;
  resourceId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedAuditLogs {
  success: boolean;
  data: {
    logs: AuditLog[];
    pagination: { page: number; limit: number; total: number; pages: number };
  };
}

export interface OrganizerHistory {
  profile: Record<string, unknown>;
  auditLogs: AuditLog[];
  events: Record<string, unknown>[];
  kycHistory: Record<string, unknown>[];
  sessions: UserSession[];
  paymentHistory: Record<string, unknown>[];
}

// ── API ───────────────────────────────────────────────────────────────────────

export const auditApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // ── Audit logs (admin/super-admin) ────────────────────────────────────────
    getAuditLogs: builder.query<PaginatedAuditLogs, AuditFilters>({
      query: (params) => ({ url: '/admin/audit/logs', params }),
      providesTags: ['Audit'],
    }),

    getAuditStats: builder.query<{ success: boolean; data: Record<string, unknown> }, { period?: '7d' | '30d' | '90d' }>({
      query: (params) => ({ url: '/admin/audit/stats', params }),
      providesTags: ['Audit'],
    }),

    getAuditById: builder.query<{ success: boolean; data: AuditLog }, string>({
      query: (id) => `/admin/audit/logs/${id}`,
      providesTags: (_, __, id) => [{ type: 'Audit', id }],
    }),

    // ── User activity history ─────────────────────────────────────────────────
    getUserActivity: builder.query<PaginatedAuditLogs, { userId: string } & AuditFilters>({
      query: ({ userId, ...params }) => ({ url: `/admin/audit/users/${userId}/activity`, params }),
      providesTags: (_, __, { userId }) => [{ type: 'Audit', id: `user-${userId}` }],
    }),

    // ── User sessions ─────────────────────────────────────────────────────────
    getUserSessions: builder.query<{ success: boolean; data: UserSession[] }, { userId: string; page?: number; limit?: number }>({
      query: ({ userId, ...params }) => ({ url: `/admin/audit/users/${userId}/sessions`, params }),
      providesTags: (_, __, { userId }) => [{ type: 'Audit', id: `sessions-${userId}` }],
    }),

    // ── Organizer complete history ────────────────────────────────────────────
    getOrganizerHistory: builder.query<{ success: boolean; data: OrganizerHistory }, string>({
      query: (organizerId) => `/admin/audit/organizers/${organizerId}/history`,
      providesTags: (_, __, id) => [{ type: 'Audit', id: `organizer-${id}` }],
    }),

    // ── Event approval history ────────────────────────────────────────────────
    getEventApprovalHistory: builder.query<{ success: boolean; data: Record<string, unknown>[] }, string>({
      query: (eventId) => `/admin/audit/events/${eventId}/approvals`,
      providesTags: (_, __, id) => [{ type: 'Audit', id: `event-approvals-${id}` }],
    }),

    // ── Payment history for an order ──────────────────────────────────────────
    getOrderPaymentHistory: builder.query<{ success: boolean; data: Record<string, unknown>[] }, string>({
      query: (orderId) => `/payments/history/${orderId}`,
      providesTags: (_, __, id) => [{ type: 'Payment', id: `history-${id}` }],
    }),

    // ── KYC history ───────────────────────────────────────────────────────────
    getKycHistory: builder.query<{ success: boolean; data: Record<string, unknown>[] }, { userId?: string; page?: number; limit?: number }>({
      query: (params) => ({ url: '/kyc/requests', params }),
      providesTags: ['KYC'],
    }),

    // ── Settlement history ────────────────────────────────────────────────────
    getSettlementHistory: builder.query<{ success: boolean; data: Record<string, unknown>[]; pagination: unknown }, { organizerId?: string; eventId?: string; status?: string; page?: number; limit?: number }>({
      query: (params) => ({ url: '/settlements', params }),
      providesTags: ['Settlement'],
    }),

    // ── Dashboard stats (super-admin) ─────────────────────────────────────────
    getAuditDashboardStats: builder.query<{ success: boolean; data: Record<string, unknown> }, { startDate?: string; endDate?: string }>({
      query: (params) => ({ url: '/admin/audit/dashboard', params }),
      providesTags: ['Audit'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetAuditLogsQuery,
  useGetAuditStatsQuery,
  useGetAuditByIdQuery,
  useGetUserActivityQuery,
  useGetUserSessionsQuery,
  useGetOrganizerHistoryQuery,
  useGetEventApprovalHistoryQuery,
  useGetOrderPaymentHistoryQuery,
  useGetKycHistoryQuery,
  useGetSettlementHistoryQuery,
  useGetAuditDashboardStatsQuery,
} = auditApi;
