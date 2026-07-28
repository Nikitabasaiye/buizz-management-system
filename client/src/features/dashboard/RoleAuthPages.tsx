"use client";

import {
  ArrowLeft,
  BarChart3,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { LoadingButton } from "@/components/common/LoadingButton";
import {
  BACKEND_ROLE,
  createSessionFromApiResponse,
  setAdminSession,
  setCheckinSession,
  setOrganizerSession,
  setSuperAdminSession,
} from "@/features/auth/authSession";
import { startFacebookOAuth, startGoogleOAuth } from "@/features/auth/googleOAuth";
import type { OrganizerApplication } from "@/features/integration/organizerApplicationLifecycle";
import { useLoginMutation, useForgotPasswordMutation, useResetPasswordMutation } from "@/store/api";

type AuthRole = "super-admin" | "admin" | "organizer";
type AuthMode = "login" | "sign-in" | "signup" | "forgot-password" | "reset-password";

const roleLabels: Record<AuthRole, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  organizer: "Organizer",
};

const roleHome: Record<AuthRole, string> = {
  "super-admin": "/super-admin/dashboard",
  admin: "/admin/dashboard",
  organizer: "/organizer/dashboard",
};



const roleLanding: Record<AuthRole, string> = {
  "super-admin": "/",
  admin: "/",
  organizer: "/organizer/intro",
};

type OrganizerApplicationPayload = Record<string, unknown>;

type AuthUserPayload = {
  id?: string;
  displayId?: string | number;
  name?: string;
  email?: string;
  phone?: string;
};

