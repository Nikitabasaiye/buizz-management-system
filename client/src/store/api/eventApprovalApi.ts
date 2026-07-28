import { apiSlice } from '../apiSlice';

// Event Approval API - matches admin/src/modules/approvals/approval.routes.js
interface ApprovalRequest {
  id: string;
  eventId: string;
  eventTitle?: string;
  organizerId: string;
  organizerName?: string;
  status: 'pending' | 'admin_approved' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
}

interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export const eventApprovalApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all approval requests (admin/super_admin only)
    getApprovals: builder.query<{ success: boolean; data: { requests: ApprovalRequest[]; pagination: any } }, { page?: number; limit?: number; status?: string }>({
      query: (params) => ({
        url: '/approvals',
        params,
      }),
      providesTags: ['Approval'],
    }),
    
    // Get approval statistics
    getApprovalStats: builder.query<{ success: boolean; data: ApprovalStats }, void>({
      query: () => '/approvals/stats',
      providesTags: ['Approval'],
    }),
    
    // Get my approval requests (organizer view)
    getMyApprovalRequests: builder.query<{ success: boolean; data: { requests: ApprovalRequest[]; pagination: any } }, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/approvals/my-requests',
        params,
      }),
      providesTags: ['Approval'],
    }),
    
    // Get specific approval request by ID
    getApprovalById: builder.query<{ success: boolean; data: ApprovalRequest }, string>({
      query: (id) => `/approvals/${id}`,
      providesTags: (result, error, id) => [{ type: 'Approval', id }],
    }),
    
    // Admin review (approve or reject)
    adminReview: builder.mutation<{ success: boolean; message: string; data: ApprovalRequest }, { id: string; status: 'approved' | 'rejected'; comments?: string }>({
      query: ({ id, status, comments }) => ({
        url: `/approvals/${id}/admin-review`,
        method: 'POST',
        body: { status, comments },
      }),
      invalidatesTags: ['Approval', 'Event', 'Analytics', 'Organizer'],
    }),
    
    // Super admin final review
    superAdminReview: builder.mutation<{ success: boolean; message: string; data: ApprovalRequest }, { id: string; status: 'approved' | 'rejected'; comments?: string }>({
      query: ({ id, status, comments }) => ({
        url: `/approvals/${id}/super-admin-review`,
        method: 'POST',
        body: { status, comments },
      }),
      invalidatesTags: ['Approval', 'Event', 'Analytics', 'Organizer'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetApprovalsQuery,
  useGetApprovalStatsQuery,
  useGetMyApprovalRequestsQuery,
  useGetApprovalByIdQuery,
  useAdminReviewMutation,
  useSuperAdminReviewMutation,
} = eventApprovalApi;
