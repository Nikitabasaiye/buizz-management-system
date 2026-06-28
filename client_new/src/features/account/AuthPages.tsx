"use client";

import { CheckCircle2, KeyRound, Mail, Phone, ShieldCheck, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  MOCK_OTP,
  accountExists,
  createEmailAccount,
  createGoogleAccount,
  createPhoneAccount,
  findAccount,
  saveAccount,
  setCurrentMockUser,
  updateAccountContact,
  updateAccountPassword,
} from "@/lib/mockAuth";
import { useAuthStore, type PublicUser } from "@/store/auth.store";

type AuthPageMode = "login" | "signup";
type SignupMethod = "email" | "phone";

export function AuthPage({ mode }: { mode: AuthPageMode }) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const isSignup = mode === "signup";

  return (
    <AuthShell title={isSignup ? "Create your Buizz account" : "Sign in to Buizz"} subtitle={isSignup ? "Verify once, create a password, and keep ticket delivery ready." : "Use your email or phone and password to access Buizz."}>
      {isSignup ? <SignupForm setUser={setUser} onDone={() => router.push("/profile")} /> : <LoginForm setUser={setUser} onDone={() => router.push("/profile")} />}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const sendOtp = () => {
    if (!identifier.trim()) {
      setMessage("Enter your email or phone.");
      return;
    }
    if (!accountExists(identifier)) {
      setMessage("No Buizz account found for this email or phone.");
      return;
    }
    setOtpSent(true);
    setMessage("Mock OTP sent. Use 123456.");
  };

  const verifyOtp = () => {
    if (otp !== MOCK_OTP) {
      setMessage("Invalid OTP. Use 123456.");
      return;
    }
    setOtpVerified(true);
    setMessage("OTP verified. Create your new password.");
  };

  const resetPassword = () => {
    const validation = validatePassword(password, confirmPassword);
    if (validation) {
      setMessage(validation);
      return;
    }
    const updated = updateAccountPassword(identifier, password);
    if (!updated) {
      setMessage("Account not found. Try again.");
      return;
    }
    setMessage("Password updated. Redirecting to login...");
    window.setTimeout(() => router.push("/login"), 700);
  };

  return (
    <AuthShell title="Reset your Buizz password" subtitle="Verify your email or phone with mock OTP, then create a fresh password.">
      <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-5">
        <h2 className="text-2xl font-black text-[var(--app-foreground)]">Reset Password</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">OTP is 123456 for this frontend mock.</p>
        <div className="mt-5 grid gap-4">
          <AuthField icon={<UserCircle className="size-4" />} label="Email or Phone" value={identifier} onChange={setIdentifier} disabled={otpVerified} />
          {otpSent && !otpVerified ? <AuthField icon={<ShieldCheck className="size-4" />} label="OTP" value={otp} onChange={setOtp} /> : null}
          {otpVerified ? (
            <>
              <AuthField icon={<KeyRound className="size-4" />} label="New Password" value={password} onChange={setPassword} type="password" />
              <AuthField icon={<KeyRound className="size-4" />} label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
            </>
          ) : null}
        </div>
        <Message text={message} />
        <button type="button" onClick={!otpSent ? sendOtp : !otpVerified ? verifyOtp : resetPassword} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(229,9,20,0.28)] transition hover:bg-[#ff2634]">
          {!otpSent ? "Send OTP" : !otpVerified ? "Verify OTP" : "Update Password"}
        </button>
        <Link href="/login" className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/45">
          Back to Login
        </Link>
      </section>
    </AuthShell>
  );
}

