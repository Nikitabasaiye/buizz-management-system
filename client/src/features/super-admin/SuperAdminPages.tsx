"use client";

import {
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Star,
  HeadphonesIcon,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TicketCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
// Remove any duplicate import and keep only this one
import { BuizzLogo } from "@/components/brand/BuizzLogo";
import {
  createSessionFromApiResponse,
  setSuperAdminSession,
} from "@/features/auth/authSession";
import {
  formatPlatformCurrency,
  useGetOrganizersQuery,
  useGetRevenueMetricsQuery,
  useGetAdminUsersQuery,
  useGetApprovalQueueQuery,
  useGetEventsQuery,
  useGetDraftEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  usePublishEventMutation,
  useGetPlatformUsersQuery,
  useLoginMutation,
  useReviewEventApprovalMutation,
  useGetAllBookingsQuery,
  useGetPermissionsQuery,
  useGetGroupsQuery,
  useGetVisitorSummaryQuery,
} from "@/store";
import {
  useGetKycRequestsQuery,
  useReviewKycRequestMutation,
} from "@/store/api/kycApi";
import { useGetAllPaymentsQuery } from "@/store/api/paymentsApi";
import {
  adminPermissionKeys,
  adminPermissionLabels,
  organizerPermissionKeys,
  organizerPermissionLabels,
  usePermissionStore,
  type AdminPermissionKey,
  type OrganizerPermissionKey,
} from "@/store/permissionStore";
import { useSuperAdminStore } from "@/store/superAdminStore";

type DashboardTab = "overview" | "approvals" | "admins" | "permissions" | "users" | "organizers" | "events" | "bookings" | "payments" | "revenue" | "settlements" | "reports" | "settings";
type ApiRecord = Record<string, any>;

const platformApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

const dashboardTabs: { id: DashboardTab; label: string; icon: any }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "approvals", label: "Organizer Approvals", icon: TicketCheck },
  { id: "admins", label: "Admin Management", icon: ShieldCheck },
  { id: "permissions", label: "Permissions", icon: SlidersHorizontal },
  { id: "users", label: "Users", icon: Users },
  { id: "organizers", label: "Organizers", icon: Building2 },
  { id: "events", label: "Event Approvals", icon: TicketCheck },
  { id: "bookings", label: "Bookings", icon: TicketCheck },
  { id: "payments", label: "Payments", icon: BarChart3 },
  { id: "revenue", label: "Revenue", icon: BarChart3 },
  { id: "settlements", label: "Settlements", icon: CreditCard },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

function getApiRows(response: any): ApiRecord[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.requests)) return response.data.requests;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.requests)) return response.requests;
  return [];
}

function parseRecordValue(value: unknown): ApiRecord {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as ApiRecord;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeImageList(...values: unknown[]) {
  const images: string[] = [];

  const addValue = (value: unknown) => {
    if (!value) return;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          addValue(JSON.parse(trimmed));
          return;
        } catch {
          // Use the original string as a URL below.
        }
      }
      trimmed.split(",").map((part) => part.trim()).filter(Boolean).forEach((url) => images.push(url));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }
    if (typeof value === "object") {
      const record = value as ApiRecord;
      addValue(record.url ?? record.fileUrl ?? record.secure_url ?? record.src ?? record.path);
    }
  };

  values.forEach(addValue);
  return [...new Set(images)];
}

function normalizeRecordArray(value: unknown): ApiRecord[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object") as ApiRecord[];
  if (typeof value === "string") {
    try {
      return normalizeRecordArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeTextList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return normalizeTextList(JSON.parse(trimmed));
      } catch {
        return [];
      }
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function parseUnknownJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function formatReviewValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join(", ") : "Not provided";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatReviewJson(value: unknown) {
  if (!value) return "Not provided";
  try {
    return JSON.stringify(parseUnknownJson(value), null, 2);
  } catch {
    return String(value);
  }
}

function getEventApprovalDetails(request: ApiRecord): ApiRecord {
  const requestData = parseRecordValue(request.request_data ?? request.requestData ?? request.details);
  const nestedEvent = parseRecordValue(requestData.event ?? requestData.eventData ?? requestData.data);
  return {
    ...request,
    ...requestData,
    ...nestedEvent,
    title: nestedEvent.title ?? requestData.title ?? request.event_title ?? request.title,
    description: nestedEvent.description ?? requestData.description ?? request.event_description ?? request.description,
    category: nestedEvent.category ?? requestData.category ?? request.event_category ?? request.category,
    type: nestedEvent.type ?? requestData.type ?? request.event_type ?? request.type,
    startDate: nestedEvent.startDate ?? nestedEvent.start_date ?? requestData.startDate ?? requestData.start_date ?? request.event_start_date ?? request.start_date,
    endDate: nestedEvent.endDate ?? nestedEvent.end_date ?? requestData.endDate ?? requestData.end_date ?? request.event_end_date ?? request.end_date,
    venue: nestedEvent.venue ?? requestData.venue ?? {
      name: request.venue_name,
      address: request.venue_address,
      city: request.venue_city,
      state: request.venue_state,
      country: request.venue_country,
    },
    banner: nestedEvent.banner ?? requestData.banner ?? request.event_banner ?? request.banner,
    images: nestedEvent.images ?? requestData.images ?? request.event_images ?? request.images,
    ticketTypes: nestedEvent.ticketTypes ?? nestedEvent.ticket_types ?? requestData.ticketTypes ?? requestData.ticket_types,
    termsConditions: nestedEvent.termsConditions ?? nestedEvent.terms_conditions ?? requestData.termsConditions ?? requestData.terms_conditions,
  };
}

function normalizeKycStatus(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "not_submitted" || normalized === "not submitted") return "pending";
  if (normalized === "verified" || normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized.includes("pending") || normalized.includes("review")) return "pending";
  return normalized;
}

function getKycUserStatus(kyc: ApiRecord | undefined, fallback?: unknown) {
  return normalizeKycStatus(
    kyc?.user_kyc_status ??
    kyc?.kyc_status ??
    kyc?.status ??
    fallback ??
    "pending",
  );
}

function getKycBankStatus(kyc: ApiRecord | undefined) {
  return normalizeKycStatus(
    kyc?.user_bank_verification_status ??
    kyc?.bank_verification_status ??
    kyc?.bank_account_status ??
    kyc?.bank_status ??
    "pending",
  );
}

function getOrganizerAccountStatus(organizer: ApiRecord) {
  if (organizer.is_active === false || organizer.isActive === false || organizer.status === "blocked") return "suspended";
  const status = String(organizer.status ?? organizer.accountStatus ?? "").toLowerCase();
  if (status === "active" || status === "approved") return status;
  return normalizeKycStatus(status || organizer.kycStatus || organizer.kyc_status || organizer.user_kyc_status);
}

function normalizeEventApprovalRow(request: ApiRecord): ApiRecord {
  const details = getEventApprovalDetails(request);
  const venue = parseRecordValue(details.venue);
  const actionType = String(request.action_type ?? request.actionType ?? "create");
  const eventTitle = String(details.title ?? request.event_title ?? request.title ?? "Organizer Event");
  const organizerName = String(request.organizer_name ?? request.organizerName ?? request.organizer_email ?? "Organizer");

  return {
    id: request.id ?? request.requestId,
    source: "event_approval",
    type: `Event ${actionType}`,
    title: eventTitle,
    owner: organizerName,
    city: venue.city ?? details.city ?? "Not provided",
    submittedAt: request.requested_at ?? request.created_at ?? request.submittedAt,
    status: request.status ?? "pending",
    riskLevel: "low",
    organizerId: request.organizer_id ?? request.organizerId,
    organizerEmail: request.organizer_email ?? request.organizerEmail,
    banner: details.banner ?? request.banner,
    images: details.images ?? request.images ?? [],
    actionType,
    adminStatus: request.admin_status ?? request.adminStatus ?? "pending",
    superAdminStatus: request.super_admin_status ?? request.superAdminStatus ?? "pending",
    rejectionReason: request.rejection_reason ?? request.rejectionReason,
    details,
    rawApproval: request,
  };
}
const superAdminSessionKeys = [
  "buizz-super-admin-session",
  "buizz-super_admin-session",
  "buizz-super-admin",
  "buizz-admin-session",
  "buizz-admin",
];

const overviewQuickLinks: { title: string; description: string; tab: DashboardTab }[] = [
  { title: "Approvals", description: "Review organizer and event submissions.", tab: "approvals" },
  { title: "Permissions", description: "Toggle admin and organizer access.", tab: "permissions" },
  { title: "Bookings", description: "All user bookings and payment history.", tab: "bookings" },
  { title: "Revenue", description: "Inspect frontend revenue summaries.", tab: "revenue" },
];

export function SuperAdminLandingPage() {
  const session = useSuperAdminStore((state) => state.session);

  return (
    <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
      <section className="mx-auto grid min-h-[72vh] max-w-6xl items-center gap-5 lg:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-md border border-white/10 bg-[#070b15] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:p-8">
          <BuizzLogo variant="dark" size="lg" />
          <p className="text-sm font-black text-[#3B82F6]">Buizz Control Tower</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">Super Admin command center</h1>
          <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-white/72">
            Manage organizer approvals, event approvals, admin permissions, revenue visibility, reports, and platform governance.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={session ? "/super-admin/dashboard" : "/super-admin/login"} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--color-brand-primary)] px-5 text-sm font-black !text-white transition hover:bg-[var(--color-brand-primary)]">
              {session ? "Open Dashboard" : "Super Admin Login"}
              <ChevronRight className="size-4" />
            </Link>
            <Link href="/admin/dashboard" className="inline-flex min-h-11 items-center rounded-md border border-white/14 bg-white/10 px-5 text-sm font-black !text-white transition hover:bg-white/15">
              View Admin Panel
            </Link>
          </div>
        </div>
        <div className="grid gap-3">
          {[
            ["Approvals", "Organizer and event approval queue"],
            ["Permissions", "Admin and organizer feature access"],
            ["Governance", "Revenue, users, reports, and settings"],
          ].map(([title, description]) => (
            <div key={title} className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.10)]">
              <ShieldCheck className="size-5 text-[var(--color-brand-primary)]" />
              <p className="mt-3 text-sm font-black">{title}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function SuperAdminLoginPage() {
  const router = useRouter();
  const login = useSuperAdminStore((state) => state.login);
  const [loginMutation, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Enter email and password.");
      return;
    }
    setMessage("");

    try {
      const response = await loginMutation({ email: email.trim(), password }).unwrap();
      const role = response.data.user?.role;
      if (role !== "super_admin") {
        setMessage("Super Admin account required.");
        return;
      }
      setSuperAdminSession(createSessionFromApiResponse("super-admin", response.data));
      login(email);
      router.push("/super-admin/dashboard");
    } catch (error: any) {
      setMessage(error?.data?.message ?? "Login failed.");
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)]">
      <section className="w-full max-w-md rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.18)]">
        <BuizzLogo size="lg" className="mb-5" />
        <LockKeyhole className="size-9 text-[var(--color-brand-primary)]" />
        <h1 className="mt-4 text-3xl font-black">Super Admin Login</h1>
        <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">Secure backend login for the Buizz control tower.</p>
        <div className="mt-5 grid gap-3">
          <ControlInput label="Email" value={email} onChange={setEmail} />
          <ControlInput label="Password" value={password} onChange={setPassword} type="password" />
        </div>
        {message ? <p className="mt-4 rounded-md bg-[var(--color-brand-primary)]/10 px-3 py-2 text-xs font-black text-[var(--color-brand-primary)]">{message}</p> : null}
        <button type="button" onClick={submit} disabled={isLoading} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? "Signing in..." : "Open Dashboard"}
        </button>
      </section>
    </main>
  );
}

