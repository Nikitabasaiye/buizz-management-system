"use client";

import { Award, CalendarDays, Download, Heart, MapPin, Phone, QrCode, ScanLine, Settings, Share2, ShieldCheck, Sparkles, Ticket, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Footer } from "@/components/common/Footer";
import { QRTicket, downloadPass, sharePass } from "@/features/booking/BookingFlow";
import { allDiscoveryItems, type DiscoveryItem } from "@/features/discovery/data";
import { saveAccount, setCurrentMockUser } from "@/lib/mockAuth";
import { useAuthStore, type DeliveryPreference, type PublicUser } from "@/store/auth.store";
import { useTicketStore, type BuizzTicket, type PassportStamp, type TicketStatus } from "@/store/ticket.store";
import { useWishlistStore } from "@/store/wishlist.store";

type TicketTab = "Upcoming" | "Past" | "Cancelled" | "Expired";

const ticketTabs: TicketTab[] = ["Upcoming", "Past", "Cancelled", "Expired"];

export function ProfileQuickActions() {
  const actions = [
    { label: "My Tickets", href: "/profile/tickets", icon: Ticket },
    { label: "Wishlist", href: "/profile/wishlist", icon: Heart },
    { label: "Buizz Passport", href: "/profile/passport", icon: Award },
    { label: "Settings", href: "/profile/settings", icon: Settings },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {actions.map(({ label, href, icon: Icon }) => (
        <Link key={label} href={href} className="group flex min-h-14 min-w-[160px] items-center gap-3 rounded-md border border-[var(--app-border)] bg-[color:var(--app-elevated)]/86 px-3 shadow-[0_12px_34px_rgba(0,0,0,0.10)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-[#e50914]/45">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#e50914]/12 text-[#ff2634]"><Icon className="size-4" /></span>
          <p className="text-sm font-black text-[var(--app-foreground)]">{label}</p>
        </Link>
      ))}
    </div>
  );
}

export function MyTicketsPage() {
  const tickets = useTicketStore((state) => state.tickets);
  const [activeTab, setActiveTab] = useState<TicketTab>("Upcoming");
  const [modalTicket, setModalTicket] = useState<BuizzTicket | null>(null);
  const filteredTickets = tickets.filter((ticket) => tabMatchesTicket(activeTab, ticket));

  return (
    <>
      <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
        <section className="mx-auto max-w-[1500px]">
          <ProfileHeader title="My Tickets" description="Upcoming, past, cancelled, and expired Buizz tickets with quick pass actions." />
          <MyTicketsTabs activeTab={activeTab} onChange={setActiveTab} />
          {filteredTickets.length ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {filteredTickets.map((ticket) => <TicketCard key={ticket.ticketId} ticket={ticket} onView={setModalTicket} />)}
            </div>
          ) : (
            <EmptyProfileState icon={<Ticket className="size-10 text-[#e50914]" />} title="No tickets here yet" description="Booked tickets will appear in the matching tab." />
          )}
        </section>
      </main>
      {modalTicket ? <TicketModal ticket={modalTicket} onClose={() => setModalTicket(null)} /> : null}
      <Footer />
    </>
  );
}

export function MyTicketsTabs({ activeTab, onChange }: { activeTab: TicketTab; onChange: (tab: TicketTab) => void }) {
  return (
    <div className="mt-5 flex gap-2 overflow-x-auto rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ticketTabs.map((tab) => (
        <button key={tab} type="button" onClick={() => onChange(tab)} className={`min-h-10 shrink-0 rounded-md px-4 text-sm font-black transition duration-200 ${activeTab === tab ? "bg-[#e50914] text-white shadow-[0_14px_34px_rgba(229,9,20,0.22)]" : "bg-[var(--app-subtle)] text-[var(--app-muted)] hover:text-[var(--app-foreground)]"}`}>
          {tab}
        </button>
      ))}
    </div>
  );
}

