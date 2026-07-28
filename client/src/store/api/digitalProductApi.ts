import { apiSlice } from '../apiSlice';

// Digital Products API
export const digitalProductApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDigitalProducts: builder.query<any, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/digital-products',
        params,
      }),
      providesTags: ['Event'],
    }),
    
    getDigitalProductById: builder.query<any, string>({
      query: (id) => `/digital-products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Event', id }],
    }),
    
    createDigitalProduct: builder.mutation<any, any>({
      query: (data) => ({
        url: '/digital-products',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Event'],
    }),
    
    updateDigitalProduct: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/digital-products/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Event', id }],
    }),
    
    deleteDigitalProduct: builder.mutation<any, string>({
      query: (id) => ({
        url: `/digital-products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Event'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDigitalProductsQuery,
  useGetDigitalProductByIdQuery,
  useCreateDigitalProductMutation,
  useUpdateDigitalProductMutation,
  useDeleteDigitalProductMutation,
} = digitalProductApi;
