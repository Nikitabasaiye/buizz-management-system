import { apiSlice, storeSession, clearSession } from '../apiSlice';
import { toastUtils } from '@/utils/toast';

// ── Shared types ──────────────────────────────────────────────────────────────
export type AppRole = 'user' | 'organizer' | 'admin' | 'super_admin' | 'influencer';

interface AuthResponse {
  // backend returns either { status: 'success' } or { success: true }
  status?: string;
  success?: boolean;
  message?: string;
  data: {
    user?: {
      id: string;
      displayId?: string | number;
      name: string;
      email: string;
      role: AppRole;
      isVerified: boolean;
      isKycVerified?: boolean;
      phone?: string;
    };
    organizer?: {
      id: string;
      displayId?: string | number;
      name: string;
      email: string;
      businessName?: string;
      isVerified?: boolean;
      isKycVerified?: boolean;
      phone?: string;
    };
    token: string;
    refreshToken: string;
    verificationToken?: string; // dev only
    organizerApplication?: Record<string, unknown>;
  };
}

interface ForgotPasswordResponse {
  status: string;
  message: string;
  data?: { resetToken?: string }; // dev only
}

interface SimpleResponse {
  status: string;
  message: string;
  data?: {
    verified?: boolean;
    verificationToken?: string;
    user?: AuthResponse['data']['user'];
    token?: string;
    refreshToken?: string;
  };
}

// ── Session key map ───────────────────────────────────────────────────────────
const roleSessionKey: Record<string, string> = {
  user:        'buizz-customer-session',
  customer:    'buizz-customer-session',
  organizer:   'buizz-organizer-session',
  admin:       'buizz-admin-session',
  super_admin: 'buizz-super-admin-session',
  influencer:  'buizz-influencer-session',
};

function saveRoleSession(role: string, data: AuthResponse['data']) {
  const entity = data.user ?? data.organizer ?? {};
  if (typeof window !== 'undefined') {
    storeSession(role, {
      token:        data.token,
      refreshToken: data.refreshToken,
      ...entity,
    });
  }
}

function clearRoleSession(role: string) {
  const key = roleSessionKey[role] ?? 'buizz-user-session';
  if (typeof window !== 'undefined') window.localStorage.removeItem(key);
}

