"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Heart,
  Landmark,
  MapPin,
  Martini,
  Mic2,
  Music,
  Paintbrush,
  Sparkles,
  Star,
  Theater,
  Trophy,
  Users,
  Utensils,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Footer } from "@/components/common/Footer";
import { useAppStore } from "@/store/app.store";

type EventCategory =
  | "Music"
  | "Nightlife"
  | "Comedy"
  | "Sports"
  | "Performances"
  | "Food & Drinks"
  | "Fests & Fairs"
  | "Workshops"
  | "Spirituality"
  | "Business"
  | "Art & Culture"
  | "Kids & Family";

type LanguageFilter = "All Languages" | "Hindi" | "Marathi" | "English";
type PriceFilter = "All Prices" | "Free" | "Under Rs. 500" | "Rs. 500 - Rs. 1000" | "Above Rs. 1000";
type VenueFilter = "All Venues" | "Auditorium" | "Arena" | "Open Air" | "Mall" | "Studio";
type MoreFilter = "All Events" | "Family Friendly" | "Premium Picks" | "Near You";
type SortMode = "Recommended" | "Top Rated" | "Price Low" | "Newest First";

type EventItem = {
  id: string;
  title: string;
  category: EventCategory;
  subcategory: string;
  date: string;
  venue: string;
  venueType: VenueFilter;
  language: Exclude<LanguageFilter, "All Languages">;
  price: number;
  priceLabel: string;
  rating: number;
  interested: string;
  more: Exclude<MoreFilter, "All Events">;
  image: string;
  href: string;
};

type CategoryTile = {
  title: EventCategory;
  count: string;
  image: string;
  icon: LucideIcon;
};

const sortModes: SortMode[] = ["Recommended", "Top Rated", "Price Low", "Newest First"];
const languageFilters: LanguageFilter[] = ["All Languages", "Hindi", "Marathi", "English"];
const priceFilters: PriceFilter[] = ["All Prices", "Free", "Under Rs. 500", "Rs. 500 - Rs. 1000", "Above Rs. 1000"];
const venueFilters: VenueFilter[] = ["All Venues", "Auditorium", "Arena", "Open Air", "Mall", "Studio"];
const moreFilters: MoreFilter[] = ["All Events", "Family Friendly", "Premium Picks", "Near You"];

