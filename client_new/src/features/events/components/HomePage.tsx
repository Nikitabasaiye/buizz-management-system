"use client";

import {
  ArrowRight,
  CalendarDays,
  Heart,
  Landmark,
  MapPin,
  Mic2,
  Music,
  Sparkles,
  Star,
  Theater,
  Trophy,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CITY_HERO_FALLBACK_IMAGE, getCityHeroImage } from "@/lib/cityHeroImages";
import { useAppStore } from "@/store/app.store";

import { Footer } from "@/components/common/Footer";
import { useWishlistStore } from "@/store/wishlist.store";

type EventType = "Music" | "Comedy" | "Plays" | "Activities" | "Workshops" | "Festivals" | "Business";

type EventItem = {
  id: string;
  title: string;
  date: string;
  venue: string;
  price: string;
  type: EventType;
  image: string;
  href: string;
  badge: string;
  rating: string;
  interested: string;
};

type CategoryTile = {
  title: string;
  count: string;
  image: string;
  href: string;
  icon: typeof Music;
};

const topEvents: EventItem[] = [
  {
    id: "arijit-live-pune",
    title: "Arijit Singh - Live in Pune",
    date: "25 May 2026",
    venue: "Mahalunge, Pune",
    price: "Rs. 999 Onwards",
    type: "Music",
    href: "/events/arijit-live-pune",
    badge: "Early bird",
    rating: "4.9",
    interested: "18K interested",
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "zakir-khan-live",
    title: "Zakir Khan - Live",
    date: "30 May 2026",
    venue: "Symbiosis Auditorium",
    price: "Rs. 799 Onwards",
    type: "Comedy",
    href: "/events/zakir-khan-live",
    badge: "Selling fast",
    rating: "4.8",
    interested: "12K interested",
    image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "natsamrat-premium",
    title: "Natsamrat - Play",
    date: "02 June 2026",
    venue: "Bal Gandharva, Pune",
    price: "Rs. 599 Onwards",
    type: "Plays",
    href: "/plays/natsamrat-premium",
    badge: "Premium seats",
    rating: "4.7",
    interested: "7K interested",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "morning-yoga-wellness",
    title: "Yoga Workshop",
    date: "05 June 2026",
    venue: "Saras Baug, Pune",
    price: "Rs. 499 Onwards",
    type: "Activities",
    href: "/activities/morning-yoga-wellness",
    badge: "Few slots",
    rating: "4.6",
    interested: "5K interested",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "food-fest-pune",
    title: "Food Fest Pune",
    date: "07 June 2026",
    venue: "Phoenix Marketcity",
    price: "Rs. 299 Onwards",
    type: "Festivals",
    href: "/events/food-fest-pune",
    badge: "Family pick",
    rating: "4.5",
    interested: "10K interested",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "startup-summit-2026",
    title: "Startup Summit 2026",
    date: "10 June 2026",
    venue: "ICC, Pune",
    price: "Rs. 1499 Onwards",
    type: "Business",
    href: "/events/startup-summit-2026",
    badge: "Featured",
    rating: "4.9",
    interested: "9K interested",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80",
  },
];

