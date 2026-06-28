"use client";

import {
  CalendarDays,
  Camera,
  Car,
  Clock,
  Compass,
  Gift,
  Heart,
  MapPin,
  PawPrint,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Utensils,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { Footer } from "@/components/common/Footer";
import { allDiscoveryItems, type DiscoveryItem } from "@/features/discovery/data";
import { useAppStore } from "@/store/app.store";
import { useWishlistStore } from "@/store/wishlist.store";

const offerCards = [
  "Flat Rs. 250 OFF on ticket value above Rs. 4000",
  "Flat Rs. 150 OFF on ticket value above Rs. 2700",
  "Flat Rs. 75 OFF on ticket value above Rs. 990",
];

const perfectForOptions = [
  { title: "Date Night", description: "Perfect for couples and memorable evenings.", icon: <Heart className="size-5" /> },
  { title: "Friends Group", description: "Enjoy together with your crew without planning stress.", icon: <Users className="size-5" /> },
  { title: "Family Time", description: "Comfortable, easy to enter, and family-friendly.", icon: <ShieldCheck className="size-5" /> },
  { title: "Weekend Escape", description: "A polished plan for a relaxed weekend outing.", icon: <Compass className="size-5" /> },
  { title: "Celebration", description: "Birthday plans, special moments, and group memories.", icon: <Sparkles className="size-5" /> },
  { title: "Culture Lovers", description: "For people who enjoy distinctive city experiences.", icon: <Star className="size-5" /> },
];

export function ListingDetailPage({ item }: { item: DiscoveryItem }) {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const savedIds = useWishlistStore((state) => state.savedIds);
  const toggleSaved = useWishlistStore((state) => state.toggleSaved);
  const [expandedOverview, setExpandedOverview] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const saved = savedIds.includes(item.id);
  const bookingLabel = item.kind === "activities" ? "Book Now" : "Book Tickets";
  const interestedCount = Math.round(item.popularity * 180);
  const displayTitle = withSelectedCity(item.title, selectedCity);
  const displayDescription = withSelectedCity(item.description, selectedCity);
  const displayVenue = withSelectedCity(item.venue, selectedCity);
  const overviewStory = useMemo(
    () => buildOverviewStory({ title: displayTitle, category: item.category, venue: displayVenue, city: selectedCity, kind: item.kind }),
    [displayTitle, displayVenue, item.category, item.kind, selectedCity]
  );

  const similarItems = useMemo(
    () => allDiscoveryItems.filter((candidate) => candidate.kind === item.kind && candidate.id !== item.id).slice(0, 8),
    [item.id, item.kind]
  );

  const galleryImages = useMemo(
    () => [item.image, ...similarItems.slice(0, 5).map((similar) => similar.image)],
    [item.image, similarItems]
  );

  const shareListing = async () => {
    const shareUrl = `${window.location.origin}/${item.kind}/${item.id}`;
    const shareText = `${displayTitle} on Buizz - ${item.date} at ${displayVenue}, ${selectedCity}.`;
    if (navigator.share) {
      await navigator.share({ title: displayTitle, text: shareText, url: shareUrl });
      return;
    }
    await navigator.clipboard?.writeText(`${shareText} ${shareUrl}`);
  };

  return (
    <>
      <main className="min-h-screen overflow-x-hidden bg-[var(--app-background)] pb-24 text-[var(--app-foreground)] sm:pb-8">
        <section className="relative overflow-hidden border-b border-[var(--app-border)]">
          <img src={item.image} alt={displayTitle} className="absolute inset-0 size-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050812] via-[#050812]/84 to-[#050812]/28" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--app-background)] via-transparent to-black/20" />
          <div className="relative mx-auto grid min-h-[620px] max-w-[1500px] gap-6 px-3 py-6 sm:px-5 lg:grid-cols-[230px_minmax(0,1fr)] lg:content-end lg:px-8 lg:py-10">
            <img src={item.image} alt={`${displayTitle} poster`} className="hidden aspect-[0.72] self-end rounded-md object-cover shadow-[0_24px_70px_rgba(0,0,0,0.45)] ring-1 ring-white/15 lg:block" />
            <div className="self-end text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#e50914] px-2 py-1 text-[11px] font-black uppercase tracking-normal">{item.badge}</span>
                <span className="rounded border border-white/14 bg-white/10 px-2 py-1 text-[11px] font-black backdrop-blur">{item.category}</span>
              </div>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-none drop-shadow-[0_3px_0_rgba(229,9,20,0.52)] sm:text-6xl lg:text-7xl">{displayTitle}</h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/76">{displayDescription}</p>
              <div className="mt-6 grid max-w-3xl gap-2 text-sm font-bold text-white/80 sm:grid-cols-2">
                <Meta icon={<CalendarDays className="size-4 text-[#ff2634]" />} text={item.slot ?? item.date} />
                <Meta icon={<MapPin className="size-4 text-[#ff2634]" />} text={`${displayVenue}, ${selectedCity}`} />
                <Meta icon={<Ticket className="size-4 text-[#ff2634]" />} text={`Starting ${item.priceLabel}`} />
                <Meta icon={<Star className="size-4 fill-[#f6c453] text-[#f6c453]" />} text={`${item.rating} rating - ${interestedCount} interested`} />
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={`/booking/${item.id}`} className="hidden min-h-12 items-center gap-2 rounded-md bg-[#e50914] px-5 text-sm font-black !text-white shadow-[0_18px_44px_rgba(229,9,20,0.30)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#ff2634] sm:inline-flex xl:hidden">
                  <Ticket className="size-4" />
                  {bookingLabel}
                </Link>
                <button type="button" onClick={() => toggleSaved(item.id)} className={`inline-flex min-h-12 items-center gap-2 rounded-md border border-white/15 px-5 text-sm font-black text-white backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-[#e50914] ${saved ? "bg-[#e50914]" : "bg-white/10"}`}>
                  <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
                  Wishlist
                </button>
                <button type="button" onClick={shareListing} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-white/15 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-[#e50914]">
                  <Share2 className="size-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1500px] px-3 py-6 sm:px-5 lg:px-8">
          <section className="grid gap-5">
            <div className="grid gap-5">
              <DetailSection eyebrow="Experience Overview" title="A polished plan, not just a ticket">
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                    <MetadataPill icon={<Star className="size-3.5 fill-[#f6c453] text-[#f6c453]" />} text={`${item.rating} Rating`} />
                    <MetadataPill icon={<Heart className="size-3.5 text-[#e50914]" />} text={`${formatCompactCount(interestedCount)} Interested`} />
                    <MetadataPill icon={<MapPin className="size-3.5 text-[#e50914]" />} text={selectedCity} />
                    <MetadataPill icon={<Ticket className="size-3.5 text-[#38d97b]" />} text="Verified Event" />
                  </div>

                  <div>
                    <p className={`${expandedOverview ? "" : "line-clamp-4"} text-sm font-semibold leading-7 text-[var(--app-muted)]`}>
                      {displayDescription} Buizz layers discovery, verified venue details, smooth QR entry, WhatsApp delivery status, and Passport rewards into one premium city experience. Come for the plan, keep the memory in your Passport after the QR scan.
                    </p>
                    <div className={`grid overflow-hidden transition-[max-height,opacity,margin] duration-500 ease-out ${expandedOverview ? "mt-4 max-h-[760px] opacity-100" : "max-h-0 opacity-0"}`}>
                      <div className="grid gap-3 border-t border-[var(--app-border)] pt-4">
                        {overviewStory.map((section) => (
                          <div key={section.title} className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                            <p className="text-xs font-black uppercase text-[#e50914]">{section.title}</p>
                            <p className="mt-2 text-sm font-semibold leading-7 text-[var(--app-muted)]">{section.copy}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={() => setExpandedOverview((open) => !open)} className="mt-3 text-sm font-black text-[#e50914]">{expandedOverview ? "Read Less" : "Read More"}</button>
                  </div>
                </div>
              </DetailSection>

              <CompactBookingSummary item={item} bookingLabel={bookingLabel} />

              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <DetailSection eyebrow="Highlights" title="Built around the feeling">
                  <div className="grid gap-3">
                    <StoryCard icon={<Sparkles className="size-5" />} title="Premium mood" description={`${item.category} with a curated, high-energy city atmosphere.`} />
                    <StoryCard icon={<ShieldCheck className="size-5" />} title="Verified flow" description="Venue, slot, QR, and ticket status stay clear from booking to entry." />
                    <StoryCard icon={<Compass className="size-5" />} title="Passport memory" description="Attendance unlocks XP only after the venue scan, keeping rewards honest." />
                  </div>
                </DetailSection>

                <DetailSection eyebrow="What You'll Experience" title="Your evening, mapped visually">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MiniMoment index="01" title="Arrive" description={`Reach ${displayVenue} with directions and QR ready.`} />
                    <MiniMoment index="02" title="Enter" description="Scan the pass at venue entry and move in smoothly." />
                    <MiniMoment index="03" title="Unlock" description="Passport stamp unlocks after successful scan." />
                  </div>
                </DetailSection>
              </div>

              <DetailSection eyebrow="Perfect For" title="Pick the kind of plan this becomes">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {perfectForOptions.map((option) => (
                    <div key={option.title} className="group rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#e50914]/45 hover:bg-[var(--app-elevated)]">
                      <div className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-[#e50914]/10 text-[#e50914] transition group-hover:bg-[#e50914] group-hover:text-white">
                          {option.icon}
                        </div>
                        <div>
                          <p className="text-sm font-black">{option.title}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>

              <DetailSection eyebrow="Things To Know" title="Everything before you leave">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <Know icon={<Clock className="size-4" />} label="2h 30m duration" />
                  <Know icon={<Users className="size-4" />} label="Age 8+" />
                  <Know icon={<ShieldCheck className="size-4" />} label={item.language ?? "English"} />
                  <Know icon={<MapPin className="size-4" />} label={item.tags.includes("Outdoor") || item.tags.includes("Outdoor Events") ? "Outdoor" : "Indoor"} />
                  <Know icon={<Ticket className="size-4" />} label="Zone based entry" />
                  <Know icon={<Users className="size-4" />} label="Kid friendly" />
                  <Know icon={<PawPrint className="size-4" />} label="Pets not allowed" />
                  <Know icon={<Car className="size-4" />} label="Parking available" />
                  <Know icon={<Utensils className="size-4" />} label="Food available" />
                </div>
              </DetailSection>

              <DetailSection eyebrow="Gallery" title="A glimpse of the vibe">
                <div className="grid gap-3 md:grid-cols-4">
                  {galleryImages.map((image, index) => (
                    <div key={`${image}-${index}`} className={`${index === 0 ? "md:col-span-2 md:row-span-2" : ""} group relative aspect-[1.22] overflow-hidden rounded-md bg-[var(--app-subtle)]`}>
                      <img src={image} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                      {index === 0 ? <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded bg-black/70 px-3 py-2 text-xs font-black text-white backdrop-blur"><Camera className="size-4" />Featured</span> : null}
                      {index === 3 ? <div className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-black text-white"><Video className="mr-2 inline size-4" />Video preview</div> : null}
                    </div>
                  ))}
                </div>
              </DetailSection>

              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <DetailSection eyebrow="Venue Experience" title={displayVenue}>
                  <div className="grid gap-4">
                    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                      <p className="text-sm font-black text-[var(--app-foreground)]">{displayVenue}</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">{displayVenue}, central {selectedCity}</p>
                      <div className="mt-3 grid gap-2 text-xs font-black text-[var(--app-muted)] sm:grid-cols-2">
                        <span className="inline-flex items-center gap-2"><Compass className="size-4 text-[#e50914]" />Approx {item.distanceKm.toFixed(1)} km away</span>
                        <span className="inline-flex items-center gap-2"><Car className="size-4 text-[#e50914]" />Parking near main entry</span>
                        <span className="inline-flex items-center gap-2 sm:col-span-2"><ShieldCheck className="size-4 text-[#38d97b]" />Keep QR pass ready; follow venue entry guidance.</span>
                      </div>
                    </div>
                    <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-center">
                      <div>
                        <MapPin className="mx-auto size-7 text-[#e50914]" />
                        <p className="mt-3 text-sm font-black text-[var(--app-foreground)]">Premium map placeholder</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{displayVenue}, {selectedCity}</p>
                      </div>
                    </div>
                  </div>
                  <button type="button" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#e50914] px-4 text-sm font-black text-white transition hover:bg-[#ff2634]">
                    <MapPin className="size-4" />
                    Open in Maps
                  </button>
                </DetailSection>

                <DetailSection eyebrow="Offers" title="Buizz-ready savings">
                  <div className="grid gap-3">
                    {offerCards.map((offer) => (
                      <div key={offer} className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 transition duration-200 hover:-translate-y-1 hover:border-[#e50914]/45">
                        <Gift className="size-5 text-[#e50914]" />
                        <p className="mt-3 text-sm font-black">{offer}</p>
                      </div>
                    ))}
                  </div>
                </DetailSection>
              </div>

              <DetailSection eyebrow="Similar Experiences" title="Stay in the same mood">
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {similarItems.map((similar) => <SimilarCard key={similar.id} item={similar} selectedCity={selectedCity} />)}
                </div>
              </DetailSection>

              <DetailSection eyebrow="Terms & Conditions" title="The honest fine print">
                <button type="button" onClick={() => setTermsOpen((open) => !open)} className="flex min-h-11 w-full items-center justify-between rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-left text-sm font-black">
                  Entry, cancellation, and Passport rules
                  <span>{termsOpen ? "-" : "+"}</span>
                </button>
                {termsOpen ? <p className="mt-3 text-sm font-semibold leading-7 text-[var(--app-muted)]">Carry valid ID, arrive before start time, and follow venue rules. Passport stamps unlock only after QR scan at the venue, never immediately after online payment.</p> : null}
              </DetailSection>
            </div>

          </section>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--app-border)] bg-[color:var(--app-elevated)]/95 p-3 shadow-[0_-18px_50px_rgba(0,0,0,0.22)] backdrop-blur xl:hidden">
        <Link href={`/booking/${item.id}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#e50914] text-sm font-black !text-white">{bookingLabel}</Link>
      </div>
      <Footer />
    </>
  );
}

export function EventDetailPage({ item }: { item: DiscoveryItem }) {
  return <ListingDetailPage item={item} />;
}

function Meta({ icon, text }: { icon: ReactNode; text: string }) {
  return <p className="flex min-w-0 items-center gap-2">{icon}<span className="truncate">{text}</span></p>;
}

function MetadataPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-2.5 text-[var(--app-foreground)]">
      {icon}
      {text}
    </span>
  );
}

function DetailSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.10)] sm:p-5">
      <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">{eyebrow}</p>
      <h2 className="mt-2 mb-4 text-2xl font-black leading-tight">{title}</h2>
      {children}
    </section>
  );
}

function CompactBookingSummary({ item, bookingLabel }: { item: DiscoveryItem; bookingLabel: string }) {
  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-[var(--app-foreground)] shadow-sm">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-center">
        <p className="inline-flex min-h-10 items-center rounded-md bg-[var(--app-subtle)] px-3 text-sm font-black">{item.priceLabel}</p>
        <span className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--app-subtle)] px-3 text-xs font-black"><Clock className="size-3.5 text-[#ff2634]" />2h 30m Experience</span>
        <span className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--app-subtle)] px-3 text-xs font-black"><ShieldCheck className="size-3.5 text-[#38d97b]" />Verified Entry</span>
        <span className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--app-subtle)] px-3 text-xs font-black"><Sparkles className="size-3.5 text-[#f6c453]" />Passport XP Reward</span>
        <Link href={`/booking/${item.id}`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2634] px-5 text-sm font-black !text-white shadow-[0_14px_34px_rgba(229,9,20,0.28)] transition hover:-translate-y-0.5">
          {bookingLabel}
        </Link>
      </div>
    </section>
  );
}

function StoryCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 transition duration-200 hover:-translate-y-1 hover:border-[#e50914]/45">
      <div className="text-[#ff2634]">{icon}</div>
      <p className="mt-3 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">{description}</p>
    </div>
  );
}

function MiniMoment({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <span className="rounded bg-[#e50914] px-2 py-1 text-[10px] font-black text-white">{index}</span>
      <p className="mt-4 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">{description}</p>
    </div>
  );
}

function Know({ icon, label }: { icon: ReactNode; label: string }) {
  return <div className="flex min-h-14 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-xs font-black text-[var(--app-foreground)]">{icon}<span>{label}</span></div>;
}

function SimilarCard({ item, selectedCity }: { item: DiscoveryItem; selectedCity: string }) {
  const title = withSelectedCity(item.title, selectedCity);

  return (
    <Link href={`/${item.kind}/${item.id}`} className="group w-44 shrink-0 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] transition duration-200 hover:-translate-y-1 hover:border-[#e50914]/45">
      <img src={item.image} alt={title} className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105" />
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-black">{title}</p>
        <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">{item.priceLabel}</p>
      </div>
    </Link>
  );
}

function withSelectedCity(text: string, city: string) {
  return text.replace(/\bin Pune\b/g, `in ${city}`).replace(/\bPune\b/g, city);
}

function formatCompactCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 0)}K`;
  return String(value);
}

function buildOverviewStory({
  title,
  category,
  venue,
  city,
  kind,
}: {
  title: string;
  category: string;
  venue: string;
  city: string;
  kind: DiscoveryItem["kind"];
}) {
  const experienceLabel = kind === "activities" ? "experience" : kind === "plays" ? "show" : "event";
  return [
    {
      title: "Event Story",
      copy: `${title} brings together people from across ${city} and Maharashtra for a ${category.toLowerCase()} ${experienceLabel} that feels planned, polished, and easy from discovery to entry.`,
    },
    {
      title: "What Makes It Special",
      copy: `The Buizz flow focuses on verified details, clear ticket ownership, WhatsApp delivery, and a QR pass that is ready before you reach the gate. The experience is curated so guests can spend less time managing logistics and more time enjoying the moment.`,
    },
    {
      title: "Venue Atmosphere",
      copy: `${venue} is positioned as the center of the evening, with arrival, entry, and crowd movement kept simple. Expect a premium but relaxed atmosphere with clear timing, venue cues, and a crowd that matches the mood of the ${experienceLabel}.`,
    },
    {
      title: "Crowd Experience",
      copy: `The audience mix is designed for people who want a good plan without friction: couples, friends, families, and city explorers who care about comfort, timing, and a clean entry flow.`,
    },
    {
      title: "Organizer Notes",
      copy: `Arrive a little early, keep your pass ready, and follow venue instructions at entry. Passport XP unlocks only after the QR is scanned, so the reward stays tied to real attendance rather than payment alone.`,
    },
    {
      title: "What To Expect",
      copy: `Expect a verified pass, practical venue information, WhatsApp ticket status, and a calm journey from booking to entry. Buizz keeps the experience premium without making the page feel overloaded.`,
    },
  ];
}
