"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useGoogleLoginMutation } from "@/store/api";
import {
  setCustomerSession,
  setAdminSession,
  setSuperAdminSession,
  setOrganizerSession,
  createSessionFromApiResponse,
  type BuizzAuthRole,
  type BuizzAuthSession,
} from "@/features/auth/authSession";
import { useAuthStore } from "@/store/auth.store";

const rolePermissions: Record<string, string[]> = {
  "super-admin": [
    "platformControl", "adminManagement", "permissionManagement",
    "settlementManagement", "revenueReports", "reviewEverything",
    "ticketDesignMaster", "taxonomyManagement",
  ],
  admin: [
    "approveOrganizers", "approveEvents", "manageUsers",
    "canManageSeatMap", "viewReports", "viewSupportTickets",
  ],
  organizer: [
    "createEvents", "editEvents", "viewBookings", "offlineBooking",
    "manageAttendees", "ticketScanner", "viewRevenue", "canManageSeatMap",
  ],
  customer: [],
};

const roleHome: Record<string, string> = {
  "super-admin": "/super-admin/dashboard",
  admin: "/admin/dashboard",
  organizer: "/organizer/dashboard",
  customer: "/profile",
};

const roleLoginPath: Record<string, string> = {
  "super-admin": "/super-admin/login",
  admin: "/admin/login",
  organizer: "/organizer/login",
  customer: "/login",
};

function setSessionForRole(role: BuizzAuthRole, session: BuizzAuthSession) {
  if (role === "super-admin") setSuperAdminSession(session);
  else if (role === "admin") setAdminSession(session);
  else if (role === "organizer") setOrganizerSession(session);
  else setCustomerSession(session);
}

function normalizeReturnedRole(role?: string): BuizzAuthRole | undefined {
  if (role === "super_admin" || role === "super-admin") return "super-admin";
  if (role === "admin" || role === "organizer" || role === "customer") return role;
  if (role === "user") return "customer";
  return undefined;
}

function googleRoleAllowed(requestedRole: BuizzAuthRole, returnedRole?: BuizzAuthRole) {
  if (!returnedRole) return false;
  if (requestedRole === "super-admin") return returnedRole === "super-admin";
  if (requestedRole === "admin") return returnedRole === "admin";
  if (requestedRole === "organizer") return returnedRole === "organizer";
  return returnedRole === "customer";
}

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [googleLogin] = useGoogleLoginMutation();
  const setUser = useAuthStore((state) => state.setUser);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get("id_token");
    const role = normalizeReturnedRole(params.get("state") ?? "customer") ?? "customer";
    const fallbackPath = `${roleLoginPath[role] ?? "/login"}?error=google_failed`;

    if (!idToken) {
      router.replace(fallbackPath);
      return;
    }

    const loginFn = googleLogin({ idToken, role: role === "super-admin" ? "super_admin" : role }).unwrap();

    loginFn
      .then((result) => {
        const payload = result.data as {
          admin?: { id?: string; name?: string; email?: string; role?: string; isSuperAdmin?: boolean; is_super_admin?: boolean };
          user?: { id?: string; name?: string; email?: string; role?: string };
          token?: string;
          refreshToken?: string;
        };
        const user = payload.admin ?? payload.user;
        const returnedRole = payload.admin
          ? (payload.admin.isSuperAdmin || payload.admin.is_super_admin || role === "super-admin" ? "super-admin" : "admin")
          : normalizeReturnedRole(payload.user?.role);
        if (!googleRoleAllowed(role, returnedRole)) {
          router.replace(`${roleLoginPath[role] ?? "/login"}?error=google_role_mismatch`);
          return;
        }

        const effectiveRole = returnedRole as BuizzAuthRole;
        const session = createSessionFromApiResponse(effectiveRole, {
          token: payload.token || "",
          refreshToken: payload.refreshToken,
          user: user,
          admin: payload.admin,
        });
        // Add permissions to session
        session.permissions = rolePermissions[effectiveRole] ?? [];

        setSessionForRole(effectiveRole, session);
        setUser(user ? {
          id: user.id || user.email || `${effectiveRole}-${Date.now()}`,
          name: user.name || "Buizz User",
          email: user.email || "",
          password: "",
          role: (user.role ?? effectiveRole) as any,
          authProvider: "google",
          isEmailVerified: Boolean(user.email),
          isPhoneVerified: false,
          preferredDelivery: "email",
        } : null);
        router.replace(roleHome[effectiveRole] ?? "/");
      })
      .catch(() => {
        router.replace(fallbackPath);
      });
  }, [googleLogin, router, setUser]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f4f8]">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="size-8 animate-spin text-[#ec1b72]" />
        <p className="text-sm font-black text-slate-600">Signing you in with Google…</p>
      </div>
    </main>
  );
}
