import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from './authSlice';
import { getApiError } from '@/utils/apiError';
import { toastUtils } from '@/utils/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

// ── Session key map per role ──────────────────────────────────────────────────
const SESSION_KEYS: Record<string, string> = {
  user:        'buizz-customer-session',
  customer:    'buizz-customer-session',
  organizer:   'buizz-organizer-session',
  admin:       'buizz-admin-session',
  super_admin: 'buizz-super-admin-session',
  'super-admin': 'buizz-super-admin-session',
  influencer:  'buizz-influencer-session',
};

type StoredSession = { token?: string; refreshToken?: string; role?: string; [key: string]: any };

const LEGACY_SESSION_KEYS = ['buizz-user-session'];
const ROLE_SESSION_ALIASES: Record<string, string[]> = {
  organizer: ['buizz-organizer'],
  super_admin: ['buizz-super-admin'],
  'super-admin': ['buizz-super-admin'],
};

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/refresh-token',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/send-phone-otp',
  '/auth/verify-phone-otp',
  '/organizer/login',
  '/organizer/register',
  '/organizer/refresh',
  '/organizer/verify-email',
  '/organizer/forgot-password',
  '/organizer/reset-password',
];

const normalizeRole = (role?: string) => {
  if (!role) return undefined;
  if (role === 'customer') return 'user';
  if (role === 'super-admin') return 'super_admin';
  return role;
};

const getSessionKey = (role?: string) => {
  if (!role) return undefined;
  return SESSION_KEYS[role] ?? SESSION_KEYS[normalizeRole(role) ?? ''];
};

const getSessionKeysForRole = (role?: string) => {
  const normalizedRole = normalizeRole(role);
  const keys = new Set<string>();
  const primaryKey = getSessionKey(role) ?? getSessionKey(normalizedRole);
  if (primaryKey) keys.add(primaryKey);

  const aliases = [
    ...(role ? ROLE_SESSION_ALIASES[role] ?? [] : []),
    ...(normalizedRole ? ROLE_SESSION_ALIASES[normalizedRole] ?? [] : []),
  ];
  aliases.forEach((key) => keys.add(key));

  return [...keys];
};

const getAllSessionStorageKeys = () => [
  ...new Set([
    ...Object.values(SESSION_KEYS),
    ...LEGACY_SESSION_KEYS,
    ...Object.values(ROLE_SESSION_ALIASES).flat(),
  ]),
];

const parseStoredSession = (key: string): StoredSession => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const getSessionToken = (session: StoredSession): string | undefined =>
  session?.token ?? session?.state?.session?.token ?? session?.state?.token;

const getSessionRefreshToken = (session: StoredSession): string | undefined =>
  session?.refreshToken ?? session?.state?.session?.refreshToken ?? session?.state?.refreshToken;

const flattenStoredSession = (session: StoredSession): StoredSession => ({
  ...session,
  token: getSessionToken(session),
  refreshToken: getSessionRefreshToken(session),
  role: session?.role ?? session?.state?.session?.role ?? session?.state?.role,
});

const sessionMatchesRole = (session: StoredSession, role: string) => {
  const normalizedRole = normalizeRole(role);
  const sessionRole = normalizeRole(session.role);
  if (!normalizedRole) return false;
  return sessionRole === normalizedRole || Boolean(session[normalizedRole] || session[role]);
};

const getRequestUrl = (args: string | FetchArgs) => {
  return typeof args === 'string' ? args : args.url;
};

const getLoginPathForRole = (role?: string) => {
  const normalized = normalizeRole(role);
  if (normalized === 'organizer') return '/organizer/login';
  if (normalized === 'admin') return '/admin/login';
  if (normalized === 'super_admin') return '/super-admin/login';
  return '/login';
};

let lastToastKey = '';
let lastToastAt = 0;
const refreshRequests = new Map<string, Promise<boolean>>();

