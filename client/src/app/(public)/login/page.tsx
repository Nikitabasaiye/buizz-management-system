"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, KeyRound, Eye, EyeOff, Phone, ShieldCheck } from "lucide-react";
import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { LoadingButton } from "@/components/common/LoadingButton";
import { ApiErrorMessage } from "@/components/common/ApiErrorMessage";
import {
  useUserLoginMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
} from "@/store/api/authApi";
import { setCustomerSession, createSessionFromApiResponse } from "@/features/auth/authSession";
import { useAuthStore } from "@/store/auth.store";
import { getApiError } from "@/utils/apiError";

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get("redirect") || "/events";

  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError]       = useState<unknown>(null);
  const [successMsg, setSuccessMsg]   = useState("");
  const [loginMethod, setLoginMethod] = useState<"password" | "phone">("password");
  const [phone, setPhone]             = useState("");
  const [phoneOtp, setPhoneOtp]       = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);
  const [loginMutation, { isLoading }] = useUserLoginMutation();
  const [sendPhoneOtp, { isLoading: isSendingPhoneOtp }] = useSendPhoneOtpMutation();
  const [verifyPhoneOtp, { isLoading: isVerifyingPhoneOtp }] = useVerifyPhoneOtpMutation();

  const normalizePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10 ? `+91${digits}` : value.trim();
  };

  const setCustomerFromPhoneResult = (result: any) => {
    const user = result.data?.user;
    const session = createSessionFromApiResponse("customer", {
      token: result.data?.token,
      refreshToken: result.data?.refreshToken,
      user,
    });
    setCustomerSession(session);
    setUser({
      id: user?.id || session.userId,
      name: user?.name || "Buizz Customer",
      email: user?.email || "",
      phone: user?.phone || normalizePhone(phone),
      password: "",
      authProvider: "phone",
      isEmailVerified: Boolean(user?.email),
      isPhoneVerified: true,
      preferredDelivery: user?.email ? "both" : "phone",
      token: result.data?.token,
      refreshToken: result.data?.refreshToken,
    } as any);
  };

  const requestPhoneOtp = async () => {
    setApiError(null);
    setSuccessMsg("");
    const normalizedPhone = normalizePhone(phone);
    if (!/^\+?[1-9]\d{9,14}$/.test(normalizedPhone)) {
      setApiError({ data: { message: "Enter a valid mobile number." } });
      return;
    }
    try {
      const result = await sendPhoneOtp({
        phone: normalizedPhone,
        purpose: "login",
        loginRole: "customer",
        deliveryChannel: "auto",
      }).unwrap();
      setPhoneOtpSent(true);
      setPhoneOtp("");
      setSuccessMsg(result.message || "Verification code sent.");
    } catch (error) {
      setApiError(error);
    }
  };

  const loginWithPhone = async () => {
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
        purpose: "login",
        loginRole: "customer",
      }).unwrap();
      setCustomerFromPhoneResult(result);
      setSuccessMsg("Phone verified. Login successful!");
      setTimeout(() => router.push(redirectPath), 900);
    } catch (error) {
      setApiError(error);
    }
  };

  const handleLogin = async () => {
    setApiError(null);
    setSuccessMsg("");

    if (!email.trim()) { setApiError({ data: { message: "Please enter your email address." } }); return; }
    if (!password.trim()) { setApiError({ data: { message: "Please enter your password." } }); return; }

    try {
      const result = await loginMutation({ email, password }).unwrap();

      const session = createSessionFromApiResponse("customer", {
        token:        result.data.token,
        refreshToken: result.data.refreshToken,
        user:         result.data.user,
      });
      setCustomerSession(session);

      setUser({
        id:                result.data.user?.id || session.userId,
        name:              result.data.user?.name || "Buizz Customer",
        email:             result.data.user?.email || email,
        phone:             result.data.user?.phone,
        password:          "",
        authProvider:      "email",
        isEmailVerified:   true,
        isPhoneVerified:   Boolean(result.data.user?.phone),
        preferredDelivery: result.data.user?.phone ? "both" : "email",
        token:             result.data.token,
        refreshToken:      result.data.refreshToken,
      } as any);

      setSuccessMsg("Login successful! Redirecting...");
      setTimeout(() => router.push(redirectPath), 1200);
    } catch (err) {
      setApiError(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (loginMethod === "password") handleLogin();
    else if (phoneOtpSent) loginWithPhone();
    else requestPhoneOtp();
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

              <header className="mb-6 text-center">
                <Link href="/" className="inline-flex items-center rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#ec1b72]/15">
                  <BuizzLogo size="xl" />
                </Link>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#ec1b72] sm:mt-5 sm:text-[11px]">Buizz Account</p>
                <h1 className="mt-1 text-2xl font-black leading-none tracking-[-0.05em] text-[#070a1a] sm:mt-2 sm:text-[40px]">Login</h1>
                <p className="mx-auto mt-2 max-w-[280px] text-[10px] font-semibold leading-5 text-slate-500 sm:mt-4 sm:max-w-[360px] sm:text-sm sm:leading-7">
                  Book events faster and manage your Buizz tickets.
                </p>
              </header>

              <section className="relative mx-auto w-full min-w-0 rounded-none border-0 bg-transparent p-0 text-[#070a1a] sm:rounded-[26px] sm:border sm:border-slate-200 sm:bg-white sm:p-5 lg:rounded-[30px] lg:p-6">
                <div className="mb-3 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 sm:mb-5">
                  {([
                    ["password", "Email & password"],
                    ["phone", "Phone OTP"],
                  ] as const).map(([method, label]) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setLoginMethod(method);
                        setApiError(null);
                        setSuccessMsg("");
                      }}
                      className={`min-h-9 rounded-xl px-2 text-[10px] font-black transition sm:min-h-11 sm:text-xs ${
                        loginMethod === method
                          ? "bg-white text-[#070a1a] shadow-[0_5px_18px_rgba(15,23,42,0.10)]"
                          : "text-slate-500 hover:text-[#ec1b72]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-2 sm:gap-3" onKeyDown={handleKeyDown}>
                  {loginMethod === "password" ? (
                    <>
                  <label className="grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-[0.06em] text-slate-500 sm:gap-1.5 sm:text-xs">
                    Email address
                    <span className="flex min-h-8 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-[#070a1a] transition focus-within:border-[#ec1b72] focus-within:shadow-[0_0_0_4px_rgba(236,27,114,0.08)] sm:min-h-12 sm:gap-3 sm:rounded-2xl sm:px-4">
                      <Mail className="size-3.5 shrink-0 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none placeholder:text-slate-400 sm:text-sm"
                      />
                    </span>
                  </label>

                  <label className="grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-[0.06em] text-slate-500 sm:gap-1.5 sm:text-xs">
                    Password
                    <span className="flex min-h-8 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-[#070a1a] transition focus-within:border-[#ec1b72] focus-within:shadow-[0_0_0_4px_rgba(236,27,114,0.08)] sm:min-h-12 sm:gap-3 sm:rounded-2xl sm:px-4">
                      <KeyRound className="size-3.5 shrink-0 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        autoComplete="current-password"
                        className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none placeholder:text-slate-400 sm:text-sm"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="grid size-6 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 sm:size-8">
                        {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                      </button>
                    </span>
                  </label>
                    </>
                  ) : (
                    <>
                      <label className="grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-[0.06em] text-slate-500 sm:gap-1.5 sm:text-xs">
                        Mobile number
                        <span className="flex min-h-8 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 transition focus-within:border-[#ec1b72] focus-within:shadow-[0_0_0_4px_rgba(236,27,114,0.08)] sm:min-h-12 sm:gap-3 sm:rounded-2xl sm:px-4">
                          <Phone className="size-3.5 shrink-0 text-slate-400" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(event) => {
                              setPhone(event.target.value);
                              setPhoneOtpSent(false);
                              setPhoneOtp("");
                            }}
                            placeholder="+91 98765 43210"
                            autoComplete="tel"
                            className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none placeholder:text-slate-400 sm:text-sm"
                          />
                        </span>
                      </label>
                      {phoneOtpSent ? (
                        <label className="grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-[0.06em] text-slate-500 sm:gap-1.5 sm:text-xs">
                          Verification code
                          <span className="flex min-h-8 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 transition focus-within:border-[#ec1b72] focus-within:shadow-[0_0_0_4px_rgba(236,27,114,0.08)] sm:min-h-12 sm:gap-3 sm:rounded-2xl sm:px-4">
                            <ShieldCheck className="size-3.5 shrink-0 text-[#ec1b72]" />
                            <input
                              value={phoneOtp}
                              onChange={(event) => setPhoneOtp(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                              placeholder="ABC123"
                              autoComplete="one-time-code"
                              inputMode="text"
                              className="min-w-0 flex-1 bg-transparent text-[12px] font-black uppercase tracking-[0.24em] outline-none placeholder:text-slate-300 sm:text-base"
                            />
                            <button type="button" onClick={requestPhoneOtp} className="text-[9px] font-black text-[#ec1b72] hover:text-[#070a1a] sm:text-xs">
                              Resend
                            </button>
                          </span>
                        </label>
                      ) : null}
                      <p className="text-[9px] font-semibold leading-4 text-slate-500 sm:text-xs">
                        We&apos;ll send the code on WhatsApp. If WhatsApp is unavailable, we&apos;ll automatically use your registered email.
                      </p>
                    </>
                  )}
                </div>

                {loginMethod === "password" ? (
                <div className="mt-2 flex items-center justify-end sm:mt-3">
                  <Link href="/forgot-password" className="text-[9px] font-black text-[#111827] transition hover:text-[#ec1b72] sm:text-xs">
                    Forgot Password?
                  </Link>
                </div>
                ) : null}

                {/* Error / Success */}
                {apiError ? <ApiErrorMessage error={apiError} className="mt-2 sm:mt-3" /> : null}
                {successMsg ? <ApiErrorMessage message={successMsg} type="success" className="mt-2 sm:mt-3" /> : null}

                <LoadingButton
                  loading={loginMethod === "password" ? isLoading : isSendingPhoneOtp || isVerifyingPhoneOtp}
                  loadingText={loginMethod === "password" ? "Logging in..." : phoneOtpSent ? "Verifying..." : "Sending code..."}
                  type="button"
                  onClick={loginMethod === "password" ? handleLogin : phoneOtpSent ? loginWithPhone : requestPhoneOtp}
                  className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-[#111827] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:bg-[#ec1b72] disabled:cursor-not-allowed disabled:opacity-55 sm:mt-4 sm:min-h-12 sm:rounded-2xl sm:text-base"
                >
                  {loginMethod === "password" ? "Login" : phoneOtpSent ? "Verify & login" : "Send secure code"}
                </LoadingButton>

                <p className="mt-2 text-center text-[10px] font-semibold text-slate-500 sm:mt-4 sm:text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-black text-[#111827] transition hover:text-[#ec1b72]">Sign Up</Link>
                </p>
              </section>
            </div>
          </section>

          {/* ── Visual panel ── */}
          <aside className="relative hidden min-h-[620px] overflow-hidden rounded-r-[28px] bg-[#14051e] p-8 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(236,27,114,0.42),transparent_32%),radial-gradient(circle_at_88%_16%,rgba(102,38,185,0.44),transparent_30%),linear-gradient(145deg,#3b0530_0%,#1d0734_48%,#09020f_100%)]" />
            <div className="absolute -bottom-24 -right-20 size-96 rounded-full bg-[#ec1b72]/18 blur-3xl" />
            <div className="relative z-10 flex h-full min-h-[560px] flex-col justify-between">
              <div className="flex items-start justify-between gap-5">
                <BuizzLogo size="lg" variant="dark" />
                <span className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.16em] backdrop-blur-xl">Customer Access</span>
              </div>
              <div className="max-w-2xl py-8">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f6c453]">Book with Buizz</p>
                <h2 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.06em] xl:text-6xl">Discover events. Book tickets. Enter faster.</h2>
                <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-white/76">A clean account experience for ticket booking, QR access, wishlist, refunds and booking history.</p>
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                {[
                  { label: "Live Events", desc: "Concerts, plays and activities." },
                  { label: "Secure Tickets", desc: "Verified QR ticket access." },
                  { label: "Premium Flow", desc: "Smooth booking and wallet." },
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
