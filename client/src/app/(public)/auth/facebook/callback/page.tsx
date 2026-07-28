"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFacebookLoginMutation } from "@/store/api";
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

export default function FacebookCallbackPage() {
  const router = useRouter();
  const [facebookLogin] = useFacebookLoginMutation();
  const setUser = useAuthStore((state) => state.setUser);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const role = normalizeReturnedRole(params.get("state") ?? "customer") ?? "customer";
    const fallbackPath = `${roleLoginPath[role] ?? "/login"}?error=facebook_failed`;

    if (!accessToken) {
      router.replace(fallbackPath);
      return;
    }

    facebookLogin({ accessToken, role: role === "super-admin" ? "super_admin" : role })
      .unwrap()
      .then((result) => {
        const payload = result.data;
        const returnedRole = normalizeReturnedRole(payload.user?.role);

        if (!returnedRole || returnedRole !== role) {
          router.replace(`${roleLoginPath[role] ?? "/login"}?error=facebook_role_mismatch`);
          return;
        }

        const session = createSessionFromApiResponse(returnedRole, payload);
        session.permissions = rolePermissions[returnedRole] ?? [];
        setSessionForRole(returnedRole, session);

        const user = payload.user;
        setUser(user ? {
          id: user.id || user.email || `${returnedRole}-${Date.now()}`,
          name: user.name || "Buizz User",
          email: user.email || "",
          phone: user.phone,
          password: "",
          role: (user.role ?? returnedRole) as any,
          authProvider: "facebook",
          isEmailVerified: Boolean(user.email),
          isPhoneVerified: false,
          preferredDelivery: "email",
        } : null);

        router.replace(roleHome[returnedRole] ?? "/");
      })
      .catch(() => {
        router.replace(fallbackPath);
      });
  }, [facebookLogin, router, setUser]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f4f8]">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="size-8 animate-spin text-[#1877f2]" />
        <p className="text-sm font-black text-slate-600">Signing you in with Facebook...</p>
      </div>
    </main>
  );
}