export function SuperAdminDashboardPage() {
  const session = useSuperAdminStore((state) => state.session);
  const logout = useSuperAdminStore((state) => state.logout);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-3 text-center text-[var(--app-foreground)]">
        <section>
          <LockKeyhole className="mx-auto size-12 text-[var(--color-brand-primary)]" />
          <h1 className="mt-4 text-3xl font-black">Super Admin access required</h1>
          <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">Login to manage approvals, permissions, and platform controls.</p>
          <Link href="/super-admin/login" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[var(--color-brand-primary)] px-5 text-sm font-black !text-white">
            Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
      <section className="border-b border-[var(--app-border)] bg-[color:var(--app-elevated)]/95 px-3 py-3 backdrop-blur sm:px-5 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <BuizzLogo size="md" className="shrink-0" />
            <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">Super Admin</p>
            <h1 className="text-2xl font-black leading-tight sm:text-3xl">Buizz Control Dashboard</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-xs font-black text-[var(--app-muted)]">{session.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/super-admin/login");
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black transition hover:border-[var(--color-brand-primary)]/50"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
        <aside className="lg:sticky lg:top-5 lg:self-start">
          <div className="flex gap-2 overflow-x-auto rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 [scrollbar-width:none] lg:grid lg:gap-1 [&::-webkit-scrollbar]:hidden">
            {dashboardTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-left text-xs font-black transition ${activeTab === id ? "bg-[var(--color-brand-primary)] text-white shadow-[0_14px_34px_rgba(236,27,114,0.22)]" : "text-[var(--app-muted)] hover:bg-[var(--app-subtle)] hover:text-[var(--app-foreground)]"
                  }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          {activeTab === "overview" ? <OverviewPanel onOpenTab={setActiveTab} /> : null}
          {activeTab === "approvals" ? <ApprovalsPanel /> : null}
          {activeTab === "admins" ? <AdminsPanel /> : null}
          {activeTab === "permissions" ? <PermissionsPanel /> : null}
          {activeTab === "users" ? <UsersPanel /> : null}
          {activeTab === "organizers" ? <OrganizersPanel /> : null}
          {activeTab === "events" ? <EventsPanel /> : null}
          {activeTab === "bookings" ? <BookingsPanel /> : null}
          {activeTab === "payments" ? <PaymentsPanel /> : null}
          {activeTab === "revenue" ? <RevenuePanel /> : null}
          {activeTab === "settlements" ? <SettlementsPanel /> : null}
          {activeTab === "reports" ? <ReportsPanel /> : null}
          {activeTab === "settings" ? <SettingsPanel /> : null}
        </section>
      </div>
    </main>
  );
}
// Add this to your SuperAdminState interface
interface SuperAdminState {
  session: any | null;
  approvalRequests: any[];     // ← ADD THIS
  admins: any[];
  organizers: any[];
  events: any[];
  users: any[];
  // ... other existing fields
}


