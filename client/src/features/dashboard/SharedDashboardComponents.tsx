"use client";

import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  DollarSign,
  Download,
  FileCheck2,
  FileText,
  HeadphonesIcon,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Loader2,
  Megaphone,
  PlusCircle,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import { BuizzLogo } from "@/components/brand/BuizzLogo";
import type { DashboardProfile } from "@/components/dashboard/ProfileCard";
import type { ApprovalStatus } from "@/types/buizz";
import type {
  AdminPermissionKey,
  OrganizerPermissionKey,
} from "@/store/permissionStore";

export type Role = "super-admin" | "admin" | "organizer";

export type Metric = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export type DashboardEventIdentity = {
  id?: string | number;
  eventId?: string | number;
  sourceEventId?: string | number;
  slug?: string;
  name?: string;
  title?: string;
  date?: string;
  startDate?: string;
  time?: string;
  startTime?: string;
  venueName?: string;
  venue?: string;
  city?: string;
  status?: string;
  source?: string;
  updatedAt?: string;
  submittedAt?: string;
  createdAt?: string;
};

export type NavItem = {
  label: string;
  href?: string;
  icon?: LucideIcon;
  permission?: AdminPermissionKey | OrganizerPermissionKey;
  groupLabel?: string;
  type?: "group" | "item";
};

export type TableColumn = {
  key: string;
  label: string;
  hideOnMobile?: boolean;
  isPrimary?: boolean;
};

export type TableRow = Record<string, ReactNode>;

export type AuditEntry = {
  id: string;
  action: string;
  actorName: string;
  actorRole: Role | string;
  note?: string;
  createdAt: string;
};

export type DashboardStorageResult<T> = {
  data: T;
  loadedFromStorage: boolean;
};

export type StatusTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "brand";

export const roleTitles: Record<Role, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  organizer: "Organizer",
};

export const roleSessionKey: Record<Role, string> = {
  "super-admin": "buizz-super-admin-session",
  admin: "buizz-admin-session",
  organizer: "buizz-organizer-session",
};

