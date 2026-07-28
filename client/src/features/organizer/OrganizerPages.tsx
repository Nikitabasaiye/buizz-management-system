"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileCheck2,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Phone,
  QrCode,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BuizzLogo } from "@/components/brand/BuizzLogo";
import {
  useOrganizerRegisterMutation,
  useOrganizerLoginMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
} from "@/store/api";
import { saveOrganizerApprovalState } from "@/features/organizer/ApprovalStatusComponents";
import { startFacebookOAuth, startGoogleOAuth } from "@/features/auth/googleOAuth";
const setupSteps = ["General Information", "Upload Documents", "Sign Agreement"];





const businessTypes = ["Individual", "Company", "Partnership", "LLP", "NGO"];
const accountTypes = ["Savings", "Current"];

const organizerPrimarySessionKey = "buizz-organizer-session";
const organizerLegacySessionKey = "buizz-organizer";
const organizerApprovalStatusKey = "buizz-organizer-approval-status";

const organizerApprovedPermissions = [
  "createEvents",
  "editEvents",
  "viewBookings",
  "offlineBooking",
  "manageAttendees",
  "ticketScanner",
  "viewRevenue",
  "canManageSeatMap",
];

function getOrganizerRedirectPath(value: string | null) {
  if (!value) return "/organizer/dashboard";

  try {
    const decoded = decodeURIComponent(value);

    if (
      decoded.startsWith("/organizer") &&
      !decoded.startsWith("/organizer/login") &&
      !decoded.startsWith("/organizer/signup") &&
      !decoded.startsWith("/organizer/verify-otp")
    ) {
      return decoded;
    }
  } catch {
    // keep default redirect safe
  }

  return "/organizer/dashboard";
}

function saveOrganizerAuthSession({
  phone,
  email = "",
  name = "Buizz Organizer",
  status,
  rememberMe = true,
}: {
  phone: string;
  email?: string;
  name?: string;
  status: "approved" | "pending";
  rememberMe?: boolean;
}) {
  const permissions = status === "approved" ? organizerApprovedPermissions : [];
  const existingSession = (() => {
    try {
      return JSON.parse(window.localStorage.getItem(organizerPrimarySessionKey) || "{}");
    } catch {
      return {};
    }
  })();

  const sessionPayload = {
    ...existingSession,
    email: email || `${phone || "organizer"}@organizer.buizz.local`,
    phone,
    role: "organizer",
    name,
    orgName: name,
    status,
    permissions,
    rememberMe,
    onboarded: status === "approved",
    loggedInAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    organizerPrimarySessionKey,
    JSON.stringify(sessionPayload),
  );
  window.localStorage.setItem(
    organizerLegacySessionKey,
    JSON.stringify(sessionPayload),
  );

  window.dispatchEvent(new Event("buizz-organizer-auth-updated"));
  window.dispatchEvent(new Event("buizz-organizer-approval-updated"));
  window.dispatchEvent(new Event("storage"));
}

function markOrganizerApproved() {
  window.localStorage.setItem(organizerApprovalStatusKey, "approved");
  saveOrganizerApprovalState({
    organizerStatus: "approved",
    adminApprovalStatus: "approved",
    superAdminApprovalStatus: "approved",
  });
}

function markOrganizerPending() {
  window.localStorage.setItem(organizerApprovalStatusKey, "pending-admin");
  saveOrganizerApprovalState({
    organizerStatus: "pending",
    adminApprovalStatus: "pending",
    superAdminApprovalStatus: "pending",
  });
}


const organizerAuthLabelClass =
  "grid gap-2 text-xs font-black text-white/72 lg:text-slate-500";

const organizerAuthControlClass =
  "flex min-h-12 items-center gap-3 rounded-[1.35rem] border border-white/12 bg-white/16 px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:border-[#ec1b72]/80 focus-within:bg-white/22 focus-within:ring-4 focus-within:ring-[#ec1b72]/15 sm:min-h-14 lg:min-h-12 lg:border-slate-200 lg:bg-[#f8f9fd] lg:text-[#070a1a] lg:shadow-none lg:focus-within:bg-white";

const organizerAuthInputClass =
  "min-h-10 flex-1 bg-transparent text-sm font-black text-white placeholder:text-white/45 outline-none sm:min-h-11 lg:text-[#070a1a] lg:placeholder:text-slate-400";

const organizerAuthGoogleButtonClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-[1.35rem] border border-white/16 bg-white px-4 text-sm font-black text-[#101828] shadow-[0_16px_34px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:min-h-13 lg:border-slate-200 lg:bg-white lg:shadow-none lg:hover:border-slate-300";

const organizerAuthPrimaryButtonClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-[#ec1b72] px-6 text-sm font-black text-white shadow-[0_20px_44px_rgba(236,27,114,0.32)] transition hover:-translate-y-0.5 hover:bg-[#d91564] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:min-h-13";

const organizerAuthSecondaryButtonClass =
  "inline-flex min-h-13 items-center justify-center gap-2 rounded-[1.35rem] border border-white/16 bg-white/10 px-6 text-sm font-black text-white transition hover:bg-white/16 lg:border-slate-200 lg:bg-white lg:text-[#070a1a] lg:hover:border-[#ec1b72]";


export function OrganizerIntroScreen() {
  const heroStats = [
    { label: "Live Events", value: "Create", detail: "Create and publish faster", icon: Ticket },
    { label: "QR Entry", value: "Verify", detail: "Verified gate check-in", icon: QrCode },
    { label: "Analytics", value: "Track", detail: "Track sales and revenue", icon: BarChart3 },
  ];

  return (
    <PageShell>
      <div className="mx-auto grid min-h-screen w-full max-w-[1180px] items-center py-5 sm:py-8 lg:py-10">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_32px_110px_rgba(15,23,42,0.16)] lg:grid lg:min-h-[720px] lg:grid-cols-[0.92fr_1.08fr] lg:p-3"
        >
          <div className="relative min-h-[680px] overflow-hidden bg-[#070a1a] px-5 py-6 text-white sm:px-8 lg:rounded-[28px] lg:p-10">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85")',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#070a1a]/94 via-[#070a1a]/56 to-[#ec1b72]/36" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#070a1a] via-[#070a1a]/78 to-transparent" />

            <div className="relative z-10 flex min-h-[620px] flex-col justify-between">
              <div className="flex items-center justify-between gap-4">
                <BuizzLogo variant="dark" size="md" />
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl">
                  Organizer
                </span>
              </div>

              <div className="max-w-xl pt-12 lg:pt-0">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f6c453]">
                  Host with Buizz
                </p>
                <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl xl:text-6xl">
                  Create events. Sell tickets. Verify every entry.
                </h1>
                <p className="mt-5 max-w-lg text-sm font-semibold leading-7 text-white/76 sm:text-base">
                  A secure organizer workspace for event creation, ticket sales, offline bookings, QR check-in and revenue tracking.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/organizer/signup"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#ec1b72] px-6 text-sm font-black text-white shadow-[0_18px_44px_rgba(236,27,114,0.30)] transition hover:-translate-y-0.5 hover:bg-[#6626b9]"
                  >
                    Start Organizer Setup <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/organizer/login"
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/18"
                  >
                    Login
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {heroStats.map((card) => {
                  const Icon = card.icon;

                  return (
                    <article
                      key={card.label}
                      className="rounded-3xl border border-white/14 bg-white/10 p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl"
                    >
                      <span className="grid size-10 place-items-center rounded-2xl bg-white/15 text-[#f6c453]">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="mt-4 text-sm font-black">{card.label}</h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
                        {card.detail}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="hidden min-h-[700px] items-center justify-center bg-[#f5f7fb] p-8 lg:flex">
            <div className="relative w-full max-w-[520px]">
              <div className="absolute -right-10 -top-10 size-44 rounded-full bg-[#ec1b72]/10 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 size-44 rounded-full bg-[#6626b9]/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-[34px] border border-white bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
                <TicketVisualCard />
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {heroStats.map((card) => {
                    const Icon = card.icon;

                    return (
                      <div
                        key={`desk-${card.label}`}
                        className="rounded-2xl border border-slate-200 bg-[#fbfcff] p-4 text-center"
                      >
                        <Icon className="mx-auto size-5 text-[#ec1b72]" />
                        <p className="mt-2 text-xs font-black text-[#070a1a]">
                          {card.value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </PageShell>
  );
}
export function OrganizerSignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("9876543210");
  const [countryCode, setCountryCode] = useState("+91");
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendEmailOtp] = useSendOtpMutation();
  const [sendPhoneOtp] = useSendPhoneOtpMutation();

  const continueWithGoogle = () => {
    try {
      startGoogleOAuth("organizer");
    } catch (err: any) {
      setError(err?.message || "Google signup is not configured.");
    }
  };

  const continueWithFacebook = async () => {
    try {
      await startFacebookOAuth("organizer");
    } catch (err: any) {
      setError(err?.message || "Facebook signup is not configured.");
    }
  };

  const sendOtp = async () => {
    const cleanedPhone = phone.replace(/\D/g, "");
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid organizer email address.");
      return;
    }
    if (cleanedPhone.length < 10) {
      setError("Please enter a valid organizer phone number.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the organizer terms before continuing.");
      return;
    }

    const normalizedPhone = `${countryCode}${cleanedPhone}`.replace(/\s/g, "");
    setSending(true);
    try {
      await Promise.all([
        sendEmailOtp({ email: email.trim().toLowerCase() }).unwrap(),
        sendPhoneOtp({
          phone: normalizedPhone,
          email: email.trim().toLowerCase(),
          purpose: "signup",
        }).unwrap(),
      ]);
      window.localStorage.setItem("buizz-organizer-email", email.trim().toLowerCase());
      window.localStorage.setItem("buizz-organizer-phone", normalizedPhone);
      window.localStorage.setItem("buizz-organizer-country-code", countryCode);
      window.localStorage.setItem("buizz-organizer-signup-started", "true");
      router.push("/organizer/verify-otp");
    } catch (err: any) {
      setError(err?.data?.message || "Unable to send verification codes.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title="Sign Up"
      description="Verify your phone number to start creating events, selling tickets and tracking bookings."
      icon={<Phone className="size-5" />}
      backHref="/organizer/intro"
      backLabel="Back to organizer"
    >
      <button type="button" onClick={continueWithGoogle} className={organizerAuthGoogleButtonClass}>
        <GoogleIcon className="size-5 shrink-0" />
        <span>Continue with Google</span>
      </button>
      <button type="button" onClick={continueWithFacebook} className={`${organizerAuthGoogleButtonClass} mt-2`}>
        <span className="grid size-5 place-items-center rounded-full bg-[#1877F2] text-sm font-black text-white">f</span>
        <span>Continue with Facebook</span>
      </button>

      <AuthDivider />

      <div className="grid gap-3 sm:gap-4">
        <label className={organizerAuthLabelClass}>
          Email Address
          <div className={organizerAuthControlClass}>
            <Mail className="size-4 shrink-0 text-white/64 lg:text-slate-400" />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              inputMode="email"
              autoComplete="email"
              placeholder="organizer@example.com"
              className={organizerAuthInputClass}
            />
          </div>
        </label>
        <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
          <label className={organizerAuthLabelClass}>
            Country
            <div className={organizerAuthControlClass}>
              <select
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="min-h-11 w-full appearance-none bg-transparent text-sm font-black text-white outline-none lg:text-[#070a1a]"
              >
                <option>+91</option>
                <option>+1</option>
                <option>+44</option>
              </select>
            </div>
          </label>

          <label className={organizerAuthLabelClass}>
            Phone Number
            <div className={organizerAuthControlClass}>
              <Phone className="size-4 shrink-0 text-white/64 lg:text-slate-400" />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="numeric"
                placeholder="Enter phone number"
                className={organizerAuthInputClass}
              />
            </div>
          </label>
        </div>

        <label className="flex items-start gap-2 text-xs font-bold leading-5 text-white/70 lg:text-slate-500">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 size-4 rounded border-white/30 accent-[#ec1b72] lg:border-slate-300"
          />
          <span>I agree to the Buizz organizer terms, ticketing rules and verification process.</span>
        </label>

        {error ? <AuthErrorMessage message={error} /> : null}

        <motion.button
          type="button"
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={sendOtp}
          disabled={sending}
          className={organizerAuthPrimaryButtonClass}
        >
          <Phone className="size-4" />
          {sending ? "Sending OTPs..." : "Send Email & Phone OTP"}
        </motion.button>
      </div>

      <p className="mt-6 text-center text-sm font-bold text-white/70 lg:text-slate-500">
        Already have an account?{" "}
        <Link href="/organizer/login" className="font-black text-white transition hover:text-[#f6c453] lg:text-[#ec1b72] lg:hover:text-[#070a1a]">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}

export function OrganizerVerifyOtpScreen() {
  const router = useRouter();
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyEmailOtp] = useVerifyOtpMutation();
  const [verifyPhoneOtp] = useVerifyPhoneOtpMutation();

  const verifyOtp = async () => {
    setError("");

    if (emailOtp.length !== 6 || phoneOtp.length !== 6) {
      setError("Enter both 6-character codes (3 letters and 3 digits).");
      return;
    }

    setVerifying(true);
    try {
      const email = window.localStorage.getItem("buizz-organizer-email") ?? "";
      const phone = window.localStorage.getItem("buizz-organizer-phone") ?? "";
      const [emailResult, phoneResult] = await Promise.all([
        verifyEmailOtp({ email, otp: emailOtp.toUpperCase() }).unwrap(),
        verifyPhoneOtp({ phone, otp: phoneOtp.toUpperCase(), purpose: "signup" }).unwrap(),
      ]);
      const emailToken = emailResult.data?.verificationToken;
      const phoneToken = phoneResult.data?.verificationToken;
      if (!emailToken || !phoneToken) throw new Error("Verification tokens were not returned");
      window.localStorage.setItem("buizz-organizer-email-verification-token", emailToken);
      window.localStorage.setItem("buizz-organizer-phone-verification-token", phoneToken);
      window.localStorage.setItem("buizz-organizer-email-verified", "true");
      window.localStorage.setItem("buizz-organizer-phone-verified", "true");
      router.push("/organizer/general-information");
    } catch (err: any) {
      setError(err?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AuthShell
      title="Verify Email and Phone"
      description="Each code contains exactly 3 letters and 3 digits."
      icon={<ShieldCheck className="size-5" />}
      backHref="/organizer/signup"
      backLabel="Back to signup"
    >
      <div className="rounded-[24px] border border-slate-200 bg-[#f8f9fd] p-4">
        <p className="mb-2 text-xs font-black text-slate-600">Email OTP</p>
        <OTPInput value={emailOtp} onChange={setEmailOtp} />
        <p className="mb-2 mt-4 text-xs font-black text-slate-600">Phone OTP</p>
        <OTPInput value={phoneOtp} onChange={setPhoneOtp} />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-600">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={verifyOtp}
        disabled={verifying}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#070a1a] px-6 text-sm font-black text-white shadow-[0_18px_44px_rgba(7,10,26,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ec1b72]"
      >
        <ShieldCheck className="size-4" />
        {verifying ? "Verifying..." : "Verify Email & Phone"}
      </button>
    </AuthShell>
  );
}

export function OrganizerLoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [organizerLogin] = useOrganizerLoginMutation();

  const continueWithGoogle = () => {
    try {
      startGoogleOAuth("organizer");
    } catch (err: any) {
      setError(err?.message || "Google login is not configured.");
    }
  };

  const continueWithFacebook = async () => {
    try {
      await startFacebookOAuth("organizer");
    } catch (err: any) {
      setError(err?.message || "Facebook login is not configured.");
    }
  };

  const login = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      const result = await organizerLogin({ email, password }).unwrap();
      const organizerUser = result.data.user as typeof result.data.user & { kycStatus?: string; kyc_status?: string };
      const kycStatus = organizerUser?.kycStatus ?? organizerUser?.kyc_status ?? 'pending';
      const isApproved = kycStatus === 'verified' || kycStatus === 'approved';

      if (isApproved) {
        markOrganizerApproved();
      } else {
        markOrganizerPending();
      }

      saveOrganizerAuthSession({
        phone: organizerUser?.phone || "",
        email: organizerUser?.email || email,
        name: organizerUser?.name || "Buizz Organizer",
        status: isApproved ? "approved" : "pending",
        rememberMe,
      });

      const redirectPath = getOrganizerRedirectPath(searchParams?.get("redirect") ?? null);
      router.replace(redirectPath);
    } catch (err: any) {
      setError(err?.data?.message || "Login failed. Please check your credentials.");
    }
  };

  return (
    <AuthShell
      title="Login"
      description="Login securely to manage events, bookings, tickets, QR check-in and revenue."
      icon={<LockKeyhole className="size-5" />}
      backHref="/organizer/intro"
      backLabel="Back to organizer"
    >
      <button type="button" onClick={continueWithGoogle} className={organizerAuthGoogleButtonClass}>
        <GoogleIcon className="size-5 shrink-0" />
        <span>Continue with Google</span>
      </button>
      <button type="button" onClick={continueWithFacebook} className={`${organizerAuthGoogleButtonClass} mt-2`}>
        <span className="grid size-5 place-items-center rounded-full bg-[#1877F2] text-sm font-black text-white">f</span>
        <span>Continue with Facebook</span>
      </button>

      <AuthDivider />

      <div className="grid gap-3 sm:gap-4">
        <label className={organizerAuthLabelClass}>
          Email Address
          <div className={organizerAuthControlClass}>
            <Phone className="size-4 shrink-0 text-white/64 lg:text-slate-400" />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Enter organizer email"
              className={organizerAuthInputClass}
            />
          </div>
        </label>

        <label className={organizerAuthLabelClass}>
          Password
          <div className={organizerAuthControlClass}>
            <LockKeyhole className="size-4 shrink-0 text-white/64 lg:text-slate-400" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              className={organizerAuthInputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="text-white/60 transition hover:text-white lg:text-slate-400 lg:hover:text-[#070a1a]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-white/70 lg:text-slate-500">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="size-4 rounded border-white/30 accent-[#ec1b72] lg:border-slate-300"
          />
          Keep me logged in
        </label>

        <Link
          href="/organizer/forgot-password"
          className="text-xs font-black text-white underline-offset-4 transition hover:text-[#f6c453] hover:underline lg:text-[#ec1b72] lg:hover:text-[#070a1a]"
        >
          Forgot Password?
        </Link>
      </div>

      {error ? <AuthErrorMessage message={error} /> : null}

      <button type="button" onClick={login} className={`${organizerAuthPrimaryButtonClass} mt-6`}>
        Login
      </button>

      <p className="mt-5 text-center text-sm font-bold text-white/70 lg:text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/organizer/signup" className="font-black text-white transition hover:text-[#f6c453] lg:text-[#ec1b72] lg:hover:text-[#070a1a]">
          Sign Up
        </Link>
      </p>
    </AuthShell>
  );
}

export function GeneralInformationScreen() {
  return (
    <WizardShell currentStep={0} title="Organizer onboarding" description="Start with your organization, contact, and bank details.">
      <div className="mb-5 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_16px_46px_rgba(17,24,39,0.06)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
            <FileCheck2 className="size-5" />
          </span>
          <div>
            <p className="text-sm font-black text-[var(--app-foreground)]">Your details are used for verification and payouts.</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">Keep organization, contact person, and bank information accurate so Admin or Super Admin can approve your profile quickly.</p>
          </div>
        </div>
      </div>
      <div className="grid gap-5">
        <SectionCard title="Organization Details">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Organization / Business Name" placeholder="Aventra Live Experiences" />
            <SelectField label="Business Type" options={businessTypes} />
            <InputField label="PAN Number" placeholder="ABCDE1234F" />
            <InputField label="GST Number (Optional)" placeholder="27ABCDE1234F1Z5" />
            <InputField label="Business Address" placeholder="Office address" className="md:col-span-2" />
            <InputField label="City" placeholder="Chhatrapati Sambhaji Nagar" />
            <InputField label="State" placeholder="Maharashtra" />
            <InputField label="Pincode" placeholder="431001" />
            <InputField label="Website / Social Media Link (Optional)" placeholder="https://instagram.com/yourbrand" />
          </div>
        </SectionCard>

        <SectionCard title="Contact Person Details">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Full Name" placeholder="Rohan Mehta" />
            <InputField label="Designation" placeholder="Founder" />
            <InputField label="Email Address" placeholder="organizer@buizz.local" type="email" />
            <InputField label="Mobile Number" placeholder="9876543210" />
            <InputField label="Alternate Mobile Number (Optional)" placeholder="9876500000" />
          </div>
        </SectionCard>

        <SectionCard title="Bank Details">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Beneficiary Name" placeholder="Aventra Live Experiences" />
            <SelectField label="Account Type" options={accountTypes} />
            <InputField label="Bank Name" placeholder="HDFC Bank" />
            <InputField label="Account Number" placeholder="123456789012" />
            <InputField label="Confirm Account Number" placeholder="123456789012" />
            <InputField label="IFSC Code" placeholder="HDFC0001234" />
            <InputField label="UPI ID (Optional)" placeholder="aventra@upi" />
          </div>
        </SectionCard>
      </div>

      <WizardActions backHref="/organizer/signup" nextHref="/organizer/upload-documents" />
    </WizardShell>
  );
}

type OrganizerDocumentItem = {
  name: string;
  required?: boolean;
  examples?: string[];
  note?: string;
};

type OrganizerDocumentDraft = Record<string, string>;

const organizerDocumentDraftKey = "buizz-organizer-document-draft";

const organizerDocuments: OrganizerDocumentItem[] = [
  {
    name: "PAN Card",
    required: true,
    examples: ["PDF, JPG or PNG accepted"],
    note: "Used for tax and organizer identity verification.",
  },
  {
    name: "Aadhaar Card",
    required: true,
    examples: ["PDF, JPG or PNG accepted"],
    note: "Used for authorized representative verification.",
  },
  {
    name: "Bank Passbook / Cancelled Cheque",
    required: true,
    examples: ["PDF, JPG or PNG accepted"],
    note: "Used to verify payout account details.",
  },
  {
    name: "GST Certificate",
    examples: ["GST Registration"],
    note: "Optional for individual organizers without GST.",
  },
  {
    name: "Business Registration Certificate",
    examples: ["MSME Certificate", "Company Incorporation", "Shop Act License"],
    note: "Upload if your event brand is registered.",
  },
  {
    name: "Address Proof",
    examples: ["Electricity Bill", "Rent Agreement"],
    note: "Optional but helpful for faster verification.",
  },
];

function readOrganizerDocumentDraft(): OrganizerDocumentDraft {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(organizerDocumentDraftKey) ?? "{}",
    );

    if (!parsed || typeof parsed !== "object") return {};

    return parsed as OrganizerDocumentDraft;
  } catch {
    return {};
  }
}

export function UploadDocumentsScreen() {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<OrganizerDocumentDraft>(() =>
    readOrganizerDocumentDraft(),
  );
  const requiredDocuments = organizerDocuments.filter((document) => document.required);
  const uploadedRequiredCount = requiredDocuments.filter(
    (document) => Boolean(uploadedFiles[document.name]),
  ).length;
  const uploadedCount = organizerDocuments.filter((document) =>
    Boolean(uploadedFiles[document.name]),
  ).length;
  const canContinue = uploadedRequiredCount === requiredDocuments.length;

  const saveDocumentDraft = (nextFiles = uploadedFiles) => {
    window.localStorage.setItem(
      organizerDocumentDraftKey,
      JSON.stringify(nextFiles),
    );
    window.dispatchEvent(new Event("buizz-organizer-documents-updated"));
    window.dispatchEvent(new Event("storage"));
  };

  const updateDocumentFile = (documentName: string, fileName: string) => {
    setUploadedFiles((current) => {
      const nextFiles = {
        ...current,
        [documentName]: fileName,
      };

      saveDocumentDraft(nextFiles);
      return nextFiles;
    });
  };

  const removeDocumentFile = (documentName: string) => {
    setUploadedFiles((current) => {
      const nextFiles = { ...current };
      delete nextFiles[documentName];
      saveDocumentDraft(nextFiles);
      return nextFiles;
    });
  };

  return (
    <WizardShell
      currentStep={1}
      title="Upload Documents"
      description="Add identity, business and payout documents so Buizz can verify your organizer profile before event publishing."
    >
      <div className="grid gap-5">
        <section className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_54px_rgba(17,24,39,0.07)]">
          <div className="grid gap-4 border-b border-[var(--app-border)] bg-[linear-gradient(135deg,rgba(236,27,114,0.10),rgba(102,38,185,0.08),rgba(255,255,255,0.7))] p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] shadow-[0_14px_32px_rgba(236,27,114,0.14)]">
                <FileCheck2 className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-[var(--app-foreground)] sm:text-2xl">
                  Identity Verification
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                  Required documents must be uploaded before you continue to agreement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-white/80 text-center shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:min-w-[360px]">
              <div className="p-3">
                <p className="text-2xl font-black text-[var(--app-foreground)]">
                  {uploadedCount}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--app-muted)]">
                  Uploaded
                </p>
              </div>
              <div className="border-x border-[var(--app-border)] p-3">
                <p className="text-2xl font-black text-[var(--color-brand-primary)]">
                  {uploadedRequiredCount}/{requiredDocuments.length}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--app-muted)]">
                  Required
                </p>
              </div>
              <div className="p-3">
                <p className="text-2xl font-black text-[var(--app-foreground)]">
                  {organizerDocuments.length}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--app-muted)]">
                  Total
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {organizerDocuments.map((document) => (
                <DocumentUploadCard
                  key={document.name}
                  document={document}
                  fileName={uploadedFiles[document.name] ?? ""}
                  onFileChange={(fileName) => updateDocumentFile(document.name, fileName)}
                  onRemove={() => removeDocumentFile(document.name)}
                />
              ))}
            </div>

            {!canContinue ? (
              <div className="mt-5 rounded-2xl border border-[var(--color-brand-accent)]/35 bg-[var(--color-brand-accent)]/10 p-4 text-sm font-bold leading-6 text-[var(--app-foreground)]">
                Upload all required documents: PAN Card, Aadhaar Card and Bank Passbook / Cancelled Cheque.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-[#22C55E]/25 bg-[#22C55E]/10 p-4 text-sm font-black text-[#16A34A]">
                Required documents are ready. You can continue to the agreement step.
              </div>
            )}
          </div>
        </section>
      </div>

      <WizardActions
        backHref="/organizer/general-information"
        nextHref="/organizer/agreement"
        backLabel="Save Draft"
        nextLabel="Continue"
        disabled={!canContinue}
        helperText={
          canContinue
            ? "All required documents are saved locally."
            : "Required documents are pending."
        }
        onBack={() => saveDocumentDraft()}
        onNext={() => {
          saveDocumentDraft();
          router.push("/organizer/agreement");
        }}
      />
    </WizardShell>
  );
}

export function AgreementScreen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [confirmTruth, setConfirmTruth] = useState(false);
  const canProceed = accepted && confirmTruth;

  const proceedToPassword = () => {
    window.localStorage.setItem(
      "buizz-organizer-agreement-accepted",
      JSON.stringify({
        accepted: true,
        confirmTruth: true,
        acceptedAt: new Date().toISOString(),
      }),
    );
    window.dispatchEvent(new Event("buizz-organizer-agreement-updated"));
    router.push("/organizer/create-password");
  };

  return (
    <WizardShell
      currentStep={2}
      title="Sign Agreement"
      description="Review the Buizz Organizer Agreement, confirm your uploaded details and continue to account security."
    >
      <div className="grid gap-5">
        <AgreementCard />

        <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_16px_46px_rgba(17,24,39,0.06)] sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-[var(--app-foreground)]">
                Final Confirmation
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                These confirmations are required before creating your secure organizer login.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-bold leading-6 text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/50 hover:bg-[var(--app-elevated)]">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 size-5 rounded border-[var(--color-border-default)] accent-[var(--color-brand-primary)]"
              />
              <span>I have read and agree to the Buizz Organizer Agreement.</span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-bold leading-6 text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/50 hover:bg-[var(--app-elevated)]">
              <input
                type="checkbox"
                checked={confirmTruth}
                onChange={(event) => setConfirmTruth(event.target.checked)}
                className="mt-1 size-5 rounded border-[var(--color-border-default)] accent-[var(--color-brand-primary)]"
              />
              <span>I confirm all organization, document and bank details submitted are correct.</span>
            </label>
          </div>
        </section>
      </div>

      <WizardActions
        backHref="/organizer/upload-documents"
        nextHref="/organizer/create-password"
        backLabel="Back"
        nextLabel="Proceed"
        disabled={!canProceed}
        helperText={
          canProceed
            ? "Agreement confirmed. You can create your secure login."
            : "Accept both confirmations to continue."
        }
        onNext={proceedToPassword}
      />
    </WizardShell>
  );
}

