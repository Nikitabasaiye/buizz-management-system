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
  Phone,
  QrCode,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import { BuizzLogo } from "@/components/brand/BuizzLogo";
import {
  createSessionFromApiResponse,
  setOrganizerSession,
  type BuizzAuthSession,
} from "@/features/auth/authSession";
import { startFacebookOAuth, startGoogleOAuth } from "@/features/auth/googleOAuth";
import { saveOrganizerApprovalState } from "@/features/organizer/ApprovalStatusComponents";
import { saveOrganizerApplication } from "@/features/integration";
import {
  useOrganizerLoginMutation,
  useOrganizerRegisterMutation,
  useOrganizerForgotPasswordMutation,
  useOrganizerResetPasswordMutation,
  useSendOtpMutation,
  useSendPhoneOtpMutation,
  useVerifyOtpMutation,
  useVerifyPhoneOtpMutation,
  useGetKycStatusQuery,
} from "@/store";
const setupSteps = ["General Information", "Upload Documents", "Sign Agreement"];





const businessTypes = ["Individual", "Company", "Partnership", "LLP", "NGO"];
const accountTypes = ["Savings", "Current"];


const organizerApprovalStatusKey = "buizz-organizer-approval-status";

function getOrganizerRedirectPath(value: string | null) {
  if (!value) return "/organizer/dashboard";
  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("/organizer") &&
      !decoded.startsWith("/organizer/login") &&
      !decoded.startsWith("/organizer/signup") &&
      !decoded.startsWith("/organizer/verify-otp")
    ) return decoded;
  } catch {}
  return "/organizer/dashboard";
}

function persistOrganizerSession(apiData: { token: string; refreshToken?: string; organizer?: any; user?: any }) {
  const organizer = apiData.organizer ?? apiData.user ?? {};
  const kycStatus = String(organizer.kycStatus ?? organizer.kyc_status ?? "").toLowerCase();
  const isApproved = organizer.isKycVerified === true || organizer.isVerified === true || kycStatus === "verified" || kycStatus === "approved";
  const session = createSessionFromApiResponse("organizer", {
    ...apiData,
    organizer: {
      ...organizer,
      isVerified: isApproved,
      isKycVerified: isApproved,
    },
  });
  const persistedSession: BuizzAuthSession = { ...session, status: isApproved ? "approved" : "pending", isKycVerified: isApproved };
  setOrganizerSession(persistedSession);
  window.localStorage.setItem("buizz-organizer", JSON.stringify(persistedSession));
  window.dispatchEvent(new Event("buizz-organizer-auth-updated"));
  window.dispatchEvent(new Event("storage"));
  return persistedSession;
}

function markOrganizerApproved() {
  window.localStorage.setItem(organizerApprovalStatusKey, "approved");
  // Also write directly to the integration storage so canAccessOrganizerDashboard passes
  // even when no formal application record exists yet
  const directKey = "buizz-organizer-applications";
  try {
    const existing = JSON.parse(window.localStorage.getItem(directKey) ?? "[]");
    if (!Array.isArray(existing) || existing.length === 0) {
      const now = new Date().toISOString();
      window.localStorage.setItem(directKey, JSON.stringify([{
        id: `ORG-APP-${Date.now()}`,
        organizationName: "Organizer",
        submittedAt: now,
        status: "pending",
        organizerStatus: "pending",
        adminApprovalStatus: "pending",
        superAdminApprovalStatus: "pending",
        accessStatus: "locked",
        reviewedAt: now,
      }]));
    } else {
      saveOrganizerApprovalState({
        organizerStatus: "pending",
        adminApprovalStatus: "pending",
        superAdminApprovalStatus: "pending",
      });
    }
  } catch {
    saveOrganizerApprovalState({
      organizerStatus: "pending",
      adminApprovalStatus: "pending",
      superAdminApprovalStatus: "pending",
    });
  }
}

function markOrganizerPending() {
  window.localStorage.setItem(organizerApprovalStatusKey, "pending-admin");
  saveOrganizerApprovalState({
    organizerStatus: "pending",
    adminApprovalStatus: "pending",
    superAdminApprovalStatus: "pending",
  });
}

function extractApiError(err: unknown): string {
  if (!err || typeof err !== "object") return "Something went wrong. Please try again.";
  const e = err as any;
  return e?.data?.message || e?.data?.errors?.[0]?.msg || e?.message || "Something went wrong. Please try again.";
}

function normalizeOrganizerPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length === 10) return `+91${digits}`;
  return value.trim();
}

function readSessionValue(session: Record<string, unknown>, key: string) {
  const state = session.state as Record<string, unknown> | undefined;
  const nestedSession = state?.session as Record<string, unknown> | undefined;
  return session[key] ?? nestedSession?.[key] ?? state?.[key];
}

function readOrganizerToken() {
  if (typeof window === "undefined") return "";

  for (const key of ["buizz-organizer-session", "buizz-organizer"]) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, unknown>;
      const token = readSessionValue(parsed, "token");
      if (typeof token === "string" && token.trim()) return token;
    } catch {}
  }

  return "";
}


type AuthRoleType = "customer" | "organizer" | "admin" | "superAdmin";

type AuthExperienceStat = {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
};

type AuthExperienceConfig = {
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  heroTitle: string;
  heroQuote: string;
  quoteAuthor: string;
  quoteRole: string;
  backgroundImage: string;
  tags: string[];
  stats: AuthExperienceStat[];
  partners: string[];
};

const authExperienceConfig = {
  customer: {
    label: "Customer",
    eyebrow: "Discover with Buizz",
    title: "Welcome back to Buizz",
    subtitle: "Book concerts, plays, workshops and activities with verified Buizz tickets.",
    heroTitle: "Your city’s best events in one place.",
    heroQuote:
      "From weekend plans to premium live shows, Buizz helps customers book faster and enter with secure QR tickets.",
    quoteAuthor: "Buizz Customer Team",
    quoteRole: "Ticketing Experience",
    backgroundImage:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85",
    tags: ["Verified Tickets", "Fast Booking", "QR Entry", "Refund Support"],
    stats: [
      { label: "Events", value: "500+", detail: "Curated live experiences", icon: Ticket },
      { label: "Cities", value: "20+", detail: "Growing city coverage", icon: LayoutDashboard },
      { label: "Bookings", value: "18K+", detail: "Demo platform activity", icon: QrCode },
    ],
    partners: ["Concerts", "Plays", "Activities", "Workshops", "Comedy", "Festivals"],
  },
  organizer: {
    label: "Organizer",
    eyebrow: "Host with Buizz",
    title: "Welcome back, Organizer",
    subtitle: "Manage events, bookings, tickets, QR check-in and revenue from one secure workspace.",
    heroTitle: "Create events. Sell tickets. Verify every entry.",
    heroQuote:
      "A secure organizer workspace for event creation, ticket sales, offline bookings, QR check-in and revenue tracking.",
    quoteAuthor: "Buizz Organizer Suite",
    quoteRole: "Event Operations",
    backgroundImage:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85",
    tags: ["Event Creation", "Ticket Sales", "QR Check-in", "Revenue Tracking"],
    stats: [
      { label: "Live Events", value: "Create", detail: "Create and publish faster", icon: Ticket },
      { label: "QR Entry", value: "Verify", detail: "Verified gate check-in", icon: QrCode },
      { label: "Analytics", value: "Track", detail: "Track sales and revenue", icon: BarChart3 },
    ],
    partners: ["Music", "Comedy", "Workshops", "Theatre", "Sports", "Festivals"],
  },
  admin: {
    label: "Admin",
    eyebrow: "Buizz Review Desk",
    title: "Admin Login",
    subtitle: "Review organizers, events, bookings, support tickets and platform activity.",
    heroTitle: "Review faster. Manage smarter.",
    heroQuote:
      "Admin tools help your team approve events, moderate ratings, support bookings and maintain platform quality.",
    quoteAuthor: "Buizz Admin Ops",
    quoteRole: "Review Center",
    backgroundImage:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=85",
    tags: ["Event Review", "Organizer Review", "Bookings", "Support"],
    stats: [
      { label: "Reviews", value: "Approve", detail: "Organizer and event checks", icon: FileCheck2 },
      { label: "Bookings", value: "Track", detail: "Booking visibility", icon: Ticket },
      { label: "Support", value: "Resolve", detail: "Customer issue handling", icon: ShieldCheck },
    ],
    partners: ["Approvals", "Bookings", "Ratings", "Support", "Venues", "Reports"],
  },
  superAdmin: {
    label: "Super Admin",
    eyebrow: "Buizz Command Center",
    title: "Super Admin Login",
    subtitle: "Control platform approvals, admins, permissions, ticketing, revenue and settings.",
    heroTitle: "Full Buizz command center.",
    heroQuote:
      "Manage approvals, admin permissions, ticket design, revenue, settlements and platform-wide settings from one place.",
    quoteAuthor: "Buizz Platform Core",
    quoteRole: "Super Admin Workspace",
    backgroundImage:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1600&q=85",
    tags: ["Permissions", "Revenue", "Settlements", "Platform Control"],
    stats: [
      { label: "Control", value: "Global", detail: "Platform-level access", icon: ShieldCheck },
      { label: "Reviews", value: "Final", detail: "Override review center", icon: FileCheck2 },
      { label: "Finance", value: "Track", detail: "Revenue and settlements", icon: BarChart3 },
    ],
    partners: ["Admins", "Revenue", "Reports", "Tickets", "Settlements", "Settings"],
  },
} satisfies Record<AuthRoleType, AuthExperienceConfig>;

