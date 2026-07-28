import { Footer } from "@/components/common/Footer";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  LockKeyhole,
  Megaphone,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

const termsHeroImage =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1900&q=80";

const featuredPolicyImage =
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=80";

const quickLinks = [
  { label: "Acceptance", href: "#acceptance", icon: BadgeCheck },
  { label: "Accounts", href: "#accounts", icon: UserRoundCheck },
  { label: "Payments", href: "#payments", icon: CreditCard },
  { label: "Refunds", href: "#refunds", icon: RefreshCcw },
  { label: "Organizers", href: "#organizers", icon: Users },
  { label: "Privacy", href: "#privacy", icon: ShieldCheck },
  { label: "Usage", href: "#usage", icon: LockKeyhole },
  { label: "Law", href: "#law", icon: Scale },
];

const heroStats = [
  {
    label: "Policy type",
    value: "Platform terms",
    icon: FileText,
  },
  {
    label: "For everyone",
    value: "Users + organizers",
    icon: Users,
  },
  {
    label: "Content",
    value: "Customizable",
    icon: Clock,
  },
];

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    icon: BadgeCheck,
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
    points: [
      "By using Buizz, users agree to follow the platform guidelines and policies.",
      "These terms apply to customers, organizers, and visitors using the platform.",
      "Final legal wording can be updated once client-approved policy content is provided.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts & Security",
    icon: UserRoundCheck,
    image:
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Users should provide accurate account information.",
      "Users are responsible for keeping login credentials secure.",
      "Unauthorized account access or misuse may lead to restriction.",
    ],
  },
  {
    id: "payments",
    title: "Booking & Payments",
    icon: CreditCard,
    image:
      "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Ticket prices and availability may be managed by organizers.",
      "Successful payment or booking confirmation completes the booking flow.",
      "Taxes, platform fees, or payment gateway charges can be added based on final client rules.",
    ],
  },
  {
    id: "refunds",
    title: "Cancellation & Refunds",
    icon: RefreshCcw,
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Refund eligibility may depend on organizer policies and event type.",
      "Cancellation rules can vary by event, ticket category, and booking status.",
      "Final refund timelines should be added after client confirmation.",
    ],
  },
  {
    id: "organizers",
    title: "Organizer Responsibilities",
    icon: Users,
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Organizers are responsible for event details, pricing, venue, and schedule accuracy.",
      "Organizers should update customers if the event changes or gets cancelled.",
      "Organizer dashboards can help manage attendees, QR validation, and reports.",
    ],
  },
  {
    id: "communication",
    title: "Communication Preferences",
    icon: Megaphone,
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Users may receive booking confirmations and event reminders.",
      "Users may receive platform updates, support messages, and promotional content.",
      "Communication preferences can be customized later based on final product rules.",
    ],
  },
  {
    id: "usage",
    title: "Platform Usage",
    icon: LockKeyhole,
    image:
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Users must not create false accounts or misuse platform features.",
      "Unauthorized tools, bots, fraud, or ticket misuse are not allowed.",
      "Users should follow applicable laws and platform policies.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy & Data Protection",
    icon: ShieldCheck,
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Personal information should be handled according to the Privacy Policy.",
      "Data usage rules can be updated once the client provides final privacy terms.",
      "Users should review the Privacy Policy to understand data handling practices.",
    ],
  },
  {
    id: "property",
    title: "Intellectual Property",
    icon: BookOpen,
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Buizz branding, design, content, and platform elements should not be copied.",
      "Unauthorized use of logos, UI, or platform assets may be restricted.",
      "Organizer-uploaded content remains subject to final platform content policies.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    icon: FileText,
    image:
      "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Buizz may restrict or suspend access for misuse or policy violations.",
      "False information, fraud, or harmful activity may result in account action.",
      "Final suspension and appeal process can be defined after client approval.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    icon: Ticket,
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Buizz acts as a technology platform connecting customers and organizers.",
      "Event-specific responsibility may remain with organizers, venues, or service providers.",
      "Final liability terms should be reviewed and approved by the client/legal team.",
    ],
  },
  {
    id: "law",
    title: "Governing Law",
    icon: Scale,
    image:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Platform operations are subject to applicable laws and regulations.",
      "Jurisdiction details can be updated after confirmation from the client.",
      "Users are expected to comply with local laws while using Buizz.",
    ],
  },
];

const relatedPages = [
  { title: "Privacy Policy", href: "/privacy-policy" },
  { title: "Refund Policy", href: "/refund-policy" },
  { title: "About Us", href: "/about" },
  { title: "Contact Us", href: "/contact" },
];

