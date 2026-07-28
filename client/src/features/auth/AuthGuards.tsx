"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  getRoleLoginPath,
  getRoleSession,
  type BuizzAuthRole,
  type BuizzAuthSession,
} from "@/features/auth/authSession";

type GuardStatus = "checking" | "allowed" | "redirecting" | "denied";

type AuthGuardOptions = {
  allowPaths?: string[];
  organizerPendingPaths?: string[];
  requireApprovedOrganizer?: boolean;
  requiredPermission?: string;
  fallbackMessage?: string;
};

export function useAuthGuard(role: BuizzAuthRole, options: AuthGuardOptions = {}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<GuardStatus>("checking");
  const [session, setSession] = useState<BuizzAuthSession | null>(null);

  const pathAllowedWithoutSession = (options.allowPaths ?? []).some((path) =>
    pathname === path || pathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (pathAllowedWithoutSession) {
      setStatus("allowed");
      return;
    }

    const nextSession = getRoleSession(role);
    setSession(nextSession);

    if (!nextSession) {
      // For super-admin trying to access organizer routes, check if they have super-admin session
      if (role === "organizer" && pathname.startsWith("/organizer")) {
        const superAdminSession = getRoleSession("super-admin");
        if (superAdminSession) {
          setStatus("allowed");
          return;
        }
      }
      
      const currentPath = `${pathname}${window.location.search}`;
      const loginPath = getRoleLoginPath(role);
      setStatus("redirecting");
      router.replace(`${loginPath}?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (options.requireApprovedOrganizer && role === "organizer" && nextSession.status === "pending") {
      const pendingPathAllowed = (options.organizerPendingPaths ?? []).some((path) =>
        pathname === path || pathname.startsWith(`${path}/`),
      ) || pathname === "/organizer/dashboard";

      if (!pendingPathAllowed) {
        setStatus("redirecting");
        router.replace("/organizer/dashboard");
        return;
      }
    }

    if (options.requiredPermission && !nextSession.permissions?.includes(options.requiredPermission)) {
      setStatus("denied");
      return;
    }

    setStatus("allowed");
  }, [mounted, role, router, pathname, pathAllowedWithoutSession, options]); // eslint-disable-line react-hooks/exhaustive-deps

  return { mounted, status, session };
}

export function AuthGuard({
  role,
  children,
  options,
}: {
  role: BuizzAuthRole;
  children: ReactNode;
  options?: AuthGuardOptions;
}) {
  const { status } = useAuthGuard(role, options);

  if (status === "allowed") return <>{children}</>;
  if (status === "denied") return <AccessDeniedCard message={options?.fallbackMessage} />;

  return <AuthCheckingCard role={role} />;
}

export function PanelAuthGuard({
  role,
  children,
}: {
  role: Exclude<BuizzAuthRole, "customer">;
  children: ReactNode;
}) {
  const allowPaths =
    role === "organizer"
      ? [
        "/organizer/login",
        "/organizer/signup",
        "/organizer/forgot-password",
        "/organizer/reset-password",
        "/organizer/intro",
      ]
      : [
        `/${role}/login`,
        `/${role}/forgot-password`,
        `/${role}/reset-password`,
      ];

  return (
    <AuthGuard
      role={role}
      options={{
        allowPaths,
        organizerPendingPaths: [
          "/organizer/application-status",
          "/organizer/onboarding",
          "/organizer/setup",
          "/organizer/upload-documents",
          "/organizer/verify-otp",
          "/organizer/general-information",
          "/organizer/create-password",
          "/organizer/agreement",
          "/organizer/success",
          "/organizer/settings",
          "/organizer/create-event",
          "/organizer/my-events",
          "/organizer/events",
          "/organizer/bookings",
          "/organizer/analytics",
          "/organizer/tickets",
          "/organizer/attendees",
          "/organizer/revenue",
          "/organizer/profile",
          "/organizer/offline-booking",
          "/organizer/offline-bookings",
          "/organizer/qr-check-in",
          "/organizer/support",
          "/organizer/seat-maps",
          "/organizer/seat-mapping",
        ],
        requireApprovedOrganizer: role === "organizer",
      }}
    >
      {children}
    </AuthGuard>
  );
}

export function BookingAuthGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard
      role="customer"
      options={{
        fallbackMessage: "Please login to continue booking.",
      }}
    >
      {children}
    </AuthGuard>
  );
}

export function CustomerAuthGuard({ children }: { children: ReactNode }) {
  return <AuthGuard role="customer">{children}</AuthGuard>;
}

function AuthCheckingCard({ role }: { role: BuizzAuthRole }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-4 text-[var(--app-foreground)]">
      <section className="w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <Loader2 className="size-5 animate-spin" />
        </span>
        <h1 className="mt-4 text-xl font-black">Checking secure access</h1>
        <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
          Preparing the {roleLabel(role)} workspace.
        </p>
      </section>
    </main>
  );
}

function AccessDeniedCard({ message }: { message?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-4 text-[var(--app-foreground)]">
      <section className="w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <ShieldAlert className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-black">Access denied</h1>
        <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
          {message ?? "Access denied. This account does not have permission to open this section."}
        </p>
      </section>
    </main>
  );
}

function roleLabel(role: BuizzAuthRole) {
  if (role === "super-admin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "organizer") return "Organizer";
  return "Customer";
}
