"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Copy,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Globe2,
  Headphones,
  Heart,
  Home,
  KeyRound,
  Lock,
  LogOut,
  MailCheck,
  MapPin,
  MessageCircle,
  Moon,
  PhoneCall,
  QrCode,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
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
import { downloadCalendarInvite } from "@/features/booking/BookingFlow";
import type { DiscoveryItem } from "@/features/discovery/data";
import { serverEventToDiscoveryItem } from "@/features/discovery/serverEventAdapter";
import {
  serverTicketToBuizzTicket,
  stampsFromTickets,
} from "@/features/account/serverTicketAdapter";
import { BuizzTicketCard, downloadTicketPdf, shareTicket } from "@/features/tickets";
import { TicketQrPreview } from "@/features/tickets/TicketQrPreview";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { useAppStore, type ThemeMode as AppThemeMode } from "@/store/app.store";
import { useAuthStore, type PublicUser } from "@/store/auth.store";
import type { BuizzTicket } from "@/store/ticket.store";
import {
  useChangePasswordMutation,
  useGetEventsQuery,
  useGetMyTicketsQuery,
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "@/store/api";
import { useWishlistStore } from "@/store/wishlist.store";

type ProfileModel = {
  id: string;
  displayId?: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  city: string;
  joinedAt: string;
  level: number;
};

type ProfileSettings = {
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  marketingPreferences: boolean;
  privacyControls: boolean;
  communicationSettings: boolean;
  themeMode: ThemeMode;
  language: "English";
  region: RegionOption;
};

type ThemeMode = "Light" | "Dark" | "System";
type RegionOption = "Maharashtra" | "Delhi" | "Karnataka" | "Goa" | "Gujarat" | "Telangana";
type ProfileModal = "edit" | "password" | "logout" | "delete" | "qr" | "share" | null;
type EventTab = "Upcoming" | "Past" | "Cancelled";

const profileImage = "/images/profile.jpg";
const settingsStorageKey = "buizz-profile-settings-v2";
const tabs: EventTab[] = ["Upcoming", "Past", "Cancelled"];

const pageClass =
  "buizz-profile-page bg-[var(--app-background)] text-[var(--app-foreground)]";

const cardClass =
  "buizz-profile-card border border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-foreground)] shadow-[0_14px_36px_rgb(15_23_42/0.06)] dark:shadow-[0_18px_48px_rgb(0_0_0/0.28)]";

const softCardClass =
  "buizz-profile-soft-card border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)]";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgb(var(--brand-primary-rgb)/0.20)] transition hover:bg-[var(--color-brand-secondary)] active:scale-[0.98]";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-5 text-sm font-bold text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] active:scale-[0.98]";

const ghostButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-xs font-bold text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)] active:scale-[0.98]";

const dangerButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-brand-danger)]/35 bg-[var(--color-brand-danger)]/10 px-4 text-xs font-bold text-[var(--color-brand-danger)] transition hover:bg-[var(--color-brand-danger)]/15 active:scale-[0.98]";

const iconPillClass =
  "grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]";

const settingsActionClass =
  "flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-left text-sm font-bold text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)] active:scale-[0.98]";

const defaultSettings: ProfileSettings = {
  emailNotifications: true,
  whatsappNotifications: true,
  marketingPreferences: false,
  privacyControls: true,
  communicationSettings: true,
  themeMode: "System",
  language: "English",
  region: "Maharashtra",
};

