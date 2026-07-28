

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Heart,
  Landmark,
  Ticket,
  Sparkles,
  MapPin,
  Mic2,
  Music,
  Star,
  ChevronLeft,
  ChevronRight,
  Theater,
  Trophy,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Footer } from "@/components/common/Footer";
import type { DiscoveryItem } from "@/features/discovery/data";
import { serverEventToDiscoveryItem } from "@/features/discovery/serverEventAdapter";
import { useAppStore } from "@/store/app.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useGetEventsQuery } from "@/store/api";

type EventType =
  | "Music"
  | "Comedy"
  | "Plays"
  | "Activities"
  | "Workshops"
  | "Festivals"
  | "Business";

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

type RecentlyViewedItem = EventItem & {
  viewedAt: string;
};

type CategoryTile = {
  title: string;
  count: string;
  image: string;
  href: string;
  icon: LucideIcon;
};

const recentlyViewedKey = "buizz-recently-viewed-items";

const cityHeroImages: Record<string, string> = {
  Pune: "/images/cities/pune.png",
  Chh_Sambhaji_Nagar: "/images/cities/Chhatrapati Sambhaji Nagar.png", Nashik: "/images/cities/Nashik.png",

  Mumbai: "/images/cities/mumbai.png",
  Delhi: "/images/cities/delhi.png",
  Bangalore: "/images/cities/bangalore.png",
  Bengaluru: "/images/cities/bangalore.png",
  Hyderabad: "/images/cities/hyderabad.png",
  Chennai: "/images/cities/chennai.png",
  Kolkata: "/images/cities/kolkata.png",
  Jaipur: "/images/cities/jaipur.png",
  Goa: "/images/cities/goa.png",
};

const specials: CategoryTile[] = [
  {
    title: "Music Concerts",
    count: "Browse events",
    icon: Music,
    href: "/events/category/music-events",
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Comedy Shows",
    count: "Browse events",
    icon: Mic2,
    href: "/events/category/comedy-events",
    image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Workshops",
    count: "Browse events",
    icon: Workflow,
    href: "/events/category/workshops",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Festivals",
    count: "Browse events",
    icon: Sparkles,
    href: "/events/category/festivals",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Plays & Theatre",
    count: "Browse shows",
    icon: Theater,
    href: "/plays/category/marathi-plays",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Activities",
    count: "Browse activities",
    icon: Trophy,
    href: "/activities",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
  },
];

const moreCategories: CategoryTile[] = [
  {
    title: "Business",
    count: "48 experiences",
    icon: Workflow,
    href: "/events/category/business-events",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Spiritual",
    count: "22 experiences",
    icon: Landmark,
    href: "/events/category/spiritual-events",
    image:
      "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Exhibitions",
    count: "34 experiences",
    icon: Star,
    href: "/events/category/exhibitions",
    image:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Startup Meetups",
    count: "29 experiences",
    icon: Users,
    href: "/events/category/business-events",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Networking",
    count: "33 experiences",
    icon: Users,
    href: "/events/category/business-events",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Art & Culture",
    count: "43 experiences",
    icon: Theater,
    href: "/events/category/art-culture",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Sports",
    count: "31 experiences",
    icon: Trophy,
    href: "/events/category/sports-events",
    image:
      "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Community",
    count: "25 experiences",
    icon: Users,
    href: "/events/category/social-mixers",
    image:
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=80",
  },
];

function getCityHeroImage(city: string) {
  return cityHeroImages[city] ?? "/images/cities/pune.png";
}

function getSafeItemHref(item: Partial<EventItem>) {
  if (typeof item.href === "string" && item.href.trim()) {
    return item.href;
  }

  const type = String(item.type ?? "").toLowerCase();
  const id = String(item.id ?? "");

  if (type.includes("play")) return `/plays/${id}`;
  if (type.includes("activity")) return `/activities/${id}`;

  return `/events/${id}`;
}

