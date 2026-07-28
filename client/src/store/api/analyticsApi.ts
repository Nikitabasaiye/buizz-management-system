import { apiSlice } from '../apiSlice';

export const analyticsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    trackVisitor: builder.mutation<{ success: boolean; data: { tracked: boolean } }, {
      visitorId: string;
      sessionId: string;
      userId?: string;
      userRole?: string;
      path: string;
      referrer?: string;
    }>({
      query: (body) => ({ url: '/analytics/visitors/track', method: 'POST', body }),
    }),

    getVisitorSummary: builder.query<{ success: boolean; data: any }, { days?: number } | void>({
      query: (params) => ({ url: '/analytics/visitors/summary', params: params ?? undefined, headers: { 'x-buizz-role': 'super-admin' } }),
      providesTags: ['Analytics'],
    }),

    getDashboard: builder.query<{ success: boolean; data: any }, void>({
      query: () => '/analytics/dashboard',
      providesTags: ['Analytics'],
    }),

    getEventAnalytics: builder.query<{ success: boolean; data: any }, number>({
      query: (eventId) => `/analytics/events/${eventId}`,
      providesTags: (_, __, id) => [{ type: 'Analytics', id }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useTrackVisitorMutation,
  useGetVisitorSummaryQuery,
  useGetDashboardQuery,
  useGetEventAnalyticsQuery,
} = analyticsApi;