export function ProfilePageContent() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const setUser = useAuthStore((state) => state.setUser);
  const savedIds = useWishlistStore((state) => state.savedIds);
  const { data: profileData, isLoading: profileLoading } = useGetProfileQuery(undefined, {
    skip: status !== "authenticated",
  });
  const { data: ticketsData } = useGetMyTicketsQuery(
    { page: 1, limit: 100 },
    { skip: status !== "authenticated" },
  );
  const [updateProfileRequest] = useUpdateProfileMutation();
  const [changePasswordRequest] = useChangePasswordMutation();
  const tickets = useMemo(
    () => (ticketsData?.data?.tickets ?? []).map(serverTicketToBuizzTicket),
    [ticketsData],
  );
  const bookingPasses = useMemo(() => uniqueTicketsByBookingId(tickets), [tickets]);
  const stamps = useMemo(() => stampsFromTickets(tickets), [tickets]);
  const setAppTheme = useAppStore((state) => state.setTheme);
  const { loadingKey, runAction } = useActionFeedback();

  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [settings, setSettings] = useState<ProfileSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<EventTab>("Upcoming");
  const [modal, setModal] = useState<ProfileModal>(null);
  const [hydrating, setHydrating] = useState(true);

  const xp = useMemo(
    () => stamps.filter((stamp) => stamp.unlocked).reduce((total, stamp) => total + stamp.xp, 0),
    [stamps]
  );

  const level = Math.max(1, Math.floor(xp / 150) + 1);
  const recentTicket = bookingPasses[0];
  const refundCount = useMemo(() => bookingPasses.filter((ticket) => ticket.status === "Refunded").length, [bookingPasses]);
  const eventGroups = useMemo(() => groupTickets(bookingPasses), [bookingPasses]);
  const displayedTickets = eventGroups[activeTab];

  useEffect(() => {
    const timer = window.setTimeout(() => setHydrating(false), 320);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfile(profileData?.data ? buildProfileFromServer(profileData.data, level) : buildBaseProfile(user, level));
    setSettings(loadSettings());
  }, [level, profileData, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    } catch {
      // Keep UI working even if browser storage is full.
    }
  }, [settings]);

  if (hydrating || profileLoading) return <ProfileSkeleton />;

  if (status !== "authenticated" || !user || !profile) {
    return <AuthRequired />;
  }

  const emailVerified = Boolean(user.email && user.isEmailVerified);
  const phoneVerified = Boolean(user.phone && user.isPhoneVerified);
  const completionScore = getProfileCompletion(profile, emailVerified, phoneVerified);

  const copyCustomerId = () =>
    runAction(
      "copy-customer-id",
      async () => {
        await copyTextToClipboard(getCustomerCode(profile));
      },
      "Customer ID copied"
    );

  const saveProfile = (nextProfile: ProfileModel) =>
    runAction(
      "save-profile",
      async () => {
        const normalizedProfile = { ...nextProfile, avatarUrl: profileImage };
        const updated = await updateProfileRequest({
          name: normalizedProfile.name,
          phone: normalizedProfile.phone,
          avatar: normalizedProfile.avatarUrl,
        }).unwrap();
        const serverProfile = buildProfileFromServer(updated.data, level);
        setProfile(serverProfile);
        setUser({
          ...user,
          name: serverProfile.name,
          email: serverProfile.email || undefined,
          phone: serverProfile.phone || undefined,
        } as NonNullable<PublicUser>);
      },
      "Profile updated",
      () => setModal(null)
    );

  const changePassword = (currentPassword: string, newPassword: string) =>
    runAction(
      "change-password",
      async () => {
        await changePasswordRequest({ currentPassword, newPassword }).unwrap();
      },
      "Password updated",
      () => setModal(null)
    );

  const requestDelete = () =>
    runAction(
      "delete-account",
      async () => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            `buizz-delete-account-request-${profile.id}`,
            JSON.stringify({ requestedAt: new Date().toISOString(), status: "Pending verification" })
          );
        }
      },
      "Delete account request submitted",
      () => setModal(null)
    );

  const confirmLogout = () =>
    runAction(
      "logout-profile",
      async () => {
        logout();
        router.push("/login");
      },
      "Logged out"
    );

  const runTicketAction = (key: string, callback: () => void | Promise<void>, successText: string) =>
    runAction(
      key,
      async () => {
        if (!recentTicket) throw new Error("Book a ticket first to use this action.");
        await callback();
      },
      successText
    );

  const downloadLatestTicket = () =>
    runTicketAction(
      "download-ticket",
      async () => {
        if (!recentTicket) return;
        downloadTicketPdf(recentTicket);
      },
      "Ticket download prepared"
    );

  const shareLatestTicket = () =>
    runTicketAction(
      "share-ticket",
      async () => {
        if (recentTicket) await shareTicket(recentTicket);
      },
      "Ticket share ready"
    );

  const openWhatsApp = () =>
    runTicketAction(
      "whatsapp-ticket",
      () => {
        if (!recentTicket) return;
        const text = encodeURIComponent(
          `Buizz ticket: ${recentTicket.eventName} on ${recentTicket.date} at ${recentTicket.time}. Booking ID ${recentTicket.bookingId}.`
        );
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
      },
      "WhatsApp opened"
    );

  const addToCalendar = () =>
    runTicketAction(
      "calendar-ticket",
      () => {
        if (recentTicket) downloadCalendarInvite(recentTicket);
      },
      "Calendar invite downloaded"
    );

  return (
    <main className={`min-h-dvh w-full overflow-x-hidden ${pageClass} pb-28 md:pb-10`}>
      <div className="mx-auto grid w-full max-w-[1360px] gap-5 px-3 py-4 min-[390px]:px-4 sm:px-6 sm:py-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:px-8 xl:gap-6">
        <aside className="hidden min-w-0 lg:block">
          <div className={`${cardClass} sticky top-24 overflow-hidden rounded-[22px] p-4`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xl font-black tracking-[-0.03em] text-[var(--app-foreground)]">
                  My Account
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-[var(--app-muted)]/70">
                  {getCustomerCode(profile)}
                </p>
              </div>
              <Link
                href="/"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                aria-label="Close account menu"
              >
                <X className="size-4" />
              </Link>
            </div>

            <div className="mb-5 flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-lg font-black text-white shadow-[0_14px_30px_rgb(var(--brand-secondary-rgb)/0.18)]">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  getProfileInitials(profile.name)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[var(--app-foreground)]">{profile.name}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-[var(--app-muted)]/70">
                  {profile.email || "Email not connected"}
                </p>
                <button
                  type="button"
                  onClick={() => setModal("edit")}
                  className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--app-elevated)] px-3 text-[11px] font-black text-[var(--color-brand-primary)] transition hover:bg-[var(--app-hover)]"
                >
                  Edit profile
                </button>
              </div>
            </div>

            <nav className="grid gap-1.5" aria-label="Account navigation">
              <Link href="/profile" className="flex min-h-12 items-center gap-3 rounded-2xl bg-[var(--app-subtle)] px-3 text-sm font-black text-[var(--color-brand-primary)]">
                <UserCircle className="size-4" />
                Profile
                <ChevronRight className="ml-auto size-4" />
              </Link>
              <Link href="/profile/tickets" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-[var(--app-foreground)] transition hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)]">
                <Ticket className="size-4 text-[var(--app-muted)]" />
                My Tickets
              </Link>
              <Link href="/profile/bookings" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-[var(--app-foreground)] transition hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)]">
                <CalendarDays className="size-4 text-[var(--app-muted)]" />
                Booking History
              </Link>
              <Link href="/profile/wishlist" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-[var(--app-foreground)] transition hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)]">
                <Heart className="size-4 text-[var(--app-muted)]" />
                Wishlist
              </Link>
              <Link href="/profile/settings" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-[var(--app-foreground)] transition hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)]">
                <Settings className="size-4 text-[var(--app-muted)]" />
                Settings
              </Link>
              <Link href="/help-center" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-[var(--app-foreground)] transition hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)]">
                <Headphones className="size-4 text-[var(--app-muted)]" />
                Help & Support
              </Link>
              <button type="button" onClick={() => setModal("logout")} className="mt-3 flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--color-brand-danger)]/25 bg-[var(--color-brand-danger)]/10 px-3 text-left text-sm font-black text-[var(--color-brand-danger)] transition hover:bg-[var(--color-brand-danger)]/15">
                <LogOut className="size-4" />
                Sign Out
              </button>
            </nav>
          </div>
        </aside>

        <section className="grid min-w-0 gap-5 xl:gap-6">
          <ProfileHero
            profile={profile}
            emailVerified={emailVerified}
            phoneVerified={phoneVerified}
            ticketCount={bookingPasses.length}
            savedCount={savedIds.length}
            completionScore={completionScore}
            onEdit={() => setModal("edit")}
            onCopyCustomerId={copyCustomerId}
            onLogout={() => setModal("logout")}
          />

          <RecentTicketCard
            ticket={recentTicket}
            onView={() => router.push("/profile/tickets")}
            onDownload={downloadLatestTicket}
            onShare={() => setModal("share")}
            onWhatsApp={openWhatsApp}
            onCalendar={addToCalendar}
            onQr={() => setModal("qr")}
            loadingKey={loadingKey}
          />

          {bookingPasses.length ? (
            <PastEventHistory
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tickets={displayedTickets}
            />
          ) : null}

          <SupportPanel />
        </section>
      </div>

      <MobileBottomNav />

      <AnimatePresence>
        {modal === "edit" ? (
          <EditProfileModal
            profile={profile}
            loading={loadingKey === "save-profile"}
            onClose={() => setModal(null)}
            onSave={saveProfile}
          />
        ) : null}

        {modal === "password" ? (
          <ChangePasswordModal
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
            loading={loadingKey === "logout-profile"}
            onClose={() => setModal(null)}
            onConfirm={confirmLogout}
          />
        ) : null}

        {modal === "delete" ? (
          <ConfirmModal
            title="Delete account request"
            description="Your request will be queued for identity verification before any account data is removed."
            confirmLabel="Submit Request"
            loading={loadingKey === "delete-account"}
            danger
            onClose={() => setModal(null)}
            onConfirm={requestDelete}
          />
        ) : null}

        {modal === "qr" && recentTicket ? (
          <QRPreviewModal ticket={recentTicket} onClose={() => setModal(null)} />
        ) : null}

        {modal === "share" && recentTicket ? (
          <ShareTicketModal
            ticket={recentTicket}
            loading={loadingKey === "share-ticket"}
            onNativeShare={shareLatestTicket}
            onWhatsApp={openWhatsApp}
            onClose={() => setModal(null)}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

export function SavedWishlistPage() {
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
    <main className={`min-h-dvh overflow-x-hidden ${pageClass} px-3 py-4 min-[390px]:px-4 sm:px-6 sm:py-6 lg:px-8`}>
      <section className="mx-auto w-full max-w-[1480px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <BuizzLogo size="md" />
            <h1 className="mt-3 text-2xl font-black text-[var(--app-foreground)] sm:text-3xl">
              Wishlist
            </h1>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]/70">
              Your saved events in one clean list.
            </p>
          </div>

          <Link href="/events" className={primaryButtonClass}>
            Discover More
          </Link>
        </div>

        {isLoading || isFetching ? (
          <EmptyPanel
            icon={<Heart className="size-9" />}
            title="Loading wishlist"
            description="Fetching saved events from the server."
          />
        ) : isError ? (
          <EmptyPanel
            icon={<Heart className="size-9" />}
            title="Wishlist unavailable"
            description="We could not load published events from the server."
          />
        ) : savedItems.length ? (
          <div className="grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {savedItems.map((item) => (
              <WishlistCard key={item.id} item={item} onRemove={removeSaved} />
            ))}
          </div>
        ) : (
          <EmptyPanel
            icon={<Heart className="size-9" />}
            title="No saved events"
            description="Tap the heart on any event to save it here."
          />
        )}
      </section>
    </main>
  );
}

