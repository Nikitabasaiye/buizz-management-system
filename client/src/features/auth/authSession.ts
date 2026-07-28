"use client";

export type BuizzAuthRole = "customer" | "organizer" | "admin" | "super-admin" | "checkin_staff";

// Maps frontend session role keys → backend DB role values
export const BACKEND_ROLE: Record<BuizzAuthRole, string> = {
  customer:      "customer",
  organizer:     "organizer",
  admin:         "admin",
  "super-admin": "super_admin",
  checkin_staff: "checkin_staff",
};

export type BuizzAuthSession = {
  userId: string;
  displayId?: string;
  name: string;
  email: string;
  phone?: string;
  role: BuizzAuthRole;
  status?: "active" | "pending" | "approved" | "blocked";
  permissions?: string[];
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  createdAt: string;
  businessName?: string;
  isVerified?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isKycVerified?: boolean;
};

export const BUIZZ_AUTH_SESSION_KEYS: Record<BuizzAuthRole, string> = {
  customer:      "buizz-customer-session",
  organizer:     "buizz-organizer-session",
  admin:         "buizz-admin-session",
  "super-admin": "buizz-super-admin-session",
  checkin_staff: "buizz-checkin-session",
};

const roleHomePaths: Record<BuizzAuthRole, string> = {
  customer:      "/profile",
  organizer:     "/organizer/dashboard",
  admin:         "/admin/dashboard",
  "super-admin": "/super-admin/dashboard",
  checkin_staff: "/checkin/dashboard",
};

const roleLoginPaths: Record<BuizzAuthRole, string> = {
  customer:      "/login",
  organizer:     "/organizer/login",
  admin:         "/admin/login",
  "super-admin": "/super-admin/login",
  checkin_staff: "/checkin/login",
};

// ── Create session from real backend API response ─────────────────────────────
export function createSessionFromApiResponse(
  role: BuizzAuthRole,
  apiData: {
    token: string;
    refreshToken?: string;
    user?: any;
    organizer?: any;
    admin?: any;
  }
): BuizzAuthSession {
  const entity = apiData.user || apiData.organizer || apiData.admin || {};

  return {
    userId:       String(entity.id || ""),
    displayId:    entity.displayId != null ? String(entity.displayId) : undefined,
    name:         entity.name || "",
    email:        entity.email || "",
    phone:        entity.phone,
    role,
    status:       role === "organizer" && !entity.isVerified ? "pending" : "active",
    token:        apiData.token,
    refreshToken: apiData.refreshToken,
    createdAt:    new Date().toISOString(),
    businessName:  entity.businessName,
    isVerified:    Boolean(entity.isVerified),
    isEmailVerified: Boolean(entity.isEmailVerified ?? entity.emailVerified ?? entity.email_verified),
    isPhoneVerified: Boolean(entity.isPhoneVerified ?? entity.phoneVerified ?? entity.phone_verified),
    isKycVerified: entity.isKycVerified,
  };
}

// ── Legacy createSession (kept for backward compat) ───────────────────────────
export function createSession(input: {
  role: BuizzAuthRole;
  name: string;
  email: string;
  phone?: string;
  status?: BuizzAuthSession["status"];
  permissions?: string[];
  token?: string;
  refreshToken?: string;
}): BuizzAuthSession {
  return {
    userId:       `${input.role}-${input.email || Date.now()}`,
    name:         input.name,
    email:        input.email,
    phone:        input.phone,
    role:         input.role,
    status:       input.status ?? (input.role === "organizer" ? "pending" : "active"),
    permissions:  input.permissions,
    token:        input.token || "",
    refreshToken: input.refreshToken,
    createdAt:    new Date().toISOString(),
  };
}

export function getRoleSession(role: BuizzAuthRole): BuizzAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const sessionKey = BUIZZ_AUTH_SESSION_KEYS[role];
    const raw = window.localStorage.getItem(sessionKey);
    if (!raw) {
      return role === "customer" ? recoverCustomerSession() : null;
    }
    const parsed = JSON.parse(raw) as Partial<BuizzAuthSession>;
    const normalized = normalizeSession(parsed, role);
    if (!normalized || isExpired(normalized) || normalized.status === "blocked") {
      clearRoleSession(role);
      return role === "customer" ? recoverCustomerSession() : null;
    }
    return normalized;
  } catch (error) {
    clearRoleSession(role);
    return role === "customer" ? recoverCustomerSession() : null;
  }
}

function recoverCustomerSession(): BuizzAuthSession | null {
  try {
    const persisted = JSON.parse(window.localStorage.getItem("buizz-auth") || "{}");
    const user = persisted?.state?.user;
    const token = user?.token;
    if (!user || !token || (!user.email && !user.phone)) return null;

    const recovered = createSessionFromApiResponse("customer", {
      token,
      refreshToken: user.refreshToken,
      user,
    });
    window.localStorage.setItem(
      BUIZZ_AUTH_SESSION_KEYS.customer,
      JSON.stringify(recovered),
    );
    return recovered;
  } catch {
    return null;
  }
}