const events: EventItem[] = [
  {
    id: "arijit",
    title: "Arijit Singh - Live in Pune",
    category: "Music",
    subcategory: "Music Concert",
    date: "25 May 2026",
    venue: "Mahalaxmi Lawns, Pune",
    venueType: "Open Air",
    language: "Hindi",
    price: 999,
    priceLabel: "Rs. 999 onwards",
    rating: 4.8,
    interested: "12K",
    more: "Premium Picks",
    href: "/events/1",
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "zakir",
    title: "Zakir Khan - Live",
    category: "Comedy",
    subcategory: "Standup Comedy",
    date: "30 May 2026",
    venue: "Symbiosis Auditorium, Pune",
    venueType: "Auditorium",
    language: "Hindi",
    price: 799,
    priceLabel: "Rs. 799 onwards",
    rating: 4.7,
    interested: "8.5K",
    more: "Premium Picks",
    href: "/events/4",
    image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "natsamrat",
    title: "Natsamrat - Play",
    category: "Performances",
    subcategory: "Marathi Play",
    date: "02 June 2026",
    venue: "Bal Gandharva, Pune",
    venueType: "Auditorium",
    language: "Marathi",
    price: 599,
    priceLabel: "Rs. 599 onwards",
    rating: 4.6,
    interested: "6.2K",
    more: "Family Friendly",
    href: "/events/2",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "food",
    title: "Food Fest Pune",
    category: "Food & Drinks",
    subcategory: "Food & Drinks",
    date: "05 June 2026",
    venue: "Phoenix Marketcity, Pune",
    venueType: "Mall",
    language: "English",
    price: 299,
    priceLabel: "Rs. 299 onwards",
    rating: 4.6,
    interested: "5.1K",
    more: "Family Friendly",
    href: "/events/5",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "startup",
    title: "Startup Summit 2026",
    category: "Business",
    subcategory: "Business & Talks",
    date: "10 June 2026",
    venue: "ICC Pune",
    venueType: "Arena",
    language: "English",
    price: 1499,
    priceLabel: "Rs. 1499 onwards",
    rating: 4.7,
    interested: "3.2K",
    more: "Premium Picks",
    href: "/events/6",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "yoga",
    title: "Yoga & Wellness",
    category: "Spirituality",
    subcategory: "Health & Fitness",
    date: "12 June 2026",
    venue: "Osho Garden, Pune",
    venueType: "Open Air",
    language: "English",
    price: 0,
    priceLabel: "Free",
    rating: 4.6,
    interested: "2.1K",
    more: "Near You",
    href: "/events/3",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "sports",
    title: "Champions Turf League",
    category: "Sports",
    subcategory: "Sports",
    date: "14 June 2026",
    venue: "Shiv Chhatrapati Sports City",
    venueType: "Arena",
    language: "English",
    price: 349,
    priceLabel: "Rs. 349 onwards",
    rating: 4.5,
    interested: "4.4K",
    more: "Near You",
    href: "/events/7",
    image: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "nightlife",
    title: "Neon Nights Social",
    category: "Nightlife",
    subcategory: "Nightlife",
    date: "15 June 2026",
    venue: "High Street, Pune",
    venueType: "Studio",
    language: "English",
    price: 699,
    priceLabel: "Rs. 699 onwards",
    rating: 4.7,
    interested: "7.4K",
    more: "Premium Picks",
    href: "/events/8",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "art",
    title: "Mask & Movement Theatre",
    category: "Art & Culture",
    subcategory: "Art & Culture",
    date: "18 June 2026",
    venue: "Tilak Smarak Mandir, Pune",
    venueType: "Auditorium",
    language: "Marathi",
    price: 449,
    priceLabel: "Rs. 449 onwards",
    rating: 4.5,
    interested: "2.8K",
    more: "Family Friendly",
    href: "/events/9",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "concert-night",
    title: "Indie Arena Live",
    category: "Music",
    subcategory: "Live Concert",
    date: "20 June 2026",
    venue: "Amanora Arena, Pune",
    venueType: "Arena",
    language: "Hindi",
    price: 899,
    priceLabel: "Rs. 899 onwards",
    rating: 4.8,
    interested: "9.8K",
    more: "Premium Picks",
    href: "/events/10",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "workshop",
    title: "Creative Makers Workshop",
    category: "Workshops",
    subcategory: "Workshop",
    date: "22 June 2026",
    venue: "Koregaon Park Studio",
    venueType: "Studio",
    language: "English",
    price: 499,
    priceLabel: "Rs. 499 onwards",
    rating: 4.4,
    interested: "1.8K",
    more: "Near You",
    href: "/events/11",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "family",
    title: "Kids Carnival Weekend",
    category: "Kids & Family",
    subcategory: "Kids & Family",
    date: "23 June 2026",
    venue: "Seasons Mall, Pune",
    venueType: "Mall",
    language: "English",
    price: 0,
    priceLabel: "Free",
    rating: 4.3,
    interested: "3.6K",
    more: "Family Friendly",
    href: "/events/12",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80",
  },
];