export function CreatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordValid = isOrganizerPasswordValid(password);
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;
  const canSubmit = passwordValid && passwordsMatch;
  const [organizerRegister] = useOrganizerRegisterMutation();

  const createAccount = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const phone = window.localStorage.getItem("buizz-organizer-phone") ?? "";
      const email = window.localStorage.getItem("buizz-organizer-email") ?? "";
      const name = window.localStorage.getItem("buizz-organizer-name") ?? "Buizz Organizer";
      const businessName = window.localStorage.getItem("buizz-organizer-business-name") ?? "";
      const emailVerificationToken = window.localStorage.getItem("buizz-organizer-email-verification-token") ?? "";
      const phoneVerificationToken = window.localStorage.getItem("buizz-organizer-phone-verification-token") ?? "";

      if (!email.trim()) {
        setError("Email is missing. Please restart the signup process.");
        setIsSubmitting(false);
        return;
      }

      const result = await organizerRegister({
        name,
        email,
        password,
        phone: phone || undefined,
        businessName: businessName || undefined,
        emailVerificationToken,
        phoneVerificationToken,
      }).unwrap();

      const organizerUser = result.data.user ?? result.data.organizer;
      const kycStatus = (organizerUser as any)?.kycStatus ?? (organizerUser as any)?.kyc_status ?? "pending";
      const isApproved = kycStatus === "verified" || kycStatus === "approved";

      markOrganizerPending();
      saveOrganizerAuthSession({
        phone: phone || "",
        email: (organizerUser as any)?.email || email,
        name: (organizerUser as any)?.name || name,
        status: isApproved ? "approved" : "pending",
        rememberMe: true,
      });

      // Store token from registration response
      if (result.data.token) {
        const session = JSON.parse(window.localStorage.getItem("buizz-organizer-session") || "{}");
        window.localStorage.setItem("buizz-organizer-session", JSON.stringify({ ...session, token: result.data.token, refreshToken: result.data.refreshToken }));
      }

      router.replace("/organizer/dashboard");
    } catch (err: any) {
      setError(err?.data?.message || "Account creation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Secure Your Account"
      description="Create a strong password for future organizer logins. Your dashboard opens only after login and approval."
      icon={<LockKeyhole className="size-5" />}
      backHref="/organizer/agreement"
      backLabel="Back to agreement"
    >
      <div className="grid gap-3 sm:gap-4">
        <InputField
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="Create password"
        />

        <InputField
          label="Confirm Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type="password"
          placeholder="Confirm password"
        />

        <PasswordStrength password={password} />

        {confirmPassword && !passwordsMatch ? (
          <p className="rounded-2xl border border-[var(--color-status-danger)]/25 bg-[var(--color-status-danger)]/10 px-4 py-3 text-xs font-black text-[var(--color-status-danger)]">
            Password and confirm password must match.
          </p>
        ) : null}
      </div>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-600">
            {error}
          </p>
        ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link
          href="/organizer/agreement"
          className={organizerAuthSecondaryButtonClass}
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <button
          type="button"
          onClick={createAccount}
          disabled={!canSubmit || isSubmitting}
          className={organizerAuthPrimaryButtonClass}
        >
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </button>
      </div>
    </AuthShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--app-background)] px-4 text-[var(--app-foreground)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-[var(--color-brand-primary)]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 size-72 rounded-full bg-[var(--color-brand-secondary)]/12 blur-3xl" />
      <div className="relative">{children}</div>
    </main>
  );
}

