import { apiSlice } from '../apiSlice';

export interface SupportTicket {
  id: string;
  ticketId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'general' | 'booking' | 'payment' | 'technical' | 'account';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  event?: {
    id: string;
    title: string;
  };
  order?: {
    id: string;
    orderId: string;
  };
}

export interface SupportTicketStats {
  byStatus: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  total: number;
}

export const supportApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Create support ticket
    createSupportTicket: builder.mutation<SupportTicket, Partial<SupportTicket>>({
      query: (data) => ({
        url: '/support',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Support'],
    }),

    // Get all support tickets (admin)
    getAllSupportTickets: builder.query<{ success: boolean; data: { tickets: SupportTicket[]; pagination: any } }, { page?: number; limit?: number; status?: string; priority?: string; role?: string; search?: string }>({
      query: (params) => ({
        url: '/support',
        params,
      }),
      providesTags: ['Support'],
    }),

    // Get support ticket stats
    getSupportTicketStats: builder.query<{ success: boolean; data: SupportTicketStats }, void>({
      query: () => '/support/stats',
      providesTags: ['Support'],
    }),

    // Get single support ticket
    getSupportTicketById: builder.query<{ success: boolean; data: SupportTicket }, string>({
      query: (id) => `/support/${id}`,
      providesTags: (result, error, id) => [{ type: 'Support', id }],
    }),

    // Update support ticket
    updateSupportTicket: builder.mutation<SupportTicket, { id: string; data: Partial<SupportTicket> }>({
      query: ({ id, data }) => ({
        url: `/support/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Support', id }, 'Support'],
    }),

    // Delete support ticket
    deleteSupportTicket: builder.mutation<void, string>({
      query: (id) => ({
        url: `/support/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Support'],
    }),
  }),
});

export const {
  useCreateSupportTicketMutation,
  useGetAllSupportTicketsQuery,
  useGetSupportTicketStatsQuery,
  useGetSupportTicketByIdQuery,
  useUpdateSupportTicketMutation,
  useDeleteSupportTicketMutation,
} = supportApi;