const showApiErrorToast = (args: string | FetchArgs, error: FetchBaseQueryError) => {
  if (typeof window === 'undefined') return;

  const message = getApiError(error);
  const toastKey = `${getRequestUrl(args)}:${error.status}:${message}`;
  const now = Date.now();

  if (toastKey === lastToastKey && now - lastToastAt < 1500) return;

  lastToastKey = toastKey;
  lastToastAt = now;
  toastUtils.error(message);
};

const getRequestHeader = (args: string | FetchArgs, headerName: string) => {
  if (typeof args === 'string' || !args.headers) return undefined;
  const normalizedName = headerName.toLowerCase();

  if (args.headers instanceof Headers) {
    return args.headers.get(headerName) ?? undefined;
  }

  if (Array.isArray(args.headers)) {
    const match = args.headers.find(([key]) => key.toLowerCase() === normalizedName);
    return match?.[1];
  }

  const headers = args.headers as Record<string, string | undefined>;
  const key = Object.keys(headers).find((name) => name.toLowerCase() === normalizedName);
  return key ? headers[key] : undefined;
};

const isPublicAuthRequest = (args: string | FetchArgs) => {
  const url = getRequestUrl(args);
  return PUBLIC_AUTH_PATHS.some((path) => url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`));
};

const withAuthSkipped = (args: string | FetchArgs): string | FetchArgs => {
  const headers = new Headers(typeof args === 'string' ? undefined : args.headers as HeadersInit);
  headers.set('x-buizz-skip-auth', 'true');

  if (typeof args === 'string') {
    return { url: args, headers };
  }

  return { ...args, headers };
};

const inferRoleFromRequest = (args: string | FetchArgs) => {
  const explicitRole = getRequestHeader(args, 'x-buizz-role');
  if (explicitRole) return normalizeRole(explicitRole);

  const url = getRequestUrl(args);
  // Check specific KYC paths first before general /kyc path
  // /kyc/me and /kyc/upload should always use organizer role (not super-admin)
  if (url.startsWith('/kyc/me') || url.startsWith('/kyc/upload')) return 'organizer';
  if (url.startsWith('/kyc')) return getStoredSessionForRole('super_admin').token ? 'super_admin' : 'admin';
  if (
    url.startsWith('/kyc/requests') ||
    url.startsWith('/approvals')
  ) {
    return getStoredSessionForRole('super_admin').token ? 'super_admin' : 'admin';
  }
  if (url.startsWith('/bookings')) return 'user';
  if (url.startsWith('/events/drafts')) {
    if (getStoredSessionForRole('super_admin').token) return 'super_admin';
    if (getStoredSessionForRole('admin').token) return 'admin';
    return 'organizer';
  }
  if (url.startsWith('/support')) {
    if (getStoredSessionForRole('super_admin').token) return 'super_admin';
    if (getStoredSessionForRole('admin').token) return 'admin';
    return 'user';
  }
  if (url.startsWith('/users') && !url.startsWith('/users/profile') && !url.startsWith('/users/change-password')) {
    return getStoredSessionForRole('super_admin').token ? 'super_admin' : 'admin';
  }
  // For organizer routes, check if super admin session exists first (for super admin accessing organizer pages)
  if (url.startsWith('/organizer')) {
    return getStoredSessionForRole('super_admin').token ? 'super_admin' : 'organizer';
  }
  if (url.startsWith('/admin')) return 'admin';
  if (url.startsWith('/super-admin') || url.startsWith('/super_admin')) return 'super_admin';
  if (url.startsWith('/influencer')) return 'influencer';
  return undefined;
};

const withRoleAuth = (args: string | FetchArgs, role?: string): string | FetchArgs => {
  if (!role) return args;
  const session = getStoredSessionForRole(role);
  if (!session.token) return args;

  const headers = new Headers();
  if (typeof args !== 'string' && args.headers) {
    if (args.headers instanceof Headers) {
      args.headers.forEach((value, key) => headers.set(key, value));
    } else if (Array.isArray(args.headers)) {
      args.headers.forEach(([key, value]) => {
        if (key && value !== undefined) headers.set(key, value);
      });
    } else {
      Object.entries(args.headers).forEach(([key, value]) => {
        if (value !== undefined) headers.set(key, value);
      });
    }
  }
  headers.set('Authorization', `Bearer ${session.token}`);

  if (typeof args === 'string') {
    return { url: args, headers };
  }

  return { ...args, headers };
};

const getStoredSessionForRole = (role: string): StoredSession => {
  if (typeof window === 'undefined') return {};
  const normalizedRole = normalizeRole(role) ?? role;

  for (const key of getSessionKeysForRole(normalizedRole)) {
    const session = flattenStoredSession(parseStoredSession(key));
    if (session?.token) return session;
  }

  for (const key of [...new Set([...Object.values(SESSION_KEYS), ...LEGACY_SESSION_KEYS, ...Object.values(ROLE_SESSION_ALIASES).flat()])]) {
    const session = flattenStoredSession(parseStoredSession(key));
    if (session?.token && sessionMatchesRole(session, normalizedRole)) return session;
  }

  return {};
};

export const getStoredSession = (role?: string): StoredSession => {
  if (typeof window === 'undefined') return {};
  try {
    const normalizedRole = normalizeRole(role);
    const requestedSession = normalizedRole ? getStoredSessionForRole(normalizedRole) : {};
    if (requestedSession.token) {
      return requestedSession;
    }
    if (normalizedRole) return {};

    // fallback: try all keys
    for (const key of [...new Set(Object.values(SESSION_KEYS))]) {
      const s = flattenStoredSession(JSON.parse(localStorage.getItem(key) || '{}'));
      if (s?.token) return s;
    }
  } catch {}
  return {};
};

export const storeSession = (role: string, data: { token: string; refreshToken?: string; [key: string]: any }) => {
  if (typeof window === 'undefined') return;
  const activeKeys = new Set(getSessionKeysForRole(role));
  getAllSessionStorageKeys().forEach((storageKey) => {
    if (!activeKeys.has(storageKey)) localStorage.removeItem(storageKey);
  });
  const key = getSessionKey(role) || 'buizz-user-session';
  const session = { ...data, role: normalizeRole(role) ?? role };
  localStorage.setItem(key, JSON.stringify(session));
  getSessionKeysForRole(role)
    .filter((aliasKey) => aliasKey !== key)
    .forEach((aliasKey) => localStorage.setItem(aliasKey, JSON.stringify(session)));
  if (normalizeRole(role) === 'user') {
    LEGACY_SESSION_KEYS.forEach((legacyKey) => localStorage.removeItem(legacyKey));
  }
};

export const clearSession = (role?: string) => {
  if (typeof window === 'undefined') return;
  if (role) {
    getSessionKeysForRole(role).forEach((key) => localStorage.removeItem(key));
  } else {
    getAllSessionStorageKeys().forEach(k => localStorage.removeItem(k));
  }
};

// ── Base query with auth header ───────────────────────────────────────────────
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const isFormDataRequest = headers.get('x-buizz-form-data') === 'true';
    const roleHeader = headers.get('x-buizz-role');
    headers.delete('x-buizz-form-data');
    headers.delete('x-buizz-role');

    if (headers.get('x-buizz-skip-auth') === 'true') {
      headers.delete('x-buizz-skip-auth');
      headers.delete('Authorization');
      if (!isFormDataRequest) headers.set('Content-Type', 'application/json');
      return headers;
    }

    const state = getState() as any;
    let token = state?.auth?.token;

    if (!token) {
      const role = roleHeader ? normalizeRole(roleHeader) : undefined;
      token = role ? getStoredSession(role).token : getStoredSession().token;
    }

    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    if (!isFormDataRequest && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return headers;
  },
  credentials: 'include',
});

// ── Base query with automatic token refresh ───────────────────────────────────
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const skipAuth = isPublicAuthRequest(args);
  const requestRole = inferRoleFromRequest(args);
  const requestArgs = skipAuth ? withAuthSkipped(args) : withRoleAuth(args, requestRole);
  let result = await rawBaseQuery(requestArgs, api, extraOptions);

  if (result.error?.status === 401 && !skipAuth) {
    const session = getStoredSession(requestRole);
    if (session?.refreshToken) {
      // Determine role from stored session
      let role = normalizeRole(requestRole ?? session.role) ?? 'user';
      if (!requestRole) {
        for (const [r, key] of Object.entries(SESSION_KEYS)) {
          try {
            const s = JSON.parse(localStorage.getItem(key) || '{}');
            if (s?.token === session.token) { role = normalizeRole(r) ?? r; break; }
          } catch {}
        }
      }

      const refreshEndpoint = role === 'user' || role === 'customer'
        ? '/auth/refresh-token'
        : `/${role === 'super_admin' ? 'super-admin' : role}/refresh`;

      const refreshKey = normalizeRole(role) ?? role;
      let refreshRequest = refreshRequests.get(refreshKey);
      if (!refreshRequest) {
        refreshRequest = (async () => {
          const latestSession = getStoredSession(role);
          // Another request may already have refreshed while this request was
          // waiting to create the lock.
          if (latestSession.token && latestSession.token !== session.token) return true;

          const refreshResult = await rawBaseQuery(
            withAuthSkipped({
              url: refreshEndpoint,
              method: 'POST',
              body: { refreshToken: latestSession.refreshToken ?? session.refreshToken },
            }),
            api,
            extraOptions
          ) as any;

          const newToken: string | undefined =
            refreshResult.data?.data?.token ?? refreshResult.data?.token;
          const newRefresh: string | undefined =
            refreshResult.data?.data?.refreshToken ?? refreshResult.data?.refreshToken;

          if (!newToken) return false;

          const updatedSession = {
            ...latestSession,
            token: newToken,
            refreshToken: newRefresh ?? latestSession.refreshToken ?? session.refreshToken,
          };
          storeSession(role, updatedSession);
          const currentUser = (api.getState() as any)?.auth?.user;
          if (currentUser) {
            api.dispatch(setCredentials({
              user: currentUser,
              token: newToken,
              refreshToken: updatedSession.refreshToken,
            }));
          }
          return true;
        })().finally(() => {
          refreshRequests.delete(refreshKey);
        });
        refreshRequests.set(refreshKey, refreshRequest);
      }

      if (await refreshRequest) {
        // Re-read the shared refreshed session from storage for the retry.
        result = await rawBaseQuery(withRoleAuth(args, role), api, extraOptions);
      } else {
        // Only clear the specific role session that failed
        clearSession(role);
        // Don't logout or redirect if super-admin is accessing organizer routes
        // This preserves the super-admin session even if organizer API calls fail
        if (role !== 'super_admin' && requestRole !== 'super_admin') {
          api.dispatch(logout());
          if (typeof window !== 'undefined') {
            window.location.href = getLoginPathForRole(role);
          }
        }
      }
    } else {
      // Only clear the specific role session, never wipe all sessions on 401
      if (requestRole) clearSession(requestRole);
      // Don't logout or redirect if super-admin is accessing organizer routes
      if (requestRole !== 'super_admin') {
        api.dispatch(logout());
        if (typeof window !== 'undefined') {
          window.location.href = getLoginPathForRole(requestRole);
        }
      }
    }
  }

  if (result.error && !skipAuth) {
    showApiErrorToast(args, result.error);
  }

  return result;
};

// ── Main API slice ────────────────────────────────────────────────────────────
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth', 'User', 'Organizer', 'Admin', 'Influencer',
    'Event', 'Booking', 'Payment', 'Ticket', 'Settlement',
    'Organization', 'Analytics', 'Notification',
    'KYC', 'WhatsApp', 'Review', 'SeatMap', 'CheckIn',
    'AdminAnalytics', 'Support', 'Audit', 'Approval',
    'AdminUser', 'RBAC', 'Search',
  ],
  endpoints: () => ({}),
});