function DashboardMetricStrip({
  ticketCount,
  savedCount,
  refundCount,
  profile,
}: {
  ticketCount: number;
  savedCount: number;
  refundCount: number;
  profile: ProfileModel;
}) {
  return (
    <section className="grid gap-3 min-[430px]:grid-cols-2 xl:grid-cols-4">
      <DashboardMetricCard
        icon={<Ticket className="size-5" />}
        label="Tickets"
        value={String(ticketCount)}
        helper="Current and past passes"
      />

      <DashboardMetricCard
        icon={<Heart className="size-5" />}
        label="Wishlist"
        value={String(savedCount)}
        helper="Saved events"
      />

      <DashboardMetricCard
        icon={<FileText className="size-5" />}
        label="Refunds"
        value={String(refundCount)}
        helper="Requests raised"
      />

      <DashboardMetricCard
        icon={<CalendarDays className="size-5" />}
        label="Member Since"
        value={formatShortMonth(profile.joinedAt)}
        helper={profile.city}
      />
    </section>
  );
}
function DashboardMetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className={`${cardClass} rounded-[22px] p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-[26px] sm:p-4`}>
      <div className="flex items-start justify-between gap-3">
        <span className={iconPillClass}>{icon}</span>
        <span className="rounded-full bg-[var(--app-subtle)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)] dark:bg-[var(--app-subtle)]">
          Active
        </span>
      </div>

      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]/60">
        {label}
      </p>

      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-3xl font-black text-[var(--app-foreground)]">{value}</p>
        <p className="text-right text-xs font-semibold text-[var(--app-muted)]/60">
          {helper}
        </p>
      </div>
    </article>
  );
}

function ProfileQuickBar({
  profile,
  completionScore,
  upcomingCount,
  ticketCount,
  savedCount,
}: {
  profile: ProfileModel;
  completionScore: number;
  upcomingCount: number;
  ticketCount: number;
  savedCount: number;
}) {
  return (
    <section className={`${cardClass} grid gap-3 rounded-[24px] p-3 sm:rounded-[28px] sm:p-4 lg:grid-cols-[minmax(0,1fr)_320px]`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <ProfileQuickItem
          icon={<Ticket className="size-4" />}
          label="My Tickets"
          value={String(ticketCount)}
          helper={`${upcomingCount} upcoming`}
          href="/profile/tickets"
        />
        <ProfileQuickItem
          icon={<Heart className="size-4" />}
          label="Wishlist"
          value={String(savedCount)}
          helper="Saved for later"
          href="/profile/wishlist"
        />
        <ProfileQuickItem
          icon={<Headphones className="size-4" />}
          label="Support"
          value="Help"
          helper="Contact Buizz"
          href="/help-center"
        />
      </div>

      <div className={`${softCardClass} grid content-center gap-2 rounded-2xl p-3`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]/60">
              Profile completion
            </p>
            <p className="mt-1 truncate text-sm font-black text-[var(--app-foreground)]">
              {completionScore}% complete • {getCustomerCode(profile)}
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
            <ShieldCheck className="size-5" />
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-[var(--app-border)]">
          <span
            className="block h-full rounded-full bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))]"
            style={{ width: `${completionScore}%` }}
          />
        </div>
      </div>
    </section>
  );
}
function ProfileQuickItem({
  icon,
  label,
  value,
  helper,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`${softCardClass} group flex min-h-24 min-w-0 items-center gap-3 rounded-2xl p-3 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-elevated)] hover:shadow-xl`}
    >
      <span className={iconPillClass}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-black uppercase tracking-[0.12em] text-[var(--app-muted)]/60">
          {label}
        </span>
        <span className="mt-1 block text-2xl font-black text-[var(--app-foreground)]">
          {value}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--app-muted)]/70">
          {helper}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-[var(--app-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-brand-primary)]" />
    </Link>
  );
}