function readString(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readOrganizerStatus(value: unknown): OrganizerApplication["status"] {
  return value === "approved" || value === "rejected" ? value : "pending";
}

function readAccessStatus(value: unknown): OrganizerApplication["accessStatus"] {
  return value === "unlocked" ? "unlocked" : "locked";
}

function buildOrganizerApplication(
  payload: OrganizerApplicationPayload,
  user: AuthUserPayload,
): OrganizerApplication {
  const now = new Date().toISOString();
  const status = readOrganizerStatus(payload.status);
  const organizationName =
    readString(payload.organizationName) ||
    readString(payload.businessName) ||
    readString(user.name, "Organizer");

  return {
    id: readString(payload.id, `ORG-APP-${Date.now()}`),
    organizerId: readString(payload.organizerId, readString(user.displayId, readString(user.id, `ORG-${Date.now()}`))),
    organizationName,
    ownerName: readString(payload.ownerName, readString(user.name, organizationName)),
    email: readString(payload.email, readString(user.email)),
    phone: readString(payload.phone, readString(user.phone)),
    city: readString(payload.city),
    status,
    organizerStatus: readOrganizerStatus(payload.organizerStatus ?? status),
    adminApprovalStatus: readOrganizerStatus(payload.adminApprovalStatus ?? status),
    superAdminApprovalStatus: readOrganizerStatus(payload.superAdminApprovalStatus ?? status),
    accessStatus: readAccessStatus(payload.accessStatus ?? (status === "approved" ? "unlocked" : "locked")),
    submittedAt: readString(payload.submittedAt, now),
    reviewedAt: readString(payload.reviewedAt) || undefined,
    reviewedBy: readString(payload.reviewedBy) || undefined,
    reviewedRole:
      payload.reviewedRole === "admin" || payload.reviewedRole === "super-admin"
        ? payload.reviewedRole
        : undefined,
    rejectionReason: readString(payload.rejectionReason) || undefined,
    documents:
      payload.documents && typeof payload.documents === "object" && !Array.isArray(payload.documents)
        ? (payload.documents as Record<string, boolean>)
        : {},
    auditTrail: Array.isArray(payload.auditTrail) ? [] : [],
  };
}

const authPrimaryButtonClass =
  "mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-[#ec1b72] px-3 text-xs font-black text-white shadow-[0_12px_28px_rgba(236,27,114,0.22)] transition hover:-translate-y-0.5 hover:bg-[#d91564] disabled:cursor-not-allowed disabled:opacity-55 sm:min-h-10 sm:rounded-2xl sm:text-sm lg:mt-5 lg:min-h-11";

const compactSocialButtonClass =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-black text-[#111827] shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_26px_rgba(15,23,42,0.09)] sm:min-h-10 sm:gap-2 sm:rounded-2xl sm:px-3 sm:text-sm";

const controlAuthVisualCopy: Record<
  AuthRole,
  {
    accessLabel: string;
    eyebrow: string;
    visualTitle: ReactNode;
    visualDescription: string;
    centerIcon: LucideIcon;
    cards: Array<{
      title: string;
      detail: string;
      icon: LucideIcon;
    }>;
  }
> = {
  organizer: {
    accessLabel: "Organizer",
    eyebrow: "Host with Buizz",
    visualTitle: (
      <>
        Create events. Sell tickets. <span className="text-[#ec1b72]">Verify every entry.</span>
      </>
    ),
    visualDescription:
      "A secure organizer workspace for event creation, ticket sales, offline bookings, QR check-in and revenue tracking.",
    centerIcon: Sparkles,
    cards: [
      {
        title: "Create",
        detail: "Build events faster",
        icon: Ticket,
      },
      {
        title: "Verify",
        detail: "QR gate check-in",
        icon: QrCode,
      },
      {
        title: "Track",
        detail: "Sales and revenue",
        icon: BarChart3,
      },
    ],
  },
  admin: {
    accessLabel: "Admin",
    eyebrow: "Operations Control",
    visualTitle: (
      <>
        Review queues. Verify bookings. <span className="text-[#ec1b72]">Resolve faster.</span>
      </>
    ),
    visualDescription:
      "A secure admin workspace for organizer review, event review, bookings, attendees, venue checks and support operations.",
    centerIcon: ShieldCheck,
    cards: [
      {
        title: "Approvals",
        detail: "Organizer and events",
        icon: ShieldCheck,
      },
      {
        title: "Bookings",
        detail: "Customer activity",
        icon: Ticket,
      },
      {
        title: "Support",
        detail: "Priority issues",
        icon: BarChart3,
      },
    ],
  },
  "super-admin": {
    accessLabel: "Super Admin",
    eyebrow: "Buizz Command Center",
    visualTitle: (
      <>
        Control platform. Manage admins. <span className="text-[#ec1b72]">Track revenue.</span>
      </>
    ),
    visualDescription:
      "A secure Super Admin workspace for permissions, admin management, organizer approvals, revenue, settlements and system settings.",
    centerIcon: Crown,
    cards: [
      {
        title: "Admins",
        detail: "Create access",
        icon: UsersRound,
      },
      {
        title: "Revenue",
        detail: "Reports and payouts",
        icon: WalletCards,
      },
      {
        title: "Security",
        detail: "Permission matrix",
        icon: ShieldCheck,
      },
    ],
  },
};

export function RoleAuthPage({ role, mode }: { role: AuthRole; mode: AuthMode }) {
  if (mode === "forgot-password") {
    return <PasswordRecoveryPage role={role} reset={false} />;
  }

  if (mode === "reset-password") {
    return <PasswordRecoveryPage role={role} reset />;
  }

  if (mode === "signup" && role === "organizer") {
    return <OrganizerSignupPage />;
  }

  return <RoleLoginPage role={role} mode={mode === "sign-in" ? "sign-in" : "login"} />;
}

function RoleLoginPage({
  role,
  mode = "login",
}: {
  role: AuthRole;
  mode?: "login" | "sign-in";
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const pageTitle = mode === "sign-in" ? "Sign In" : "Login";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectPath(sanitizeRedirectPath(params.get("redirect"), role));
  }, [role]);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Enter email and password.");
      return;
    }

    try {
      const result = await login({ email, password }).unwrap();
      const backendRole = result.data.user?.role;
      if (backendRole !== BACKEND_ROLE[role]) {
        setMessage(`${roleLabels[role]} account required.`);
        return;
      }
      const session = createSessionFromApiResponse(role, result.data);

      if (role === "organizer") {
        setOrganizerSession(session);
        if (result.data.organizerApplication) {
          const { saveOrganizerApplication } = await import("@/features/integration/organizerApplicationLifecycle");
          saveOrganizerApplication(
            buildOrganizerApplication(
              result.data.organizerApplication,
              result.data.user ?? result.data.organizer ?? {},
            ),
          );
        }
      } else if (role === "admin") {
        setAdminSession(session);
      } else if (role === "super-admin") {
        setSuperAdminSession(session);
      } else if (role === "checkin_staff") {
        setCheckinSession(session);
      }

      router.replace(redirectPath ?? roleHome[role]);
    } catch (error: any) {
      setMessage(error?.data?.message || "Login failed. Please check your credentials.");
    }
  };

  const continueWithGoogle = () => {
    try {
      startGoogleOAuth(role);
    } catch (error: any) {
      setMessage(error?.message || "Google login is not configured.");
    }
  };

  const continueWithFacebook = async () => {
    try {
      await startFacebookOAuth(role);
    } catch (error: any) {
      setMessage(error?.message || "Facebook login is not configured.");
    }
  };

  return (
    <DashboardAuthShell
      role={role}
      title={
        role === "organizer"
          ? "Welcome back, Organizer"
          : role === "admin"
            ? mode === "sign-in"
              ? "Admin Sign In"
              : "Admin Login"
            : "Super Admin Login"
      }
      subtitle={
        role === "super-admin"
          ? "Control admins, permissions, revenue, settlements and platform settings."
          : role === "admin"
            ? "Manage assigned reviews, bookings, support and venue operations."
            : "Manage events, tickets, bookings and experiences with Buizz."
      }
    >
      <div className="grid gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={continueWithGoogle}
          className={compactSocialButtonClass}
        >
          <GoogleBrandIcon className="size-3.5 sm:size-4" />
          Google
        </button>
        <button
          type="button"
          onClick={continueWithFacebook}
          className={compactSocialButtonClass}
        >
          <span className="grid size-3.5 place-items-center rounded-full bg-[#1877F2] text-[10px] font-black text-white sm:size-4 sm:text-xs">f</span>
          <span>Facebook</span>
        </button>
      </div>

      <div className="my-2.5 flex items-center gap-2.5 sm:my-4 sm:gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-black text-slate-400">Or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-2.5 grid gap-2 sm:mt-4 sm:gap-3">
        <AuthInput
          icon={<Mail className="size-3.5" />}
          label="Email Address"
          value={email}
          onChange={setEmail}
        />
        <AuthInput
          icon={<KeyRound className="size-3.5" />}
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 sm:mt-3">
        <label className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-slate-500 sm:text-xs">
          <input
            type="checkbox"
            defaultChecked
            className="size-3.5 shrink-0 rounded border-slate-300 accent-[#ec1b72] sm:size-4"
          />
          <span className="truncate">Keep me logged in</span>
        </label>

        <Link
          href={`/${role}/forgot-password`}
          className="shrink-0 text-[10px] font-black text-[#070a1a] underline-offset-4 transition hover:text-[#ec1b72] hover:underline sm:text-xs"
        >
          Forgot Password?
        </Link>
      </div>

      {message ? <Message text={message} /> : null}

      <LoadingButton
        loading={isLoggingIn}
        loadingText="Checking..."
        onClick={submit}
        className={authPrimaryButtonClass}
      >
        {pageTitle}
      </LoadingButton>

      <RoleAuthFooter role={role} mode={mode} />
    </DashboardAuthShell>
  );
}