function OverviewPanel({ onOpenTab }: { onOpenTab: (tab: DashboardTab) => void }) {
  const { data: adminsData } = useGetAdminUsersQuery({ page: 1, limit: 100 });
  const { data: organizersData } = useGetOrganizersQuery({ page: 1, limit: 100 });
  const { data: eventsData } = useGetEventsQuery({ page: 1, limit: 100 });
  const { data: approvalData } = useGetApprovalQueueQuery({ page: 1, limit: 100, status: "pending" });
  const { data: visitorData } = useGetVisitorSummaryQuery({ days: 30 });

  const admins = adminsData?.data ?? [];
  const organizers = organizersData?.data ?? [];
  const eventsArray = Array.isArray(eventsData?.data) 
    ? eventsData?.data 
    : eventsData?.data?.events ?? [];
  const pending = approvalData?.total ?? approvalData?.data?.length ?? 0;
  const liveEvents = eventsArray.filter((event: ApiRecord) => event.status === "live" || event.status === "published").length;
  const totalRevenue = eventsArray.reduce((sum: number, event: ApiRecord) => sum + Number(event.revenue ?? 0), 0);
  const visitorTotals = visitorData?.data?.totals ?? {};

  return (
    <div className="grid gap-5">
      <div className="overflow-hidden rounded-md border border-white/10 bg-[#070b15] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-7">
        <p className="text-sm font-black text-[#3B82F6]">Platform Overview</p>
        <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Approvals, permissions, and platform health</h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/70">Live platform data from the configured backend APIs.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending Approvals" value={String(pending)} description="Organizer and event queue" />
        <MetricCard label="Admins" value={String(admins.length)} description="Managed by Super Admin" />
        <MetricCard label="Organizers" value={String(organizers.length)} description="Partner accounts" />
        <MetricCard label="Revenue" value={formatPlatformCurrency(totalRevenue)} description={`${liveEvents} live events`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Visitors" value={String(visitorTotals.total_visitors ?? 0)} description="Unique visitors in 30 days" />
        <MetricCard label="Visits" value={String(visitorTotals.total_visits ?? 0)} description={`${visitorTotals.total_sessions ?? 0} sessions tracked`} />
        <MetricCard label="Signed Users" value={String(visitorTotals.signed_users ?? 0)} description={`${visitorTotals.guest_visitors ?? 0} guest visitors`} />
        <MetricCard label="Signed Organizers" value={String(visitorTotals.signed_organizers ?? 0)} description={`${visitorTotals.signed_admins ?? 0} admins, ${visitorTotals.signed_super_admins ?? 0} super admins`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {overviewQuickLinks.map(({ title, description, tab }) => (
          <button 
            key={title} 
            type="button" 
            onClick={() => onOpenTab(tab)} 
            className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-left shadow-[0_14px_40px_rgba(0,0,0,0.10)] transition hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]/50"
          >
            <p className="text-lg font-black">{title}</p>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ApprovalsPanel() {
  const { data: organizerApprovalData, isLoading } = useGetApprovalQueueQuery({ page: 1, limit: 100, type: "organizer" });
  const { data: eventApprovalData, isLoading: isEventApprovalLoading } = useGetApprovalQueueQuery({ page: 1, limit: 100 });
  const { data: kycRequestsData, isLoading: isKycLoading } = useGetKycRequestsQuery({ page: 1, limit: 100, role: "organizer" });
  const organizerApprovalRows = getApiRows(organizerApprovalData);
  const eventApprovalRows = getApiRows(eventApprovalData);
  const kycRows = kycRequestsData?.data?.requests ?? [];
  const latestKycRows: ApiRecord[] = Array.from(
    kycRows.reduce((map: Map<string, ApiRecord>, request: ApiRecord) => {
      const key = String(request.user_id ?? request.userId ?? request.user_email ?? request.id);
      if (!map.has(key)) map.set(key, request);
      return map;
    }, new Map<string, ApiRecord>()).values(),
  );
  const approvals = [
    ...latestKycRows.map((request: ApiRecord) => ({
      id: `kyc-${request.id}`,
      source: "kyc",
      organizerId: request.user_id,
      title: request.business_name || request.legal_name || request.user_name || "Organizer KYC",
      owner: request.user_name || request.legal_name || request.user_email || "Organizer",
      city: request.city,
      submittedAt: request.created_at,
      status: getKycUserStatus(request),
      riskLevel: "low",
      kycRequest: request,
    })),
    ...organizerApprovalRows.map((approval: ApiRecord) => ({ ...approval, source: approval.source ?? "approval" })),
    ...eventApprovalRows.map(normalizeEventApprovalRow),
  ];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedApproval, setSelectedApproval] = useState<ApiRecord | null>(null);

  const filteredApprovals = approvals.filter((approval: ApiRecord) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      String(approval.title ?? "").toLowerCase().includes(searchValue) ||
      String(approval.owner ?? "").toLowerCase().includes(searchValue) ||
      String(approval.city ?? "").toLowerCase().includes(searchValue);

    const matchesStatus =
      statusFilter === "all" || approval.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Panel
      title="Organizer Approvals"
      description="Review organizer KYC requests and submitted organizer events"
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Applications"
            value={String(approvals.length)}
            description="Organizer requests"
          />
          <MetricCard
            label="Pending"
            value={String(approvals.filter((item: ApiRecord) => item.status === "pending").length)}
            description="Needs review"
          />
          <MetricCard
            label="Approved"
            value={String(approvals.filter((item: ApiRecord) => item.status === "approved").length)}
            description="Approved applications"
          />
          <MetricCard
            label="Rejected"
            value={String(approvals.filter((item: ApiRecord) => item.status === "rejected").length)}
            description="Rejected applications"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, contact person, or email..."
            className="min-h-11 flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold outline-none focus:border-[var(--color-brand-primary)]"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | "pending" | "approved" | "rejected")
            }
            className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black outline-none focus:border-[var(--color-brand-primary)]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            type="button"
            className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black"
          >
            More Filters
          </button>
        </div>

        <ResponsiveTable
          headers={["Application", "Owner", "City", "Submitted", "Status", "Risk", "Details"]}
        >
          {filteredApprovals.map((approval: ApiRecord) => (
            <tr key={approval.id} className="border-t border-[var(--app-border)]">
              <td className="px-3 py-4 align-top">
                <p className="font-black">{approval.title}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{approval.type}</p>
              </td>

              <td className="px-3 py-4 align-top">
                <p className="font-black">{approval.owner}</p>
              </td>

              <td className="px-3 py-4 align-top">{approval.city ?? "Not provided"}</td>

              <td className="px-3 py-4 align-top">
                <p className="font-black">{formatDateTime(approval.submittedAt)}</p>
              </td>

              <td className="px-3 py-4 align-top">
                <StatusBadge status={approval.status} />
                {approval.source === "event_approval" && approval.adminStatus === "approved" && approval.superAdminStatus === "pending" ? (
                  <p className="mt-1 text-[10px] font-black text-amber-500">Admin ✓ — Awaiting Super Admin</p>
                ) : null}
              </td>

              <td className="px-3 py-4 align-top">
                <span className="rounded bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black uppercase">{approval.riskLevel ?? "low"}</span>
              </td>
              <td className="px-3 py-4 align-top">
                <button
                  type="button"
                  onClick={() => setSelectedApproval(approval)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black transition hover:border-[var(--color-brand-primary)]/50"
                >
                  <FileText className="size-4" />
                  View Details
                </button>
              </td>
            </tr>
          ))}
          {!isLoading && !isKycLoading && !isEventApprovalLoading && !filteredApprovals.length ? <EmptyTableRow colSpan={7} message="No organizer approvals, KYC requests, or submitted event approvals found." /> : null}
        </ResponsiveTable>
      </div>

      {selectedApproval ? (
        selectedApproval.source === "event_approval" ? (
          <EventApprovalDetailsModal approval={selectedApproval} onClose={() => setSelectedApproval(null)} />
        ) : (
          <OrganizerKycDetailsModal
            approval={selectedApproval}
            onClose={() => setSelectedApproval(null)}
          />
        )
      ) : null}
    </Panel>
  );
}

function getApprovalOrganizerId(approval: ApiRecord) {
  return String(
    approval.organizerId ??
    approval.userId ??
    approval.details?.organizerId ??
    approval.details?.userId ??
    approval.details?.id ??
    approval.id ??
    "",
  );
}

function parseJsonValue(value: unknown, fallback: any[] = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function readSuperAdminToken() {
  if (typeof window === "undefined") return "";

  for (const key of superAdminSessionKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as ApiRecord;
      const token = parsed?.token ?? parsed?.state?.session?.token ?? parsed?.state?.token;
      if (token) return String(token);
    } catch {
      // Keep checking older session keys.
    }
  }

  return "";
}

function getDocumentFileName(document: ApiRecord) {
  const explicit = document.fileName ?? document.filename ?? document.name;
  if (explicit) return String(explicit);

  const rawUrl = document.url ?? document.fileUrl ?? document.path;
  if (!rawUrl) return "";

  try {
    const url = String(rawUrl);
    const pathname = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
    const fileName = pathname.split("/").filter(Boolean).pop();
    return fileName ? decodeURIComponent(fileName) : "";
  } catch {
    return String(rawUrl).split("?")[0].split("/").filter(Boolean).pop() ?? "";
  }
}

async function fetchDocumentBlob(kycDocument: ApiRecord): Promise<Blob> {
  const fileName = getDocumentFileName(kycDocument);
  const token = readSuperAdminToken();
  const rawUrl = String(kycDocument.url ?? "");

  if (rawUrl.startsWith("http")) {
    const response = await fetch(rawUrl);
    if (!response.ok) throw new Error(`Failed to fetch document: ${response.status}`);
    return response.blob();
  }

  const resolvedFileName = fileName || rawUrl.split("/").filter(Boolean).pop() || "";
  if (!resolvedFileName) throw new Error("This document does not include a downloadable file name.");
  if (!token) throw new Error("Super admin session expired. Please login again.");
  if (!platformApiBaseUrl) throw new Error("API base URL is not configured.");

  const endpoint = `${platformApiBaseUrl}/kyc/documents/${encodeURIComponent(resolvedFileName)}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Document request failed with status ${response.status}.`);
  return response.blob();
}

async function fetchKycDocumentBlobById(requestId: string | number, documentId: string | number): Promise<Blob> {
  const token = readSuperAdminToken();
  if (!token) throw new Error("Super admin session expired. Please login again.");
  if (!platformApiBaseUrl) throw new Error("API base URL is not configured.");

  const endpoint = `${platformApiBaseUrl}/kyc/requests/${requestId}/documents/${documentId}/download`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-buizz-role": "super-admin",
    },
  });
  if (!response.ok) throw new Error(`Document request failed with status ${response.status}.`);
  return response.blob();
}