export const adminNav: NavItem[] = [
  { type: "group", label: "", groupLabel: "Overview" },
  {
    type: "item",
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },

  { type: "group", label: "", groupLabel: "Review Center" },
  {
    type: "item",
    label: "Organizer Review",
    href: "/admin/organizer-review",
    icon: Building2,
    permission: "approveOrganizers",
  },
  {
    type: "item",
    label: "Event Review",
    href: "/admin/event-review",
    icon: Calendar,
    permission: "approveEvents",
  },
  {
    type: "item",
    label: "Rating Review",
    href: "/admin/rating-review",
    icon: Star,
  },

  { type: "group", label: "", groupLabel: "Ticketing & Sales" },
  {
    type: "item",
    label: "Bookings",
    href: "/admin/bookings",
    icon: ClipboardCheck,
  },
  {
    type: "item",
    label: "Attendees",
    href: "/admin/attendees",
    icon: Users,
  },
  {
    type: "item",
    label: "Seat Maps",
    href: "/admin/seat-maps",
    icon: Landmark,
    permission: "canManageSeatMap",
  },

  { type: "group", label: "", groupLabel: "Management" },
  {
    type: "item",
    label: "Users",
    href: "/admin/users",
    icon: Users,
    permission: "manageUsers",
  },
  {
    type: "item",
    label: "Venues",
    href: "/admin/venues",
    icon: Landmark,
  },

  { type: "group", label: "", groupLabel: "Reports & Support" },
  {
    type: "item",
    label: "Reports",
    href: "/admin/reports",
    icon: FileText,
    permission: "viewReports",
  },
  {
    type: "item",
    label: "Support Tickets",
    href: "/admin/support",
    icon: HeadphonesIcon,
    permission: "viewSupportTickets",
  },

  { type: "group", label: "", groupLabel: "System" },
  {
    type: "item",
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    type: "item",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export const organizerNav: NavItem[] = [
  { type: "group", label: "", groupLabel: "Overview" },
  {
    type: "item",
    label: "Dashboard",
    href: "/organizer/dashboard",
    icon: LayoutDashboard,
  },

  { type: "group", label: "", groupLabel: "Event Management" },
  {
    type: "item",
    label: "My Events",
    href: "/organizer/my-events",
    icon: Calendar,
    permission: "editEvents",
  },
  {
    type: "item",
    label: "Create Event",
    href: "/organizer/create-event",
    icon: PlusCircle,
    permission: "createEvents",
  },
  {
    type: "item",
    label: "Seat Maps",
    href: "/organizer/seat-mapping",
    icon: Landmark,
    permission: "canManageSeatMap",
  },

  { type: "group", label: "", groupLabel: "Ticketing" },
  {
    type: "item",
    label: "Tickets & Pricing",
    href: "/organizer/tickets",
    icon: Ticket,
    permission: "viewBookings",
  },
  {
    type: "item",
    label: "Offline Booking",
    href: "/organizer/offline-booking",
    icon: Ticket,
    permission: "offlineBooking",
  },
  {
    type: "item",
    label: "Bookings",
    href: "/organizer/bookings",
    icon: ClipboardCheck,
    permission: "viewBookings",
  },
  {
    type: "item",
    label: "Attendees",
    href: "/organizer/attendees",
    icon: Users,
    permission: "manageAttendees",
  },
  {
    type: "item",
    label: "QR Check-in",
    href: "/organizer/qr-check-in",
    icon: QrCode,
    permission: "ticketScanner",
  },

  { type: "group", label: "", groupLabel: "Business" },
  {
    type: "item",
    label: "Revenue",
    href: "/organizer/revenue",
    icon: DollarSign,
    permission: "viewRevenue",
  },
  {
    type: "item",
    label: "Analytics",
    href: "/organizer/analytics",
    icon: BarChart3,
  },
  {
    type: "item",
    label: "Offers & Coupons",
    href: "/organizer/offers",
    icon: Megaphone,
    permission: "editEvents",
  },

  { type: "group", label: "", groupLabel: "Account" },
  {
    type: "item",
    label: "Settings",
    href: "/organizer/settings",
    icon: Settings,
  },
  {
    type: "item",
    label: "Support",
    href: "/organizer/support",
    icon: HeadphonesIcon,
  },
];

export const superAdminNav: NavItem[] = [
  { type: "group", label: "", groupLabel: "Overview" },
  {
    type: "item",
    label: "Dashboard",
    href: "/super-admin/dashboard",
    icon: LayoutDashboard,
  },

  { type: "group", label: "", groupLabel: "Review Center" },
  {
    type: "item",
    label: "Organizer Review",
    href: "/super-admin/organizer-review",
    icon: Building2,
  },
  {
    type: "item",
    label: "Event Review",
    href: "/super-admin/event-review",
    icon: Calendar,
  },
   {
    type: "item",
    label: "Rating Review",
    href: "/super-admin/rating-review",
    icon: Star,
  },

  { type: "group", label: "", groupLabel: "Ticketing & Sales" },
  {
    type: "item",
    label: "Ticket Designs",
    href: "/super-admin/ticket-designs",
    icon: Ticket,
  },
  {
    type: "item",
    label: "Bookings",
    href: "/super-admin/bookings",
    icon: ClipboardCheck,
  },
  {
    type: "item",
    label: "Attendees",
    href: "/super-admin/attendees",
    icon: Users,
  },
  {
    type: "item",
    label: "Seat Maps",
    href: "/super-admin/seat-maps",
    icon: Landmark,
  },

  { type: "group", label: "", groupLabel: "Management" },
  {
    type: "item",
    label: "Users",
    href: "/super-admin/users",
    icon: Users,
  },
  {
    type: "item",
    label: "Venues",
    href: "/super-admin/venues",
    icon: Landmark,
  },
  {
    type: "item",
    label: "Admin Management",
    href: "/super-admin/admins",
    icon: ShieldCheck,
  },
  {
    type: "item",
    label: "Permissions",
    href: "/super-admin/permissions",
    icon: KeyRound,
  },

  { type: "group", label: "", groupLabel: "Finance" },
  {
    type: "item",
    label: "Revenue",
    href: "/super-admin/revenue",
    icon: DollarSign,
  },
  {
    type: "item",
    label: "Settlements",
    href: "/super-admin/settlements",
    icon: CreditCard,
  },
  {
    type: "item",
    label: "Reports",
    href: "/super-admin/reports",
    icon: FileText,
  },

  { type: "group", label: "", groupLabel: "Support & System" },
  {
    type: "item",
    label: "Support Tickets",
    href: "/super-admin/support",
    icon: HeadphonesIcon,
  },
  {
    type: "item",
    label: "Notifications",
    href: "/super-admin/notifications",
    icon: Bell,
  },
  {
    type: "item",
    label: "History",
    href: "/super-admin/history",
    icon: Clock3,
  },
  {
    type: "item",
    label: "Settings",
    href: "/super-admin/settings",
    icon: Settings,
  },
];

export function getUnifiedEventKey(
  event: DashboardEventIdentity,
  index?: number,
) {
  return String(
    event.id ??
    event.eventId ??
    event.sourceEventId ??
    event.slug ??
    `${event.name ?? event.title ?? "event"}-${event.date ?? event.startDate ?? ""}-${event.time ?? event.startTime ?? ""}-${event.venueName ?? event.venue ?? ""}-${index ?? ""}`,
  );
}

export function getDashboardEventContentKey(event: DashboardEventIdentity) {
  const title = String(event.name ?? event.title ?? "")
    .trim()
    .toLowerCase();

  if (!title) return "";

  return [
    title,
    String(event.date ?? event.startDate ?? "")
      .trim()
      .toLowerCase(),
    String(event.time ?? event.startTime ?? "")
      .trim()
      .toLowerCase(),
    String(event.venueName ?? event.venue ?? "")
      .trim()
      .toLowerCase(),
    String(event.city ?? "")
      .trim()
      .toLowerCase(),
  ].join("|");
}

export function getDashboardEventTimestamp(event: DashboardEventIdentity) {
  const value = event.updatedAt ?? event.submittedAt ?? event.createdAt ?? "";
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

export function dedupeDashboardEvents<T extends DashboardEventIdentity>(
  events: T[],
) {
  const map = new Map<string, T>();

  events.forEach((event, index) => {
    const key =
      getDashboardEventContentKey(event) || getUnifiedEventKey(event, index);

    const existing = map.get(key);

    if (!existing) {
      map.set(key, event);
      return;
    }

    const existingTime = getDashboardEventTimestamp(existing);
    const currentTime = getDashboardEventTimestamp(event);
    const existingIsBackend = existing.source === "backend";
    const currentIsBackend = event.source === "backend";

    if (currentIsBackend && !existingIsBackend) {
      map.set(key, event);
      return;
    }

    if (currentTime >= existingTime && (!existingIsBackend || currentIsBackend)) {
      map.set(key, event);
    }
  });

  return Array.from(map.values());
}

export function upsertDashboardEvent<T extends DashboardEventIdentity>(
  events: T[],
  nextEvent: T,
) {
  const nextKey =
    getDashboardEventContentKey(nextEvent) || getUnifiedEventKey(nextEvent);

  const merged = events.map((event) => {
    const key = getDashboardEventContentKey(event) || getUnifiedEventKey(event);

    return key === nextKey ? nextEvent : event;
  });

  if (
    !merged.some(
      (event) =>
        (getDashboardEventContentKey(event) || getUnifiedEventKey(event)) ===
        nextKey,
    )
  ) {
    merged.unshift(nextEvent);
  }

  return dedupeDashboardEvents(merged);
}

export function parseDashboardMoney(value: unknown) {
  const next = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));

  return Number.isFinite(next) ? next : 0;
}

export function formatDashboardDateTime(date?: string, time?: string) {
  return (
    [date, time].filter(Boolean).join(time ? " at " : "") || "Schedule pending"
  );
}

export function formatDashboardCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function getRoleNav(role: Role) {
  if (role === "super-admin") return superAdminNav;
  if (role === "admin") return adminNav;

  return organizerNav;
}

export function createDashboardId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createAuditEntry({
  action,
  actorName = "Buizz Super Admin",
  actorRole = "super-admin",
  note,
}: {
  action: string;
  actorName?: string;
  actorRole?: Role | string;
  note?: string;
}): AuditEntry {
  return {
    id: createDashboardId("AUDIT"),
    action,
    actorName,
    actorRole,
    note,
    createdAt: new Date().toISOString(),
  };
}

export function readDashboardStorage<T>(
  key: string,
  fallback: T,
): DashboardStorageResult<T> {
  if (typeof window === "undefined") {
    return {
      data: fallback,
      loadedFromStorage: false,
    };
  }

  const saved = window.localStorage.getItem(key);

  if (!saved) {
    return {
      data: fallback,
      loadedFromStorage: false,
    };
  }

  try {
    return {
      data: JSON.parse(saved) as T,
      loadedFromStorage: true,
    };
  } catch {
    return {
      data: fallback,
      loadedFromStorage: false,
    };
  }
}

export function writeDashboardStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeDashboardStorage(key: string) {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(key);
}

export function normalizeDashboardQuery(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function dashboardTextIncludes(source: unknown, query: string) {
  const normalizedQuery = normalizeDashboardQuery(query);

  if (!normalizedQuery) return true;

  return normalizeDashboardQuery(source).includes(normalizedQuery);
}

export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

export function getDashboardProfile(
  role: Role,
  sessionEmail: string,
): DashboardProfile {
  const roleLabel = roleTitles[role];
  const profiles: Record<Role, DashboardProfile> = {
    "super-admin": {
      id: "SA-001",
      name: "Buizz Super Admin",
      role: "Super Admin",
      email: sessionEmail || "",
      phone: "",
      city: "",
      status: "Active",
      lastLogin: "Today",
      createdAt: "",
      avatarUrl: createInitialsAvatar("Buizz Super Admin", "super-admin"),
    },
    admin: {
      id: "ADM-001",
      name: "Buizz Admin",
      role: "Admin",
      email: sessionEmail || "",
      phone: "",
      city: "",
      status: "Active",
      lastLogin: "Today",
      createdAt: "",
      avatarUrl: createInitialsAvatar("Buizz Admin", "admin"),
    },
    organizer: {
      id: "ORG-001",
      name: "Buizz Organizer",
      role: "Organizer",
      email: sessionEmail || "",
      phone: "",
      city: "",
      status: "Active",
      lastLogin: "Today",
      createdAt: "",
      avatarUrl: createInitialsAvatar("Buizz Organizer", "organizer"),
    },
  };

  const defaultProfile = profiles[role];

  if (typeof window === "undefined") {
    return defaultProfile;
  }

  const sessionProfile = readDashboardSessionProfile(role, sessionEmail);
  const accountProfile: DashboardProfile = {
    ...defaultProfile,
    ...sessionProfile,
    role: roleLabel,
    email: sessionProfile.email || sessionEmail || defaultProfile.email,
    name: sessionProfile.name || defaultProfile.name,
    phone: sessionProfile.phone || "",
    city: sessionProfile.city || "",
    avatarUrl: sessionProfile.avatarUrl || createInitialsAvatar(sessionProfile.name || defaultProfile.name, role),
  };

  const storageKeys = [
    `buizz-dashboard-profile-${role}-${createProfileStorageIdentity(accountProfile)}`,
    `buizz-dashboard-profile-${role}`,
    `buizz-dashboard-profile-${defaultProfile.role.toLowerCase().replace(/\s+/g, "-")}`,
  ];

  for (const key of storageKeys) {
    const saved = window.localStorage.getItem(key);

    if (!saved) continue;

    try {
      const parsed = JSON.parse(saved) as Partial<DashboardProfile>;

      return {
        ...accountProfile,
        ...parsed,
        id: accountProfile.id,
        role: roleLabel,
        email: sessionEmail || parsed.email || accountProfile.email,
        avatarUrl: parsed.avatarUrl || accountProfile.avatarUrl,
      };
    } catch {
      return accountProfile;
    }
  }

  return accountProfile;
}

function readDashboardSessionProfile(role: Role, sessionEmail: string): Partial<DashboardProfile> {
  const raw = window.localStorage.getItem(roleSessionKey[role]);
  if (!raw) return { email: sessionEmail };

  try {
    const session = JSON.parse(raw) as Record<string, unknown>;
    const name = String(session.name ?? session.businessName ?? session.orgName ?? "").trim();
    const email = String(session.email ?? sessionEmail ?? "").trim();
    const phone = String(session.phone ?? "").trim();
    const city = String(session.city ?? session.location ?? "").trim();
    const avatarUrl = String(session.avatarUrl ?? session.profileImage ?? session.profileImageUrl ?? session.photoUrl ?? "").trim();
    const id = String(session.userId ?? session.id ?? session.displayId ?? email ?? "").trim();

    return {
      id: id || undefined,
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      city: city || undefined,
      avatarUrl: avatarUrl || undefined,
      status: String(session.status ?? "Active"),
      createdAt: String(session.createdAt ?? ""),
    };
  } catch {
    return { email: sessionEmail };
  }
}

export function createProfileStorageIdentity(profile: Pick<DashboardProfile, "id" | "email">) {
  return encodeURIComponent(String(profile.id || profile.email || "current").trim().toLowerCase());
}

export function createInitialsAvatar(name: string, role: Role | string) {
  const initials = String(name || "Buizz")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "B";
  const roleText = String(role).toLowerCase();
  const bg = roleText.includes("organizer") ? "#0F766E" : roleText.includes("admin") ? "#7C3AED" : "#EC1B72";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="800" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function Panel({
  title,
  description,
  children,
  showHeader = false,
  actions,
  className = "",
}: {
  title: string;
  description: string;
  children: ReactNode;
  showHeader?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`mx-auto grid w-full min-w-0 max-w-[1600px] gap-4 overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:gap-5 sm:rounded-[2rem] sm:p-5 ${className}`}
    >
      {showHeader ? (
        <div className="grid min-w-0 gap-3 rounded-[20px] bg-[var(--app-subtle)] px-4 py-3 sm:bg-transparent sm:p-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-black leading-tight tracking-[-0.03em] text-[var(--app-foreground)] sm:text-3xl">
              {title}
            </h1>

            <p className="mt-2 max-w-3xl break-words text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
              {description}
            </p>
          </div>

          {actions ? (
            <div className="flex min-w-0 flex-wrap gap-2 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="min-w-0 overflow-hidden">{children}</div>
    </section>
  );
}

export function DashboardPageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`mx-auto grid w-full min-w-0 max-w-[1600px] gap-4 sm:gap-5 ${className}`}
    >
      {children}
    </section>
  );
}

export function ResponsiveStatRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`-mx-3 flex min-w-0 snap-x gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-4 [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  );
}

export function ResponsiveStatCard({
  title,
  value,
  detail,
  icon: Icon,
  href,
  tone = "brand",
}: {
  title: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: LucideIcon;
  href?: string;
  tone?: StatusTone;
}) {
  const toneClass = getStatusToneClass(tone, "soft");

  const content = (
    <>
      <div className="flex min-w-0 items-center justify-between gap-3">
        {Icon ? (
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-2xl ${toneClass}`}
          >
            <Icon className="size-4" />
          </span>
        ) : null}

        <span className="min-w-0 truncate text-right text-2xl font-black leading-tight text-[var(--app-foreground)]">
          {value}
        </span>
      </div>

      <p className="mt-3 min-w-0 break-words text-sm font-black leading-snug text-[var(--app-foreground)]">
        {title}
      </p>

      {detail ? (
        <p className="mt-1 min-w-0 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">
          {detail}
        </p>
      ) : null}
    </>
  );

  const cardClass =
    "w-[76vw] max-w-[250px] flex-none snap-start overflow-hidden rounded-[22px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition duration-300 active:scale-[0.98] sm:w-auto sm:max-w-none sm:flex-auto";

  if (href) {
    return (
      <Link
        href={href}
        className={`${cardClass} hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]/35 hover:bg-[var(--app-subtle)] hover:shadow-[0_16px_38px_rgba(15,23,42,0.09)]`}
      >
        {content}
      </Link>
    );
  }

  return <article className={cardClass}>{content}</article>;
}

