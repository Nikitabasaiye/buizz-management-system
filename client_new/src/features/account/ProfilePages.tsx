"use client";

import { Award, CalendarDays, Heart, LogOut, MapPin, ShieldCheck, Sparkles, Star, Ticket, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Footer } from "@/components/common/Footer";
import { ProfileQuickActions } from "@/features/account/TicketPassportPages";
import { allDiscoveryItems, type DiscoveryItem } from "@/features/discovery/data";
import { useAuthStore } from "@/store/auth.store";
import { useTicketStore } from "@/store/ticket.store";
import { useWishlistStore } from "@/store/wishlist.store";

export function ProfilePageContent() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const savedIds = useWishlistStore((state) => state.savedIds);
  const tickets = useTicketStore((state) => state.tickets);
  const stamps = useTicketStore((state) => state.stamps);
  const unlockedStamps = stamps.filter((stamp) => stamp.unlocked);
  const xp = unlockedStamps.reduce((sum, stamp) => sum + stamp.xp, 0);
  const passportLevel = Math.max(1, Math.floor(xp / 150) + 1);
  const recentTicket = tickets[0];

  if (status !== "authenticated" || !user) {
    return <AuthRequired title="Your profile is ready" description="Sign in to view your saved events, plays, activities, and account details." />;
  }

  return (
    <>
    <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
      <section className="mx-auto max-w-[1200px]">
        <div className="relative overflow-hidden rounded-md border border-white/10 bg-[#070b15] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-7">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.28),transparent_56%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-md bg-[#e50914] text-white shadow-[0_16px_38px_rgba(229,9,20,0.28)]">
                <UserCircle className="size-9" />
              </div>
              <div>
                <p className="text-sm font-black text-[#1d9bf0]">Buizz Explorer Profile</p>
                <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">{user.name}</h1>
                <p className="mt-2 text-sm font-semibold text-white/70">{user.email ?? user.phone ?? "No contact added"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.email && user.isEmailVerified ? <p className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-xs font-black text-[#38d97b]">
                    <ShieldCheck className="size-3.5" />
                    Email verified
                  </p> : null}
                  {user.phone && user.isPhoneVerified ? <p className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-xs font-black text-[#38d97b]">
                    <ShieldCheck className="size-3.5" />
                    Phone verified
                  </p> : null}
                  <p className="inline-flex items-center gap-2 rounded-md bg-[#f6c453]/14 px-2 py-1 text-xs font-black text-[#f6c453]">
                    <Award className="size-3.5" />
                    Passport Level {passportLevel}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[390px]">
              <HeroStat icon={<Ticket className="size-4" />} label="Tickets" value={String(tickets.length)} />
              <HeroStat icon={<Heart className="size-4" />} label="Wishlist" value={String(savedIds.length)} />
              <HeroStat icon={<Sparkles className="size-4" />} label="XP" value={String(xp)} />
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/8 px-4 text-sm font-black text-white transition hover:bg-[#e50914]"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="mt-5">
          <ProfileQuickActions />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.10)]">
            <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">Account Details</p>
            <div className="mt-4 grid gap-3 text-sm font-semibold">
              <ProfileDetail label="Name" value={user.name} />
              <ProfileDetail label="Email" value={user.email ?? "Not connected"} />
              <ProfileDetail label="Phone" value={user.phone ?? "Not connected"} />
              <ProfileDetail label="Ticket Delivery" value="WhatsApp only" />
            </div>
          </section>

          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.10)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">Recent Ticket</p>
                <h2 className="mt-1 text-xl font-black text-[var(--app-foreground)]">{recentTicket ? recentTicket.eventName : "No tickets yet"}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{recentTicket ? `${recentTicket.date} - ${recentTicket.time} at ${recentTicket.venue}` : "Booked passes will appear here."}</p>
              </div>
              <Link href="/profile/tickets" className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#e50914] px-4 text-sm font-black !text-white transition hover:bg-[#ff2634]">
                My Tickets
              </Link>
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.10)]">
            <div>
              <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">Passport Preview</p>
              <h2 className="mt-1 text-xl font-black text-[var(--app-foreground)]">Level {passportLevel} Explorer</h2>
              <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{unlockedStamps.length} stamps unlocked - {xp} XP earned after attended scans.</p>
            </div>
            <Link href="/profile/passport" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/50">
              Open Passport
            </Link>
          </section>
          <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.10)]">
            <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">Wishlist</p>
            <h2 className="mt-1 text-xl font-black text-[var(--app-foreground)]">{savedIds.length} saved experiences</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">Keep your liked events, plays, and activities in one quiet list.</p>
            <Link href="/profile/wishlist" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/50">
              Open Wishlist
            </Link>
          </section>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
}

