import { apiSlice } from '../apiSlice';
import { toastUtils } from '@/utils/toast';

interface AdminLoginRequest {
  email: string;
  password: string;
}

interface AdminRegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'super_admin';
  adminSecret: string;
}

interface AdminAuthResponse {
  status: 'success';
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    token: string;
    refreshToken: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  pendingApprovals: number;
}

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    adminLogin: builder.mutation<AdminAuthResponse, AdminLoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['AdminUser'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Admin login successful');
        } catch (error) {
          toastUtils.error('Admin login failed');
        }
      },
    }),

    adminGoogleLogin: builder.mutation<AdminAuthResponse, { idToken: string }>({
      query: (body) => ({
        url: '/admin/google',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminUser'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Google login successful');
        } catch (error) {
          toastUtils.error('Google login failed');
        }
      },
    }),

    adminRegister: builder.mutation<AdminAuthResponse, AdminRegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['AdminUser'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Admin registration successful');
        } catch (error) {
          toastUtils.error('Admin registration failed');
        }
      },
    }),

    adminLogout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['AdminUser'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Logged out successfully');
        } catch (error) {
          toastUtils.error('Logout failed');
        }
      },
    }),

    getAdminProfile: builder.query<{ status: 'success'; data: User }, void>({
      query: () => '/users/profile',
      providesTags: ['AdminUser'],
    }),

    getAdminUsers: builder.query<{ success: boolean; data: User[] }, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/admin', params }),
      providesTags: ['AdminUser'],
    }),

    getAdminUserById: builder.query<{ status: 'success'; data: User }, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'AdminUser', id }],
    }),

    updateAdminUser: builder.mutation<{ status: 'success'; data: User }, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'AdminUser', id }],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('User updated successfully');
        } catch (error) {
          toastUtils.error('Failed to update user');
        }
      },
    }),

    deleteAdminUser: builder.mutation<{ status: 'success'; message: string }, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminUser'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('User deleted successfully');
        } catch (error) {
          toastUtils.error('Failed to delete user');
        }
      },
    }),

    getAdminDashboardStats: builder.query<{ status: 'success'; data: DashboardStats }, void>({
      query: () => '/admin/analytics/dashboard',
      providesTags: ['AdminAnalytics'],
    }),

    getAdminRevenueAnalytics: builder.query<{ status: 'success'; data: Array<{ date: string; revenue: number }> }, { period?: '7d' | '30d' | '90d' }>({
      query: (params) => ({ url: '/admin/analytics/revenue', params }),
      providesTags: ['AdminAnalytics'],
    }),

    getPermissions: builder.query<{ status: 'success'; data: any[] }, void>({
      query: () => '/admin/rbac/permissions',
      providesTags: ['RBAC'],
    }),

    getGroups: builder.query<{ status: 'success'; data: any[] }, void>({
      query: () => '/admin/rbac/groups',
      providesTags: ['RBAC'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useAdminLoginMutation,
  useAdminGoogleLoginMutation,
  useAdminRegisterMutation,
  useAdminLogoutMutation,
  useGetAdminProfileQuery,
  useGetAdminUsersQuery,
  useGetAdminUserByIdQuery,
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
  useGetAdminDashboardStatsQuery,
  useGetAdminRevenueAnalyticsQuery,
  useGetPermissionsQuery,
  useGetGroupsQuery,
} = adminApi;

// Backward compatibility aliases
export const useUpdateAdminProfileMutation = useUpdateAdminUserMutation;
export const useGetAllAdminsQuery = useGetAdminUsersQuery;
export const useDeactivateAdminMutation = useDeleteAdminUserMutation;