// ── Unified Auth API ──────────────────────────────────────────────────────────
export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // POST /auth/register  — role in body: user | organizer | admin | super_admin | influencer
    register: builder.mutation<AuthResponse, {
      name: string;
      email: string;
      password: string;
      role?: AppRole;
      phone?: string;
      businessName?: string;
      businessType?: string;
      city?: string;
      state?: string;
      adminSecret?: string;
      emailVerificationToken?: string;
      phoneVerificationToken?: string;
    }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          saveRoleSession(data.data.user?.role ?? arg.role ?? 'user', data.data);
          toastUtils.success('Registration successful');
        } catch (error) {
          toastUtils.error('Registration failed');
        }
      },
      invalidatesTags: ['Auth'],
    }),

    // POST /auth/login  — same endpoint for all roles
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          saveRoleSession(data.data.user?.role ?? 'user', data.data);
          toastUtils.success('Login successful');
        } catch (error) {
          toastUtils.error('Login failed');
        }
      },
      invalidatesTags: ['Auth'],
    }),

    organizerRegister: builder.mutation<AuthResponse, {
      name: string;
      email: string;
      password: string;
      phone?: string;
      businessName?: string;
      businessType?: string;
      city?: string;
      state?: string;
      pincode?: string;
      emailVerificationToken: string;
      phoneVerificationToken: string;
    }>({
      query: (body) => ({ url: '/organizer/register', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          saveRoleSession('organizer', data.data);
          toastUtils.success('Organizer registration successful');
        } catch (error) {
          toastUtils.error('Organizer registration failed');
        }
      },
      invalidatesTags: ['Auth', 'Organizer'],
    }),

    organizerLogin: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: '/organizer/login', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          saveRoleSession('organizer', data.data);
          toastUtils.success('Organizer login successful');
        } catch (error) {
          toastUtils.error('Organizer login failed');
        }
      },
      invalidatesTags: ['Auth', 'Organizer'],
    }),

    organizerLogout: builder.mutation<SimpleResponse, void>({
      query: () => ({ url: '/organizer/logout', method: 'POST' }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Logged out successfully');
        } catch (error) {
          toastUtils.error('Logout failed');
        }
      },
      invalidatesTags: ['Auth', 'Organizer'],
    }),

    organizerRefreshToken: builder.mutation<AuthResponse, { refreshToken: string }>({
      query: (body) => ({ url: '/organizer/refresh', method: 'POST', body }),
    }),

    organizerForgotPassword: builder.mutation<ForgotPasswordResponse, { email: string }>({
      query: (body) => ({ url: '/organizer/forgot-password', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Password reset email sent');
        } catch (error) {
          toastUtils.error('Failed to send password reset email');
        }
      },
    }),

    organizerResetPassword: builder.mutation<SimpleResponse, { token: string; password: string }>({
      query: ({ token, password }) => ({
        url: `/organizer/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Password reset successful');
        } catch (error) {
          toastUtils.error('Failed to reset password');
        }
      },
    }),

    organizerVerifyEmail: builder.mutation<SimpleResponse, { token: string }>({
      query: ({ token }) => ({ url: `/organizer/verify-email/${token}`, method: 'GET' }),
      invalidatesTags: ['Auth', 'Organizer'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Email verified successfully');
        } catch (error) {
          toastUtils.error('Failed to verify email');
        }
      },
    }),

    // POST /auth/logout
    logoutUser: builder.mutation<SimpleResponse, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_, { queryFulfilled, getState }) {
        try {
          await queryFulfilled;
          // clear all role sessions
          Object.values(roleSessionKey).forEach((k) => {
            if (typeof window !== 'undefined') window.localStorage.removeItem(k);
          });
          toastUtils.success('Logged out successfully');
        } catch (error) {
          toastUtils.error('Logout failed');
        }
      },
      invalidatesTags: ['Auth'],
    }),

    // POST /auth/refresh-token
    refreshToken: builder.mutation<AuthResponse, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh-token', method: 'POST', body }),
    }),

    // GET /auth/verify-email/:token
    verifyEmail: builder.mutation<SimpleResponse, { token: string }>({
      query: ({ token }) => ({ url: `/auth/verify-email/${token}`, method: 'GET' }),
      invalidatesTags: ['Auth', 'User'],
    }),

    // POST /auth/forgot-password
    forgotPassword: builder.mutation<ForgotPasswordResponse, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),

    // POST /auth/reset-password/:token
    resetPassword: builder.mutation<SimpleResponse, { token: string; password: string }>({
      query: ({ token, password }) => ({
        url: `/auth/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
    }),

    // POST /auth/google
    googleLogin: builder.mutation<AuthResponse, { idToken: string; role?: string }>({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          saveRoleSession(data.data.user?.role ?? 'user', data.data);
        } catch {}
      },
      invalidatesTags: ['Auth'],
    }),

    facebookLogin: builder.mutation<AuthResponse, { accessToken: string; role?: string }>({
      query: (body) => ({ url: '/auth/facebook', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          saveRoleSession(data.data.user?.role ?? 'user', data.data);
        } catch {}
      },
      invalidatesTags: ['Auth'],
    }),

    socialLogin: builder.mutation<AuthResponse, { provider: 'google' | 'facebook'; idToken?: string; accessToken?: string; role?: string }>({
      query: (body) => ({ url: '/auth/social', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          saveRoleSession(data.data.user?.role ?? 'user', data.data);
        } catch {}
      },
      invalidatesTags: ['Auth'],
    }),

    // POST /auth/send-otp
    sendOtp: builder.mutation<SimpleResponse, { email: string }>({
      query: (body) => ({ url: '/auth/send-otp', method: 'POST', body }),
    }),

    // POST /auth/verify-otp
    verifyOtp: builder.mutation<SimpleResponse, { email: string; otp: string }>({
      query: (body) => ({ url: '/auth/verify-otp', method: 'POST', body }),
    }),

    sendPasswordResetOtp: builder.mutation<SimpleResponse, { email: string }>({
      query: (body) => ({ url: '/auth/password-reset/send-otp', method: 'POST', body }),
    }),

    verifyPasswordResetOtp: builder.mutation<SimpleResponse, { email: string; otp: string }>({
      query: (body) => ({ url: '/auth/password-reset/verify-otp', method: 'POST', body }),
    }),

    completePasswordReset: builder.mutation<SimpleResponse, {
      email: string;
      verificationToken: string;
      password: string;
    }>({
      query: (body) => ({ url: '/auth/password-reset/complete', method: 'POST', body }),
    }),

    // POST /auth/send-phone-otp
    sendPhoneOtp: builder.mutation<SimpleResponse & { devOtp?: string }, {
      phone: string;
      email?: string;
      purpose?: 'signup' | 'login' | 'offline_booking';
      loginRole?: 'customer' | 'organizer';
      deliveryChannel?: 'auto' | 'whatsapp' | 'email';
    }>({
      query: (body) => ({ url: '/auth/send-phone-otp', method: 'POST', body }),
    }),

    // POST /auth/verify-phone-otp
    verifyPhoneOtp: builder.mutation<SimpleResponse, {
      phone: string;
      otp: string;
      purpose?: 'signup' | 'login' | 'offline_booking';
      loginRole?: 'customer' | 'organizer';
    }>({
      query: (body) => ({ url: '/auth/verify-phone-otp', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.data?.token && data.data?.user) {
            saveRoleSession(data.data.user.role ?? 'user', data.data as AuthResponse['data']);
          }
        } catch {}
      },
      invalidatesTags: ['Auth'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutUserMutation,
  useRefreshTokenMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGoogleLoginMutation,
  useFacebookLoginMutation,
  useSocialLoginMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useSendPasswordResetOtpMutation,
  useVerifyPasswordResetOtpMutation,
  useCompletePasswordResetMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
  useOrganizerRegisterMutation,
  useOrganizerLoginMutation,
  useOrganizerLogoutMutation,
  useOrganizerRefreshTokenMutation,
  useOrganizerForgotPasswordMutation,
  useOrganizerResetPasswordMutation,
  useOrganizerVerifyEmailMutation,
} = authApi;

// ── Role-scoped aliases (backward compat) ─────────────────────────────────────
// All roles share the same /auth/* endpoints — role is sent in the body.

export const useUserRegisterMutation    = useRegisterMutation;
export const useUserLoginMutation       = useLoginMutation;
export const useUserLogoutMutation      = useLogoutUserMutation;
export const useUserForgotPasswordMutation = useForgotPasswordMutation;
export const useUserResetPasswordMutation  = useResetPasswordMutation;
export const useUserVerifyEmailMutation    = useVerifyEmailMutation;
export const useUserGoogleLoginMutation    = useGoogleLoginMutation;
export const useUserFacebookLoginMutation  = useFacebookLoginMutation;
export const useUserRefreshTokenMutation   = useRefreshTokenMutation;

export const useOrganizerRefreshTokenAliasMutation = useOrganizerRefreshTokenMutation;

// Legacy named exports kept for any existing imports
export const userAuthApi       = authApi;
export const organizerAuthApi  = authApi;
export const adminAuthApi      = authApi;
export const influencerAuthApi = authApi;

// Influencer profile stubs (no dedicated influencer profile endpoint)
export const useGetInfluencerProfileQuery          = () => ({ data: null, isLoading: false });
export const useUpdateInfluencerProfileMutation    = () => [() => {}, { isLoading: false }] as any;
export const useUpdateInfluencerBankDetailsMutation = () => [() => {}, { isLoading: false }] as any;
export const useInfluencerChangePasswordMutation   = () => [() => {}, { isLoading: false }] as any;

// Influencer auth stubs (use same auth endpoints as other roles)
export const useInfluencerRegisterMutation    = useRegisterMutation;
export const useInfluencerLoginMutation       = useLoginMutation;
export const useInfluencerLogoutMutation      = useLogoutUserMutation;
export const useInfluencerForgotPasswordMutation = useForgotPasswordMutation;
export const useInfluencerResetPasswordMutation  = useResetPasswordMutation;
export const useInfluencerVerifyEmailMutation    = useVerifyEmailMutation;
