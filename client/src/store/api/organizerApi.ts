import { apiSlice } from '../apiSlice';
import { toastUtils } from '@/utils/toast';

export interface OrganizerProfile {
  id: number;
  displayId?: number | string;
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
  gstNumber?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  avatar?: string;
  bio?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  totalEvents: number;
  totalRevenue: number;
  isVerified: boolean;
  isKycVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export const organizerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizerProfile: builder.query<{ success: boolean; data: OrganizerProfile }, void>({
      query: () => '/organizer/profile',
      providesTags: ['Organizer'],
    }),

    updateOrganizerProfile: builder.mutation<{ success: boolean; data: OrganizerProfile }, Partial<OrganizerProfile>>({
      query: (body) => ({ url: '/organizer/profile', method: 'PUT', body }),
      invalidatesTags: ['Organizer'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Profile updated successfully');
        } catch (error) {
          toastUtils.error('Failed to update profile');
        }
      },
    }),

    updateOrganizerBankDetails: builder.mutation<{ success: boolean; data: OrganizerProfile }, {
      bankAccountName: string;
      bankAccountNumber: string;
      bankIfsc: string;
      bankName: string;
      upiId?: string;
    }>({
      query: (body) => ({ url: '/organizer/bank', method: 'PUT', body }),
      invalidatesTags: ['Organizer'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Bank details updated successfully');
        } catch (error) {
          toastUtils.error('Failed to update bank details');
        }
      },
    }),

    organizerChangePassword: builder.mutation<{ success: boolean; message: string }, {
      currentPassword: string;
      newPassword: string;
    }>({
      query: (body) => ({ url: '/organizer/password', method: 'PUT', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Password changed successfully');
        } catch (error) {
          toastUtils.error('Failed to change password');
        }
      },
    }),

    getOrganizerAnalytics: builder.query<{ success: boolean; data: any }, { startDate?: string; endDate?: string } | void>({
      query: (params) => ({ url: '/organizer/analytics', params: params ?? undefined }),
      providesTags: ['Organizer', 'Analytics'],
    }),

    getOrganizerEvents: builder.query<{ success: boolean; data: any[]; pagination: any }, { page?: number; limit?: number; status?: string } | void>({
      query: (params) => ({ url: '/organizer/events', params: params ?? undefined }),
      providesTags: ['Organizer', 'Event'],
    }),

    getOrganizerBookings: builder.query<{ success: boolean; data: any[]; pagination: any }, { page?: number; limit?: number; eventId?: string; status?: string } | void>({
      query: (params) => ({ url: '/organizer/bookings', params: params ?? undefined }),
      providesTags: ['Organizer', 'Booking'],
    }),

    getOrganizerRevenueSummary: builder.query<{ success: boolean; data: any }, { startDate?: string; endDate?: string } | void>({
      query: (params) => ({ url: '/organizer/revenue', params: params ?? undefined }),
      providesTags: ['Organizer', 'Payment', 'Settlement'],
    }),

    getOrganizerAttendees: builder.query<{ success: boolean; data: any[]; pagination: any }, { page?: number; limit?: number; eventId?: string } | void>({
      query: (params) => ({ url: '/organizer/attendees', params: params ?? undefined }),
      providesTags: ['Organizer', 'Ticket', 'CheckIn'],
    }),

    // Admin: list all organizers
    getAllOrganizers: builder.query<{
      success: boolean;
      data: { organizers: OrganizerProfile[]; pagination: any };
    }, { page?: number; limit?: number; search?: string; is_verified?: boolean; is_kyc_verified?: boolean }>({
      query: (params) => ({ url: '/organizer', params }),
      providesTags: ['Organizer'],
    }),

    getOrganizerById: builder.query<{ success: boolean; data: OrganizerProfile }, number>({
      query: (id) => `/organizer/${id}`,
      providesTags: (_, __, id) => [{ type: 'Organizer', id }],
    }),

    verifyOrganizerKyc: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({ url: `/organizer/${id}/kyc`, method: 'PATCH' }),
      invalidatesTags: ['Organizer'],
    }),

    deactivateOrganizer: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({ url: `/organizer/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Organizer'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Organizer deactivated successfully');
        } catch (error) {
          toastUtils.error('Failed to deactivate organizer');
        }
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetOrganizerProfileQuery,
  useUpdateOrganizerProfileMutation,
  useUpdateOrganizerBankDetailsMutation,
  useOrganizerChangePasswordMutation,
  useGetOrganizerAnalyticsQuery,
  useGetOrganizerEventsQuery,
  useGetOrganizerBookingsQuery,
  useGetOrganizerRevenueSummaryQuery,
  useGetOrganizerAttendeesQuery,
  useGetAllOrganizersQuery,
  useGetOrganizerByIdQuery,
  useVerifyOrganizerKycMutation,
  useDeactivateOrganizerMutation,
} = organizerApi;
