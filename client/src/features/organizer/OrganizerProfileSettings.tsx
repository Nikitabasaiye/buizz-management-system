"use client";

import { Check, Eye, EyeOff, Loader2, Save, User, Building2, CreditCard, Lock, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useGetOrganizerProfileQuery,
  useUpdateOrganizerProfileMutation,
  useUpdateOrganizerBankDetailsMutation,
  useOrganizerChangePasswordMutation,
} from "@/store/api/organizerApi";

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractApiError(err: unknown): string {
  if (!err || typeof err !== "object") return "Something went wrong. Please try again.";
  const e = err as any;
  return e?.data?.message || e?.message || "Something went wrong. Please try again.";
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-600"
      }`}
    >
      {type === "success" ? <Check className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
      {message}
    </div>
  );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ec1b72]/10 text-[#ec1b72]">
        {icon}
      </span>
      <div>
        <h2 className="text-lg font-black text-[#070a1a]">{title}</h2>
        <p className="mt-0.5 text-sm font-semibold text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  className = "",
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <label className={`grid gap-1.5 text-xs font-black text-slate-500 ${className}`}>
      {label}
      <span className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-[#f8f9fd] px-3 transition focus-within:border-[#ec1b72] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#ec1b72]/10">
        <input
          type={isPassword && visible ? "text" : type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#070a1a] outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="text-slate-400 transition hover:text-[#070a1a]"
            aria-label={visible ? "Hide" : "Show"}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </span>
    </label>
  );
}

function SaveButton({ loading, disabled }: { loading: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#ec1b72] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(236,27,114,0.22)] transition hover:-translate-y-0.5 hover:bg-[#d91564] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {loading ? "Saving..." : "Save Changes"}
    </button>
  );
}

// ── Profile Section ───────────────────────────────────────────────────────────
function ProfileSection() {
  const { data, isLoading } = useGetOrganizerProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateOrganizerProfileMutation();

  const [form, setForm] = useState({ name: "", phone: "", businessName: "", businessType: "", city: "", state: "" });
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (data?.data) {
      const d = data.data;
      setForm({
        name: d.name || "",
        phone: d.phone || "",
        businessName: d.businessName || "",
        businessType: d.businessType || "",
        city: d.addressCity || "",
        state: d.addressState || "",
      });
    }
  }, [data]);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await updateProfile({
        name: form.name,
        phone: form.phone || undefined,
        businessName: form.businessName || undefined,
        businessType: form.businessType || undefined,
        addressCity: form.city || undefined,
        addressState: form.state || undefined,
      } as any).unwrap();
      setFeedback({ msg: "Profile updated successfully.", type: "success" });
    } catch (err) {
      setFeedback({ msg: extractApiError(err), type: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-[#ec1b72]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <SectionHeader icon={<User className="size-5" />} title="Personal Information" description="Update your name, phone and contact details." />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full Name *" value={form.name} onChange={set("name")} placeholder="Rohan Mehta" />
        <Field label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="9876543210" />
        <Field label="Business Name" value={form.businessName} onChange={set("businessName")} placeholder="Aventra Live Experiences" />
        <Field label="Business Type" value={form.businessType} onChange={set("businessType")} placeholder="Individual / Company" />
        <Field label="City" value={form.city} onChange={set("city")} placeholder="Mumbai" />
        <Field label="State" value={form.state} onChange={set("state")} placeholder="Maharashtra" />
      </div>
      {feedback && <Toast message={feedback.msg} type={feedback.type} />}
      <div className="flex justify-end">
        <SaveButton loading={saving} />
      </div>
    </form>
  );
}

// ── Bank Details Section ──────────────────────────────────────────────────────
function BankDetailsSection() {
  const { data, isLoading } = useGetOrganizerProfileQuery();
  const [updateBank, { isLoading: saving }] = useUpdateOrganizerBankDetailsMutation();

  const [form, setForm] = useState({ bankAccountName: "", bankAccountNumber: "", confirmAccount: "", bankIfsc: "", bankName: "" });
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (data?.data) {
      const d = data.data;
      setForm({
        bankAccountName: d.bankAccountName || "",
        bankAccountNumber: d.bankAccountNumber || "",
        confirmAccount: d.bankAccountNumber || "",
        bankIfsc: d.bankIfsc || "",
        bankName: d.bankName || "",
      });
    }
  }, [data]);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (form.bankAccountNumber !== form.confirmAccount) {
      setFeedback({ msg: "Account numbers do not match.", type: "error" });
      return;
    }
    if (!form.bankAccountName || !form.bankAccountNumber || !form.bankIfsc || !form.bankName) {
      setFeedback({ msg: "Please fill in all required bank fields.", type: "error" });
      return;
    }
    try {
      await updateBank({
        bankAccountName: form.bankAccountName,
        bankAccountNumber: form.bankAccountNumber,
        bankIfsc: form.bankIfsc,
        bankName: form.bankName,
      }).unwrap();
      setFeedback({ msg: "Bank details updated successfully.", type: "success" });
    } catch (err) {
      setFeedback({ msg: extractApiError(err), type: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-[#ec1b72]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <SectionHeader icon={<CreditCard className="size-5" />} title="Bank Details" description="Update your payout bank account information." />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Beneficiary Name *" value={form.bankAccountName} onChange={set("bankAccountName")} placeholder="Aventra Live Experiences" />
        <Field label="Bank Name *" value={form.bankName} onChange={set("bankName")} placeholder="HDFC Bank" />
        <Field label="Account Number *" value={form.bankAccountNumber} onChange={set("bankAccountNumber")} placeholder="123456789012" />
        <Field label="Confirm Account Number *" value={form.confirmAccount} onChange={set("confirmAccount")} placeholder="123456789012" />
        <Field label="IFSC Code *" value={form.bankIfsc} onChange={set("bankIfsc")} placeholder="HDFC0001234" className="md:col-span-2" />
      </div>
      {feedback && <Toast message={feedback.msg} type={feedback.type} />}
      <div className="flex justify-end">
        <SaveButton loading={saving} />
      </div>
    </form>
  );
}

// ── Change Password Section ───────────────────────────────────────────────────
function ChangePasswordSection() {
  const [changePassword, { isLoading }] = useOrganizerChangePasswordMutation();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const rules = [
    { label: "At least 8 characters", valid: form.newPassword.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(form.newPassword) },
    { label: "One number", valid: /\d/.test(form.newPassword) },
    { label: "One special character", valid: /[^A-Za-z0-9]/.test(form.newPassword) },
  ];
  const passwordValid = rules.every((r) => r.valid);
  const passwordsMatch = Boolean(form.confirmPassword) && form.newPassword === form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.currentPassword) { setFeedback({ msg: "Current password is required.", type: "error" }); return; }
    if (!passwordValid) { setFeedback({ msg: "New password does not meet requirements.", type: "error" }); return; }
    if (!passwordsMatch) { setFeedback({ msg: "Passwords do not match.", type: "error" }); return; }

    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }).unwrap();
      setFeedback({ msg: "Password changed successfully.", type: "success" });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setFeedback({ msg: extractApiError(err), type: "error" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <SectionHeader icon={<Lock className="size-5" />} title="Change Password" description="Update your organizer account password." />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Current Password *" value={form.currentPassword} onChange={set("currentPassword")} type="password" placeholder="Enter current password" className="md:col-span-2" />
        <Field label="New Password *" value={form.newPassword} onChange={set("newPassword")} type="password" placeholder="Create new password" />
        <Field label="Confirm New Password *" value={form.confirmPassword} onChange={set("confirmPassword")} type="password" placeholder="Confirm new password" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-[#f8f9fd] p-4">
        <p className="mb-3 text-xs font-black text-slate-500">Password requirements</p>
        <div className="grid grid-cols-2 gap-2">
          {rules.map((rule) => (
            <p key={rule.label} className={`flex items-center gap-2 text-xs font-bold ${rule.valid ? "text-emerald-600" : "text-slate-400"}`}>
              <Check className="size-3.5" />
              {rule.label}
            </p>
          ))}
        </div>
      </div>

      {feedback && <Toast message={feedback.msg} type={feedback.type} />}
      <div className="flex justify-end">
        <SaveButton loading={isLoading} disabled={!passwordValid || !passwordsMatch} />
      </div>
    </form>
  );
}

// ── Read-only Account Info ────────────────────────────────────────────────────
function AccountInfoSection() {
  const { data, isLoading } = useGetOrganizerProfileQuery();

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-[#ec1b72]" /></div>;

  const d = data?.data;
  if (!d) return null;

  const rows = [
    { label: "Email", value: d.email },
    { label: "Account ID", value: String(d.displayId ?? d.id) },
    { label: "Email Verified", value: d.isVerified ? "Yes" : "Pending" },
    { label: "KYC Verified", value: d.isKycVerified ? "Yes" : "Pending" },
    { label: "Total Events", value: String(d.totalEvents ?? 0) },
    { label: "Member Since", value: d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
  ];

  return (
    <div className="grid gap-5">
      <SectionHeader icon={<Building2 className="size-5" />} title="Account Information" description="Read-only account details managed by Buizz." />
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-2xl bg-[#f8f9fd] px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{row.label}</p>
            <p className="text-sm font-black text-[#070a1a]">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
type SettingsTab = "profile" | "bank" | "password" | "account";

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User className="size-4" /> },
  { id: "bank", label: "Bank Details", icon: <CreditCard className="size-4" /> },
  { id: "password", label: "Password", icon: <Lock className="size-4" /> },
  { id: "account", label: "Account Info", icon: <Building2 className="size-4" /> },
];

export function OrganizerProfileSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#070a1a] sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Manage your organizer profile, bank details and account security.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar tabs */}
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-2xl px-4 text-sm font-black transition ${
                activeTab === tab.id
                  ? "bg-[#ec1b72] text-white shadow-[0_8px_20px_rgba(236,27,114,0.22)]"
                  : "border border-slate-200 bg-white text-[#070a1a] hover:border-[#ec1b72]/40 hover:text-[#ec1b72]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_54px_rgba(15,23,42,0.07)] sm:p-7">
          {activeTab === "profile" && <ProfileSection />}
          {activeTab === "bank" && <BankDetailsSection />}
          {activeTab === "password" && <ChangePasswordSection />}
          {activeTab === "account" && <AccountInfoSection />}
        </div>
      </div>
    </div>
  );
}