const specials: CategoryTile[] = [
  { title: "Music Concerts", count: "120+ Events", icon: Music, href: "/events/category/music-events", image: topEvents[0].image },
  { title: "Comedy Shows", count: "75+ Events", icon: Mic2, href: "/events/category/comedy-events", image: topEvents[1].image },
  { title: "Workshops", count: "65+ Events", icon: Workflow, href: "/events/category/workshops", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80" },
  { title: "Festivals", count: "40+ Events", icon: Sparkles, href: "/events/category/festivals", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80" },
  { title: "Plays & Theatre", count: "55+ Shows", icon: Theater, href: "/plays/category/marathi-plays", image: topEvents[2].image },
  { title: "Activities", count: "90+ Spots", icon: Trophy, href: "/activities", image: topEvents[3].image },
];

const moreCategories: CategoryTile[] = [
  { title: "Business", count: "48 experiences", icon: Workflow, href: "/events/category/business-events", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80" },
  { title: "Spiritual", count: "22 experiences", icon: Landmark, href: "/events/category/spiritual-events", image: "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&w=1000&q=80" },
  { title: "Exhibitions", count: "34 experiences", icon: Star, href: "/events/category/exhibitions", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1000&q=80" },
  { title: "Startup Meetups", count: "29 experiences", icon: Users, href: "/events/category/business-events", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=80" },
  { title: "Networking", count: "33 experiences", icon: Users, href: "/events/category/business-events", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1000&q=80" },
  { title: "Art & Culture", count: "43 experiences", icon: Theater, href: "/events/category/art-culture", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80" },
  { title: "Sports", count: "31 experiences", icon: Trophy, href: "/events/category/sports-events", image: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1000&q=80" },
  { title: "Community", count: "25 experiences", icon: Users, href: "/events/category/social-mixers", image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=80" },
  { title: "College Festivals", count: "18 experiences", icon: Music, href: "/events/category/college-festivals", image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80" },
  { title: "Tech Conferences", count: "16 experiences", icon: Sparkles, href: "/events/category/tech-events", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=80" },
];

export function HomePage() {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const savedIds = useWishlistStore((state) => state.savedIds);
  const toggleSaved = useWishlistStore((state) => state.toggleSaved);
  const saved = new Set(savedIds);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="mx-auto max-w-[1500px] px-3 pb-6 sm:px-5 lg:px-8">
        <TopBuizzSection selectedCity={selectedCity} events={topEvents} saved={saved} onSave={toggleSaved} />
        <EventSection title={`Upcoming Events in ${selectedCity}`} selectedCity={selectedCity} events={topEvents.slice(0, 6)} saved={saved} onSave={toggleSaved} />
        <SpecialsSection />
        <PickedForYou selectedCity={selectedCity} events={topEvents.slice(0, 5)} saved={saved} onSave={toggleSaved} />
        <MoreCategories />
        <HostPanel />
      </div>
      <Footer />
    </main>
  );
}

function TopBuizzSection({ selectedCity, events, saved, onSave }: { selectedCity: string; events: EventItem[]; saved: Set<string>; onSave: (id: string) => void }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const heroEvent = events.find((event) => event.id === selectedEventId) ?? events[0];
  const heroTitle = withSelectedCity(heroEvent.title, selectedCity);
  const heroVenue = withSelectedCity(heroEvent.venue, selectedCity);
  const cityHeroImage = getCityHeroImage(selectedCity);

  return (
    <>
      <section className="relative mt-5 flex min-h-[240px] items-end overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 py-8 shadow-[0_18px_58px_rgba(0,0,0,0.10)] sm:min-h-[260px] sm:px-8 sm:py-10">
        <img
          src={cityHeroImage}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={(event) => {
            if (!event.currentTarget.src.endsWith(CITY_HERO_FALLBACK_IMAGE)) {
              event.currentTarget.src = CITY_HERO_FALLBACK_IMAGE;
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/48 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/16 to-transparent" />
        <div className="relative max-w-[700px]">
          <div className="flex flex-wrap gap-2 text-xs font-black text-white">
            <span className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/18 bg-black/44 px-3 backdrop-blur"><MapPin className="size-4 text-[#ff2634]" />{selectedCity}</span>
            <span className="inline-flex min-h-9 items-center rounded-md border border-white/18 bg-black/44 px-3 backdrop-blur">120+ Events</span>
            <span className="inline-flex min-h-9 items-center rounded-md border border-white/18 bg-black/44 px-3 backdrop-blur">45+ Venues</span>
            <span className="inline-flex min-h-9 items-center rounded-md border border-white/18 bg-black/44 px-3 backdrop-blur">Updated Today</span>
          </div>
          <h1 className="mt-5 text-3xl font-black leading-tight text-white sm:text-4xl">
            What&apos;s Happening in {selectedCity}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/84 sm:text-base">
            Concerts, comedy, plays and experiences curated around you.
          </p>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-[var(--app-border)] bg-black shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
        <div className="relative min-h-[360px] overflow-hidden sm:min-h-[420px]">
          <img src={heroEvent.image} alt={heroTitle} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/72 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="relative flex min-h-[360px] max-w-[680px] flex-col justify-end p-5 text-white sm:min-h-[420px] sm:p-8">
            <div>
              <p className="w-fit rounded bg-[#e50914] px-2 py-1 text-[10px] font-black uppercase text-white">{heroEvent.badge}</p>
              <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-white sm:text-5xl">{heroTitle}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-bold text-white/86">
                <span>{heroEvent.date}</span>
                <span>|</span>
                <span>8:00 PM Onwards</span>
                <span>|</span>
                <span>{heroEvent.type}</span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm font-black text-white/90"><MapPin className="size-4" />{heroVenue}</p>
              <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-white/82">
                {getHomeEventDescription(heroEvent, selectedCity)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-md border border-white/10 bg-black/28 px-3 py-2 text-white/92">{heroEvent.rating} Rated</span>
                <span className="rounded-md border border-white/10 bg-black/28 px-3 py-2 text-white/92">{heroEvent.interested}</span>
                <span className="rounded-md border border-white/10 bg-black/28 px-3 py-2 text-white/92">Verified Event</span>
              </div>
              <p className="mt-4 text-sm font-black text-white">{heroEvent.price}</p>
            </div>
            <div className="mt-5 flex max-w-sm gap-3">
              <Link href={heroEvent.href} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2634] px-4 text-sm font-black !text-white shadow-[0_18px_44px_rgba(229,9,20,0.36)] transition duration-200 hover:-translate-y-0.5">
                Book Now
              </Link>
              <button
                type="button"
                onClick={() => onSave(heroEvent.id)}
                className="grid min-h-12 w-14 place-items-center rounded-xl border border-white/70 bg-white text-[#e50914] shadow-[0_16px_34px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5"
                aria-label={saved.has(heroEvent.id) ? `Remove ${heroTitle} from wishlist` : `Save ${heroTitle}`}
              >
                <Heart className="size-5" fill="currentColor" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[var(--app-elevated)] p-4 sm:p-5">
          <p className="text-base font-black text-[var(--app-foreground)] sm:text-lg">Popular on Buizz</p>
          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {events.slice(0, 6).map((event) => (
                <TopBuizzCard
                  key={`top-buizz-${event.id}`}
                  event={event}
                  selectedCity={selectedCity}
                  active={heroEvent.id === event.id}
                  onSelect={setSelectedEventId}
                />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function TopBuizzCard({ event, selectedCity, active, onSelect }: { event: EventItem; selectedCity: string; active: boolean; onSelect: (id: string) => void }) {
  const title = withSelectedCity(event.title, selectedCity);

  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      aria-pressed={active}
      aria-label={`Show ${title} in featured section`}
      className={`group relative aspect-video w-40 shrink-0 snap-start overflow-hidden rounded-xl border bg-[var(--app-subtle)] text-left shadow-[0_12px_34px_rgba(0,0,0,0.16)] transition duration-200 hover:z-10 hover:scale-[1.03] hover:border-[#e50914]/55 sm:w-52 ${active ? "border-[#e50914] ring-2 ring-[#e50914]/20" : "border-[var(--app-border)]"}`}
    >
      <img src={event.image} alt="" className="size-full object-cover opacity-92 transition duration-200 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/24 to-transparent" />
      <div className="absolute inset-x-3 bottom-3 text-white">
        <p className="line-clamp-2 text-sm font-black leading-tight">{title}</p>
        <p className="mt-1 text-[11px] font-bold text-white/78">{event.rating} | {withSelectedCity(event.venue, selectedCity)}</p>
      </div>
    </button>
  );
}

function EventSection({ title, selectedCity, events, saved, onSave }: { title: string; selectedCity: string; events: EventItem[]; saved: Set<string>; onSave: (id: string) => void }) {
  return (
    <section className="mt-6 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-sm sm:mt-8 sm:p-5">
      <SectionTitle title={title} href="/events" />
      <div className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => <EventCard key={event.id} event={event} selectedCity={selectedCity} saved={saved.has(event.id)} onSave={onSave} />)}
      </div>
    </section>
  );
}

function SectionTitle({ title, href, subtitle, inverse = false, showAction = true }: { title: string; href?: string; subtitle?: string; inverse?: boolean; showAction?: boolean }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-[var(--app-foreground)] sm:text-2xl">{title}</h2>
        {subtitle ? <p className={`mt-1 text-xs font-semibold sm:text-sm ${inverse ? "text-[var(--app-muted)]" : "text-[var(--app-muted)]"}`}>{subtitle}</p> : null}
      </div>
      {showAction && href ? <Link href={href} className="inline-flex min-h-8 shrink-0 items-center rounded-md bg-[#090a12] px-3 text-xs font-black !text-white shadow-sm transition hover:bg-[#e50914] sm:min-h-9 sm:px-4">See All</Link> : null}
    </div>
  );
}

function EventCard({ event, selectedCity, saved, onSave }: { event: EventItem; selectedCity: string; saved: boolean; onSave: (id: string) => void }) {
  const title = withSelectedCity(event.title, selectedCity);
  const venue = withSelectedCity(event.venue, selectedCity);

  return (
    <article className="group w-[168px] shrink-0 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-sm transition hover:-translate-y-0.5 hover:border-[#e50914]/40 sm:w-[210px]">
      <div className="relative">
        <Link href={event.href} className="block"><div className="aspect-video overflow-hidden bg-[var(--app-subtle)]"><img src={event.image} alt={title} className="size-full object-cover transition duration-500 group-hover:scale-105" /></div></Link>
        <span className="absolute left-2 top-2 rounded bg-black/78 px-2 py-1 text-[10px] font-black text-white backdrop-blur sm:text-xs">{event.badge}</span>
        <button onClick={() => onSave(event.id)} className={`absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/58 text-white shadow-md backdrop-blur transition hover:bg-[#e50914] ${saved ? "bg-[#e50914] text-white" : ""}`} aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title}`}><Heart className="size-4" fill={saved ? "currentColor" : "none"} /></button>
      </div>
      <div className="p-3 sm:p-4">
        <Link href={event.href} className="line-clamp-1 text-sm font-black text-[var(--app-foreground)] hover:text-[#e50914]">{title}</Link>
        <div className="mt-3 space-y-1.5 text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">
          <p className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{event.date}</p>
          <p className="flex items-center gap-1.5"><MapPin className="size-3.5" />{venue}</p>
          <p className="flex items-center gap-1.5"><Star className="size-3.5 fill-[#f5b700] text-[#f5b700]" />{event.rating} - {event.interested}</p>
        </div>
        <p className="mt-3 text-sm font-black">{event.price}</p>
        <Link href={event.href} className="mt-3 inline-flex min-h-8 w-full items-center justify-center rounded-md bg-[#e50914] text-xs font-black !text-white transition hover:bg-[#ff2634] sm:min-h-9">Book Now</Link>
      </div>
    </article>
  );
}

function SpecialsSection() {
  return (
    <section className="mt-6 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-[var(--app-foreground)] shadow-sm sm:mt-8 sm:p-5">
      <SectionTitle title="Buizz Specials" inverse showAction={false} />
      <div className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {specials.slice(0, 6).map((category) => (
          <div key={category.title} className="w-[190px] shrink-0 sm:w-[220px]">
            <ImageCategoryCard category={category} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ImageCategoryCard({ category }: { category: CategoryTile }) {
  const Icon = category.icon;
  return (
    <Link href={category.href} className="group block overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] shadow-sm transition hover:-translate-y-0.5 hover:border-[#e50914]/40">
      <div className="relative aspect-video overflow-hidden bg-[var(--app-subtle)]">
        <img src={category.image} alt={category.title} className="size-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute left-2 top-2 grid size-8 place-items-center rounded-md bg-white/92 text-[#e50914] shadow-sm">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-black text-[var(--app-foreground)] sm:text-base">{category.title}</p>
        <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">{category.count}</p>
      </div>
    </Link>
  );
}

function PickedForYou({ selectedCity, events, saved, onSave }: { selectedCity: string; events: EventItem[]; saved: Set<string>; onSave: (id: string) => void }) {
  return (
    <section className="mt-6 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-sm sm:mt-8 sm:p-5">
      <SectionTitle title={`Picked For You in ${selectedCity}`} showAction={false} />
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => (
          <article key={`picked-${event.id}`} className="group relative h-52 w-40 shrink-0 overflow-hidden rounded-md bg-black shadow-sm transition duration-300 hover:z-10 hover:-translate-y-0.5 sm:h-60 sm:w-48">
            <Link href={event.href} aria-label={`Open ${withSelectedCity(event.title, selectedCity)}`} className="absolute inset-0 z-10" />
            <img src={event.image} alt={withSelectedCity(event.title, selectedCity)} className="absolute inset-0 size-full object-cover opacity-84 transition duration-500 group-hover:opacity-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/28 to-transparent" />
            <button onClick={() => onSave(event.id)} className={`absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-full bg-black/58 text-white backdrop-blur transition hover:bg-[#e50914] ${saved.has(event.id) ? "bg-[#e50914] text-white" : ""}`} aria-label={saved.has(event.id) ? `Remove ${withSelectedCity(event.title, selectedCity)} from wishlist` : `Save ${withSelectedCity(event.title, selectedCity)}`}><Heart className="size-4" fill={saved.has(event.id) ? "currentColor" : "none"} /></button>
            <div className="absolute inset-x-4 bottom-4 z-20 text-white">
              <p className="line-clamp-2 text-base font-black sm:text-lg">{withSelectedCity(event.title, selectedCity)}</p>
              <p className="mt-2 text-xs font-bold text-white/72">{event.type} - {event.date}</p>
              <Link href={event.href} className="mt-3 inline-flex min-h-8 items-center gap-2 rounded-md bg-[#e50914] px-3 text-xs font-black !text-white transition hover:bg-[#ff2634]">Book Ticket <ArrowRight className="size-3.5" /></Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MoreCategories() {
  return (
    <section className="mt-6 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-sm sm:mt-8 sm:p-5">
      <SectionTitle title="Explore More Categories" showAction={false} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {moreCategories.slice(0, 8).map((category) => <ImageCategoryCard key={category.title} category={category} />)}
      </div>
    </section>
  );
}

function HostPanel() {
  return (
    <section className="mt-6 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 py-4 text-[var(--app-foreground)] shadow-sm sm:mt-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black sm:text-xl">Host with Buizz</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">List your event and reach the right audience.</p>
        </div>
        <Link href="/organizer" className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#090a12] px-5 text-sm font-black !text-white transition hover:bg-[#e50914]">
          List Your Event
        </Link>
      </div>
    </section>
  );
}

function withSelectedCity(text: string, city: string) {
  return text.replace(/\bin Pune\b/g, `in ${city}`).replace(/\bPune\b/g, city);
}

function getHomeEventDescription(event: EventItem, selectedCity: string) {
  return `Experience ${withSelectedCity(event.title, selectedCity)} with verified entry, smooth booking, and a premium ${event.type.toLowerCase()} crowd around you.`;
}
