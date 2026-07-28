"use client";

import {
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  HeadphonesIcon,
  Landmark,
  Settings,
  ShieldCheck,
  Star,
  Ticket,
  Users,
} from "lucide-react";

import {
  DashboardPageShell,
  ResponsiveStatCard,
  ResponsiveStatRow,
} from "./SharedDashboardComponents";
import {
  useOrganizerOfflineBookings,
  useOrganizerUnifiedBookings,
} from "./OrganizerDashboard";

type AdminDashboardOverviewProps = {
  pendingOrganizers: number;
  pendingEvents: number;
  pendingVenues: number;
};

export function AdminDashboardOverview({
  pendingOrganizers,
  pendingEvents,
  pendingVenues,
}: AdminDashboardOverviewProps) {
  const offlineBookings = useOrganizerOfflineBookings();
  const unifiedBookings = useOrganizerUnifiedBookings();

  const money = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

  const totalBookings = offlineBookings.length + unifiedBookings.length;

  const totalRevenue =
    offlineBookings.reduce((sum, booking) => sum + booking.amountCollected, 0) +
    unifiedBookings.reduce((sum, booking) => sum + booking.amountCollected, 0);

  const reviewCards = [
    {
      title: "Organizer Review",
      value: String(pendingOrganizers),
      detail: "Organizer applications need review",
      href: "/admin/organizer-review",
      icon: Building2,
    },
    {
      title: "Event Review",
      value: String(pendingEvents),
      detail: "Events waiting for approval",
      href: "/admin/event-review",
      icon: Calendar,
    },
    {
      title: "Rating Review",
      value: "Moderate",
      detail: "Approve customer platform ratings",
      href: "/admin/rating-review",
      icon: Star,
    },
    {
      title: "Settings",
      value: "Secure",
      detail: "Profile, security and workspace setup",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  const moduleCards = [
    {
      title: "Bookings",
      detail: `${totalBookings} online/offline booking records`,
      href: "/admin/bookings",
      icon: ClipboardCheck,
    },
    {
      title: "Attendees",
      detail: "QR status, entry verification and check-in",
      href: "/admin/attendees",
      icon: Users,
    },
    {
      title: "Users",
      detail: "Customer and organizer user control",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Venues",
      detail: `${pendingVenues} venues pending`,
      href: "/admin/venues",
      icon: Landmark,
    },
    {
      title: "Seat Maps",
      detail: "Seat layouts and booking map setup",
      href: "/admin/seat-maps",
      icon: Landmark,
    },
    {
      title: "Reports",
      detail: "Bookings, users, revenue and support reports",
      href: "/admin/reports",
      icon: FileText,
    },
    {
      title: "Settings",
      detail: "Admin profile, notifications and security",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  const quickActions = [
    {
      label: "Review organizers",
      href: "/admin/organizer-review",
      icon: Building2,
    },
    {
      label: "Review events",
      href: "/admin/event-review",
      icon: Calendar,
    },
    {
      label: "Open bookings",
      href: "/admin/bookings",
      icon: ClipboardCheck,
    },
    {
      label: "Open support tickets",
      href: "/admin/support",
      icon: HeadphonesIcon,
    },
    {
      label: "Admin settings",
      href: "/admin/settings",
      icon: ShieldCheck,
    },
  ];

  return (
    <DashboardPageShell>
      <ResponsiveStatRow className="md:grid-cols-4">
        {reviewCards.map((card) => (
          <ResponsiveStatCard
            key={card.title}
            title={card.title}
            value={card.value}
            detail={card.detail}
            href={card.href}
            icon={card.icon}
          />
        ))}
      </ResponsiveStatRow>

      <ResponsiveStatRow className="md:grid-cols-3">
        <ResponsiveStatCard
          title="Total Revenue"
          value={money(totalRevenue)}
          detail="Online and offline collected"
          icon={Ticket}
          href="/admin/revenue"
        />
        <ResponsiveStatCard
          title="Bookings"
          value={totalBookings}
          detail="Online/offline booking records"
          icon={ClipboardCheck}
          href="/admin/bookings"
        />
        <ResponsiveStatCard
          title="Pending Reviews"
          value={pendingOrganizers + pendingEvents}
          detail="Organizer and event queues"
          icon={Calendar}
          href="/admin/event-review"
        />
      </ResponsiveStatRow>

      <section className="grid gap-3 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:rounded-3xl sm:p-5">
        <h2 className="text-lg font-black text-[var(--app-foreground)]">
          Daily Operation Shortcuts
        </h2>

        <ResponsiveStatRow className="md:grid-cols-3 xl:grid-cols-7">
          {moduleCards.map((card) => (
            <ResponsiveStatCard
              key={card.title}
              title={card.title}
              value="Open"
              detail={card.detail}
              href={card.href}
              icon={card.icon}
            />
          ))}
        </ResponsiveStatRow>
      </section>

      <ResponsiveStatRow className="md:grid-cols-5">
        {quickActions.map((action) => (
          <ResponsiveStatCard
            key={action.label}
            title={action.label}
            value="Open"
            href={action.href}
            icon={action.icon}
          />
        ))}
      </ResponsiveStatRow>
    </DashboardPageShell>
  );
}