async function openKycDocument(kycDocument: ApiRecord, mode: "preview" | "download") {
  const fileName = getDocumentFileName(kycDocument);
  const token = readSuperAdminToken();
  const rawUrl = String(kycDocument.url ?? "");

  // External URL (Cloudinary etc.) — starts with http
  if (rawUrl.startsWith("http")) {
    window.open(rawUrl, "_blank", "noopener,noreferrer");
    return;
  }

  // Local storage — url is a relative path (e.g. "pan/userId_pan_123.jpg") or just a filename
  // Resolve the filename from the relative path or explicit fileName field
  const resolvedFileName = fileName || rawUrl.split("/").filter(Boolean).pop() || "";

  if (!resolvedFileName) {
    throw new Error("This document does not include a downloadable file name.");
  }

  if (!token) {
    throw new Error("Super admin session expired. Please login again.");
  }

  if (!platformApiBaseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const endpoint = `${platformApiBaseUrl}/kyc/documents/${encodeURIComponent(resolvedFileName)}`;

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Document request failed with status ${response.status}.`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  if (mode === "preview") {
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return;
  }

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = resolvedFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
}

function EventApprovalDetailsModal({
  approval,
  onClose,
  onReviewed,
}: {
  approval: ApiRecord;
  onClose: () => void;
  onReviewed?: () => void;
}) {
  const [reviewEventApproval, { isLoading }] = useReviewEventApprovalMutation();
  const [publishEvent, { isLoading: isPublishing }] = usePublishEventMutation();
  const [actionMessage, setActionMessage] = useState("");
  const details = parseRecordValue(approval.details);
  const rawApproval = parseRecordValue(approval.rawApproval);
  const requestData = parseRecordValue(rawApproval.request_data ?? rawApproval.requestData ?? rawApproval.details);
  const venue = parseRecordValue(details.venue);
  const ticketTypes = normalizeRecordArray(details.ticketTypes ?? details.ticket_types ?? requestData.ticketTypes);
  const tags = normalizeTextList(details.tags ?? requestData.tags);
  const termsDetails = parseUnknownJson(
    details.termsConditions ??
      details.terms_conditions ??
      details.policies ??
      details.policy ??
      requestData.termsConditions ??
      requestData.terms_conditions,
  );
  const mediaImages = normalizeImageList(
    details.banner,
    approval.banner,
    details.images,
    approval.images,
    details.galleryImages,
    details.eventImages,
    details.media,
  );
  const currentStatus = String(approval.status ?? "pending").toLowerCase();
  const superAdminStatus = String(approval.superAdminStatus ?? "pending").toLowerCase();

  const review = async (status: "approved" | "rejected", publishAfterApproval = false) => {
    const comments =
      status === "rejected"
        ? window.prompt("Enter rejection reason for this event approval:")
        : "Approved by Super Admin.";

    if (status === "rejected" && !comments?.trim()) {
      setActionMessage("Rejection reason is required.");
      return;
    }

    try {
      const response = await reviewEventApproval({
        id: approval.id,
        status,
        comments: comments?.trim() || undefined,
      }).unwrap();

      const approvedEventId = Number(
        response?.data?.event?.id ??
          response?.data?.event?.event_id ??
          details.id ??
          details.eventId ??
          details.event_id ??
          rawApproval.event_id,
      );

      if (status === "approved" && publishAfterApproval && Number.isFinite(approvedEventId)) {
        await publishEvent({ id: approvedEventId, role: "super_admin" }).unwrap();
      }

      setActionMessage(
        status === "approved" && publishAfterApproval
          ? "Event approved and published successfully."
          : status === "approved"
            ? "Super Admin approval saved. Organizer can now publish this event."
            : "Event approval request rejected.",
      );
      onReviewed?.();
    } catch (error: any) {
      setActionMessage(error?.data?.message ?? "Unable to update event approval. Please check your Super Admin session.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-2xl sm:rounded-md sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">Submitted Event Approval</p>
            <h2 className="mt-1 break-words text-2xl font-black">{approval.title ?? details.title ?? "Organizer Event"}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
              Request #{approval.id} by {approval.owner ?? "Organizer"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[var(--app-border)] px-4 text-sm font-black">
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black">Uploaded Event Images</p>
              <span className="rounded bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black uppercase text-[var(--app-muted)]">
                {mediaImages.length} image{mediaImages.length === 1 ? "" : "s"}
              </span>
            </div>
            {mediaImages.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mediaImages.map((imageUrl, index) => (
                  <a
                    key={`${imageUrl}-${index}`}
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)]"
                  >
                    <img
                      src={imageUrl}
                      alt={`${approval.title ?? details.title ?? "Event"} image ${index + 1}`}
                      className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-black text-[var(--app-muted)]">
                No uploaded event images found in this approval request.
              </p>
            )}
          </section>

          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-sm font-black">Approval Request</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailTile label="Request ID" value={approval.id ?? rawApproval.id} />
              <DetailTile label="Approval Status" value={approval.status ?? "pending"} />
              <DetailTile label="Admin Status" value={approval.adminStatus ?? rawApproval.admin_status ?? "pending"} />
              <DetailTile label="Super Admin Status" value={approval.superAdminStatus ?? rawApproval.super_admin_status ?? "pending"} />
              <DetailTile label="Action Type" value={approval.actionType ?? rawApproval.action_type ?? "create"} />
              <DetailTile label="Submitted" value={formatDateTime(approval.submittedAt ?? rawApproval.requested_at ?? rawApproval.created_at)} />
              <DetailTile label="Organizer ID" value={approval.organizerId ?? rawApproval.organizer_id ?? details.organizerId} />
              <DetailTile label="Organizer Name" value={approval.owner ?? rawApproval.organizer_name} />
              <DetailTile label="Organizer Email" value={approval.organizerEmail ?? rawApproval.organizer_email} />
              <DetailTile label="Rejection Reason" value={approval.rejectionReason ?? rawApproval.rejection_reason} />
            </div>
          </section>

          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-sm font-black">Event Identity</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailTile label="Event ID" value={details.id ?? details.eventId ?? details.event_id ?? rawApproval.event_id} />
              <DetailTile label="Title" value={details.title ?? approval.title} />
              <DetailTile label="Subtitle" value={details.subtitle ?? details.tagline} />
              <DetailTile label="Category" value={details.customCategory ?? details.categoryLabel ?? details.category} />
              <DetailTile label="Category Slug" value={details.categorySlug ?? details.category_slug ?? details.category} />
              <DetailTile label="Event Type" value={details.customType ?? details.typeLabel ?? details.type} />
              <DetailTile label="Event Type Slug" value={details.typeSlug ?? details.type_slug ?? details.type} />
              <DetailTile label="Language" value={details.language} />
              <DetailTile label="Age Restriction" value={details.ageRestriction ?? details.age_restriction} />
              <DetailTile label="Duration" value={details.duration} />
              <DetailTile label="Tags" value={tags.length ? tags.join(", ") : undefined} />
              <DetailTile label="Event Status" value={details.status ?? rawApproval.event_status} />
            </div>
          </section>

          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-sm font-black">Schedule & Capacity</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailTile label="Start Date" value={formatDateTime(details.startDate ?? details.start_date)} />
              <DetailTile label="End Date" value={formatDateTime(details.endDate ?? details.end_date)} />
              <DetailTile label="Total Seats" value={details.totalSeats ?? details.total_seats} />
              <DetailTile label="Available Seats" value={details.availableSeats ?? details.available_seats} />
              <DetailTile label="Is Free Event" value={details.isFree ?? details.is_free} />
              <DetailTile label="Online Link" value={details.onlineLink ?? details.online_link ?? details.streamUrl} />
            </div>
          </section>

          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-sm font-black">Description</p>
            <p className="mt-2 break-words text-sm font-semibold text-[var(--app-muted)]">{details.description ?? "Not provided"}</p>
          </section>

          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-sm font-black">Venue</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <DetailTile label="Venue Name" value={venue.name ?? "Not provided"} />
              <DetailTile label="Address" value={venue.address ?? "Not provided"} />
              <DetailTile label="City" value={venue.city ?? approval.city} />
              <DetailTile label="State" value={venue.state ?? "Not provided"} />
              <DetailTile label="Country" value={venue.country ?? "Not provided"} />
              <DetailTile label="Postal Code" value={venue.postalCode ?? venue.postal_code ?? venue.pincode} />
              <DetailTile label="Latitude" value={venue.latitude ?? venue.lat} />
              <DetailTile label="Longitude" value={venue.longitude ?? venue.lng} />
            </div>
          </section>

          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-sm font-black">Ticket Types</p>
            <div className="mt-3 grid gap-2">
              {ticketTypes.map((ticket: ApiRecord, index: number) => (
                <div key={`${ticket.name ?? "ticket"}-${index}`} className="grid gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 md:grid-cols-2 xl:grid-cols-4">
                  <DetailTile label="Name" value={ticket.name ?? `Ticket ${index + 1}`} />
                  <DetailTile label="Price" value={formatPlatformCurrency(Number(ticket.price ?? 0))} />
                  <DetailTile label="Quantity" value={ticket.quantity ?? ticket.totalSeats ?? ticket.total_seats} />
                  <DetailTile label="Available" value={ticket.availableQuantity ?? ticket.available_quantity ?? ticket.availableSeats} />
                  <DetailTile label="Description" value={ticket.description} />
                  <DetailTile label="Sale Starts" value={formatDateTime(ticket.saleStartDate ?? ticket.sale_start_date)} />
                  <DetailTile label="Sale Ends" value={formatDateTime(ticket.saleEndDate ?? ticket.sale_end_date)} />
                  <DetailTile label="Active" value={ticket.isActive ?? ticket.is_active} />
                </div>
              ))}
              {!ticketTypes.length ? <p className="text-sm font-black text-[var(--app-muted)]">No ticket types found in this approval request.</p> : null}
            </div>
          </section>

          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-sm font-black">Policies & Terms</p>
            <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-xs font-semibold text-[var(--app-muted)]">
              {formatReviewJson(termsDetails)}
            </pre>
          </section>

          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-sm font-black">Submitted Payload</p>
            <details className="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
              <summary className="cursor-pointer text-xs font-black uppercase text-[var(--color-brand-primary)]">View organizer submitted event JSON</summary>
              <pre className="mt-3 max-h-80 overflow-auto text-xs font-semibold text-[var(--app-muted)]">
                {formatReviewJson(details)}
              </pre>
            </details>
            <details className="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
              <summary className="cursor-pointer text-xs font-black uppercase text-[var(--color-brand-primary)]">View full approval request JSON</summary>
              <pre className="mt-3 max-h-80 overflow-auto text-xs font-semibold text-[var(--app-muted)]">
                {formatReviewJson(rawApproval)}
              </pre>
            </details>
          </section>

          <div className="flex flex-col gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black">Super Admin Review</p>
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                Super Admin approval updates the event to Approved. Organizer can publish it, or Super Admin can approve and publish directly.
              </p>
              {actionMessage ? <p className="mt-2 text-xs font-black text-[var(--color-brand-primary)]">{actionMessage}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isLoading || currentStatus === "approved" || superAdminStatus === "approved"}
                onClick={() => review("approved")}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#16A34A] px-4 text-xs font-black !text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                Approve Event
              </button>
              <button
                type="button"
                disabled={isLoading || isPublishing || currentStatus === "approved" || superAdminStatus === "approved"}
                onClick={() => review("approved", true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#2563EB] px-4 text-xs font-black !text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                Approve & Publish
              </button>
              <button
                type="button"
                disabled={isLoading || currentStatus === "rejected"}
                onClick={() => review("rejected")}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--app-border)] px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function OrganizerKycDetailsModal({ approval, onClose }: { approval: ApiRecord; onClose: () => void }) {
  const organizerId = getApprovalOrganizerId(approval);
  const [reviewKycRequest, { isLoading: isReviewing }] = useReviewKycRequestMutation();
  const [actionMessage, setActionMessage] = useState("");
  const kyc = approval.kycRequest;
  const documents = parseJsonValue(kyc?.documents);
  const bankDocuments = parseJsonValue(kyc?.bank_documents);
  const requestId = kyc?.id;
  const currentStatus = String(kyc?.status ?? approval.status ?? "").toLowerCase();
  const displayKycStatus = getKycUserStatus(kyc, approval.status);
  const displayBankStatus = getKycBankStatus(kyc);

  const review = async (status: "verified" | "rejected") => {
    if (!requestId) {
      setActionMessage("KYC request ID is not available for this organizer.");
      return;
    }

    const rejectionReason =
      status === "rejected"
        ? window.prompt("Enter account rejection reason. Organizer will see this reason:")
        : "";

    if (status === "rejected" && !rejectionReason?.trim()) {
      setActionMessage("Rejection reason is required.");
      return;
    }

    try {
      await reviewKycRequest({
        requestId,
        status,
        bankStatus: status,
        rejectionReason: rejectionReason?.trim() || undefined,
        reviewNotes: status === "verified" ? "Verified by Super Admin." : "Rejected by Super Admin.",
      }).unwrap();

      try {
        const { getPrimaryOrganizerApplication, saveOrganizerApplication } = await import("@/features/integration");
        const app = getPrimaryOrganizerApplication();
        if (app) {
          const reviewedAt = new Date().toISOString();
          saveOrganizerApplication({
            ...app,
            status: status === "verified" ? "approved" : "rejected",
            organizerStatus: status === "verified" ? "approved" : "rejected",
            adminApprovalStatus: status === "verified" ? "approved" : "rejected",
            superAdminApprovalStatus: status === "verified" ? "approved" : "rejected",
            accessStatus: status === "verified" ? "unlocked" : "locked",
            reviewedAt,
            reviewedBy: "Super Admin",
            reviewedRole: "super-admin",
            rejectionReason: status === "rejected" ? rejectionReason?.trim() : undefined,
          });
          window.dispatchEvent(new Event("buizz-organizer-approval-updated"));
        }
      } catch {
        // Non-critical: localStorage sync failed, organizer will see update on next login
      }

      setActionMessage(status === "verified" ? "Organizer account approved successfully." : "Organizer account rejected with reason.");
    } catch (reviewError: any) {
      setActionMessage(reviewError?.data?.message ?? "Unable to update KYC review. Please check your super admin session.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-2xl sm:rounded-md sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">Organizer Verification Details</p>
            <h2 className="mt-1 break-words text-2xl font-black">{approval.title ?? approval.owner ?? "Organizer"}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">Organizer ID: {organizerId || "Not available"}</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[var(--app-border)] px-4 text-sm font-black">
            Close
          </button>
        </div>

        {!kyc ? <p className="mt-4 rounded-md bg-[var(--color-brand-primary)]/10 p-4 text-sm font-black text-[var(--color-brand-primary)]">KYC details not available for this organizer.</p> : null}

        {kyc ? (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailTile label="KYC Status" value={displayKycStatus} />
              <DetailTile label="Bank Status" value={displayBankStatus} />
              <DetailTile label="Request Status" value={normalizeKycStatus(kyc?.status ?? approval.status)} />
              <DetailTile label="Legal Name" value={kyc?.legal_name ?? approval.owner ?? "Not provided"} />
              <DetailTile label="Business Name" value={kyc?.business_name ?? approval.title ?? "Not provided"} />
              <DetailTile label="PAN" value={kyc?.pan_number ?? "Not provided"} />
              <DetailTile label="GST" value={kyc?.gst_number ?? "Not provided"} />
              <DetailTile label="Aadhaar Last 4" value={kyc?.aadhaar_last4 ?? "Not provided"} />
              <DetailTile label="City" value={kyc?.city ?? approval.city ?? "Not provided"} />
              <DetailTile label="State" value={kyc?.state ?? "Not provided"} />
              <DetailTile label="Pincode" value={kyc?.pincode ?? "Not provided"} />
              <DetailTile label="Bank Name" value={kyc?.bank_name ?? "Not provided"} />
              <DetailTile label="Account Holder" value={kyc?.account_holder_name ?? "Not provided"} />
            </div>

            <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <p className="text-sm font-black">Registered Address</p>
              <p className="mt-2 break-words text-sm font-semibold text-[var(--app-muted)]">{kyc?.address_line ?? "Not provided"}</p>
            </section>

            <DocumentList title="KYC Documents" documents={documents} onMessage={setActionMessage} requestId={requestId} documentOffset={0} />
            <DocumentList title="Bank Documents" documents={bankDocuments} onMessage={setActionMessage} requestId={requestId} documentOffset={documents.length} />

            <div className="flex flex-col gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black">Account Approval Action</p>
                <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                  Approve or reject this organizer account. Rejected organizers can see the reason and resubmit updated details.
                </p>
                {actionMessage ? <p className="mt-2 text-xs font-black text-[var(--color-brand-primary)]">{actionMessage}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isReviewing || !requestId || currentStatus === "verified" || currentStatus === "approved"}
                  onClick={() => review("verified")}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#16A34A] px-4 text-xs font-black !text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4" />
                  Approve Account
                </button>
                <button
                  type="button"
                  disabled={isReviewing || !requestId || currentStatus === "rejected"}
                  onClick={() => review("rejected")}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--app-border)] px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject Account
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-black">{formatReviewValue(value)}</p>
    </div>
  );
}

function DocumentList({ title, documents, onMessage, requestId, documentOffset = 0 }: { title: string; documents: ApiRecord[]; onMessage: (message: string) => void; requestId?: string | number; documentOffset?: number }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState("");
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url.split("?")[0]);

  const handleDocument = async (document: ApiRecord, mode: "preview" | "download", index: number) => {
    try {
      onMessage("");
      const rawUrl = String(document.url ?? "");

      // External image — show inline preview directly
      if (!requestId && rawUrl.startsWith("http") && mode === "preview" && isImageUrl(rawUrl)) {
        setPreviewMimeType("image");
        setPreviewUrl(rawUrl);
        return;
      }

      setLoadingIndex(index);

      if (requestId) {
        const blob = await fetchKycDocumentBlobById(requestId, documentOffset + index);
        const objectUrl = URL.createObjectURL(blob);
        if (mode === "preview") {
          setPreviewMimeType(blob.type || (getDocumentFileName(document).toLowerCase().endsWith(".pdf") ? "application/pdf" : "image"));
          setPreviewUrl(objectUrl);
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
        } else {
          const fileName = getDocumentFileName(document) || "kyc-document";
          const link = window.document.createElement("a");
          link.href = objectUrl;
          link.download = fileName;
          window.document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
        }
      } else {
        const blob = await fetchDocumentBlob(document);
        const objectUrl = URL.createObjectURL(blob);
        if (mode === "preview") {
          setPreviewMimeType(blob.type || (getDocumentFileName(document).toLowerCase().endsWith(".pdf") ? "application/pdf" : "image"));
          setPreviewUrl(objectUrl);
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
        } else {
          const fileName = getDocumentFileName(document) || "kyc-document";
          const link = window.document.createElement("a");
          link.href = objectUrl;
          link.download = fileName;
          window.document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
        }
      }

      setLoadingIndex(null);
    } catch (error: any) {
      setLoadingIndex(null);
      onMessage(error?.message ?? "Unable to open this KYC document.");
    }
  };

  return (
    <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <p className="text-sm font-black">{title}</p>
      <div className="mt-3 grid gap-2">
        {documents.map((document, index) => {
          const rawUrl = String(document.url ?? "");
          const isExternal = rawUrl.startsWith("http");
          const isImage = isExternal && isImageUrl(rawUrl);

          return (
            <div key={`${title}-${document.type ?? index}`} className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black capitalize">{String(document.type ?? `Document ${index + 1}`).replace(/_/g, " ")}</p>
                  <p className="mt-1 break-all text-xs font-semibold text-[var(--app-muted)]">{document.fileName ?? (rawUrl ? rawUrl.split("/").pop() : "No file")}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loadingIndex === index}
                    onClick={() => handleDocument(document, "preview", index)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--app-border)] px-3 text-xs font-black disabled:opacity-50"
                  >
                    <Eye className="size-4" />
                    {loadingIndex === index ? "Loading..." : "Preview"}
                  </button>
                  <button
                    type="button"
                    disabled={loadingIndex === index}
                    onClick={() => handleDocument(document, "download", index)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[var(--color-brand-primary)] px-3 text-xs font-black !text-white disabled:opacity-50"
                  >
                    <Download className="size-4" />
                    Download
                  </button>
                </div>
              </div>

              {/* Inline image thumbnail for external image URLs */}
              {isImage ? (
                <div className="mt-3 overflow-hidden rounded-md border border-[var(--app-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rawUrl}
                    alt={String(document.type ?? "KYC document")}
                    className="max-h-48 w-full object-contain bg-[var(--app-subtle)]"
                    loading="lazy"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        {!documents.length ? <p className="rounded-md border border-dashed border-[var(--app-border)] p-4 text-sm font-bold text-[var(--app-muted)]">No documents found.</p> : null}
      </div>

      {/* Full-screen image preview modal */}
      {previewUrl ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-auto" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              ✕
            </button>
            {previewMimeType.includes("pdf") ? (
              <iframe src={previewUrl} title="KYC document preview" className="h-[85vh] w-[min(90vw,900px)] rounded-md bg-white" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="KYC document preview"
                className="max-h-[85vh] w-auto rounded-md object-contain"
              />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}


function AdminsPanel() {
  const { data: adminsData, isLoading } = useGetAdminUsersQuery({ page: 1, limit: 100 });
  const admins = adminsData?.data ?? [];

  return (
    <Panel title="Admin Management" description="Manage admin accounts and active status.">
      <div className="grid gap-3 lg:grid-cols-3">
        {admins.map((admin: ApiRecord) => (
          <article key={admin.id} className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-lg font-black">{admin.name}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{admin.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded border border-[var(--app-border)] px-2 py-1 text-[10px] font-black text-[var(--app-muted)]">{admin.role}</span>
              <span className={`rounded px-2 py-1 text-[10px] font-black text-white ${admin.status === "active" ? "bg-[#22C55E]" : "bg-[var(--app-muted)]"}`}>{admin.status ?? "unknown"}</span>
            </div>
          </article>
        ))}
        {!isLoading && !admins.length ? <EmptyState message="No admin accounts found." /> : null}
      </div>
    </Panel>
  );
}

function OrganizersPanel() {
  const { data: organizersData, isLoading } = useGetOrganizersQuery({ page: 1, limit: 100 });
  const organizers = organizersData?.data ?? [];

  return (
    <Panel title="Organizer Management" description="View and manage organizer accounts and their status.">
      <ResponsiveTable headers={["Name", "Email", "Phone", "City", "Status", "KYC Status"]}>
        {organizers.map((organizer: ApiRecord) => (
          <tr key={organizer.id} className="border-t border-[var(--app-border)]">
            <td className="px-3 py-3 font-black">{organizer.name ?? organizer.owner ?? organizer.title}</td>
            <td className="px-3 py-3">{organizer.email}</td>
            <td className="px-3 py-3">{organizer.phone || "—"}</td>
            <td className="px-3 py-3">{organizer.city || "—"}</td>
            <td className="px-3 py-3"><StatusBadge status={getOrganizerAccountStatus(organizer)} /></td>
            <td className="px-3 py-3"><StatusBadge status={normalizeKycStatus(organizer.kycStatus ?? organizer.kyc_status ?? organizer.user_kyc_status ?? organizer.status)} /></td>
          </tr>
        ))}
        {!isLoading && !organizers.length ? <EmptyTableRow colSpan={6} message="No organizers found." /> : null}
      </ResponsiveTable>
    </Panel>
  );
}

function PermissionsPanel() {
  const { data: adminsData } = useGetAdminUsersQuery({ page: 1, limit: 100 });
  const { data: organizersData } = useGetOrganizersQuery({ page: 1, limit: 100 });
  const { data: permissionsData } = useGetPermissionsQuery();
  const { data: groupsData } = useGetGroupsQuery();
  
  const admins = adminsData?.data ?? [];
  const organizers = organizersData?.data ?? [];
  const permissions = permissionsData?.data ?? [];
  const groups = groupsData?.data ?? [];

  return (
    <div className="grid gap-5">
      <Panel title="Admin Permissions" description="Permission toggles for backend-provided admin accounts.">
        <div className="grid gap-3">
          {admins.map((admin: ApiRecord) => <AdminPermissionCard key={admin.id} admin={admin} backendPermissions={permissions} />)}
          {!admins.length ? <EmptyState message="No admin accounts found for permissions." /> : null}
        </div>
      </Panel>
      <Panel title="Organizer Permissions" description="Permission toggles for backend-provided organizer accounts.">
        <div className="grid gap-3">
          {organizers.map((organizer: ApiRecord) => <OrganizerPermissionCard key={organizer.id} organizer={organizer} backendPermissions={permissions} />)}
          {!organizers.length ? <EmptyState message="No organizer accounts found for permissions." /> : null}
        </div>
      </Panel>
      <Panel title="Available Permissions" description="All permissions available in the system grouped by module.">
        <div className="grid gap-3">
          {permissions.length > 0 ? (
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <p className="text-sm font-black">Total Permissions: {permissions.length}</p>
              <div className="mt-3 grid gap-2">
                {permissions.map((perm: ApiRecord) => (
                  <div key={perm.permission_id} className="flex items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
                    <span className="rounded bg-[var(--color-brand-primary)]/10 px-2 py-1 text-[10px] font-black text-[var(--color-brand-primary)]">{perm.module}</span>
                    <p className="font-black">{perm.name}</p>
                    <p className="text-xs font-semibold text-[var(--app-muted)]">{perm.description || "No description"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No permissions found in the system." />
          )}
        </div>
      </Panel>
      <Panel title="User Groups" description="User groups for permission management.">
        <div className="grid gap-3">
          {groups.length > 0 ? (
            groups.map((group: ApiRecord) => (
              <div key={group.group_id} className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                <p className="font-black">{group.name}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{group.description || "No description"}</p>
                <p className="mt-2 text-xs font-black text-[var(--color-brand-primary)]">{group.member_count || 0} members</p>
              </div>
            ))
          ) : (
            <EmptyState message="No user groups found." />
          )}
        </div>
      </Panel>
    </div>
  );
}

function AdminPermissionCard({ admin, backendPermissions }: { admin: ApiRecord; backendPermissions?: ApiRecord[] }) {
  const permissions = usePermissionStore((state) => state.adminPermissions[admin.id]);
  const togglePermission = usePermissionStore((state) => state.toggleAdminPermission);

  return (
    <PermissionCard title={admin.name} subtitle={admin.email}>
      {adminPermissionKeys.map((key) => (
        <PermissionSwitch key={key} label={adminPermissionLabels[key]} checked={Boolean(permissions?.[key])} onToggle={() => togglePermission(admin.id, key as AdminPermissionKey)} />
      ))}
    </PermissionCard>
  );
}

function OrganizerPermissionCard({ organizer, backendPermissions }: { organizer: ApiRecord; backendPermissions?: ApiRecord[] }) {
  const permissions = usePermissionStore((state) => state.organizerPermissions[organizer.id]);
  const togglePermission = usePermissionStore((state) => state.toggleOrganizerPermission);

  return (
    <PermissionCard title={organizer.organizationName ?? organizer.name ?? "Organizer"} subtitle={`${organizer.contactPerson ?? organizer.email ?? ""} ${organizer.city ? `- ${organizer.city}` : ""}`}>
      {organizerPermissionKeys.map((key) => (
        <PermissionSwitch key={key} label={organizerPermissionLabels[key]} checked={Boolean(permissions?.[key])} onToggle={() => togglePermission(organizer.id, key as OrganizerPermissionKey)} />
      ))}
    </PermissionCard>
  );
}

function UsersPanel() {
  const { data: usersData, isLoading } = useGetPlatformUsersQuery({ page: 1, limit: 100, role: "customer" });
  const users = usersData?.data ?? [];

  return (
    <Panel title="User Management" description="Customer account monitoring from backend user records.">
      <ResponsiveTable headers={["ID", "Name", "Phone", "City", "Tickets", "Status"]}>
        {users.map((user: ApiRecord) => (
          <tr key={user.id} className="border-t border-[var(--app-border)]">
            <td className="px-3 py-3 font-black">{user.displayId ?? user.display_id ?? user.id}</td>
            <td className="px-3 py-3 font-black">{user.name}<p className="text-xs font-semibold text-[var(--app-muted)]">{user.email}</p></td>
            <td className="px-3 py-3">{user.phone ?? "Not provided"}</td>
            <td className="px-3 py-3">{user.city ?? "Not provided"}</td>
            <td className="px-3 py-3">{user.tickets ?? 0}</td>
            <td className="px-3 py-3"><span className="rounded bg-[var(--app-subtle)] px-2 py-1 text-[10px] font-black">{user.status ?? "unknown"}</span></td>
          </tr>
        ))}
        {!isLoading && !users.length ? <EmptyTableRow colSpan={6} message="No customers found." /> : null}
      </ResponsiveTable>
    </Panel>
  );
}

function EventsPanel() {
  const { data: eventApprovalData, isLoading, refetch: refetchApprovals } = useGetApprovalQueueQuery({ page: 1, limit: 100 });
  const { data: eventsData, isLoading: isEventsLoading, refetch: refetchEvents } = useGetDraftEventsQuery();
  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();
  const [publishEvent, { isLoading: isPublishing }] = usePublishEventMutation();
  const [actionMessage, setActionMessage] = useState("");
  const [selectedApproval, setSelectedApproval] = useState<ApiRecord | null>(null);
  const [quickCreate, setQuickCreate] = useState({
    title: "",
    description: "",
    category: "Music Events",
    type: "offline",
    startDate: "",
    endDate: "",
    venueName: "",
    city: "",
    state: "",
    ticketName: "General",
    ticketPrice: "0",
    totalSeats: "100",
  });
  const approvalRows = getApiRows(eventApprovalData).map(normalizeEventApprovalRow);
  const events = Array.isArray(eventsData?.data)
    ? eventsData.data
    : eventsData?.data?.events ?? [];

  const updateQuickCreate = (field: keyof typeof quickCreate, value: string) => {
    setQuickCreate((current) => ({ ...current, [field]: value }));
  };

  const submitQuickCreate = async () => {
    setActionMessage("");

    if (!quickCreate.title.trim() || !quickCreate.description.trim() || !quickCreate.startDate || !quickCreate.endDate) {
      setActionMessage("Title, description, start date, and end date are required.");
      return;
    }

    try {
      await createEvent({
        role: "super_admin",
        title: quickCreate.title.trim(),
        description: quickCreate.description.trim(),
        category: quickCreate.category.trim() || "Event",
        type: quickCreate.type as "online" | "offline" | "hybrid",
        startDate: new Date(quickCreate.startDate).toISOString(),
        endDate: new Date(quickCreate.endDate).toISOString(),
        venue: {
          name: quickCreate.venueName.trim() || "Venue pending",
          address: quickCreate.venueName.trim() || "Address pending",
          city: quickCreate.city.trim() || "City pending",
          state: quickCreate.state.trim() || "State pending",
          country: "India",
        },
        ticketTypes: [
          {
            name: quickCreate.ticketName.trim() || "General",
            price: Number(quickCreate.ticketPrice || 0),
            quantity: Number(quickCreate.totalSeats || 0),
          },
        ],
        totalSeats: Number(quickCreate.totalSeats || 0),
      }).unwrap();

      setActionMessage("Super Admin event created and published.");
      setQuickCreate((current) => ({ ...current, title: "", description: "", startDate: "", endDate: "" }));
    } catch (error: any) {
      setActionMessage(error?.data?.message ?? "Unable to create event.");
    }
  };

  const editEvent = async (event: ApiRecord) => {
    const id = Number(event.id ?? event.event_id);
    if (!Number.isFinite(id)) {
      setActionMessage("Event ID is not available.");
      return;
    }

    const title = window.prompt("Update event title:", String(event.title ?? ""));
    if (title === null) return;

    const category = window.prompt("Update category:", String(event.category ?? "Event"));
    if (category === null) return;

    const status = window.prompt("Update status:", String(event.status ?? "published"));
    if (status === null) return;

    try {
      await updateEvent({
        id,
        role: "super_admin",
        data: {
          title: title.trim() || String(event.title ?? "Event"),
          category: category.trim() || String(event.category ?? "Event"),
          status: status.trim() as any,
        },
      }).unwrap();
      setActionMessage("Event updated by Super Admin.");
    } catch (error: any) {
      setActionMessage(error?.data?.message ?? "Unable to update event.");
    }
  };

  const publishSelectedEvent = async (event: ApiRecord) => {
    const id = Number(event.id ?? event.event_id);
    if (!Number.isFinite(id)) {
      setActionMessage("Event ID is not available.");
      return;
    }

    try {
      await publishEvent({ id, role: "super_admin" }).unwrap();
      setActionMessage("Event published by Super Admin.");
    } catch (error: any) {
      setActionMessage(error?.data?.message ?? "Unable to publish event.");
    }
  };

  const cancelEvent = async (event: ApiRecord) => {
    const id = Number(event.id ?? event.event_id);
    if (!Number.isFinite(id)) {
      setActionMessage("Event ID is not available.");
      return;
    }

    if (!window.confirm(`Cancel/delete "${event.title ?? "this event"}"?`)) return;

    try {
      await deleteEvent({ id, role: "super_admin" }).unwrap();
      setActionMessage("Event cancelled by Super Admin.");
    } catch (error: any) {
      setActionMessage(error?.data?.message ?? "Unable to cancel event.");
    }
  };

  return (
    <div className="grid gap-5">
      <Panel title="Event Approvals" description="Review organizer-submitted events awaiting Super Admin verification.">
        <ResponsiveTable headers={["Event", "Organizer", "City", "Submitted", "Admin", "Super Admin", "Status", "Details"]}>
          {approvalRows.map((event: ApiRecord) => (
            <tr key={event.id} className="border-t border-[var(--app-border)]">
              <td className="px-3 py-3 font-black">
                {event.title}
                <p className="text-xs font-semibold text-[var(--app-muted)]">{event.type}</p>
              </td>
              <td className="px-3 py-3">{event.owner ?? "Not assigned"}</td>
              <td className="px-3 py-3">{event.city ?? "Not provided"}</td>
              <td className="px-3 py-3">{formatDateTime(event.submittedAt)}</td>
              <td className="px-3 py-3"><StatusBadge status={event.adminStatus} /></td>
              <td className="px-3 py-3"><StatusBadge status={event.superAdminStatus} /></td>
              <td className="px-3 py-3"><StatusBadge status={event.status} /></td>
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedApproval(event)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black transition hover:border-[var(--color-brand-primary)]/50"
                >
                  <FileText className="size-4" />
                  View Details
                </button>
              </td>
            </tr>
          ))}
          {!isLoading && !approvalRows.length ? <EmptyTableRow colSpan={8} message="No submitted event approval requests found." /> : null}
        </ResponsiveTable>
        {selectedApproval ? (
          <EventApprovalDetailsModal
            approval={selectedApproval}
            onClose={() => setSelectedApproval(null)}
            onReviewed={() => {
              void refetchApprovals();
              void refetchEvents();
            }}
          />
        ) : null}
      </Panel>

      <Panel title="Super Admin Event CRUD" description="Create, update, publish, and cancel events directly as Super Admin.">
        {actionMessage ? <p className="mb-4 rounded-md bg-[var(--app-subtle)] p-3 text-xs font-black text-[var(--color-brand-primary)]">{actionMessage}</p> : null}

        <div className="grid gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 md:grid-cols-2 xl:grid-cols-4">
          <ControlInput label="Title" value={quickCreate.title} onChange={(value) => updateQuickCreate("title", value)} />
          <ControlInput label="Category" value={quickCreate.category} onChange={(value) => updateQuickCreate("category", value)} />
          <ControlInput label="Start Date" type="datetime-local" value={quickCreate.startDate} onChange={(value) => updateQuickCreate("startDate", value)} />
          <ControlInput label="End Date" type="datetime-local" value={quickCreate.endDate} onChange={(value) => updateQuickCreate("endDate", value)} />
          <ControlInput label="Venue" value={quickCreate.venueName} onChange={(value) => updateQuickCreate("venueName", value)} />
          <ControlInput label="City" value={quickCreate.city} onChange={(value) => updateQuickCreate("city", value)} />
          <ControlInput label="Ticket Price" type="number" value={quickCreate.ticketPrice} onChange={(value) => updateQuickCreate("ticketPrice", value)} />
          <ControlInput label="Total Seats" type="number" value={quickCreate.totalSeats} onChange={(value) => updateQuickCreate("totalSeats", value)} />
          <label className="grid gap-2 text-xs font-black text-[var(--app-muted)] md:col-span-2 xl:col-span-3">
            Description
            <textarea
              value={quickCreate.description}
              onChange={(event) => updateQuickCreate("description", event.target.value)}
              className="min-h-20 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 py-2 text-sm font-semibold text-[var(--app-foreground)]"
            />
          </label>
          <button
            type="button"
            disabled={isCreating}
            onClick={() => void submitQuickCreate()}
            className="self-end rounded-md bg-[var(--color-brand-primary)] px-4 py-3 text-xs font-black !text-white disabled:opacity-50"
          >
            Create Event
          </button>
        </div>

        <div className="mt-5">
          <ResponsiveTable headers={["Event", "Category", "City", "Date", "Status", "Actions"]}>
            {events.map((event: ApiRecord) => (
              <tr key={event.id ?? event.event_id} className="border-t border-[var(--app-border)]">
                <td className="px-3 py-3 font-black">
                  {event.title ?? "Untitled Event"}
                  <p className="text-xs font-semibold text-[var(--app-muted)]">#{event.id ?? event.event_id}</p>
                </td>
                <td className="px-3 py-3">{event.category ?? "Event"}</td>
                <td className="px-3 py-3">{event.venue?.city ?? event.venueCity ?? event.venue_city ?? "Not provided"}</td>
                <td className="px-3 py-3">{formatDateTime(event.startDate ?? event.start_date)}</td>
                <td className="px-3 py-3"><StatusBadge status={event.status} /></td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={isUpdating} onClick={() => void editEvent(event)} className="rounded-md border border-[var(--app-border)] px-3 py-2 text-[11px] font-black disabled:opacity-50">Edit</button>
                    <button type="button" disabled={isPublishing} onClick={() => void publishSelectedEvent(event)} className="rounded-md bg-[#16A34A] px-3 py-2 text-[11px] font-black !text-white disabled:opacity-50">Publish</button>
                    <button type="button" disabled={isDeleting} onClick={() => void cancelEvent(event)} className="rounded-md border border-[var(--app-border)] px-3 py-2 text-[11px] font-black disabled:opacity-50">Cancel</button>
                  </div>
                </td>
              </tr>
            ))}
            {!isEventsLoading && !events.length ? <EmptyTableRow colSpan={6} message="No events found." /> : null}
          </ResponsiveTable>
        </div>
      </Panel>
    </div>
  );
}

function BookingsPanel() {
  const { data: bookingsData, isLoading } = useGetAllBookingsQuery({ page: 1, limit: 100 });
  const bookings: ApiRecord[] = bookingsData?.data ?? [];

  return (
    <Panel title="All Bookings" description="User booking history across all events with payment status.">
      <ResponsiveTable headers={["Order ID", "User", "Event", "Tickets", "Amount", "Payment", "Booking Status"]}>
        {bookings.map((b: ApiRecord) => (
          <tr key={b.id ?? b.orderId} className="border-t border-[var(--app-border)]">
            <td className="px-3 py-3 font-black text-xs">{b.orderId ?? b.order_id ?? b.id}</td>
            <td className="px-3 py-3">
              <p className="font-black">{b.user?.name ?? b.userName ?? "—"}</p>
              <p className="text-xs text-[var(--app-muted)]">{b.user?.email ?? b.userEmail ?? ""}</p>
            </td>
            <td className="px-3 py-3">{b.event?.title ?? b.eventTitle ?? "—"}</td>
            <td className="px-3 py-3">{b.totalTickets ?? b.quantity ?? 0}</td>
            <td className="px-3 py-3">{formatPlatformCurrency(Number(b.amount ?? 0))}</td>
            <td className="px-3 py-3"><StatusBadge status={b.paymentStatus ?? b.payment_status} /></td>
            <td className="px-3 py-3"><StatusBadge status={b.status ?? b.bookingStatus} /></td>
          </tr>
        ))}
        {!isLoading && !bookings.length ? <EmptyTableRow colSpan={7} message="No bookings found." /> : null}
      </ResponsiveTable>
    </Panel>
  );
}

function PaymentsPanel() {
  const { data: paymentsData, isLoading } = useGetAllPaymentsQuery({ page: 1, limit: 100 });
  const payments: ApiRecord[] = paymentsData?.data ?? [];

  return (
    <Panel title="Payment History" description="All payment transactions with gateway, status, and amount details.">
      <ResponsiveTable headers={["Order ID", "Transaction ID", "User", "Event", "Amount", "Gateway", "Status", "Date"]}>
        {payments.map((p: ApiRecord) => (
          <tr key={p.payment_id ?? p.order_id} className="border-t border-[var(--app-border)]">
            <td className="px-3 py-3 font-black text-xs">{p.order_id ?? p.orderId}</td>
            <td className="px-3 py-3 text-xs text-[var(--app-muted)]">{p.transaction_id ?? p.transactionId ?? "—"}</td>
            <td className="px-3 py-3">{p.user_name ?? p.userName ?? p.user_id ?? "—"}</td>
            <td className="px-3 py-3">{p.event_title ?? p.eventTitle ?? "—"}</td>
            <td className="px-3 py-3 font-black">{formatPlatformCurrency(Number(p.amount ?? 0))}</td>
            <td className="px-3 py-3">
              <span className="rounded bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black uppercase">
                {p.payment_method ?? p.gateway ?? "—"}
              </span>
            </td>
            <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
            <td className="px-3 py-3 text-xs">{formatDateTime(p.created_at ?? p.createdAt)}</td>
          </tr>
        ))}
        {!isLoading && !payments.length ? <EmptyTableRow colSpan={8} message="No payment records found." /> : null}
      </ResponsiveTable>
    </Panel>
  );
}

function OrganizerRevenueModal({ organizer, onClose }: { organizer: ApiRecord; onClose: () => void }) {
  const grossRevenue = organizer.total_revenue || 0;
  const platformFeePercent = 0.08;
  const platformFee = grossRevenue * platformFeePercent;
  const netPayout = grossRevenue - platformFee;
  
  const money = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-2xl sm:rounded-md sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">Organizer Revenue Details</p>
            <h2 className="mt-1 break-words text-2xl font-black">{organizer.name}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{organizer.email}</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[var(--app-border)] px-4 text-sm font-black">
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Events"
              value={String(organizer.total_events || 0)}
              description="Active events"
            />
            <MetricCard
              label="Gross Revenue"
              value={money(grossRevenue)}
              description="Total collected"
            />
            <MetricCard
              label="Platform Fee (8%)"
              value={money(platformFee)}
              description="Deducted"
            />
            <MetricCard
              label="Net Payout"
              value={money(netPayout)}
              description="Settlement amount"
            />
          </div>

          <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <h3 className="mb-3 text-sm font-black">Settlement Summary</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Gross Revenue:</span>
                <span className="font-black">{money(grossRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Platform Fee (8%):</span>
                <span className="font-black text-[var(--color-brand-primary)]">-{money(platformFee)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--app-border)] pt-2">
                <span className="font-semibold">Net Settlement:</span>
                <span className="font-black text-[#22C55E]">{money(netPayout)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RevenuePanel() {
  const { data: organizersData, isLoading } = useGetOrganizersQuery({ page: 1, limit: 100 });
  const organizers = organizersData?.data ?? [];
  const [selectedOrganizer, setSelectedOrganizer] = useState<ApiRecord | null>(null);

  // Calculate platform-wide totals
  const totalGrossRevenue = organizers.reduce((sum: number, org: ApiRecord) => sum + (org.total_revenue || 0), 0);
  const platformFeePercent = 0.08; // 8% platform fee
  const totalPlatformFees = totalGrossRevenue * platformFeePercent;
  const totalNetRevenue = totalGrossRevenue - totalPlatformFees;

  const money = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

  return (
    <Panel title="Revenue Dashboard" description="Platform revenue and organizer settlements.">
      <div className="grid gap-4">
        {/* Platform-wide Revenue Summary */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Gross Revenue"
            value={money(totalGrossRevenue)}
            description="All organizers combined"
          />
          <MetricCard
            label="Platform Fees (8%)"
            value={money(totalPlatformFees)}
            description="Platform commission"
          />
          <MetricCard
            label="Net Settlements"
            value={money(totalNetRevenue)}
            description="Organizer payouts"
          />
          <MetricCard
            label="Active Organizers"
            value={String(organizers.length)}
            description="Revenue-generating accounts"
          />
        </div>

        {/* Organizer Revenue Table */}
        <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
          <h3 className="mb-4 text-lg font-black">Organizer Revenue Breakdown</h3>
          <ResponsiveTable
            headers={["Organizer", "Email", "Events", "Gross Revenue", "Platform Fee", "Net Payout", "Actions"]}
          >
            {organizers.map((organizer: ApiRecord) => {
              const grossRevenue = organizer.total_revenue || 0;
              const platformFee = grossRevenue * platformFeePercent;
              const netPayout = grossRevenue - platformFee;
              
              return (
                <tr key={organizer.user_id} className="border-t border-[var(--app-border)]">
                  <td className="px-3 py-4 align-top">
                    <p className="font-black">{organizer.name}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="text-sm font-semibold">{organizer.email}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-black">{organizer.total_events || 0}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-black">{money(grossRevenue)}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-black text-[var(--color-brand-primary)]">-{money(platformFee)}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-black text-[#22C55E]">{money(netPayout)}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <button
                      type="button"
                      onClick={() => setSelectedOrganizer(organizer)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black transition hover:border-[var(--color-brand-primary)]/50"
                    >
                      <Eye className="size-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
            {!isLoading && !organizers.length ? <EmptyTableRow colSpan={7} message="No organizers found." /> : null}
          </ResponsiveTable>
        </div>
      </div>

      {/* Organizer Details Modal */}
      {selectedOrganizer ? (
        <OrganizerRevenueModal
          organizer={selectedOrganizer}
          onClose={() => setSelectedOrganizer(null)}
        />
      ) : null}
    </Panel>
  );
}

function SettlementsPanel() {
  const { data: settlementsData, isLoading } = useGetAllBookingsQuery({ page: 1, limit: 100 });
  const settlements: ApiRecord[] = settlementsData?.data ?? [];
  const [selectedSettlement, setSelectedSettlement] = useState<ApiRecord | null>(null);

  const money = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

  // Calculate settlement summary
  const totalGross = settlements.reduce((sum: number, s: ApiRecord) => sum + (s.amount || 0), 0);
  const platformFeePercent = 0.08;
  const totalPlatformFees = totalGross * platformFeePercent;
  const totalNetSettlements = totalGross - totalPlatformFees;

  return (
    <Panel title="Settlements Management" description="Organizer payout settlements and payment processing.">
      <div className="grid gap-4">
        {/* Settlement Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Gross"
            value={money(totalGross)}
            description="All settlements"
          />
          <MetricCard
            label="Platform Fees"
            value={money(totalPlatformFees)}
            description="8% commission"
          />
          <MetricCard
            label="Net Payouts"
            value={money(totalNetSettlements)}
            description="Organizer payments"
          />
          <MetricCard
            label="Pending"
            value={String(settlements.filter((s: ApiRecord) => s.status === 'pending').length)}
            description="Awaiting processing"
          />
        </div>

        {/* Settlements Table */}
        <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
          <h3 className="mb-4 text-lg font-black">Settlement Records</h3>
          <ResponsiveTable
            headers={["Settlement ID", "Organizer", "Event", "Gross Amount", "Platform Fee", "Net Amount", "Status", "Actions"]}
          >
            {settlements.map((settlement: ApiRecord) => {
              const grossAmount = settlement.amount || 0;
              const platformFee = grossAmount * platformFeePercent;
              const netAmount = grossAmount - platformFee;
              
              return (
                <tr key={settlement.id} className="border-t border-[var(--app-border)]">
                  <td className="px-3 py-4 align-top">
                    <p className="font-black text-xs">{settlement.settlement_id || settlement.id}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-black">{settlement.organizer_name || settlement.organizerName || "—"}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="text-sm font-semibold">{settlement.event_title || settlement.eventTitle || "—"}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-black">{money(grossAmount)}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-black text-[var(--color-brand-primary)]">-{money(platformFee)}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-black text-[#22C55E]">{money(netAmount)}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <StatusBadge status={settlement.status || "pending"} />
                  </td>
                  <td className="px-3 py-4 align-top">
                    <button
                      type="button"
                      onClick={() => setSelectedSettlement(settlement)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black transition hover:border-[var(--color-brand-primary)]/50"
                    >
                      <Eye className="size-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
            {!isLoading && !settlements.length ? <EmptyTableRow colSpan={8} message="No settlements found." /> : null}
          </ResponsiveTable>
        </div>
      </div>

      {/* Settlement Details Modal */}
      {selectedSettlement ? (
        <SettlementDetailsModal
          settlement={selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
        />
      ) : null}
    </Panel>
  );
}

function SettlementDetailsModal({ settlement, onClose }: { settlement: ApiRecord; onClose: () => void }) {
  const grossAmount = settlement.amount || 0;
  const platformFeePercent = 0.08;
  const platformFee = grossAmount * platformFeePercent;
  const netAmount = grossAmount - platformFee;
  
  const money = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-2xl sm:rounded-md sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">Settlement Details</p>
            <h2 className="mt-1 break-words text-2xl font-black">{settlement.settlement_id || settlement.id}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{settlement.organizer_name || settlement.organizerName || "Organizer"}</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[var(--app-border)] px-4 text-sm font-black">
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Gross Amount"
              value={money(grossAmount)}
              description="Total collected"
            />
            <MetricCard
              label="Platform Fee (8%)"
              value={money(platformFee)}
              description="Deducted"
            />
            <MetricCard
              label="Net Settlement"
              value={money(netAmount)}
              description="Payout amount"
            />
            <MetricCard
              label="Status"
              value={settlement.status || "pending"}
              description="Current state"
            />
          </div>

          <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <h3 className="mb-3 text-sm font-black">Settlement Breakdown</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Gross Amount:</span>
                <span className="font-black">{money(grossAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Platform Fee (8%):</span>
                <span className="font-black text-[var(--color-brand-primary)]">-{money(platformFee)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--app-border)] pt-2">
                <span className="font-semibold">Net Settlement:</span>
                <span className="font-black text-[#22C55E]">{money(netAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReportsPanel() {
  return (
    <Panel title="Reports" description="Backend report generation will appear here when report endpoints are available.">
      <EmptyState message="No reports found." />
    </Panel>
  );
}

function SettingsPanel() {
  return (
    <Panel title="Settings" description="Frontend-only platform settings reserved for backend-backed configuration later.">
      <div className="grid gap-3 lg:grid-cols-2">
        <InfoBlock title="Approval Mode" description="Organizer events require Admin and Super Admin approval before going live." />
        <InfoBlock title="Payment Mode" description="Paid event tickets are generated only after handlePaymentSuccess()." />
        <InfoBlock title="Data Source" description="Dashboard records are loaded from the configured backend APIs." />
        <InfoBlock title="Backend Status" description="Reports and advanced settings require matching backend endpoints." />
      </div>
    </Panel>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.10)] sm:p-5">
      <div className="mb-5">
        <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">Super Admin</p>
        <h2 className="mt-1 text-2xl font-black leading-tight">{title}</h2>
        <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <article className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.10)]">
      <p className="text-xs font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{description}</p>
    </article>
  );
}

function PermissionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <article className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="truncate text-lg font-black">{title}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{subtitle}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
      </div>
    </article>
  );
}

function PermissionSwitch({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-left text-xs font-black transition hover:border-[var(--color-brand-primary)]/50">
      <span>{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#22C55E]" : "bg-[var(--app-muted)]"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition ${checked ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = String(status ?? "unknown").toLowerCase();
  const tone =
    normalized === "live" || normalized === "published" || normalized === "approved" || normalized === "active" || normalized === "verified"
      ? "bg-[#22C55E] text-white"
      : normalized === "rejected" || normalized === "blocked" || normalized === "cancelled"
        ? "bg-[var(--color-brand-primary)] text-white"
        : normalized === "draft"
          ? "bg-slate-400 text-white"
          : normalized === "processing"
            ? "bg-[#3B82F6] text-white"
            : normalized.includes("pending")
              ? "bg-[var(--color-brand-accent)] text-[var(--color-brand-ink)]"
              : "bg-[#3B82F6] text-white";

  return <span className={`rounded px-2 py-1 text-[10px] font-black uppercase ${tone}`}>{status ?? "unknown"}</span>;
}

function ResponsiveTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)]">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs font-black uppercase text-[var(--app-muted)]">
            {headers.map((header) => <th key={header} className="px-3 py-3">{header}</th>)}
          </tr>
        </thead>
        <tbody className="font-semibold text-[var(--app-foreground)]">{children}</tbody>
      </table>
    </div>
  );
}

function EmptyTableRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr className="border-t border-[var(--app-border)]">
      <td colSpan={colSpan} className="px-3 py-8 text-center text-sm font-black text-[var(--app-muted)]">
        {message}
      </td>
    </tr>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-6 text-center text-sm font-black text-[var(--app-muted)]">
      {message}
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (typeof date.toLocaleString !== 'function') return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <p className="text-lg font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">{description}</p>
    </div>
  );
}

function ControlInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-xs font-black text-[var(--app-muted)]">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none focus:border-[var(--color-brand-primary)]" />
    </label>
  );
}