function LoginForm({ setUser, onDone }: { setUser: (user: PublicUser) => void; onDone: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [linkPhoneMode, setLinkPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [googleUser, setGoogleUser] = useState<NonNullable<PublicUser> | null>(null);

  const login = () => {
    const account = findAccount(identifier);
    if (!account || account.password !== password) {
      setMessage("Invalid email/phone or password.");
      return;
    }
    persistAndLogin(account, setUser);
    onDone();
  };

  const googleLogin = () => {
    const account = createGoogleAccount();
    persistAndLogin(account, setUser);
    onDone();
  };

  const sendPhoneOtp = () => {
    if (!phone.trim()) {
      setMessage("Enter phone number first.");
      return;
    }
    setPhoneOtpSent(true);
    setMessage("Phone OTP sent. Use 123456.");
  };

  const verifyPhone = () => {
    if (!googleUser) return;
    if (phoneOtp !== MOCK_OTP) {
      setMessage("Invalid OTP. Use 123456.");
      return;
    }
    const next = updateAccountContact(googleUser, { phone, isPhoneVerified: true, preferredDelivery: "both" });
    persistAndLogin(next, setUser);
    onDone();
  };

  if (linkPhoneMode) {
    return (
      <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-5">
        <h2 className="text-2xl font-black text-[var(--app-foreground)]">Google Sign In</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">Google account verified for email ticket delivery.</p>
        <div className="mt-5 grid gap-4">
          <AuthField icon={<Phone className="size-4" />} label="Phone number" value={phone} onChange={setPhone} />
          {phoneOtpSent ? <AuthField icon={<ShieldCheck className="size-4" />} label="OTP" value={phoneOtp} onChange={setPhoneOtp} /> : null}
        </div>
        <Message text={message} />
        <button type="button" onClick={phoneOtpSent ? verifyPhone : sendPhoneOtp} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white transition hover:bg-[#ff2634]">
          {phoneOtpSent ? "Verify Phone" : "Send Phone OTP"}
        </button>
        <button type="button" onClick={onDone} className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/45">
          Skip and continue with email
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-5">
      <h2 className="text-2xl font-black text-[var(--app-foreground)]">Login</h2>
      <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">Use the email or phone you signed up with.</p>
      <div className="mt-5 grid gap-4">
        <AuthField icon={<UserCircle className="size-4" />} label="Email or Phone" value={identifier} onChange={setIdentifier} />
        <AuthField icon={<KeyRound className="size-4" />} label="Password" value={password} onChange={setPassword} type="password" />
      </div>
      <Message text={message} />
      <button type="button" onClick={login} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(229,9,20,0.28)] transition hover:bg-[#ff2634]">
        Login
      </button>
      <button type="button" onClick={googleLogin} className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/45">
        Continue with Google
      </button>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-[var(--app-muted)]">
        <Link href="/reset-password" className="font-black text-[#e50914] hover:text-[#ff2634]">Forgot Password?</Link>
        <span>New to Buizz? <Link href="/signup" className="font-black text-[#e50914] hover:text-[#ff2634]">Signup</Link></span>
      </div>
    </section>
  );
}

function SignupForm({ setUser, onDone }: { setUser: (user: PublicUser) => void; onDone: () => void }) {
  const [method, setMethod] = useState<SignupMethod>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [googleUser, setGoogleUser] = useState<NonNullable<PublicUser> | null>(null);
  const [linkGooglePhone, setLinkGooglePhone] = useState(false);

  const contact = method === "email" ? email : phone;

  const changeMethod = (nextMethod: SignupMethod) => {
    setMethod(nextMethod);
    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");
    setMessage("");
  };

  const sendOtp = () => {
    if (!name.trim()) {
      setMessage("Enter your name.");
      return;
    }
    if (!contact.trim()) {
      setMessage(method === "email" ? "Enter your email." : "Enter your phone number.");
      return;
    }
    if (accountExists(contact)) {
      setMessage("An account already exists for this email or phone.");
      return;
    }
    setOtpSent(true);
    setMessage("Mock OTP sent. Use 123456.");
  };

  const verifyOtp = () => {
    if (otp !== MOCK_OTP) {
      setMessage("Invalid OTP. Use 123456.");
      return;
    }
    setOtpVerified(true);
    setMessage("OTP verified. Create your password.");
  };

  const createAccount = () => {
    const validation = validatePassword(password, confirmPassword);
    if (validation) {
      setMessage(validation);
      return;
    }
    const account = method === "email" ? createEmailAccount({ name, email, password }) : createPhoneAccount({ name, phone, password });
    persistAndLogin(account, setUser);
    onDone();
  };

  const googleSignup = () => {
    const account = createGoogleAccount();
    persistAndLogin(account, setUser);
    onDone();
  };

  const sendGooglePhoneOtp = () => {
    if (!phone.trim()) {
      setMessage("Enter phone number first.");
      return;
    }
    setOtpSent(true);
    setMessage("Phone OTP sent. Use 123456.");
  };

  const verifyGooglePhone = () => {
    if (!googleUser) return;
    if (otp !== MOCK_OTP) {
      setMessage("Invalid OTP. Use 123456.");
      return;
    }
    const account = updateAccountContact(googleUser, { phone, isPhoneVerified: true, preferredDelivery: "both" });
    persistAndLogin(account, setUser);
    onDone();
  };

  if (linkGooglePhone) {
    return (
      <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-5">
        <h2 className="text-2xl font-black text-[var(--app-foreground)]">Google Signup</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">Google account verified for email ticket delivery.</p>
        <div className="mt-5 grid gap-4">
          <AuthField icon={<Phone className="size-4" />} label="Phone number" value={phone} onChange={setPhone} />
          {otpSent ? <AuthField icon={<ShieldCheck className="size-4" />} label="OTP" value={otp} onChange={setOtp} /> : null}
        </div>
        <Message text={message} />
        <button type="button" onClick={otpSent ? verifyGooglePhone : sendGooglePhoneOtp} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white transition hover:bg-[#ff2634]">
          {otpSent ? "Verify Phone" : "Send Phone OTP"}
        </button>
        <button type="button" onClick={onDone} className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/45">
          Skip and continue with email
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-5">
      <h2 className="text-2xl font-black text-[var(--app-foreground)]">Signup</h2>
      <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">OTP is 123456 for this frontend mock.</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <AuthMethodButton active={method === "email"} onClick={() => changeMethod("email")} label="Email" />
        <AuthMethodButton active={method === "phone"} onClick={() => changeMethod("phone")} label="Phone" />
      </div>
      <div className="mt-5 grid gap-4">
        <AuthField icon={<UserCircle className="size-4" />} label="Name" value={name} onChange={setName} disabled={otpVerified} />
        {method === "email" ? <AuthField icon={<Mail className="size-4" />} label="Email ID" value={email} onChange={setEmail} disabled={otpVerified} /> : <AuthField icon={<Phone className="size-4" />} label="Phone Number" value={phone} onChange={setPhone} disabled={otpVerified} />}
        {otpSent && !otpVerified ? <AuthField icon={<ShieldCheck className="size-4" />} label="OTP" value={otp} onChange={setOtp} /> : null}
        {otpVerified ? (
          <>
            <AuthField icon={<KeyRound className="size-4" />} label="Create Password" value={password} onChange={setPassword} type="password" />
            <AuthField icon={<KeyRound className="size-4" />} label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
          </>
        ) : null}
      </div>
      <Message text={message} />
      <button type="button" onClick={!otpSent ? sendOtp : !otpVerified ? verifyOtp : createAccount} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(229,9,20,0.28)] transition hover:bg-[#ff2634]">
        {!otpSent ? "Send OTP" : !otpVerified ? "Verify OTP" : "Create Account"}
      </button>
      <button type="button" onClick={googleSignup} className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/45">
        Continue with Google
      </button>
      <p className="mt-4 text-center text-sm font-semibold text-[var(--app-muted)]">
        Already have an account? <Link href="/login" className="font-black text-[#e50914] hover:text-[#ff2634]">Login</Link>
      </p>
    </section>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
      <section className="mx-auto grid min-h-[70vh] max-w-[1100px] gap-5 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="overflow-hidden rounded-md border border-white/10 bg-[#070b15] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:p-7">
          <UserCircle className="size-12 text-[#e50914]" />
          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-white/72">{subtitle}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["OTP", "Verify contact"],
              ["Password", "Secure mock login"],
              ["Delivery", "Email or WhatsApp"],
            ].map(([label, description]) => (
              <div key={label} className="rounded-md border border-white/10 bg-white/8 p-3">
                <ShieldCheck className="size-5 text-[#e50914]" />
                <p className="mt-3 text-sm font-black">{label}</p>
                <p className="mt-1 text-xs font-semibold text-white/60">{description}</p>
              </div>
            ))}
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

function AuthMethodButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-10 rounded-md border px-2 text-xs font-black transition ${active ? "border-[#e50914] bg-[#e50914] text-white" : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] hover:border-[#e50914]/45"}`}>
      {label}
    </button>
  );
}

function AuthField({ icon, label, value, onChange, type = "text", disabled = false }: { icon: ReactNode; label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return (
    <label className="grid gap-2 text-xs font-black text-[var(--app-muted)]">
      {label}
      <div className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[var(--app-foreground)] transition hover:border-[#e50914]/45">
        {icon}
        <input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none disabled:opacity-65" />
      </div>
    </label>
  );
}

function Message({ text }: { text: string }) {
  if (!text) return null;
  const success = text.toLowerCase().includes("verified") || text.toLowerCase().includes("updated");
  return (
    <p className={`mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-black ${success ? "border-[#38d97b]/30 bg-[#38d97b]/10 text-[#16a34a]" : "border-[#e50914]/30 bg-[#e50914]/10 text-[#e50914]"}`}>
      {success ? <CheckCircle2 className="size-4" /> : <ShieldCheck className="size-4" />}
      {text}
    </p>
  );
}

function validatePassword(password: string, confirmPassword: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirmPassword) return "Confirm password must match.";
  return "";
}

function persistAndLogin(user: NonNullable<PublicUser>, setUser: (user: PublicUser) => void) {
  const account = saveAccount(user);
  setCurrentMockUser(account);
  setUser(account);
}
