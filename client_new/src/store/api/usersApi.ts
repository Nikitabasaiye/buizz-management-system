import { baseApi } from './baseApi';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface UserResponse {
  status: string;
  data: User;
}

interface UpdateUserRequest {
  name?: string;
  phone?: string;
  avatar?: string;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<UserResponse, void>({
      query: () => '/users/profile',
      providesTags: ['Users'],
    }),
    updateProfile: builder.mutation<UserResponse, UpdateUserRequest>({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),
    getUserById: builder.query<UserResponse, number>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'Users', id }],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetUserByIdQuery,
} = usersApi;