export function setRoleSession(role: BuizzAuthRole, session: BuizzAuthSession) {
  if (typeof window === "undefined") return;
  clearOtherRoleSessions(role);
  window.localStorage.setItem(BUIZZ_AUTH_SESSION_KEYS[role], JSON.stringify(session));
  window.dispatchEvent(new Event("buizz-auth-session-updated"));
}

export function clearRoleSession(role: BuizzAuthRole) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BUIZZ_AUTH_SESSION_KEYS[role]);
}

export const getCustomerSession     = () => getRoleSession("customer");
export const getOrganizerSession    = () => getRoleSession("organizer");
export const getAdminSession        = () => getRoleSession("admin");
export const getSuperAdminSession   = () => getRoleSession("super-admin");
export const getCheckinSession      = () => getRoleSession("checkin_staff");

export const setCustomerSession     = (s: BuizzAuthSession) => setRoleSession("customer", s);
export const setOrganizerSession    = (s: BuizzAuthSession) => setRoleSession("organizer", s);
export const setAdminSession        = (s: BuizzAuthSession) => setRoleSession("admin", s);
export const setSuperAdminSession   = (s: BuizzAuthSession) => setRoleSession("super-admin", s);
export const setCheckinSession      = (s: BuizzAuthSession) => setRoleSession("checkin_staff", s);

export const clearCustomerSession   = () => clearRoleSession("customer");
export const clearOrganizerSession  = () => clearRoleSession("organizer");
export const clearAdminSession      = () => clearRoleSession("admin");
export const clearSuperAdminSession = () => clearRoleSession("super-admin");
export const clearCheckinSession    = () => clearRoleSession("checkin_staff");

export const isCustomerAuthenticated    = () => Boolean(getCustomerSession());
export const isOrganizerAuthenticated   = () => Boolean(getOrganizerSession());
export const isAdminAuthenticated       = () => Boolean(getAdminSession());
export const isSuperAdminAuthenticated  = () => Boolean(getSuperAdminSession());
export const isCheckinAuthenticated     = () => Boolean(getCheckinSession());

export const getRoleHomePath  = (role: BuizzAuthRole) => roleHomePaths[role];
export const getRoleLoginPath = (role: BuizzAuthRole) => roleLoginPaths[role];
export const logoutRole       = (role: BuizzAuthRole) => clearRoleSession(role);

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeSession(
  parsed: Partial<BuizzAuthSession>,
  expectedRole: BuizzAuthRole,
): BuizzAuthSession | null {
  const email = typeof parsed.email === "string" ? parsed.email : "";
  const phone = typeof parsed.phone === "string" ? parsed.phone : undefined;
  const name  = typeof parsed.name === "string" && parsed.name.trim()
    ? parsed.name
    : roleFallbackName(expectedRole);

  if (!email && !phone) return null;
  if (!parsed.token) return null;

  return {
    userId:       typeof parsed.userId === "string" ? parsed.userId : `${expectedRole}-${email}`,
    displayId:    typeof parsed.displayId === "string" ? parsed.displayId : undefined,
    name,
    email,
    phone,
    role:         expectedRole,
    status:       normalizeStatus(parsed.status, expectedRole),
    permissions:  Array.isArray(parsed.permissions)
      ? parsed.permissions.filter((p): p is string => typeof p === "string")
      : undefined,
    token:        parsed.token,
    refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : undefined,
    expiresAt:    typeof parsed.expiresAt === "string" ? parsed.expiresAt : undefined,
    createdAt:    typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    businessName:  parsed.businessName,
    isVerified: Boolean(parsed.isVerified),
    isEmailVerified: Boolean(parsed.isEmailVerified),
    isPhoneVerified: Boolean(parsed.isPhoneVerified),
    isKycVerified: parsed.isKycVerified,
  };
}

function clearOtherRoleSessions(activeRole: BuizzAuthRole) {
  Object.entries(BUIZZ_AUTH_SESSION_KEYS).forEach(([role, key]) => {
    if (role !== activeRole) {
      window.localStorage.removeItem(key);
    }
  });
}

function normalizeStatus(value: unknown, role: BuizzAuthRole): BuizzAuthSession["status"] {
  if (value === "active" || value === "pending" || value === "approved" || value === "blocked") return value;
  return role === "organizer" ? "pending" : "active";
}

function isExpired(session: BuizzAuthSession) {
  if (!session.expiresAt) return false;
  const time = new Date(session.expiresAt).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

function roleFallbackName(role: BuizzAuthRole) {
  if (role === "super-admin")  return "Buizz Super Admin";
  if (role === "admin")        return "Buizz Admin";
  if (role === "organizer")    return "Buizz Organizer";
  if (role === "checkin_staff") return "Buizz Check-in Staff";
  return "Buizz Customer";
}