export function ResponsiveFilterPanel({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section
      className={`grid gap-3 rounded-[22px] border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:p-4 ${className}`}
    >
      {title ? (
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--app-muted)]">
          {title}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

export function ResponsiveActionGroup({
  children,
  className = "",
  align = "start",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  return (
    <div
      className={`flex min-w-0 flex-wrap gap-2 ${align === "end" ? "justify-start sm:justify-end" : "justify-start"
        } ${className}`}
    >
      {children}
    </div>
  );
}

export function ResponsiveModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-4xl",
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <section
        className={`flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-2xl sm:rounded-[2rem]`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--app-border)] p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-black tracking-[-0.02em] text-[var(--app-foreground)] sm:text-2xl">
              {title}
            </h2>

            {subtitle ? (
              <p className="mt-1 break-words text-sm font-semibold leading-6 text-[var(--app-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/30 hover:text-[var(--color-brand-primary)]"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>

        {footer ? (
          <footer className="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-elevated)] p-4 sm:p-5">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function HeroPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#070b15] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-7">
      <p className="text-sm font-black text-[var(--color-brand-primary)]">
        Control Tower
      </p>

      <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
        {title}
      </h1>

      <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/70">
        {description}
      </p>
    </section>
  );
}

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <ResponsiveStatRow className="md:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, detail, icon: Icon }) => (
        <ResponsiveStatCard
          key={label}
          title={label}
          value={value}
          detail={detail}
          icon={Icon}
        />
      ))}
    </ResponsiveStatRow>
  );
}

