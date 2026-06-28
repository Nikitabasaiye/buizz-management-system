import { baseApi } from './baseApi';

interface ApprovalRequest {
  id: number;
  event_id: number;
  organizer_id: number;
  action_type: 'create' | 'update' | 'delete';
  request_data: any;
  status: 'pending' | 'approved' | 'rejected';
  admin_status: string;
  super_admin_status: string;
  rejection_reason?: string;
  requested_at: string;
  processed_at?: string;
  organizer_name?: string;
  organizer_email?: string;
}

interface ApprovalResponse {
  status: string;
  data: {
    requests: ApprovalRequest[];
    page: number;
    limit: number;
  };
}

interface ApprovalActionResponse {
  status: string;
  data: {
    success: boolean;
    message: string;
  };
}

export const approvalsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPendingApprovals: builder.query<ApprovalResponse, { page?: number; limit?: number }>({
      query: (params = {}) => ({
        url: '/events/approvals/pending',
        params,
      }),
      providesTags: ['Approvals'],
    }),
    getApprovalById: builder.query<{ status: string; data: ApprovalRequest }, number>({
      query: (id) => `/events/approvals/${id}`,
      providesTags: (result, error, id) => [{ type: 'Approvals', id }],
    }),
    approveRequest: builder.mutation<ApprovalActionResponse, { id: number; comments?: string }>({
      query: ({ id, comments }) => ({
        url: `/events/approvals/${id}/approve`,
        method: 'POST',
        body: { comments },
      }),
      invalidatesTags: ['Approvals', 'Events'],
    }),
    rejectRequest: builder.mutation<ApprovalActionResponse, { id: number; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/events/approvals/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Approvals', 'Events'],
    }),
  }),
});

export const {
  useGetPendingApprovalsQuery,
  useGetApprovalByIdQuery,
  useApproveRequestMutation,
  useRejectRequestMutation,
} = approvalsApi;