function RoleAuthFooter({ role, mode }: { role: AuthRole; mode: "login" | "sign-in" }) {
  if (role === "organizer") {
    return (
      <p className="mt-3 text-center text-[11px] font-bold text-slate-500 sm:mt-4 sm:text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/organizer/signup" className="font-black text-[#070a1a] transition hover:text-[#ec1b72]">
          Sign Up
        </Link>
      </p>
    );
  }

  if (role === "admin") {
    return (
      <div className="mt-3 text-center sm:mt-4">
        <p className="text-[11px] font-bold text-slate-500 sm:text-sm">
          {mode === "sign-in" ? "Want to use login page?" : "Prefer sign in page?"}{" "}
          <Link
            href={mode === "sign-in" ? "/admin/login" : "/admin/sign-in"}
            className="font-black text-[#070a1a] transition hover:text-[#ec1b72]"
          >
            {mode === "sign-in" ? "Login" : "Sign In"}
          </Link>
        </p>
        <p className="mt-1 text-[9px] font-bold text-slate-400 sm:mt-1.5 sm:text-xs">
          Admin accounts are created by Super Admin.
        </p>
      </div>
    );
  }

  return (
    <p className="mt-4 text-center text-xs font-bold text-slate-500 sm:text-sm">
      Super Admin access is private and protected.
    </p>
  );
}