export function SavedWishlistPage() {
  const savedIds = useWishlistStore((state) => state.savedIds);
  const removeSaved = useWishlistStore((state) => state.removeSaved);
  const savedItems = allDiscoveryItems.filter((item) => savedIds.includes(item.id));

  return (
    <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
      <section className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black leading-tight text-[var(--app-foreground)] sm:text-4xl">Wishlist</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">Liked events, plays, and activities appear here.</p>
          </div>
          <Link href="/events" className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#e50914] px-4 text-sm font-black !text-white transition hover:bg-[#ff2634]">
            Discover More
          </Link>
        </div>

        {savedItems.length ? (
          <div className="grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {savedItems.map((item) => (
              <WishlistCard key={item.id} item={item} onRemove={removeSaved} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center">
            <div>
              <Heart className="mx-auto size-10 text-[#e50914]" />
              <p className="mt-4 text-xl font-black text-[var(--app-foreground)]">No liked cards yet</p>
              <p className="mt-2 max-w-md text-sm font-semibold text-[var(--app-muted)]">Tap the heart on any event, play, or activity card to add it here.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2">
      <span className="text-[var(--app-muted)]">{label}</span>
      <span className="text-right font-black text-[var(--app-foreground)]">{value}</span>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/12 bg-white/8 p-3 backdrop-blur">
      <div className="flex items-center gap-2 text-white/68">{icon}<span className="text-xs font-black">{label}</span></div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function WishlistCard({ item, onRemove }: { item: DiscoveryItem; onRemove: (id: string) => void }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-1 hover:border-[#e50914]/40 hover:shadow-[0_20px_54px_rgba(0,0,0,0.18)]">
      <div className="relative aspect-video overflow-hidden bg-[var(--app-subtle)]">
        <img src={item.image} alt={item.title} className="size-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-2 top-2 rounded bg-black/78 px-2 py-1 text-[10px] font-black capitalize text-white backdrop-blur">{item.kind}</span>
      </div>
      <div className="p-3">
        <h2 className="line-clamp-2 text-sm font-black leading-snug text-[var(--app-foreground)]">{item.title}</h2>
        <div className="mt-2 space-y-1 text-[11px] font-semibold text-[var(--app-muted)]">
          <p className="flex min-w-0 items-center gap-1.5"><CalendarDays className="size-3.5 shrink-0" /><span className="truncate">{item.slot ?? item.date}</span></p>
          <p className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-[#e50914]" /><span className="truncate">{item.venue}, {item.city}</span></p>
          <p className="flex min-w-0 items-center gap-1.5"><Star className="size-3.5 shrink-0 fill-[#f6c453] text-[#f6c453]" /><span className="truncate">{item.rating} rating</span></p>
        </div>
        <p className="mt-2 truncate text-sm font-black text-[var(--app-foreground)]">{item.priceLabel}</p>
        <button type="button" onClick={() => onRemove(item.id)} className="mt-3 inline-flex min-h-8 w-full items-center justify-center rounded-md border border-[#e50914]/40 bg-[#e50914] px-3 text-[11px] font-black text-white transition hover:bg-[#ff2634]">
          Remove
        </button>
      </div>
    </article>
  );
}

function AuthRequired({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
      <section className="mx-auto grid min-h-[65vh] max-w-4xl place-items-center text-center">
        <div>
          <UserCircle className="mx-auto size-14 text-[#e50914]" />
          <h1 className="mt-5 text-3xl font-black leading-tight sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--app-muted)]">{description}</p>
          <Link href="/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black !text-white transition hover:bg-[#ff2634]">
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
