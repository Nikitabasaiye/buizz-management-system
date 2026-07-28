import { Footer } from "@/components/common/Footer";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  FileText,
  HelpCircle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

const heroImage =
  "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1900&q=80";

const featuredImage =
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80";

const quickLinks = [
  { label: "Eligibility", href: "#eligibility", icon: BadgeCheck },
  { label: "Cancellation", href: "#cancellation", icon: RefreshCcw },
  { label: "Payments", href: "#payments", icon: CreditCard },
  { label: "Organizer Rules", href: "#organizer-rules", icon: Users },
  { label: "Processing", href: "#processing", icon: CalendarClock },
  { label: "Support", href: "#support", icon: HelpCircle },
];

const heroStats = [
  { label: "Policy type", value: "Refund rules", icon: RefreshCcw },
  { label: "For everyone", value: "Users + organizers", icon: Users },
  { label: "Content", value: "Customizable", icon: FileText },
];

const sections = [
  {
    id: "eligibility",
    title: "Refund Eligibility",
    icon: BadgeCheck,
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Refund eligibility may depend on the event type, organizer policy, ticket category, and booking status.",
      "Some events may have limited or no refund availability depending on organizer-defined rules.",
      "Final refund eligibility wording can be updated after client approval.",
    ],
  },
  {
    id: "cancellation",
    title: "Cancellation Guidelines",
    icon: RefreshCcw,
    image:
      "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Cancellation windows may vary for different events, plays, activities, or organizer listings.",
      "Users should review event-specific cancellation terms before completing a booking.",
      "Cancellation rules can be customized once final business requirements are confirmed.",
    ],
  },
  {
    id: "payments",
    title: "Payment Reversal",
    icon: CreditCard,
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Refunds, when applicable, may be processed back to the original payment method.",
      "Payment gateway timelines and bank processing times may affect refund completion.",
      "Final payment and refund flow should be confirmed with the selected payment provider.",
    ],
  },
  {
    id: "organizer-rules",
    title: "Organizer-Specific Policies",
    icon: Users,
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Organizers may define event-specific refund and cancellation rules.",
      "Buizz can display organizer policies clearly during the booking journey.",
      "Event changes, postponements, or cancellations may follow organizer-approved handling.",
    ],
  },
  {
    id: "processing",
    title: "Refund Processing",
    icon: CalendarClock,
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Refund processing timelines may depend on payment gateway, bank, and organizer approval workflows.",
      "Customers may receive updates through email, dashboard notifications, or booking status changes.",
      "Exact timelines should be added only after backend and payment integration are finalized.",
    ],
  },
  {
    id: "support",
    title: "Refund Support",
    icon: HelpCircle,
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    points: [
      "Users can contact support for refund-related questions, booking issues, or organizer clarification.",
      "Support teams may require booking details to review refund requests.",
      "Final escalation process can be updated after client support workflow approval.",
    ],
  },
];

const relatedPages = [
  { title: "Terms & Conditions", href: "/terms-and-conditions" },
  { title: "Privacy Policy", href: "/privacy-policy" },
  { title: "About Us", href: "/about" },
  { title: "Contact Us", href: "/contact" },
];

export default function RefundPolicyPage() {
  return (
    <>
      <main className="relative isolate min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
          <div className="absolute inset-0 -z-10">
            <img
              src={heroImage}
              alt="Buizz refund policy"
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
                  Buizz Refunds
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:mt-6 sm:text-6xl lg:text-7xl">
                  Refund Policy
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:mt-6 sm:text-lg sm:leading-8">
                  Review cancellation windows, refund eligibility, payment
                  reversal rules, and organizer-specific refund policies.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                  <Link
                    href="#refund-content"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-bold text-white shadow-[0_15px_40px_var(--color-glow)] transition hover:-translate-y-1 hover:opacity-90 sm:px-7"
                  >
                    Read Policy <ArrowRight size={17} />
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/20 sm:px-7"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>

              <div className="group relative hidden lg:block">
                <div className="absolute -left-6 top-8 z-10 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-bold text-white/70">
                    Refund overview
                  </p>
                  <p className="mt-1 text-2xl font-black">Clear rules</p>
                </div>

                <div className="rotate-2 rounded-[2.5rem] border border-white/15 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl transition group-hover:rotate-0">
                  <div className="relative h-[460px] overflow-hidden rounded-[2rem] bg-black">
                    <img
                      src={featuredImage}
                      alt="Refund policy overview"
                      className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                    <div className="absolute bottom-6 left-6 right-6 z-10 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                        Refund overview
                      </p>
                      <h2 className="mt-3 text-3xl font-black">
                        Flexible event refund rules
                      </h2>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/75">
                        Production-safe refund content that can be customized
                        after client approval.
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

        <section id="refund-content" className="px-4 pb-16 sm:px-6 lg:px-8">
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
                      Customizable refund content
                    </h2>
                    <p className="mt-4 text-base leading-8 text-[var(--app-muted)]">
                      This page uses production-safe placeholder refund policy
                      content. Final cancellation windows, refund timelines,
                      payment rules, and organizer-specific conditions can be
                      updated after client approval.
                    </p>
                  </div>

                  <div className="relative min-h-56">
                    <img
                      src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80"
                      alt="Refund document"
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
                            <TicketCheck className="mt-1 size-5 shrink-0 text-[var(--color-brand-primary)]" />
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
                  Questions about refunds and cancellations?
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                  Our team can help with refund-related questions, booking
                  support, organizer clarification, and cancellation policy
                  details.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-bold text-white"
                >
                  Contact Support <ArrowRight size={17} />
                </Link>
                <Link
                  href="/terms-and-conditions"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-bold text-white"
                >
                  Read Terms
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
