"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  Heart,
  Home,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  PhoneCall,
  QrCode,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Ticket,
  Trash2,
  UserCircle,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { LoadingButton } from "@/components/common/LoadingButton";
import { QRTicket } from "@/features/booking/BookingFlow";
import { serverEventToDiscoveryItem } from "@/features/discovery/serverEventAdapter";
import type { DiscoveryItem } from "@/features/discovery/data";
import {
  bookingToBuizzTickets,
  serverTicketToBuizzTicket,
  stampsFromTickets,
} from "@/features/account/serverTicketAdapter";
import { BuizzTicketCard, downloadTicketPdf, parseTicketQrPayload } from "@/features/tickets";
import { TicketQrPreview } from "@/features/tickets/TicketQrPreview";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { useAppStore, type ThemeMode as AppThemeMode } from "@/store/app.store";
import { useAuthStore } from "@/store/auth.store";
import type { BuizzTicket, PassportStamp } from "@/store/ticket.store";
import {
  useChangePasswordMutation,
  useGetEventsQuery,
  useGetProfileQuery,
  useGetMyTicketsQuery,
  useGetUserBookingsQuery,
  useScanTicketMutation,
} from "@/store/api";
import { useWishlistStore } from "@/store/wishlist.store";

type TicketTab = "Upcoming" | "Past" | "Cancelled";
type ThemeMode = "Light" | "Dark" | "System";
type SettingsModal = "password" | "logout" | "delete" | null;

type AccountSettings = {
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  smsNotifications: boolean;
  promotions: boolean;
  privacyControls: boolean;
  profileVisibility: boolean;
  hidePhoneNumber: boolean;
  twoFactor: boolean;
  communicationSettings: boolean;
  themeMode: ThemeMode;
  language: "English" | "Hindi" | "Marathi";
  region: "Maharashtra" | "Goa" | "Karnataka";
};

const profileImage = "/images/profile.jpg";
const accountSettingsKey = "buizz-profile-settings-v2";
const ticketTabs: TicketTab[] = ["Upcoming", "Past", "Cancelled"];
const navItems = [
  { label: "Profile", href: "/profile", icon: UserCircle },
  { label: "Tickets", href: "/profile/tickets", icon: Ticket },
  { label: "Wishlist", href: "/profile/wishlist", icon: Heart },
  { label: "Bookings", href: "/profile/bookings", icon: WalletCards },
  { label: "Stickers", href: "/profile/passport", icon: Award },
  { label: "Settings", href: "/profile/settings", icon: Settings },
];

const defaultSettings: AccountSettings = {
  emailNotifications: true,
  whatsappNotifications: true,
  smsNotifications: true,
  promotions: false,
  privacyControls: true,
  profileVisibility: true,
  hidePhoneNumber: true,
  twoFactor: false,
  communicationSettings: true,
  themeMode: "System",
  language: "English",
  region: "Maharashtra",
};

const stickerVisuals: Record<string, { symbol: string; gradient: string }> = {
  "music-explorer": { symbol: "🎵", gradient: "from-[var(--color-brand-primary)] via-[var(--color-brand-secondary)] to-[var(--color-brand-primary)]" },
  "comedy-fan": { symbol: "😂", gradient: "from-[var(--color-brand-accent)] via-[var(--color-brand-primary)] to-[var(--color-brand-secondary)]" },
  "theatre-lover": { symbol: "🎭", gradient: "from-[var(--color-brand-secondary)] via-[var(--color-brand-primary)] to-[var(--color-surface-inverse)]" },
  "sports-explorer": { symbol: "⚽", gradient: "from-[var(--color-brand-success)] via-[var(--color-brand-secondary)] to-[var(--color-brand-primary)]" },
  "food-trailblazer": { symbol: "🍕", gradient: "from-[var(--color-brand-accent)] via-[var(--color-brand-primary)] to-[var(--color-brand-secondary)]" },
  "business-networker": { symbol: "💼", gradient: "from-[var(--app-card)] via-[var(--color-brand-secondary)] to-[var(--color-brand-primary)]" },
  "festival-hopper": { symbol: "🎉", gradient: "from-[var(--color-brand-primary)] via-[var(--color-brand-accent)] to-[var(--color-brand-success)]" },
  "spiritual-seeker": { symbol: "🧘", gradient: "from-[var(--color-brand-primary)] via-[var(--color-brand-secondary)] to-[var(--color-brand-primary)]" },
  "culture-collector": { symbol: "🏛️", gradient: "from-[var(--color-brand-secondary)] via-[var(--color-brand-primary)] to-[var(--color-brand-primary)]" },
  "activity-explorer": { symbol: "🎮", gradient: "from-[var(--color-brand-primary)] via-[var(--color-brand-secondary)] to-[var(--color-brand-primary)]" },
};

const pageClass =
  "buizz-public-shell text-[var(--app-foreground)]";

const primaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] px-5 text-sm font-black text-white shadow-[var(--shadow-brand)] transition-all duration-300 hover:-translate-y-1 active:scale-[0.96] sm:w-auto";

const secondaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-5 text-sm font-black text-[var(--app-foreground)] shadow-[0_10px_24px_rgb(15 23 42 / 0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)] active:scale-[0.96] sm:w-auto";

const cardClass =
  "min-w-0 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-[var(--app-foreground)] shadow-[0_18px_45px_rgb(15 23 42 / 0.08)] sm:rounded-[28px] sm:p-5";

const dangerButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-brand-danger)]/35 bg-[var(--color-brand-danger)]/10 px-4 text-sm font-black text-[var(--color-brand-danger)] transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--color-brand-danger)]/15 active:scale-[0.97]";
export function ProfileQuickActions() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {navItems.slice(1).map(({ label, href, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className="group flex min-h-14 min-w-[148px] items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 shadow-[0_14px_30px_rgb(15 11 26 / 0.06)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-secondary)]/40 active:scale-[0.96] dark:border-[var(--app-border)] dark:bg-[var(--app-card)]"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white">
            <Icon className="size-4" />
          </span>
          <span className="truncate text-sm font-black text-[var(--app-foreground)]">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function MyTicketsPage() {
  const { data, isLoading, isFetching, isError } = useGetMyTicketsQuery({ page: 1, limit: 100 });
  const tickets = useMemo(
    () => (data?.data?.tickets ?? []).map(serverTicketToBuizzTicket),
    [data],
  );
  const [activeTab, setActiveTab] = useState<TicketTab>("Upcoming");
  const [modalTicket, setModalTicket] = useState<BuizzTicket | null>(null);
  const bookingPasses = useMemo(() => uniqueTicketsByBookingId(tickets), [tickets]);
  const filteredTickets = bookingPasses.filter((ticket) =>
    tabMatchesTicket(activeTab, ticket),
  );
  const groupedTickets = useMemo(() => {
    const groups = new Map<string, BuizzTicket>();
    filteredTickets.forEach((ticket) => {
      const existing = groups.get(ticket.bookingId);
      if (!existing || new Date(ticket.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        groups.set(ticket.bookingId, ticket);
      }
    });
    return Array.from(groups.values());
  }, [filteredTickets]);

  return (
    <AccountShell
      activePath="/profile/tickets"
      title="Ticket Wallet"
      description="Upcoming, past, and cancelled Buizz tickets with QR, download, and WhatsApp actions."
    >
      <StatsGrid
        stats={[
          {
            label: "Upcoming",
            value: bookingPasses.filter((ticket) =>
              tabMatchesTicket("Upcoming", ticket),
            ).length,
          },
          {
            label: "Past",
            value: bookingPasses.filter((ticket) => tabMatchesTicket("Past", ticket))
              .length,
          },
          {
            label: "Cancelled",
            value: bookingPasses.filter((ticket) =>
              tabMatchesTicket("Cancelled", ticket),
            ).length,
          },
        ]}
      />
      <div className="mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 [scrollbar-width:none] dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)] [&::-webkit-scrollbar]:hidden">
        {ticketTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-black transition-all duration-300 active:scale-[0.96] ${activeTab === tab ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[var(--shadow-brand)]" : "text-[var(--app-muted)] hover:bg-[var(--app-elevated)] dark:bg-[var(--app-card)] dark:hover:bg-[var(--app-border)]"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      {isLoading || isFetching ? (
        <EmptyAccountState
          icon={<Ticket className="size-9" />}
          title="Loading tickets"
          description="Fetching your latest ticket wallet from the server."
        />
      ) : isError ? (
        <EmptyAccountState
          icon={<Ticket className="size-9" />}
          title="Tickets unavailable"
          description="We could not load tickets from the server. Please try again after signing in."
        />
      ) : groupedTickets.length ? (
        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupedTickets.map((ticket) => (
            <BuizzTicketCard
              key={ticket.bookingId}
              ticket={ticket}
              onView={() => setModalTicket(ticket)}
            />
          ))}
        </div>
      ) : (
        <EmptyAccountState
          icon={<Ticket className="size-9" />}
          title={`No ${activeTab.toLowerCase()} tickets`}
          description="Tickets will appear here as soon as bookings match this status."
          action={
            <Link href="/events" className={primaryButtonClass}>
              Explore Events
            </Link>
          }
        />
      )}
      {modalTicket ? (
        <TicketPreviewModal
          ticket={modalTicket}
          onClose={() => setModalTicket(null)}
        />
      ) : null}
    </AccountShell>
  );
}

export function BookingHistoryPage() {
  const { data, isLoading, isFetching, isError } = useGetUserBookingsQuery({ page: 1, limit: 100 });
  const [modalTicket, setModalTicket] = useState<BuizzTicket | null>(null);
  const bookings = useMemo(() => {
    return (data?.data?.bookings ?? [])
      .map((booking) => [booking.orderId, bookingToBuizzTickets(booking)] as const)
      .filter(([, group]) => group.length > 0)
      .map(([bookingId, group]) => ({
        bookingId,
        tickets: group,
        ticket: group[0],
      }))
      .sort(
        (a, b) =>
          new Date(b.ticket.createdAt).getTime() -
          new Date(a.ticket.createdAt).getTime(),
      );
  }, [data]);

  return (
    <AccountShell
      activePath="/profile/bookings"
      title="Booking History"
      description="Track every Buizz booking with status, payment, ticket count, and quick ticket actions."
    >
      {isLoading || isFetching ? (
        <EmptyAccountState
          icon={<WalletCards className="size-9" />}
          title="Loading bookings"
          description="Fetching your latest booking history from the server."
        />
      ) : isError ? (
        <EmptyAccountState
          icon={<WalletCards className="size-9" />}
          title="Bookings unavailable"
          description="We could not load bookings from the server. Please try again after signing in."
        />
      ) : bookings.length ? (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          {bookings.map(({ bookingId, tickets: bookingTickets, ticket }) => (
            <article
              key={bookingId}
              className={`${cardClass} grid gap-3 sm:grid-cols-[128px_minmax(0,1fr)]`}
            >
              <img
                src={ticket.eventImage}
                alt={ticket.eventName}
                className="aspect-[16/10] w-full rounded-[18px] object-cover sm:aspect-auto sm:h-full"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-xl font-black text-[var(--app-foreground)]">
                      {ticket.eventName}
                    </h2>
                    <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">
                      Booking ID {bookingId}
                    </p>
                  </div>
                  <StatusBadge label={bookingStatus(ticket)} />
                </div>
                <div className="mt-4 grid gap-2 text-sm font-semibold text-[var(--app-muted)] sm:grid-cols-2">
                  <MetaLine
                    icon={<CalendarDays className="size-4" />}
                    text={`Booking date: ${formatDisplayDate(ticket.createdAt)}`}
                  />
                  <MetaLine
                    icon={<CalendarDays className="size-4" />}
                    text={`${ticket.date} - ${ticket.time}`}
                  />
                  <MetaLine
                    icon={<MapPin className="size-4" />}
                    text={`${ticket.venue}, ${ticket.city}`}
                  />
                  <MetaLine
                    icon={<Ticket className="size-4" />}
                    text={`1 pass • ${ticketCount(bookingTickets)} seat${ticketCount(bookingTickets) === 1 ? "" : "s"}`}
                  />
                  <MetaLine
                    icon={<CheckCircle2 className="size-4" />}
                    text={`Payment: ${ticket.total > 0 ? "Paid" : "Pending"}`}
                  />
                  <MetaLine
                    icon={<ShieldCheck className="size-4" />}
                    text={`Booking: ${bookingStatus(ticket)}`}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModalTicket(ticket)}
                    className={`${primaryButtonClass} px-3 text-xs`}
                  >
                    <QrCode className="size-4" />
                    View Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadTicketAndPass(ticket)}
                    className={`${secondaryButtonClass} px-3 text-xs`}
                  >
                    <Download className="size-4" />
                    Download
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyAccountState
          icon={<WalletCards className="size-9" />}
          title="No booking history"
          description="Your completed event bookings will appear here."
          action={
            <Link href="/events" className={primaryButtonClass}>
              Explore Events
            </Link>
          }
        />
      )}
      {modalTicket ? (
        <TicketPreviewModal
          ticket={modalTicket}
          onClose={() => setModalTicket(null)}
        />
      ) : null}
    </AccountShell>
  );
}

export function WishlistProfilePage() {
  const savedIds = useWishlistStore((state) => state.savedIds);
  const removeSaved = useWishlistStore((state) => state.removeSaved);
  const { data: eventsData, isLoading, isFetching, isError } = useGetEventsQuery({
    page: 1,
    limit: 100,
    status: "published",
  });
  const savedItems = useMemo(
    () =>
      (eventsData?.data?.events ?? [])
        .map(serverEventToDiscoveryItem)
        .filter((item) => savedIds.includes(item.id)),
    [eventsData, savedIds],
  );

  return (
    <AccountShell
      activePath="/profile/wishlist"
      title="Wishlist"
      description="Saved events, plays, and activities in one clean list."
    >
      {isLoading || isFetching ? (
        <EmptyAccountState
          icon={<Heart className="size-9" />}
          title="Loading wishlist"
          description="Fetching saved events from the server."
        />
      ) : isError ? (
        <EmptyAccountState
          icon={<Heart className="size-9" />}
          title="Wishlist unavailable"
          description="We could not load published events from the server."
        />
      ) : savedItems.length ? (
        <>
          <div className="mb-4 flex justify-end">
            <Link href="/events" className={secondaryButtonClass}>
              <Search className="size-4" />
              Explore Events
            </Link>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 min-[520px]:grid-cols-3 lg:grid-cols-4">
            {savedItems.map((item) => (
              <WishlistCard key={item.id} item={item} onRemove={removeSaved} />
            ))}
          </div>
        </>
      ) : (
        <EmptyAccountState
          icon={<Heart className="size-9" />}
          title="No saved events"
          description="Tap the heart on any event to save it here."
          action={
            <Link href="/events" className={primaryButtonClass}>
              Explore Events
            </Link>
          }
        />
      )}
    </AccountShell>
  );
}

export function BuizzPassportPage() {
  const { data } = useGetMyTicketsQuery({ page: 1, limit: 100 });
  const tickets = useMemo(
    () => (data?.data?.tickets ?? []).map(serverTicketToBuizzTicket),
    [data],
  );
  const stamps = useMemo(() => stampsFromTickets(tickets), [tickets]);
  const unlocked = stamps.filter((stamp) => stamp.unlocked);
  const xp = unlocked.reduce((sum, stamp) => sum + stamp.xp, 0);
  const level = Math.max(1, Math.floor(xp / 150) + 1);
  const attended = tickets.filter((ticket) => ticket.status === "Used");

  return (
    <AccountShell
      activePath="/profile/passport"
      title="Buizz Stickers"
      description="Collectible event stickers unlocked only after real event attendance."
    >
      <div className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 text-[var(--app-foreground)] shadow-[0_20px_50px_rgb(15 11 26 / 0.08)] dark:border-white/20 dark:bg-[var(--app-card)] dark:shadow-[0_24px_64px_rgb(15 11 26 / 0.22)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <BuizzLogo size="md" />
            <h2 className="mt-5 text-3xl font-black leading-tight sm:text-5xl">
              Level {level} Sticker Shelf
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--app-muted)]">
              Stickers glow after attendance. Locked stickers stay grayscale until a venue QR scan marks the event attended.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[320px] lg:min-w-[360px]">
            <PassportStat label="XP" value={`${xp}`} />
            <PassportStat label="Stickers" value={String(unlocked.length)} />
            <PassportStat label="Attended" value={String(attended.length)} />
          </div>
        </div>
      </div>

      <section className={`${cardClass} mt-4`}>
        <SectionTitle icon={<Award className="size-5" />} title="Collectible Stickers" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {stamps.map((stamp) => (
            <PassportStampCard key={stamp.id} stamp={stamp} />
          ))}
        </div>
      </section>
    </AccountShell>
  );
}

export function BuizzPassport() {
  return <BuizzPassportPage />;
}

export function ProfileSettingsPage() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { data: profileResponse } = useGetProfileQuery(undefined, {
    skip: !user,
  });
  const serverUser = profileResponse?.data;
  const accountUser = user as typeof user & {
    phone?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
  };
  const { loadingKey, runAction } = useActionFeedback();
  const [changePasswordRequest] = useChangePasswordMutation();
  const setAppTheme = useAppStore((state) => state.setTheme);
  const [settings, setSettings] =
    useState<AccountSettings>(loadAccountSettings);
  const [modal, setModal] = useState<SettingsModal>(null);

  useEffect(() => {
    window.localStorage.setItem(accountSettingsKey, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <Key extends keyof AccountSettings>(
    key: Key,
    value: AccountSettings[Key],
  ) => {
    if (key === "themeMode") {
      setAppTheme(toAppTheme(value as ThemeMode));
    }
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const changePassword = (currentPassword: string, newPassword: string) =>
    runAction(
      "change-password",
      async () => {
        await changePasswordRequest({ currentPassword, newPassword }).unwrap();
      },
      "Password updated",
      () => setModal(null),
    );

  const requestDelete = () =>
    runAction(
      "delete-account",
      async () => undefined,
      "Delete account request submitted",
      () => setModal(null),
    );

  const confirmLogout = () =>
    runAction(
      "profile-logout",
      async () => {
        logout();
        router.push("/login");
      },
      "Logged out",
    );

  const settingsActionClass =
    "flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black text-[var(--app-foreground)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)] active:scale-[0.97]";

  return (
    <AccountShell
      activePath="/profile/settings"
      title="Settings"
      description="Notification, privacy, theme, and account security controls."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cardClass}>
          <SectionTitle icon={<UserCircle className="size-5" />} title="Account Details" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SecurityRow icon={<UserCircle className="size-4" />} title="Name" value={accountUser?.name ?? "Buizz User"} />
            <SecurityRow icon={<Bell className="size-4" />} title="Email" value={accountUser?.email ?? "Not connected"} />
            <SecurityRow icon={<PhoneCall className="size-4" />} title="Phone" value={serverUser?.phone || accountUser?.phone || "Not connected"} />
            <SecurityRow icon={<MapPin className="size-4" />} title="City" value="Chhatrapati Sambhaji Nagar" />
          </div>
        </section>

        <section className={cardClass}>
          <SectionTitle icon={<Bell className="size-5" />} title="Notifications" />
          <div className="mt-4 grid gap-3">
            <ToggleRow icon={<Bell className="size-4" />} title="Email notifications" checked={settings.emailNotifications} onChange={(value) => updateSetting("emailNotifications", value)} />
            <ToggleRow icon={<MessageCircle className="size-4" />} title="WhatsApp updates" checked={settings.whatsappNotifications} onChange={(value) => updateSetting("whatsappNotifications", value)} />
          </div>
        </section>

        <section className={cardClass}>
          <SectionTitle icon={<Lock className="size-5" />} title="Privacy" />
          <div className="mt-4 grid gap-3">
            <ToggleRow icon={<ShieldCheck className="size-4" />} title="Profile visibility" checked={settings.profileVisibility} onChange={(value) => updateSetting("profileVisibility", value)} />
            <ToggleRow icon={<PhoneCall className="size-4" />} title="Hide phone number" checked={settings.hidePhoneNumber} onChange={(value) => updateSetting("hidePhoneNumber", value)} />
          </div>
        </section>

        <section className={cardClass}>
          <SectionTitle icon={<ShieldCheck className="size-5" />} title="Security" />
          <div className="mt-4 grid gap-3">
            <SecurityRow icon={<CheckCircle2 className="size-4" />} title="Email verification" value={accountUser?.email && accountUser.isEmailVerified ? "Verified" : "Pending"} />
            <SecurityRow icon={<PhoneCall className="size-4" />} title="Phone verification" value={(serverUser?.phone || accountUser?.phone) && (serverUser?.isPhoneVerified || accountUser?.isPhoneVerified) ? "Verified" : "Pending"} />
            <button type="button" onClick={() => setModal("password")} className={settingsActionClass}>
              <KeyRound className="size-4" />
              Change Password
            </button>
            <ToggleRow icon={<ShieldCheck className="size-4" />} title="Two-factor authentication" checked={settings.twoFactor} onChange={(value) => updateSetting("twoFactor", value)} />
          </div>
        </section>

        <section className={cardClass}>
          <SectionTitle icon={<Moon className="size-5" />} title="Theme" />
          <div className="mt-4">
            <SegmentedSetting icon={<Moon className="size-4" />} title="Appearance" value={settings.themeMode} options={["Light", "Dark", "System"]} onChange={(value) => updateSetting("themeMode", value as ThemeMode)} />
          </div>
        </section>

        <section className={`${cardClass} border-[var(--color-brand-danger)]/30 bg-[var(--color-brand-danger)]/10 lg:col-span-2`}>
          <SectionTitle icon={<Trash2 className="size-5" />} title="Danger Zone" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setModal("logout")} className={`${settingsActionClass} border-[var(--color-brand-danger)]/35 text-[var(--color-brand-danger)] hover:border-[var(--color-brand-danger)] hover:bg-[var(--color-brand-danger)]/10 hover:text-[var(--color-brand-danger)]`}>
              <LogOut className="size-4" />
              Logout
            </button>
            <button type="button" onClick={() => setModal("delete")} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-danger)] px-4 text-sm font-black text-white transition-all duration-300 hover:-translate-y-1 active:scale-[0.97]">
              <Trash2 className="size-4" />
              Delete Account
            </button>
          </div>
        </section>
      </div>

      {modal === "password" ? (
        <PasswordModal
          loading={loadingKey === "change-password"}
          onClose={() => setModal(null)}
          onConfirm={changePassword}
        />
      ) : null}
      {modal === "logout" ? (
        <ConfirmModal
          title="Log out?"
          description="You will leave this Buizz session on this device."
          confirmLabel="Logout"
          loading={loadingKey === "profile-logout"}
          onClose={() => setModal(null)}
          onConfirm={confirmLogout}
        />
      ) : null}
      {modal === "delete" ? (
        <ConfirmModal
          title="Delete account request"
          description="Your request will be queued for identity verification before account data is removed."
          confirmLabel="Submit Request"
          loading={loadingKey === "delete-account"}
          danger
          onClose={() => setModal(null)}
          onConfirm={requestDelete}
        />
      ) : null}
    </AccountShell>
  );
}

export function MockTicketScannerPage() {
  const [scanTicket, { isLoading }] = useScanTicketMutation();
  const [ticketId, setTicketId] = useState("");
  const [message, setMessage] = useState("");
  const [stampMessage, setStampMessage] = useState("");

  const scan = async () => {
    const qrPayload = parseTicketQrPayload(ticketId.trim());
    const nextTicketId = qrPayload?.ticketId ?? qrPayload?.bookingId ?? ticketId.trim();
    if (!nextTicketId) return;

    try {
      await scanTicket(nextTicketId).unwrap();
      setMessage("Entry Approved");
      setStampMessage("Ticket scanned successfully.");
    } catch {
      setMessage("Ticket scan failed");
      setStampMessage("");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingValue = params.get("qrPayload") ?? params.get("ticketId");
    if (incomingValue) setTicketId(incomingValue);
  }, []);

  return (
    <AccountShell
      activePath="/profile/tickets"
      title="QR Scanner"
      description="Enter a ticket number or QR payload to verify venue entry."
    >
      <section className={`${cardClass} max-w-3xl`}>
        <ScanLine className="size-10 text-[var(--color-brand-primary)]" />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={ticketId}
            onChange={(event) => setTicketId(event.target.value)}
            placeholder="Ticket number or QR payload"
            className="min-h-12 flex-1 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] dark:bg-[var(--app-card)] px-4 text-sm font-bold outline-none focus:border-[var(--color-brand-secondary)]"
          />
          <LoadingButton
            type="button"
            loading={isLoading}
            loadingText="Scanning..."
            onClick={() => void scan()}
            className={primaryButtonClass}
          >
            Scan QR
          </LoadingButton>
        </div>
        {message ? (
          <div
            className={`mt-5 rounded-2xl p-4 text-sm font-black ${message === "Entry Approved" ? "bg-[var(--color-brand-success)]/10 text-[var(--color-brand-success)]" : "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"}`}
          >
            {message}
          </div>
        ) : null}
        {stampMessage ? (
          <div className="mt-3 rounded-2xl bg-[var(--app-elevated)] dark:bg-[var(--app-card)] p-4 text-sm font-black text-[var(--color-brand-secondary)]">
            {stampMessage}
          </div>
        ) : null}
      </section>
    </AccountShell>
  );
}

export function MockTicketScanner() {
  return <MockTicketScannerPage />;
}

function AccountShell({
  activePath,
  title,
  description,
  children,
}: {
  activePath: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const user = useAuthStore((state) => state.user);

  const profileUser = user as typeof user & {
    image?: string | null;
    photoURL?: string | null;
    picture?: string | null;
  };

  return (
    <main className={`min-h-dvh w-full overflow-x-hidden ${pageClass} pb-24 md:pb-8`}>
      <div className="mx-auto w-full max-w-7xl min-w-0 px-3 py-4 sm:px-5 lg:px-8">
        <AccountHeader
          activePath={activePath}
          title={title}
          description={description}
          userName={user?.name ?? "Buizz User"}
          userEmail={user?.email ?? ""}
          userImage={
            profileUser?.image || profileUser?.photoURL || profileUser?.picture
          }
        />

        <div className="mt-5 min-w-0">{children}</div>
      </div>

      <MobileBottomNav activePath={activePath} />
    </main>
  );
}

function AccountHeader({
  activePath,
  title,
  description,
  userName,
  userEmail,
  userImage,
}: {
  activePath: string;
  title: string;
  description: string;
  userName: string;
  userEmail: string;
  userImage?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const avatar = userImage && !failed ? userImage : "";

  return (
    <header className="min-w-0 overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_16px_45px_rgb(15 11 26 / 0.08)] sm:rounded-[28px] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <BuizzLogo size="md" className="shrink-0" />

          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-[var(--app-foreground)] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-[var(--app-subtle)] p-2">
          <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-sm font-black text-white">
            {avatar ? (
              <img
                src={avatar}
                alt={`${userName} profile`}
                className="size-full object-cover"
                onError={() => setFailed(true)}
              />
            ) : (
              getInitials(userName)
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--app-foreground)]">
              {userName}
            </p>
            <p className="max-w-[180px] truncate text-xs font-semibold text-[var(--app-muted)] sm:max-w-[260px]">
              {userEmail || "Profile ready"}
            </p>
          </div>
        </div>
      </div>

      <nav
        className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:overflow-x-auto sm:pb-1 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
        aria-label="Profile navigation"
      >
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-[11px] font-black transition-all duration-300 active:scale-[0.96] sm:shrink-0 sm:px-4 sm:text-xs ${activePath === href
              ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[var(--shadow-brand)]"
              : "border border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-muted)] hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              }`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}

function TicketWalletCard({
  ticket,
  onQrPreview,
}: {
  ticket: BuizzTicket;
  onQrPreview: (ticket: BuizzTicket) => void;
}) {
  return (
    <article
      className={`${cardClass} grid gap-3 sm:grid-cols-[132px_minmax(0,1fr)]`}
    >
      <img
        src={ticket.eventImage}
        alt={ticket.eventName}
        className="aspect-[16/10] w-full rounded-[18px] object-cover sm:aspect-auto sm:h-full"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="line-clamp-2 min-w-0 text-lg font-black text-[var(--app-foreground)]">
            {ticket.eventName}
          </h2>
          <StatusBadge label={ticket.status} />
        </div>
        <div className="mt-3 grid gap-2 text-sm font-semibold text-[var(--app-muted)]">
          <MetaLine
            icon={<CalendarDays className="size-4" />}
            text={`${ticket.date} - ${ticket.time}`}
          />
          <MetaLine
            icon={<MapPin className="size-4" />}
            text={`${ticket.venue}, ${ticket.city}`}
          />
          <MetaLine
            icon={<QrCode className="size-4" />}
            text={ticket.status === "Valid" ? "QR Ready" : ticket.qrStatus}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onQrPreview(ticket)}
            className={`${primaryButtonClass} px-2 text-[11px] sm:px-3`}
          >
            <QrCode className="size-4" />
            QR Preview
          </button>
          <button
            type="button"
            onClick={() => void downloadTicketAndPass(ticket)}
            className={`${secondaryButtonClass} px-2 text-[11px] sm:px-3`}
          >
            <Download className="size-4" />
            Download
          </button>
          <button
            type="button"
            onClick={() => openWhatsApp(ticket)}
            className={`${secondaryButtonClass} px-2 text-[11px] sm:px-3`}
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </button>
        </div>
      </div>
    </article>
  );
}

function TicketPreviewModal({
  ticket,
  onClose,
}: {
  ticket: BuizzTicket;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-end bg-black/64 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-[var(--app-foreground)] shadow-[0_28px_90px_rgb(15 11 26 / 0.28)] sm:max-w-4xl sm:rounded-[28px] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-[var(--app-foreground)]">
            QR Ticket Preview
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-[var(--app-subtle)] text-[var(--app-foreground)] transition hover:bg-[var(--app-border)]"
            aria-label="Close ticket"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <QRTicket ticket={ticket} />
          <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <TicketQrPreview
              type="entry"
              payload={ticket.qrPayload ?? ticket.ticketId}
              previewMetadata
              disabled={ticket.status !== "Valid"}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function WishlistCard({
  item,
  onRemove,
}: {
  item: DiscoveryItem;
  onRemove: (id: string) => void;
}) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_14px_34px_rgb(15 11 26 / 0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[0.96] dark:border-[var(--app-border)] dark:bg-[var(--app-card)]">
      <img
        src={item.image}
        alt={item.title}
        className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
      />
      <div className="p-3">
        <h2 className="line-clamp-2 min-h-9 text-xs font-black leading-snug text-[var(--app-foreground)] sm:text-sm">
          {item.title}
        </h2>
        <p className="mt-1 truncate text-[11px] font-semibold text-[var(--app-muted)]">
          {item.venue}, {item.city}
        </p>
        <p className="mt-2 flex items-center gap-1 text-[11px] font-black text-[var(--app-foreground)]">
          <Star className="size-3 fill-[var(--color-brand-primary)] text-[var(--color-brand-primary)]" />
          {item.rating}
        </p>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="mt-3 min-h-9 w-full rounded-full bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] px-3 text-[10px] font-black text-white transition active:scale-[0.96]"
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function PassportStampCard({ stamp }: { stamp: PassportStamp }) {
  const visual = stickerVisuals[stamp.id] ?? {
    symbol: "★",
    gradient: "from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)]",
  };

  return (
    <article
      className={`group min-w-0 overflow-hidden rounded-[24px] border p-4 transition-all duration-300 hover:-translate-y-1 active:scale-[0.96] ${stamp.unlocked ? "border-[var(--color-brand-secondary)]/30 bg-[var(--app-elevated)] shadow-[0_0_0_1px_rgb(var(--brand-primary-rgb)/0.10),0_18px_42px_rgb(var(--brand-secondary-rgb)/0.20)] dark:bg-[var(--app-subtle)]" : "border-[var(--app-border)] bg-[var(--app-elevated)] opacity-80 grayscale dark:border-[var(--app-border)] dark:bg-[var(--app-card)]"}`}
    >
      <div
        className={`grid size-16 place-items-center rounded-[22px] bg-gradient-to-br text-3xl shadow-inner transition duration-500 ${stamp.unlocked ? `${visual.gradient} animate-pulse text-white group-hover:scale-105` : "from-[#E2E8F0] to-[#CBD5E1] text-[var(--app-muted)]"}`}
        aria-hidden="true"
      >
        {visual.symbol}
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-black text-[var(--app-foreground)]">
        {stamp.title}
      </h3>
      <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">
        {stamp.unlocked ? `Unlocked +${stamp.xp} XP` : "Locked until attendance"}
      </p>
    </article>
  );
}

function ToggleRow({
  icon,
  title,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-left text-[var(--app-foreground)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-subtle)] hover:shadow-xl active:scale-[0.96]"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--app-subtle)] text-[var(--color-brand-secondary)]">
        {icon}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-black text-[var(--app-foreground)]">
        {title}
      </span>

      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked
          ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))]"
          : "bg-[var(--app-border)]"
          }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-[var(--app-elevated)] shadow-sm transition ${checked ? "left-6" : "left-1"
            }`}
        />
      </span>
    </button>
  );
}

function SegmentedSetting({
  icon,
  title,
  value,
  options,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-[var(--app-foreground)]">
      <div className="flex min-w-0 items-center gap-2 text-sm font-black">
        <span className="text-[var(--color-brand-secondary)]">{icon}</span>
        <span className="truncate">{title}</span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-full bg-[var(--app-subtle)] p-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-9 rounded-full px-2 text-[11px] font-black transition-all duration-300 active:scale-[0.96] ${value === option
              ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[0_10px_22px_rgb(var(--brand-secondary-rgb)/0.18)]"
              : "text-[var(--app-muted)] hover:text-[var(--color-brand-primary)]"
              }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function SecurityRow({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-[var(--app-foreground)]">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--app-subtle)] text-[var(--color-brand-secondary)]">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-[var(--app-foreground)]">
          {title}
        </span>
        <span className="block truncate text-xs font-semibold text-[var(--app-muted)]">
          {value}
        </span>
      </span>
    </div>
  );
}

function PasswordModal({
  loading,
  onClose,
  onConfirm,
}: {
  loading: boolean;
  onClose: () => void;
  onConfirm: (currentPassword: string, newPassword: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  return (
    <ModalFrame title="Change Password" onClose={onClose}>
      <div className="grid gap-3">
        <ProfileInput
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <ProfileInput
          label="New password"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <p className="text-xs font-semibold leading-5 text-[var(--app-muted)]">
          Production will verify the current password and save the new one
          through the backend.
        </p>
      </div>
      <ModalActions
        onClose={onClose}
        loading={loading}
        loadingText="Saving..."
        confirmLabel="Save Password"
        onConfirm={() => onConfirm(currentPassword, newPassword)}
        disabled={!currentPassword || newPassword.length < 6}
      />
    </ModalFrame>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  loading,
  danger,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalFrame title={title} onClose={onClose} narrow>
      <p className="text-sm font-semibold leading-6 text-[var(--app-muted)]">
        {description}
      </p>
      <ModalActions
        onClose={onClose}
        loading={loading}
        loadingText="Processing..."
        confirmLabel={confirmLabel}
        onConfirm={onConfirm}
        danger={danger}
      />
    </ModalFrame>
  );
}

function ModalFrame({
  title,
  onClose,
  children,
  narrow,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-end bg-black/64 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <section
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-[var(--app-foreground)] shadow-[0_28px_90px_rgb(15 11 26 / 0.28)] dark:border-[var(--app-border)] dark:bg-[var(--app-card)] sm:rounded-[28px] sm:p-5 ${narrow ? "sm:max-w-md" : "sm:max-w-2xl"}`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-[var(--app-elevated)] transition hover:bg-[var(--app-border)] dark:bg-[var(--app-subtle)]"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-4">{children}</div>
      </section>
    </div>
  );
}

function ModalActions({
  onClose,
  loading,
  loadingText,
  confirmLabel,
  onConfirm,
  disabled,
  danger,
}: {
  onClose: () => void;
  loading: boolean;
  loadingText: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className={secondaryButtonClass}>
        Cancel
      </button>
      <LoadingButton
        loading={loading}
        loadingText={loadingText}
        disabled={disabled}
        onClick={onConfirm}
        className={`min-h-11 rounded-full px-5 text-sm font-black text-white transition-all duration-300 hover:-translate-y-1 active:scale-[0.96] disabled:opacity-50 ${danger ? "bg-[var(--color-brand-danger)] dark:bg-[var(--color-brand-danger)]" : "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))]"}`}
      >
        {confirmLabel}
      </LoadingButton>
    </div>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black">
      {label}
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-bold text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-secondary)] focus:shadow-[0_0_0_4px_rgb(var(--brand-secondary-rgb)/0.12)] dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)]"
      />
    </label>
  );
}

function EmptyAccountState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-5 grid min-h-72 place-items-center rounded-[28px] border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center text-[var(--color-brand-secondary)] dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)]">
      <div className="min-w-0">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--app-elevated)] dark:bg-[var(--app-border)]">
          {icon}
        </div>
        <h2 className="mt-4 text-xl font-black text-[var(--app-foreground)]">
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-[var(--app-muted)]">
          {description}
        </p>
        {action ? (
          <div className="mt-5 flex justify-center">{action}</div>
        ) : null}
      </div>
    </div>
  );
}

