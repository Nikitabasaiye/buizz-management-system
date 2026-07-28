import { apiSlice } from '../apiSlice';

// Influencer API
export const influencerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInfluencers: builder.query<any, { page?: number; limit?: number; status?: string }>({
      query: (params) => ({
        url: '/influencer',
        params,
      }),
      providesTags: ['User'],
    }),
    
    getInfluencerById: builder.query<any, string>({
      query: (id) => `/influencer/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    
    approveInfluencer: builder.mutation<any, string>({
      query: (id) => ({
        url: `/influencer/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    
    rejectInfluencer: builder.mutation<any, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/influencer/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['User'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetInfluencersQuery,
  useGetInfluencerByIdQuery,
  useApproveInfluencerMutation,
  useRejectInfluencerMutation,
} = influencerApi;
