import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserRole } from '@/types/auth';

export type { UserRole };

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified?: boolean;
  businessName?: string;
  isKycVerified?: boolean;
  organizationId?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{
      user: AuthUser;
      token: string;
      refreshToken?: string;
    }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.isAuthenticated = true;
      state.error = null;
    },

    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setCredentials, logout, setLoading, setError, clearError } = authSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectCurrentUser    = (state: { auth: AuthState }) => state.auth.user;
export const selectToken          = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuth         = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUserRole       = (state: { auth: AuthState }) => state.auth.user?.role;
export const selectIsOrganizer    = (state: { auth: AuthState }) => state.auth.user?.role === 'organizer';
export const selectIsAdmin        = (state: { auth: AuthState }) => state.auth.user?.role === 'admin' || state.auth.user?.role === 'super_admin';
export const selectIsSuperAdmin   = (state: { auth: AuthState }) => state.auth.user?.role === 'super_admin';
export const selectIsCheckinStaff = (state: { auth: AuthState }) => state.auth.user?.role === 'checkin_staff';
export const selectIsInfluencer   = (state: { auth: AuthState }) => state.auth.user?.role === 'influencer';

export default authSlice.reducer;