function MobileBottomNav({ activePath }: { activePath: string }) {
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-[26px] border border-white/40 bg-[var(--app-elevated)] p-2 shadow-[0_20px_60px_rgb(15 11 26 / 0.18)] backdrop-blur-xl dark:border-[var(--app-border)] dark:bg-[var(--app-card)]/90 lg:hidden"
      aria-label="Mobile profile navigation"
    >
      <MobileNavItem
        href="/"
        icon={<Home className="size-4" />}
        label="Home"
        active={activePath === "/"}
      />
      <MobileNavItem
        href="/events"
        icon={<Search className="size-4" />}
        label="Events"
        active={activePath === "/events"}
      />
      <MobileNavItem
        href="/profile/tickets"
        icon={<Ticket className="size-4" />}
        label="Tickets"
        active={activePath === "/profile/tickets"}
      />
      <MobileNavItem
        href="/profile/wishlist"
        icon={<Heart className="size-4" />}
        label="Wishlist"
        active={activePath === "/profile/wishlist"}
      />
      <MobileNavItem
        href="/profile"
        icon={<UserCircle className="size-4" />}
        label="Profile"
        active={activePath === "/profile"}
      />
    </nav>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black transition-all duration-300 active:scale-[0.96] ${active ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[var(--shadow-brand)]" : "text-[var(--app-muted)]"}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[0_14px_30px_rgb(var(--brand-secondary-rgb)/0.18)]">
        {icon}
      </span>
      <h2 className="truncate text-base font-black text-[var(--app-foreground)]">
        {title}
      </h2>
    </div>
  );
}