const categories: CategoryTile[] = [
  { title: "Music", count: "120+ Events", icon: Music, image: events[0].image },
  { title: "Nightlife", count: "58+ Events", icon: Martini, image: events[7].image },
  { title: "Comedy", count: "75+ Events", icon: Mic2, image: events[1].image },
  { title: "Sports", count: "31+ Events", icon: Trophy, image: events[6].image },
  { title: "Performances", count: "42+ Events", icon: Theater, image: events[2].image },
  { title: "Food & Drinks", count: "44+ Events", icon: Utensils, image: events[3].image },
  { title: "Fests & Fairs", count: "40+ Events", icon: Sparkles, image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80" },
  { title: "Workshops", count: "65+ Events", icon: Workflow, image: events[10].image },
  { title: "Spirituality", count: "22+ Events", icon: Landmark, image: events[5].image },
  { title: "Business", count: "48+ Events", icon: BriefcaseBusiness, image: events[4].image },
  { title: "Art & Culture", count: "43+ Events", icon: Paintbrush, image: events[8].image },
  { title: "Kids & Family", count: "28+ Events", icon: Users, image: events[11].image },
];

export function EventsPage() {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const [saved, setSaved] = useState<Set<string>>(new Set(["arijit", "nightlife"]));
  const [activeCategory, setActiveCategory] = useState<EventCategory | "All">("All");
  const [language, setLanguage] = useState<LanguageFilter>("All Languages");
  const [price, setPrice] = useState<PriceFilter>("All Prices");
  const [venue, setVenue] = useState<VenueFilter>("All Venues");
  const [more, setMore] = useState<MoreFilter>("All Events");
  const [sortMode, setSortMode] = useState<SortMode>("Recommended");

  const filteredEvents = useMemo(() => {
    const next = events.filter((event) => {
      const categoryMatch = activeCategory === "All" || event.category === activeCategory;
      const languageMatch = language === "All Languages" || event.language === language;
      const venueMatch = venue === "All Venues" || event.venueType === venue;
      const moreMatch = more === "All Events" || event.more === more;
      const priceMatch =
        price === "All Prices" ||
        (price === "Free" && event.price === 0) ||
        (price === "Under Rs. 500" && event.price > 0 && event.price < 500) ||
        (price === "Rs. 500 - Rs. 1000" && event.price >= 500 && event.price <= 1000) ||
        (price === "Above Rs. 1000" && event.price > 1000);

      return categoryMatch && languageMatch && venueMatch && moreMatch && priceMatch;
    });

    return [...next].sort((a, b) => {
      if (sortMode === "Price Low") return a.price - b.price;
      if (sortMode === "Top Rated") return b.rating - a.rating;
      if (sortMode === "Newest First") return b.id.localeCompare(a.id);
      return b.rating - a.rating || b.price - a.price;
    });
  }, [activeCategory, language, more, price, sortMode, venue]);

  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setActiveCategory("All");
    setLanguage("All Languages");
    setPrice("All Prices");
    setVenue("All Venues");
    setMore("All Events");
    setSortMode("Recommended");
  };

  return (
    <main className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="mx-auto max-w-[1500px] px-3 pb-6 sm:px-5 lg:px-8">
        <TopBuizzEvents events={events.slice(0, 6)} saved={saved} onSave={toggleSaved} />
        <ExploreEvents activeCategory={activeCategory} onChange={setActiveCategory} />

        <section className="mt-6 grid gap-4 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_18px_58px_rgba(15,23,42,0.10)] backdrop-blur sm:mt-8 sm:p-5 lg:grid-cols-[280px_1fr]">
          <FilterPanel
            language={language}
            price={price}
            venue={venue}
            more={more}
            sortMode={sortMode}
            onLanguageChange={setLanguage}
            onPriceChange={setPrice}
            onVenueChange={setVenue}
            onMoreChange={setMore}
            onSortChange={setSortMode}
            onReset={resetFilters}
          />

          <div className="min-w-0">
            <SectionTitle title={activeCategory === "All" ? `All Events in ${selectedCity}` : `${activeCategory} Events in ${selectedCity}`} />
            {filteredEvents.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} saved={saved.has(event.id)} onSave={toggleSaved} />
                ))}
              </div>
            ) : (
              <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-8 text-center">
                <div>
                  <p className="text-lg font-black text-[var(--app-foreground)]">No events match these filters</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">Clear filters to get back to Buizz events.</p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(229,9,20,0.34)] transition duration-200 hover:bg-[#ff2634]"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}

