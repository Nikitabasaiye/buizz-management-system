"use client";

import {
  CalendarDays,
  ChevronDown,
  Grid3X3,
  Heart,
  LayoutList,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Footer } from "@/components/common/Footer";
import { CITY_HERO_FALLBACK_IMAGE, getCityHeroImage } from "@/lib/cityHeroImages";
import { cn } from "@/lib/cn";
import type { DiscoveryConfig, DiscoveryItem } from "@/features/discovery/data";
import { getCategorySubtitle, getItemsForCategory, slugifyCategory, sortOptionsForDiscovery } from "@/features/discovery/data";
import { useAppStore } from "@/store/app.store";
import { useWishlistStore } from "@/store/wishlist.store";

type ViewMode = "grid" | "list";

type DiscoveryPageTemplateProps = {
  config: DiscoveryConfig;
  initialSearchQuery?: string;
};

const allValue = "All";

export function DiscoveryPageTemplate({ config, initialSearchQuery = "" }: DiscoveryPageTemplateProps) {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const savedIds = useWishlistStore((state) => state.savedIds);
  const toggleSavedItem = useWishlistStore((state) => state.toggleSaved);
  const [activeCategory, setActiveCategory] = useState<string>(allValue);
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState(sortOptionsForDiscovery[0]);
  const [primaryFilter, setPrimaryFilter] = useState<string>(allValue);
  const [secondaryFilter, setSecondaryFilter] = useState<string>(allValue);
  const [priceFilter, setPriceFilter] = useState<string>(allValue);
  const [moreFilter, setMoreFilter] = useState<string>(allValue);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedItem, setSelectedItem] = useState(config.items[0]);

  const normalizedSearch = initialSearchQuery.trim().toLowerCase();
  const saved = useMemo(() => new Set(savedIds), [savedIds]);
  const quickFilters = useMemo(() => getQuickFiltersForDiscovery(config), [config]);

  const filteredItems = useMemo(() => {
    const next = config.items.filter((item) => {
      const searchText = [
        item.title,
        item.category,
        item.genre,
        item.language,
        item.venue,
        item.city,
        item.description,
        item.sport,
        ...item.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchMatch = !normalizedSearch || searchText.includes(normalizedSearch);
      const categoryMatch =
        activeCategory === allValue ||
        activeCategory === "All Activities" ||
        item.category === activeCategory ||
        item.genre === activeCategory ||
        item.tags.includes(activeCategory);
      const quickMatch = matchesQuickFilters(item, activeQuickFilters);
      const primaryMatch =
        primaryFilter === allValue ||
        item.genre === primaryFilter ||
        item.category === primaryFilter ||
        item.category.includes(primaryFilter) ||
        item.language === primaryFilter ||
        item.tags.includes(primaryFilter);
      const secondaryMatch =
        secondaryFilter === allValue ||
        (secondaryFilter === "All Sports Venues" && Boolean(item.sport)) ||
        item.language === secondaryFilter ||
        item.sport === secondaryFilter ||
        item.tags.includes(secondaryFilter);
      const priceMatch = matchesPriceFilter(item, priceFilter);
      const moreMatch = moreFilter === allValue || item.tags.includes(moreFilter);

      return searchMatch && categoryMatch && quickMatch && primaryMatch && secondaryMatch && priceMatch && moreMatch;
    });

    return [...next].sort((a, b) => {
      if (sortBy === "Price: Low to High") return a.price - b.price;
      if (sortBy === "Price: High to Low") return b.price - a.price;
      if (sortBy === "Date") return a.dateValue.localeCompare(b.dateValue);
      if (sortBy === "Distance: Near to Far") return a.distanceKm - b.distanceKm;
      return b.popularity - a.popularity || b.rating - a.rating;
    });
  }, [activeCategory, activeQuickFilters, config.items, moreFilter, normalizedSearch, priceFilter, primaryFilter, secondaryFilter, sortBy]);

  useEffect(() => {
    if (filteredItems.length && !filteredItems.some((item) => item.id === selectedItem.id)) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems, selectedItem.id]);

  const resetFilters = () => {
    setActiveCategory(allValue);
    setActiveQuickFilters([]);
    setSortBy(sortOptionsForDiscovery[0]);
    setPrimaryFilter(allValue);
    setSecondaryFilter(allValue);
    setPriceFilter(allValue);
    setMoreFilter(allValue);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="mx-auto max-w-[1500px] px-3 pb-7 sm:px-5 lg:px-8">
        <TopBuizzStream
          title={config.kind === "activities" ? `Explore Activities Around You` : withSelectedCity(config.topTitle, selectedCity)}
          subtitle={withSelectedCity(config.topSubtitle, selectedCity)}
          popularTitle={getPopularTitle(config.kind)}
          ctaLabel={config.ctaLabel}
          items={config.items.slice(0, 8)}
          selectedItem={selectedItem}
          saved={saved}
          onSelect={setSelectedItem}
          onSave={toggleSavedItem}
        />

        <ExploreCategoryRail
          title={config.exploreTitle}
          categories={config.categories}
          route={config.route}
          items={config.items}
          activeCategory={activeCategory}
          onCategoryChange={(category) => {
            setActiveCategory((current) => (current === category ? allValue : category));
            setPrimaryFilter(allValue);
            setSecondaryFilter(allValue);
          }}
        />

        <div className="mt-5 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 grid gap-3">
              <QuickFilterDropdown filters={quickFilters} activeFilters={activeQuickFilters} onToggle={(filter) => setActiveQuickFilters((current) => toggleQuickFilter(current, filter))} onRemove={(filter) => setActiveQuickFilters((current) => current.filter((item) => item !== filter))} className="mt-0" />
              <FilterPanel config={config} sortBy={sortBy} primaryFilter={primaryFilter} secondaryFilter={secondaryFilter} priceFilter={priceFilter} moreFilter={moreFilter} onSortChange={setSortBy} onPrimaryChange={setPrimaryFilter} onSecondaryChange={setSecondaryFilter} onPriceChange={setPriceFilter} onMoreChange={setMoreFilter} onReset={resetFilters} layout="sidebar" />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-3 lg:hidden">
              <QuickFilterDropdown filters={quickFilters} activeFilters={activeQuickFilters} onToggle={(filter) => setActiveQuickFilters((current) => toggleQuickFilter(current, filter))} onRemove={(filter) => setActiveQuickFilters((current) => current.filter((item) => item !== filter))} className="mt-0" />
              <FilterPanel config={config} sortBy={sortBy} primaryFilter={primaryFilter} secondaryFilter={secondaryFilter} priceFilter={priceFilter} moreFilter={moreFilter} onSortChange={setSortBy} onPrimaryChange={setPrimaryFilter} onSecondaryChange={setSecondaryFilter} onPriceChange={setPriceFilter} onMoreChange={setMoreFilter} onReset={resetFilters} />
            </div>

            <section className="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-sm sm:p-5 lg:mt-0">
              <SortBar title={activeCategory === allValue ? config.allTitle : activeCategory} resultCount={filteredItems.length} viewMode={viewMode} onViewModeChange={setViewMode} searchQuery={initialSearchQuery} />

              {filteredItems.length ? (
                <div className={cn("mt-4", viewMode === "grid" ? "grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 min-[1180px]:grid-cols-4 min-[1380px]:grid-cols-5" : "grid gap-3")}>
                  {filteredItems.map((item) => (
                    <CompactEventCard key={item.id} item={item} ctaLabel={config.ctaLabel} saved={saved.has(item.id)} viewMode={viewMode} onSave={toggleSavedItem} />
                  ))}
                </div>
              ) : (
                <EmptyResults title={config.emptyTitle} description={config.emptyDescription} onReset={resetFilters} />
              )}
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

export function CategoryPageTemplate({
  config,
  category,
  initialSearchQuery = "",
}: {
  config: DiscoveryConfig;
  category: string;
  initialSearchQuery?: string;
}) {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const savedIds = useWishlistStore((state) => state.savedIds);
  const toggleSavedItem = useWishlistStore((state) => state.toggleSaved);
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState(sortOptionsForDiscovery[0]);
  const [primaryFilter, setPrimaryFilter] = useState<string>(allValue);
  const [secondaryFilter, setSecondaryFilter] = useState<string>(allValue);
  const [priceFilter, setPriceFilter] = useState<string>(allValue);
  const [moreFilter, setMoreFilter] = useState<string>(allValue);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const loadTimerRef = useRef<number | null>(null);
  const normalizedSearch = initialSearchQuery.trim().toLowerCase();
  const saved = useMemo(() => new Set(savedIds), [savedIds]);
  const quickFilters = useMemo(() => getQuickFiltersForDiscovery(config), [config]);

  const categoryItems = useMemo(() => getItemsForCategory(config, category), [category, config]);
  const [selectedCategoryItem, setSelectedCategoryItem] = useState<DiscoveryItem | null>(null);

  const filteredItems = useMemo(() => {
    const next = categoryItems.filter((item) => {
      const searchText = [
        item.title,
        item.category,
        item.genre,
        item.language,
        item.venue,
        item.city,
        item.description,
        item.sport,
        ...item.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchMatch = !normalizedSearch || searchText.includes(normalizedSearch);
      const quickMatch = matchesQuickFilters(item, activeQuickFilters);
      const primaryMatch =
        primaryFilter === allValue ||
        item.genre === primaryFilter ||
        item.category === primaryFilter ||
        item.category.includes(primaryFilter) ||
        item.language === primaryFilter ||
        item.tags.includes(primaryFilter);
      const secondaryMatch =
        secondaryFilter === allValue ||
        (secondaryFilter === "All Sports Venues" && Boolean(item.sport)) ||
        item.language === secondaryFilter ||
        item.sport === secondaryFilter ||
        item.tags.includes(secondaryFilter);
      const priceMatch = matchesPriceFilter(item, priceFilter);
      const moreMatch = moreFilter === allValue || item.tags.includes(moreFilter);

      return searchMatch && quickMatch && primaryMatch && secondaryMatch && priceMatch && moreMatch;
    });

    return [...next].sort((a, b) => {
      if (sortBy === "Price: Low to High") return a.price - b.price;
      if (sortBy === "Price: High to Low") return b.price - a.price;
      if (sortBy === "Date") return a.dateValue.localeCompare(b.dateValue);
      if (sortBy === "Distance: Near to Far") return a.distanceKm - b.distanceKm;
      return b.popularity - a.popularity || b.rating - a.rating;
    });
  }, [activeQuickFilters, categoryItems, moreFilter, normalizedSearch, priceFilter, primaryFilter, secondaryFilter, sortBy]);

  useEffect(() => {
    setVisibleCount(12);
    setIsLoadingMore(false);
    loadingRef.current = false;
    if (loadTimerRef.current) {
      window.clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
  }, [filteredItems]);

  useEffect(() => {
    const fallbackItem = categoryItems[0] ?? config.items[0] ?? null;
    setSelectedCategoryItem((current) => {
      if (current && categoryItems.some((item) => item.id === current.id)) return current;
      return fallbackItem;
    });
  }, [categoryItems, config.items]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (!firstEntry?.isIntersecting || loadingRef.current) return;

        loadingRef.current = true;
        setIsLoadingMore(true);
        loadTimerRef.current = window.setTimeout(() => {
          setVisibleCount((current) => Math.min(current + 12, filteredItems.length));
          setIsLoadingMore(false);
          loadingRef.current = false;
          loadTimerRef.current = null;
        }, 220);
      },
      { rootMargin: "420px 0px 420px 0px", threshold: 0.01 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      if (loadTimerRef.current) {
        window.clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    };
  }, [filteredItems.length, hasMore, visibleCount]);

  const resetFilters = () => {
    setActiveQuickFilters([]);
    setSortBy(sortOptionsForDiscovery[0]);
    setPrimaryFilter(allValue);
    setSecondaryFilter(allValue);
    setPriceFilter(allValue);
    setMoreFilter(allValue);
  };

  const pageTitle = `${category} in ${selectedCity}`;
  const categoryFeature = selectedCategoryItem ?? categoryItems[0] ?? config.items[0];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--app-background)] text-[var(--app-foreground)]">
      <div className="mx-auto max-w-[1500px] px-3 pb-7 sm:px-5 lg:px-8">
        <CategoryHero
          title={pageTitle}
          subtitle={getCategorySubtitle(config.kind, category)}
        />

        {categoryFeature ? (
          <TopBuizzStream
            title=""
            subtitle=""
            popularTitle={`Popular ${category} on Buizz`}
            ctaLabel={config.ctaLabel}
            items={categoryItems.slice(0, 8)}
            selectedItem={categoryFeature}
            saved={saved}
            onSelect={setSelectedCategoryItem}
            onSave={toggleSavedItem}
            compactHeading
          />
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 grid gap-3">
              <QuickFilterDropdown filters={quickFilters} activeFilters={activeQuickFilters} onToggle={(filter) => setActiveQuickFilters((current) => toggleQuickFilter(current, filter))} onRemove={(filter) => setActiveQuickFilters((current) => current.filter((item) => item !== filter))} className="mt-0" />
              <FilterPanel config={config} sortBy={sortBy} primaryFilter={primaryFilter} secondaryFilter={secondaryFilter} priceFilter={priceFilter} moreFilter={moreFilter} onSortChange={setSortBy} onPrimaryChange={setPrimaryFilter} onSecondaryChange={setSecondaryFilter} onPriceChange={setPriceFilter} onMoreChange={setMoreFilter} onReset={resetFilters} layout="sidebar" />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-3 lg:hidden">
              <QuickFilterDropdown filters={quickFilters} activeFilters={activeQuickFilters} onToggle={(filter) => setActiveQuickFilters((current) => toggleQuickFilter(current, filter))} onRemove={(filter) => setActiveQuickFilters((current) => current.filter((item) => item !== filter))} className="mt-0" />
              <FilterPanel config={config} sortBy={sortBy} primaryFilter={primaryFilter} secondaryFilter={secondaryFilter} priceFilter={priceFilter} moreFilter={moreFilter} onSortChange={setSortBy} onPrimaryChange={setPrimaryFilter} onSecondaryChange={setSecondaryFilter} onPriceChange={setPriceFilter} onMoreChange={setMoreFilter} onReset={resetFilters} />
            </div>

            <section className="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-sm sm:p-5 lg:mt-0">
              <SortBar title={pageTitle} resultCount={filteredItems.length} viewMode={viewMode} onViewModeChange={setViewMode} searchQuery={initialSearchQuery} />

              {filteredItems.length ? (
                <>
                  <CategoryGrid items={visibleItems} ctaLabel={config.ctaLabel} saved={saved} viewMode={viewMode} onSave={toggleSavedItem} />
                  {isLoadingMore ? <InfiniteScrollLoading viewMode={viewMode} /> : null}
                  <div ref={sentinelRef} className="h-8" aria-hidden="true" />
                  {!hasMore && visibleItems.length ? <p className="pb-2 text-center text-xs font-bold text-[var(--app-muted)]">You&apos;ve reached the end</p> : null}
                </>
              ) : (
                <EmptyResults title={config.emptyTitle} description={config.emptyDescription} onReset={resetFilters} />
              )}
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

export function CategoryHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="pt-6 sm:pt-8">
      <h1 className="max-w-4xl text-2xl font-black leading-tight text-[var(--app-foreground)] sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--app-muted)]">{subtitle}</p>
    </section>
  );
}

export function CategoryGrid({
  items,
  ctaLabel,
  saved,
  viewMode,
  onSave,
}: {
  items: DiscoveryItem[];
  ctaLabel: string;
  saved: Set<string>;
  viewMode: ViewMode;
  onSave: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "mt-4",
        viewMode === "grid"
          ? "grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 min-[1180px]:grid-cols-4 min-[1380px]:grid-cols-5"
          : "grid gap-3"
      )}
    >
      {items.map((item) => (
        <CompactEventCard
          key={item.id}
          item={item}
          ctaLabel={ctaLabel}
          saved={saved.has(item.id)}
          viewMode={viewMode}
          onSave={onSave}
        />
      ))}
    </div>
  );
}

