"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  Star,
  Ticket,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { LoadingButton } from "@/components/common/LoadingButton";
import {
  useLoginMutation,
  useRegisterMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
  useSendPasswordResetOtpMutation,
  useVerifyPasswordResetOtpMutation,
  useCompletePasswordResetMutation,
} from "@/store/api";
import { setCustomerSession, createSession } from "@/features/auth/authSession";
import { startFacebookOAuth, startGoogleOAuth } from "@/features/auth/googleOAuth";
import { useAuthStore, type PublicUser } from "@/store/auth.store";

type AuthPageMode = "login" | "signup";
type AuthShellVariant = "login" | "signup" | "reset";
type ApiAuthUser = {
  id?: string | number;
  displayId?: string | number;
  name?: string;
  email?: string;
  phone?: string;
  isVerified?: boolean;
};

function toPublicUser(user: ApiAuthUser | null | undefined, fallback?: { email?: string; phone?: string; name?: string }): PublicUser {
  if (!user && !fallback) return null;

  const email = user?.email || fallback?.email;
  const phone = user?.phone || fallback?.phone;

  return {
    id: String(user?.id ?? email ?? phone ?? `buizz-${Date.now()}`),
    displayId: user?.displayId !== undefined && user?.displayId !== null ? String(user.displayId) : undefined,
    name: user?.name || fallback?.name || "Buizz Customer",
    email,
    phone,
    password: "",
    authProvider: "email",
    isEmailVerified: Boolean(user?.isVerified ?? email),
    isPhoneVerified: Boolean(phone),
    preferredDelivery: phone ? "both" : "email",
  };
}

