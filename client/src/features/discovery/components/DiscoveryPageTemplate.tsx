"use client";

import {
  CalendarDays,
  ChevronDown,
  Grid3X3,
  Heart,
  LayoutList,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,

  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Footer } from "@/components/common/Footer";
import { cn } from "@/lib/cn";
import type { DiscoveryConfig, DiscoveryItem } from "@/features/discovery/data";
import {
  getCategorySubtitle,
  slugifyCategory,
  sortOptionsForDiscovery,
} from "@/features/discovery/data";
import { useWishlistStore } from "@/store/wishlist.store";
import { serverEventToDiscoveryItem } from "@/features/discovery/serverEventAdapter";
import { useGetEventsQuery } from "@/store/api";

type ViewMode = "grid" | "list";

type DiscoveryPageTemplateProps = {
  config: DiscoveryConfig;
  initialSearchQuery?: string;
};

const allValue = "All";
const recentlyViewedKey = "buizz-recently-viewed-items";

type RecentlyViewedDiscoveryItem = DiscoveryItem & {
  viewedAt: string;
};

function getDiscoveryHeroImage(title: string, route: string) {
  const value = `${title} ${route}`.toLowerCase();

  if (value.includes("play")) {
    return "https://images.unsplash.com/photo-1503095396549-807759245b35?w=1600&q=85";
  }

  if (value.includes("activit")) {
    return "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&q=85";
  }

  if (value.includes("workshop")) {
    return "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1600&q=85";
  }

  if (value.includes("concert") || value.includes("music")) {
    return "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1600&q=85";
  }

  return "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=85";
}

function saveRecentlyViewedDiscoveryItem(item: DiscoveryItem) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(recentlyViewedKey);
    const existing = raw ? (JSON.parse(raw) as RecentlyViewedDiscoveryItem[]) : [];

    const next: RecentlyViewedDiscoveryItem[] = [
      { ...item, viewedAt: new Date().toISOString() },
      ...existing.filter((oldItem) => oldItem.id !== item.id),
    ].slice(0, 12);

    window.localStorage.setItem(recentlyViewedKey, JSON.stringify(next));
  } catch {
    // ignore localStorage errors
  }
}