function ProfileHero({
  profile,
  emailVerified,
  phoneVerified,
  ticketCount,
  savedCount,
  completionScore,
  onEdit,
  onCopyCustomerId,
  onLogout,
}: {
  profile: ProfileModel;
  emailVerified: boolean;
  phoneVerified: boolean;
  ticketCount: number;
  savedCount: number;
  completionScore: number;
  onEdit: () => void;
  onCopyCustomerId: () => void;
  onLogout: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${cardClass} overflow-hidden rounded-[22px]`}
    >
      <div className="border-b border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-4 sm:px-6 lg:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              Customer Profile
            </p>
            <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.03em] text-[var(--app-foreground)] sm:text-3xl">
              My Account
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEdit} className={primaryButtonClass}>
              <UserCircle className="size-4" />
              Edit Profile
            </button>
            <button type="button" onClick={onLogout} className={dangerButtonClass}>
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:p-7">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <ProfileAvatar profile={profile} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <VerificationBadge verified={emailVerified} label="Email verified" />
              <VerificationBadge verified={phoneVerified} label="Phone verified" />
            </div>

            <h2 className="mt-3 break-words text-[clamp(1.75rem,4.5vw,3.1rem)] font-black leading-tight tracking-[-0.04em] text-[var(--app-foreground)]">
              {profile.name}
            </h2>

            <div className="mt-3 grid gap-2 text-sm font-medium text-[var(--app-muted)] md:grid-cols-2">
              <p className="flex min-w-0 items-center gap-2">
                <MailCheck className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
                <span className="truncate">{profile.email || "Email not connected"}</span>
              </p>
              <p className="flex min-w-0 items-center gap-2">
                <PhoneCall className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
                <span className="truncate">{profile.phone || "Phone not connected"}</span>
              </p>
              <p className="flex min-w-0 items-center gap-2">
                <MapPin className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
                <span className="truncate">{profile.city}</span>
              </p>
              <button
                type="button"
                onClick={onCopyCustomerId}
                className="flex min-w-0 items-center gap-2 text-left text-[var(--color-brand-primary)] transition hover:text-[var(--color-brand-secondary)]"
              >
                <Copy className="size-4 shrink-0" />
                <span className="truncate">ID {getCustomerCode(profile)}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-[20px] border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
          <div className="grid grid-cols-2 gap-2">
            <HeroStat label="Tickets" value={String(ticketCount)} />
            <HeroStat label="Wishlist" value={String(savedCount)} />
          </div>

          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--app-muted)]">
                  Profile completion
                </p>
                <p className="mt-1 text-sm font-black text-[var(--app-foreground)]">
                  {completionScore}% complete
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-bold text-[var(--color-brand-primary)]">
                Active
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--app-border)]">
              <span
                className="block h-full rounded-full bg-[var(--color-brand-primary)] transition-all"
                style={{ width: `${completionScore}%` }}
              />
            </div>
          </div>

          <div className="grid gap-1 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-sm font-semibold text-[var(--app-foreground)]">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[var(--color-brand-primary)]" />
              Joined {formatDisplayDate(profile.joinedAt)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-[var(--color-brand-primary)]" />
              {profile.city}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
function ProfileAvatar({
  profile,
}: {
  profile: {
    name: string;
    avatarUrl?: string | null;
    image?: string | null;
    photoURL?: string | null;
    picture?: string | null;
  };
}) {
  const avatar = profile.avatarUrl || profile.photoURL || profile.image || profile.picture;

  const initials =
    profile.name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "BU";

  return (
    <div className="relative size-24 shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] p-1 shadow-[0_12px_30px_rgb(15_23_42/0.10)] sm:size-28">
      <div className="h-full w-full overflow-hidden rounded-full bg-[var(--app-subtle)]">
        {avatar ? (
          <img
            src={avatar}
            alt={profile.name}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--app-subtle)] text-3xl font-black text-[var(--color-brand-primary)]">
            {initials}
          </div>
        )}
      </div>

      <span className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-4 border-[var(--app-elevated)] bg-[var(--color-brand-primary)] text-white">
        <BadgeCheck className="size-3.5" />
      </span>
    </div>
  );
}

function VerificationBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black ${verified
        ? "border-[var(--color-brand-primary)] bg-[var(--app-elevated)] text-[var(--color-brand-primary)] dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)]"
        : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)] dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)]"
        }`}
    >
      {verified ? <BadgeCheck className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
      {label}
    </span>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-center shadow-[0_8px_18px_rgb(15 23 42 / 0.04)] dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)]">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]/60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-[var(--app-foreground)]">{value}</p>
    </div>
  );
}

function AccountDetailsCard({ profile, onEdit }: { profile: ProfileModel; onEdit: () => void }) {
  const rows = [
    { label: "Customer ID", value: getCustomerCode(profile), icon: ShieldCheck },
    { label: "Full Name", value: profile.name, icon: UserCircle },
    { label: "Email Address", value: profile.email || "Not connected", icon: MailCheck },
    { label: "Mobile Number", value: profile.phone || "Not connected", icon: PhoneCall },
    { label: "City", value: profile.city, icon: MapPin },
    { label: "Joined", value: formatDisplayDate(profile.joinedAt), icon: CalendarDays },
  ];

  return (
    <SectionCard
      title="Personal Details"
      icon={<UserCircle className="size-5" />}
      action={
        <button type="button" onClick={onEdit} className={ghostButtonClass}>
          Edit
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex min-w-0 gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--app-subtle)] text-[var(--color-brand-primary)]">
              <Icon className="size-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                {label}
              </span>
              <span className="mt-1 block min-w-0 break-words text-sm font-bold text-[var(--app-foreground)]">
                {value}
              </span>
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function TicketWallet({
  ticketCount,
  savedCount,
  refundCount,
}: {
  ticketCount: number;
  savedCount: number;
  refundCount: number;
}) {
  return (
    <SectionCard title="Booking Overview" icon={<WalletCards className="size-5" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <WalletTicketCard
          href="/profile/tickets"
          icon={<Ticket className="size-5" />}
          title="My Tickets"
          value={String(ticketCount)}
          description="View active and past passes"
        />

        <WalletTicketCard
          href="/profile/wishlist"
          icon={<Heart className="size-5" />}
          title="Wishlist"
          value={String(savedCount)}
          description="Events saved for later"
        />

        <WalletTicketCard
          href="/profile/bookings"
          icon={<CalendarDays className="size-5" />}
          title="Booking History"
          value={String(ticketCount)}
          description="All completed orders"
        />

        <WalletTicketCard
          href="/help-center"
          icon={<FileText className="size-5" />}
          title="Refund Requests"
          value={String(refundCount)}
          description="Track help and refund cases"
        />
      </div>
    </SectionCard>
  );
}

function WalletTicketCard({
  href,
  icon,
  title,
  value,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[112px] min-w-0 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-subtle)] active:scale-[0.98]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-[var(--app-foreground)]">
          {title}
        </span>
        <span className="mt-1 block line-clamp-2 text-xs font-medium leading-5 text-[var(--app-muted)]">
          {description}
        </span>
      </span>

      <span className="shrink-0 text-2xl font-black text-[var(--app-foreground)]">
        {value}
      </span>
    </Link>
  );
}