export function TicketCard({ ticket, onView }: { ticket: BuizzTicket; onView: (ticket: BuizzTicket) => void }) {
  const statusTone = ticket.status === "Valid" ? "bg-[#16a34a]" : ticket.status === "Used" ? "bg-[#6d35ff]" : ticket.status === "Cancelled" ? "bg-[#e50914]" : "bg-white/20";

  return (
    <article className="grid overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_58px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-1 hover:border-[#e50914]/40 sm:grid-cols-[170px_1fr]">
      <img src={ticket.eventImage} alt={ticket.eventName} className="h-44 w-full object-cover sm:h-full" />
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="line-clamp-2 text-lg font-black">{ticket.eventName}</h2>
            <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">Ticket ID {ticket.ticketId}</p>
          </div>
          <span className={`rounded px-2 py-1 text-[10px] font-black text-white ${statusTone}`}>{ticket.status}</span>
        </div>
        <div className="mt-3 grid gap-1.5 text-xs font-semibold text-[var(--app-muted)] sm:grid-cols-2">
          <p className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{ticket.date} - {ticket.time}</p>
          <p className="flex items-center gap-1.5"><MapPin className="size-3.5 text-[#e50914]" />{ticket.venue}, {ticket.city}</p>
          <p className="flex items-center gap-1.5"><QrCode className="size-3.5" />{ticket.status === "Valid" ? "QR Ready" : ticket.qrStatus}</p>
          {ticket.status === "Used" ? <p className="flex items-center gap-1.5"><Award className="size-3.5 text-[#f6c453]" />Passport Stamp Earned</p> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ticket.status === "Valid" ? <button type="button" onClick={() => onView(ticket)} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#e50914] px-3 text-xs font-black text-white transition hover:bg-[#ff2634]"><QrCode className="size-4" />View Pass</button> : null}
          <TicketMiniButton icon={<Download className="size-4" />} label="Download" onClick={() => downloadPass(ticket)} />
          <TicketMiniButton icon={<Share2 className="size-4" />} label="Share" onClick={() => sharePass(ticket)} />
        </div>
      </div>
    </article>
  );
}

export function TicketModal({ ticket, onClose }: { ticket: BuizzTicket; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/72 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)]" aria-label="Close ticket">
            <X className="size-4" />
          </button>
        </div>
        <QRTicket ticket={ticket} />
      </div>
    </div>
  );
}

function TicketMiniButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black transition hover:border-[#e50914]/50 hover:bg-[#e50914] hover:text-white">{icon}{label}</button>;
}

