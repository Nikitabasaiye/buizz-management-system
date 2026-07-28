"use client";

import { useEffect, type ReactNode } from "react";
import { useAppDispatch } from "@/store/store";
import { setCredentials } from "@/store/authSlice";
import {
  getRoleSession,
  type BuizzAuthRole,
} from "@/features/auth/authSession";

const ROLES: BuizzAuthRole[] = ["customer", "organizer", "admin", "super-admin", "checkin_staff"];

// Maps frontend role names to backend role names
const ROLE_MAP: Record<BuizzAuthRole, string> = {
  customer:      "customer",
  organizer:     "organizer",
  admin:         "admin",
  "super-admin": "super_admin",
  checkin_staff: "checkin_staff",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Restore session from localStorage into Redux on mount
    for (const role of ROLES) {
      const session = getRoleSession(role);
      if (session?.token) {
        dispatch(setCredentials({
          user: {
            id:           session.userId,
            name:         session.name,
            email:        session.email,
            role:         ROLE_MAP[role] as any,
            isVerified:   Boolean(session.isVerified),
            businessName: session.businessName,
            isKycVerified: session.isKycVerified,
          },
          token:        session.token,
          refreshToken: session.refreshToken,
        }));
        break; // only restore the first valid session found
      }
    }
  }, [dispatch]);

  return <>{children}</>;
}
