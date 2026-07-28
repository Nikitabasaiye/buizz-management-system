"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, KeyRound, UserCircle, Eye, EyeOff, Phone, ShieldCheck } from "lucide-react";
import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { LoadingButton } from "@/components/common/LoadingButton";
import { ApiErrorMessage } from "@/components/common/ApiErrorMessage";
import {
  useUserRegisterMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
} from "@/store/api/authApi";
import { setCustomerSession, createSessionFromApiResponse } from "@/features/auth/authSession";
import { useAuthStore } from "@/store/auth.store";

export default function SignupPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get("redirect") || "/events";

  const [name, setName]                   = useState("");
  const [email, setEmail]                 = useState("");
  const [phone, setPhone]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [apiError, setApiError]           = useState<any>(null);
  const [successMsg, setSuccessMsg]       = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");

  const setUser = useAuthStore((state) => state.setUser);
  const [registerMutation, { isLoading }] = useUserRegisterMutation();
  const [sendPhoneOtp, { isLoading: isSendingOtp }] = useSendPhoneOtpMutation();
  const [verifyPhoneOtp, { isLoading: isVerifyingOtp }] = useVerifyPhoneOtpMutation();

  const normalizePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10 ? `+91${digits}` : value.trim();
  };

  const requestPhoneVerification = async () => {
    setApiError(null);
    setSuccessMsg("");
    const normalizedPhone = normalizePhone(phone);
    if (!email.trim()) {
      setApiError({ data: { message: "Enter your email address first for OTP fallback." } });
      return;
    }
    if (!/^\+?[1-9]\d{9,14}$/.test(normalizedPhone)) {
      setApiError({ data: { message: "Enter a valid mobile number." } });
      return;
    }
    try {
      const result = await sendPhoneOtp({
        phone: normalizedPhone,
        email: email.trim().toLowerCase(),
        purpose: "signup",
        deliveryChannel: "auto",
      }).unwrap();
      setPhoneOtpSent(true);
      setPhoneOtp("");
      setPhoneVerificationToken("");
      setSuccessMsg(result.message || "Phone verification code sent.");
    } catch (error) {
      setApiError(error);
    }
  };

  const verifyPhone = async () => {
    setApiError(null);
    setSuccessMsg("");
    const code = phoneOtp.trim().toUpperCase();
    if (!/^(?=(?:.*[A-Z]){3})(?=(?:.*\d){3})[A-Z0-9]{6}$/.test(code)) {
      setApiError({ data: { message: "Enter the 3-letter, 3-digit verification code." } });
      return;
    }
    try {
      const result = await verifyPhoneOtp({
        phone: normalizePhone(phone),
        otp: code,
        purpose: "signup",
      }).unwrap();
      const token = result.data?.verificationToken || "";
      if (!token) throw new Error("Phone verification token was not returned.");
      setPhoneVerificationToken(token);
      setSuccessMsg("Phone number verified successfully.");
    } catch (error) {
      setApiError(error);
    }
  };

  const passwordChecks = [
    { label: "At least 8 characters",       ok: password.length >= 8 },
    { label: "One uppercase letter",         ok: /[A-Z]/.test(password) },
    { label: "One number",                   ok: /\d/.test(password) },
    { label: "One special character",        ok: /[@$!%*?&]/.test(password) },
    { label: "Passwords match",              ok: Boolean(confirmPassword) && password === confirmPassword },
  ];
  const passwordValid = passwordChecks.every((c) => c.ok);

  const handleRegister = async () => {
    setApiError(null);
    setSuccessMsg("");

    if (!name.trim())     { setApiError({ data: { message: "Please enter your full name." } }); return; }
    if (!email.trim())    { setApiError({ data: { message: "Please enter your email address." } }); return; }
    if (!phone.trim())    { setApiError({ data: { message: "Please enter your phone number." } }); return; }
    if (!phoneVerificationToken) { setApiError({ data: { message: "Please verify your phone number." } }); return; }
    if (!password.trim()) { setApiError({ data: { message: "Please create a password." } }); return; }
    if (!passwordValid)   { setApiError({ data: { message: "Please meet all password requirements." } }); return; }

    try {
      const result = await registerMutation({
        name,
        email,
        phone: normalizePhone(phone),
        password,
        phoneVerificationToken,
      }).unwrap();

      const session = createSessionFromApiResponse("customer", {
        token:        result.data.token,
        refreshToken: result.data.refreshToken,
        user:         result.data.user,
      });
      setCustomerSession(session);

      setUser({
        id:                result.data.user?.id || session.userId,
        name:              result.data.user?.name || name,
        email:             result.data.user?.email || email,
        phone:             normalizePhone(phone),
        password:          "",
        authProvider:      "email",
        isEmailVerified:   false,
        isPhoneVerified:   true,
        preferredDelivery: phone ? "both" : "email",
        token:             result.data.token,
        refreshToken:      result.data.refreshToken,
      } as any);

      setSuccessMsg("Account created successfully. Redirecting...");
      setTimeout(() => router.push(redirectPath), 2000);
    } catch (err) {
      setApiError(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8]">
      <div className="pointer-events-none absolute left-1/2 top-10 size-44 -translate-x-1/2 rounded-full bg-[#ec1b72]/8 blur-3xl sm:size-72" />
      <div className="pointer-events-none absolute bottom-0 right-0 size-48 rounded-full bg-[#6626b9]/8 blur-3xl sm:size-80" />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1320px] items-center justify-center px-2 py-3 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid w-full max-w-[282px] overflow-hidden rounded-[28px] border border-white/80 bg-white px-3 py-3 shadow-[0_20px_54px_rgba(15,23,42,0.12)] sm:max-w-[410px] sm:p-5 lg:max-w-[1120px] lg:grid-cols-[minmax(0,0.92fr)_minmax(430px,1.08fr)] lg:rounded-[28px] lg:border-slate-200 lg:p-0 lg:shadow-[0_30px_90px_rgba(15,23,42,0.12)]">

          {/* ── Form ── */}
          <section className="relative flex min-w-0 items-center justify-center px-0 py-0 sm:px-3 sm:py-3 lg:px-10 lg:py-10">
            <div className="w-full min-w-0">
              <Link href="/" className="mb-2 inline-flex min-h-6 items-center gap-1 text-[10px] font-black text-[#070a1a] transition hover:text-[#ec1b72] sm:mb-4 sm:min-h-8 sm:text-xs lg:mb-5">
                <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Buizz
              </Link>

              <header className="mb-5 text-center">
                <BuizzLogo size="xl" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#ec1b72] sm:mt-5 sm:text-[11px]">Buizz Account</p>
                <h1 className="mt-1 text-2xl font-black leading-none tracking-[-0.05em] text-[#070a1a] sm:mt-2 sm:text-[40px]">Create account</h1>
                <p className="mx-auto mt-2 max-w-[280px] text-[10px] font-semibold leading-5 text-slate-500 sm:mt-4 sm:max-w-[360px] sm:text-sm sm:leading-7">
                  Create your Buizz account for fast ticket booking.
                </p>
              </header>

              <section className="relative mx-auto w-full min-w-0 rounded-none border-0 bg-transparent p-0 text-[#070a1a] sm:rounded-[26px] sm:border sm:border-slate-200 sm:bg-white sm:p-5 lg:rounded-[30px] lg:p-6">
                <div className="grid gap-2 sm:gap-3">
                  {/* Name */}
                  <FormField icon={<UserCircle className="size-3.5 shrink-0 text-slate-400" />} label="Full Name">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none placeholder:text-slate-400 sm:text-sm" />
                  </FormField>

                  {/* Email */}
                  <FormField icon={<Mail className="size-3.5 shrink-0 text-slate-400" />} label="Email Address">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none placeholder:text-slate-400 sm:text-sm" />
                  </FormField>

                  <FormField icon={<Phone className="size-3.5 shrink-0 text-slate-400" />} label="Phone Number">
                    <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneOtpSent(false); setPhoneVerificationToken(""); }} placeholder="+91 9876543210" autoComplete="tel" className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none placeholder:text-slate-400 sm:text-sm" />
                  </FormField>

                  <button
                    type="button"
                    onClick={requestPhoneVerification}
                    disabled={isSendingOtp || Boolean(phoneVerificationToken)}
                    className="min-h-9 rounded-xl border border-[#ec1b72] px-3 text-[10px] font-black text-[#ec1b72] transition hover:bg-[#fff5fa] disabled:opacity-50 sm:min-h-11 sm:text-xs"
                  >
                    {phoneVerificationToken ? "Phone verified" : isSendingOtp ? "Sending code..." : phoneOtpSent ? "Resend phone code" : "Send phone code"}
                  </button>
                  {!phoneVerificationToken ? (
                    <p className="text-[9px] font-semibold leading-4 text-slate-500 sm:text-xs">
                      We&apos;ll send the code on WhatsApp. If WhatsApp is unavailable, it will be sent automatically to your email.
                    </p>
                  ) : null}

                  {phoneOtpSent && !phoneVerificationToken ? (
                    <FormField icon={<ShieldCheck className="size-3.5 shrink-0 text-[#ec1b72]" />} label="Phone Verification Code">
                      <input value={phoneOtp} onChange={(event) => setPhoneOtp(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" autoComplete="one-time-code" className="min-w-0 flex-1 bg-transparent text-[11px] font-black uppercase tracking-[0.2em] outline-none placeholder:text-slate-300 sm:text-sm" />
                      <button type="button" onClick={verifyPhone} disabled={isVerifyingOtp} className="text-[9px] font-black text-[#ec1b72] sm:text-xs">
                        {isVerifyingOtp ? "Checking..." : "Verify"}
                      </button>
                    </FormField>
                  ) : null}

                  {/* Password */}
                  <FormField icon={<KeyRound className="size-3.5 shrink-0 text-slate-400" />} label="Password">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create password" autoComplete="new-password" className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none placeholder:text-slate-400 sm:text-sm" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="grid size-6 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 sm:size-8">
                      {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    </button>
                  </FormField>

                  {/* Confirm Password */}
                  <FormField icon={<KeyRound className="size-3.5 shrink-0 text-slate-400" />} label="Confirm Password">
                    <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" autoComplete="new-password" className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none placeholder:text-slate-400 sm:text-sm" />
                  </FormField>
                </div>

                {/* Password checklist */}
                {password ? (
                  <div className="mt-2 grid gap-1 rounded-xl border border-slate-200 bg-[#f7f8fc] p-2.5 sm:mt-3 sm:p-3">
                    {passwordChecks.map((c) => (
                      <p key={c.label} className={`text-[9px] font-black sm:text-[10px] ${c.ok ? "text-emerald-600" : "text-slate-400"}`}>
                        {c.ok ? "✓" : "○"} {c.label}
                      </p>
                    ))}
                  </div>
                ) : null}

                {/* Error / Success */}
                {apiError ? <ApiErrorMessage error={apiError} className="mt-2 sm:mt-3" /> : null}
                {successMsg ? <ApiErrorMessage message={successMsg} type="success" className="mt-2 sm:mt-3" /> : null}

                <LoadingButton
                  loading={isLoading}
                  loadingText="Creating account..."
                  type="button"
                  onClick={handleRegister}
                  className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-[#111827] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:bg-[#ec1b72] disabled:cursor-not-allowed disabled:opacity-55 sm:mt-4 sm:min-h-12 sm:rounded-2xl sm:text-base"
                >
                  Create Account
                </LoadingButton>

                <p className="mt-2 text-center text-[10px] font-semibold text-slate-500 sm:mt-4 sm:text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="font-black text-[#111827] transition hover:text-[#ec1b72]">Login</Link>
                </p>
              </section>
            </div>
          </section>

          {/* ── Visual panel ── */}
          <aside className="relative hidden min-h-[620px] overflow-hidden rounded-r-[28px] bg-[#14051e] p-8 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(236,27,114,0.42),transparent_32%),radial-gradient(circle_at_88%_16%,rgba(102,38,185,0.44),transparent_30%),linear-gradient(145deg,#3b0530_0%,#1d0734_48%,#09020f_100%)]" />
            <div className="relative z-10 flex h-full min-h-[560px] flex-col justify-between">
              <div className="flex items-start justify-between gap-5">
                <BuizzLogo size="lg" variant="dark" />
                <span className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.16em] backdrop-blur-xl">New Account</span>
              </div>
              <div className="max-w-2xl py-8">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f6c453]">Join Buizz</p>
                <h2 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.06em] xl:text-6xl">Discover events. Book tickets. Enter faster.</h2>
                <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-white/76">Create your account and start booking events instantly with secure QR tickets.</p>
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                {[
                  { label: "Instant Booking", desc: "Book in seconds." },
                  { label: "QR Tickets",      desc: "Secure digital entry." },
                  { label: "Easy Refunds",    desc: "Hassle-free cancellations." },
                ].map((card) => (
                  <div key={card.label} className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                    <h3 className="text-sm font-black text-white">{card.label}</h3>
                    <p className="mt-2 text-xs font-semibold leading-5 text-white/65">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function FormField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-[0.06em] text-slate-500 sm:gap-1.5 sm:text-xs">
      {label}
      <span className="flex min-h-8 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-[#070a1a] transition focus-within:border-[#ec1b72] focus-within:shadow-[0_0_0_4px_rgba(236,27,114,0.08)] sm:min-h-12 sm:gap-3 sm:rounded-2xl sm:px-4">
        {icon}
        {children}
      </span>
    </label>
  );
}
