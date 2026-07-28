import { Footer } from "@/components/common/Footer";
import { PlatformRatingSummary } from "@/features/ratings/PlatformRatingSummary";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Globe2,
  Layers3,
  Mail,
  Megaphone,
  QrCode,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";

const highlights = [
  { value: "Built", label: "For growing organizers" },
  { value: "Ready", label: "For scalable experiences" },
  { value: "Modern", label: "Event booking workflows" },
  { value: "Flexible", label: "For multiple cities" },
];

const missionPoints = [
  "Help users discover events, activities, plays, workshops, and community experiences.",
  "Provide clear event information, pricing, availability, date, venue, and booking flow.",
  "Support organizers with listing, booking, ticketing, attendee tracking, and QR workflows.",
  "Keep the platform flexible so real client content, backend APIs, payments, and CMS can be added later.",
];

const experiences = [
  {
    title: "Events",
    text: "Concerts, festivals, workshops, meetups, and city experiences.",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80",
    href: "/events",
  },
  {
    title: "Activities",
    text: "VR games, adventure zones, creative workshops, and fun experiences.",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80",
    href: "/activities",
  },
  {
    title: "Plays",
    text: "Theatre, drama, comedy shows, cultural performances, and stage events.",
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=80",
    href: "/plays",
  },
];

const whyChooseUs = [
  {
    title: "Easy Hosting",
    text: "Focus on your experience while Buizz provides tools for listing, booking, and attendee management.",
    icon: Megaphone,
  },
  {
    title: "One Platform",
    text: "Public website, booking flow, tickets, organizer dashboard, and admin controls work together.",
    icon: Layers3,
  },
  {
    title: "Modern Experience",
    text: "Built with a mobile-first and user-friendly approach for today’s customers.",
    icon: Ticket,
  },
  {
    title: "Integration Ready",
    text: "Prepared for payment gateways, analytics, notifications, and backend services.",
    icon: CreditCard,
  },
  {
    title: "Flexible and Scalable",
    text: "Designed to support organizers as they grow and expand to new audiences.",
    icon: Globe2,
  },
  {
    title: "Smart Ticketing",
    text: "QR-based ticket workflows help create smoother event experiences.",
    icon: QrCode,
  },
];

const flow = [
  {
    title: "Discover",
    text: "Explore events, activities, plays, and experiences tailored to different interests.",
  },
  {
    title: "Book",
    text: "Choose tickets, review details, and complete a seamless booking journey.",
  },
  {
    title: "Attend",
    text: "Enjoy fast entry and digital ticket convenience through QR-ready workflows.",
  },
  {
    title: "Manage",
    text: "Organizers and admins monitor operations through role-based dashboards.",
  },
];

const modules = [
  "Public Website",
  "Booking Flow",
  "Ticket Management",
  "Customer Experience",
  "Organizer Tools",
  "Admin Controls",
  "Platform Settings",
];

const experienceStatements = [
  {
    title: "Customer Experience",
    text: "Built to create smooth, simple, and enjoyable booking journeys.",
  },
  {
    title: "Organizer Experience",
    text: "Designed to simplify event management and attendee tracking.",
  },
  {
    title: "Platform Experience",
    text: "Focused on scalability, usability, and long-term growth.",
  },
];

