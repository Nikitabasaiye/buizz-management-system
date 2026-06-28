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
  "Aurangabad",
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
  Aurangabad: { lat: 19.8762, lng: 75.3433 },
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

  const filteredCities = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return cities;
    return cities.filter((city) => city.toLowerCase().includes(term));
  }, [query]);

  useEffect(() => {
    const saved = window.localStorage.getItem("buizz-recent-cities");
    if (saved) setRecentCities(JSON.parse(saved) as string[]);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 120);
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousedown", onPointerDown);
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

  const isHero = variant === "hero";

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          isHero
            ? "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-white/14 bg-white/10 px-3 text-left text-sm font-black text-white shadow-xl shadow-black/20 backdrop-blur-xl transition hover:border-[#e50914]/50"
            : "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-black text-[var(--app-foreground)] transition hover:bg-[var(--app-subtle)] sm:px-2.5"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="size-4 shrink-0 text-[#e50914]" />
          <span className="truncate">{label ?? selectedCity}</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-[var(--app-muted)]" />
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
            className={`absolute z-[70] mt-3 w-[min(92vw,420px)] overflow-hidden rounded-lg border border-white/16 bg-[color:var(--app-elevated)]/92 text-[var(--app-foreground)] shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl ${isHero ? "left-0" : "left-0 lg:left-0"}`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--app-border)] p-4">
              <div>
                <p className="text-base font-black">Choose location</p>
                <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">Find events, workshops, and shows near you.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-md bg-[var(--app-subtle)]" aria-label="Close location selector">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4">
              <button
                type="button"
                onClick={detectLocation}
                disabled={detecting}
                className="flex min-h-11 w-full items-center justify-between rounded-md border border-[#e50914]/25 bg-[#e50914]/10 px-3 text-sm font-black text-[#e50914] transition hover:bg-[#e50914]/15 disabled:opacity-70"
              >
                <span className="inline-flex items-center gap-2">
                  {detecting ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
                  {detecting ? "Detecting location..." : "Use My Current Location"}
                </span>
              </button>
              {message ? <p className="mt-2 text-xs font-bold text-[var(--app-muted)]">{message}</p> : null}

              <label className="mt-4 flex min-h-11 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3">
                <Search className="size-4 text-[var(--app-muted)]" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--app-muted)]"
                  placeholder="Enter your city"
                />
              </label>

              {recentCities.length ? (
                <LocationGroup title="Recent Locations" cities={recentCities} selectedCity={selectedCity} onSelect={selectCity} />
              ) : null}

              <LocationGroup title={query ? "Search Suggestions" : "Popular Cities"} cities={[...filteredCities]} selectedCity={selectedCity} onSelect={selectCity} />
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
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {groupCities.length ? (
          groupCities.map((city) => (
            <button
              key={`${title}-${city}`}
              type="button"
              onClick={() => onSelect(city)}
              className={`min-h-10 rounded-md border px-3 text-left text-xs font-black transition ${
                selectedCity === city
                  ? "border-[#e50914] bg-[#e50914] text-white"
                  : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] hover:border-[#e50914]/40"
              }`}
            >
              {city}
            </button>
          ))
        ) : (
          <p className="col-span-full rounded-md bg-[var(--app-subtle)] px-3 py-3 text-sm font-semibold text-[var(--app-muted)]">Choose your city</p>
        )}
      </div>
    </div>
  );
}
