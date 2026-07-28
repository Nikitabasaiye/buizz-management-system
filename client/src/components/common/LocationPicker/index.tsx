"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/app.store";

const cities = [
  "Pune",
  "Mumbai",
  "Nashik",
  "Nagpur",
  "Chhatrapati Sambhaji Nagar",
  "Kolhapur",
  "Solapur",
  "Satara",
  "Ahmednagar",
  "Thane",
] as const;

const cityCoordinates: Record<(typeof cities)[number], { lat: number; lng: number }> = {
  Pune: { lat: 18.5204, lng: 73.8567 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Nashik: { lat: 19.9975, lng: 73.7898 },
  Nagpur: { lat: 21.1458, lng: 79.0882 },
  "Chhatrapati Sambhaji Nagar": { lat: 19.8762, lng: 75.3433 },
  Kolhapur: { lat: 16.705, lng: 74.2433 },
  Solapur: { lat: 17.6599, lng: 75.9064 },
  Satara: { lat: 17.6805, lng: 73.9933 },
  Ahmednagar: { lat: 19.0948, lng: 74.748 },
  Thane: { lat: 19.2183, lng: 72.9781 },
};

type LocationSelectorProps = {
  variant?: "navbar" | "hero";
  label?: string;
};

export function LocationSelector({ variant = "navbar", label }: LocationSelectorProps) {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const setSelectedCity = useAppStore((state) => state.setSelectedCity);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isHero = variant === "hero";

  const filteredCities = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return cities;
    return cities.filter((city) => city.toLowerCase().includes(term));
  }, [query]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("buizz-recent-cities");
      if (saved) setRecentCities(JSON.parse(saved) as string[]);
    } catch {
      setRecentCities([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => searchRef.current?.focus(), 120);

    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectCity = (city: string) => {
    setSelectedCity(city);
    setMessage("");
    setQuery("");
    setOpen(false);

    const nextRecent = [city, ...recentCities.filter((item) => item !== city)].slice(0, 4);
    setRecentCities(nextRecent);
    window.localStorage.setItem("buizz-recent-cities", JSON.stringify(nextRecent));
  };

  const detectLocation = () => {
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("Choose your city");
      return;
    }

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetecting(false);
        selectCity(findNearestCity(position.coords.latitude, position.coords.longitude));
      },
      () => {
        setDetecting(false);
        setMessage("Choose your city");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div
      ref={panelRef}
      className={
        isHero
          ? "relative w-full min-w-0"
          : "relative min-w-0 shrink-0 max-w-[9.5rem] sm:max-w-[13rem] md:max-w-[15rem] lg:max-w-[18rem]"
      }
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          isHero
            ? "flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-white/14 bg-white/10 px-3 text-left text-sm font-black text-white shadow-xl shadow-black/20 backdrop-blur-xl transition hover:border-[var(--color-brand-primary)]/50"
            : "inline-flex min-h-9 w-full min-w-0 shrink-0 items-center justify-between gap-1.5 rounded-md px-2 text-xs font-black text-[var(--app-foreground)] transition hover:bg-[var(--app-subtle)] sm:px-2.5"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
          <MapPin className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
          <span className="min-w-0 truncate">{label ?? selectedCity}</span>
        </span>

        <ChevronDown
          className={`size-3.5 shrink-0 text-[var(--app-muted)] transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label="Choose location"
            className={`fixed right-4 top-[140px] z-[999] w-[280px] max-w-[calc(100vw-32px)] overflow-hidden rounded-lg border border-white/16 bg-[color:var(--app-elevated)]/95 text-[var(--app-foreground)] shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-3 sm:w-[360px] sm:max-w-[420px]`}         >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--app-border)] p-4">
              <div className="min-w-0">
                <p className="text-base font-black">Choose location</p>
                <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                  Find events, workshops, and shows near you.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--app-subtle)]"
                aria-label="Close location selector"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[calc(78vh-96px)] overflow-y-auto p-3 sm:max-h-[min(70vh,520px)] sm:p-4">
              <button
                type="button"
                onClick={detectLocation}
                disabled={detecting}
                className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 px-3 text-left text-sm font-black text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)]/15 disabled:opacity-70"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  {detecting ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                  ) : (
                    <LocateFixed className="size-4 shrink-0" />
                  )}
                  <span className="min-w-0 truncate">
                    {detecting ? "Detecting location..." : "Use My Current Location"}
                  </span>
                </span>
              </button>

              {message ? (
                <p className="mt-2 text-xs font-bold text-[var(--app-muted)]">{message}</p>
              ) : null}

              <label className="mt-4 flex min-h-11 min-w-0 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3">
                <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--app-muted)]"
                  placeholder="Enter your city"
                />
              </label>

              {recentCities.length ? (
                <LocationGroup
                  title="Recent Locations"
                  cities={recentCities}
                  selectedCity={selectedCity}
                  onSelect={selectCity}
                />
              ) : null}

              <LocationGroup
                title={query ? "Search Suggestions" : "Popular Cities"}
                cities={[...filteredCities]}
                selectedCity={selectedCity}
                onSelect={selectCity}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function findNearestCity(lat: number, lng: number) {
  return cities.reduce((nearest, city) => {
    const current = cityCoordinates[city];
    const best = cityCoordinates[nearest];
    const currentDistance = Math.hypot(current.lat - lat, current.lng - lng);
    const bestDistance = Math.hypot(best.lat - lat, best.lng - lng);
    return currentDistance < bestDistance ? city : nearest;
  }, "Pune" as (typeof cities)[number]);
}

function LocationGroup({
  title,
  cities: groupCities,
  selectedCity,
  onSelect,
}: {
  title: string;
  cities: string[];
  selectedCity: string;
  onSelect: (city: string) => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-black uppercase text-[var(--app-muted)]">{title}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {groupCities.length ? (
          groupCities.map((city) => (
            <button
              key={`${title}-${city}`}
              type="button"
              onClick={() => onSelect(city)}
              className={`h-9 min-w-0 rounded-md border px-2 text-left text-[11px] font-black transition ${selectedCity === city
                ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
                : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] hover:border-[var(--color-brand-primary)]/40"
                }`}
            >
              <span className="block truncate">{city}</span>
            </button>
          ))
        ) : (
          <p className="col-span-full rounded-md bg-[var(--app-subtle)] px-3 py-3 text-sm font-semibold text-[var(--app-muted)]">
            Choose your city
          </p>
        )}
      </div>
    </div>
  );
}