"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { getRoleSession, type BuizzAuthRole } from "@/features/auth/authSession";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
const VISITOR_ID_KEY = "buizz-visitor-id";
const VISITOR_SESSION_ID_KEY = "buizz-visitor-session-id";
const ROLES: BuizzAuthRole[] = ["customer", "organizer", "admin", "super-admin", "checkin_staff"];

function getOrCreateStorageId(key: string) {
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, value);
  return value;
}

function getCurrentVisitorSession() {
  for (const role of ROLES) {
    const session = getRoleSession(role);
    if (session?.token) {
      return {
        userId: session.userId || session.displayId,
        userRole: role === "customer" ? "user" : role,
      };
    }
  }

  return { userRole: "guest" };
}

export function VisitorTracker() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visitorId = getOrCreateStorageId(VISITOR_ID_KEY);
    const sessionId = getOrCreateStorageId(VISITOR_SESSION_ID_KEY);
    const session = getCurrentVisitorSession();

    void fetch(`${API_BASE}/analytics/visitors/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        visitorId,
        sessionId,
        path: `${pathname}${window.location.search}`,
        referrer: document.referrer || undefined,
        ...session,
      }),
    }).catch(() => {
      // Visitor analytics must never interrupt the user flow.
    });
  }, [pathname]);

  return null;
}
