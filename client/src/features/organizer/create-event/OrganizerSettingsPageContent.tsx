"use client";

import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useGetKycStatusQuery,
  useUpdateOrganizerBankDetailsMutation,
} from "@/store";

export type OrganizerSettings = {
  organizerId: string;
  businessName: string;
  displayName: string;
  email: string;
  phone: string;
  city: string;
  businessCategory: string;
  website: string;
  instagram: string;
  gstNumber: string;
  panNumber: string;
  aadhaarLast4: string;
  addressLine: string;
  state: string;
  pincode: string;
  kycStatus: "Not Started" | "Pending Review" | "Verified" | "Rejected";
  documentStatus: "Missing" | "Uploaded" | "Pending Review" | "Verified" | "Rejected";
  bankStatus: "Not Added" | "Pending Verification" | "Verified" | "Rejected";
  approvalStatus: "Pending Review" | "Approved" | "Rejected" | "Suspended";
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  bookingAlerts: boolean;
  refundAlerts: boolean;
  approvalAlerts: boolean;
  twoFactorEnabled: boolean;
  accountHolderName: string;
  bankName: string;
  maskedAccountNumber: string;
  ifsc: string;
  upiId: string;
  settlementCycle: "Weekly" | "Bi-weekly" | "Monthly" | "Manual";
  updatedAt: string;
};

const ORGANIZER_SETTINGS_STORAGE_KEY = "buizz-organizer-settings-v1";
const ORGANIZER_SETTINGS_REQUESTS_KEY = "buizz-organizer-settings-requests-v1";

type SettingsFormErrors = Partial<Record<keyof OrganizerSettings | "form", string>>;
type DangerAction = "suspension" | "deletion";
type DangerRequest = {
  id: string;
  type: DangerAction;
  status: "Queued for Admin Review";
  requestedAt: string;
};

// Future backend:
// GET /api/organizer/settings
// PATCH /api/organizer/settings
// POST /api/organizer/security/change-password
// POST /api/organizer/account/delete-request
// Backend must protect organizer ownership, store audit logs, and never trust frontend-only changes.

export function getDefaultOrganizerSettings(): OrganizerSettings {
  return {
    organizerId: "",
    businessName: "",
    displayName: "",
    email: "",
    phone: "",
    city: "",
    businessCategory: "",
    website: "",
    instagram: "",
    gstNumber: "",
    panNumber: "",
    aadhaarLast4: "",
    addressLine: "",
    state: "",
    pincode: "",
    kycStatus: "Pending Review",
    documentStatus: "Uploaded",
    bankStatus: "Pending Verification",
    approvalStatus: "Approved",
    emailNotifications: true,
    whatsappNotifications: true,
    bookingAlerts: true,
    refundAlerts: true,
    approvalAlerts: true,
    twoFactorEnabled: false,
    accountHolderName: "Aventra Live Events",
    bankName: "HDFC Bank",
    maskedAccountNumber: "****4321",
    ifsc: "HDFC0001234",
    upiId: "aventra@upi",
    settlementCycle: "Weekly",
    updatedAt: new Date().toISOString(),
  };
}

export function readOrganizerSettingsFromStorage(): OrganizerSettings {
  if (typeof window === "undefined") return getDefaultOrganizerSettings();

  try {
    const stored = window.localStorage.getItem(ORGANIZER_SETTINGS_STORAGE_KEY);
    if (!stored) return getDefaultOrganizerSettings();

    const parsed = JSON.parse(stored) as Partial<OrganizerSettings>;
    return { ...getDefaultOrganizerSettings(), ...parsed };
  } catch {
    return getDefaultOrganizerSettings();
  }
}