export function DiscoveryPageTemplate({
  config,
  initialSearchQuery = "",
}: DiscoveryPageTemplateProps) {
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
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedItem, setSelectedItem] = useState<DiscoveryItem | null>(null);
  const { data: eventsData } = useGetEventsQuery({ page: 1, limit: 100, status: "published" });

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const saved = useMemo(() => new Set(savedIds), [savedIds]);
  const quickFilters = useMemo(() => getQuickFiltersForDiscovery(config), [config]);

  const allItems = useMemo(
    () =>
      (eventsData?.data?.events ?? [])
        .map(serverEventToDiscoveryItem)
        .filter((item) => item.kind === config.kind),
    [config.kind, eventsData?.data?.events]
  );

  const filteredItems = useMemo(() => {
    const next = allItems.filter((item) => {
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

      return (
        searchMatch &&
        categoryMatch &&
        quickMatch &&
        primaryMatch &&
        secondaryMatch &&
        priceMatch &&
        moreMatch
      );
    });

    return [...next].sort((a, b) => {
      if (sortBy === "Price: Low to High") return a.price - b.price;
      if (sortBy === "Price: High to Low") return b.price - a.price;
      if (sortBy === "Date") return a.dateValue.localeCompare(b.dateValue);
      if (sortBy === "Distance: Near to Far") return a.distanceKm - b.distanceKm;
      return b.popularity - a.popularity || b.rating - a.rating;
    });
  }, [
    activeCategory,
    activeQuickFilters,
    allItems,
    moreFilter,
    normalizedSearch,
    priceFilter,
    primaryFilter,
    secondaryFilter,
    sortBy,
  ]);

  useEffect(() => {
    if (filteredItems.length && (!selectedItem || !filteredItems.some((item) => item.id === selectedItem.id))) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems, selectedItem]);

  const resetFilters = () => {
    setActiveCategory(allValue);
    setActiveQuickFilters([]);
    setSortBy(sortOptionsForDiscovery[0]);
    setPrimaryFilter(allValue);
    setSecondaryFilter(allValue);
    setPriceFilter(allValue);
    setMoreFilter(allValue);
    setSearchQuery("");
  };

  return (
    <main className="buizz-site-shell">
      <div className="buizz-site-container-wide pb-10 sm:pb-12 lg:pb-16">
        {selectedItem ? (
          <TopBuizzStream
            title={config.topTitle}
            subtitle={config.topSubtitle}
            popularTitle={getPopularTitle(config.kind)}
            ctaLabel={config.ctaLabel}
            route={config.route}
            items={allItems.slice(0, 8)}
            selectedItem={selectedItem}
            saved={saved}
            onSelect={setSelectedItem}
            onSave={toggleSavedItem}
          />
        ) : null}

        <ExploreCategoryRail
          title={config.exploreTitle}
          categories={config.categories}
          route={config.route}
          items={allItems}
          activeCategory={activeCategory}
          onCategoryChange={(category) => {
            setActiveCategory((current) => (current === category ? allValue : category));
            setPrimaryFilter(allValue);
            setSecondaryFilter(allValue);
          }}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="sticky top-24">
              <SmartDiscoveryFilters
                config={config}
                filters={quickFilters}
                activeQuickFilters={activeQuickFilters}
                sortBy={sortBy}
                primaryFilter={primaryFilter}
                secondaryFilter={secondaryFilter}
                priceFilter={priceFilter}
                moreFilter={moreFilter}
                onQuickToggle={(filter) =>
                  setActiveQuickFilters((current) => toggleQuickFilter(current, filter))
                }
                onQuickRemove={(filter) =>
                  setActiveQuickFilters((current) => current.filter((item) => item !== filter))
                }
                onSortChange={setSortBy}
                onPrimaryChange={setPrimaryFilter}
                onSecondaryChange={setSecondaryFilter}
                onPriceChange={setPriceFilter}
                onMoreChange={setMoreFilter}
                onReset={resetFilters}
              />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-3 xl:hidden">
              <MobileSmartFilterSheet
                config={config}
                filters={quickFilters}
                activeQuickFilters={activeQuickFilters}
                sortBy={sortBy}
                primaryFilter={primaryFilter}
                secondaryFilter={secondaryFilter}
                priceFilter={priceFilter}
                moreFilter={moreFilter}
                onQuickToggle={(filter) =>
                  setActiveQuickFilters((current) => toggleQuickFilter(current, filter))
                }
                onQuickRemove={(filter) =>
                  setActiveQuickFilters((current) => current.filter((item) => item !== filter))
                }
                onSortChange={setSortBy}
                onPrimaryChange={setPrimaryFilter}
                onSecondaryChange={setSecondaryFilter}
                onPriceChange={setPriceFilter}
                onMoreChange={setMoreFilter}
                onReset={resetFilters}
              />
            </div>

            <section
              id="discover-list"
              className="mt-3 rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_54px_rgba(15,23,42,0.08)] sm:p-5 xl:mt-0 2xl:p-6"
            >
              <SortBar
                title={activeCategory === allValue ? config.allTitle : activeCategory}
                resultCount={filteredItems.length}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              {filteredItems.length ? (
                <div
                  className={cn(
                    "mt-4",
                    viewMode === "grid"
                      ? "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 min-[1700px]:grid-cols-4 min-[2100px]:grid-cols-5"
                      : "grid gap-4"
                  )}
                >
                  {filteredItems.map((item) => (
                    <CompactEventCard
                      key={item.id}
                      item={item}
                      ctaLabel={config.ctaLabel}
                      saved={saved.has(item.id)}
                      viewMode={viewMode}
                      onSave={toggleSavedItem}
                    />
                  ))}
                </div>
              ) : (
                <EmptyResults
                  title={config.emptyTitle}
                  description={config.emptyDescription}
                  onReset={resetFilters}
                />
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
  const savedIds = useWishlistStore((state) => state.savedIds);
  const toggleSavedItem = useWishlistStore((state) => state.toggleSaved);

  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState(sortOptionsForDiscovery[0]);
  const [primaryFilter, setPrimaryFilter] = useState<string>(allValue);
  const [secondaryFilter, setSecondaryFilter] = useState<string>(allValue);
  const [priceFilter, setPriceFilter] = useState<string>(allValue);
  const [moreFilter, setMoreFilter] = useState<string>(allValue);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCategoryItem, setSelectedCategoryItem] = useState<DiscoveryItem | null>(null);
  const { data: eventsData } = useGetEventsQuery({ page: 1, limit: 100, status: "published" });
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const loadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const saved = useMemo(() => new Set(savedIds), [savedIds]);
  const quickFilters = useMemo(() => getQuickFiltersForDiscovery(config), [config]);
  const categoryItems = useMemo(() => {
    const categorySlug = slugifyCategory(category);

    return (eventsData?.data?.events ?? [])
      .map(serverEventToDiscoveryItem)
      .filter((item) => item.kind === config.kind)
      .filter((item) => {
        const values = [item.category, item.genre, item.sport, ...item.tags]
          .filter(Boolean)
          .map(String);

        return values.some((value) => slugifyCategory(value) === categorySlug);
      });
  }, [category, config.kind, eventsData?.data?.events]);



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
  }, [
    activeQuickFilters,
    categoryItems,
    moreFilter,
    normalizedSearch,
    priceFilter,
    primaryFilter,
    secondaryFilter,
    sortBy,
  ]);

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
    const fallbackItem = categoryItems[0] ?? null;

    setSelectedCategoryItem((current) => {
      if (current && categoryItems.some((item) => item.id === current.id)) return current;
      return fallbackItem;
    });
  }, [categoryItems]);

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
    setSearchQuery("");
  };

  const pageTitle = category;
  const categoryFeature = selectedCategoryItem ?? categoryItems[0] ?? null;

  return (
    <main className="buizz-site-shell">
      <div className="buizz-site-container-wide pb-10 sm:pb-12 lg:pb-16">
        <CategoryHero title={pageTitle} subtitle={getCategorySubtitle(config.kind, category)} />

        {categoryFeature ? (
          <TopBuizzStream
            title=""
            subtitle=""
            popularTitle={`Popular ${category} on Buizz`}
            ctaLabel={config.ctaLabel}
            route={config.route}
            items={categoryItems.slice(0, 8)}
            selectedItem={categoryFeature}
            saved={saved}
            onSelect={setSelectedCategoryItem}
            onSave={toggleSavedItem}
            compactHeading
          />
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="sticky top-24">
              <SmartDiscoveryFilters
                config={config}
                filters={quickFilters}
                activeQuickFilters={activeQuickFilters}
                sortBy={sortBy}
                primaryFilter={primaryFilter}
                secondaryFilter={secondaryFilter}
                priceFilter={priceFilter}
                moreFilter={moreFilter}
                onQuickToggle={(filter) =>
                  setActiveQuickFilters((current) => toggleQuickFilter(current, filter))
                }
                onQuickRemove={(filter) =>
                  setActiveQuickFilters((current) => current.filter((item) => item !== filter))
                }
                onSortChange={setSortBy}
                onPrimaryChange={setPrimaryFilter}
                onSecondaryChange={setSecondaryFilter}
                onPriceChange={setPriceFilter}
                onMoreChange={setMoreFilter}
                onReset={resetFilters}
              />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-3 xl:hidden">
              <MobileSmartFilterSheet
                config={config}
                filters={quickFilters}
                activeQuickFilters={activeQuickFilters}
                sortBy={sortBy}
                primaryFilter={primaryFilter}
                secondaryFilter={secondaryFilter}
                priceFilter={priceFilter}
                moreFilter={moreFilter}
                onQuickToggle={(filter) =>
                  setActiveQuickFilters((current) => toggleQuickFilter(current, filter))
                }
                onQuickRemove={(filter) =>
                  setActiveQuickFilters((current) => current.filter((item) => item !== filter))
                }
                onSortChange={setSortBy}
                onPrimaryChange={setPrimaryFilter}
                onSecondaryChange={setSecondaryFilter}
                onPriceChange={setPriceFilter}
                onMoreChange={setMoreFilter}
                onReset={resetFilters}
              />
            </div>

            <section
              id="discover-list"
              className="mt-3 rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_54px_rgba(15,23,42,0.08)] sm:p-5 xl:mt-0 2xl:p-6"
            >
              <SortBar
                title={pageTitle}
                resultCount={filteredItems.length}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              {filteredItems.length ? (
                <>
                  <CategoryGrid
                    items={visibleItems}
                    ctaLabel={config.ctaLabel}
                    saved={saved}
                    viewMode={viewMode}
                    onSave={toggleSavedItem}
                  />

                  {isLoadingMore ? <InfiniteScrollLoading viewMode={viewMode} /> : null}

                  <div ref={sentinelRef} className="h-8" aria-hidden="true" />

                  {!hasMore && visibleItems.length ? (
                    <p className="pb-2 text-center text-xs font-bold text-[var(--app-muted)]">
                      You&apos;ve reached the end
                    </p>
                  ) : null}
                </>
              ) : (
                <EmptyResults
                  title={config.emptyTitle}
                  description={config.emptyDescription}
                  onReset={resetFilters}
                />
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
    <section className="pt-5 sm:pt-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_18px_54px_rgba(15,23,42,0.08)] sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 size-72 rounded-full bg-[var(--color-brand-secondary)]/10 blur-3xl" />

        <div className="relative max-w-5xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
            <Sparkles className="size-3.5" />
            Category
          </p>

          <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight tracking-[-0.05em] text-[var(--app-foreground)] sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[var(--app-muted)] sm:text-base sm:leading-7">
            {subtitle}
          </p>
        </div>
      </div>
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
          ? "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 min-[1700px]:grid-cols-4 min-[2100px]:grid-cols-5"
          : "grid gap-4"
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
          <div
            key={`list-skeleton-${index}`}
            className="h-36 animate-pulse rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 min-[1700px]:grid-cols-4 min-[2100px]:grid-cols-5"
      aria-label="Loading more listings"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`grid-skeleton-${index}`}
          className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)]"
        >
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
  ctaLabel,
  items,
  selectedItem,
  saved,
  onSelect,
  onSave,
}: {
  title: string;
  subtitle: string;
  popularTitle: string;
  ctaLabel: string;
  route: string;
  items: DiscoveryItem[];
  selectedItem: DiscoveryItem;
  saved: Set<string>;
  onSelect: (item: DiscoveryItem) => void;
  onSave: (id: string) => void;
  compactHeading?: boolean;
}) {
  if (!selectedItem) return null;

  const displayItems = items.length ? items : [selectedItem];
  const selectedIndex = displayItems.findIndex((item) => item.id === selectedItem.id);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const activeItem = displayItems[activeIndex] ?? selectedItem;

  useEffect(() => {
    if (displayItems.length <= 1) return;

    const timer = window.setInterval(() => {
      const nextIndex = (activeIndex + 1) % displayItems.length;
      onSelect(displayItems[nextIndex]);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeIndex, displayItems, onSelect]);

  const goToPrevious = () => {
    const previousIndex = (activeIndex - 1 + displayItems.length) % displayItems.length;
    onSelect(displayItems[previousIndex]);
  };

  const goToNext = () => {
    const nextIndex = (activeIndex + 1) % displayItems.length;
    onSelect(displayItems[nextIndex]);
  };

  return (
    <section
      id="top-buizz"
      className="group mt-4 overflow-hidden rounded-[26px] border border-[var(--app-border)] bg-black shadow-[0_20px_62px_rgba(0,0,0,0.22)] sm:rounded-3xl"
    >
      <div className="relative min-h-[455px] overflow-hidden sm:min-h-[440px] lg:min-h-[500px]">
        <img
          key={activeItem.id}
          src={activeItem.image}
          alt={activeItem.title}
          className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/72 to-black/18" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-transparent" />

        {displayItems.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-2.5 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur transition hover:bg-white hover:text-slate-950 sm:left-5 sm:size-11"
              aria-label="Previous item"
            >
              <ChevronLeft className="size-5" />
            </button>

            <button
              type="button"
              onClick={goToNext}
              className="absolute right-2.5 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur transition hover:bg-white hover:text-slate-950 sm:right-5 sm:size-11"
              aria-label="Next item"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        ) : null}

        <div className="relative z-10 flex min-h-[455px] max-w-[780px] flex-col justify-end py-5 pl-14 pr-4 text-white sm:min-h-[440px] sm:py-8 sm:pl-24 sm:pr-8 lg:min-h-[500px]">
          <p className="w-fit rounded-lg bg-[var(--color-brand-primary)] px-2.5 py-1 text-[9px] font-black uppercase text-white sm:text-[10px]">
            {activeItem.badge}
          </p>

          <h2 className="mt-3 max-w-2xl text-[28px] font-black leading-[1.02] tracking-[-0.05em] text-white sm:mt-4 sm:text-5xl">
            {activeItem.title}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-white/85 sm:mt-4 sm:gap-x-3 sm:text-sm">
            <span>{activeItem.dateValue.slice(0, 4)}</span>
            <span>|</span>
            <span>{activeItem.slot ?? activeItem.date}</span>
            <span>|</span>
            <span>{activeItem.category}</span>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-white/90 sm:mt-3 sm:text-sm">
            <MapPin className="size-3.5 shrink-0 sm:size-4" />
            <span className="line-clamp-1">
              {activeItem.venue}, {activeItem.city}
            </span>
          </p>

          <p className="mt-3 line-clamp-2 max-w-md text-xs font-semibold leading-5 text-white/78 sm:mt-4 sm:text-sm sm:leading-6">
            {activeItem.description}
          </p>

          <p className="mt-3 text-xs font-black text-white sm:mt-4 sm:text-sm">
            {activeItem.priceLabel}
          </p>

          <div className="mt-4 flex w-full max-w-md gap-2.5 sm:mt-5 sm:gap-3">
            <Link
              href={getDetailHref(activeItem)}
              onClick={() => saveRecentlyViewedDiscoveryItem(activeItem)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] px-4 text-xs font-black text-white shadow-[0_16px_38px_rgba(236,27,114,0.32)] transition hover:brightness-110 sm:min-h-12 sm:text-sm"
            >
              {activeItem.price <= 0 ? "Register" : ctaLabel}
            </Link>

            <button
              type="button"
              onClick={() => onSave(activeItem.id)}
              className={cn(
                "grid min-h-11 w-12 place-items-center rounded-xl border border-white/70 bg-white text-[var(--color-brand-primary)] shadow-[0_16px_34px_rgba(0,0,0,0.22)] transition sm:min-h-12 sm:w-14",
                saved.has(activeItem.id) &&
                "border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)] text-[var(--color-brand-ink)]"
              )}
              aria-label={saved.has(activeItem.id) ? "Remove from wishlist" : "Save item"}
            >
              <Heart className="size-4 sm:size-5" fill="currentColor" />
            </button>
          </div>

          <div className="mt-4 flex gap-1.5 sm:mt-5 sm:gap-2">
            {displayItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === activeIndex
                    ? "w-7 bg-[var(--color-brand-primary)] sm:w-8"
                    : "w-2 bg-white/40"
                )}
                aria-label={`Show ${item.title}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
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
  const title = item.title;

  return (
    <div className="mt-8 max-w-[560px]">
      <p className="text-sm font-black text-[#3B82F6]">{item.badge}</p>

      <h3 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">
        {title}
      </h3>

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

      <p className="mt-5 line-clamp-3 text-base font-semibold leading-7 text-white/82">
        {item.description}
      </p>

      <p className="mt-5 text-base font-black text-white">
        {[item.category, item.genre, item.city].filter(Boolean).join(" | ")}
      </p>

      <div className="mt-7 flex max-w-xl gap-3">
        <Link
          href={getDetailHref(item)}
          onClick={() => saveRecentlyViewedDiscoveryItem(item)}
          className="inline-flex min-h-14 flex-1 items-center justify-center rounded-md bg-[var(--color-brand-primary)] px-5 text-base font-black text-white shadow-[0_18px_44px_rgba(236,27,114,0.28)] transition duration-200 hover:brightness-110"
        >
          {item.price <= 0 ? "Register" : ctaLabel}
        </Link>

        <button
          type="button"
          onClick={() => onSave(item.id)}
          className={cn(
            "grid min-h-14 w-16 place-items-center rounded-md border border-white/15 bg-white/12 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur transition duration-200 hover:border-[var(--color-brand-primary)]/60 hover:bg-[var(--color-brand-primary)]",
            saved && "border-[var(--color-brand-primary)]/60 bg-[var(--color-brand-primary)]"
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
    <section className="mt-5 sm:mt-7">
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5 sm:mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
            Explore
          </p>

          <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[var(--app-foreground)] sm:text-2xl lg:text-3xl">
            {title}
          </h2>
        </div>

        <Link
          href={route}
          className="hidden rounded-full bg-[var(--app-subtle)] px-4 py-2 text-xs font-black text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)] hover:text-white sm:inline-flex"
        >
          View all
        </Link>
      </div>

      <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:rounded-[30px] sm:p-4 lg:p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {categories.map((category) => {
            const active = activeCategory === category;
            const image = getCategoryImage(category, items);

            const categoryCount = items.filter(
              (item) =>
                item.category === category ||
                item.genre === category ||
                item.sport === category ||
                item.tags.includes(category)
            ).length;

            return (
              <Link
                key={category}
                href={`${route}/category/${slugifyCategory(category)}`}
                onClick={() => onCategoryChange?.(category)}
                className={cn(
                  "group min-w-0 overflow-hidden rounded-[18px] border bg-[var(--app-subtle)] text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(236,27,114,0.14)] sm:rounded-[22px]",
                  active
                    ? "border-[var(--color-brand-primary)] ring-2 ring-[var(--color-brand-primary)]/15"
                    : "border-[var(--app-border)] hover:border-[var(--color-brand-primary)]/40"
                )}
              >
                <div className="relative aspect-[1.08/1] overflow-hidden bg-slate-100 sm:aspect-video">
                  <img
                    src={image}
                    alt={category}
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent" />

                  <div className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-white/92 text-[var(--color-brand-primary)] shadow-sm sm:size-8">
                    <Sparkles className="size-3.5 sm:size-4" />
                  </div>

                  <div className="absolute bottom-2 left-2 right-2">
                    <h3 className="line-clamp-2 text-[13px] font-black leading-tight text-white sm:text-sm">
                      {category}
                    </h3>

                    <p className="mt-1 text-[10px] font-bold text-white/75 sm:text-[11px]">
                      {categoryCount || "New"} shows
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5">
                  <span className="truncate text-[11px] font-black text-[var(--app-foreground)] sm:text-xs">
                    Explore now
                  </span>

                  <span className="shrink-0 rounded-full bg-[var(--color-brand-primary)]/10 px-2 py-1 text-[9px] font-black text-[var(--color-brand-primary)] sm:text-[10px]">
                    Open
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MobileSmartFilterSheet({
  config,
  filters,
  activeQuickFilters,
  sortBy,
  primaryFilter,
  secondaryFilter,
  priceFilter,
  moreFilter,
  onQuickToggle,
  onQuickRemove,
  onSortChange,
  onPrimaryChange,
  onSecondaryChange,
  onPriceChange,
  onMoreChange,
  onReset,
}: {
  config: DiscoveryConfig;
  filters: string[];
  activeQuickFilters: string[];
  sortBy: string;
  primaryFilter: string;
  secondaryFilter: string;
  priceFilter: string;
  moreFilter: string;
  onQuickToggle: (filter: string) => void;
  onQuickRemove: (filter: string) => void;
  onSortChange: (value: string) => void;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onMoreChange: (value: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [expandedQuick, setExpandedQuick] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const visibleFilters = expandedQuick ? filters : filters.slice(0, 5);

  const selectedFilters = [
    ...activeQuickFilters.map((value) => ({
      label: "Quick",
      value,
      clear: () => onQuickRemove(value),
    })),
    primaryFilter !== allValue
      ? {
        label: config.primaryFilterLabel,
        value: primaryFilter,
        clear: () => onPrimaryChange(allValue),
      }
      : null,
    secondaryFilter !== allValue
      ? {
        label: config.secondaryFilterLabel || "Type",
        value: secondaryFilter,
        clear: () => onSecondaryChange(allValue),
      }
      : null,
    priceFilter !== allValue
      ? {
        label: "Price",
        value: priceFilter,
        clear: () => onPriceChange(allValue),
      }
      : null,
    moreFilter !== allValue
      ? {
        label: "Experience",
        value: moreFilter,
        clear: () => onMoreChange(allValue),
      }
      : null,
  ].filter(Boolean) as { label: string; value: string; clear: () => void }[];

  const hasChangedSort = sortBy !== sortOptionsForDiscovery[0];
  const activeCount = selectedFilters.length + (hasChangedSort ? 1 : 0);

  const applyFilters = () => {
    setOpen(false);

    window.setTimeout(() => {
      document.getElementById("discover-list")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  };

  return (
    <>
      <div className="flex gap-2 overflow-x-auto border-y border-[var(--app-border)] bg-[var(--app-elevated)] px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black text-[var(--app-foreground)] shadow-sm active:scale-[0.98]"
        >
          Filter
          <SlidersHorizontal className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black text-[var(--app-foreground)] shadow-sm active:scale-[0.98]"
        >
          Sort By
          <ChevronDown className="size-4" />
        </button>


      </div>

      {open ? (
        <div className="fixed inset-0 z-[120] xl:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/62 backdrop-blur-sm"
          />

          <section className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-hidden rounded-t-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_-24px_80px_rgba(15,23,42,0.28)]">
            <div className="sticky top-0 z-20 border-b border-[var(--app-border)] bg-[var(--app-elevated)]/96 px-4 py-4 backdrop-blur-xl">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--app-border)]" />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                    <SlidersHorizontal className="size-4" />
                    Filter by
                  </p>

                  <h2 className="mt-1 text-xl font-black text-[var(--app-foreground)]">
                    Refine your results
                  </h2>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                    Quick picks, advanced filters, and sort options.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] transition active:scale-[0.94]"
                  aria-label="Close filter panel"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(90dvh-164px)] overflow-y-auto px-4 py-4">
              {selectedFilters.length || hasChangedSort ? (
                <div className="mb-4 rounded-2xl border border-[var(--color-brand-primary)]/18 bg-[var(--color-brand-primary)]/8 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                      Selected
                    </p>

                    <span className="rounded-full bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black text-[var(--color-brand-primary)]">
                      {activeCount} active
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFilters.map((filter) => (
                      <button
                        key={`${filter.label}-${filter.value}`}
                        type="button"
                        onClick={filter.clear}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--color-brand-primary)]/20 bg-[var(--app-elevated)] px-2.5 text-xs font-black text-[var(--color-brand-primary)] transition active:scale-[0.96]"
                      >
                        <span className="text-[10px] opacity-70">{filter.label}:</span>
                        {filter.value}
                        <X className="size-3.5" />
                      </button>
                    ))}

                    {hasChangedSort ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(sortOptionsForDiscovery[0])}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--color-brand-primary)]/20 bg-[var(--app-elevated)] px-2.5 text-xs font-black text-[var(--color-brand-primary)] transition active:scale-[0.96]"
                      >
                        <span className="text-[10px] opacity-70">Sort:</span>
                        {sortBy}
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
                    Quick picks
                  </p>

                  <span className="rounded-full bg-[var(--app-subtle)] px-2.5 py-1 text-[10px] font-black text-[var(--app-muted)]">
                    {activeQuickFilters.length ? `${activeQuickFilters.length} selected` : "Tap to apply"}
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {visibleFilters.map((filter) => {
                    const active = activeQuickFilters.includes(filter);

                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => onQuickToggle(filter)}
                        className={cn(
                          "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-black transition active:scale-[0.96]",
                          active
                            ? "border-[var(--color-brand-primary)] bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[0_14px_34px_rgba(236,27,114,0.24)]"
                            : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)]"
                        )}
                      >
                        {filter}
                      </button>
                    );
                  })}

                  {filters.length > 5 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedQuick((current) => !current)}
                      className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-muted)] transition active:scale-[0.96]"
                    >
                      {expandedQuick ? "Less" : `+${filters.length - 5} more`}
                      <ChevronDown className={cn("size-4 transition", expandedQuick && "rotate-180")} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
                  Refine by
                </p>

                <div className="grid gap-3">
                  <FilterSelect
                    title={config.primaryFilterLabel}
                    helper="Main category"
                    value={primaryFilter}
                    options={[allValue, ...config.primaryFilterOptions]}
                    onChange={onPrimaryChange}
                  />

                  {config.secondaryFilterLabel && config.secondaryFilterOptions ? (
                    <FilterSelect
                      title={config.secondaryFilterLabel}
                      helper="Language, sport, or format"
                      value={secondaryFilter}
                      options={[allValue, ...config.secondaryFilterOptions]}
                      onChange={onSecondaryChange}
                    />
                  ) : null}

                  <FilterSelect
                    title="Price"
                    helper="Budget range"
                    value={priceFilter}
                    options={[allValue, ...config.priceOptions]}
                    onChange={onPriceChange}
                  />

                  <FilterSelect
                    title="Experience"
                    helper="Tags and preferences"
                    value={moreFilter}
                    options={[allValue, ...config.moreFilterOptions]}
                    onChange={onMoreChange}
                  />
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--app-border)] pt-4">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
                  Sort results
                </p>

                <FilterSelect
                  title="Sort by"
                  helper="Order results"
                  value={sortBy}
                  options={sortOptionsForDiscovery}
                  onChange={onSortChange}
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-20 grid grid-cols-2 gap-3 border-t border-[var(--app-border)] bg-[var(--app-elevated)]/96 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
              <button
                type="button"
                onClick={onReset}
                className="min-h-12 rounded-full border border-[var(--color-brand-primary)] bg-white px-4 text-sm font-black text-[var(--color-brand-primary)] transition active:scale-[0.96]"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={applyFilters}
                className="min-h-12 rounded-full bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] px-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(236,27,114,0.28)] transition active:scale-[0.96]"
              >
                Apply
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function SmartDiscoveryFilters({
  config,
  filters,
  activeQuickFilters,
  sortBy,
  primaryFilter,
  secondaryFilter,
  priceFilter,
  moreFilter,
  onQuickToggle,
  onQuickRemove,
  onSortChange,
  onPrimaryChange,
  onSecondaryChange,
  onPriceChange,
  onMoreChange,
  onReset,
}: {
  config: DiscoveryConfig;
  filters: string[];
  activeQuickFilters: string[];
  sortBy: string;
  primaryFilter: string;
  secondaryFilter: string;
  priceFilter: string;
  moreFilter: string;
  onQuickToggle: (filter: string) => void;
  onQuickRemove: (filter: string) => void;
  onSortChange: (value: string) => void;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onMoreChange: (value: string) => void;
  onReset: () => void;
}) {
  const [expandedQuick, setExpandedQuick] = useState(false);

  const visibleFilters = expandedQuick ? filters : filters.slice(0, 5);

  const selectedFilters = [
    ...activeQuickFilters.map((value) => ({
      label: "Quick",
      value,
      clear: () => onQuickRemove(value),
    })),
    primaryFilter !== allValue
      ? {
        label: config.primaryFilterLabel,
        value: primaryFilter,
        clear: () => onPrimaryChange(allValue),
      }
      : null,
    secondaryFilter !== allValue
      ? {
        label: config.secondaryFilterLabel || "Type",
        value: secondaryFilter,
        clear: () => onSecondaryChange(allValue),
      }
      : null,
    priceFilter !== allValue
      ? {
        label: "Price",
        value: priceFilter,
        clear: () => onPriceChange(allValue),
      }
      : null,
    moreFilter !== allValue
      ? {
        label: "Experience",
        value: moreFilter,
        clear: () => onMoreChange(allValue),
      }
      : null,
  ].filter(Boolean) as { label: string; value: string; clear: () => void }[];

  const hasActiveFilters = selectedFilters.length > 0;
  const hasChangedSort = sortBy !== sortOptionsForDiscovery[0];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.09)]">
      <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 size-56 rounded-full bg-[var(--color-brand-secondary)]/10 blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              <SlidersHorizontal className="size-4" />
              Smart Filters
            </p>

            <h2 className="mt-1 text-xl font-black text-[var(--app-foreground)]">
              Find your best match
            </h2>

            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
              Start with quick picks, then refine category, language, price, and sort order.
            </p>
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters && !hasChangedSort}
            className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-xs font-black text-[var(--app-muted)] transition hover:border-[var(--color-brand-primary)]/35 hover:bg-[var(--color-brand-primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Clear
          </button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 rounded-2xl border border-[var(--color-brand-primary)]/18 bg-[var(--color-brand-primary)]/8 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
              Selected filters
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {selectedFilters.map((filter) => (
                <button
                  key={`${filter.label}-${filter.value}`}
                  type="button"
                  onClick={filter.clear}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--color-brand-primary)]/20 bg-[var(--app-elevated)] px-2.5 text-xs font-black text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)] hover:text-white"
                >
                  <span className="text-[10px] opacity-70">{filter.label}:</span>
                  {filter.value}
                  <X className="size-3.5" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
              Quick picks
            </p>

            <span className="rounded-full bg-[var(--app-subtle)] px-2.5 py-1 text-[10px] font-black text-[var(--app-muted)]">
              {activeQuickFilters.length ? `${activeQuickFilters.length} selected` : "Tap to apply"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {visibleFilters.map((filter) => {
              const active = activeQuickFilters.includes(filter);

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => onQuickToggle(filter)}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-black transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.96]",
                    active
                      ? "border-[var(--color-brand-primary)] bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[0_14px_34px_rgba(236,27,114,0.24)]"
                      : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)] hover:border-[var(--color-brand-primary)]/35 hover:bg-[var(--color-brand-primary)]/10 hover:text-[var(--color-brand-primary)]"
                  )}
                >
                  {active ? (
                    <span className="grid size-4 place-items-center rounded-full bg-white/20">
                      <span className="size-1.5 rounded-full bg-white" />
                    </span>
                  ) : (
                    <span className="size-1.5 rounded-full bg-current opacity-50" />
                  )}
                  {filter}
                </button>
              );
            })}

            {filters.length > 5 ? (
              <button
                type="button"
                onClick={() => setExpandedQuick((current) => !current)}
                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-muted)] transition hover:border-[var(--color-brand-primary)]/35 hover:text-[var(--color-brand-primary)]"
              >
                {expandedQuick ? "Less" : `+${filters.length - 5} more`}
                <ChevronDown className={cn("size-4 transition", expandedQuick && "rotate-180")} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
            Refine by
          </p>

          <div className="grid gap-3">
            <FilterSelect
              title={config.primaryFilterLabel}
              helper="Main category"
              value={primaryFilter}
              options={[allValue, ...config.primaryFilterOptions]}
              onChange={onPrimaryChange}
            />

            {config.secondaryFilterLabel && config.secondaryFilterOptions ? (
              <FilterSelect
                title={config.secondaryFilterLabel}
                helper="Language, sport, or format"
                value={secondaryFilter}
                options={[allValue, ...config.secondaryFilterOptions]}
                onChange={onSecondaryChange}
              />
            ) : null}

            <FilterSelect
              title="Price"
              helper="Budget range"
              value={priceFilter}
              options={[allValue, ...config.priceOptions]}
              onChange={onPriceChange}
            />

            <FilterSelect
              title="Experience"
              helper="Tags and preferences"
              value={moreFilter}
              options={[allValue, ...config.moreFilterOptions]}
              onChange={onMoreChange}
            />
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--app-border)] pt-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
            Sort results
          </p>

          <FilterSelect
            title="Sort by"
            helper="Order results"
            value={sortBy}
            options={sortOptionsForDiscovery}
            onChange={onSortChange}
          />
        </div>
      </div>
    </section>
  );
}


function FilterSelect({
  title,
  helper,
  value,
  options,
  onChange,
}: {
  title: string;
  helper?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const active = value !== allValue;

  return (
    <label
      className={cn(
        "group block min-w-0 rounded-2xl border p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.08)]",
        active
          ? "border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/8"
          : "border-[var(--app-border)] bg-[var(--app-subtle)]"
      )}
    >
      <span className="mb-2 flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-xs font-black text-[var(--app-foreground)]">
            {title}
          </span>

          {helper ? (
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-[var(--app-muted)]">
              {helper}
            </span>
          ) : null}
        </span>

        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-xl transition",
            active
              ? "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white"
              : "bg-[var(--app-elevated)] text-[var(--app-muted)]"
          )}
        >
          <ChevronDown className="size-4" />
        </span>
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full cursor-pointer rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_4px_rgba(236,27,114,0.12)]"
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

export function SortBar({
  title,
  resultCount,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
}: {
  title: string;
  resultCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-subtle)]/70 p-3 shadow-inner sm:rounded-[28px] sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)] sm:text-xs">
            Browse
          </p>

          <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[var(--app-foreground)] sm:text-3xl">
            {title}
          </h2>

          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)] sm:text-sm">
            {resultCount} result{resultCount === 1 ? "" : "s"}
            {hasSearch ? ` for "${searchQuery.trim()}"` : ""} found.
          </p>
        </div>

        <div className="inline-flex w-fit rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-1 shadow-sm">
          <ViewButton
            label="Grid view"
            active={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
          >
            <Grid3X3 className="size-4" />
          </ViewButton>

          <ViewButton
            label="List view"
            active={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
          >
            <LayoutList className="size-4" />
          </ViewButton>
        </div>
      </div>

      <div className="mt-3 flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 shadow-sm transition focus-within:border-[var(--color-brand-primary)] focus-within:shadow-[0_0_0_4px_rgba(236,27,114,0.10)] sm:min-h-12">
        <Search className="size-4 shrink-0 text-[var(--color-brand-primary)]" />

        <input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search events, venue, city..."
          className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] sm:text-sm"
        />

        {hasSearch ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--app-subtle)] text-[var(--app-muted)] transition hover:bg-[var(--color-brand-primary)] hover:text-white"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ViewButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md transition duration-200",
        active
          ? "bg-[var(--color-brand-primary)] text-white"
          : "text-[var(--app-muted)] hover:bg-[var(--app-elevated)] hover:text-[var(--app-foreground)]"
      )}
    >
      {children}
    </button>
  );
}

function CompactEventCard({
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
  const title = item.title;

  if (viewMode === "list") {
    return (
      <article className="group relative grid gap-3 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/40 hover:shadow-[0_20px_55px_rgba(236,27,114,0.16)] sm:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr_auto]">
        <Link
          href={detailHref}
          onClick={() => saveRecentlyViewedDiscoveryItem(item)}
          className="relative z-10 block aspect-video overflow-hidden rounded-2xl bg-[var(--app-subtle)]"
        >
          <img
            src={item.image}
            alt={title}
            className="size-full object-cover transition duration-500 group-hover:scale-110"
          />
        </Link>

        <Link
          href={detailHref}
          onClick={() => saveRecentlyViewedDiscoveryItem(item)}
          className="relative z-10 block min-w-0"
        >
          <CardContent item={item} ctaLabel={ctaLabel} compact={false} />
        </Link>

        <CardActions item={item} ctaLabel={ctaLabel} saved={saved} onSave={onSave} />
      </article>
    );
  }

  return (
    <article className="group min-w-0 overflow-hidden bg-transparent">
      <div className="relative overflow-hidden rounded-[18px] bg-[var(--app-subtle)] shadow-[0_12px_32px_rgba(15,23,42,0.10)] sm:rounded-3xl">
        <Link
          href={detailHref}
          onClick={() => saveRecentlyViewedDiscoveryItem(item)}
          className="block aspect-[1.02/1] overflow-hidden sm:aspect-video"
        >
          <img
            src={item.image}
            alt={title}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/8 to-transparent" />

        <span className="absolute left-2 top-2 max-w-[calc(100%-3.5rem)] truncate rounded-md bg-[#EC1B72] px-2 py-1 text-[9px] font-black uppercase text-white sm:text-[10px]">
          {item.badge}
        </span>

        <WishlistIconButton item={item} saved={saved} onSave={onSave} />

        <div className="absolute bottom-2 left-2 right-2">
          <p className="line-clamp-1 text-[18px] font-black leading-none text-white sm:text-xl">
            {item.price <= 0 ? "FREE" : item.priceLabel.replace(" onwards", "")}
          </p>

          <p className="mt-1 text-[10px] font-black uppercase text-white/75 sm:text-[11px]">
            {item.category}
          </p>
        </div>
      </div>

      <Link
        href={detailHref}
        onClick={() => saveRecentlyViewedDiscoveryItem(item)}
        className="block px-0.5 pt-2.5"
      >
        <h3 className="line-clamp-1 text-[15px] font-black leading-tight tracking-[-0.03em] text-[var(--app-foreground)] sm:text-base">
          {title}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 text-[12px] font-black text-[var(--app-foreground)]">
          <CalendarDays className="size-3.5 shrink-0 text-[var(--color-brand-primary)]" />
          <span className="truncate">{item.date}</span>
        </div>

        <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[var(--app-muted)]">
          {item.category}, {item.genre}
        </p>

        <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[var(--app-muted)]">
          {item.venue}
        </p>
      </Link>
    </article>
  );
}

function CardContent({
  item,
  compact,
}: {
  item: DiscoveryItem;
  ctaLabel: string;
  compact: boolean;
}) {
  const dateOrSlot = item.kind === "activities" ? item.slot ?? item.date : item.date;
  const title = item.title;

  return (
    <div className="min-w-0">
      <h3
        className={cn(
          "font-black leading-snug text-[var(--app-foreground)] transition group-hover:text-[var(--color-brand-primary)]",
          compact ? "line-clamp-2 text-sm 2xl:text-[15px]" : "text-base"
        )}
      >
        {title}
      </h3>

      <div
        className={cn(
          "mt-2 space-y-1 text-[11px] font-semibold text-[var(--app-muted)]",
          !compact && "sm:text-xs"
        )}
      >
        <p className="flex min-w-0 items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="truncate">{dateOrSlot}</span>
        </p>

        <p className="flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0 text-[var(--color-brand-primary)]" />
          <span className="truncate">
            {item.venue}, {item.city}
          </span>
        </p>
      </div>

      <p className="mt-2 truncate text-[13px] font-black text-[var(--app-foreground)]">
        {item.priceLabel}
      </p>
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
    <div className="relative z-10 flex gap-2 sm:col-span-2 lg:col-span-1 lg:w-40 lg:flex-col lg:justify-center">
      <Link
        href={getDetailHref(item)}
        onClick={() => saveRecentlyViewedDiscoveryItem(item)}
        className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white transition duration-200 hover:brightness-110 sm:flex-none"
      >
        {item.price <= 0 ? "Register" : ctaLabel}
      </Link>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSave(item.id);
        }}
        className={cn(
          "inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black text-[var(--app-foreground)] transition duration-200 hover:border-[var(--color-brand-primary)]/50 hover:bg-[var(--color-brand-primary)] hover:text-white sm:flex-none",
          saved && "border-[var(--color-brand-primary)]/60 bg-[var(--color-brand-primary)] text-white"
        )}
      >
        <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
        Wishlist
      </button>
    </div>
  );
}

function WishlistIconButton({
  item,
  saved,
  onSave,
}: {
  item: DiscoveryItem;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  const title = item.title;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSave(item.id);
      }}
      className={cn(
        "absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/58 text-white shadow-md backdrop-blur transition duration-200 hover:bg-[var(--color-brand-primary)]",
        saved && "bg-[var(--color-brand-primary)]"
      )}
      aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title}`}
    >
      <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function EmptyResults({
  title,
  description,
  onReset,
}: {
  title: string;
  description: string;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 grid min-h-72 place-items-center rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-8 text-center">
      <div>
        <p className="text-lg font-black text-[var(--app-foreground)]">{title}</p>

        <p className="mt-2 max-w-md text-sm font-semibold text-[var(--app-muted)]">
          {description}
        </p>

        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(236,27,114,0.34)] transition duration-200 hover:brightness-110"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}

function getQuickFiltersForDiscovery(config: DiscoveryConfig) {
  const base =
    config.kind === "activities"
      ? [
        "Today",
        "Tomorrow",
        "This Weekend",
        "Near You",
        "Under 5 km",
        "Indoor",
        "Outdoor",
        "Kids Friendly",
        "Free",
      ]
      : config.kind === "plays"
        ? [
          "Today",
          "Tomorrow",
          "This Weekend",
          "Marathi",
          "Hindi",
          "Family Friendly",
          "Top Rated",
          "Near You",
        ]
        : [
          "Today",
          "Tomorrow",
          "This Weekend",
          "Near You",
          "Free",
          "Top Rated",
          "Trending",
          "Family Friendly",
        ];

  return Array.from(new Set([...base, ...config.quickFilters])).filter(Boolean);
}

function toggleQuickFilter(current: string[], filter: string) {
  return current.includes(filter)
    ? current.filter((item) => item !== filter)
    : [...current, filter];
}

function matchesQuickFilters(item: DiscoveryItem, activeQuickFilters: string[]) {
  if (!activeQuickFilters.length) return true;
  return activeQuickFilters.every((filter) => matchesQuickFilter(item, filter));
}

function matchesQuickFilter(item: DiscoveryItem, activeQuickFilter: string) {
  const filter = activeQuickFilter.toLowerCase();

  const tags = item.tags.map((tag) => tag.toLowerCase());
  const quickFilters = item.quickFilters.map((tag) => tag.toLowerCase());

  const searchable = [
    item.title,
    item.category,
    item.genre,
    item.language,
    item.sport,
    item.city,
    item.venue,
    item.description,
    ...item.tags,
    ...item.quickFilters,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (activeQuickFilter === allValue) return true;

  if (filter === "today") return isSameDiscoveryDay(item.dateValue, 0);
  if (filter === "tomorrow") return isSameDiscoveryDay(item.dateValue, 1);
  if (filter === "this weekend") return isDiscoveryWeekend(item.dateValue);

  if (filter === "near you") return item.distanceKm <= 8;
  if (filter === "under 5 km") return item.distanceKm <= 5;

  if (filter === "free") return item.price <= 0;
  if (filter === "top rated") return item.rating >= 4.5;
  if (filter === "trending") return item.popularity >= 85;

  if (filter === "kids friendly" || filter === "family friendly") {
    return /kid|kids|family|families|children/i.test(searchable);
  }

  if (filter === "indoor") {
    return /indoor|studio|arena|auditorium|hall/i.test(searchable);
  }

  if (filter === "outdoor") {
    return /outdoor|open air|stadium|garden|ground|park/i.test(searchable);
  }

  return quickFilters.includes(filter) || tags.includes(filter) || searchable.includes(filter);
}

function matchesPriceFilter(item: DiscoveryItem, priceFilter: string) {
  if (priceFilter === allValue) return true;

  const normalized = priceFilter.toLowerCase().replace(/,/g, "");
  const numbers = normalized.match(/\d+/g)?.map(Number) ?? [];

  if (normalized.includes("free")) return item.price <= 0;

  if (
    normalized.includes("above") ||
    normalized.includes("over") ||
    normalized.includes("+")
  ) {
    return numbers.length ? item.price >= numbers[0] : true;
  }

  if (
    normalized.includes("under") ||
    normalized.includes("below") ||
    normalized.includes("up to")
  ) {
    return numbers.length ? item.price <= numbers[0] : true;
  }

  if (numbers.length >= 2) {
    const min = Math.min(numbers[0], numbers[1]);
    const max = Math.max(numbers[0], numbers[1]);
    return item.price >= min && item.price <= max;
  }

  if (numbers.length === 1) {
    return item.price <= numbers[0];
  }

  return true;
}

function isSameDiscoveryDay(value: string, offsetDays: number) {
  const eventDate = new Date(value);
  if (Number.isNaN(eventDate.getTime())) return false;

  const target = new Date();
  target.setDate(target.getDate() + offsetDays);

  return (
    eventDate.getFullYear() === target.getFullYear() &&
    eventDate.getMonth() === target.getMonth() &&
    eventDate.getDate() === target.getDate()
  );
}

function isDiscoveryWeekend(value: string) {
  const eventDate = new Date(value);
  if (Number.isNaN(eventDate.getTime())) return false;

  const today = new Date();
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;

  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSaturday);

  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  return isSameDate(eventDate, saturday) || isSameDate(eventDate, sunday);
}

function isSameDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getCategoryImage(category: string, items: DiscoveryItem[]) {
  return (
    items.find(
      (item) =>
        item.category === category ||
        item.genre === category ||
        item.sport === category ||
        item.tags.includes(category)
    )?.image ??
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
  return item.href || `/${item.kind}/${item.id}`;
}
