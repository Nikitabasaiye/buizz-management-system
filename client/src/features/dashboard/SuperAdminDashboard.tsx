"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  HeadphonesIcon,
  KeyRound,
  ShieldCheck,
  Star,
} from "lucide-react";

import {
  DashboardPageShell,
  ResponsiveStatCard,
  ResponsiveStatRow,
} from "./SharedDashboardComponents";
import { revenueService } from "@/services/revenueService";
import { settlementService } from "@/services/settlementService";

type SuperAdminDashboardOverviewProps = {
  pendingOrganizers: number;
  pendingEvents: number;
  pendingVenues: number;
  platformUsersCount: number;
  eventCount: number;
  venueCount: number;
};

export function SuperAdminDashboardOverview({
  pendingOrganizers,
  pendingEvents,
}: SuperAdminDashboardOverviewProps) {
  const [revenueData, setRevenueData] = useState<any>(null);
  const [settlementData, setSettlementData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const money = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [revenue, settlements] = await Promise.all([
        revenueService.getSuperAdminRevenue(),
        settlementService.getSettlementSummary(),
      ]);
      setRevenueData(revenue);
      setSettlementData(settlements);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from API data
  const grossRevenue = revenueData?.organizers?.reduce(
    (sum: number, org: any) => sum + (org.total_revenue || 0),
    0
  ) || 0;

  const platformFees = grossRevenue * 0.08; // 8% platform fee
  const netSettlements = grossRevenue - platformFees;

  const pendingBalance = settlementData?.reduce(
    (sum: number, s: any) => sum + (s.net_amount || 0),
    0
  ) || 0;

  const dashboardCards = [
    {
      title: "Organizer Review",
      value: pendingOrganizers,
      detail: "Pending organizer approvals",
      href: "/super-admin/organizer-review",
      icon: Building2,
    },
    {
      title: "Event Review",
      value: pendingEvents,
      detail: "Events waiting for review",
      href: "/super-admin/event-review",
      icon: Calendar,
    },
    {
      title: "Rating Review",
      value: "Live",
      detail: "Customer rating approvals",
      href: "/super-admin/rating-review",
      icon: Star,
    },
  ];

  const financeCards = [
    {
      title: "Revenue",
      value: loading ? "Loading..." : money(grossRevenue),
      detail: "Total platform revenue",
      href: "/super-admin/revenue",
      icon: DollarSign,
    },
    {
      title: "Settlements",
      value: loading ? "Loading..." : money(Math.round(netSettlements)),
      detail: "Total organizer payouts",
      href: "/super-admin/settlements",
      icon: CreditCard,
    },
    {
      title: "Pending Balance",
      value: loading ? "Loading..." : money(pendingBalance),
      detail: "Pending settlements",
      href: "/super-admin/settlements",
      icon: Clock,
    },
  ];

  const quickActions = [
    {
      title: "Admin Management",
      detail: "Create admins and control operational access.",
      href: "/super-admin/admins",
      icon: ShieldCheck,
    },
    {
      title: "Permissions",
      detail: "Configure Admin module access and approval permissions.",
      href: "/super-admin/permissions",
      icon: KeyRound,
    },
    {
      title: "Support Tickets",
      detail: "Review platform support requests and escalations.",
      href: "/super-admin/support",
      icon: HeadphonesIcon,
    },
  ];

  return (
    <DashboardPageShell>
      <div className="grid min-w-0 gap-4 sm:gap-6">
        <ResponsiveStatRow className="md:grid-cols-4">
          {dashboardCards.map((card) => (
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

        <section className="grid min-w-0 gap-3 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:rounded-3xl sm:p-5">
          <h2 className="text-lg font-black text-[var(--app-foreground)]">
            Finance Snapshot
          </h2>
          <ResponsiveStatRow className="md:grid-cols-3">
            {financeCards.map((card) => (
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
        </section>

        <ResponsiveStatRow className="md:grid-cols-3">
          {quickActions.map((action) => (
            <ResponsiveStatCard
              key={action.title}
              title={action.title}
              value="Open"
              detail={action.detail}
              href={action.href}
              icon={action.icon}
            />
          ))}
        </ResponsiveStatRow>
      </div>
    </DashboardPageShell>
  );
}
