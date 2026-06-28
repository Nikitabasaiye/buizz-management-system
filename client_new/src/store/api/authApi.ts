import { baseApi } from './baseApi';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'organizer';
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  status: string;
  data: {
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
    };
    token: string;
    refreshToken?: string;
  };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    refreshToken: builder.mutation<AuthResponse, { refreshToken: string }>({
      query: (body) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body,
      }),
    }),
    forgotPassword: builder.mutation<{ status: string; message: string }, { email: string }>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: builder.mutation<{ status: string; message: string }, { token: string; password: string }>({
      query: ({ token, password }) => ({
        url: `/auth/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
    }),
    verifyEmail: builder.mutation<{ status: string; message: string }, { token: string }>({
      query: ({ token }) => ({
        url: `/auth/verify-email/${token}`,
        method: 'GET',
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
} = authApi;