function OrganizerSignupPage() {
  const router = useRouter();

  return (
    <DashboardAuthShell
      role="organizer"
      title="Sign Up"
      subtitle="Create your organizer account and complete onboarding for approval."
    >
      <LoadingButton
        loading={false}
        loadingText=""
        onClick={() => router.push("/organizer/signup")}
        className={authPrimaryButtonClass}
      >
        Continue to Sign Up
      </LoadingButton>

      <Link
        href="/organizer/login"
        className="mt-3 inline-flex w-full justify-center text-xs font-black text-[#070a1a] transition hover:text-[#ec1b72] sm:text-sm"
      >
        Already have an account? Login
      </Link>
    </DashboardAuthShell>
  );
}

function PasswordRecoveryPage({ role, reset }: { role: AuthRole; reset: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const label = roleLabels[role];
  const passwordValid = !reset || isRecoveryPasswordValid(password);
  const passwordsMatch = !reset || (Boolean(confirmPassword) && password === confirmPassword);
  const [forgotPassword, { isLoading: isSendingOtp }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) setResetToken(token);
  }, []);

  const submit = async () => {
    if (!reset) {
      if (!email.trim()) { setMessage("Enter your email address."); return; }
      try {
        await forgotPassword({ email }).unwrap();
        setMessage("Password reset email sent. Check your inbox.");
      } catch (err: any) {
        setMessage(err?.data?.message || "Failed to send reset email.");
      }
      return;
    }

    if (!resetToken.trim()) { setMessage("Reset token is missing. Use the link from your email."); return; }
    if (!passwordValid) { setMessage("Password needs 8 characters, uppercase, number, and special character."); return; }
    if (!passwordsMatch) { setMessage("Confirm password must match."); return; }

    try {
      await resetPassword({ token: resetToken, password }).unwrap();
      setMessage("Password updated successfully.");
      router.push(`/${role}/login`);
    } catch (err: any) {
      setMessage(err?.data?.message || "Failed to reset password.");
    }
  };

  return (
    <DashboardAuthShell
      role={role}
      title={reset ? "Reset Password" : "Recover Password"}
      subtitle={
        reset
          ? `Create a new password for your ${label} account.`
          : `Enter your registered ${label} email to receive a password reset link.`
      }
    >
      <div className="grid gap-2.5 sm:gap-3">
        <AuthInput icon={<Mail className="size-3.5" />} label="Email address" value={email} onChange={setEmail} />

        {reset ? (
          <AuthInput icon={<ShieldCheck className="size-3.5" />} label="Reset Token" value={resetToken} onChange={setResetToken} />
        ) : null}

        {reset ? (
          <AuthInput
            icon={<KeyRound className="size-3.5" />}
            label="New password"
            value={password}
            onChange={setPassword}
            type="password"
          />
        ) : null}

        {reset ? (
          <AuthInput
            icon={<LockKeyhole className="size-3.5" />}
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
          />
        ) : null}
      </div>

      {reset ? <PasswordChecklist password={password} confirmPassword={confirmPassword} /> : null}
      {message ? <Message text={message} /> : null}

      <LoadingButton
        loading={reset ? isResetting : isSendingOtp}
        loadingText={reset ? "Updating..." : "Sending..."}
        onClick={submit}
        disabled={reset && (!passwordValid || !passwordsMatch)}
        className={authPrimaryButtonClass}
      >
        {reset ? "Update Password" : "Send Reset Email"}
      </LoadingButton>

      <Link
        href={`/${role}/login`}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 text-xs font-black text-[#070a1a] transition hover:text-[#ec1b72] sm:text-sm"
      >
        <ArrowLeft className="size-3.5 sm:size-4" />
        Back to login
      </Link>
    </DashboardAuthShell>
  );
}