export function writeOrganizerSettingsToStorage(settings: OrganizerSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ORGANIZER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function readOrganizerSettingsRequests(): DangerRequest[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ORGANIZER_SETTINGS_REQUESTS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Partial<DangerRequest>;
        if (record.type !== "suspension" && record.type !== "deletion") return null;

        return {
          id: String(record.id ?? `REQ-${Date.now()}`),
          type: record.type,
          status: "Queued for Admin Review" as const,
          requestedAt: String(record.requestedAt ?? new Date().toISOString()),
        } satisfies DangerRequest;
      })
      .filter((item): item is DangerRequest => Boolean(item));
  } catch {
    return [];
  }
}

function writeOrganizerSettingsRequests(requests: DangerRequest[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ORGANIZER_SETTINGS_REQUESTS_KEY, JSON.stringify(requests));
}

function validateOrganizerSettings(settings: OrganizerSettings): SettingsFormErrors {
  const errors: SettingsFormErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const bankHasAnyValue = Boolean(
    settings.accountHolderName.trim() ||
    settings.bankName.trim() ||
    settings.maskedAccountNumber.trim() ||
    settings.ifsc.trim() ||
    settings.upiId.trim(),
  );

  if (!settings.businessName.trim()) errors.businessName = "Business name is required.";
  if (!settings.displayName.trim()) errors.displayName = "Display name is required.";
  if (!settings.email.trim()) errors.email = "Email is required.";
  else if (!emailPattern.test(settings.email.trim())) errors.email = "Enter a valid email address.";
  if (!settings.phone.trim()) errors.phone = "Phone number is required.";
  if (!settings.city.trim()) errors.city = "City is required.";
  if (!settings.addressLine.trim()) errors.addressLine = "Address is required for KYC.";
  if (!settings.state.trim()) errors.state = "State is required for KYC.";
  if (!settings.pincode.trim()) errors.pincode = "Pincode is required for KYC.";
  if (!settings.panNumber.trim()) errors.panNumber = "PAN number is required for KYC.";
  if (bankHasAnyValue && !settings.accountHolderName.trim()) {
    errors.accountHolderName = "Account holder name is required for payout details.";
  }
  if (settings.ifsc && settings.ifsc !== settings.ifsc.toUpperCase()) {
    errors.ifsc = "IFSC must be uppercase.";
  }

  return errors;
}

function formatSettingsTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced yet";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrganizerSettingsPageContent() {
  const { data: kycStatusResponse } = useGetKycStatusQuery();
  const [updateOrganizerBankDetails] = useUpdateOrganizerBankDetailsMutation();
  const [savedSettings, setSavedSettings] = useState<OrganizerSettings>(() => getDefaultOrganizerSettings());
  const [settings, setSettings] = useState<OrganizerSettings>(() => getDefaultOrganizerSettings());
  const [errors, setErrors] = useState<SettingsFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const [dangerRequests, setDangerRequests] = useState<DangerRequest[]>([]);

  useEffect(() => {
    const loadedSettings = readOrganizerSettingsFromStorage();
    setSavedSettings(loadedSettings);
    setSettings(loadedSettings);
    setDangerRequests(readOrganizerSettingsRequests());
  }, []);

  useEffect(() => {
    const user = kycStatusResponse?.data?.user;
    const latestRequest = kycStatusResponse?.data?.latestRequest;
    if (!user && !latestRequest) return;

    setSettings((current) => ({
      ...current,
      kycStatus:
        user?.kyc_status === "verified" || latestRequest?.status === "verified"
          ? "Verified"
          : user?.kyc_status === "rejected" || latestRequest?.status === "rejected"
            ? "Rejected"
            : user?.kyc_status === "pending" || latestRequest?.status === "pending"
              ? "Pending Review"
              : current.kycStatus,
      documentStatus:
        latestRequest?.status === "verified"
          ? "Verified"
          : latestRequest?.status === "rejected"
            ? "Rejected"
            : latestRequest?.status === "pending"
              ? "Pending Review"
              : current.documentStatus,
      bankStatus:
        user?.bank_verification_status === "verified"
          ? "Verified"
          : user?.bank_verification_status === "rejected"
            ? "Rejected"
            : user?.bank_verification_status === "pending"
              ? "Pending Verification"
              : current.bankStatus,
    }));
  }, [kycStatusResponse]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(savedSettings) !== JSON.stringify(settings),
    [savedSettings, settings],
  );

  const updateSettings = <Key extends keyof OrganizerSettings>(key: Key, value: OrganizerSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
    if (successMessage) setSuccessMessage("");
  };

  const handleSave = () => {
    const normalizedSettings: OrganizerSettings = {
      ...settings,
      email: settings.email.trim(),
      phone: settings.phone.trim(),
      businessName: settings.businessName.trim(),
      displayName: settings.displayName.trim(),
      city: settings.city.trim(),
      website: settings.website.trim(),
      instagram: settings.instagram.trim(),
      gstNumber: settings.gstNumber.trim().toUpperCase(),
      panNumber: settings.panNumber.trim().toUpperCase(),
      aadhaarLast4: settings.aadhaarLast4.trim(),
      addressLine: settings.addressLine.trim(),
      state: settings.state.trim(),
      pincode: settings.pincode.trim().toUpperCase(),
      ifsc: settings.ifsc.trim().toUpperCase(),
      updatedAt: new Date().toISOString(),
    };

    const nextErrors = validateOrganizerSettings(normalizedSettings);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setSuccessMessage("");
      return;
    }

    setSaving(true);

    window.setTimeout(() => {
      // Future backend: PATCH /api/organizer/settings
      writeOrganizerSettingsToStorage(normalizedSettings);
      setSavedSettings(normalizedSettings);
      setSettings(normalizedSettings);
      setSaving(false);
      setSuccessMessage("Organizer settings saved. Backend audit log will record this update in production.");
    }, 500);
  };

  const handleReset = () => {
    setSettings(savedSettings);
    setErrors({});
    setSuccessMessage("Changes reset to last saved settings.");
  };

  const submitPasswordChange = () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.currentPassword.trim()) {
      setPasswordError("Current password is required.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password must match.");
      return;
    }

    setSecurityLoading(true);

    window.setTimeout(() => {
      // Future backend: POST /api/organizer/security/change-password
      setSecurityLoading(false);
      setPasswordSuccess("Password update request queued for backend security validation.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }, 500);
  };

  const confirmDangerAction = () => {
    if (!dangerAction) return;

    const request: DangerRequest = {
      id: `REQ-${Date.now()}`,
      type: dangerAction,
      status: "Queued for Admin Review",
      requestedAt: new Date().toISOString(),
    };

    // Future backend:
    // POST /api/organizer/account/delete-request
    // POST /api/organizer/account/suspension-request
    // Backend must keep audit logs and Admin/Super Admin approval history.
    const nextRequests = [request, ...dangerRequests];
    setDangerRequests(nextRequests);
    writeOrganizerSettingsRequests(nextRequests);
    setDangerAction(null);
    setSuccessMessage(
      dangerAction === "deletion"
        ? "Account deletion request queued. No data was deleted in frontend MVP."
        : "Account suspension request queued for Admin/Super Admin review.",
    );
  };

  const statusCards = [
    { label: "Approval", value: settings.approvalStatus, detail: "Admin/Super Admin controlled", icon: ShieldCheck },
    { label: "KYC", value: settings.kycStatus, detail: "Business verification", icon: FileText },
    { label: "Documents", value: settings.documentStatus, detail: "GST, PAN, agreement", icon: Building2 },
    { label: "Bank", value: settings.bankStatus, detail: "Payout readiness", icon: CreditCard },
  ];

  return (
    <div className="grid w-full min-w-0 gap-4 overflow-hidden sm:gap-5">
      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:rounded-[2rem] sm:p-5">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
              Organizer Control
            </p>
            <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-[var(--app-foreground)] sm:text-4xl">
              Organizer Settings
            </h1>
            <p className="mt-2 max-w-3xl break-words text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
              Manage business profile, verification, payout, notifications, and security. Frontend localStorage is temporary; backend will own final validation and audit logs.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <StatusChip label={settings.approvalStatus} />
            <StatusChip label={`KYC ${settings.kycStatus}`} />
            <StatusChip label={`Bank ${settings.bankStatus}`} />
          </div>
        </div>
      </section>

      {successMessage ? (
        <ActionBanner tone="success" title="Settings updated" message={successMessage} />
      ) : null}

      {errors.form ? <ActionBanner tone="danger" title="Please check settings" message={errors.form} /> : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="grid min-w-0 gap-4">
          <SettingsSection icon={UserRound} title="Business Profile" detail="Customer-facing organizer identity and contact information.">
            <div className="grid gap-3 md:grid-cols-2">
              <SettingsTextField label="Business name" value={settings.businessName} onChange={(value) => updateSettings("businessName", value)} placeholder="Example: Aventra Live Events" error={errors.businessName} required />
              <SettingsTextField label="Display name" value={settings.displayName} onChange={(value) => updateSettings("displayName", value)} placeholder="Example: Aventra Live" error={errors.displayName} required />
              <SettingsTextField label="Email" type="email" value={settings.email} onChange={(value) => updateSettings("email", value)} placeholder="organizer@example.com" error={errors.email} required />
              <SettingsTextField label="Phone" value={settings.phone} onChange={(value) => updateSettings("phone", value)} placeholder="+91 98765 43210" error={errors.phone} required />
              <SettingsTextField label="City" value={settings.city} onChange={(value) => updateSettings("city", value)} placeholder="Pune" error={errors.city} required />
              <SettingsTextField label="Business category" value={settings.businessCategory} onChange={(value) => updateSettings("businessCategory", value)} placeholder="Live Events / Plays / Activities" />
              <SettingsTextField label="Website" value={settings.website} onChange={(value) => updateSettings("website", value)} placeholder="https://yourbrand.com" />
              <SettingsTextField label="Instagram" value={settings.instagram} onChange={(value) => updateSettings("instagram", value)} placeholder="@yourbrand" />
            </div>
          </SettingsSection>

          <SettingsSection icon={ShieldCheck} title="Verification" detail="KYC, business documents, approval, and bank verification status.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statusCards.map(({ label, value, detail, icon }) => (
                <SettingsStatusCard key={label} label={label} value={value} detail={detail} icon={icon} />
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SettingsTextField label="GST number" value={settings.gstNumber} onChange={(value) => updateSettings("gstNumber", value.toUpperCase())} placeholder="Optional GSTIN" />
              <SettingsTextField label="PAN number" value={settings.panNumber} onChange={(value) => updateSettings("panNumber", value.toUpperCase())} placeholder="ABCDE1234F" error={errors.panNumber} required />
              <SettingsTextField label="Aadhaar last 4" value={settings.aadhaarLast4} onChange={(value) => updateSettings("aadhaarLast4", value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" />
              <SettingsTextField label="Registered address" value={settings.addressLine} onChange={(value) => updateSettings("addressLine", value)} placeholder="Street, area, building" error={errors.addressLine} required />
              <SettingsTextField label="State" value={settings.state} onChange={(value) => updateSettings("state", value)} placeholder="Maharashtra" error={errors.state} required />
              <SettingsTextField label="Pincode" value={settings.pincode} onChange={(value) => updateSettings("pincode", value.toUpperCase())} placeholder="411001" error={errors.pincode} required />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <div className="flex min-w-0 items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-primary)]" />
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-[var(--app-foreground)]">KYC documents are submitted during organizer registration.</p>
                  <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">
                    Super Admin reviews the Cloudinary documents from Organizer Review. This settings page now only shows the latest verification status and editable business/profile details.
                  </p>
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection icon={Bell} title="Notification Preferences" detail="Choose how Buizz notifies your organizer team.">
            <div className="grid gap-3 md:grid-cols-2">
              <SettingsSwitch label="Email notifications" description="Receive important dashboard alerts by email." checked={settings.emailNotifications} onChange={(value) => updateSettings("emailNotifications", value)} />
              <SettingsSwitch label="WhatsApp notifications" description="Receive booking and approval alerts on WhatsApp." checked={settings.whatsappNotifications} onChange={(value) => updateSettings("whatsappNotifications", value)} />
              <SettingsSwitch label="Booking alerts" description="Notify when customers complete bookings." checked={settings.bookingAlerts} onChange={(value) => updateSettings("bookingAlerts", value)} />
              <SettingsSwitch label="Refund/support alerts" description="Notify when refund or support actions need review." checked={settings.refundAlerts} onChange={(value) => updateSettings("refundAlerts", value)} />
              <SettingsSwitch label="Event approval alerts" description="Notify when Admin/Super Admin reviews your event." checked={settings.approvalAlerts} onChange={(value) => updateSettings("approvalAlerts", value)} />
            </div>
          </SettingsSection>

          <SettingsSection icon={Lock} title="Security" detail="Password, two-factor placeholder, and active session visibility.">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-3">
                <SettingsTextField label="Current password" type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} placeholder="Enter current password" />
                <SettingsTextField label="New password" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} placeholder="Minimum 8 characters" />
                <SettingsTextField label="Confirm password" type="password" value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} placeholder="Re-enter new password" />

                {passwordError ? <p className="rounded-2xl border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10 p-3 text-xs font-black text-[var(--color-brand-primary)]">{passwordError}</p> : null}
                {passwordSuccess ? <p className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-3 text-xs font-black text-[#15803D]">{passwordSuccess}</p> : null}

                <button type="button" onClick={submitPasswordChange} disabled={securityLoading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit">
                  <Lock className="size-4" />
                  {securityLoading ? "Submitting..." : "Queue Password Update"}
                </button>
              </div>

              <div className="grid content-start gap-3">
                <SettingsSwitch label="Two-factor authentication" description="Frontend placeholder. Backend must verify OTP/device before enabling." checked={settings.twoFactorEnabled} onChange={(value) => updateSettings("twoFactorEnabled", value)} />
                <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">Active Session</p>
                  <p className="mt-2 text-sm font-black text-[var(--app-foreground)]">Chrome on Windows</p>
                  <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">Last active now. Backend should provide device/session revoke controls.</p>
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection icon={CreditCard} title="Payout / Bank Details" detail="Store payout details securely on backend. Frontend must never expose full account number.">
            <div className="grid gap-3 md:grid-cols-2">
              <SettingsTextField label="Account holder name" value={settings.accountHolderName} onChange={(value) => updateSettings("accountHolderName", value)} placeholder="Business or account holder name" error={errors.accountHolderName} />
              <SettingsTextField label="Bank name" value={settings.bankName} onChange={(value) => updateSettings("bankName", value)} placeholder="Bank name" />
              <SettingsTextField label="Bank account number" value={settings.maskedAccountNumber} onChange={(value) => updateSettings("maskedAccountNumber", value)} placeholder="Enter real account number for verification" error={errors.maskedAccountNumber} />
              <SettingsTextField label="IFSC" value={settings.ifsc} onChange={(value) => updateSettings("ifsc", value.toUpperCase())} placeholder="HDFC0001234" error={errors.ifsc} />
              <SettingsTextField label="UPI ID" value={settings.upiId} onChange={(value) => updateSettings("upiId", value)} placeholder="business@upi" />
              <SettingsSelectField label="Settlement cycle" value={settings.settlementCycle} onChange={(value) => updateSettings("settlementCycle", value as OrganizerSettings["settlementCycle"])} options={["Weekly", "Bi-weekly", "Monthly", "Manual"]} />
            </div>
          </SettingsSection>

          <SettingsSection icon={FileText} title="Platform Rules" detail="Read-only organizer permissions and backend audit expectations.">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                "Organizer can create draft events.",
                "Organizer can submit events for review.",
                "Organizer can edit rejected events.",
                "Organizer cannot approve or publish events.",
                "Admin/Super Admin controls approval, publish, refund, and payout.",
                "All important changes must have audit logs.",
              ].map((rule) => (
                <div key={rule} className="flex min-w-0 items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#16A34A]" />
                  <p className="break-words text-xs font-bold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">{rule}</p>
                </div>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection icon={Trash2} title="Danger Zone" detail="Requests are queued only. Frontend MVP does not delete or suspend data directly.">
            <div className="grid gap-3 md:grid-cols-2">
              <DangerActionCard title="Request account suspension" detail="Temporarily stop organizer activity after Admin/Super Admin review." buttonLabel="Request Suspension" onClick={() => setDangerAction("suspension")} />
              <DangerActionCard title="Request account deletion" detail="Ask Buizz team to review permanent account removal." buttonLabel="Request Deletion" onClick={() => setDangerAction("deletion")} danger />
            </div>

            {dangerRequests.length ? (
              <div className="mt-4 grid gap-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">Request History</p>
                {dangerRequests.map((request) => (
                  <div key={request.id} className="flex flex-col gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black capitalize text-[var(--app-foreground)]">{request.type} request</p>
                      <p className="break-words text-xs font-semibold text-[var(--app-muted)]">{formatSettingsTime(request.requestedAt)}</p>
                    </div>
                    <StatusChip label={request.status} />
                  </div>
                ))}
              </div>
            ) : null}
          </SettingsSection>
        </main>

        <aside className="grid min-w-0 content-start gap-4 xl:sticky xl:top-5">
          <section className="overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:rounded-[2rem]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">Settings Summary</p>
            <h2 className="mt-1 break-words text-xl font-black text-[var(--app-foreground)]">{settings.displayName || "Organizer"}</h2>
            <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">{settings.businessName || "Business profile incomplete"}</p>

            <div className="mt-4 grid gap-2">
              <SummaryRow label="Organizer ID" value={settings.organizerId} />
              <SummaryRow label="City" value={settings.city || "Missing"} />
              <SummaryRow label="Settlement" value={settings.settlementCycle} />
              <SummaryRow label="Last updated" value={formatSettingsTime(settings.updatedAt)} />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:rounded-[2rem]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">Save Controls</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
              Backend must scope updates by authenticated organizerId and write audit logs for settings, payout, security, and account requests.
            </p>

            <div className="mt-4 grid gap-2">
              <button type="button" onClick={handleSave} disabled={saving || !hasUnsavedChanges} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                <Save className="size-4" />
                {saving ? "Saving..." : hasUnsavedChanges ? "Save Settings" : "Saved"}
              </button>
              <button type="button" onClick={handleReset} disabled={saving || !hasUnsavedChanges} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50">
                <RefreshCw className="size-4" />
                Reset Changes
              </button>
            </div>
          </section>
        </aside>
      </div>

      {dangerAction ? (
        <ConfirmDangerModal
          action={dangerAction}
          onClose={() => setDangerAction(null)}
          onConfirm={confirmDangerAction}
        />
      ) : null}
    </div>
  );
}

function SettingsSection({ icon: Icon, title, detail, children }: { icon: LucideIcon; title: string; detail: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[2rem] sm:p-5">
      <div className="mb-4 flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-lg font-black text-[var(--app-foreground)] sm:text-xl">{title}</h2>
          <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">{detail}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function SettingsTextField({ label, value, onChange, placeholder, type = "text", error, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; error?: string; required?: boolean }) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
      <span className="break-words">{label} {required ? <span className="text-[var(--color-brand-primary)]">*</span> : null}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`min-h-11 w-full min-w-0 rounded-2xl border bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] sm:min-h-12 sm:px-4 ${error ? "border-[var(--color-brand-primary)]" : "border-[var(--app-border)]"}`}
      />
      {error ? <span className="break-words text-[11px] font-bold normal-case tracking-normal text-[var(--color-brand-primary)]">{error}</span> : null}
    </label>
  );
}

function SettingsSelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black normal-case text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)] sm:min-h-12 sm:px-4"
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function SettingsSwitch({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-left transition hover:border-[var(--color-brand-primary)]/40"
      aria-pressed={checked}
    >
      <span className="min-w-0">
        <span className="block break-words text-sm font-black text-[var(--app-foreground)]">{label}</span>
        <span className="mt-1 block break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">{description}</span>
      </span>
      <span className={`mt-1 flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${checked ? "bg-[var(--color-brand-primary)]" : "bg-[var(--app-border)]"}`}>
        <span className={`size-4 rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function SettingsStatusCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <article className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">{label}</p>
          <p className="mt-1 break-words text-sm font-black text-[var(--app-foreground)]">{value}</p>
        </div>
        <Icon className="size-5 shrink-0 text-[var(--color-brand-primary)]" />
      </div>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">{detail}</p>
    </article>
  );
}

function StatusChip({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const tone = lower.includes("approved") || lower.includes("verified") || lower.includes("queued")
    ? "bg-[#22C55E]/10 text-[#15803D] border-[#22C55E]/20"
    : lower.includes("rejected") || lower.includes("suspended")
      ? "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]/20"
      : "bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)] border-[var(--color-brand-accent)]/20";

  return <span className={`inline-flex min-h-9 max-w-full items-center justify-center rounded-full border px-3 text-center text-[11px] font-black ${tone}`}>{label}</span>;
}

function ActionBanner({ tone, title, message }: { tone: "success" | "danger"; title: string; message: string }) {
  const isSuccess = tone === "success";
  return (
    <div className={`flex min-w-0 items-start gap-3 rounded-2xl border p-3 ${isSuccess ? "border-[#22C55E]/30 bg-[#22C55E]/10" : "border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/10"}`}>
      {isSuccess ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#15803D]" /> : <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-primary)]" />}
      <div className="min-w-0">
        <p className="break-words text-sm font-black text-[var(--app-foreground)]">{title}</p>
        <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">{message}</p>
      </div>
    </div>
  );
}

function DangerActionCard({ title, detail, buttonLabel, onClick, danger = false }: { title: string; detail: string; buttonLabel: string; onClick: () => void; danger?: boolean }) {
  return (
    <article className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <p className="break-words text-sm font-black text-[var(--app-foreground)]">{title}</p>
      <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">{detail}</p>
      <button type="button" onClick={onClick} className={`mt-4 min-h-10 w-full rounded-2xl px-4 text-sm font-black ${danger ? "bg-[var(--color-brand-primary)] text-white" : "border border-[var(--app-border)] bg-[var(--app-elevated)]"}`}>
        {buttonLabel}
      </button>
    </article>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2">
      <span className="shrink-0 text-xs font-black text-[var(--app-muted)]">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-black text-[var(--app-foreground)]">{value}</span>
    </div>
  );
}

function ConfirmDangerModal({ action, onClose, onConfirm }: { action: DangerAction; onClose: () => void; onConfirm: () => void }) {
  const isDelete = action === "deletion";
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:p-4 sm:place-items-center">
      <div className="w-full max-w-lg rounded-t-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-2xl sm:rounded-[2rem] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">Confirmation Required</p>
            <h2 className="mt-1 break-words text-xl font-black text-[var(--app-foreground)]">
              {isDelete ? "Request account deletion?" : "Request account suspension?"}
            </h2>
            <p className="mt-2 break-words text-sm font-semibold leading-6 text-[var(--app-muted)]">
              This will only create a frontend request record. Production backend must route this to Admin/Super Admin review and audit logging.
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-[var(--app-border)] px-4 text-sm font-black">Cancel</button>
          <button type="button" onClick={onConfirm} className="min-h-11 rounded-2xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white">
            Confirm Request
          </button>
        </div>
      </div>
    </div>
  );
}
