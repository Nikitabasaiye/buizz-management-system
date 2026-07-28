"use client";

import { AlertCircle, ArrowLeft, CalendarDays, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PriceSummary } from "@/components/seat-map/PriceSummary";
import { SeatLegend } from "@/components/seat-map/SeatLegend";
import { SeatMapRenderer } from "@/components/seat-map/SeatMapRenderer";
import { SelectedItemsPanel } from "@/components/seat-map/SelectedItemsPanel";
import { allDiscoveryItems, type DiscoveryItem } from "@/features/discovery/data";
import { readUnifiedEvents, type UnifiedBuizzEvent } from "@/features/integration/eventLifecycle";
import { getVenueLayoutForItem } from "@/features/seat-map/sampleLayouts";
import { useSeatMapStore } from "@/features/seat-map/seat-map-store";
import type { SeatMapBookingPayload, SeatMapSelectionItem } from "@/features/seat-map/types";
import { formatCurrency, formatLayoutType, selectionTotal } from "@/features/seat-map/utils";

export function CustomerBookingPage({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<SeatMapSelectionItem[]>([]);
  const layouts = useSeatMapStore((state) => state.layouts);
  const savedEvent = useMemo(() => {
    if (typeof window === "undefined") return null;
    return readUnifiedEvents().find((event) => event.id === eventId || event.slug === eventId) ?? null;
  }, [eventId]);
  const staticItem = useMemo(() => allDiscoveryItems.find((entry) => entry.id === eventId || entry.href?.split("/").pop() === eventId), [eventId]);
  const item = useMemo(
    () => savedEvent && savedEvent.status === "published" ? savedSeatMapEventToDiscoveryItem(savedEvent) : staticItem,
    [savedEvent, staticItem],
  );
  const layout = useMemo(() => {
    if (!item) return null;
    const savedLayout = layouts.find((entry) => entry.eventId === item.id && entry.metadata.status === "published") ?? layouts.find((entry) => entry.eventId === item.id);
    if (savedEvent) return savedLayout ?? null;
    return savedLayout ?? getVenueLayoutForItem(item);
  }, [item, layouts, savedEvent]);
  const subtotal = selectionTotal(selected);
  const payableTotal = subtotal + Math.round(subtotal * 0.04) + Math.round(subtotal * 0.05);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 250);
    return () => window.clearTimeout(timer);
  }, [eventId]);

  const continueBooking = () => {
    if (!item || !layout) return;
    const payload: SeatMapBookingPayload = {
      eventId: item.id,
      provider: layout.provider,
      selectedItems: selected.map((selection) => selection.id),
      holdToken: layout.provider === "seatsio" ? "frontend-placeholder-hold-token" : undefined,
      totalPrice: payableTotal,
    };
    window.localStorage.setItem("buizz-seat-map-booking-payload", JSON.stringify(payload));
    router.push(`/booking/${item.id}`);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--app-subtle)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-48 rounded-xl bg-white shadow-sm" />
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-[520px] rounded-xl bg-white shadow-sm" />
            <div className="h-[520px] rounded-xl bg-white shadow-sm" />
          </div>
        </div>
      </main>
    );
  }

  if (savedEvent && savedEvent.status !== "published") {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--app-subtle)] px-4 py-10">
        <section className="max-w-lg rounded-xl border border-[var(--app-border)] bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto size-10 text-[#EF4444]" />
          <h1 className="mt-4 text-2xl font-black text-[var(--app-foreground)]">This event is not available for booking.</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">The organizer event exists, but it is not published on the customer website yet.</p>
          <Link href="/events" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-secondary)] px-5 text-sm font-black text-white">
            Browse events
          </Link>
        </section>
      </main>
    );
  }

  if (!item || !layout) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--app-subtle)] px-4 py-10">
        <section className="max-w-lg rounded-xl border border-[var(--app-border)] bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto size-10 text-[#EF4444]" />
          <h1 className="mt-4 text-2xl font-black text-[var(--app-foreground)]">Booking layout unavailable</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">This event does not have a seat map configured yet.</p>
          <Link href="/events" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-secondary)] px-5 text-sm font-black text-white">
            Browse events
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-subtle)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href={item.href ?? `/${item.kind}`} className="inline-flex items-center gap-2 text-sm font-black text-[var(--app-muted)] transition hover:text-[var(--color-brand-secondary)]">
          <ArrowLeft className="size-4" />
          Back to event
        </Link>

        <section className="mt-4 overflow-hidden rounded-xl border border-[var(--app-border)] bg-white shadow-sm">
          <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
            <img src={item.image} alt="" className="h-56 w-full object-cover lg:h-full" />
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--color-brand-secondary)]/10 px-3 py-1 text-xs font-black uppercase text-[var(--color-brand-secondary)]">{item.badge}</span>
                <span className="rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-black uppercase text-[var(--color-brand-primary)]">{formatLayoutType(layout.layoutType)}</span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--app-foreground)]">{item.title}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--app-muted)]">{item.description}</p>
              <div className="mt-5 grid gap-3 text-sm font-bold text-[#475569] sm:grid-cols-3">
                <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-[var(--color-brand-secondary)]" />{item.date}</span>
                <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-[var(--color-brand-secondary)]" />{item.venue}</span>
                <span className="inline-flex items-center gap-2"><Ticket className="size-4 text-[var(--color-brand-secondary)]" />{formatCurrency(item.price || 0)} onwards</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-4">
            <SeatLegend />
            <SeatMapRenderer layout={layout} mode="customer" selected={selected} onSelectionChange={setSelected} maxSelection={12} />
          </section>

          <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
            <SelectedItemsPanel selectedItems={selected} onRemove={(id) => setSelected((current) => current.filter((item) => item.id !== id))} />
            <PriceSummary selectedItems={selected} />
            <button
              type="button"
              onClick={continueBooking}
              disabled={selected.length === 0}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--color-brand-secondary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#5b2be8] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
            >
              Continue
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

function savedSeatMapEventToDiscoveryItem(event: UnifiedBuizzEvent): DiscoveryItem {
  const category = event.subCategory || event.category || "Event";
  const kind: DiscoveryItem["kind"] =
    event.category === "play" || category.toLowerCase().includes("play")
      ? "plays"
      : event.category === "activity" || category.toLowerCase().includes("activit")
        ? "activities"
        : "events";

  return {
    id: event.id,
    title: event.title,
    kind,
    category,
    genre: category,
    date: event.date || "Date pending",
    dateValue: event.date || "2026-12-31",
    venue: event.venueName || "Venue pending",
    city: event.city || "City pending",
    distanceKm: 0,
    price: event.priceMin || 0,
    priceLabel: event.priceMin > 0 ? `Rs. ${event.priceMin.toLocaleString("en-IN")} onwards` : "Free",
    rating: 4.6,
    popularity: 80,
    image: event.bannerImage || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80",
    badge: "Published",
    description: event.description || "Event details will be updated soon.",
    tags: [category, event.city].filter(Boolean).map(String),
    quickFilters: [],
    href: `/${kind}/${event.id}`,
    slot: event.time ? `${event.date || "Date pending"} at ${event.time}` : event.date,
  };
}