function AuthShell({
  title,
  description,
  icon,
  children,
  backHref = "/organizer/intro",
  backLabel = "Back to organizer",
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <PageShell>
      <div className="-mx-4 min-h-[100dvh] sm:-mx-6 lg:mx-0 lg:grid lg:place-items-center lg:py-6">
        <section className="relative min-h-[100dvh] w-full overflow-hidden bg-[#070a1a] lg:grid lg:min-h-[720px] lg:max-w-[1180px] lg:grid-cols-[1.02fr_0.98fr] lg:rounded-[34px] lg:border lg:border-white/70 lg:bg-white lg:p-3 lg:shadow-[0_30px_100px_rgba(15,23,42,0.16)]">
          <div
            className="absolute inset-0 bg-cover bg-center lg:hidden"
            style={{
              backgroundImage:
                'url("https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85")',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071225]/30 via-[#070a1a]/58 to-black lg:hidden" />
          <OrganizerAuthVisualPanel />

          <div className="relative z-10 flex min-h-[100dvh] items-start justify-center overflow-y-auto px-4 py-5 sm:items-center sm:px-6 sm:py-8 lg:min-h-[700px] lg:items-center lg:overflow-visible lg:rounded-[28px] lg:bg-[#fbfcff] lg:px-10 lg:py-10">
            <div className="w-full max-w-[calc(100vw-2rem)] rounded-[28px] border border-white/18 bg-[#0f111c]/62 p-4 text-white shadow-[0_28px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:max-w-[390px] sm:rounded-[2rem] sm:p-7 lg:max-w-[430px] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:text-[#070a1a] lg:shadow-none lg:backdrop-blur-0">
              <Link
                href={backHref}
                className="mb-4 inline-flex items-center gap-2 text-xs font-black text-white/78 transition hover:text-white sm:mb-6 lg:text-[#070a1a] lg:hover:text-[#ec1b72]"
              >
                <ArrowLeft className="size-4" />
                {backLabel}
              </Link>

              <AuthBrandLogo />

              <div className="mt-5 text-center sm:mt-7">
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-white/14 text-white sm:mb-4 sm:size-12 lg:bg-[#fff0f6] lg:text-[#ec1b72]">
                  {icon}
                </div>

                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl lg:text-[#070a1a]">
                  {title}
                </h1>
                <div className="mx-auto mt-3 h-0.5 w-36 rounded-full bg-[#ec1b72] sm:mt-4 sm:w-44" />

                <p className="mx-auto mt-3 max-w-sm text-xs font-bold leading-5 text-white/72 sm:mt-4 sm:text-sm sm:leading-6 lg:text-slate-500">
                  {description}
                </p>
              </div>

              <div className="mt-5 sm:mt-7">{children}</div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function AuthBrandLogo() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2 lg:hidden">
        <span className="grid size-10 place-items-center rounded-2xl bg-white/14 text-[#ff4b93] sm:size-12">
          <Ticket className="size-6" />
        </span>
        <BuizzLogo variant="dark" size="md" />
      </div>
      <div className="hidden items-center gap-3 lg:flex">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#fff0f6] text-[#ec1b72] shadow-[0_14px_34px_rgba(236,27,114,0.16)]">
          <Ticket className="size-6" />
        </span>
        <BuizzLogo size="md" />
      </div>
    </div>
  );
}

function GoogleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.1 0 9.8-1.9 13.3-5.1l-6.1-5.2C29.2 35.2 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.3-4.1 5.7l6.1 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3 sm:my-6 lg:my-7">
      <div className="h-px flex-1 bg-white/22 lg:bg-slate-200" />
      <span className="text-xs font-black text-white/62 lg:text-slate-400">Or</span>
      <div className="h-px flex-1 bg-white/22 lg:bg-slate-200" />
    </div>
  );
}

function AuthErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-xl border border-red-300/35 bg-red-500/12 px-4 py-3 text-xs font-black text-red-100 lg:border-red-200 lg:bg-red-50 lg:text-red-600">
      {message}
    </div>
  );
}