function RecentTicketCard({
  ticket,
  onView,
  onDownload,
  onShare,
  onWhatsApp,
  onCalendar,
  onQr,
  loadingKey,
}: {
  ticket?: BuizzTicket;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
  onWhatsApp: () => void;
  onCalendar: () => void;
  onQr: () => void;
  loadingKey: string | null;
}) {
  if (!ticket) {
    return (
      <SectionCard title="Recent Ticket" icon={<Ticket className="size-5" />}>
        <EmptyPanel
          icon={<Ticket className="size-9" />}
          title="No recent ticket"
          description="Book an event to unlock ticket actions."
          compact
        />
      </SectionCard>
    );
  }

  return (
    <section className={`${cardClass} min-w-0 rounded-[22px] p-4 sm:p-5 xl:max-w-[980px]`}>
      <div className="mb-4 flex flex-col gap-2 border-b border-[var(--app-border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
            Recent Ticket
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-[var(--app-foreground)] sm:text-2xl">
            Ticket actions
          </h2>
        </div>
        <p className="text-sm font-semibold text-[var(--app-muted)]">{getCountdownLabel(ticket)}</p>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(250px,320px)_minmax(320px,1fr)] xl:items-start">
        <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[22px] sm:max-w-[340px]">
          <BuizzTicketCard ticket={ticket} onView={onView} />
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
            <p className="text-sm font-black text-[var(--app-foreground)]">{ticket.eventName}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
              {ticket.date} • {ticket.time} • {ticket.venue}
            </p>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
            <RecentAction
              icon={<Download className="size-4" />}
              label="Download PDF"
              onClick={onDownload}
              loading={loadingKey === "download-ticket"}
            />

            <RecentAction
              icon={<Send className="size-4" />}
              label="Share Ticket"
              onClick={onShare}
            />

            <RecentAction
              icon={<MessageCircle className="size-4" />}
              label="WhatsApp"
              onClick={onWhatsApp}
              loading={loadingKey === "whatsapp-ticket"}
            />

            <RecentAction
              icon={<CalendarPlus className="size-4" />}
              label="Add To Calendar"
              onClick={onCalendar}
              loading={loadingKey === "calendar-ticket"}
            />

            <RecentAction icon={<QrCode className="size-4" />} label="QR Preview" onClick={onQr} />
            <RecentAction icon={<Eye className="size-4" />} label="View Ticket" onClick={onView} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PastEventHistory({
  activeTab,
  onTabChange,
  tickets,
}: {
  activeTab: EventTab;
  onTabChange: (tab: EventTab) => void;
  tickets: BuizzTicket[];
}) {
  return (
    <SectionCard title="Event History" icon={<CalendarDays className="size-5" />}>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-black transition-all duration-300 active:scale-[0.96] ${activeTab === tab
              ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[0_14px_30px_rgb(var(--brand-secondary-rgb)/0.22)]"
              : "border border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-muted)] hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] dark:bg-[var(--app-subtle)] dark:hover:text-[var(--app-foreground)]"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {tickets.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {tickets.slice(0, 6).map((ticket) => (
            <HistoryTicketCard key={ticket.ticketId} ticket={ticket} />
          ))}
        </div>
      ) : (
        <EmptyPanel
          icon={<CalendarDays className="size-9" />}
          title={`No ${activeTab.toLowerCase()} events`}
          description="Your matching ticket list is empty."
          compact
        />
      )}
    </SectionCard>
  );
}

function HistoryTicketCard({ ticket }: { ticket: BuizzTicket }) {
  return (
    <article className={`${softCardClass} grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2 rounded-[20px] p-2 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-elevated)] hover:shadow-xl active:scale-[0.96] min-[420px]:grid-cols-[88px_minmax(0,1fr)] min-[420px]:gap-3 sm:rounded-[22px]`}>
      <img src={ticket.eventImage} alt={ticket.eventName} className="h-full min-h-[112px] w-full rounded-2xl object-cover" />

      <div className="min-w-0 py-1 pr-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-black text-[var(--app-foreground)]">
            {ticket.eventName}
          </h3>
          <span className="shrink-0 rounded-full bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black text-[var(--color-brand-secondary)] dark:bg-[var(--app-subtle)]">
            {ticket.status}
          </span>
        </div>

        <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[var(--app-muted)]/70">
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="truncate">{ticket.date}</span>
        </p>

        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[var(--app-muted)]/70">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{ticket.venue}</span>
        </p>

        <Link href="/profile/tickets" className="mt-3 inline-flex min-h-8 items-center justify-center rounded-full bg-[var(--app-foreground)] px-3 text-[11px] font-black text-white transition hover:bg-[var(--color-brand-secondary)] dark:bg-[var(--app-elevated)] dark:text-[var(--app-foreground)]">
          View Ticket
        </Link>
      </div>
    </article>
  );
}

function SettingsPanel({
  settings,
  onSettingsChange,
}: {
  settings: ProfileSettings;
  onSettingsChange: (settings: ProfileSettings) => void;
}) {
  const updateSetting = <Key extends keyof ProfileSettings>(key: Key, value: ProfileSettings[Key]) => {
    onSettingsChange({ ...settings, language: "English", [key]: value });
  };

  return (
    <SectionCard title="Preferences" icon={<Settings className="size-5" />}>
      <SettingsGroup title="Notifications">
        <ToggleRow
          icon={<Bell className="size-4" />}
          title="Email notifications"
          checked={settings.emailNotifications}
          onChange={(value) => updateSetting("emailNotifications", value)}
        />

        <ToggleRow
          icon={<MessageCircle className="size-4" />}
          title="WhatsApp notifications"
          checked={settings.whatsappNotifications}
          onChange={(value) => updateSetting("whatsappNotifications", value)}
        />

        <ToggleRow
          icon={<Sparkles className="size-4"
          />}
          title="Promotions"
          checked={settings.marketingPreferences}
          onChange={(value) => updateSetting("marketingPreferences", value)}
        />
      </SettingsGroup>

      <SettingsGroup title="App Preferences">
        <ToggleRow
          icon={<Lock className="size-4" />}
          title="Privacy controls"
          checked={settings.privacyControls}
          onChange={(value) => updateSetting("privacyControls", value)}
        />

        <ToggleRow
          icon={<SlidersHorizontal className="size-4" />}
          title="Communication settings"
          checked={settings.communicationSettings}
          onChange={(value) => updateSetting("communicationSettings", value)}
        />

        <SegmentedSetting
          icon={<Moon className="size-4" />}
          title="Theme mode"
          value={settings.themeMode}
          options={["Light", "Dark", "System"]}
          onChange={(value) => updateSetting("themeMode", value as ThemeMode)}
        />

        <SelectSetting
          icon={<Globe2 className="size-4" />}
          title="Region"
          value={settings.region}
          options={["Maharashtra", "Goa", "Karnataka"]}
          onChange={(value) => updateSetting("region", value as RegionOption)}
        />
      </SettingsGroup>
    </SectionCard>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]/60">
        {title}
      </p>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-2">{children}</div>
    </div>
  );
}