function saveRecentlyViewedItem(item: EventItem) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(recentlyViewedKey);
    const existing = raw ? (JSON.parse(raw) as RecentlyViewedItem[]) : [];

    const safeItem: RecentlyViewedItem = {
      ...item,
      href: getSafeItemHref(item),
      viewedAt: new Date().toISOString(),
    };

    const next = [
      safeItem,
      ...existing.filter((oldItem) => oldItem.id !== item.id),
    ].slice(0, 12);

    window.localStorage.setItem(recentlyViewedKey, JSON.stringify(next));
  } catch {
    // Ignore localStorage errors.
  }
}

function getHomeEventType(item: DiscoveryItem): EventType {
  const value = `${item.category} ${item.genre} ${item.kind}`.toLowerCase();

  if (value.includes("play") || value.includes("theatre")) return "Plays";
  if (value.includes("workshop")) return "Workshops";
  if (value.includes("activit")) return "Activities";
  if (value.includes("comedy")) return "Comedy";
  if (value.includes("festival") || value.includes("fest")) return "Festivals";
  if (value.includes("business") || value.includes("startup")) return "Business";

  return "Music";
}

function getHomeEventHref(item: DiscoveryItem, type: EventType) {
  if (type === "Plays") return `/plays/${item.id}`;
  if (type === "Activities" || type === "Workshops") {
    return `/activities/${item.id}`;
  }

  return `/events/${item.id}`;
}

function discoveryItemToHomeEvent(item: DiscoveryItem): EventItem {
  const type = getHomeEventType(item);

  return {
    id: item.id,
    title: item.title,
    date: item.slot || item.date,
    venue: [item.venue, item.city].filter(Boolean).join(", "),
    price: item.priceLabel,
    type,
    href: getHomeEventHref(item, type),
    badge: item.badge,
    rating: item.rating > 0 ? String(item.rating) : "Live",
    interested: item.popularity > 0 ? `${item.popularity} views` : "Published",
    image: item.image,
  };
}

function isCityMatch(event: EventItem, city: string) {
  return `${event.title} ${event.venue}`
    .toLowerCase()
    .includes(city.toLowerCase());
}

function withSelectedCity(text: string, city: string) {
  if (!city) return text;

  return text
    .replace(/\bin Pune\b/g, `in ${city}`)
    .replace(/\bPune\b/g, city);
}

function getHomeEventDescription(event: EventItem) {
  return `Experience ${event.title} with verified entry, smooth booking, and a premium ${event.type.toLowerCase()} crowd around you.`;
}

function SectionTitle({
  title,
  href,
  subtitle,
  showAction = true,
}: {
  title: string;
  href?: string;
  subtitle?: string;
  showAction?: boolean;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
      <div className="min-w-0">
        <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--app-foreground)] sm:text-2xl">
          {title}
        </h2>

        {subtitle ? (
          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)] sm:text-sm">
            {subtitle}
          </p>
        ) : null}
      </div>

      {showAction && href ? (
        <Link
          href={href}
          className="buizz-button-solid min-h-9 shrink-0 rounded-xl px-4 text-xs"
        >
          See All
        </Link>
      ) : null}
    </div>
  );
}