function TopBuizzEvents({ events: streamEvents, saved, onSave }: { events: EventItem[]; saved: Set<string>; onSave: (id: string) => void }) {
  const [previewEvent, setPreviewEvent] = useState(streamEvents[0]);

  return (
    <section className="relative mt-4 overflow-hidden rounded-md border border-white/10 bg-[#070b15] text-white shadow-[0_28px_90px_rgba(0,0,0,0.48)] sm:mt-6">
      <img src={previewEvent.image} alt="" className="absolute inset-0 size-full object-cover opacity-72" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050812] via-[#050812]/84 to-[#050812]/28" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#050812]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(124,58,237,0.14),transparent_32%)]" />

      <div className="relative grid min-h-[460px] content-between gap-8 p-4 sm:min-h-[500px] sm:p-6 lg:min-h-[520px] lg:p-8">
        <div className="max-w-2xl pt-10 sm:pt-16 lg:pt-20">
          <h1 className="text-4xl font-black leading-none text-white drop-shadow-[0_3px_0_rgba(229,9,20,0.62)] sm:text-6xl">
            Top Buizz Events
          </h1>
          <Link href="/events" className="mt-5 inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black !text-white shadow-[0_16px_38px_rgba(229,9,20,0.34)] transition duration-200 hover:bg-[#ff2634]">
            Explore Events
          </Link>
        </div>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden">
          {streamEvents.map((event) => (
            <TopBuizzCard
              key={`top-buizz-events-${event.id}`}
              event={event}
              saved={saved.has(event.id)}
              onSave={onSave}
              onPreview={setPreviewEvent}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TopBuizzCard({ event, saved, onSave, onPreview }: { event: EventItem; saved: boolean; onSave: (id: string) => void; onPreview: (event: EventItem) => void }) {
  return (
    <article
      onClick={() => onPreview(event)}
      className="group relative w-[78vw] shrink-0 snap-start overflow-hidden rounded-md border border-white/12 bg-black/44 shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur transition duration-200 hover:z-10 hover:scale-[1.03] hover:border-white/28 hover:shadow-[0_22px_58px_rgba(124,60,255,0.28)] sm:w-[180px] lg:w-[230px]"
    >
      <div className="relative aspect-video overflow-hidden bg-[#111320]">
        <img src={event.image} alt={event.title} className="size-full object-cover opacity-95 transition duration-200 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050812] via-[#050812]/18 to-transparent" />
        <WishlistButton event={event} saved={saved} onSave={onSave} className="right-3 top-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <h3 className="line-clamp-1 text-sm font-black leading-tight text-white sm:text-base">{event.title}</h3>
          <p className="mt-1 text-[11px] font-bold text-white/70">{event.subcategory} | {event.date}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs font-black text-white">{event.priceLabel}</p>
            <Link
              href={event.href}
              onClick={(clickEvent) => clickEvent.stopPropagation()}
              className="inline-flex min-h-8 translate-y-0 items-center rounded-md bg-[#e50914] px-2.5 text-[11px] font-black !text-white opacity-100 shadow-[0_12px_28px_rgba(229,9,20,0.28)] transition duration-200 hover:bg-[#ff2634] sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
            >
              Book
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function ExploreEvents({ activeCategory, onChange }: { activeCategory: EventCategory | "All"; onChange: (category: EventCategory | "All") => void }) {
  return (
    <section className="mt-6 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_18px_58px_rgba(15,23,42,0.10)] backdrop-blur sm:mt-8 sm:p-5">
      <SectionTitle title="Explore Events" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <CategoryCard
          category={{ title: "Music", count: "All Events", icon: Sparkles, image: events[0].image }}
          active={activeCategory === "All"}
          label="All"
          onClick={() => onChange("All")}
        />
        {categories.map((category) => (
          <CategoryCard
            key={category.title}
            category={category}
            active={activeCategory === category.title}
            label={category.title}
            onClick={() => onChange(category.title)}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ category, active, label, onClick }: { category: CategoryTile; active: boolean; label: EventCategory | "All"; onClick: () => void }) {
  const Icon = category.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block min-h-32 overflow-hidden rounded-md bg-[#171927] text-left text-white shadow-sm ring-1 transition duration-200 hover:-translate-y-1 hover:shadow-xl sm:min-h-40 ${
        active ? "ring-[#e50914]" : "ring-white/10"
      }`}
    >
      <img src={category.image} alt="" className="absolute inset-0 size-full object-cover opacity-82 transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070a18]/92 via-[#070a18]/26 to-transparent" />
      <div className="absolute inset-x-4 bottom-4">
        <Icon className="mb-2 size-6 sm:mb-3 sm:size-7" />
        <p className="text-base font-black sm:text-lg">{label}</p>
        <p className="mt-1 text-xs font-bold text-white/72">{category.count}</p>
      </div>
    </button>
  );
}

function FilterPanel({
  language,
  price,
  venue,
  more,
  sortMode,
  onLanguageChange,
  onPriceChange,
  onVenueChange,
  onMoreChange,
  onSortChange,
  onReset,
}: {
  language: LanguageFilter;
  price: PriceFilter;
  venue: VenueFilter;
  more: MoreFilter;
  sortMode: SortMode;
  onLanguageChange: (value: LanguageFilter) => void;
  onPriceChange: (value: PriceFilter) => void;
  onVenueChange: (value: VenueFilter) => void;
  onMoreChange: (value: MoreFilter) => void;
  onSortChange: (value: SortMode) => void;
  onReset: () => void;
}) {
  return (
    <aside className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.12)] lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[var(--app-foreground)]">Filters</h2>
        <button type="button" onClick={onReset} className="text-xs font-black text-[#e50914] transition hover:text-[#ff2634]">
          Clear all
        </button>
      </div>

      <FilterSelect title="Sort By" value={sortMode} options={sortModes} onChange={(value) => onSortChange(value as SortMode)} />
      <FilterSelect title="Language" value={language} options={languageFilters} onChange={(value) => onLanguageChange(value as LanguageFilter)} />
      <FilterSelect title="Price Range" value={price} options={priceFilters} onChange={(value) => onPriceChange(value as PriceFilter)} />
      <FilterSelect title="Location / Venue" value={venue} options={venueFilters} onChange={(value) => onVenueChange(value as VenueFilter)} />
      <FilterSelect title="More Filters" value={more} options={moreFilters} onChange={(value) => onMoreChange(value as MoreFilter)} />

      <button
        type="button"
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(229,9,20,0.34)] transition duration-200 hover:bg-[#ff2634]"
      >
        Apply Filters
      </button>
    </aside>
  );
}

function FilterSelect({ title, value, options, onChange }: { title: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="mt-4 block border-t border-[var(--app-border)] pt-4">
      <span className="mb-2 flex items-center justify-between text-sm font-black text-[var(--app-foreground)]">
        {title}
        <ChevronDown className="size-4 text-[var(--app-muted)]" />
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] outline-none transition hover:border-[#e50914]/45"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#111827] text-white">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function EventCard({ event, saved, onSave }: { event: EventItem; saved: boolean; onSave: (id: string) => void }) {
  return (
    <article className="group overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition duration-200 hover:-translate-y-1 hover:border-[#e50914]/40 hover:shadow-[0_20px_54px_rgba(15,23,42,0.18)]">
      <div className="relative">
        <Link href={event.href} className="block">
          <div className="aspect-video overflow-hidden bg-[var(--app-subtle)]">
            <img src={event.image} alt={event.title} className="size-full object-cover transition duration-500 group-hover:scale-105" />
          </div>
        </Link>
        <WishlistButton event={event} saved={saved} onSave={onSave} className="right-2 top-2" />
      </div>
      <div className="p-3 sm:p-4">
        <Link href={event.href} className="line-clamp-1 text-sm font-black text-[var(--app-foreground)] transition hover:text-[#e50914]">
          {event.title}
        </Link>
        <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">{event.subcategory}</p>
        <div className="mt-3 space-y-1.5 text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">
          <p className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{event.date}</p>
          <p className="flex items-center gap-1.5"><MapPin className="size-3.5 text-[#e50914]" />{event.venue}</p>
          <p className="flex items-center gap-1.5"><Star className="size-3.5 fill-[#f6c453] text-[#f6c453]" />{event.rating} ({event.interested})</p>
        </div>
        <p className="mt-3 text-sm font-black text-[var(--app-foreground)]">{event.priceLabel}</p>
        <Link href={event.href} className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-md bg-[#e50914] px-4 text-xs font-black !text-white shadow-[0_14px_34px_rgba(229,9,20,0.24)] transition duration-200 hover:bg-[#ff2634]">
          {event.price === 0 ? "Book Free" : "Book Tickets"}
        </Link>
      </div>
    </article>
  );
}

function WishlistButton({ event, saved, onSave, className }: { event: EventItem; saved: boolean; onSave: (id: string) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        onSave(event.id);
      }}
      className={`absolute grid size-8 place-items-center rounded-full bg-black/58 text-white shadow-md backdrop-blur transition duration-200 hover:bg-[#e50914] ${saved ? "bg-[#e50914] text-white" : ""} ${className ?? ""}`}
      aria-label={saved ? `Remove ${event.title} from wishlist` : `Save ${event.title}`}
    >
      <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="text-lg font-black text-[var(--app-foreground)] sm:text-2xl">{title}</h2>
    </div>
  );
}