export function BuizzPassportPage() {
  const tickets = useTicketStore((state) => state.tickets);
  const stamps = useTicketStore((state) => state.stamps);
  const attended = tickets.filter((ticket) => ticket.status === "Used");
  const unlocked = stamps.filter((stamp) => stamp.unlocked);
  const xp = unlocked.reduce((sum, stamp) => sum + stamp.xp, 0);

  return (
    <>
      <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
        <section className="mx-auto max-w-[1500px]">
          <div className="overflow-hidden rounded-md border border-white/10 bg-[#070b15] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-7">
            <p className="text-sm font-black text-[#1d9bf0]">Buizz Passport</p>
            <h1 className="mt-3 text-4xl font-black leading-none sm:text-6xl">Your Maharashtra Experience Passport</h1>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <PassportStat label="Level" value={`Level ${Math.max(1, Math.floor(xp / 150) + 1)}`} />
              <PassportStat label="XP Progress" value={`${xp} XP`} />
              <PassportStat label="Events Attended" value={String(attended.length)} />
              <PassportStat label="Cities Experienced" value={String(new Set(attended.map((ticket) => ticket.city)).size)} />
            </div>
          </div>

          <section className="mt-5 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.12)] sm:p-5">
            <h2 className="text-2xl font-black">Passport Stamps</h2>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">Stamps unlock only after QR scan at the venue.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {stamps.map((stamp) => <PassportStampCard key={stamp.id} stamp={stamp} />)}
            </div>
          </section>

          <section className="mt-5 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.12)] sm:p-5">
            <h2 className="text-2xl font-black">Achievements</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["First Event Attended", "Weekend Explorer", "Maharashtra Explorer", "Concert Hunter", "Theatre Enthusiast", "Foodie Trail", "Networking Starter"].map((achievement, index) => (
                <div key={achievement} className={`rounded-md border p-3 ${index < unlocked.length ? "border-[#e50914]/50 bg-[#e50914]/12" : "border-[var(--app-border)] bg-[var(--app-subtle)] opacity-60"}`}>
                  <Sparkles className="size-5 text-[#f6c453]" />
                  <p className="mt-2 text-sm font-black">{achievement}</p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </>
  );
}

export function BuizzPassport() {
  return <BuizzPassportPage />;
}

export function PassportStampCard({ stamp }: { stamp: PassportStamp }) {
  return (
    <div className={`rounded-md border p-4 transition duration-300 ${stamp.unlocked ? "border-[#e50914]/50 bg-[#e50914]/12 shadow-[0_18px_44px_rgba(229,9,20,0.18)]" : "border-[var(--app-border)] bg-[var(--app-subtle)] opacity-50"} ${stamp.recent ? "animate-pulse" : ""}`}>
      <Award className={`size-8 ${stamp.unlocked ? "text-[#f6c453]" : "text-[var(--app-muted)]"}`} />
      <p className="mt-3 text-sm font-black">{stamp.title}</p>
      <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">{stamp.unlocked ? `Unlocked +${stamp.xp} XP` : "Locked"}</p>
    </div>
  );
}

export function MockTicketScannerPage() {
  const tickets = useTicketStore((state) => state.tickets);
  const markTicketUsed = useTicketStore((state) => state.markTicketUsed);
  const [ticketId, setTicketId] = useState("");
  const [message, setMessage] = useState("");
  const [stampMessage, setStampMessage] = useState("");
  const sampleTicket = tickets[0];

  const scan = () => {
    const result = markTicketUsed(ticketId.trim());
    setMessage(result.message);
    setStampMessage(result.ok && result.stamp ? `Passport Stamp Unlocked: ${result.stamp.title} +${result.stamp.xp} XP` : "");
  };

  return (
    <>
      <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.12)] sm:p-6">
          <ScanLine className="size-10 text-[#e50914]" />
          <h1 className="mt-4 text-3xl font-black sm:text-5xl">Mock QR Scanner</h1>
          <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">Enter a valid Ticket ID or Booking ID to simulate venue entry scan.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input value={ticketId} onChange={(event) => setTicketId(event.target.value)} placeholder={sampleTicket ? `Try ${sampleTicket.ticketId}` : "Ticket ID"} className="min-h-12 flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-bold outline-none focus:border-[#e50914]" />
            <button type="button" onClick={scan} className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white transition hover:bg-[#ff2634]">Scan QR mock</button>
          </div>
          {message ? <div className={`mt-5 rounded-md p-4 text-sm font-black ${message === "Entry Approved" ? "bg-[#16a34a]/18 text-[#38d97b]" : "bg-[#e50914]/14 text-[#ff7a82]"}`}>{message}</div> : null}
          {stampMessage ? <div className="mt-3 rounded-md bg-[#f6c453]/14 p-4 text-sm font-black text-[#f6c453]">{stampMessage}</div> : null}
        </section>
      </main>
      <Footer />
    </>
  );
}

export function MockTicketScanner() {
  return <MockTicketScannerPage />;
}

export function WishlistProfilePage() {
  const savedIds = useWishlistStore((state) => state.savedIds);
  const removeSaved = useWishlistStore((state) => state.removeSaved);
  const savedItems = useMemo(() => allDiscoveryItems.filter((item) => savedIds.includes(item.id)), [savedIds]);

  return (
    <>
      <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
        <section className="mx-auto max-w-[1500px]">
          <ProfileHeader title="Wishlist" description="Liked events, plays, and activities you saved." />
          {savedItems.length ? <div className="mt-5 grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{savedItems.map((item) => <WishlistCard key={item.id} item={item} onRemove={removeSaved} />)}</div> : <EmptyProfileState icon={<Heart className="size-10 text-[#e50914]" />} title="No liked cards yet" description="Tap the heart on any card to add it here." />}
        </section>
      </main>
      <Footer />
    </>
  );
}

export function ProfileSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState(user?.name ?? "Buizz User");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [preferredDelivery, setPreferredDelivery] = useState<DeliveryPreference>(user?.preferredDelivery ?? "email");
  const [message, setMessage] = useState("");

  const baseUser = (): NonNullable<PublicUser> => ({
    id: user?.id ?? `buizz-${Date.now()}`,
    name: name.trim() || "Buizz User",
    email: email.trim() || undefined,
    phone: phone.trim() || undefined,
    password: user?.password ?? "",
    authProvider: user?.authProvider ?? (phone.trim() && !email.trim() ? "phone" : "email"),
    isEmailVerified: Boolean(user?.isEmailVerified && email.trim() === user.email),
    isPhoneVerified: Boolean(user?.isPhoneVerified && phone.trim() === user.phone),
    preferredDelivery: resolveSettingsPreference(preferredDelivery, Boolean(user?.isEmailVerified && email.trim() === user.email), Boolean(user?.isPhoneVerified && phone.trim() === user.phone)),
  });

  const saveBaseName = () => {
    const nextUser = baseUser();
    persistSettingsUser(nextUser, setUser);
    setMessage("Profile name saved.");
  };

  const sendEmailOtp = () => {
    if (!email.trim()) {
      setMessage("Enter an email first.");
      return;
    }
    setEmailOtpSent(true);
    setEmailOtp("");
    setMessage("Email OTP sent. Use 123456.");
  };

  const verifyEmailOtp = () => {
    if (emailOtp !== "123456") {
      setMessage("Invalid email OTP. Use 123456.");
      return;
    }
    const hasPhone = Boolean(user?.phone && user.isPhoneVerified);
    const nextUser: PublicUser = {
      ...baseUser(),
      email: email.trim(),
      isEmailVerified: true,
      isPhoneVerified: hasPhone,
      preferredDelivery: hasPhone ? "both" : "email",
    };
    persistSettingsUser(nextUser, setUser);
    setPreferredDelivery(nextUser.preferredDelivery);
    setEmailOtpSent(false);
    setMessage("Email verified.");
  };

  const sendPhoneOtp = () => {
    if (!phone.trim()) {
      setMessage("Enter a phone number first.");
      return;
    }
    setPhoneOtpSent(true);
    setPhoneOtp("");
    setMessage("Phone OTP sent. Use 123456.");
  };

  const verifyPhoneOtp = () => {
    if (phoneOtp !== "123456") {
      setMessage("Invalid phone OTP. Use 123456.");
      return;
    }
    const hasEmail = Boolean(user?.email && user.isEmailVerified);
    const nextUser: PublicUser = {
      ...baseUser(),
      phone: phone.trim(),
      isEmailVerified: hasEmail,
      isPhoneVerified: true,
      preferredDelivery: hasEmail ? "both" : "whatsapp",
    };
    persistSettingsUser(nextUser, setUser);
    setPreferredDelivery(nextUser.preferredDelivery);
    setPhoneOtpSent(false);
    setMessage("Phone verified.");
  };

  const changePreference = (preference: DeliveryPreference) => {
    const hasEmail = Boolean(user?.email && user.isEmailVerified);
    const hasPhone = Boolean(user?.phone && user.isPhoneVerified);
    if (preference === "both" && (!hasEmail || !hasPhone)) {
      setMessage("Both is available only after email and phone are verified.");
      return;
    }
    const nextUser: PublicUser = { ...baseUser(), isEmailVerified: hasEmail, isPhoneVerified: hasPhone, preferredDelivery: resolveSettingsPreference(preference, hasEmail, hasPhone) };
    setPreferredDelivery(nextUser.preferredDelivery);
    persistSettingsUser(nextUser, setUser);
    setMessage("Ticket delivery preference saved.");
  };

  return (
    <>
      <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <ProfileHeader title="Settings" description="Frontend-only profile preferences for Buizz." />
          <div className="mt-5 grid gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.12)]">
            <SettingsInput label="Name" value={name} onChange={setName} />
            <button type="button" onClick={saveBaseName} className="inline-flex min-h-10 w-fit items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black transition hover:border-[#e50914]/50">Save Name</button>
          </div>

          <SettingsSection title="Email" verified={Boolean(user?.email && user.isEmailVerified)}>
            <SettingsInput label="Add / update email" value={email} onChange={setEmail} />
            {emailOtpSent ? <SettingsInput label="Email OTP" value={emailOtp} onChange={setEmailOtp} /> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={emailOtpSent ? verifyEmailOtp : sendEmailOtp} className="inline-flex min-h-10 items-center rounded-md bg-[#e50914] px-4 text-sm font-black text-white transition hover:bg-[#ff2634]">{emailOtpSent ? "Verify Email OTP" : "Send Email OTP"}</button>
              {user?.email && user.isEmailVerified ? <VerifiedBadge label="Email verified" /> : null}
            </div>
          </SettingsSection>

          <SettingsSection title="Phone" verified={Boolean(user?.phone && user.isPhoneVerified)}>
            <SettingsInput label="Add / update phone number" value={phone} onChange={setPhone} />
            {phoneOtpSent ? <SettingsInput label="Phone OTP" value={phoneOtp} onChange={setPhoneOtp} /> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={phoneOtpSent ? verifyPhoneOtp : sendPhoneOtp} className="inline-flex min-h-10 items-center rounded-md bg-[#e50914] px-4 text-sm font-black text-white transition hover:bg-[#ff2634]">{phoneOtpSent ? "Verify Phone OTP" : "Send Phone OTP"}</button>
              {user?.phone && user.isPhoneVerified ? <VerifiedBadge label="Phone verified" /> : null}
            </div>
          </SettingsSection>

          <SettingsSection title="Ticket Delivery" verified={Boolean(user?.phone && user.isPhoneVerified)}>
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-sm font-semibold text-[var(--app-muted)]">
              <p className="font-black text-[var(--app-foreground)]">WhatsApp only</p>
              <p className="mt-1">Tickets are owned by and delivered to the verified WhatsApp number on this account.</p>
            </div>
            {message ? <p className="rounded-md bg-[#e50914]/10 px-3 py-2 text-xs font-black text-[#e50914]">{message}</p> : null}
          </SettingsSection>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SettingsInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-black">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold outline-none focus:border-[#e50914]" />
    </label>
  );
}

function SettingsSection({ title, verified, children }: { title: string; verified: boolean; children: React.ReactNode }) {
  return (
    <section className="mt-5 grid gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">{title}</h2>
        {verified ? <VerifiedBadge label="Verified" /> : null}
      </div>
      {children}
    </section>
  );
}

function VerifiedBadge({ label }: { label: string }) {
  return <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black text-[#16a34a]"><ShieldCheck className="size-4" />{label}</span>;
}

function persistSettingsUser(user: PublicUser, setUser: (user: PublicUser) => void) {
  if (!user) return;
  const account = saveAccount(user);
  setCurrentMockUser(account);
  setUser(account);
}

function resolveSettingsPreference(preference: DeliveryPreference, hasEmail: boolean, hasPhone: boolean): DeliveryPreference {
  if (hasEmail && hasPhone) return preference;
  if (hasPhone) return "whatsapp";
  return "email";
}

function ProfileHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-[#070b15] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-7">
      <UserCircle className="size-10 text-[#ff2634]" />
      <h1 className="mt-4 text-4xl font-black leading-none sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm font-semibold text-white/70">{description}</p>
    </div>
  );
}

function PassportStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-white/8 p-3"><p className="text-xs font-bold text-white/60">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}

function WishlistCard({ item, onRemove }: { item: DiscoveryItem; onRemove: (id: string) => void }) {
  return (
    <article className="group overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition hover:-translate-y-1 hover:border-[#e50914]/40">
      <img src={item.image} alt={item.title} className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105" />
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-black">{item.title}</p>
        <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">{item.venue}, {item.city}</p>
        <button type="button" onClick={() => onRemove(item.id)} className="mt-3 inline-flex min-h-8 w-full items-center justify-center rounded-md bg-[#e50914] text-xs font-black text-white transition hover:bg-[#ff2634]">Remove</button>
      </div>
    </article>
  );
}

function EmptyProfileState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="mt-5 grid min-h-72 place-items-center rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center"><div>{icon}<p className="mt-4 text-xl font-black">{title}</p><p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">{description}</p></div></div>;
}

function tabMatchesTicket(tab: TicketTab, ticket: BuizzTicket) {
  if (tab === "Upcoming") return ticket.status === "Valid";
  if (tab === "Past") return ticket.status === "Used";
  return ticket.status === (tab as TicketStatus);
}