function CarouselShell({
  children,
  className = "mt-2",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible scroll-smooth pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}


function TopBuizzSection({
  selectedCity,
  events,
  saved,
  onSave,
}: {
  selectedCity: string;
  events: EventItem[];
  saved: Set<string>;
  onSave: (id: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!events.length) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % events.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [events.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedCity, events.length]);

  const heroEvent = events[activeIndex] ?? events[0];

  if (!heroEvent) return null;

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + events.length) % events.length);
  };

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % events.length);
  };

  return (
    <>
      {/* Desktop city hero only */}
      <section className="relative mt-5 hidden min-h-[250px] items-end overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-8 py-10 shadow-sm sm:flex">
        <Image
          src={getCityHeroImage(selectedCity)}
          alt={`${selectedCity} events`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px"
          className="object-cover"
          priority
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/58 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

        <div className="relative max-w-[820px]">
          <p className="mb-4 inline-flex rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white backdrop-blur-xl">
            Discover Events In {selectedCity}
          </p>

          <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-[-0.05em] text-white lg:text-6xl">
            What&apos;s Happening In {selectedCity}
          </h1>

          <div className="mt-4 h-1 w-28 rounded-full bg-[linear-gradient(90deg,var(--color-brand-primary),var(--color-brand-secondary))]" />
        </div>
      </section>

      {/* Mobile + desktop auto hero event */}
      <section className="group mt-3 overflow-hidden rounded-[26px] border border-[var(--app-border)] bg-black shadow-[0_18px_55px_rgba(0,0,0,0.2)] sm:mt-4 sm:rounded-3xl">
        <div className="relative min-h-[455px] overflow-hidden sm:min-h-[430px] lg:min-h-[460px]">
          <img
            key={heroEvent.id}
            src={heroEvent.image}
            alt={heroEvent.title}
            className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/72 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-transparent" />

          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-2.5 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur transition hover:bg-white hover:text-slate-950 sm:left-5 sm:size-11"
            aria-label="Previous event"
          >
            <ChevronLeft className="size-5" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            className="absolute right-2.5 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur transition hover:bg-white hover:text-slate-950 sm:right-5 sm:size-11"
            aria-label="Next event"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="relative flex min-h-[455px] max-w-[760px] flex-col justify-end py-5 pl-14 pr-4 text-white sm:min-h-[430px] sm:py-8 sm:pl-24 sm:pr-8 lg:min-h-[460px]">
            <p className="w-fit rounded-lg bg-[var(--color-brand-primary)] px-2.5 py-1 text-[9px] font-black uppercase text-white sm:text-[10px]">
              {heroEvent.badge}
            </p>

            <h2 className="mt-3 max-w-2xl text-[28px] font-black leading-[1.02] tracking-[-0.05em] text-white sm:mt-4 sm:text-5xl">
              {heroEvent.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-white/85 sm:mt-4 sm:gap-x-3 sm:text-sm">
              <span>{heroEvent.date}</span>
              <span>|</span>
              <span>8:00 PM</span>
              <span>|</span>
              <span>{heroEvent.type}</span>
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-white/90 sm:mt-3 sm:text-sm">
              <MapPin className="size-3.5 shrink-0 sm:size-4" />
              <span className="line-clamp-1">{heroEvent.venue}</span>
            </p>

            <p className="mt-3 line-clamp-2 max-w-md text-xs font-semibold leading-5 text-white/78 sm:mt-4 sm:text-sm sm:leading-6">
              {getHomeEventDescription(heroEvent)}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-black sm:mt-4 sm:gap-2 sm:text-xs">
              <span className="rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 text-white/90 sm:px-3 sm:py-2">
                {heroEvent.rating} Rated
              </span>
              <span className="rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 text-white/90 sm:px-3 sm:py-2">
                {heroEvent.interested}
              </span>
              <span className="rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 text-white/90 sm:px-3 sm:py-2">
                Verified
              </span>
            </div>

            <p className="mt-3 text-xs font-black text-white sm:mt-4 sm:text-sm">
              {heroEvent.price}
            </p>

            <div className="mt-4 flex w-full max-w-md gap-2.5 sm:mt-5 sm:gap-3">
              <Link
                href={heroEvent.href}
                onClick={() => saveRecentlyViewedItem(heroEvent)}
                className="buizz-button-primary min-h-11 flex-1 rounded-xl px-4 text-xs sm:min-h-12 sm:text-sm"
              >
                Book Now
              </Link>

              <button
                type="button"
                onClick={() => onSave(heroEvent.id)}
                className={`grid min-h-11 w-12 place-items-center rounded-xl border shadow-[0_16px_34px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 hover:scale-105 sm:min-h-12 sm:w-14 ${saved.has(heroEvent.id)
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
                  : "border-white/70 bg-white text-[var(--color-brand-primary)]"
                  }`}
                aria-label={saved.has(heroEvent.id) ? "Remove from wishlist" : "Save event"}
              >
                <Heart className="size-4.5 sm:size-5" fill="currentColor" />
              </button>
            </div>

            <div className="mt-4 flex gap-1.5 sm:mt-5 sm:gap-2">
              {events.map((event, index) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${index === activeIndex
                    ? "w-7 bg-[var(--color-brand-primary)] sm:w-8"
                    : "w-2 bg-white/40"
                    }`}
                  aria-label={`Show ${event.title}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function EventCard({
  event,
  selectedCity,
  saved,
  onSave,
}: {
  event: EventItem;
  selectedCity: string;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  const title = withSelectedCity(event.title, selectedCity);
  const venue = withSelectedCity(event.venue, selectedCity);

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/40 hover:shadow-[0_18px_48px_rgba(236,27,114,0.16)]">
      <div className="relative">
        <Link
          href={event.href}
          onClick={() => saveRecentlyViewedItem(event)}
          className="block"
        >
          <div className="aspect-video overflow-hidden bg-[var(--app-subtle)]">
            <img
              src={event.image}
              alt={title}
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
        </Link>

        <span className="absolute left-2 top-2 z-20 rounded-lg bg-black/78 px-2 py-1 text-[10px] font-black text-white backdrop-blur sm:text-xs">
          {event.badge}
        </span>

        <button
          type="button"
          onClick={() => onSave(event.id)}
          className={`absolute right-2 top-2 z-20 grid size-8 place-items-center rounded-full text-white shadow-md backdrop-blur transition hover:bg-[var(--color-brand-primary)] ${saved ? "bg-[var(--color-brand-primary)]" : "bg-black/58"
            }`}
          aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title}`}
        >
          <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-3 sm:p-4">
        <Link
          href={event.href}
          onClick={() => saveRecentlyViewedItem(event)}
          className="line-clamp-1 text-sm font-black text-[var(--app-foreground)] transition hover:text-[var(--color-brand-primary)]"
        >
          {title}
        </Link>

        <div className="mt-3 space-y-1.5 text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" />
            <span className="line-clamp-1">{event.date}</span>
          </p>

          <p className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            <span className="line-clamp-1">{venue}</span>
          </p>

          <p className="flex items-center gap-1.5">
            <Star className="size-3.5 shrink-0 fill-[var(--color-brand-accent)] text-[var(--color-brand-accent)]" />
            <span className="line-clamp-1">
              {event.rating} - {event.interested}
            </span>
          </p>
        </div>

        <p className="mt-3 text-sm font-black text-[var(--app-foreground)]">
          {event.price}
        </p>

        <Link
          href={event.href}
          onClick={() => saveRecentlyViewedItem(event)}
          className="buizz-button-primary mt-3 min-h-9 w-full rounded-xl px-4 text-xs"
        >
          Book Now
        </Link>
      </div>
    </article>
  );
}

function ImageCategoryCard({ category }: { category: CategoryTile }) {
  const Icon = category.icon;

  return (
    <Link
      href={category.href}
      className="group block overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/40 hover:shadow-[0_18px_48px_rgba(236,27,114,0.14)]"
    >
      <div className="relative aspect-video overflow-hidden bg-[var(--app-subtle)]">
        <img
          src={category.image}
          alt={category.title}
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 grid size-9 place-items-center rounded-xl bg-white/92 text-[var(--color-brand-primary)] shadow-sm">
          <Icon className="size-4" />
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <p className="text-sm font-black text-[var(--app-foreground)] sm:text-base">
          {category.title}
        </p>
        <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">
          {category.count}
        </p>
      </div>
    </Link>
  );
}

function PickedEventCard({
  event,
  saved,
  onSave,
}: {
  event: EventItem;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  return (
    <article className="group relative min-h-56 w-[190px] shrink-0 snap-start overflow-hidden rounded-3xl bg-black shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_52px_rgba(236,27,114,0.20)] sm:w-[220px] lg:w-[240px]">
      <Link
        href={event.href}
        onClick={() => saveRecentlyViewedItem(event)}
        aria-label={`Open ${event.title}`}
        className="absolute inset-0 z-10"
      />

      <img
        src={event.image}
        alt={event.title}
        className="absolute inset-0 size-full object-cover opacity-85 transition duration-500 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

      <button
        type="button"
        onClick={() => onSave(event.id)}
        className={`absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full text-white backdrop-blur transition hover:bg-[var(--color-brand-primary)] ${saved ? "bg-[var(--color-brand-primary)]" : "bg-black/60"
          }`}
        aria-label={saved ? `Remove ${event.title}` : `Save ${event.title}`}
      >
        <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
      </button>

      <div className="absolute inset-x-4 bottom-4 z-20 text-white">
        <p className="line-clamp-2 text-lg font-black">{event.title}</p>
        <p className="mt-2 line-clamp-1 text-xs font-semibold text-white/75">
          {event.type} • {event.date}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-black text-white shadow-lg">
          Book Ticket <ArrowRight className="size-3.5" />
        </div>
      </div>
    </article>
  );
}

function HomeCardSkeletonRow() {
  return (
    <div className="-mx-3 mt-2 flex gap-4 overflow-hidden px-3 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="w-[190px] shrink-0 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] sm:w-[210px] lg:w-[230px]"
        >
          <div className="relative aspect-video overflow-hidden bg-[var(--app-subtle)]">
            <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>

          <div className="space-y-3 p-3">
            <div className="relative h-4 w-4/5 overflow-hidden rounded-full bg-[var(--app-subtle)]">
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>

            <div className="relative h-3 w-3/5 overflow-hidden rounded-full bg-[var(--app-subtle)]">
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>

            <div className="relative h-8 w-full overflow-hidden rounded-xl bg-[var(--app-subtle)]">
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HomeEmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center">
      <Sparkles className="mx-auto size-8 text-[var(--color-brand-primary)]" />
      <h3 className="mt-3 text-lg font-black text-[var(--app-foreground)]">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--app-muted)]">
        {description}
      </p>
      <Link href={href} className="buizz-button-primary mt-4 px-5">
        {action}
      </Link>
    </div>
  );
}

function EventSection({
  title,
  selectedCity,
  events,
  saved,
  onSave,
  loading = false,
}: {
  title: string;
  selectedCity: string;
  events: EventItem[];
  saved: Set<string>;
  onSave: (id: string) => void;
  loading?: boolean;
}) {
  return (
    <section className="mt-8 sm:mt-10">
      <SectionTitle title={title} href="/events" />

      {loading ? (
        <HomeCardSkeletonRow />
      ) : events.length ? (
        <CarouselShell>
          {events.map((event) => (
            <div
              key={event.id}
              className="w-[190px] shrink-0 snap-start sm:w-[210px] lg:w-[230px]"
            >
              <EventCard
                event={event}
                selectedCity={selectedCity}
                saved={saved.has(event.id)}
                onSave={onSave}
              />
            </div>
          ))}
        </CarouselShell>
      ) : (
        <HomeEmptyState
          title="No events found"
          description={`We could not find events in ${selectedCity}. Explore all Buizz experiences instead.`}
          href="/events"
          action="Explore Events"
        />
      )}
    </section>
  );
}

function SpecialsSection({ loading = false }: { loading?: boolean }) {
  return (
    <section className="mt-8 sm:mt-10">
      <SectionTitle title="Buizz Specials" showAction={false} />

      {loading ? (
        <HomeCardSkeletonRow />
      ) : specials.length ? (
        <CarouselShell>
          {specials.map((category) => (
            <div
              key={category.title}
              className="w-[190px] shrink-0 snap-start sm:w-[210px] lg:w-[230px]"
            >
              <ImageCategoryCard category={category} />
            </div>
          ))}
        </CarouselShell>
      ) : (
        <HomeEmptyState
          title="No specials available"
          description="Buizz special categories will appear here soon."
          href="/events"
          action="Browse Events"
        />
      )}
    </section>
  );
}

function PickedForYou({
  events,
  saved,
  onSave,
}: {
  events: EventItem[];
  saved: Set<string>;
  onSave: (id: string) => void;
}) {
  return (
    <section className="mt-8 sm:mt-10">
      <SectionTitle title="Picked For You" showAction={false} />

      {events.length ? (
        <CarouselShell>
          {events.map((event) => (
            <PickedEventCard
              key={`picked-${event.id}`}
              event={event}
              saved={saved.has(event.id)}
              onSave={onSave}
            />
          ))}
        </CarouselShell>
      ) : (
        <HomeEmptyState
          title="No picks available"
          description="Events, plays, and activities picked for you will appear here."
          href="/events"
          action="Explore Now"
        />
      )}
    </section>
  );
}

function RecentlyViewed({
  saved,
  onSave,
}: {
  saved: Set<string>;
  onSave: (id: string) => void;
}) {
  const [recentItems, setRecentItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(recentlyViewedKey);
      const parsed = raw ? (JSON.parse(raw) as RecentlyViewedItem[]) : [];

      const safeItems = Array.isArray(parsed)
        ? parsed
          .filter((item) => item && item.id)
          .map((item) => ({
            ...item,
            href: getSafeItemHref(item),
          }))
        : [];

      setRecentItems(safeItems);
    } catch {
      setRecentItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="mt-8 sm:mt-10">
      <SectionTitle title="Recently Viewed" showAction={false} />

      {loading ? (
        <HomeCardSkeletonRow />
      ) : recentItems.length ? (
        <CarouselShell>
          {recentItems.map((event) => (
            <div
              key={`recent-${event.id}`}
              className="w-[190px] shrink-0 snap-start sm:w-[210px] lg:w-[230px]"
            >
              <EventCard
                event={event}
                selectedCity=""
                saved={saved.has(event.id)}
                onSave={onSave}
              />
            </div>
          ))}
        </CarouselShell>
      ) : (
        <HomeEmptyState
          title="No recently viewed experiences"
          description="Events, plays, and activities you open will appear here."
          href="/events"
          action="Start Exploring"
        />
      )}
    </section>
  );
}

function MoreCategories() {
  return (
    <section className="mt-7 sm:mt-10">
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5 sm:mb-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
            Explore
          </p>
          <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[var(--app-foreground)] sm:text-2xl">
            More Categories
          </h2>
        </div>

        <Link
          href="/events"
          className="hidden text-xs font-black text-[var(--color-brand-primary)] sm:inline-flex"
        >
          View all
        </Link>
      </div>

      {/* Mobile: food-app style 2-column cards */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {moreCategories.map((category) => (
          <MobileCategoryCard key={category.title} category={category} />
        ))}
      </div>

      {/* Tablet/Desktop: keep bigger existing premium layout */}
      <div className="hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-sm sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {moreCategories.map((category) => (
          <ImageCategoryCard key={category.title} category={category} />
        ))}
      </div>
    </section>
  );
}
function MobileCategoryCard({ category }: { category: CategoryTile }) {
  const Icon = category.icon;

  return (
    <Link
      href={category.href}
      className="group min-w-0 overflow-hidden rounded-[18px] bg-white shadow-[0_10px_26px_rgba(15,23,42,0.08)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.12)] dark:bg-[var(--app-elevated)] dark:ring-white/10"
    >
      <div className="relative aspect-[1.03/1] overflow-hidden bg-slate-100">
        <Image
          src={category.image}
          alt={category.title}
          fill
          sizes="(max-width: 640px) 46vw, 220px"
          className="object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-transparent" />

        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <div className="flex items-center gap-1.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/95 text-[var(--color-brand-primary)] shadow-sm">
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0 truncate rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-900">
              {category.count}
            </span>
          </div>

          <h3 className="mt-2 line-clamp-1 text-[15px] font-black leading-none tracking-[-0.03em] text-white">
            {category.title}
          </h3>
        </div>
      </div>

      <div className="px-2.5 py-2">
        <p className="line-clamp-1 text-[11px] font-bold text-[var(--app-muted)]">
          Explore {category.title.toLowerCase()} near you
        </p>
      </div>
    </Link>
  );
}

function HostPanel() {
  return (
    <section className="mt-6 sm:mt-8">
      <div className="overflow-hidden rounded-[20px] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="relative flex items-center justify-between gap-3 bg-[linear-gradient(135deg,#FFF7FB,#F7F3FF)] px-3.5 py-3.5 sm:px-5 sm:py-5">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-[radial-gradient(circle_at_top_right,rgba(236,27,114,0.14),transparent_65%)]" />

          <div className="relative min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#EC1B72] sm:text-[10px]">
              Organizer tools
            </p>

            <h2 className="mt-1 text-[17px] font-black leading-tight tracking-[-0.03em] text-[#111827] sm:text-2xl">
              Host with Buizz
            </h2>

            <p className="mt-1 line-clamp-2 max-w-xl text-[11px] font-semibold leading-4 text-slate-600 sm:text-sm sm:leading-5">
              List events, sell tickets and manage bookings from one clean workspace.
            </p>
          </div>

          <Link
            href="/organizer/intro"
            className="relative shrink-0 rounded-full bg-[#EC1B72] px-3.5 py-2 text-[10px] font-black text-white shadow-[0_10px_24px_rgba(236,27,114,0.22)] transition hover:bg-[#6626B9] sm:px-5 sm:py-2.5 sm:text-xs"
          >
            List Event
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const selectedCityFromStore = useAppStore((state) => state.selectedCity);
  const selectedCity = selectedCityFromStore || "";

  const { data: eventsData, isLoading: isHomeLoading } = useGetEventsQuery({
    page: 1,
    limit: 24,
    status: "published",
  });

  const savedIds = useWishlistStore((state) => state.savedIds);
  const toggleSaved = useWishlistStore((state) => state.toggleSaved);

  const saved = useMemo(() => new Set(savedIds), [savedIds]);

  const allHomeEvents = useMemo(
    () => (eventsData?.data?.events ?? []).map(serverEventToDiscoveryItem).map(discoveryItemToHomeEvent),
    [eventsData?.data?.events],
  );

  const cityEvents = useMemo(
    () => allHomeEvents.filter((event) => isCityMatch(event, selectedCity)),
    [allHomeEvents, selectedCity],
  );

  const upcomingEvents = cityEvents.length ? cityEvents : allHomeEvents.slice(0, 6);
  const pickedItems = allHomeEvents;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="mx-auto w-full max-w-[1600px] px-3 pb-8 sm:px-6 lg:px-8">
        <TopBuizzSection
          selectedCity={selectedCity}
          events={allHomeEvents}
          saved={saved}
          onSave={toggleSaved}
        />

        <EventSection
          title={`Upcoming Events in ${selectedCity}`}
          selectedCity={selectedCity}
          events={upcomingEvents}
          saved={saved}
          onSave={toggleSaved}
          loading={isHomeLoading}
        />

        <SpecialsSection loading={isHomeLoading} />

        <PickedForYou
          events={pickedItems}
          saved={saved}
          onSave={toggleSaved}
        />

        <RecentlyViewed saved={saved} onSave={toggleSaved} />

        <MoreCategories />

        <HostPanel />
      </div>

      <Footer />
    </main>
  );
}