function StepProgress({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_14px_36px_rgba(17,24,39,0.05)]">
      <div className="grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;

          return (
            <div
              key={step}
              className={`rounded-2xl border p-3 transition sm:p-4 ${completed || active
                ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)]"
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${completed || active ? "bg-[var(--color-brand-primary)] text-white" : "bg-[var(--app-elevated)] text-[var(--app-muted)]"}`}>
                  {completed ? <Check className="size-4" /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black sm:text-sm">{step}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] opacity-70">
                    {completed ? "Completed" : active ? "Current step" : "Pending"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_16px_46px_rgba(17,24,39,0.06)]">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <FileCheck2 className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-[var(--app-foreground)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function DocumentUploadCard({
  document,
  fileName,
  onFileChange,
  onRemove,
}: {
  document: OrganizerDocumentItem;
  fileName: string;
  onFileChange: (fileName: string) => void;
  onRemove: () => void;
}) {
  const inputId = `organizer-doc-${document.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const isUploaded = Boolean(fileName);

  return (
    <article
      className={`group grid min-h-[220px] gap-4 rounded-[24px] border p-4 transition ${isUploaded
        ? "border-[#22C55E]/35 bg-[#22C55E]/10 shadow-[0_16px_36px_rgba(34,197,94,0.10)]"
        : document.required
          ? "border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/5"
          : "border-[var(--app-border)] bg-[var(--app-subtle)]"
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${isUploaded ? "bg-[#22C55E]/15 text-[#16A34A]" : "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"}`}>
          {isUploaded ? <Check className="size-5" /> : <FileCheck2 className="size-5" />}
        </span>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${isUploaded
          ? "bg-[#22C55E]/15 text-[#16A34A]"
          : document.required
            ? "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
            : "bg-[var(--app-elevated)] text-[var(--app-muted)]"
          }`}>
          {isUploaded ? "Uploaded" : document.required ? "Required" : "Optional"}
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-base font-black text-[var(--app-foreground)]">
          {document.name}
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
          {document.examples?.join(", ") || "PDF, JPG or PNG accepted"}
        </p>
        {document.note ? (
          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
            {document.note}
          </p>
        ) : null}
      </div>

      {isUploaded ? (
        <div className="rounded-2xl border border-[#22C55E]/25 bg-white/75 p-3 text-xs font-black text-[#16A34A]">
          <p className="break-words">{fileName}</p>
        </div>
      ) : null}

      <div className="mt-auto grid gap-2 sm:grid-cols-2">
        <input
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(event) => onFileChange(event.target.files?.[0]?.name ?? "")}
        />
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-xs font-black text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] sm:col-span-2"
        >
          {isUploaded ? "Replace File" : "Choose File"}
        </label>
        {isUploaded ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-600 transition hover:bg-red-100 sm:col-span-2"
          >
            Remove File
          </button>
        ) : null}
      </div>
    </article>
  );
}

