import { apiSlice } from '../apiSlice';

// Organizer Analytics API
export const organizerAnalyticsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizerDashboard: builder.query<any, void>({
      query: () => '/organizer/analytics',
      providesTags: ['Organizer', 'Analytics'],
    }),
    
    getOrganizerRevenue: builder.query<any, { startDate?: string; endDate?: string } | void>({
      query: (params) => ({
        url: '/organizer/revenue',
        params: params ?? undefined,
      }),
      providesTags: ['Organizer', 'Payment', 'Settlement'],
    }),
    

    
    exportOrganizerData: builder.mutation<any, { format: 'csv' | 'json' }>({
      query: (data) => ({
        url: '/organizer/analytics/export',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Organizer', 'Analytics'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetOrganizerDashboardQuery,
  useGetOrganizerRevenueQuery,
  useExportOrganizerDataMutation,
} = organizerAnalyticsApi;