function StatsGrid({
  stats,
}: {
  stats: { label: string; value: number | string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-center shadow-[0_14px_30px_rgb(15 11 26 / 0.05)] dark:border-[var(--app-border)] dark:bg-[var(--app-card)] sm:p-4">
          <p className="truncate text-[10px] font-black uppercase text-[var(--app-muted)] sm:text-xs">
            {stat.label}
          </p>
          <p className="mt-1 text-2xl font-black text-[var(--app-foreground)] sm:mt-2 sm:text-3xl">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function PassportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[var(--app-subtle)] p-3 dark:bg-[var(--app-elevated)]/10">
      <p className="truncate text-[10px] font-black uppercase text-[var(--app-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-2xl font-black text-[var(--app-foreground)]">{value}</p>
    </div>
  );
}

function MetaLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="truncate">{text}</span>
    </p>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-[10px] font-black uppercase text-[var(--color-brand-secondary)] dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)]">
      {label}
    </span>
  );
}

function tabMatchesTicket(tab: TicketTab, ticket: BuizzTicket) {
  if (tab === "Upcoming")
    return ticket.status === "Valid" || ticket.status === "Transferred";
  if (tab === "Past")
    return ticket.status === "Used" || ticket.status === "Expired";
  return (
    ticket.status === "Cancelled" ||
    ticket.status === "Refunded" ||
    ticket.status === "Blocked"
  );
}