function AgreementCard() {
  const points = [
    {
      title: "Business details",
      detail: "Organizer confirms all submitted organization, tax, document and bank details are accurate.",
    },
    {
      title: "Ticketing rules",
      detail: "Tickets, refunds, offers, entry rules and event policies must follow Buizz platform guidelines.",
    },
    {
      title: "Verification",
      detail: "Buizz can review documents before allowing event publishing, payout settlement and QR check-in access.",
    },
    {
      title: "Compliance",
      detail: "Organizer is responsible for valid permissions, venue approvals and lawful event operations.",
    },
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_54px_rgba(17,24,39,0.07)]">
      <div className="grid gap-4 border-b border-[var(--app-border)] bg-[linear-gradient(135deg,rgba(236,27,114,0.10),rgba(102,38,185,0.08),rgba(255,255,255,0.7))] p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] shadow-[0_14px_32px_rgba(236,27,114,0.14)]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-black text-[var(--app-foreground)] sm:text-2xl">
              Buizz Organizer Agreement
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
              Review the agreement points before continuing to account security.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-2 text-xs font-black text-[var(--color-brand-primary)]">
          Required before login setup
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3">
          {points.map((point) => (
            <div
              key={point.title}
              className="flex items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4"
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#22C55E]/10 text-[#16A34A]">
                <Check className="size-4" />
              </span>
              <div>
                <p className="text-sm font-black text-[var(--app-foreground)]">
                  {point.title}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                  {point.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/5 p-5">
          <p className="text-sm font-black text-[var(--color-brand-primary)]">
            What happens next?
          </p>
          <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-[var(--app-muted)]">
            <p>1. Create your secure organizer password.</p>
            <p>2. Your organizer application moves to review.</p>
            <p>3. Admin or Super Admin approves documents.</p>
            <p>4. Dashboard opens after approved login.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function OTPInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const characters = value.padEnd(6, " ").slice(0, 6).split("");

  return (
    <div className="grid grid-cols-6 gap-2">
      {characters.map((character, index) => (
        <input
          key={index}
          aria-label={`OTP character ${index + 1}`}
          inputMode="text"
          maxLength={1}
          value={character.trim()}
          onChange={(event) => {
            const next = value.split("");
            next[index] = event.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(-1);
            onChange(next.join("").slice(0, 6));
          }}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white text-center text-lg font-black text-[#070a1a] outline-none transition focus:border-[#ec1b72] focus:ring-4 focus:ring-[#ec1b72]/10"
        />
      ))}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One number", valid: /\d/.test(password) },
    { label: "One special character", valid: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = rules.filter((rule) => rule.valid).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-slate-500">Password strength</p>
        <p className="text-xs font-black text-[#070a1a]">{score}/4</p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {rules.map((rule, index) => (
          <span
            key={rule.label}
            className={`h-2 rounded-full ${index < score ? "bg-[#ec1b72]" : "bg-slate-200"}`}
          />
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        {rules.map((rule) => (
          <p key={rule.label} className={`flex items-center gap-2 text-xs font-bold ${rule.valid ? "text-emerald-600" : "text-slate-500"}`}>
            <Check className="size-3.5" />
            {rule.label}
          </p>
        ))}
      </div>
    </div>
  );
}

function WizardShell({ currentStep, title, description, children }: { currentStep: number; title: string; description: string; children: ReactNode }) {
  return (
    <PageShell>
      <div className="mx-auto max-w-7xl py-5 sm:py-8 lg:py-10">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/organizer/intro" className="inline-flex text-[var(--color-text-primary)]">
            <BuizzLogo
              size="lg"
              showSubtitle
              subtitle="Organizer Setup"
            />
          </Link>
          <Link href="/organizer/dashboard" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-5 text-sm font-black text-[var(--app-foreground)] transition hover:scale-[1.01] hover:border-[var(--color-brand-secondary)]">
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </div>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
          <div className="mb-5 overflow-hidden rounded-[30px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_20px_60px_rgba(17,24,39,0.07)] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-black leading-tight text-[var(--color-text-primary)] sm:text-4xl">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-secondary)]">{description}</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-2 text-xs font-black text-[var(--color-brand-primary)]">
                Step {currentStep + 1} of {setupSteps.length}
              </span>
            </div>
          </div>
          <StepProgress steps={setupSteps} currentStep={currentStep} />
          <div className="mt-5">{children}</div>
        </motion.section>
      </div>
    </PageShell>
  );
}

function OrganizerAuthVisualPanel() {
  const featureCards = [
    { title: "Live Events", detail: "Create and publish faster", icon: Ticket },
    { title: "QR Entry", detail: "Verified gate check-in", icon: QrCode },
    { title: "Analytics", detail: "Track sales and revenue", icon: BarChart3 },
  ];

  return (
    <div className="relative hidden min-h-[700px] overflow-hidden rounded-[28px] bg-[#070a1a] lg:block">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85")',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#070a1a]/94 via-[#070a1a]/52 to-[#ec1b72]/34" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#070a1a] via-[#070a1a]/78 to-transparent" />

      <div className="relative z-10 flex h-full min-h-[700px] flex-col justify-between p-7 xl:p-10">
        <div className="flex items-center justify-between gap-4">
          <BuizzLogo variant="dark" size="md" />
          <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl">
            Organizer
          </span>
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f6c453]">
            Host with Buizz
          </p>
          <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white xl:text-6xl">
            Create events. Sell tickets. Verify every entry.
          </h2>
          <p className="mt-5 max-w-lg text-sm font-semibold leading-7 text-white/72">
            A secure organizer workspace for event creation, ticket sales, offline bookings, QR check-in and revenue tracking.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="rounded-3xl border border-white/14 bg-white/10 p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              >
                <span className="grid size-10 place-items-center rounded-2xl bg-white/15 text-[#f6c453]">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-sm font-black">{card.title}</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
                  {card.detail}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function TicketVisualCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] border border-white/15 bg-[var(--color-brand-ink)] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] ${compact ? "" : "sm:p-5"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,var(--color-brand-primary),transparent_34%),radial-gradient(circle_at_95%_15%,var(--color-brand-secondary),transparent_32%)] opacity-35" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <BuizzLogo variant="dark" size="sm" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/70">BUIZZ PASS</p>
            <span className="mt-2 inline-flex rounded-full bg-[var(--color-status-success)] px-3 py-1 text-[10px] font-black uppercase text-white">Valid</span>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <p className="text-xs font-black uppercase text-[var(--color-brand-accent)]">Live Concert</p>
          <h3 className="mt-2 text-2xl font-black leading-tight">Neon Nights Festival</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold text-white/72">
            <p>Fri, 19 Jun</p>
            <p>07:30 PM</p>
            <p className="col-span-2">Phoenix Arena, Mumbai</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_104px] gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
            <p className="text-[10px] font-black uppercase text-white/45">Booking ID</p>
            <p className="mt-1 break-all text-sm font-black">BUIZZ-EVNT-9X2A</p>
            <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] font-black text-white/64">
              <span>Gold</span>
              <span>2 seats</span>
              <span>Rs. 2,998</span>
            </div>
          </div>
          <div className="grid aspect-square place-items-center rounded-2xl bg-white p-2 text-[var(--color-brand-ink)]">
            <QrCode className="size-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

function isOrganizerPasswordValid(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-xs font-black text-[var(--color-text-secondary)]">
      {label}
      {children}
    </label>
  );
}

function InputField({ label, className = "", value, onChange, type = "text", placeholder }: { label: string; className?: string; value?: string; onChange?: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className={`grid gap-2 text-xs font-black text-[var(--color-text-secondary)] ${className}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        className="field-control"
      />
    </label>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <FieldLabel label={label}>
      <span className="relative">
        <select className="field-control w-full appearance-none pr-10">
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
      </span>
    </FieldLabel>
  );
}

function WizardActions({
  backHref,
  nextHref,
  backLabel = "Save Draft",
  nextLabel = "Continue",
  disabled = false,
  helperText,
  onBack,
  onNext,
}: {
  backHref: string;
  nextHref: string;
  backLabel?: string;
  nextLabel?: string;
  disabled?: boolean;
  helperText?: string;
  onBack?: () => void;
  onNext?: () => void;
}) {
  const backContent = (
    <>
      <ArrowLeft className="size-4" />
      {backLabel}
    </>
  );

  const nextContent = (
    <>
      {nextLabel} <ArrowRight className="size-4" />
    </>
  );

  return (
    <div className="mt-6 grid gap-3 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_14px_36px_rgba(17,24,39,0.05)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-white px-6 text-sm font-black text-[var(--app-foreground)] transition hover:scale-[1.01] hover:border-[var(--color-brand-secondary)]"
        >
          {backContent}
        </button>
      ) : (
        <Link
          href={backHref}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-white px-6 text-sm font-black text-[var(--app-foreground)] transition hover:scale-[1.01] hover:border-[var(--color-brand-secondary)]"
        >
          {backContent}
        </Link>
      )}

      {helperText ? (
        <p className="text-center text-xs font-black text-[var(--app-muted)] sm:text-left">
          {helperText}
        </p>
      ) : (
        <span />
      )}

      {onNext ? (
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgb(var(--brand-primary-rgb)/0.24)] transition hover:scale-[1.01] hover:bg-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-border-strong)] disabled:shadow-none"
        >
          {nextContent}
        </button>
      ) : disabled ? (
        <button
          type="button"
          disabled
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--color-border-strong)] px-6 text-sm font-black text-white disabled:cursor-not-allowed"
        >
          {nextContent}
        </button>
      ) : (
        <Link
          href={nextHref}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgb(var(--brand-primary-rgb)/0.24)] transition hover:scale-[1.01] hover:bg-[var(--color-brand-primary)]"
        >
          {nextContent}
        </Link>
      )}
    </div>
  );
}