function InfiniteScrollLoading({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="mt-3 grid gap-3" aria-label="Loading more listings">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`list-skeleton-${index}`} className="h-36 animate-pulse rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 min-[1180px]:grid-cols-4 min-[1380px]:grid-cols-5" aria-label="Loading more listings">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`grid-skeleton-${index}`} className="overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)]">
          <div className="aspect-video animate-pulse bg-[var(--app-subtle)]" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--app-subtle)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--app-subtle)]" />
            <div className="h-8 w-full animate-pulse rounded-md bg-[var(--app-subtle)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopBuizzStream({
  title,
  subtitle,
  popularTitle,
  ctaLabel,
  items,
  selectedItem,
  saved,
  onSelect,
  onSave,
  compactHeading = false,
}: {
  title: string;
  subtitle: string;
  popularTitle: string;
  ctaLabel: string;
  items: DiscoveryItem[];
  selectedItem: DiscoveryItem;
  saved: Set<string>;
  onSelect: (item: DiscoveryItem) => void;
  onSave: (id: string) => void;
  compactHeading?: boolean;
}) {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const displayTitle = withSelectedCity(selectedItem.title, selectedCity);
  const displayVenue = withSelectedCity(selectedItem.venue, selectedCity);
  const cityHeroImage = getCityHeroImage(selectedCity);

  return (
    <>
      {!compactHeading ? (
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
            <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl">What&apos;s Happening in {selectedCity}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/84 sm:text-base">{subtitle || title}</p>
          </div>
        </section>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-xl border border-[var(--app-border)] bg-black shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
        <div className="relative min-h-[360px] overflow-hidden sm:min-h-[420px]">
          <img src={selectedItem.image} alt={displayTitle} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/72 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="relative flex min-h-[360px] max-w-[700px] flex-col justify-end p-5 text-white sm:min-h-[420px] sm:p-8">
            <div>
              <p className="w-fit rounded bg-[#e50914] px-2 py-1 text-[10px] font-black uppercase text-white">{selectedItem.badge}</p>
              <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-white sm:text-5xl">{displayTitle}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-bold text-white/86">
                <span>{selectedItem.dateValue.slice(0, 4)}</span>
                <span>|</span>
                <span>{selectedItem.rating} rated</span>
                <span>|</span>
                <span>{selectedItem.slot ?? selectedItem.date}</span>
                <span>|</span>
                <span>{selectedItem.category}</span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm font-black text-white/90"><MapPin className="size-4" />{withVenueCity(displayVenue, selectedCity)}</p>
              <p className="mt-4 line-clamp-3 max-w-md text-sm font-semibold leading-6 text-white/82">
                {withSelectedCity(selectedItem.description, selectedCity)}
              </p>
              <p className="mt-4 text-sm font-black text-white">{selectedItem.priceLabel}</p>
            </div>
            <div className="mt-5 flex max-w-sm gap-3">
              <Link
                href={getDetailHref(selectedItem)}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2634] px-4 text-sm font-black text-white shadow-[0_18px_44px_rgba(229,9,20,0.36)] transition duration-200 hover:-translate-y-0.5"
              >
                {ctaLabel}
              </Link>
              <button
                type="button"
                onClick={() => onSave(selectedItem.id)}
                className="grid min-h-12 w-14 place-items-center rounded-xl border border-white/70 bg-white text-[#e50914] shadow-[0_16px_34px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5"
                aria-label={saved.has(selectedItem.id) ? `Remove ${displayTitle} from wishlist` : `Save ${displayTitle}`}
              >
                <Heart className="size-5" fill="currentColor" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[var(--app-elevated)] p-4 sm:p-5">
          <p className="text-base font-black text-[var(--app-foreground)] sm:text-lg">{popularTitle}</p>
          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => (
              <button
                key={`top-buizz-${item.id}`}
                type="button"
                onClick={() => onSelect(item)}
                aria-pressed={selectedItem.id === item.id}
                aria-label={`Show ${withSelectedCity(item.title, selectedCity)} in featured section`}
                className={cn(
                  "group relative aspect-video w-40 shrink-0 snap-start overflow-hidden rounded-xl border bg-[var(--app-subtle)] text-left shadow-[0_12px_34px_rgba(0,0,0,0.16)] transition duration-200 hover:z-10 hover:scale-[1.03] hover:border-[#e50914]/55 sm:w-52",
                  selectedItem.id === item.id ? "border-[#e50914] ring-2 ring-[#e50914]/20" : "border-[var(--app-border)]"
                )}
              >
                <img src={item.image} alt="" className="size-full object-cover opacity-92 transition duration-200 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/24 to-transparent" />
                <div className="absolute inset-x-3 bottom-3 text-white">
                  <p className="line-clamp-2 text-sm font-black leading-tight">{withSelectedCity(item.title, selectedCity)}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/78">{item.rating} | {withVenueCity(withSelectedCity(item.venue, selectedCity), selectedCity)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function SelectedItemPreview({
  item,
  ctaLabel,
  saved,
  onSave,
}: {
  item: DiscoveryItem;
  ctaLabel: string;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const title = withSelectedCity(item.title, selectedCity);
  return (
    <div className="mt-8 max-w-[560px]">
      <p className="text-sm font-black text-[#1d9bf0]">{item.badge}</p>
      <h3 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">{title}</h3>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-black text-white/86 sm:text-base">
        <span>{item.dateValue.slice(0, 4)}</span>
        <span className="text-white/45">|</span>
        <span>{item.rating} rated</span>
        <span className="text-white/45">|</span>
        <span>{item.slot ?? item.date}</span>
        {item.language ? (
          <>
            <span className="text-white/45">|</span>
            <span>{item.language}</span>
          </>
        ) : null}
      </div>
      <p className="mt-5 line-clamp-3 text-base font-semibold leading-7 text-white/82">{withSelectedCity(item.description, selectedCity)}</p>
      <p className="mt-5 text-base font-black text-white">{[item.category, item.genre, selectedCity].filter(Boolean).join(" | ")}</p>
      <div className="mt-7 flex max-w-xl gap-3">
        <Link
          href={getDetailHref(item)}
          className="inline-flex min-h-14 flex-1 items-center justify-center rounded-md bg-[#e50914] px-5 text-base font-black text-white shadow-[0_18px_44px_rgba(229,9,20,0.28)] transition duration-200 hover:bg-[#ff2634]"
        >
          {ctaLabel}
        </Link>
        <button
          type="button"
          onClick={() => onSave(item.id)}
          className={cn(
            "grid min-h-14 w-16 place-items-center rounded-md border border-white/15 bg-white/12 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur transition duration-200 hover:border-[#e50914]/60 hover:bg-[#e50914]",
            saved && "border-[#e50914]/60 bg-[#e50914]"
          )}
          aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title}`}
        >
          <Heart className="size-5" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

export function ExploreCategoryRail({
  title,
  categories,
  route,
  items,
  activeCategory,
  onCategoryChange,
}: {
  title: string;
  categories: string[];
  route: string;
  items: DiscoveryItem[];
  activeCategory: string;
  onCategoryChange?: (category: string) => void;
}) {
  return (
    <section className="mt-5 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-sm sm:mt-7 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[var(--app-foreground)] sm:text-2xl">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {categories.map((category) => {
          const active = activeCategory === category;
          const image = getCategoryImage(category, items);
          return (
            <Link
              key={category}
              href={`${route}/category/${slugifyCategory(category)}`}
              onClick={() => onCategoryChange?.(category)}
              className={cn(
                "group overflow-hidden rounded-md border bg-[var(--app-subtle)] text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#e50914]/40",
                active ? "border-[#e50914] ring-2 ring-[#e50914]/15" : "border-[var(--app-border)]"
              )}
            >
              <div className="relative aspect-video overflow-hidden bg-[var(--app-subtle)]">
                <img src={image} alt={category} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <div className="absolute left-2 top-2 grid size-8 place-items-center rounded-md bg-white/92 text-[#e50914] shadow-sm">
                  <Sparkles className="size-4" />
                </div>
              </div>
              <span className="block p-3">
                <span className="block line-clamp-2 text-sm font-black text-[var(--app-foreground)] sm:text-base">{category}</span>
                <span className="mt-1 inline-flex text-xs font-black text-[#e50914]">Open</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function QuickFilterDropdown({
  filters,
  activeFilters,
  onToggle,
  onRemove,
  className,
}: {
  filters: string[];
  activeFilters: string[];
  onToggle: (filter: string) => void;
  onRemove: (filter: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className={cn("relative mt-5 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-sm sm:p-4", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-left text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/45"
        aria-expanded={open}
      >
        <span>Quick Filters</span>
        <span className="inline-flex items-center gap-2 text-xs text-[var(--app-muted)]">
          {activeFilters.length ? `${activeFilters.length} selected` : "Select"}
          <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
        </span>
      </button>

      {open ? (
        <div className="absolute left-3 right-3 top-[calc(100%-0.5rem)] z-20 grid gap-1 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 text-xs font-black shadow-2xl">
          {filters.map((filter) => {
            const active = activeFilters.includes(filter);
            return (
              <button
                key={filter}
                type="button"
                onClick={() => onToggle(filter)}
                className={cn(
                  "flex min-h-9 items-center justify-between rounded-md px-3 text-left transition",
                  active ? "bg-[#e50914] text-white" : "text-[var(--app-muted)] hover:bg-[var(--app-subtle)] hover:text-[var(--app-foreground)]"
                )}
              >
                {filter}
                {active ? <span aria-hidden="true">On</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <button
            key={`selected-${filter}`}
            type="button"
            onClick={() => onRemove(filter)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#e50914]/25 bg-[#e50914]/10 px-2.5 text-xs font-black text-[#e50914] transition hover:border-[#e50914]/50"
            aria-label={`Remove ${filter} filter`}
          >
            {filter}
            <X className="size-3.5" />
          </button>
        ))}
      </div>
    </section>
  );
}

export function FilterPanel({
  config,
  sortBy,
  primaryFilter,
  secondaryFilter,
  priceFilter,
  moreFilter,
  onSortChange,
  onPrimaryChange,
  onSecondaryChange,
  onPriceChange,
  onMoreChange,
  onReset,
  layout = "row",
}: {
  config: DiscoveryConfig;
  sortBy: string;
  primaryFilter: string;
  secondaryFilter: string;
  priceFilter: string;
  moreFilter: string;
  onSortChange: (value: string) => void;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onMoreChange: (value: string) => void;
  onReset: () => void;
  layout?: "row" | "sidebar";
}) {
  return (
    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-[var(--app-foreground)]">
          <SlidersHorizontal className="size-4 text-[#e50914]" />
          Filters
        </h2>
        <button type="button" onClick={onReset} className="text-xs font-black text-[#e50914] transition hover:text-[#ff2634]">
          Clear all
        </button>
      </div>
      <div className={cn("grid gap-3", layout === "row" ? "sm:grid-cols-2 lg:grid-cols-5" : "")}>
        <FilterSelect title="Sort By" value={sortBy} options={sortOptionsForDiscovery} onChange={onSortChange} />
        <FilterSelect title={config.primaryFilterLabel} value={primaryFilter} options={[allValue, ...config.primaryFilterOptions]} onChange={onPrimaryChange} />
        {config.secondaryFilterLabel && config.secondaryFilterOptions ? (
          <FilterSelect title={config.secondaryFilterLabel} value={secondaryFilter} options={[allValue, ...config.secondaryFilterOptions]} onChange={onSecondaryChange} />
        ) : null}
        <FilterSelect title="Price Range" value={priceFilter} options={[allValue, ...config.priceOptions]} onChange={onPriceChange} />
        <FilterSelect title="More Filters" value={moreFilter} options={[allValue, ...config.moreFilterOptions]} onChange={onMoreChange} />
      </div>
    </div>
  );
}

function FilterSelect({ title, value, options, onChange }: { title: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-black text-[var(--app-muted)]">
        {title}
        <ChevronDown className="size-4 shrink-0" />
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

export function SortBar({
  title,
  resultCount,
  viewMode,
  onViewModeChange,
  searchQuery,
}: {
  title: string;
  resultCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-black text-[var(--app-foreground)] sm:text-2xl">{title}</h2>
        <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">
          {resultCount} result{resultCount === 1 ? "" : "s"}
          {searchQuery ? ` for "${searchQuery}"` : ""}
        </p>
      </div>
      <div className="inline-flex w-fit rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-1">
        <ViewButton label="Grid view" active={viewMode === "grid"} onClick={() => onViewModeChange("grid")}>
          <Grid3X3 className="size-4" />
        </ViewButton>
        <ViewButton label="List view" active={viewMode === "list"} onClick={() => onViewModeChange("list")}>
          <LayoutList className="size-4" />
        </ViewButton>
      </div>
    </div>
  );
}

function ViewButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md transition duration-200",
        active ? "bg-[#e50914] text-white" : "text-[var(--app-muted)] hover:bg-[var(--app-elevated)] hover:text-[var(--app-foreground)]"
      )}
    >
      {children}
    </button>
  );
}

export function CompactEventCard({
  item,
  ctaLabel,
  saved,
  viewMode,
  onSave,
}: {
  item: DiscoveryItem;
  ctaLabel: string;
  saved: boolean;
  viewMode: ViewMode;
  onSave: (id: string) => void;
}) {
  const detailHref = getDetailHref(item);
  const selectedCity = useAppStore((state) => state.selectedCity);
  const title = withSelectedCity(item.title, selectedCity);

  if (viewMode === "list") {
    return (
      <article className="group grid gap-3 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#e50914]/40 sm:grid-cols-[150px_1fr_auto]">
        <Link href={detailHref} className="block aspect-video overflow-hidden rounded-md bg-[var(--app-subtle)]">
          <img src={item.image} alt={title} className="size-full object-cover transition duration-500 group-hover:scale-105" />
        </Link>
        <Link href={detailHref} className="block min-w-0">
          <CardContent item={item} ctaLabel={ctaLabel} compact={false} />
        </Link>
        <CardActions item={item} ctaLabel={ctaLabel} saved={saved} onSave={onSave} />
      </article>
    );
  }

  return (
    <article className="group min-w-0 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#e50914]/40">
      <div className="relative">
        <Link href={detailHref} className="block aspect-video overflow-hidden bg-[var(--app-subtle)]">
          <img src={item.image} alt={title} className="size-full object-cover transition duration-500 group-hover:scale-105" />
        </Link>
        <span className="absolute left-2 top-2 max-w-[calc(100%-3.5rem)] truncate rounded bg-black/78 px-2 py-1 text-[10px] font-black text-white backdrop-blur">{item.badge}</span>
        <WishlistIconButton item={item} saved={saved} onSave={onSave} />
      </div>
      <div className="p-2.5">
        <Link href={detailHref} className="block">
          <CardContent item={item} ctaLabel={ctaLabel} compact />
        </Link>
        <Link
          href={detailHref}
          className="mt-2.5 inline-flex min-h-8 w-full items-center justify-center rounded-md bg-[#e50914] px-3 text-[11px] font-black text-white shadow-[0_10px_24px_rgba(229,9,20,0.20)] transition duration-200 hover:bg-[#ff2634]"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}

function CardContent({ item, compact }: { item: DiscoveryItem; ctaLabel: string; compact: boolean }) {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const dateOrSlot = item.kind === "activities" ? item.slot ?? item.date : item.date;
  const title = withSelectedCity(item.title, selectedCity);

  return (
    <div className="min-w-0">
      <h3 className={cn("font-black leading-snug text-[var(--app-foreground)] transition group-hover:text-[#ff2634]", compact ? "line-clamp-2 text-[13px]" : "text-base")}>
        {title}
      </h3>
      <div className={cn("mt-2 space-y-1 text-[11px] font-semibold text-[var(--app-muted)]", !compact && "sm:text-xs")}>
        <p className="flex min-w-0 items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="truncate">{dateOrSlot}</span>
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0 text-[#e50914]" />
          <span className="truncate">{withSelectedCity(item.venue, selectedCity)}, {selectedCity}</span>
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <Star className="size-3.5 shrink-0 fill-[#f6c453] text-[#f6c453]" />
          <span className="truncate">{item.rating} rating</span>
        </p>
      </div>
      <p className="mt-2 truncate text-[13px] font-black text-[var(--app-foreground)]">{item.priceLabel}</p>
    </div>
  );
}

function CardActions({
  item,
  ctaLabel,
  saved,
  onSave,
}: {
  item: DiscoveryItem;
  ctaLabel: string;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 sm:w-36 sm:flex-col sm:justify-center">
      <Link
        href={getDetailHref(item)}
        className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-[#e50914] px-3 text-xs font-black text-white transition duration-200 hover:bg-[#ff2634] sm:flex-none"
      >
        {ctaLabel}
      </Link>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSave(item.id);
        }}
        className={cn(
          "inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black text-[var(--app-foreground)] transition duration-200 hover:border-[#e50914]/50 hover:bg-[#e50914] hover:text-white sm:flex-none",
          saved && "border-[#e50914]/60 bg-[#e50914] text-white"
        )}
      >
        <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
        Wishlist
      </button>
    </div>
  );
}

function WishlistIconButton({ item, saved, onSave }: { item: DiscoveryItem; saved: boolean; onSave: (id: string) => void }) {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const title = withSelectedCity(item.title, selectedCity);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSave(item.id);
      }}
      className={cn(
        "absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/58 text-white shadow-md backdrop-blur transition duration-200 hover:bg-[#e50914]",
        saved && "bg-[#e50914]"
      )}
      aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title}`}
    >
      <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function EmptyResults({ title, description, onReset }: { title: string; description: string; onReset: () => void }) {
  return (
    <div className="mt-4 grid min-h-72 place-items-center rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-8 text-center">
      <div>
        <p className="text-lg font-black text-[var(--app-foreground)]">{title}</p>
        <p className="mt-2 max-w-md text-sm font-semibold text-[var(--app-muted)]">{description}</p>
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(229,9,20,0.34)] transition duration-200 hover:bg-[#ff2634]"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}

function getQuickFiltersForDiscovery(config: DiscoveryConfig) {
  if (config.kind !== "activities") return config.quickFilters;
  return ["Today", "Tomorrow", "This Weekend", "Near You", "Under 5 km", "Indoor", "Outdoor", "Kids Friendly"];
}

function toggleQuickFilter(current: string[], filter: string) {
  return current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter];
}

function matchesQuickFilters(item: DiscoveryItem, activeQuickFilters: string[]) {
  if (!activeQuickFilters.length) return true;
  return activeQuickFilters.every((filter) => matchesQuickFilter(item, filter));
}

function matchesQuickFilter(item: DiscoveryItem, activeQuickFilter: string) {
  if (activeQuickFilter === allValue) return true;
  if (activeQuickFilter === "Near You") return item.distanceKm <= 8;
  if (activeQuickFilter === "Under 5 km") return item.distanceKm <= 5;
  if (activeQuickFilter === "Kids Friendly") return item.tags.some((tag) => /kid|family/i.test(tag));
  return item.quickFilters.includes(activeQuickFilter) || item.tags.includes(activeQuickFilter);
}

function matchesPriceFilter(item: DiscoveryItem, priceFilter: string) {
  if (priceFilter === allValue) return true;
  if (priceFilter === "Free") return item.price === 0;
  if (priceFilter === "₹0–₹500") return item.price >= 0 && item.price <= 500;
  if (priceFilter === "₹500–₹2000") return item.price >= 500 && item.price <= 2000;
  if (priceFilter === "Above ₹2000") return item.price > 2000;
  if (priceFilter === "Custom Range") return item.price >= 300 && item.price <= 1500;
  return true;
}

function getCategoryImage(category: string, items: DiscoveryItem[]) {
  return (
    items.find((item) => item.category === category || item.genre === category || item.sport === category || item.tags.includes(category))?.image ??
    items[0]?.image ??
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80"
  );
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm)} km`;
}

function getPopularTitle(kind: DiscoveryConfig["kind"]) {
  if (kind === "activities") return "Popular Activities on Buizz";
  if (kind === "plays") return "Popular Plays on Buizz";
  return "Popular Events on Buizz";
}

function getDetailHref(item: DiscoveryItem) {
  return `/${item.kind}/${item.id}`;
}

function withSelectedCity(text: string, city: string) {
  return text.replace(/\bin Pune\b/g, `in ${city}`).replace(/\bPune\b/g, city);
}

function withVenueCity(venue: string, city: string) {
  return venue.toLowerCase().includes(city.toLowerCase()) ? venue : `${venue}, ${city}`;
}