function DashboardAuthShell({
  role,
  title,
  subtitle,
  children,
}: {
  role: AuthRole;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const visual = controlAuthVisualCopy[role];
  const Icon = visual.centerIcon;

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#f8f9fd] text-[#070a1a]">
      <div className="pointer-events-none absolute -left-24 top-8 size-72 rounded-full bg-[#ec1b72]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 size-72 rounded-full bg-[#6626b9]/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38dvh] bg-[radial-gradient(circle_at_50%_100%,rgba(236,27,114,0.12),transparent_56%),linear-gradient(180deg,rgba(248,249,253,0),rgba(248,249,253,0.96))] lg:hidden" />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1360px] items-start justify-center px-2.5 py-3 sm:px-5 sm:py-8 lg:items-center lg:px-6 lg:py-8">
        <div className="grid w-full max-w-[304px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.12)] sm:max-w-[390px] sm:rounded-[32px] lg:max-w-none lg:grid-cols-[0.86fr_1.14fr] lg:rounded-[38px] lg:p-3 lg:shadow-[0_34px_110px_rgba(15,23,42,0.16)]">
          <div className="relative flex items-start justify-center overflow-hidden bg-white px-3 py-3.5 text-[#070a1a] sm:px-6 sm:py-7 lg:min-h-[710px] lg:items-center lg:rounded-[30px] lg:bg-[#fbfcff] lg:px-12 lg:py-10">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 18% 12%, rgba(236,27,114,0.08), transparent 30%), radial-gradient(circle at 90% 92%, rgba(102,38,185,0.08), transparent 34%)",
              }}
            />

            <div className="relative z-10 w-full max-w-[268px] sm:max-w-[330px] lg:max-w-[430px]">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={roleLanding[role]}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-[#070a1a] transition hover:text-[#ec1b72] sm:gap-1.5 sm:text-xs"
                >
                  <ArrowLeft className="size-3.5 sm:size-4" />
                  {role === "super-admin" ? "Back to Super Admin" : role === "admin" ? "Back to Admin" : "Back to organizer"}
                </Link>

                <span className="rounded-full border border-[#ec1b72]/20 bg-[#fff0f6] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#ec1b72] lg:hidden">
                  {visual.accessLabel}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2.5 sm:mt-6 sm:gap-3 lg:mt-8">
                <span className="grid size-8 place-items-center rounded-xl bg-[#ec1b72] text-white shadow-[0_12px_26px_rgba(236,27,114,0.18)] sm:size-10 sm:rounded-2xl lg:size-12">
                  <Icon className="size-4 sm:size-5" />
                </span>
                <div className="text-left">
                  <BuizzLogo variant="light" size="sm" />
                  <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[9px] lg:text-[10px]">
                    {roleLabels[role]} account
                  </p>
                </div>
              </div>

              <div className="mt-4 text-center sm:mt-6 lg:mt-8">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#ec1b72] sm:text-[10px] lg:text-xs">
                  {visual.eyebrow}
                </p>

                <h1
                  className="mt-1.5 text-[1.55rem] font-black leading-[0.96] tracking-[-0.05em] text-[#070a1a] sm:mt-2 sm:text-[2.35rem] lg:text-5xl"
                  style={{ fontFamily: "var(--font-display), var(--font-ui), system-ui, sans-serif" }}
                >
                  {title}
                </h1>

                <p className="mx-auto mt-2.5 max-w-[240px] text-[11px] font-bold leading-5 text-slate-500 sm:mt-4 sm:max-w-[300px] sm:text-sm sm:leading-6 lg:max-w-sm">
                  {subtitle}
                </p>
              </div>

              <div className="mt-4 sm:mt-6 lg:mt-7">{children}</div>
            </div>
          </div>

          <ControlAuthVisualPanel role={role} visual={visual} />
        </div>
      </section>
    </main>
  );
}