function bookingStatus(ticket: BuizzTicket) {
  if (ticket.status === "Valid" || ticket.status === "Transferred")
    return "Confirmed";
  if (ticket.status === "Used") return "Completed";
  if (ticket.status === "Refunded") return "Refunded";
  if (ticket.status === "Cancelled" || ticket.status === "Blocked")
    return "Cancelled";
  return ticket.status;
}

function ticketCount(tickets: BuizzTicket[]) {
  return tickets.reduce(
    (total, ticket) =>
      total + ticket.lineItems.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );
}

function uniqueTicketsByBookingId(tickets: BuizzTicket[]) {
  const groups = new Map<string, BuizzTicket>();

  tickets.forEach((ticket) => {
    const key = ticket.bookingId || ticket.ticketId;
    const existing = groups.get(key);
    if (!existing || new Date(ticket.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      groups.set(key, {
        ...ticket,
        ticketId: ticket.bookingId || ticket.ticketId,
      });
    }
  });

  return Array.from(groups.values());
}

async function downloadTicketAndPass(ticket: BuizzTicket) {
  downloadTicketPdf(ticket);
}

function openWhatsApp(ticket: BuizzTicket) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.buizz.com/api/v1";
  const ticketNumber = ticket.ticketId || ticket.bookingId;
  const ticketLink = typeof window === "undefined" ? "/profile/tickets" : `${window.location.origin}/profile/tickets`;
  const pdfLink = ticketNumber ? `${API_BASE}/tickets/${encodeURIComponent(ticketNumber)}/pdf` : "";
  const text = encodeURIComponent(
    [
      `Buizz ticket: ${ticket.eventName} on ${ticket.date} at ${ticket.time}. Booking ID ${ticket.bookingId}.`,
      `Ticket page: ${ticketLink}`,
      pdfLink ? `Ticket PDF: ${pdfLink}` : "",
    ].filter(Boolean).join("\n"),
  );
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}

function loadAccountSettings(): AccountSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const stored = window.localStorage.getItem(accountSettingsKey);
    if (!stored) return defaultSettings;
    const parsed = JSON.parse(stored) as Partial<AccountSettings> & {
      marketingPreferences?: boolean;
    };
    return {
      ...defaultSettings,
      ...parsed,
      promotions: parsed.promotions ?? parsed.marketingPreferences ?? defaultSettings.promotions,
      language: ["English", "Hindi", "Marathi"].includes(parsed.language ?? "")
        ? (parsed.language as AccountSettings["language"])
        : defaultSettings.language,
      region: ["Maharashtra", "Goa", "Karnataka"].includes(parsed.region ?? "")
        ? (parsed.region as AccountSettings["region"])
        : defaultSettings.region,
    };
  } catch {
    return defaultSettings;
  }
}

function toAppTheme(mode: ThemeMode): AppThemeMode {
  if (mode === "Dark") return "dark";
  if (mode === "Light") return "light";
  return "system";
}
function formatDisplayDate(value?: string) {
  if (!value) return "Date not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name?: string) {
  if (!name) return "BU";

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
