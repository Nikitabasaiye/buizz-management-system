import { apiSlice } from '../apiSlice';

// Launch API
export const launchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLaunches: builder.query<any, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/launch',
        params,
      }),
      providesTags: ['Event'],
    }),
    
    getLaunchById: builder.query<any, string>({
      query: (id) => `/launch/${id}`,
      providesTags: (result, error, id) => [{ type: 'Event', id }],
    }),
    
    createLaunch: builder.mutation<any, any>({
      query: (data) => ({
        url: '/launch',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Event'],
    }),
    
    updateLaunch: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/launch/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Event', id }],
    }),
    
    deleteLaunch: builder.mutation<any, string>({
      query: (id) => ({
        url: `/launch/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Event'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLaunchesQuery,
  useGetLaunchByIdQuery,
  useCreateLaunchMutation,
  useUpdateLaunchMutation,
  useDeleteLaunchMutation,
} = launchApi;