function SecurityPanel({
  settings,
  onSettingsChange,
  emailVerified,
  phoneVerified,
  onPassword,
  onLogout,
  onDelete,
}: {
  settings: ProfileSettings;
  onSettingsChange: (settings: ProfileSettings) => void;
  emailVerified: boolean;
  phoneVerified: boolean;
  onPassword: () => void;
  onLogout: () => void;
  onDelete: () => void;
}) {
  const updateSetting = <Key extends keyof ProfileSettings>(key: Key, value: ProfileSettings[Key]) => {
    onSettingsChange({ ...settings, language: "English", [key]: value });
  };

  return (
    <SectionCard title="Security" icon={<ShieldCheck className="size-5" />}>
      <div className="grid gap-2 md:grid-cols-2">
        <SecurityRow
          icon={<MailCheck className="size-4" />}
          title="Email verification"
          value={emailVerified ? "Verified" : "Pending"}
        />

        <SecurityRow
          icon={<PhoneCall className="size-4" />}
          title="Phone verification"
          value={phoneVerified ? "Verified" : "Pending"}
        />

        <button type="button" onClick={onPassword} className={settingsActionClass}>
          <KeyRound className="size-4" />
          Change Password
        </button>

        <button type="button" onClick={onLogout} className={settingsActionClass}>
          <LogOut className="size-4" />
          Logout
        </button>

        <ToggleRow
          icon={<Lock className="size-4" />}
          title="Privacy settings"
          checked={settings.privacyControls}
          onChange={(value) => updateSetting("privacyControls", value)}
        />

        <ToggleRow
          icon={<Bell className="size-4" />}
          title="Notification settings"
          checked={settings.emailNotifications || settings.whatsappNotifications}
          onChange={(value) =>
            onSettingsChange({
              ...settings,
              language: "English",
              emailNotifications: value,
              whatsappNotifications: value,
            })
          }
        />

        <button
          type="button"
          onClick={onDelete}
          className={`${dangerButtonClass} min-h-12 justify-start rounded-2xl px-3 text-sm lg:col-span-2`}
        >
          <Trash2 className="size-4" />
          Delete account request
        </button>
      </div>
    </SectionCard>
  );
}

