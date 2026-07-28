import { apiSlice } from '../apiSlice';

export interface OrganizerApprovalItem {
  id: string;
  title: string;
  city: string;
  owner: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  email: string;
  phone: string;
  totalEvents: number;
  totalBookings: number;
  organizationName?: string;
  organizationDescription?: string;
  website?: string;
  logo?: string;
}

export const organizersApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // Get all organizers (admin)
    getAllOrganizers: builder.query<{ success: boolean; data: OrganizerApprovalItem[]; pagination: any }, { page?: number; limit?: number; status?: string; search?: string }>({
      query: (params) => ({
        url: '/admin/organizers',
        params,
      }),
      providesTags: ['Organizer'],
    }),
  }),
});

export const {
  useGetAllOrganizersQuery,
} = organizersApi;