export default function AboutUsPage() {
  return (
    <>
      <main className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
        <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1900&q=80"
              alt="Buizz event crowd"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/65" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,27,114,0.58),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(102,38,185,0.55),transparent_36%)]" />
          </div>

          <div className="relative mx-auto max-w-[1600px]">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl">
                  {/* <Sparkles size={16} /> */}
                  About Buizz
                </div>

                <h1 className="mt-6 text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
                  Discover. Book. Experience.
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                  Buizz is a modern event discovery and booking platform designed
                  to help customers explore experiences and help organizers
                  manage events with confidence.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/events"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-7 py-3 text-sm font-bold text-white shadow-[0_15px_40px_var(--color-glow)] transition hover:-translate-y-1 hover:opacity-90"
                  >
                    Explore Events <ArrowRight size={17} />
                  </Link>

                  <Link
                    href="/contact-us"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/20"
                  >
                    Contact Us
                  </Link>
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="absolute -left-6 top-10 z-10 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-bold text-white/70">Platform focus</p>
                  <p className="mt-1 text-2xl font-black">Experience-first</p>
                </div>

                <div className="absolute -right-3 bottom-12 z-10 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-bold text-white/70">Ticketing</p>
                  <p className="mt-1 text-2xl font-black">QR-ready</p>
                </div>

                <div className="rotate-2 rounded-[2.5rem] border border-white/15 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                  <div className="overflow-hidden rounded-[2rem] bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"
                      alt="People enjoying an event"
                      className="h-[460px] w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/15 bg-white/10 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/15"
                >
                  <p className="text-3xl font-black">{item.value}</p>
                  <p className="mt-1 text-sm font-semibold text-white/70">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1600px] gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                Who We Are
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                An experience-first platform for events, activities and plays
              </h2>

              <p className="mt-5 text-sm leading-7 text-[var(--app-muted)]">
                Buizz is built for events, activities, plays, workshops, and
                community experiences. Our goal is to provide customers with a
                seamless discovery and booking journey while giving organizers
                powerful tools to manage attendees, tickets, and event
                operations.
              </p>

              <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
                The platform is designed with scalability in mind and can evolve
                with the needs of organizers, venues, and communities.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {missionPoints.map((point) => (
                  <div
                    key={point}
                    className="flex gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4"
                  >
                    <CheckCircle2
                      size={18}
                      className="mt-1 shrink-0 text-[var(--color-brand-primary)]"
                    />
                    <p className="text-sm leading-6 text-[var(--app-muted)]">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-4 -top-4 h-36 w-36 rounded-full bg-[var(--color-brand-primary)]/20 blur-3xl" />
              <div className="absolute -bottom-4 -right-4 h-44 w-44 rounded-full bg-[var(--color-brand-secondary)]/20 blur-3xl" />

              <div className="relative overflow-hidden rounded-[2.3rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.15)]">
                <img
                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80"
                  alt="Buizz team collaboration"
                  className="h-[460px] w-full rounded-[1.8rem] object-cover"
                />

                <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-white/20 bg-black/35 p-5 text-white backdrop-blur-xl">
                  <p className="text-sm font-bold text-white/70">
                    Platform focus
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    Customer + Organizer + Admin
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--app-subtle)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-10 text-center">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                Buizz Experiences
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                Events, plays, activities and more
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {experiences.map((item, index) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`group overflow-hidden rounded-[2.2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_10px_35px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:shadow-[0_20px_65px_var(--color-glow)] ${index === 1 ? "md:translate-y-8" : ""
                    }`}
                >
                  <div className="relative h-80 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-4xl font-black text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        {item.text}
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    <span className="inline-flex items-center gap-1 text-sm font-black text-[var(--color-brand-primary)]">
                      Explore {item.title}
                      <ArrowRight
                        size={15}
                        className="transition group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-10 grid gap-6 lg:grid-cols-[0.8fr_1fr] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                  Why Choose Buizz
                </p>
                <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                  Premium tools for modern event booking
                </h2>
              </div>
              <p className="text-sm leading-7 text-[var(--app-muted)]">
                Buizz is designed as a flexible frontend foundation for event
                discovery, booking, ticketing, QR validation, dashboards, and
                admin controls.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {whyChooseUs.map((item) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-card-hover)] hover:shadow-[0_18px_55px_var(--color-glow)]"
                >
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--color-brand-primary)]/10 blur-2xl transition group-hover:bg-[var(--color-brand-primary)]/20" />
                  <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-subtle)] text-[var(--color-brand-primary)]">
                    <item.icon size={22} />
                  </div>
                  <h3 className="relative text-lg font-black">{item.title}</h3>
                  <p className="relative mt-2 text-sm leading-6 text-[var(--app-muted)]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--app-subtle)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1600px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                Platform Flow
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                From discovery to entry validation
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--app-muted)]">
                Buizz connects customer discovery, booking, QR tickets, organizer
                dashboards, and admin controls in one production-ready frontend.
              </p>

              <div className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
                  alt="Analytics dashboard"
                  className="h-72 w-full rounded-[1.5rem] object-cover"
                />
              </div>
            </div>

            <div className="space-y-5">
              {flow.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-hover)]"
                >
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)] text-sm font-black text-white shadow-[0_10px_30px_var(--color-glow)]">
                      0{index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] overflow-hidden rounded-[2.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_24px_80px_rgba(0,0,0,0.14)]">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="p-6 sm:p-10">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                  Platform Modules
                </p>
                <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                  Built to scale from customer pages to admin controls
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
                  This page uses production-safe placeholder content now. Later,
                  client-provided content, real metrics, backend APIs, CMS,
                  payments, and organizer controls can be connected.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {modules.map((module) => (
                    <div
                      key={module}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4"
                    >
                      <BadgeCheck
                        size={18}
                        className="text-[var(--color-brand-primary)]"
                      />
                      <span className="text-sm font-black">{module}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[420px]">
                <img
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80"
                  alt="Team planning platform"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-white/20 bg-white/10 p-5 text-white backdrop-blur-xl">
                  <p className="text-sm font-bold text-white/70">
                    Integration-ready
                  </p>
                  <p className="mt-1 text-3xl font-black">
                    Frontend foundation for growth
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--app-subtle)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-10 text-center">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                Experience Focus
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                Built for real event journeys
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {experienceStatements.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                >
                  <div className="mb-4 flex gap-1 text-[var(--color-brand-accent)]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <h3 className="font-black">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PlatformRatingSummary />

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] overflow-hidden rounded-[2.5rem] border border-[var(--app-border)] bg-[var(--app-foreground)] text-[var(--app-background)] shadow-[0_20px_80px_rgba(0,0,0,0.18)]">
            <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                  Ready to create memorable experiences?
                </p>
                <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                  Start exploring or connect with Buizz today
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 opacity-75">
                  Buizz is designed to grow with organizers, communities, and
                  experiences. The platform can support evolving requirements and
                  future integrations.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/events"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-bold text-white"
                >
                  Explore Events <ArrowRight size={17} />
                </Link>
                <Link
                  href="/contact-us"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-bold text-white"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