function SupportPanel() {
  const links = [
    { title: "Help Center", href: "/help-center", icon: Headphones, description: "Find answers quickly" },
    { title: "Privacy Policy", href: "/privacy-policy", icon: Lock, description: "Manage your data" },
    { title: "Contact Support", href: "/contact-us", icon: MessageCircle, description: "Talk to Buizz team" },
    { title: "Raise Ticket", href: "/help-center", icon: FileText, description: "Submit a support case" },
  ];

  return (
    <SectionCard title="Support" icon={<Headphones className="size-5" />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {links.map(({ title, href, icon: Icon, description }) => (
          <Link
            key={title}
            href={href}
            className={`${softCardClass} group flex min-h-20 min-w-0 items-center gap-3 rounded-2xl p-3 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-elevated)] hover:shadow-xl active:scale-[0.96] dark:hover:bg-[var(--app-hover)]`}
          >
            <span className={iconPillClass}>
              <Icon className="size-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-[var(--app-foreground)]">
                {title}
              </span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--app-muted)]/60">
                {description}
              </span>
            </span>

            <ChevronRight className="size-4 shrink-0 text-[var(--app-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-brand-primary)]" />
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function SectionCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${cardClass} min-w-0 rounded-[22px] p-4 sm:p-5`}
    >
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3 border-b border-[var(--app-border)] pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={iconPillClass}>{icon}</span>
          <h2 className="truncate text-lg font-black tracking-[-0.02em] text-[var(--app-foreground)]">
            {title}
          </h2>
        </div>

        {action}
      </div>

      <div className="grid min-w-0 gap-4">{children}</div>
    </motion.section>
  );
}

function SecurityRow({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className={`${softCardClass} flex min-h-12 min-w-0 items-center gap-3 rounded-2xl px-3`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--app-elevated)] text-[var(--color-brand-secondary)] shadow-[0_8px_18px_rgb(15 23 42 / 0.04)] dark:bg-[var(--app-subtle)]">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-[var(--app-foreground)]">
          {title}
        </span>
        <span className="block truncate text-xs font-semibold text-[var(--app-muted)]/70">
          {value}
        </span>
      </span>
    </div>
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
      className={`${softCardClass} flex min-h-12 min-w-0 items-center gap-3 rounded-2xl px-3 text-left shadow-[0_8px_18px_rgb(15 23 42 / 0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-elevated)] hover:shadow-xl active:scale-[0.96] dark:hover:bg-[var(--app-hover)]`}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--app-elevated)] text-[var(--color-brand-secondary)] shadow-[0_8px_18px_rgb(15 23 42 / 0.04)] dark:bg-[var(--app-subtle)]">
        {icon}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-black text-[var(--app-foreground)]">
        {title}
      </span>

      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked
          ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))]"
          : "bg-[var(--app-border)] dark:bg-[var(--app-border)]"
          }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"
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
    <div className={`${softCardClass} grid min-w-0 gap-2 rounded-2xl p-3`}>
      <div className="flex min-w-0 items-center gap-2 text-sm font-black text-[var(--app-foreground)]">
        <span className="text-[var(--color-brand-secondary)]">{icon}</span>
        <span className="truncate">{title}</span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-full bg-[var(--app-elevated)] p-1 dark:bg-[var(--app-subtle)]">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-9 rounded-full px-2 text-[11px] font-black transition-all duration-300 active:scale-[0.96] ${value === option
              ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[0_10px_22px_rgb(var(--brand-secondary-rgb)/0.18)]"
              : "text-[var(--app-muted)] hover:text-[var(--color-brand-primary)]/70 dark:hover:text-[var(--app-foreground)]"
              }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectSetting({
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
    <label className={`${softCardClass} grid min-w-0 gap-2 rounded-2xl p-3`}>
      <span className="flex min-w-0 items-center gap-2 text-sm font-black text-[var(--app-foreground)]">
        <span className="text-[var(--color-brand-secondary)]">{icon}</span>
        <span className="truncate">{title}</span>
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-secondary)] focus:shadow-[0_0_0_4px_rgb(var(--brand-secondary-rgb)/0.12)] dark:border-[var(--app-border)] dark:bg-[var(--app-elevated)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RecentAction({
  icon,
  label,
  onClick,
  loading,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <LoadingButton
      loading={loading}
      loadingText="Working..."
      onClick={onClick}
      className="flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-left text-sm font-bold text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)] active:scale-[0.98]"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--app-subtle)] text-[var(--color-brand-primary)]">
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </LoadingButton>
  );
}

function EditProfileModal({
  profile,
  loading,
  onClose,
  onSave,
}: {
  profile: ProfileModel;
  loading: boolean;
  onClose: () => void;
  onSave: (profile: ProfileModel) => void;
}) {
  const [form, setForm] = useState(profile);
  const update = (key: keyof ProfileModel, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <ModalFrame title="Edit Profile" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <ProfileInput label="Full name" value={form.name} onChange={(value) => update("name", value)} />
        <ProfileInput label="Email address" type="email" value={form.email} onChange={(value) => update("email", value)} />
        <ProfileInput label="Mobile number" value={form.phone} onChange={(value) => update("phone", value)} />
        <ProfileInput label="City" value={form.city} onChange={(value) => update("city", value)} />
      </div>

      <p className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-xs font-semibold leading-5 text-[var(--app-muted)]">
        These details are used on your ticket wallet and booking profile.
      </p>

      <ModalActions
        onClose={onClose}
        loading={loading}
        loadingText="Saving..."
        confirmLabel="Save Profile"
        onConfirm={() => onSave(form)}
      />
    </ModalFrame>
  );
}

function ChangePasswordModal({
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
        <ProfileInput label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} />
        <ProfileInput label="New password" type="password" value={newPassword} onChange={setNewPassword} />
        <p className="text-xs font-semibold leading-5 text-[var(--app-muted)]/70">
          Production will verify the current password and save the new one through the backend.
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

function QRPreviewModal({ ticket, onClose }: { ticket: BuizzTicket; onClose: () => void }) {
  return (
    <ModalFrame title="QR Ticket Preview" onClose={onClose} narrow>
      <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)]">
        <TicketQrPreview type="entry" payload={ticket.qrPayload ?? ticket.ticketId} previewMetadata disabled={ticket.status !== "Valid"} />
      </div>

      <p className="text-sm font-black text-[var(--app-foreground)]">{ticket.eventName}</p>
    </ModalFrame>
  );
}

function ShareTicketModal({
  ticket,
  loading,
  onNativeShare,
  onWhatsApp,
  onClose,
}: {
  ticket: BuizzTicket;
  loading: boolean;
  onNativeShare: () => void;
  onWhatsApp: () => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title="Share Ticket" onClose={onClose} narrow>
      <div className={`${softCardClass} rounded-[24px] p-4`}>
        <p className="text-sm font-black text-[var(--app-foreground)]">{ticket.eventName}</p>
        <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]/70">
          {ticket.date} - {ticket.venue}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <LoadingButton loading={loading} loadingText="Sharing..." onClick={onNativeShare} className={primaryButtonClass}>
          <Send className="size-4" />
          Share
        </LoadingButton>

        <button type="button" onClick={onWhatsApp} className={secondaryButtonClass}>
          <MessageCircle className="size-4" />
          WhatsApp
        </button>
      </div>
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
      <p className="text-sm font-semibold leading-6 text-[var(--app-muted)]/70">{description}</p>

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
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-end bg-black/64 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-[var(--app-foreground)] shadow-[0_28px_90px_rgb(15 11 26 / 0.28)] dark:border-[var(--app-border)] dark:bg-[var(--app-elevated)] sm:rounded-[28px] sm:p-5 ${narrow ? "sm:max-w-md" : "sm:max-w-2xl"
          }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-[var(--app-foreground)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-[var(--app-subtle)] text-[var(--app-foreground)] transition hover:bg-[var(--app-border)] dark:bg-[var(--app-subtle)]"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4">{children}</div>
      </motion.section>
    </motion.div>
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
        className={`${danger ? dangerButtonClass : primaryButtonClass} min-h-11 px-5 text-sm disabled:opacity-50`}
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
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-black text-[var(--app-foreground)] ${className ?? ""}`}>
      {label}
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-bold text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-secondary)] focus:shadow-[0_0_0_4px_rgb(var(--brand-secondary-rgb)/0.12)] dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)]"
      />
    </label>
  );
}