export function AuthPage({ mode }: { mode: AuthPageMode }) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const isSignup = mode === "signup";
  const [redirectPath, setRedirectPath] = useState("/profile");

  return (
    <AuthShell
      variant={isSignup ? "signup" : "login"}
      title={isSignup ? "Create account" : "Login"}
      subtitle={
        isSignup
          ? "Create your Buizz account for fast ticket booking."
          : "Book events faster and manage your Buizz tickets."
      }
    >
      {isSignup ? (
        <SignupForm
          setUser={setUser}
          onDone={() => router.push(redirectPath)}
        />
      ) : (
        <LoginForm setUser={setUser} onDone={() => router.push(redirectPath)} />
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState<string>("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [sendResetOtp, { isLoading: isSending }] = useSendPasswordResetOtpMutation();
  const [verifyResetOtp, { isLoading: isVerifying }] = useVerifyPasswordResetOtpMutation();
  const [completeReset, { isLoading: isResetting }] = useCompletePasswordResetMutation();
  const loading = isSending || isVerifying || isResetting;

  const sendOtp = async () => {
    if (!identifier.trim()) {
      setMessageType("error");
      return setMessage("Enter your registered email address.");
    }
    try {
      const result = await sendResetOtp({ email: identifier.trim().toLowerCase() }).unwrap();
      setMessageType("success");
      setMessage(result.message || "If the account exists, a reset code has been sent.");
      setOtpSent(true);
      setOtp("");
      setVerificationToken("");
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.data?.message || "Failed to send the reset code. Please try again.");
    }
  };

  const verifyOtp = async () => {
    const code = otp.trim().toUpperCase();
    if (!/^(?=(?:.*[A-Z]){3})(?=(?:.*\d){3})[A-Z0-9]{6}$/.test(code)) {
      setMessageType("error");
      return setMessage("Enter the 6-character code containing 3 letters and 3 digits.");
    }
    try {
      const result = await verifyResetOtp({
        email: identifier.trim().toLowerCase(),
        otp: code,
      }).unwrap();
      const token = result.data?.verificationToken;
      if (!token) throw new Error("Password reset verification token was not returned.");
      setVerificationToken(token);
      setOtpVerified(true);
      setMessageType("success");
      setMessage("OTP verified. Create your new password.");
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.data?.message || "Invalid or expired OTP. Please try again.");
    }
  };

  const resetPassword = async () => {
    if (!verificationToken) {
      setMessageType("error");
      return setMessage("Verify the reset code first.");
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password)) {
      setMessageType("error");
      return setMessage("Use 8+ characters with uppercase, lowercase, number and special character.");
    }
    if (password !== confirmPassword) {
      setMessageType("error");
      return setMessage("Passwords do not match.");
    }

    try {
      await completeReset({
        email: identifier.trim().toLowerCase(),
        verificationToken,
        password,
      }).unwrap();
      setMessageType("success");
      setMessage("Password updated. Redirecting to login...");
      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.data?.message || "Failed to update password. Please request a new code.");
    }
  };

  return (
    <AuthShell
      variant="reset"
      title="Reset Password"
      subtitle="Enter your email to reset your password."
    >
      <section className={authCardClass}>
        <AuthCardHeader title="Reset Password" subtitle="Enter your email to receive OTP." />

        <div className="mt-2 grid gap-2 sm:mt-4 sm:gap-3">
          <AuthField
            icon={<Mail className="size-3.5" />}
            label="Email ID"
            value={identifier}
            onChange={setIdentifier}
            disabled={otpVerified}
          />

          {otpSent && !otpVerified ? (
            <AuthField
              icon={<ShieldCheck className="size-3.5" />}
              label="OTP"
              value={otp}
              onChange={(value) => setOtp(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              inputMode="text"
              placeholder="ABC123"
              autoComplete="one-time-code"
            />
          ) : null}

          {otpVerified ? (
            <>
              <AuthField
                icon={<KeyRound className="size-3.5" />}
                label="New Password"
                value={password}
                onChange={setPassword}
                type="password"
              />
              <AuthField
                icon={<KeyRound className="size-3.5" />}
                label="Confirm Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                type="password"
              />
            </>
          ) : null}
        </div>

        <Message text={message} type={messageType} />

        <LoadingButton
          onClick={!otpSent ? sendOtp : !otpVerified ? verifyOtp : resetPassword}
          loading={loading}
          loadingText={!otpSent ? "Sending..." : !otpVerified ? "Verifying..." : "Updating..."}
        >
          {!otpSent ? "Send reset code" : !otpVerified ? "Verify code" : "Update password"}
        </LoadingButton>

        {otpSent && !otpVerified ? (
          <button
            type="button"
            onClick={sendOtp}
            disabled={loading}
            className="mt-2 w-full text-center text-[10px] font-black text-[#ec1b72] disabled:opacity-50 sm:text-xs"
          >
            Resend code
          </button>
        ) : null}

        <Link href="/login" className={secondaryLinkClass}>
          Back to Login
        </Link>
      </section>
    </AuthShell>
  );
}

function LoginForm({
  setUser,
  onDone,
}: {
  setUser: (user: PublicUser) => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);

  const [loginMutation] = useLoginMutation();
  const handleGoogleLogin = () => {
    try {
      startGoogleOAuth("customer");
    } catch {
      setMessage({ text: "Google login is not configured", type: "error" });
    }
  };
  const handleFacebookLogin = async () => {
    try {
      await startFacebookOAuth("customer");
    } catch {
      setMessage({ text: "Facebook login is not configured", type: "error" });
    }
  };

  const login = async () => {
    if (!email.trim()) {
      setMessage({ text: "Please enter your email", type: "error" });
      return;
    }
    if (!password.trim()) {
      setMessage({ text: "Please enter your password", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const result = await loginMutation({ email, password }).unwrap();

      // Create session
      const session = createSession({
        role: "customer",
        name: result.data?.user?.name || "Buizz Customer",
        email: result.data?.user?.email || email,
        phone: result.data?.user?.phone,
        status: "active",
        token: result.data?.token,
      });

      setCustomerSession(session);
      setUser(toPublicUser(result.data?.user, { email }));

      setMessage({ text: "Login successful!", type: "success" });
      setTimeout(() => {
        onDone();
      }, 1500);
    } catch (error: any) {
      setMessage({ 
        text: error.data?.message || "Invalid email or password", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={authCardClass}>
      <AuthCardHeader title="Login" subtitle="Book events faster." />

      <div className="mt-2 grid gap-2 sm:mt-4 sm:gap-3">
        <AuthField
          icon={<Mail className="size-3.5" />}
          label="Email address"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <AuthField
          icon={<KeyRound className="size-3.5" />}
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="Enter password"
          autoComplete="current-password"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-black text-slate-500 sm:mt-3 sm:text-xs">
        <label className="inline-flex min-w-0 items-center gap-1.5">
          <input
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            className="size-3.5 rounded border-slate-300 accent-[#ec1b72]"
          />
          <span className="leading-4">Keep me logged in</span>
        </label>
        <Link href="/reset-password" className={inlineLinkClass}>
          Forgot Password?
        </Link>
      </div>

      {message && (
        <Message text={message.text} type={message.type} />
      )}

      <LoadingButton
        onClick={login}
        loading={loading}
        loadingText="Loading..."
      >
        Login
      </LoadingButton>

      <div className="relative my-2 flex items-center gap-2 sm:my-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400 sm:text-[11px]">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-12 sm:rounded-2xl sm:text-sm"
      >
        <svg className="size-3.5 sm:size-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      <button
        type="button"
        onClick={handleFacebookLogin}
        className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-12 sm:rounded-2xl sm:text-sm"
      >
        <span className="grid size-3.5 place-items-center rounded-full bg-[#1877F2] text-[10px] font-black text-white sm:size-5 sm:text-sm">f</span>
        Continue with Facebook
      </button>

      <p className="mt-2 text-center text-[10px] font-semibold text-slate-500 sm:mt-4 sm:text-sm">
        Don't have an account?{" "}
        <Link href="/signup" className={inlineLinkClass}>
          Sign Up
        </Link>
      </p>
    </section>
  );
}

function SignupForm({
  setUser,
  onDone,
}: {
  setUser: (user: PublicUser) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");

  const [registerMutation] = useRegisterMutation();
  const [sendEmailOtpMutation] = useSendOtpMutation();
  const [verifyEmailOtpMutation] = useVerifyOtpMutation();
  const [sendPhoneOtpMutation] = useSendPhoneOtpMutation();
  const [verifyPhoneOtpMutation] = useVerifyPhoneOtpMutation();

  const sendEmailOtp = async () => {
    if (!name.trim()) {
      setMessage({ text: "Please enter your name", type: "error" });
      return;
    }
    if (!email.trim()) {
      setMessage({ text: "Please enter your email", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await sendEmailOtpMutation({ email: email.trim().toLowerCase() }).unwrap();
      setMessage({ text: "OTP sent to your email.", type: "success" });
      setEmailOtpSent(true);
    } catch (error: any) {
      setMessage({ text: error?.data?.message || "Failed to send OTP. Please try again", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      setMessage({ text: "Please enter the email OTP", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await verifyEmailOtpMutation({ email: email.trim().toLowerCase(), otp: emailOtp.trim() }).unwrap();
      setEmailVerified(true);
      setMessage({ text: "Email verified successfully", type: "success" });
    } catch (error: any) {
      setMessage({ text: error?.data?.message || "Invalid OTP. Please try again", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (!phone.trim()) {
      setMessage({ text: "Please enter your phone number", type: "error" });
      return;
    }

    const normalised = phone.trim().startsWith("+91") ? phone.trim() : `+91${phone.trim().replace(/^0/, "")}`;

    setLoading(true);
    try {
      await sendPhoneOtpMutation({
        phone: normalised,
        email: email.trim().toLowerCase(),
        purpose: "signup",
      }).unwrap();
      setPhone(normalised);
      setMessage({ text: "OTP sent to your phone.", type: "success" });
      setPhoneOtpSent(true);
    } catch (error: any) {
      setMessage({ text: error?.data?.message || "Failed to send OTP. Please try again", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!phoneOtp.trim()) {
      setMessage({ text: "Please enter the phone OTP", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const result = await verifyPhoneOtpMutation({
        phone: phone.trim(),
        otp: phoneOtp.trim().toUpperCase(),
        purpose: "signup",
      }).unwrap();
      const verificationToken = result.data?.verificationToken;
      if (!verificationToken) throw new Error("Phone verification token was not returned");
      setPhoneVerificationToken(verificationToken);
      setPhoneVerified(true);
      setMessage({ text: "Phone verified successfully", type: "success" });
    } catch (error: any) {
      setMessage({ text: error?.data?.message || "Invalid OTP. Please try again", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async () => {
    if (!phoneVerified || !phoneVerificationToken) {
      setMessage({ text: "Please verify your phone", type: "error" });
      return;
    }

    if (password.length < 8) {
      setMessage({ text: "Password must be at least 8 characters", type: "error" });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const result = await registerMutation({
        name,
        email,
        phone,
        password,
        phoneVerificationToken,
      }).unwrap();

      // Create session
      const session = createSession({
        role: "customer",
        name: result.data?.user?.name || name,
        email: result.data?.user?.email || email,
        phone: phone,
        status: "active",
        token: result.data?.token,
      });

      setCustomerSession(session);
      setUser(toPublicUser(result.data?.user, { email, phone, name }));

      setMessage({ text: "Account created successfully!", type: "success" });
      setTimeout(() => {
        onDone();
      }, 1500);
    } catch (error: any) {
      setMessage({ 
        text: error.data?.message || "Failed to create account. Please try again", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={authCardClass}>
      <AuthCardHeader title="Sign Up" subtitle="Verify your phone to create your account." />

      <div className="mt-2 grid gap-2 sm:mt-4 sm:gap-3">
        <AuthStepBadge currentStep={!phoneVerified ? 1 : 2} steps={["Phone", "Password"]} />

        <AuthField
          icon={<UserCircle className="size-3.5" />}
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Your full name"
          autoComplete="name"
        />
        <AuthField
          icon={<Mail className="size-3.5" />}
          label="Email ID"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <div>
          <AuthField
            icon={<Phone className="size-3.5" />}
            label="Phone Number"
            value={phone}
            onChange={setPhone}
            disabled={phoneVerified}
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile number"
          />
          <p className="mt-1.5 text-[10px] font-semibold leading-4 text-slate-500 sm:text-xs">
            +91 will be added automatically. Used for WhatsApp ticket delivery.
          </p>
        </div>

        {!phoneVerified ? (
          <>
            {phoneOtpSent ? (
              <AuthField
                icon={<ShieldCheck className="size-3.5" />}
                label="Phone OTP"
                value={phoneOtp}
                onChange={(value) => setPhoneOtp(value.toUpperCase().slice(0, 6))}
                inputMode="text"
              />
            ) : null}
            <InlineButton
              label={phoneOtpSent ? "Verify Phone OTP" : "Send Phone OTP"}
              onClick={phoneOtpSent ? verifyPhoneOtp : sendPhoneOtp}
            />
          </>
        ) : null}

        {phoneVerified ? (
          <>
            <AuthField
              icon={<KeyRound className="size-3.5" />}
              label="Create Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="new-password"
            />
            <AuthField
              icon={<KeyRound className="size-3.5" />}
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
              autoComplete="new-password"
            />
          </>
        ) : null}
      </div>

      {message && (
        <Message text={message.text} type={message.type} />
      )}

      <LoadingButton
        onClick={createAccount}
        disabled={!phoneVerified}
        loading={loading}
        loadingText="Submitting..."
      >
        Create Account
      </LoadingButton>

      <p className="mt-2 text-center text-[10px] font-semibold text-slate-500 sm:mt-4 sm:text-sm">
        Already have an account?{" "}
        <Link href="/login" className={inlineLinkClass}>
          Login
        </Link>
      </p>
    </section>
  );
}

function AuthShell({
  title,
  subtitle,
  variant,
  children,
}: {
  title: string;
  subtitle: string;
  variant: AuthShellVariant;
  children: ReactNode;
}) {
  const backLabel = variant === "reset" ? "Back to login" : "Back to Buizz";
  const backHref = variant === "reset" ? "/login" : "/";

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#f3f4f8] text-[#070a1a]">
      <div className="pointer-events-none absolute left-1/2 top-10 size-44 -translate-x-1/2 rounded-full bg-[#ec1b72]/8 blur-3xl sm:size-72" />
      <div className="pointer-events-none absolute bottom-0 right-0 size-48 rounded-full bg-[#6626b9]/8 blur-3xl sm:size-80" />

      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1320px] items-center justify-center px-2 py-3 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid w-full max-w-[282px] overflow-hidden rounded-[28px] border border-white/80 bg-white px-3 py-3 shadow-[0_20px_54px_rgba(15,23,42,0.12)] sm:max-w-[410px] sm:p-5 lg:max-w-[1120px] lg:grid-cols-[minmax(0,0.92fr)_minmax(430px,1.08fr)] lg:rounded-[28px] lg:border-slate-200 lg:p-0 lg:shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
          <section className="relative flex min-w-0 items-center justify-center px-0 py-0 sm:px-3 sm:py-3 lg:px-10 lg:py-10">
            <div className="w-full min-w-0">
              <Link
                href={backHref}
                className="mb-2 inline-flex min-h-6 items-center gap-1 text-[10px] font-black text-[#070a1a] transition hover:text-[#ec1b72] sm:mb-4 sm:min-h-8 sm:text-xs lg:mb-5"
              >
                <ArrowLeft className="size-3" />
                {backLabel}
              </Link>

              <div className="hidden lg:block">
                <AuthBrandTitle title={title} subtitle={subtitle} />
              </div>

              {children}
            </div>
          </section>

          <EventVisualPanel />
        </div>
      </section>
    </main>
  );
}

function EventVisualPanel() {
  return (
    <aside className="relative hidden min-h-[620px] overflow-hidden rounded-r-[28px] bg-[#14051e] p-8 text-white lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(236,27,114,0.42),transparent_32%),radial-gradient(circle_at_88%_16%,rgba(102,38,185,0.44),transparent_30%),linear-gradient(145deg,#3b0530_0%,#1d0734_48%,#09020f_100%)]" />
      <div className="absolute -bottom-24 -right-20 size-96 rounded-full bg-[#ec1b72]/18 blur-3xl" />
      <div className="absolute left-8 top-24 size-72 rounded-full bg-[#6626b9]/20 blur-3xl" />

      <div className="relative z-10 flex h-full min-h-[560px] flex-col justify-between">
        <div className="flex items-start justify-between gap-5">
          <Link href="/" className="inline-flex items-center rounded-2xl focus:outline-none focus:ring-4 focus:ring-white/20">
            <BuizzLogo size="lg" variant="dark" />
          </Link>
          <span className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.16em] backdrop-blur-xl">
            Customer Access
          </span>
        </div>

        <div className="max-w-2xl py-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f6c453]">
            Book with Buizz
          </p>
          <h2 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.06em] xl:text-6xl">
            Discover events. Book tickets. Enter faster.
          </h2>
          <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-white/76 xl:text-base xl:leading-8">
            A clean account experience for ticket booking, QR access, wishlist,
            refunds and booking history.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <HeroFeatureCard icon={<Ticket className="size-5" />} title="Live Events" text="Concerts, plays and activities." />
          <HeroFeatureCard icon={<ShieldCheck className="size-5" />} title="Secure Tickets" text="Verified QR ticket access." />
          <HeroFeatureCard icon={<Star className="size-5" />} title="Premium Flow" text="Smooth booking and wallet." />
        </div>
      </div>
    </aside>
  );
}

function AuthBrandTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-6 text-center">
      <Link href="/" className="inline-flex items-center rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#ec1b72]/15" aria-label="Go to Buizz home">
        <BuizzLogo size="xl" />
      </Link>
      <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#ec1b72]">
        Buizz Account
      </p>
      <h1 className="mt-2 text-[40px] font-black leading-none tracking-[-0.05em] text-[#070a1a]">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-[360px] text-sm font-semibold leading-7 text-slate-500">
        {subtitle}
      </p>
    </header>
  );
}

function AuthCardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="text-center lg:hidden">
      <Link href="/" className="inline-flex items-center rounded-xl focus:outline-none focus:ring-4 focus:ring-[#ec1b72]/15" aria-label="Go to Buizz home">
        <BuizzLogo size="sm" />
      </Link>
      <p className="mt-2 text-[8px] font-black uppercase tracking-[0.15em] text-[#ec1b72] sm:mt-3 sm:text-[10px]">
        Buizz Account
      </p>
      <h1 className="mt-1 text-[19px] font-black leading-none tracking-[-0.045em] text-[#070a1a] sm:text-3xl">
        {title}
      </h1>
      <p className="mx-auto mt-1.5 max-w-[190px] text-[9px] font-semibold leading-4 text-slate-500 sm:mt-3 sm:max-w-[280px] sm:text-sm sm:leading-6">
        {subtitle}
      </p>
    </header>
  );
}

function HeroFeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/10 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <span className="grid size-10 place-items-center rounded-2xl bg-white/10 text-[#f6c453]">
        {icon}
      </span>
      <h3 className="mt-4 text-sm font-black text-white">{title}</h3>
      <p className="mt-2 text-xs font-semibold leading-5 text-white/65">{text}</p>
    </article>
  );
}

function AuthStepBadge({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {steps.map((step, index) => {
        const active = index + 1 <= currentStep;
        return (
          <span
            key={step}
            className={`rounded-full border px-2 py-1 text-center text-[8px] font-black uppercase tracking-[0.08em] sm:py-1.5 sm:text-[10px] ${active
              ? "border-[#ec1b72] bg-[#ec1b72] text-white shadow-[0_8px-18px_rgba(236,27,114,0.22)]"
              : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
          >
            {step}
          </span>
        );
      })}
    </div>
  );
}

function AuthField({
  icon,
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder,
  autoComplete,
  inputMode,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "search" | "email" | "tel" | "url" | "none" | "numeric" | "decimal";
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <label className="grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-[0.06em] text-slate-500 sm:gap-1.5 sm:text-xs">
      {label}
      <span className="flex min-h-8 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-[#070a1a] transition focus-within:border-[#ec1b72] focus-within:shadow-[0_0_0_4px_rgba(236,27,114,0.08)] sm:min-h-12 sm:gap-3 sm:rounded-2xl sm:px-4">
        <span className="shrink-0 text-slate-400">{icon}</span>
        <input
          type={inputType}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none placeholder:text-slate-400 disabled:opacity-60 sm:text-sm"
        />
        {isPassword && type === "password" ? (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="grid size-6 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 sm:size-8"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function InlineButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-8 w-full items-center justify-center rounded-xl border border-[#ec1b72]/35 bg-[#ec1b72]/10 px-3 text-[11px] font-black text-[#ec1b72] transition hover:bg-[#ec1b72] hover:text-white sm:min-h-9 sm:w-fit sm:text-xs"
    >
      {label}
    </button>
  );
}

function Message({ text, type }: { text: string; type?: "success" | "error" }) {
  if (!text) return null;

  const isSuccess = type === "success" || text.toLowerCase().includes("verified") || text.toLowerCase().includes("updated") || text.toLowerCase().includes("sent") || text.toLowerCase().includes("successful");

  return (
    <p
      className={`mt-2 flex items-start gap-1.5 rounded-xl border px-2.5 py-1.5 text-[9px] font-black leading-4 sm:mt-3 sm:px-3 sm:py-2 sm:text-xs ${isSuccess
        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600"
        : "border-red-500/25 bg-red-500/10 text-red-600"
        }`}
    >
      {isSuccess ? <CheckCircle2 className="mt-0.5 size-3 shrink-0 sm:size-3.5" /> : <ShieldCheck className="mt-0.5 size-3 shrink-0 sm:size-3.5" />}
      {text}
    </p>
  );
}

const authCardClass =
  "relative mx-auto w-full min-w-0 overflow-visible rounded-none border-0 bg-transparent p-0 text-[#070a1a] shadow-none sm:rounded-[26px] sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:shadow-[0_18px-48px_rgba(15,23,42,0.07)] lg:rounded-[30px] lg:p-6";

const secondaryLinkClass =
  "mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700 transition hover:border-[#ec1b72]/45 hover:bg-white sm:mt-3 sm:min-h-12 sm:rounded-2xl sm:text-sm";

const inlineLinkClass =
  "font-black text-[#111827] transition hover:text-[#ec1b72]";
