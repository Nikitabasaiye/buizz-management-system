import { apiSlice } from '../apiSlice';

export interface UserProfile {
  id: number;
  displayId?: number | string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  isVerified: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isActive: boolean;
  organizationId?: number;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<{ success: boolean; data: UserProfile }, void>({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<{ success: boolean; message: string; data: UserProfile }, {
      name?: string; phone?: string; avatar?: string;
    }>({
      query: (body) => ({ url: '/users/profile', method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),

    changePassword: builder.mutation<{ success: boolean; message: string }, {
      currentPassword: string; newPassword: string;
    }>({
      query: (body) => ({ url: '/users/change-password', method: 'PUT', body }),
    }),

    getAllUsers: builder.query<{
      success: boolean;
      data: { users: UserProfile[]; pagination: { page: number; limit: number; total: number; pages: number } };
    }, { page?: number; limit?: number; role?: string; search?: string }>({
      query: (params) => ({ url: '/users', params, headers: { 'x-buizz-role': 'super-admin' } }),
      providesTags: ['User'],
    }),

    getUserById: builder.query<{ success: boolean; data: UserProfile }, number>({
      query: (id) => ({ url: `/users/${id}`, headers: { 'x-buizz-role': 'super-admin' } }),
      providesTags: (_, __, id) => [{ type: 'User', id }],
    }),

    updateUser: builder.mutation<{ success: boolean; data: UserProfile }, { id: number; data: Partial<UserProfile> }>({
      query: ({ id, data }) => ({ url: `/users/${id}`, method: 'PUT', body: data, headers: { 'x-buizz-role': 'super-admin' } }),
      invalidatesTags: (_, __, { id }) => [{ type: 'User', id }],
    }),

    deleteUser: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE', headers: { 'x-buizz-role': 'super-admin' } }),
      invalidatesTags: ['User'],
    }),

    updateUserRole: builder.mutation<{ success: boolean; data: UserProfile }, { id: number; role: string }>({
      query: ({ id, role }) => ({ url: `/users/${id}/role`, method: 'PATCH', body: { role }, headers: { 'x-buizz-role': 'super-admin' } }),
      invalidatesTags: (_, __, { id }) => [{ type: 'User', id }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateUserRoleMutation,
} = usersApi;