function ControlAuthVisualPanel({
  role,
  visual,
}: {
  role: AuthRole;
  visual: (typeof controlAuthVisualCopy)[AuthRole];
}) {
  return (
    <div className="relative hidden min-h-[710px] overflow-hidden bg-[#070a1a] text-white lg:block lg:rounded-[30px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(236,27,114,0.46),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(102,38,185,0.42),transparent_34%),radial-gradient(circle_at_50%_88%,rgba(246,196,83,0.18),transparent_34%),linear-gradient(135deg,#270016_0%,#18061f_45%,#070a1a_100%)]" />
      <div className="absolute left-10 top-24 h-44 w-44 rounded-full border border-white/10 bg-white/[0.03] blur-[1px]" />
      <div className="absolute right-8 top-14 h-28 w-28 rounded-full border border-white/10 bg-white/[0.04]" />
      <div className="absolute bottom-12 right-14 h-56 w-56 rounded-full bg-[#ec1b72]/12 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,21,0.72),rgba(51,11,70,0.56))]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#070a1a] via-[#16051f]/82 to-transparent" />

      <div className="relative z-10 flex min-h-[710px] flex-col justify-between p-9 xl:p-11">
        <div className="flex items-center justify-between gap-4">
          <BuizzLogo variant="dark" size="md" />
          <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl">
            {visual.accessLabel}
          </span>
        </div>

        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6c453]">
            {visual.eyebrow}
          </p>

          <h2
            className="mt-5 max-w-[690px] text-5xl font-black leading-[0.98] tracking-[-0.055em] text-white xl:text-[4rem]"
            style={{ fontFamily: "var(--font-display), var(--font-ui), system-ui, sans-serif" }}
          >
            {visual.visualTitle}
          </h2>

          <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-white/78">
            “{visual.visualDescription}”
          </p>

          <div className="mt-6 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full border border-white/20 bg-white/12 text-sm font-black text-white backdrop-blur-xl">
              B
            </span>
            <div>
              <p className="text-sm font-black text-white">Buizz {visual.accessLabel} Suite</p>
              <p className="text-xs font-semibold text-white/58">
                {role === "super-admin" ? "Platform Control" : role === "admin" ? "Review Operations" : "Event Operations"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-4">
            <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-white/72">
              Your tools
            </p>
            <div className="h-px flex-1 bg-white/18" />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {visual.cards.map((card) => (
              <span
                key={`pill-${card.title}`}
                className="rounded-full border border-white/16 bg-white/12 px-4 py-2 text-[11px] font-black uppercase tracking-[0.04em] text-white backdrop-blur-xl"
              >
                {card.title}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {visual.cards.map((card) => {
              const CardIcon = card.icon;

              return (
                <article
                  key={card.title}
                  className="rounded-[1.6rem] border border-white/14 bg-white/10 p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-white/15 text-[#f6c453]">
                    <CardIcon className="size-5" />
                  </span>

                  <h3 className="mt-5 text-base font-black">{card.title}</h3>

                  <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
                    {card.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleBrandIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} shrink-0`}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AuthInput({
  icon,
  label,
  value,
  onChange,
  type = "text",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="grid gap-1 text-[9px] font-black text-slate-500 sm:gap-1.5 sm:text-xs">
      {label}
      <span className="flex min-h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-[#f7f8fc] px-2.5 text-[#070a1a] transition hover:border-[#ec1b72]/35 focus-within:border-[#ec1b72] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(236,27,114,0.08)] sm:min-h-10 sm:gap-2 sm:px-3 lg:min-h-11 lg:rounded-2xl">
        <span className="text-slate-400">{icon}</span>
        <input
          type={isPassword && visible ? "text" : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[11px] font-black outline-none sm:text-sm"
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="text-slate-400 transition hover:text-[#070a1a]"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="size-3 sm:size-4" /> : <Eye className="size-3 sm:size-4" />}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function Message({ text }: { text: string }) {
  const success =
    text.toLowerCase().includes("sent") ||
    text.toLowerCase().includes("updated") ||
    text.toLowerCase().includes("apple") ||
    text.toLowerCase().includes("google");

  return (
    <p
      className={`mt-2.5 rounded-xl border px-2.5 py-1.5 text-[9px] font-black leading-4 sm:mt-3 sm:px-3 sm:py-2 sm:text-xs ${success
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
        : "border-[#ec1b72]/30 bg-[#ec1b72]/10 text-[#ec1b72]"
        }`}
    >
      {text}
    </p>
  );
}

function PasswordChecklist({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}) {
  const checks = [
    { label: "Minimum 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One number", ok: /\d/.test(password) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
    {
      label: "Confirm password matches",
      ok: Boolean(confirmPassword) && password === confirmPassword,
    },
  ];

  return (
    <div className="mt-3 grid gap-1.5 rounded-xl border border-slate-200 bg-[#f7f8fc] p-2.5 sm:p-3">
      {checks.map((check) => (
        <p
          key={check.label}
          className={`text-[10px] font-black sm:text-xs ${check.ok ? "text-emerald-600" : "text-slate-500"}`}
        >
          {check.ok ? "OK" : "-"} {check.label}
        </p>
      ))}
    </div>
  );
}

function isRecoveryPasswordValid(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function sanitizeRedirectPath(value: string | null, role: AuthRole) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;

  let decoded = value;

  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  if (!decoded.startsWith(`/${role}`)) return null;
  if (decoded.startsWith(`/${role}/login`)) return null;
  if (decoded.startsWith(`/${role}/sign-in`)) return null;
  if (decoded.startsWith(`/${role}/signup`)) return null;
  if (decoded.startsWith(`/${role}/forgot-password`)) return null;
  if (decoded.startsWith(`/${role}/reset-password`)) return null;

  return decoded;
}