export default function TermsAndConditionsPage() {
  return (
    <>
      <main className="relative isolate min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
          <div className="absolute inset-0 -z-10">
            <img
              src={termsHeroImage}
              alt="Buizz terms and conditions"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,27,114,0.58),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(102,38,185,0.55),transparent_36%)]" />
          </div>

          <div className="relative mx-auto max-w-[1600px]">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-xl sm:text-sm">
                  {/* <Sparkles size={15} /> */}
                  Buizz Policies
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:mt-6 sm:text-6xl lg:text-7xl">
                  Terms & Conditions
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:mt-6 sm:text-lg sm:leading-8">
                  Guidelines and policies that govern the use of the Buizz
                  platform for customers, organizers, and visitors.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                  <Link
                    href="#terms-content"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-bold text-white shadow-[0_15px_40px_var(--color-glow)] transition hover:-translate-y-1 hover:opacity-90 sm:px-7"
                  >
                    Read Terms <ArrowRight size={17} />
                  </Link>

                  <Link
                    href="/contact-us"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/20 sm:px-7"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>

              <div className="group relative hidden lg:block">
                <div className="absolute -left-6 top-8 z-10 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-bold text-white/70">
                    Policy content
                  </p>
                  <p className="mt-1 text-2xl font-black">Customizable</p>
                </div>

                <div className="rotate-2 rounded-[2.5rem] border border-white/15 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl transition group-hover:rotate-0">
                  <div className="relative h-[460px] overflow-hidden rounded-[2rem] bg-black">
                    <img
                      src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=80"
                      alt="Policy documents"
                      className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                    <div className="absolute bottom-6 left-6 right-6 z-10 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                        Policy overview
                      </p>

                      <h2 className="mt-3 text-3xl font-black">
                        Platform rules made clear
                      </h2>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/75">
                        Production-safe terms that can be customized after client approval.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-2 sm:mt-14 sm:gap-4">
              {heroStats.map((item) => (
                <HeroStat
                  key={item.label}
                  icon={<item.icon size={18} />}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)]/90 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:rounded-[2rem] sm:p-4">
              <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-1.5 sm:gap-2">
                  {quickLinks.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1.5 text-[11px] font-bold text-[var(--app-muted)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-hover)] hover:text-[var(--color-brand-primary)] sm:px-4 sm:py-2 sm:text-sm"
                    >
                      <item.icon size={14} />
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="terms-content" className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-[260px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                  Contents
                </p>

                <div className="mt-4 grid gap-2">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-hover)] hover:text-[var(--color-brand-primary)]"
                    >
                      {section.title}
                    </a>
                  ))}
                </div>
              </div>
            </aside>

            <div className="space-y-6">
              <div className="overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_15px_60px_rgba(0,0,0,0.12)]">
                <div className="grid lg:grid-cols-[1fr_0.7fr]">
                  <div className="p-6 sm:p-8">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                      Important note
                    </p>
                    <h2 className="mt-3 text-3xl font-black text-[var(--app-foreground)] sm:text-4xl">
                      Customizable policy content
                    </h2>
                    <p className="mt-4 text-base leading-8 text-[var(--app-muted)]">
                      This page uses production-safe placeholder terms. Final
                      legal content, company details, jurisdiction, refund rules,
                      and official contact information can be updated after
                      client approval.
                    </p>
                  </div>

                  <div className="relative min-h-56">
                    <img
                      src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80"
                      alt="Legal document"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  </div>
                </div>
              </div>

              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-[var(--color-brand-primary)]"
                >
                  <div className="grid lg:grid-cols-[0.72fr_1fr]">
                    <div className="relative min-h-56 lg:min-h-full">
                      <img
                        src={section.image}
                        alt={section.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5 text-white">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
                          Section {String(index + 1).padStart(2, "0")}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-white">
                          {section.title}
                        </h2>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-subtle)] text-[var(--color-brand-primary)]">
                        <section.icon size={22} />
                      </div>

                      <ul className="space-y-4">
                        {section.points.map((point) => (
                          <li key={point} className="flex gap-3">
                            <CheckCircle2 className="mt-1 size-5 shrink-0 text-[var(--color-brand-primary)]" />
                            <span className="text-sm leading-7 text-[var(--app-muted)] sm:text-base">
                              {point}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--app-subtle)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-10 text-center">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                Related pages
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                Other useful policies
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedPages.map((page) => (
                <Link
                  key={page.title}
                  href={page.href}
                  className="group rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-hover)]"
                >
                  <h3 className="text-lg font-black">{page.title}</h3>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[var(--color-brand-primary)]">
                    View page
                    <ArrowRight
                      size={15}
                      className="transition group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] overflow-hidden rounded-[2.5rem] border border-[var(--app-border)] bg-black text-white shadow-[0_20px_80px_rgba(0,0,0,0.18)]">
            <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                  Need help?
                </p>
                <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                  Questions about Buizz policies?
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                  Our team can help with platform-related questions, organizer
                  onboarding, booking support, and policy clarification.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/contact-us"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-bold text-white"
                >
                  Contact Support <ArrowRight size={17} />
                </Link>
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-bold text-white"
                >
                  Read Blog
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="relative z-10 bg-[var(--app-background)]">
        <Footer />
      </section>
    </>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 sm:mb-4 sm:h-11 sm:w-11 sm:rounded-2xl">
        {icon}
      </div>

      <p className="text-[10px] font-semibold text-white/65 sm:text-sm">
        {label}
      </p>

      <p className="mt-1 text-xs font-black text-white sm:text-base">
        {value}
      </p>
    </div>
  );
}