function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 grid grid-cols-5 rounded-[24px] border border-[var(--app-border)] bg-[color:var(--app-elevated)]/96 p-1.5 shadow-[0_20px_60px_rgb(15_23_42/0.14)] backdrop-blur-xl sm:inset-x-3 sm:rounded-[26px] sm:p-2 lg:hidden"
      aria-label="Mobile profile navigation"
    >
      <MobileNavItem href="/" icon={<Home className="size-4" />} label="Home" />
      <MobileNavItem href="/events" icon={<Search className="size-4" />} label="Events" />
      <MobileNavItem href="/profile/tickets" icon={<Ticket className="size-4" />} label="Tickets" />
      <MobileNavItem href="/profile/wishlist" icon={<Heart className="size-4" />} label="Wishlist" />
      <MobileNavItem href="/profile" icon={<UserCircle className="size-4" />} label="Profile" active />
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
      className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black transition-all duration-300 active:scale-[0.96] ${active
        ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[0_10px_24px_rgb(var(--brand-secondary-rgb)/0.24)]"
        : "text-[var(--app-muted)] hover:text-[var(--color-brand-primary)]/70 dark:hover:text-[var(--app-foreground)]"
        }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function WishlistCard({ item, onRemove }: { item: DiscoveryItem; onRemove: (id: string) => void }) {
  return (
    <article className={`${cardClass} group min-w-0 overflow-hidden rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-[var(--color-brand-primary)] hover:shadow-xl active:scale-[0.96]`}>
      <img src={item.image} alt={item.title} className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" />

      <div className="p-3">
        <h2 className="line-clamp-2 min-h-9 text-xs font-black leading-snug text-[var(--app-foreground)] sm:text-sm">
          {item.title}
        </h2>
        <p className="mt-1 truncate text-[11px] font-semibold text-[var(--app-muted)]/70">
          {item.venue}, {item.city}
        </p>
        <p className="mt-2 flex items-center gap-1 text-[11px] font-black text-[var(--app-foreground)]">
          <Star className="size-3 fill-[var(--color-brand-primary)] text-[var(--color-brand-primary)]" />
          {item.rating}
        </p>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="mt-3 min-h-8 w-full rounded-full bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] px-3 text-[10px] font-black text-white transition active:scale-[0.96]"
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function EmptyPanel({
  icon,
  title,
  description,
  compact,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${softCardClass} grid place-items-center rounded-[24px] border-dashed p-6 text-center text-[var(--color-brand-secondary)] ${compact ? "min-h-40" : "min-h-60"
        }`}
    >
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--app-elevated)] dark:bg-[var(--app-subtle)]">
          {icon}
        </div>
        <p className="mt-3 text-base font-black text-[var(--app-foreground)]">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm font-semibold leading-6 text-[var(--app-muted)]/70">
          {description}
        </p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[var(--app-background)] p-4 sm:p-6 lg:p-8">
      <section className="mx-auto grid w-full max-w-[1480px] gap-4">
        <div className="h-[320px] animate-pulse rounded-[34px] bg-[linear-gradient(90deg,var(--app-border),var(--app-elevated),var(--app-subtle))] sm:h-[360px]" />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="grid gap-4">
            {[1, 2, 3].map((item) => (
              <SkeletonCard key={item} />
            ))}
          </div>

          <div className="grid gap-4">
            {[1, 2, 3].map((item) => (
              <SkeletonCard key={item} large />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SkeletonCard({ large }: { large?: boolean }) {
  return (
    <div
      className={`${large ? "h-64" : "h-44"} animate-pulse rounded-[28px] bg-[linear-gradient(90deg,var(--app-border),var(--app-elevated),var(--app-subtle))]`}
    />
  );
}

function AuthRequired() {
  return (
    <main className="grid min-h-dvh place-items-center overflow-x-hidden bg-[var(--app-background)] px-4 py-8 text-center text-[var(--app-foreground)]">
      <section className={`${cardClass} w-full max-w-md rounded-[28px] p-6`}>
        <BuizzLogo size="lg" className="mx-auto" />
        <UserCircle className="mx-auto mt-5 size-12 text-[var(--color-brand-primary)]" />
        <h1 className="mt-4 text-2xl font-black text-[var(--app-foreground)]">
          Your Buizz profile is ready
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]/70">
          Sign in to manage tickets, settings, and support.
        </p>

        <Link href="/login" className={`${primaryButtonClass} mt-5`}>
          Sign In
        </Link>
      </section>
    </main>
  );
}

function buildBaseProfile(user: NonNullable<PublicUser>, level: number): ProfileModel {
  return {
    id: String(user.id),
    displayId: user.displayId,
    name: user.name || "Buizz User",
    email: user.email ?? "",
    phone: user.phone ?? "",
    avatarUrl: profileImage,
    city: "Chhatrapati Sambhaji Nagar",
    joinedAt: "2026-06-01",
    level,
  };
}

function buildProfileFromServer(
  user: {
    id: number | string;
    displayId?: number | string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    createdAt?: string;
  },
  level: number,
): ProfileModel {
  return {
    id: String(user.id),
    displayId: user.displayId !== undefined && user.displayId !== null ? String(user.displayId) : undefined,
    name: user.name || "Buizz User",
    email: user.email ?? "",
    phone: user.phone ?? "",
    avatarUrl: user.avatar || profileImage,
    city: "Chhatrapati Sambhaji Nagar",
    joinedAt: user.createdAt || new Date().toISOString(),
    level,
  };
}

function loadSettings(): ProfileSettings {
  if (typeof window === "undefined") return defaultSettings;

  try {
    const stored = window.localStorage.getItem(settingsStorageKey);
    if (!stored) return defaultSettings;

    const parsed = JSON.parse(stored) as Partial<ProfileSettings>;

    return {
      ...defaultSettings,
      ...parsed,
      language: "English",
      region: ["Maharashtra", "Goa", "Karnataka"].includes(parsed.region ?? "")
        ? (parsed.region as RegionOption)
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

function groupTickets(tickets: BuizzTicket[]): Record<EventTab, BuizzTicket[]> {
  return {
    Upcoming: tickets.filter((ticket) => ticket.status === "Valid" || ticket.status === "Transferred"),
    Past: tickets.filter((ticket) => ticket.status === "Used" || ticket.status === "Expired"),
    Cancelled: tickets.filter(
      (ticket) => ticket.status === "Cancelled" || ticket.status === "Refunded" || ticket.status === "Blocked"
    ),
  };
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

function getCountdownLabel(ticket: BuizzTicket) {
  if (ticket.status !== "Valid" && ticket.status !== "Transferred") return ticket.status;
  return "Countdown active";
}

async function copyTextToClipboard(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") return;

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function getProfileInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "BU"
  );
}

function formatShortMonth(value: string) {
  if (!value) return "New";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "New";

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function getCustomerCode(profile: ProfileModel) {
  const clean = String(profile.displayId ?? profile.id).replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "CUSTOM";
  return `BU-${clean}`;
}

function getProfileCompletion(profile: ProfileModel, emailVerified: boolean, phoneVerified: boolean) {
  const checks = [
    Boolean(profile.name),
    Boolean(profile.email),
    Boolean(profile.phone),
    Boolean(profile.city),
    emailVerified,
    phoneVerified,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function formatDisplayDate(value: string) {
  if (!value) return "Not added";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