function getAuthExperience(roleType: AuthRoleType = "organizer") {
  return authExperienceConfig[roleType];
}


const organizerAuthLabelClass =
  "grid gap-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-500 sm:gap-1.5 sm:text-[10px]";

const organizerAuthControlClass =
  "flex min-h-8 items-center gap-2 rounded-[11px] border border-slate-200 bg-white px-2.5 text-[#070a1a] shadow-[0_5px_14px_rgba(15,23,42,0.035)] transition focus-within:border-[#ec1b72]/80 focus-within:bg-white focus-within:ring-3 focus-within:ring-[#ec1b72]/10 sm:min-h-11 sm:rounded-[13px] sm:px-3";

const organizerAuthInputClass =
  "min-h-6 flex-1 bg-transparent text-[11px] font-bold text-[#070a1a] placeholder:text-slate-400 outline-none sm:min-h-9 sm:text-[13px]";

const organizerAuthGoogleButtonClass =
  "inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-[11px] border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-[#101828] shadow-[0_5px_14px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:min-h-11 sm:gap-2 sm:rounded-[13px] sm:px-3 sm:text-[13px]";

const organizerAuthPrimaryButtonClass =
  "inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-[11px] bg-[#ec1b72] px-3 text-[11px] font-black text-white shadow-[0_8px_20px_rgba(236,27,114,0.20)] transition hover:-translate-y-0.5 hover:bg-[#d91564] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:min-h-11 sm:gap-2 sm:rounded-[13px] sm:px-5 sm:text-sm";

const organizerAuthSecondaryButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 text-[12px] font-black text-[#070a1a] transition hover:border-[#ec1b72] hover:bg-[#fff5fa] sm:min-h-11 sm:text-sm";


export function OrganizerIntroScreen() {
  const experience = getAuthExperience("organizer");

  return (
    <PageShell>
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1080px] items-center px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[28px] border border-white/75 bg-white shadow-[0_24px_72px_rgba(15,23,42,0.12)] lg:grid lg:min-h-[590px] lg:grid-cols-[minmax(0,0.96fr)_minmax(360px,0.86fr)] lg:rounded-[32px] lg:p-3"
        >
          <div className="relative min-h-[520px] overflow-hidden bg-[#08000b] px-5 py-5 text-white sm:px-7 lg:min-h-[566px] lg:rounded-[26px] lg:p-7">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-68"
              style={{ backgroundImage: `url("${experience.backgroundImage}")` }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(236,27,114,0.30),transparent_30%),linear-gradient(135deg,rgba(8,0,11,0.96),rgba(36,10,54,0.84),rgba(8,0,11,0.94))]" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#08000b] via-[#08000b]/78 to-transparent" />

            <div className="relative z-10 flex min-h-[480px] flex-col justify-between lg:min-h-[512px]">
              <div className="flex items-center justify-between gap-4">
                <BuizzLogo variant="dark" size="sm" />
                <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl">
                  {experience.label}
                </span>
              </div>

              <div className="max-w-[520px] py-7 lg:py-0">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f6c453] sm:text-xs">
                  {experience.eyebrow}
                </p>
                <h1
                  className="mt-3 max-w-[520px] text-[2.15rem] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-[2.85rem] lg:text-[3.05rem]"
                  style={{ fontFamily: "var(--font-display), var(--font-ui), system-ui, sans-serif" }}
                >
                  {experience.heroTitle}
                </h1>
                <p className="mt-4 max-w-lg text-[13px] font-semibold leading-6 text-white/76 sm:text-sm">
                  {experience.heroQuote}
                </p>

                <AuthRoleTags tags={experience.tags} className="mt-4" variant="dark" />

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Link
                    href="/organizer/signup"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] bg-[#ec1b72] px-4 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(236,27,114,0.24)] transition hover:-translate-y-0.5 hover:bg-[#d91564] sm:min-h-11 sm:text-sm"
                  >
                    Start Setup <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/organizer/login"
                    className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-white/18 bg-white/10 px-4 text-[13px] font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/18 sm:min-h-11 sm:text-sm"
                  >
                    Login
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {experience.stats.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article
                      key={item.label}
                      className="rounded-2xl border border-white/12 bg-white/10 p-3 text-white shadow-[0_12px_26px_rgba(0,0,0,0.14)] backdrop-blur-xl"
                    >
                      <span className="grid size-8 place-items-center rounded-xl bg-white/14 text-[#f6c453]">
                        <Icon className="size-4" />
                      </span>
                      <h3 className="mt-2.5 text-[13px] font-black">{item.label}</h3>
                      <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-white/62">
                        {item.detail}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="hidden min-h-[566px] items-center justify-center bg-[#f5f7fb] p-5 lg:flex">
            <div className="relative w-full max-w-[390px]">
              <div className="absolute -right-8 -top-8 size-36 rounded-full bg-[#ec1b72]/10 blur-3xl" />
              <div className="absolute -bottom-8 -left-8 size-36 rounded-full bg-[#6626b9]/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-[28px] border border-white bg-white p-4 shadow-[0_22px_62px_rgba(15,23,42,0.10)]">
                <TicketVisualCard compact />
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {experience.stats.map((card) => {
                    const Icon = card.icon;

                    return (
                      <div
                        key={`desk-${card.label}`}
                        className="rounded-2xl border border-slate-200 bg-[#fbfcff] p-2.5 text-center"
                      >
                        <Icon className="mx-auto size-4 text-[#ec1b72]" />
                        <p className="mt-1.5 text-[10px] font-black text-[#070a1a]">
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
  const [activeTab, setActiveTab] = useState<"account" | "kyc">("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState(businessTypes[0]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState(accountTypes[1]);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [cancelledChequeFile, setCancelledChequeFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [organizerRegister, { isLoading }] = useOrganizerRegisterMutation();
  const [sendEmailOtp, { isLoading: isSendingEmailOtp }] = useSendOtpMutation();
  const [sendPhoneOtp, { isLoading: isSendingPhoneOtp }] = useSendPhoneOtpMutation();
  const [verifyEmailOtp] = useVerifyOtpMutation();
  const [verifyPhoneSignupOtp] = useVerifyPhoneOtpMutation();

  const handleSendSignupOtps = async () => {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizeOrganizerPhone(phone);
    if (!normalizedEmail || !normalizedPhone) {
      setError("Enter your email address and phone number first.");
      return;
    }
    try {
      await Promise.all([
        sendEmailOtp({ email: normalizedEmail }).unwrap(),
        sendPhoneOtp({
          phone: normalizedPhone,
          email: normalizedEmail,
          purpose: "signup",
          deliveryChannel: "auto",
        }).unwrap(),
      ]);
      setOtpSent(true);
    } catch (requestError: any) {
      setError(requestError?.data?.message || "Unable to send verification codes.");
    }
  };

  const handleRegister = async () => {
    setError("");
    if (!name.trim()) { setError("Full name is required."); return; }
    if (!email.trim()) { setError("Email address is required."); return; }
    if (!phone.trim()) { setError("Phone number is required."); return; }
    if (!businessName.trim()) { setError("Business name is required."); return; }
    if (!city.trim() || !state.trim() || !pincode.trim()) { setError("City, state, and pincode are required."); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(panNumber.trim())) { setError("Enter a valid PAN number."); setActiveTab("kyc"); return; }
    if (!addressLine.trim()) { setError("Business address is required."); setActiveTab("kyc"); return; }
    if (!panFile) { setError("PAN image/PDF is required."); setActiveTab("kyc"); return; }
    if (!addressProofFile) { setError("Address proof image/PDF is required."); setActiveTab("kyc"); return; }
    if (!cancelledChequeFile) { setError("Cancelled cheque/passbook is required."); setActiveTab("kyc"); return; }
    if (!accountHolderName.trim() || !accountNumber.trim() || !ifscCode.trim() || !bankName.trim()) {
      setError("All bank account details are required.");
      setActiveTab("kyc");
      return;
    }
    if (!acceptedTerms) { setError("Please accept the organizer terms before continuing."); return; }
    if (!otpSent || emailOtp.length !== 6 || phoneOtp.length !== 6) {
      setError("Verify your email and phone using the 3-letter, 3-digit codes.");
      setActiveTab("account");
      return;
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = normalizeOrganizerPhone(phone) || "";
      const [emailVerification, phoneVerification] = await Promise.all([
        verifyEmailOtp({ email: normalizedEmail, otp: emailOtp.toUpperCase() }).unwrap(),
        verifyPhoneSignupOtp({
          phone: normalizedPhone,
          otp: phoneOtp.toUpperCase(),
          purpose: "signup",
        }).unwrap(),
      ]);
      const result = await organizerRegister({
        name: name.trim(),
        email: normalizedEmail,
        password,
        phone: normalizedPhone,
        businessName: businessName.trim() || undefined,
        businessType: businessType || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        emailVerificationToken: emailVerification.data?.verificationToken || "",
        phoneVerificationToken: phoneVerification.data?.verificationToken || "",
      }).unwrap();

      persistOrganizerSession(result.data);
      const token = result.data.token;
      const panUpload = await uploadOrganizerSignupDocument(token, panFile, "pan");
      const addressProofUpload = await uploadOrganizerSignupDocument(token, addressProofFile, "address_proof");
      const chequeUpload = await uploadOrganizerSignupDocument(token, cancelledChequeFile, "cancelled_cheque_or_passbook");

      await submitOrganizerSignupKyc(token, {
        legalName: name.trim(),
        businessName: businessName.trim(),
        panNumber: panNumber.trim().toUpperCase(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        documents: [
          {
            type: "pan",
            url: panUpload.url,
            fileName: panUpload.fileName,
            documentNumber: panNumber.trim().toUpperCase(),
          },
          {
            type: "address_proof",
            url: addressProofUpload.url,
            fileName: addressProofUpload.fileName,
          },
        ],
        bankDocuments: [{
          type: "cancelled_cheque_or_passbook",
          url: chequeUpload.url,
          fileName: chequeUpload.fileName,
        }],
      });

      await updateOrganizerSignupBank(token, {
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        bankName: bankName.trim(),
        accountType,
      });

      const submittedAt = new Date().toISOString();
      window.localStorage.setItem(
        organizerDocumentSubmissionKey,
        JSON.stringify({
          submittedAt,
          documents: {
            "PAN Card": panUpload.url,
            "Address Proof": addressProofUpload.url,
            "Bank Passbook / Cancelled Cheque": chequeUpload.url,
          },
        }),
      );
      const organizerRecord = (result.data.organizer ?? result.data.user ?? {}) as Record<string, unknown>;
      const organizerId = String(organizerRecord.id ?? organizerRecord.displayId ?? email.trim().toLowerCase());

      saveOrganizerApplication({
        id: `ORG-APP-${organizerId}`,
        organizerId,
        organizationName: businessName.trim(),
        ownerName: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizeOrganizerPhone(phone) ?? phone.trim(),
        city: city.trim(),
        status: "pending",
        organizerStatus: "pending",
        adminApprovalStatus: "pending",
        superAdminApprovalStatus: "pending",
        accessStatus: "locked",
        submittedAt,
        documents: {
          pan: Boolean(panUpload.url),
          address_proof: Boolean(addressProofUpload.url),
          cancelled_cheque_or_passbook: Boolean(chequeUpload.url),
          bank_details: true,
        },
        auditTrail: [
          {
            id: `org-app-audit-${Date.now()}`,
            actorName: name.trim(),
            actorRole: "organizer",
            action: "submitted",
            createdAt: submittedAt,
            comment: "Organizer registration, KYC documents, and bank details submitted for Super Admin review.",
          },
        ],
      });

      markOrganizerPending();
      router.replace("/organizer/dashboard");
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <AuthShell
      title="Create organizer account"
      description="Register with your details to start managing events on Buizz."
      icon={<Phone className="size-5" />}
      backHref="/organizer/intro"
      backLabel="Back to organizer"
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {(["account", "kyc"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-10 rounded-xl text-xs font-black transition ${activeTab === tab ? "bg-[#ec1b72] text-white shadow-[0_10px_22px_rgba(236,27,114,0.22)]" : "text-slate-500 hover:bg-white"}`}
            >
              {tab === "account" ? "Account Details" : "KYC & Bank"}
            </button>
          ))}
        </div>

        {activeTab === "account" ? (
          <div className="grid gap-2 sm:gap-3">
            <InputField label="Organizer Name *" value={name} onChange={setName} placeholder="Rohan Mehta" />
            <InputField label="Email Address *" value={email} onChange={setEmail} type="email" placeholder="organizer@example.com" />
            <InputField
              label="Password *"
              value={password}
              onChange={setPassword}
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
            />
            <InputField label="Phone Number *" value={phone} onChange={setPhone} />
            <button
              type="button"
              onClick={handleSendSignupOtps}
              disabled={isSendingEmailOtp || isSendingPhoneOtp}
              className="rounded-xl border border-[#ec1b72] px-4 py-2 text-xs font-black text-[#ec1b72] disabled:opacity-50"
            >
              {otpSent ? "Resend verification codes" : "Send email & phone codes"}
            </button>
            <p className="text-[10px] font-semibold leading-5 text-slate-500 sm:text-xs">
              The email code is sent to your email. The phone code is sent on WhatsApp, with automatic email fallback if WhatsApp is unavailable.
            </p>
            {otpSent ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <InputField label="Email code *" value={emailOtp} onChange={(value) => setEmailOtp(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" />
                <InputField label="Phone code *" value={phoneOtp} onChange={(value) => setPhoneOtp(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" />
              </div>
            ) : null}
            <InputField label="Business Name *" value={businessName} onChange={setBusinessName} placeholder="Your registered business name" />
            <div className="grid gap-2 sm:grid-cols-3">
              <InputField label="City *" value={city} onChange={setCity} placeholder="Mumbai" />
              <InputField label="State *" value={state} onChange={setState} placeholder="Maharashtra" />
              <InputField label="Pincode *" value={pincode} onChange={(value) => setPincode(value.replace(/\D/g, "").slice(0, 6))} placeholder="400001" />
            </div>
            <button type="button" onClick={() => setActiveTab("kyc")} className={organizerAuthPrimaryButtonClass}>
              Next: KYC & Bank
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-3">
            <InputField label="PAN Number *" value={panNumber} onChange={(value) => setPanNumber(value.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" />
            <InputField label="Business Address *" value={addressLine} onChange={setAddressLine} placeholder="Registered business address" />
            <FileInputField label="Upload PAN Image/PDF *" file={panFile} onChange={setPanFile} />
            <FileInputField label="Upload Address Proof Image/PDF *" file={addressProofFile} onChange={setAddressProofFile} />
            <FileInputField label="Cancelled Cheque / Passbook *" file={cancelledChequeFile} onChange={setCancelledChequeFile} />
            <InputField label="Account Holder Name *" value={accountHolderName} onChange={setAccountHolderName} />
            <InputField label="Bank Name *" value={bankName} onChange={setBankName} />
            <div className="grid gap-2 sm:grid-cols-2">
              <InputField label="Account Number *" value={accountNumber} onChange={(value) => setAccountNumber(value.replace(/\D/g, ""))} />
              <InputField label="IFSC Code *" value={ifscCode} onChange={(value) => setIfscCode(value.toUpperCase().slice(0, 11))} />
            </div>
            <FieldLabel label="Account Type *">
              <select className="field-control" value={accountType} onChange={(event) => setAccountType(event.target.value)}>
                {accountTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </FieldLabel>
          </div>
        )}

        <label className="flex items-start gap-2 text-xs font-bold leading-5 text-slate-500">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 size-4 rounded border-slate-300 accent-[#ec1b72]"
          />
          <span>I agree to the Buizz organizer terms, ticketing rules and verification process.</span>
        </label>

        {error ? <AuthErrorMessage message={error} /> : null}

        <motion.button
          type="button"
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={handleRegister}
          disabled={isLoading}
          className={organizerAuthPrimaryButtonClass}
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </motion.button>
      </div>

      <p className="mt-4 text-center text-[11px] font-bold text-slate-500 sm:mt-6 sm:text-sm">
        Already have an account?{" "}
        <Link href="/organizer/login" className="font-black text-[#ec1b72] transition hover:text-[#070a1a]">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}

export function OrganizerVerifyOtpScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [verifyPhoneOtp, { isLoading }] = useVerifyPhoneOtpMutation();

  const verifyOtp = async () => {
    setError("");

    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    const phone = window.localStorage.getItem("buizz-organizer-phone") || "";
    if (!phone) {
      setError("Phone number is missing. Please start signup again.");
      return;
    }

    try {
      await verifyPhoneOtp({ phone, otp: otp.trim() }).unwrap();
      window.localStorage.setItem("buizz-organizer-phone-verified", "true");
      router.push("/organizer/general-information");
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <AuthShell
      title="Verify your mobile number"
      description="Enter the 6-digit code sent to your organizer mobile number."
      icon={<ShieldCheck className="size-5" />}
      backHref="/organizer/signup"
      backLabel="Back to signup"
    >
      <div className="rounded-2xl border border-slate-200 bg-[#f8f9fd] p-3">
        <OTPInput value={otp} onChange={setOtp} />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-600">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={verifyOtp}
        disabled={isLoading}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#070a1a] px-6 text-sm font-black text-white shadow-[0_18px_44px_rgba(7,10,26,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ec1b72]"
      >
        <ShieldCheck className="size-4" />
        {isLoading ? "Verifying..." : "Verify Phone Number"}
      </button>
    </AuthShell>
  );
}

export function OrganizerLoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginMethod, setLoginMethod] = useState<"password" | "phone">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneNotice, setPhoneNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [organizerLogin, { isLoading }] = useOrganizerLoginMutation();
  const [sendLoginPhoneOtp, { isLoading: isSendingPhoneOtp }] = useSendPhoneOtpMutation();
  const [verifyLoginPhoneOtp, { isLoading: isVerifyingPhoneOtp }] = useVerifyPhoneOtpMutation();

  const normalizedLoginPhone = () => normalizeOrganizerPhone(phone) || "";

  const finishOrganizerLogin = (data: any) => {
    const session = persistOrganizerSession(data);
    const organizerPayload = data.organizer ?? data.user;
    const kycStatus = String(organizerPayload?.kycStatus ?? organizerPayload?.kyc_status ?? "").toLowerCase();

    if (session.isKycVerified || kycStatus === "verified" || kycStatus === "approved") {
      markOrganizerApproved();
    } else {
      markOrganizerPending();
    }

    const redirectPath = getOrganizerRedirectPath(searchParams?.get("redirect") ?? null);
    router.replace(redirectPath);
    router.refresh();
  };

  const login = async () => {
    setError("");
    if (!email.trim()) { setError("Email address is required."); return; }
    if (!password.trim()) { setError("Password is required."); return; }

    try {
      const result = await organizerLogin({ email: email.trim().toLowerCase(), password }).unwrap();
      finishOrganizerLogin(result.data);
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const requestPhoneLoginOtp = async () => {
    setError("");
    setPhoneNotice("");
    const normalizedPhone = normalizedLoginPhone();
    if (!/^\+?[1-9]\d{9,14}$/.test(normalizedPhone)) {
      setError("Enter a valid mobile number.");
      return;
    }
    try {
      const result = await sendLoginPhoneOtp({
        phone: normalizedPhone,
        purpose: "login",
        loginRole: "organizer",
        deliveryChannel: "auto",
      }).unwrap();
      setPhoneOtpSent(true);
      setPhoneOtp("");
      setPhoneNotice(result.message || "Security code sent to your registered contact.");
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const loginByPhone = async () => {
    setError("");
    setPhoneNotice("");
    const code = phoneOtp.trim().toUpperCase();
    if (!/^(?=(?:.*[A-Z]){3})(?=(?:.*\d){3})[A-Z0-9]{6}$/.test(code)) {
      setError("Enter the 3-letter, 3-digit verification code.");
      return;
    }
    try {
      const result = await verifyLoginPhoneOtp({
        phone: normalizedLoginPhone(),
        otp: code,
        purpose: "login",
        loginRole: "organizer",
      }).unwrap();
      finishOrganizerLogin(result.data);
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <AuthShell
      title="Welcome back, Organizer"
      description="Manage events, tickets, bookings and experiences with Buizz."
      icon={<LockKeyhole className="size-5" />}
      backHref="/organizer/intro"
      backLabel="Back to organizer"
    >
      <AuthSocialButtons />

      <AuthDivider />

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
              setError("");
              setPhoneNotice("");
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

      <div className="grid gap-2.5 sm:gap-4">
        {loginMethod === "password" ? (
          <>
        <label className={organizerAuthLabelClass}>
          Email Address
          <div className={organizerAuthControlClass}>
            <LockKeyhole className="size-3.5 shrink-0 text-slate-400 sm:size-4" />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="organizer@example.com"
              className={organizerAuthInputClass}
            />
          </div>
        </label>

        <label className={organizerAuthLabelClass}>
          Password
          <div className={organizerAuthControlClass}>
            <LockKeyhole className="size-3.5 shrink-0 text-slate-400 sm:size-4" />
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
              className="text-slate-400 transition hover:text-[#070a1a]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-3.5 sm:size-4" /> : <Eye className="size-3.5 sm:size-4" />}
            </button>
          </div>
        </label>
          </>
        ) : (
          <>
            <label className={organizerAuthLabelClass}>
              Registered Mobile Number
              <div className={organizerAuthControlClass}>
                <Phone className="size-3.5 shrink-0 text-slate-400 sm:size-4" />
                <input
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setPhoneOtpSent(false);
                    setPhoneOtp("");
                    setPhoneNotice("");
                  }}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  className={organizerAuthInputClass}
                />
              </div>
            </label>

            {phoneOtpSent ? (
              <label className={organizerAuthLabelClass}>
                Verification Code
                <div className={organizerAuthControlClass}>
                  <ShieldCheck className="size-3.5 shrink-0 text-[#ec1b72] sm:size-4" />
                  <input
                    value={phoneOtp}
                    onChange={(event) => setPhoneOtp(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                    inputMode="text"
                    autoComplete="one-time-code"
                    placeholder="ABC123"
                    className={`${organizerAuthInputClass} uppercase tracking-[0.22em]`}
                  />
                  <button type="button" onClick={requestPhoneLoginOtp} className="text-[10px] font-black text-[#ec1b72] hover:text-[#070a1a] sm:text-xs">
                    Resend
                  </button>
                </div>
              </label>
            ) : null}

            <p className="text-[10px] font-semibold leading-5 text-slate-500 sm:text-xs">
              A single-use code will be sent through WhatsApp, with registered email fallback.
            </p>
          </>
        )}
      </div>

      {loginMethod === "password" ? (
      <div className="mt-2.5 flex items-center justify-end gap-2 sm:mt-4">
        <Link
          href="/organizer/forgot-password"
          className="shrink-0 text-[10px] font-black text-[#ec1b72] underline-offset-4 transition hover:text-[#070a1a] hover:underline sm:text-xs"
        >
          Forgot Password?
        </Link>
      </div>
      ) : null}

      {error ? <AuthErrorMessage message={error} /> : null}
      {phoneNotice ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
          {phoneNotice}
        </div>
      ) : null}

      <button
        type="button"
        onClick={loginMethod === "password" ? login : phoneOtpSent ? loginByPhone : requestPhoneLoginOtp}
        disabled={loginMethod === "password" ? isLoading : isSendingPhoneOtp || isVerifyingPhoneOtp}
        className={`${organizerAuthPrimaryButtonClass} mt-3 sm:mt-6`}
      >
        {loginMethod === "password"
          ? isLoading ? "Logging in..." : "Login"
          : isSendingPhoneOtp ? "Sending code..."
            : isVerifyingPhoneOtp ? "Verifying..."
              : phoneOtpSent ? "Verify & login" : "Send secure code"}
      </button>

      <p className="mt-3 text-center text-[11px] font-bold text-slate-500 sm:mt-5 sm:text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/organizer/signup" className="font-black text-[#ec1b72] transition hover:text-[#070a1a]">
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
            <InputField label="Pincode" />
            <InputField label="Website / Social Media Link (Optional)" placeholder="https://instagram.com/yourbrand" />
          </div>
        </SectionCard>

        <SectionCard title="Contact Person Details">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Full Name" placeholder="Rohan Mehta" />
            <InputField label="Designation" placeholder="Founder" />
            <InputField label="Email Address" placeholder="organizer@buizz.local" type="email" />
            <InputField label="Mobile Number" />
            <InputField label="Alternate Mobile Number (Optional)" />
          </div>
        </SectionCard>

        <SectionCard title="Bank Details">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Beneficiary Name" placeholder="Aventra Live Experiences" />
            <SelectField label="Account Type" options={accountTypes} />
            <InputField label="Bank Name" placeholder="HDFC Bank" />
            <InputField label="Account Number" />
            <InputField label="Confirm Account Number" />
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
  documentType: string;
  required?: boolean;
  examples?: string[];
  note?: string;
};

type OrganizerDocumentDraft = Record<string, string>;

const organizerDocumentDraftKey = "buizz-organizer-document-draft";
const organizerDocumentSubmissionKey = "buizz-organizer-document-submission";

const organizerDocuments: OrganizerDocumentItem[] = [
  {
    name: "PAN Card",
    documentType: "pan",
    required: true,
    examples: ["PDF, JPG or PNG accepted"],
    note: "Used for tax and organizer identity verification.",
  },
  {
    name: "Aadhaar Card",
    documentType: "aadhaar",
    required: true,
    examples: ["PDF, JPG or PNG accepted"],
    note: "Used for authorized representative verification.",
  },
  {
    name: "Bank Passbook / Cancelled Cheque",
    documentType: "cancelled_cheque_or_passbook",
    required: true,
    examples: ["PDF, JPG or PNG accepted"],
    note: "Used to verify payout account details.",
  },
  {
    name: "GST Certificate",
    documentType: "gst_certificate",
    examples: ["GST Registration"],
    note: "Optional for individual organizers without GST.",
  },
  {
    name: "Business Registration Certificate",
    documentType: "address_proof",
    examples: ["MSME Certificate", "Company Incorporation", "Shop Act License"],
    note: "Upload if your event brand is registered.",
  },
  {
    name: "Address Proof",
    documentType: "address_proof",
    required: true,
    examples: ["Electricity Bill", "Rent Agreement"],
    note: "Required for KYC verification.",
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

function readOrganizerDocumentSubmission() {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(organizerDocumentSubmissionKey) ?? "null",
    );

    if (!parsed || typeof parsed !== "object") return null;
    return parsed as { submittedAt: string; documents: OrganizerDocumentDraft };
  } catch {
    return null;
  }
}

function readStoredOrganizerSession(): Record<string, unknown> {
  if (typeof window === "undefined") return {};

  for (const key of ["buizz-organizer-session", "buizz-organizer"]) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}");
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        const state = record.state as Record<string, unknown> | undefined;
        const nestedSession = state?.session as Record<string, unknown> | undefined;
        return { ...record, ...(nestedSession ?? {}), token: readSessionValue(record, "token") };
      }
    } catch {}
  }

  return {};
}

async function submitOrganizerKycToBackend(documents: OrganizerDocumentDraft, kycData: Record<string, string>) {
  try {
    const token = readOrganizerToken();
    if (!token) {
      throw new Error("Organizer session expired. Please login again.");
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.buizz.com/api/v1";
    
    // Convert uploaded files to document format expected by backend
    const kycDocuments = Object.entries(documents)
      .filter(([_, url]) => Boolean(url))
      .map(([docName, url]) => ({
        type: getKycDocumentType(docName),
        url: String(url),
        fileName: String(url).split("/").pop() || docName,
      }));

    // Separate KYC documents and bank documents
    const documentsPayload = kycDocuments.filter(doc => 
      ['pan', 'aadhaar', 'address_proof', 'driving_license', 'voter_id', 'passport', 'gst_certificate'].includes(doc.type)
    );
    const bankDocumentsPayload = kycDocuments.filter(doc => 
      ['cancelled_cheque_or_passbook', 'bank_statement'].includes(doc.type)
    );

    const payload = {
      legalName: kycData.legalName,
      businessName: kycData.businessName || undefined,
      panNumber: kycData.panNumber.toUpperCase(),
      gstNumber: kycData.gstNumber?.toUpperCase() || undefined,
      aadhaarLast4: kycData.aadhaarLast4 || undefined,
      addressLine: kycData.addressLine,
      city: kycData.city,
      state: kycData.state,
      pincode: kycData.pincode,
      documents: documentsPayload,
      bankDocuments: bankDocumentsPayload,
    };

    const res = await fetch(`${baseUrl}/kyc/me`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.message ?? `KYC submission failed (${res.status})`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    throw error;
  }
}

async function uploadOrganizerSignupDocument(token: string, file: File, documentType: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.buizz.com/api/v1";
  const formData = new FormData();
  formData.append("document", file);
  formData.append("documentType", documentType);

  const res = await fetch(`${baseUrl}/kyc/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message ?? `Document upload failed (${res.status})`);
  }

  return {
    url: String((data as any)?.data?.url ?? ""),
    fileName: String((data as any)?.data?.fileName ?? file.name),
  };
}

async function submitOrganizerSignupKyc(token: string, payload: Record<string, unknown>) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.buizz.com/api/v1";
  const res = await fetch(`${baseUrl}/kyc/me`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message ?? `KYC submission failed (${res.status})`);
  }

  return data;
}

async function updateOrganizerSignupBank(token: string, payload: Record<string, unknown>) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.buizz.com/api/v1";
  const res = await fetch(`${baseUrl}/organizer/bank`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message ?? `Bank details update failed (${res.status})`);
  }

  return data;
}

function submitOrganizerDocumentsForReview(documents: OrganizerDocumentDraft) {
  if (typeof window === "undefined") return null;

  const submittedAt = new Date().toISOString();
  const session = readStoredOrganizerSession();
  const email = typeof session.email === "string" ? session.email : "";
  const name =
    typeof session.name === "string" && session.name.trim()
      ? session.name
      : typeof session.orgName === "string" && session.orgName.trim()
        ? session.orgName
        : "Organizer";
  const organizerId =
    typeof session.userId === "string" && session.userId.trim()
      ? session.userId
      : typeof session.id === "string" && session.id.trim()
        ? session.id
        : `ORG-${Date.now()}`;
  const documentFlags = Object.fromEntries(
    organizerDocuments.map((document) => [document.name, Boolean(documents[document.name])]),
  );
  const submission = { submittedAt, documents };

  window.localStorage.setItem(organizerDocumentSubmissionKey, JSON.stringify(submission));

  saveOrganizerApplication({
    id: `ORG-APP-${organizerId}-${Date.now()}`,
    organizerId,
    organizationName: name,
    ownerName: name,
    email,
    phone: typeof session.phone === "string" ? session.phone : "",
    city: "",
    status: "pending",
    organizerStatus: "pending",
    adminApprovalStatus: "pending",
    superAdminApprovalStatus: "pending",
    accessStatus: "locked",
    submittedAt,
    documents: documentFlags,
    auditTrail: [
      {
        id: `org-app-audit-${Date.now()}`,
        actorName: name,
        actorRole: "organizer",
        action: "submitted",
        createdAt: submittedAt,
        comment: "Organizer KYC documents submitted for Admin/Super Admin verification.",
      },
    ],
  });

  saveOrganizerApprovalState({
    organizationName: name,
    submittedOn: submittedAt,
    organizerStatus: "pending",
    adminApprovalStatus: "pending",
    superAdminApprovalStatus: "pending",
    accessStatus: "locked",
  });

  window.dispatchEvent(new Event("buizz-organizer-documents-submitted"));
  window.dispatchEvent(new Event("buizz-organizer-approval-updated"));
  window.dispatchEvent(new Event("storage"));

  return submission;
}

export function UploadDocumentsScreen() {
  const router = useRouter();
  const { data: kycStatusData } = useGetKycStatusQuery();
  const [uploadedFiles, setUploadedFiles] = useState<OrganizerDocumentDraft>(() =>
    readOrganizerDocumentDraft(),
  );
  const [submission, setSubmission] = useState(() => readOrganizerDocumentSubmission());
  const databaseRequest = kycStatusData?.data?.latestRequest;
  const databaseKycStatus = String(
    kycStatusData?.data?.user?.kyc_status ?? databaseRequest?.status ?? "",
  ).toLowerCase();
  const databaseHasSubmittedKyc =
    Boolean(databaseRequest?.id) &&
    !["rejected", "changes_required"].includes(databaseKycStatus);
  const effectiveSubmission = submission ?? (
    databaseHasSubmittedKyc
      ? {
        submittedAt: databaseRequest?.created_at ?? new Date().toISOString(),
        documents: {} as OrganizerDocumentDraft,
      }
      : null
  );
  const [kycInfo, setKycInfo] = useState({
    legalName: "",
    businessName: "",
    panNumber: "",
    gstNumber: "",
    aadhaarLast4: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
  });
  const requiredDocuments = organizerDocuments.filter((document) => document.required);
  const uploadedRequiredCount = requiredDocuments.filter(
    (document) => Boolean(uploadedFiles[document.name]),
  ).length;
  const uploadedCount = organizerDocuments.filter((document) =>
    Boolean(uploadedFiles[document.name]),
  ).length;
  const canContinue = uploadedRequiredCount === requiredDocuments.length && 
    kycInfo.legalName && kycInfo.panNumber && kycInfo.addressLine && 
    kycInfo.city && kycInfo.state && kycInfo.pincode;

  if (effectiveSubmission) {
    return (
      <WizardShell
        currentStep={1}
        title="Documents Submitted"
        description="Your uploaded KYC documents have been submitted for verification."
      >
        <section className="overflow-hidden rounded-[28px] border border-[#22C55E]/30 bg-[#F0FDF4] p-5 shadow-[0_18px_54px_rgba(17,24,39,0.07)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#22C55E]/15 text-[#16A34A]">
              <Check className="size-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-[#14532D] sm:text-2xl">
                Uploaded documents submitted successfully.
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#166534]">
                Your KYC documents are sent to Admin/Super Admin for verification. You do not need to upload them again unless an admin asks for changes.
              </p>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#16A34A]">
                Submitted on {new Date(effectiveSubmission.submittedAt).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {organizerDocuments
              .filter((document) => Boolean(effectiveSubmission.documents[document.name]))
              .map((document) => (
                <div
                  key={document.name}
                  className="rounded-2xl border border-[#22C55E]/20 bg-white/80 p-4"
                >
                  <p className="text-sm font-black text-[#14532D]">{document.name}</p>
                  <p className="mt-1 break-words text-xs font-semibold text-[#166534]">
                    {effectiveSubmission.documents[document.name]}
                  </p>
                </div>
              ))}
          </div>
        </section>

        <WizardActions
          backHref="/organizer/dashboard"
          nextHref="/organizer/agreement"
          backLabel="Go to Dashboard"
          nextLabel="Continue"
          helperText="Verification is pending with Admin/Super Admin."
          onBack={() => router.push("/organizer/dashboard")}
          onNext={() => router.push("/organizer/agreement")}
        />
      </WizardShell>
    );
  }

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
                  KYC Information
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                  Provide your personal and business details for verification.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-black text-[var(--app-foreground)] mb-2">Legal Name *</label>
                <input
                  type="text"
                  value={kycInfo.legalName}
                  onChange={(e) => setKycInfo({...kycInfo, legalName: e.target.value})}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                  placeholder="Enter legal name as per PAN"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[var(--app-foreground)] mb-2">Business Name (Optional)</label>
                <input
                  type="text"
                  value={kycInfo.businessName}
                  onChange={(e) => setKycInfo({...kycInfo, businessName: e.target.value})}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                  placeholder="Enter business name if applicable"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[var(--app-foreground)] mb-2">PAN Number *</label>
                <input
                  type="text"
                  value={kycInfo.panNumber}
                  onChange={(e) => setKycInfo({...kycInfo, panNumber: e.target.value.toUpperCase()})}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[var(--app-foreground)] mb-2">GST Number (Optional)</label>
                <input
                  type="text"
                  value={kycInfo.gstNumber}
                  onChange={(e) => setKycInfo({...kycInfo, gstNumber: e.target.value.toUpperCase()})}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[var(--app-foreground)] mb-2">Aadhaar Last 4 Digits (Optional)</label>
                <input
                  type="text"
                  value={kycInfo.aadhaarLast4}
                  onChange={(e) => setKycInfo({...kycInfo, aadhaarLast4: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[var(--app-foreground)] mb-2">Pincode *</label>
                <input
                  type="text"
                  value={kycInfo.pincode}
                  onChange={(e) => setKycInfo({...kycInfo, pincode: e.target.value.replace(/\D/g, '')})}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-black text-[var(--app-foreground)] mb-2">Address Line *</label>
                <input
                  type="text"
                  value={kycInfo.addressLine}
                  onChange={(e) => setKycInfo({...kycInfo, addressLine: e.target.value})}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                  placeholder="Enter complete address"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[var(--app-foreground)] mb-2">City *</label>
                <input
                  type="text"
                  value={kycInfo.city}
                  onChange={(e) => setKycInfo({...kycInfo, city: e.target.value})}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[var(--app-foreground)] mb-2">State *</label>
                <input
                  type="text"
                  value={kycInfo.state}
                  onChange={(e) => setKycInfo({...kycInfo, state: e.target.value})}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                  placeholder="Enter state"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_54px_rgba(17,24,39,0.07)]">
          <div className="grid gap-4 border-b border-[var(--app-border)] bg-[linear-gradient(135deg,rgba(236,27,114,0.10),rgba(102,38,185,0.08),rgba(255,255,255,0.7))] p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] shadow-[0_14px_32px_rgba(236,27,114,0.14)]">
                <FileCheck2 className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-[var(--app-foreground)] sm:text-2xl">
                  Document Upload
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                  Upload required documents for verification.
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
                Complete all required fields and upload all required documents: PAN Card, Aadhaar Card and Bank Passbook / Cancelled Cheque.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-[#22C55E]/25 bg-[#22C55E]/10 p-4 text-sm font-black text-[#16A34A]">
                All required information and documents are ready. You can continue to the agreement step.
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
            ? "All required documents are ready for verification."
            : "Required documents are pending."
        }
        onBack={() => saveDocumentDraft()}
        onNext={async () => {
          try {
            const kycData: Record<string, string> = {
              legalName: kycInfo.legalName,
              businessName: kycInfo.businessName,
              panNumber: kycInfo.panNumber,
              gstNumber: kycInfo.gstNumber,
              aadhaarLast4: kycInfo.aadhaarLast4,
              addressLine: kycInfo.addressLine,
              city: kycInfo.city,
              state: kycInfo.state,
              pincode: kycInfo.pincode,
            };
            await submitOrganizerKycToBackend(uploadedFiles, kycData);
            saveDocumentDraft();
            const nextSubmission = submitOrganizerDocumentsForReview(uploadedFiles);
            setSubmission(nextSubmission);
            router.push("/organizer/agreement");
          } catch (error) {
            alert("Failed to submit KYC documents. Please try again.");
          }
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
  const passwordValid = isOrganizerPasswordValid(password);
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;
  const canSubmit = passwordValid && passwordsMatch;

  // This screen is reached after the onboarding wizard; session is already set.
  // Just mark pending and redirect.
  const createAccount = () => {
    markOrganizerPending();
    router.replace("/organizer/dashboard");
  };

  return (
    <AuthShell
      title="Create a strong password"
      description="Set a secure password to protect your organizer account."
      icon={<LockKeyhole className="size-5" />}
      backHref="/organizer/agreement"
      backLabel="Back to agreement"
    >
      <div className="grid gap-2.5 sm:gap-4">
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
          disabled={!canSubmit}
          className={organizerAuthPrimaryButtonClass}
        >
          Create Account
        </button>
      </div>
    </AuthShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#eef1f5] text-[var(--app-foreground)]">
      <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-[#ec1b72]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 size-72 rounded-full bg-[#6626b9]/10 blur-3xl" />
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
  roleType = "organizer",
}: {
  title?: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  roleType?: AuthRoleType;
}) {
  const experience = getAuthExperience(roleType);
  const resolvedTitle = title || experience.title;
  const resolvedDescription = description || experience.subtitle;

  return (
    <PageShell>
      <div className="grid min-h-[100dvh] place-items-start justify-items-center px-2 py-3 sm:px-6 sm:py-8 lg:place-items-center lg:px-8 lg:py-6">
        <section className="relative mx-auto w-full max-w-[286px] overflow-hidden rounded-[22px] border border-white/80 bg-[#f7f9fd] shadow-[0_14px_38px_rgba(15,23,42,0.12)] sm:max-w-[390px] sm:rounded-[28px] lg:grid lg:min-h-[620px] lg:max-w-[1060px] lg:grid-cols-[minmax(340px,0.82fr)_minmax(0,1fr)] lg:rounded-[32px] lg:border-white/80 lg:bg-white lg:p-3 lg:shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[112px] bg-cover bg-center opacity-30 sm:h-[185px] lg:hidden"
            style={{ backgroundImage: `url("${experience.backgroundImage}")` }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[160px] bg-gradient-to-b from-[#f7f9fd] via-[#f7f9fd]/96 to-[#090114]/10 lg:hidden" />
          <div className="pointer-events-none absolute -right-20 top-5 size-36 rounded-full bg-[#ec1b72]/10 blur-3xl lg:hidden" />

          <div className="relative z-10 flex items-start justify-center px-2.5 py-2.5 sm:px-5 sm:py-5 lg:min-h-[596px] lg:items-center lg:overflow-visible lg:rounded-[26px] lg:bg-white lg:px-8 lg:py-8">
            <div className="w-full max-w-[258px] rounded-[18px] border border-white/80 bg-white/94 p-2.5 text-[#070a1a] shadow-[0_12px_32px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:max-w-[340px] sm:rounded-[24px] sm:p-5 lg:max-w-[350px] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
              <div className="mb-2 flex items-center justify-between gap-2 sm:mb-5">
                <Link
                  href={backHref}
                  className="inline-flex min-h-6 items-center gap-1 text-[10px] font-black text-slate-500 transition hover:text-[#ec1b72] sm:min-h-8 sm:text-[12px]"
                >
                  <ArrowLeft className="size-3.5 sm:size-4" />
                  {backLabel}
                </Link>
                <span className="rounded-full border border-[#ec1b72]/15 bg-[#fff0f6] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.10em] text-[#ec1b72] sm:px-2.5 sm:py-1 sm:text-[9px] lg:hidden">
                  {experience.label}
                </span>
              </div>

              <AuthBrandLogo experience={experience} />

              <div className="mt-2 text-center sm:mt-4 lg:text-left">
                <div className="mx-auto mb-2 hidden size-8 items-center justify-center rounded-full bg-[#fff0f6] text-[#ec1b72] shadow-[0_10px_24px_rgba(236,27,114,0.10)] sm:flex lg:mx-0 lg:mb-3 lg:size-10">
                  {icon}
                </div>

                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#ec1b72] sm:text-[10px]">
                  {experience.eyebrow}
                </p>
                <h1
                  className="mt-1 text-[1.52rem] font-black leading-[0.96] tracking-[-0.05em] text-[#070a1a] sm:text-3xl lg:text-[2rem]"
                  style={{ fontFamily: "var(--font-display), var(--font-ui), system-ui, sans-serif" }}
                >
                  {resolvedTitle}
                </h1>

                <p className="mx-auto mt-2 max-w-[220px] text-[11px] font-bold leading-4 text-slate-500 sm:max-w-sm sm:text-[13px] sm:leading-5 lg:mx-0">
                  {resolvedDescription}
                </p>
              </div>

              <div className="mt-3 sm:mt-5">{children}</div>
            </div>
          </div>

          <OrganizerAuthVisualPanel experience={experience} />
        </section>
      </div>
    </PageShell>
  );
}

function AuthBrandLogo({ experience }: { experience: AuthExperienceConfig }) {
  return (
    <div className="flex items-center justify-center lg:justify-start">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-[#ec1b72] text-white shadow-[0_10px_22px_rgba(236,27,114,0.18)] sm:size-8">
          <span className="text-sm font-black sm:text-base">B</span>
        </span>
        <div className="text-left">
          <BuizzLogo size="sm" />
          <p className="mt-0 text-[7px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[9px]">
            {experience.label} account
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthRoleTags({
  tags,
  className = "",
  variant = "light",
}: {
  tags: string[];
  className?: string;
  variant?: "light" | "dark";
}) {
  const tagClass =
    variant === "dark"
      ? "border-white/16 bg-white/12 text-white backdrop-blur-xl"
      : "border-slate-200 bg-white/70 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)]";

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] ${tagClass}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function AuthStatsGrid({
  stats,
  variant = "light",
}: {
  stats: AuthExperienceStat[];
  variant?: "light" | "dark";
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((card) => {
        const Icon = card.icon;
        const dark = variant === "dark";

        return (
          <article
            key={card.label}
            className={
              dark
                ? "rounded-3xl border border-white/14 bg-white/10 p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl"
                : "rounded-3xl border border-slate-200 bg-white p-4 text-[#070a1a] shadow-[0_18px_44px_rgba(15,23,42,0.07)]"
            }
          >
            <span
              className={
                dark
                  ? "grid size-10 place-items-center rounded-2xl bg-white/15 text-[#f6c453]"
                  : "grid size-10 place-items-center rounded-2xl bg-[#fff0f6] text-[#ec1b72]"
              }
            >
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-black">{card.label}</h3>
            <p className={dark ? "mt-1 text-xs font-semibold leading-5 text-white/62" : "mt-1 text-xs font-semibold leading-5 text-slate-500"}>
              {card.detail}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function AuthSocialButtons() {
  const [error, setError] = useState("");
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

  return (
    <div className="grid gap-2">
      <button type="button" onClick={continueWithGoogle} className={organizerAuthGoogleButtonClass} aria-label="Continue with Google">
        <GoogleIcon className="size-3.5 shrink-0 sm:size-4" />
        <span>Google</span>
      </button>
      <button type="button" onClick={continueWithFacebook} className={organizerAuthGoogleButtonClass} aria-label="Continue with Facebook">
        <span className="grid size-3.5 place-items-center rounded-full bg-[#1877F2] text-[10px] font-black text-white sm:size-4 sm:text-xs">f</span>
        <span>Facebook</span>
      </button>
      {error ? <p className="text-center text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  );
}

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.1 0 9.8-1.9 13.3-5.1l-6.1-5.2C29.2 35.2 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.3-4.1 5.7l6.1 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function AuthDivider() {
  return (
    <div className="my-3 flex items-center gap-2 sm:my-5 sm:gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-black text-slate-400 sm:text-xs">Or</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function AuthErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-600">
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

function getKycDocumentType(documentName: string): string {
  const name = documentName.toLowerCase();
  if (name.includes("pan")) return "pan";
  if (name.includes("aadhaar")) return "aadhaar";
  if (name.includes("passbook") || name.includes("cheque")) return "cancelled_cheque_or_passbook";
  if (name.includes("gst")) return "gst_certificate";
  if (name.includes("address")) return "address_proof";
  if (name.includes("driving")) return "driving_license";
  if (name.includes("voter")) return "voter_id";
  if (name.includes("passport")) return "passport";
  if (name.includes("electricity") || name.includes("water") || name.includes("utility")) return "address_proof";
  return "address_proof";
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileSelect = async (file: File | undefined) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("documentType", getKycDocumentType(document.name));

      const token = readOrganizerToken();
      if (!token) {
        throw new Error("Organizer session expired. Please login again before uploading KYC documents.");
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const res = await fetch(`${baseUrl}/kyc/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? `Upload failed (${res.status})`);
      }

      const data = await res.json();
      const fileUrl: string = data?.data?.url ?? data?.url ?? data?.filePath ?? file.name;
      onFileChange(fileUrl);
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

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
          {uploading ? "Uploading..." : isUploaded ? "Uploaded" : document.required ? "Required" : "Optional"}
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-base font-black text-[var(--app-foreground)]">{document.name}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
          {document.examples?.join(", ") || "PDF, JPG or PNG accepted"}
        </p>
        {document.note ? (
          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">{document.note}</p>
        ) : null}
      </div>

      {isUploaded ? (
        <div className="rounded-2xl border border-[#22C55E]/25 bg-white/75 p-3 text-xs font-black text-[#16A34A]">
          <p className="break-words">{fileName.split("/").pop() ?? fileName}</p>
        </div>
      ) : null}

      {uploadError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600">
          {uploadError}
        </p>
      ) : null}

      <div className="mt-auto grid gap-2 sm:grid-cols-2">
        <input
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => { void handleFileSelect(event.target.files?.[0]); }}
        />
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-xs font-black text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] sm:col-span-2 ${uploading ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {uploading ? "Uploading..." : isUploaded ? "Replace File" : "Choose File"}
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
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  return (
    <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          aria-label={`OTP digit ${index + 1}`}
          inputMode="numeric"
          maxLength={1}
          value={digit.trim()}
          onChange={(event) => {
            const next = value.split("");
            next[index] = event.target.value.replace(/\D/g, "").slice(-1);
            onChange(next.join("").slice(0, 6));
          }}
          className="min-h-10 min-w-0 rounded-[14px] border border-slate-200 bg-white text-center text-base font-black text-[#070a1a] outline-none transition focus:border-[#ec1b72] focus:ring-4 focus:ring-[#ec1b72]/10 sm:min-h-12 sm:text-lg"
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

function OrganizerAuthVisualPanel({ experience }: { experience: AuthExperienceConfig }) {
  return (
    <div className="relative hidden min-h-[596px] min-w-0 overflow-hidden rounded-[26px] bg-[#08000b] lg:block">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-64"
        style={{ backgroundImage: `url("${experience.backgroundImage}")` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(236,27,114,0.28),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(102,38,185,0.32),transparent_34%),linear-gradient(140deg,rgba(8,0,11,0.98),rgba(40,7,58,0.88),rgba(8,0,11,0.96))]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#08000b] via-[#08000b]/78 to-transparent" />
      <div className="absolute -right-20 top-20 size-52 rounded-full bg-[#ec1b72]/18 blur-3xl" />
      <div className="absolute -left-20 bottom-20 size-52 rounded-full bg-[#6626b9]/22 blur-3xl" />

      <div className="relative z-10 flex h-full min-h-[596px] min-w-0 flex-col justify-between p-6 text-white xl:p-7">
        <div className="flex items-center justify-between gap-4">
          <BuizzLogo variant="dark" size="sm" />
          <span className="rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl">
            {experience.label}
          </span>
        </div>

        <div className="max-w-[470px] min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f6c453]">
            {experience.eyebrow}
          </p>
          <h2
            className="mt-3 max-w-[470px] break-words text-[2.35rem] font-black leading-[0.98] tracking-[-0.055em] text-white xl:text-[2.85rem]"
            style={{ fontFamily: "var(--font-display), var(--font-ui), system-ui, sans-serif" }}
          >
            {experience.heroTitle}
          </h2>
          <p className="mt-4 max-w-[450px] text-[13px] font-semibold leading-6 text-white/74">
            “{experience.heroQuote}”
          </p>

          <div className="mt-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/12 text-sm font-black text-white backdrop-blur-xl">
              B
            </span>
            <div>
              <p className="text-[13px] font-black text-white">{experience.quoteAuthor}</p>
              <p className="text-[11px] font-semibold text-white/58">{experience.quoteRole}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3.5">
          <div>
            <div className="mb-2.5 flex items-center gap-4">
              <p className="shrink-0 text-[9px] font-black uppercase tracking-[0.18em] text-white/72">
                Your tools
              </p>
              <div className="h-px flex-1 bg-white/18" />
            </div>
            <AuthRoleTags tags={experience.tags} variant="dark" />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {experience.stats.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.label}
                  className="rounded-2xl border border-white/12 bg-white/10 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-xl"
                >
                  <span className="grid size-8 place-items-center rounded-xl bg-white/14 text-[#f6c453]">
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-2.5 text-sm font-black leading-none text-white">{item.value}</p>
                  <p className="mt-1.5 text-[10px] font-bold leading-4 text-white/62">{item.label}</p>
                </article>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {experience.partners.map((partner) => (
              <span
                key={partner}
                className="rounded-xl border border-white/10 bg-white/[0.08] px-2.5 py-1.5 text-center text-[9px] font-black text-white/76 backdrop-blur-xl"
              >
                {partner}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketVisualCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative w-full overflow-hidden border border-white/15 bg-[var(--color-brand-ink)] text-white shadow-[0_18px_48px_rgba(0,0,0,0.22)] ${compact ? "rounded-[22px] p-3" : "rounded-[24px] p-4 sm:p-5"
        }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,var(--color-brand-primary),transparent_34%),radial-gradient(circle_at_95%_15%,var(--color-brand-secondary),transparent_32%)] opacity-35" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <BuizzLogo variant="dark" size="sm" />
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/70">BUIZZ PASS</p>
            <span className="mt-1.5 inline-flex rounded-full bg-[var(--color-status-success)] px-2.5 py-0.5 text-[9px] font-black uppercase text-white">Valid</span>
          </div>
        </div>

        <div className={compact ? "mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-3" : "mt-7 rounded-2xl border border-white/10 bg-white/[0.06] p-4"}>
          <p className="text-[10px] font-black uppercase text-[var(--color-brand-accent)]">Live Concert</p>
          <h3 className={compact ? "mt-1.5 text-lg font-black leading-tight" : "mt-2 text-xl font-black leading-tight"}>
            Neon Nights Festival
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-white/72">
            <p>Fri, 19 Jun</p>
            <p>07:30 PM</p>
            <p className="col-span-2">Phoenix Arena, Mumbai</p>
          </div>
        </div>

        <div className={compact ? "mt-3 grid grid-cols-[1fr_70px] gap-2.5" : "mt-4 grid grid-cols-[1fr_92px] gap-3"}>
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
            <p className="text-[9px] font-black uppercase text-white/45">Booking ID</p>
            <p className="mt-1 truncate text-[12px] font-black">BUIZZ-EVNT-9X2A</p>
            <div className="mt-2.5 grid grid-cols-3 gap-1 text-[9px] font-black text-white/64">
              <span>Gold</span>
              <span>2 seats</span>
              <span>Rs. 2,998</span>
            </div>
          </div>
          <div className="grid aspect-square place-items-center rounded-2xl bg-white p-2 text-[var(--color-brand-ink)]">
            <QrCode className={compact ? "size-10" : "size-14"} />
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

function FileInputField({ label, file, onChange }: { label: string; file: File | null; onChange: (file: File | null) => void }) {
  return (
    <label className="grid gap-2 text-xs font-black text-[var(--color-text-secondary)]">
      {label}
      <span className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          className="text-xs font-bold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-[#ec1b72] file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
        />
        <span className="text-[11px] font-bold text-slate-500">
          {file ? file.name : "PDF, JPG or PNG accepted"}
        </span>
      </span>
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
