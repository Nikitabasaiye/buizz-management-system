import { apiSlice } from '../apiSlice';

// Organization API
export const organizationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizations: builder.query<any, void>({
      query: () => '/organizations',
      providesTags: ['Organization'],
    }),
    
    getOrganizationById: builder.query<any, string>({
      query: (id) => `/organizations/${id}`,
      providesTags: (result, error, id) => [{ type: 'Organization', id }],
    }),
    
    createOrganization: builder.mutation<any, any>({
      query: (data) => ({
        url: '/organizations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Organization'],
    }),
    
    updateOrganization: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/organizations/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Organization', id }],
    }),
    
    deleteOrganization: builder.mutation<any, string>({
      query: (id) => ({
        url: `/organizations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Organization'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetOrganizationsQuery,
  useGetOrganizationByIdQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
} = organizationApi;