export function ChartPanel({ title, data }: { title: string; data: number[] }) {
  return (
    <Panel
      title={title}
      description="Dashboard chart visualization."
      showHeader
    >
      <div className="flex h-64 min-w-0 items-end gap-3 overflow-x-auto pb-2">
        {data.map((value, index) => (
          <div
            key={`${value}-${index}`}
            className="flex min-w-10 flex-1 flex-col items-center gap-2"
          >
            <div
              className="w-full rounded-t-2xl bg-[var(--color-brand-primary)]"
              style={{ height: `${value}%` }}
            />
            <span className="text-xs font-black text-[var(--app-muted)]">
              M{index + 1}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ActivityPanel() {
  return (
    <Panel
      title="Recent Activity"
      description="Latest platform actions across approval, event, finance and support workflows."
      showHeader
    >
      <div className="grid gap-3">
        {[
          "Approved event listing",
          "Created admin user",
          "Updated organizer permission",
          "Generated revenue report",
        ].map((activity) => (
          <div
            key={activity}
            className="flex items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3"
          >
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#22C55E]" />

            <div className="min-w-0">
              <p className="break-words text-sm font-black text-[var(--app-foreground)]">
                {activity}
              </p>

              <p className="text-xs font-semibold text-[var(--app-muted)]">
                Demo activity stream
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function DataTable({
  columns,
  rows,
  emptyTitle = "No records found",
  emptyDescription = "Try changing filters or add a new record.",
  minWidth = "760px",
}: {
  columns: TableColumn[];
  rows: TableRow[];
  emptyTitle?: string;
  emptyDescription?: string;
  minWidth?: string;
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={FileText}
      />
    );
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-3 md:hidden">
        {rows.map((row, index) => {
          const visibleColumns = columns.filter(
            (column) => !column.hideOnMobile,
          );

          return (
            <article
              key={index}
              className="overflow-hidden rounded-[22px] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
            >
              {visibleColumns.map((column, columnIndex) => (
                <div
                  key={column.key}
                  className={`grid min-w-0 gap-1 ${columnIndex === 0
                    ? "pb-3"
                    : "border-t border-[var(--app-border)] py-3 last:pb-0"
                    }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                    {column.label}
                  </span>

                  <span
                    className={`min-w-0 break-words ${column.isPrimary || columnIndex === 0
                      ? "text-base font-black text-[var(--app-foreground)]"
                      : "text-sm font-bold text-[var(--app-foreground)]"
                      }`}
                  >
                    {row[column.key]}
                  </span>
                </div>
              ))}
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-[22px] border border-[var(--app-border)] bg-[var(--app-subtle)] md:block">
        <table
          className="w-full border-collapse text-left text-sm"
          style={{ minWidth }}
        >
          <thead>
            <tr className="text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="font-semibold">
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-t border-[var(--app-border)] transition hover:bg-[var(--app-elevated)]"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-top">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PermissionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,1.4fr)] lg:items-start">
        <div className="min-w-0">
          <p className="break-words text-lg font-black text-[var(--app-foreground)]">
            {title}
          </p>

          <p className="mt-1 break-words text-sm font-semibold leading-6 text-[var(--app-muted)]">
            {subtitle}
          </p>
        </div>

        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {children}
        </div>
      </div>
    </article>
  );
}

export function PermissionSwitch({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-left text-xs font-black transition hover:border-[var(--color-brand-primary)]/30"
    >
      <span className="min-w-0 break-words">{label}</span>

      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#22C55E]" : "bg-[var(--app-muted)]"
          }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white transition ${checked ? "left-4" : "left-0.5"
            }`}
        />
      </span>
    </button>
  );
}

function getStatusToneClass(tone: StatusTone, mode: "solid" | "soft") {
  const solid: Record<StatusTone, string> = {
    default: "bg-[var(--app-foreground)] text-[var(--app-elevated)]",
    success: "bg-[#16A34A] text-white",
    warning: "bg-[var(--color-brand-accent)] text-[var(--color-brand-ink)]",
    danger: "bg-[var(--color-brand-primary)] text-white",
    info: "bg-[#2563EB] text-white",
    muted: "bg-[var(--app-muted)] text-white",
    brand: "bg-[var(--color-brand-primary)] text-white",
  };

  const soft: Record<StatusTone, string> = {
    default:
      "bg-[var(--app-subtle)] text-[var(--app-foreground)] ring-1 ring-[var(--app-border)]",
    success: "bg-[#16A34A]/10 text-[#15803D] ring-1 ring-[#16A34A]/20",
    warning:
      "bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-ink)] ring-1 ring-[var(--color-brand-accent)]/40",
    danger:
      "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] ring-1 ring-[var(--color-brand-primary)]/20",
    info: "bg-[#2563EB]/10 text-[#1D4ED8] ring-1 ring-[#2563EB]/20",
    muted:
      "bg-[var(--app-muted)]/10 text-[var(--app-muted)] ring-1 ring-[var(--app-border)]",
    brand:
      "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] ring-1 ring-[var(--color-brand-primary)]/20",
  };

  return mode === "solid" ? solid[tone] : soft[tone];
}

export function getStatusTone(status: string): StatusTone {
  const normalized = normalizeDashboardQuery(status);

  if (
    normalized.includes("approved") ||
    normalized.includes("active") ||
    normalized.includes("live") ||
    normalized.includes("paid") ||
    normalized.includes("resolved") ||
    normalized.includes("valid") ||
    normalized.includes("success")
  ) {
    return "success";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("waiting") ||
    normalized.includes("hold") ||
    normalized.includes("review") ||
    normalized.includes("created")
  ) {
    return "warning";
  }

  if (
    normalized.includes("reject") ||
    normalized.includes("failed") ||
    normalized.includes("blocked") ||
    normalized.includes("suspended") ||
    normalized.includes("invalid") ||
    normalized.includes("cancel")
  ) {
    return "danger";
  }

  if (
    normalized.includes("draft") ||
    normalized.includes("new") ||
    normalized.includes("progress") ||
    normalized.includes("processing")
  ) {
    return "info";
  }

  if (
    normalized.includes("closed") ||
    normalized.includes("expired") ||
    normalized.includes("archived")
  ) {
    return "muted";
  }

  return "brand";
}

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  return <StatusPill label={String(status)} tone={getStatusTone(String(status))} />;
}

export function StatusPill({
  label,
  tone,
  mode = "soft",
}: {
  label: string;
  tone?: StatusTone;
  mode?: "solid" | "soft";
}) {
  const nextTone = tone ?? getStatusTone(label);

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${getStatusToneClass(
        nextTone,
        mode,
      )}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

export function DashboardActionButton({
  children,
  icon: Icon,
  href,
  onClick,
  type = "button",
  disabled,
  tone = "secondary",
  className = "",
  title,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger" | "success" | "ghost";
  className?: string;
  title?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "border-transparent bg-[var(--color-brand-primary)] text-white shadow-[0_16px_32px_rgb(var(--brand-primary-rgb)/0.22)] hover:-translate-y-0.5"
      : tone === "danger"
        ? "border-transparent bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white"
        : tone === "success"
          ? "border-transparent bg-[#16A34A]/10 text-[#15803D] hover:bg-[#16A34A] hover:text-white"
          : tone === "ghost"
            ? "border-transparent bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-subtle)] hover:text-[var(--app-foreground)]"
            : "border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-foreground)] hover:border-[var(--color-brand-primary)]/35 hover:text-[var(--color-brand-primary)]";

  const content = (
    <>
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span className="truncate">{children}</span>
    </>
  );

  const baseClass = `inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black transition duration-300 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 ${toneClass} ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClass} title={title}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseClass}
      title={title}
    >
      {content}
    </button>
  );
}

export function DashboardExportButton({
  onClick,
  label = "Export",
}: {
  onClick?: () => void;
  label?: string;
}) {
  return (
    <DashboardActionButton icon={Download} onClick={onClick}>
      {label}
    </DashboardActionButton>
  );
}

export function DashboardSearchInput({
  value,
  onChange,
  placeholder = "Search",
  className = "",
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label
      className={`flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-semibold text-[var(--app-foreground)] ${className}`}
    >
      <Search className="size-4 shrink-0 text-[var(--app-muted)]" />

      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--app-muted)]"
      />
    </label>
  );
}

export function DashboardInput({
  label,
  className = "",
  ...props
}: {
  label?: string;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`grid min-w-0 gap-1.5 ${className}`}>
      {label ? (
        <span className="text-xs font-black text-[var(--app-foreground)]">
          {label}
        </span>
      ) : null}

      <input
        {...props}
        className="min-h-11 min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
      />
    </label>
  );
}

export function DashboardSelect({
  label,
  children,
  className = "",
  ...props
}: {
  label?: string;
  children: ReactNode;
  className?: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`grid min-w-0 gap-1.5 ${className}`}>
      {label ? (
        <span className="text-xs font-black text-[var(--app-foreground)]">
          {label}
        </span>
      ) : null}

      <select
        {...props}
        className="min-h-11 min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)]"
      >
        {children}
      </select>
    </label>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = FileText,
  action,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-6 text-center">
      <div className="mx-auto max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <Icon className="size-5" />
        </span>

        <h3 className="mt-4 text-lg font-black text-[var(--app-foreground)]">
          {title}
        </h3>

        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">
          {description}
        </p>

        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function LoadingState({
  title = "Loading dashboard data",
  description = "Please wait while Buizz prepares this section.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-[24px] border border-[var(--app-border)] bg-[var(--app-subtle)] p-6 text-center">
      <div className="mx-auto max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <Loader2 className="size-5 animate-spin" />
        </span>

        <h3 className="mt-4 text-lg font-black text-[var(--app-foreground)]">
          {title}
        </h3>

        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again or refresh this section.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-[24px] border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/5 p-6 text-center">
      <div className="mx-auto max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <AlertCircle className="size-5" />
        </span>

        <h3 className="mt-4 text-lg font-black text-[var(--app-foreground)]">
          {title}
        </h3>

        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">
          {description}
        </p>

        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmationCard({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  destructive = false,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  destructive?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
      <div className="flex items-start gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${destructive
            ? "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
            : "bg-[#16A34A]/10 text-[#15803D]"
            }`}
        >
          {destructive ? (
            <XCircle className="size-5" />
          ) : (
            <CheckCircle2 className="size-5" />
          )}
        </span>

        <div className="min-w-0">
          <h3 className="text-base font-black text-[var(--app-foreground)]">
            {title}
          </h3>

          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DashboardActionButton onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </DashboardActionButton>

        <DashboardActionButton
          onClick={onConfirm}
          disabled={loading}
          tone={destructive ? "danger" : "primary"}
        >
          {loading ? "Processing..." : confirmLabel}
        </DashboardActionButton>
      </div>
    </div>
  );
}

export function AccessBlocked({ role }: { role: Role }) {
  return (
    <Panel
      title="Access disabled"
      description={`This ${roleTitles[role]} page is hidden because Super Admin disabled its permission.`}
      showHeader
    >
      <p className="text-sm font-semibold text-[var(--app-muted)]">
        Use /super-admin/permissions to toggle access back on.
      </p>
    </Panel>
  );
}

export function TicketDesignModuleDisabled({ role }: { role: Role }) {
  const homeHref =
    role === "super-admin"
      ? "/super-admin/dashboard"
      : role === "admin"
        ? "/admin/dashboard"
        : "/organizer/dashboard";

  return (
    <Panel
      title="Ticket design module temporarily disabled"
      description="The final Buizz ticket design system is being connected. Issued ticket previews and booking ticket display remain available."
      showHeader
    >
      <div className="grid gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
          <Ticket className="size-5" />
        </span>

        <div className="min-w-0">
          <p className="text-base font-black text-[var(--app-foreground)]">
            Ticket customization and design review are paused.
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">
            This page is hidden from the sidebar and disabled for direct access
            until the final ticket design workflow is ready. Booking success
            tickets, profile tickets, organizer booking ticket previews, and QR
            validation are not affected.
          </p>

          <DashboardActionButton href={homeHref} tone="primary" className="mt-4">
            Back to {roleTitles[role]} Dashboard
          </DashboardActionButton>
        </div>
      </div>
    </Panel>
  );
}

export function TopBrand({ label }: { label: string }) {
  return (
    <Link href="/" className="inline-flex">
      <BuizzLogo size="lg" showSubtitle subtitle={label} />
    </Link>
  );
}

export function OnboardingStep({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {[
          "Organization name",
          "Contact person",
          "Email",
          "Mobile",
          "PAN",
          "City",
        ].map((field) => (
          <input
            key={field}
            className="min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold outline-none focus:border-[var(--color-brand-primary)]"
            placeholder={field}
          />
        ))}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {["PAN Card", "Identity Proof", "Address Proof", "Bank Proof"].map(
          (doc) => (
            <div
              key={doc}
              className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4"
            >
              <FileCheck2 className="size-5 text-[var(--color-brand-primary)]" />

              <p className="mt-3 text-sm font-black">{doc}</p>

              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                File uploaded successfully
              </p>
            </div>
          ),
        )}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-semibold leading-6 text-[var(--app-muted)]">
        Accept platform terms, revenue policy, refund responsibilities, and
        event listing rules for Buizz organizer access.
      </div>
    );
  }

  return (
    <input
      className="mt-6 min-h-14 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-lg font-black outline-none focus:border-[var(--color-brand-primary)]"
      placeholder="Type full legal name as signature"
    />
  );
}

export function ApprovalTimeline({ status }: { status: string }) {
  const items = [
    "Account Created",
    "Documents Uploaded",
    "Agreement Signed",
    "Admin Review",
    "Super Admin Review",
    "Dashboard Access",
  ];

  const completeUntil =
    status === "approved" ? 5 : status === "pending-super-admin" ? 3 : 2;

  return (
    <div className="mt-6 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-left">
      <h2 className="text-lg font-black">Approval Timeline</h2>

      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <div key={item} className="flex min-w-0 items-center gap-3">
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${index <= completeUntil
                ? "bg-[#22C55E] text-white"
                : "bg-[var(--app-elevated)] text-[var(--app-muted)]"
                }`}
            >
              {index + 1}
            </span>

            <p className="min-w-0 break-words text-sm font-black">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
