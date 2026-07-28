import { Footer } from "@/components/common/Footer";
import {
  ArrowRight,
  CalendarCheck,
  HelpCircle,
  KeyRound,
  MailCheck,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

const heroImage =
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1900&q=80";

const featuredImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80";

const quickLinks = [
  { label: "Booking", href: "#booking", icon: Ticket },
  { label: "OTP", href: "#otp", icon: KeyRound },
  { label: "Tickets", href: "#tickets", icon: QrCode },
  { label: "Entry", href: "#entry", icon: CalendarCheck },
  { label: "Organizer", href: "#organizer", icon: Users },
  { label: "Account", href: "#account", icon: UserRoundCheck },
];

const heroStats = [
  { label: "FAQ type", value: "Support guide", icon: HelpCircle },
  { label: "For everyone", value: "Users + organizers", icon: Users },
  { label: "Content", value: "Customizable", icon: ShieldCheck },
];

const faqGroups = [
  {
    id: "booking",
    title: "Booking Questions",
    icon: Ticket,
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
    faqs: [
      {
        question: "How do users book tickets on Buizz?",
        answer:
          "Users can browse events, select ticket type, choose available date or time, enter required details, review the booking, and complete the booking flow.",
      },
      {
        question: "Can users book multiple tickets?",
        answer:
          "Yes, the booking flow can support single or multiple ticket selection depending on event rules and ticket limits.",
      },
      {
        question: "Can ticket prices change?",
        answer:
          "Ticket prices may depend on organizer settings, ticket category, discounts, availability, and final backend configuration.",
      },
    ],
  },
  {
    id: "otp",
    title: "OTP & Login Questions",
    icon: KeyRound,
    image:
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
    faqs: [
      {
        question: "What should users do if OTP is not received?",
        answer:
          "Users should check their phone number or email, wait for a short time, and try again. Final OTP handling will depend on backend authentication integration.",
      },
      {
        question: "Can login work with email and phone?",
        answer:
          "Yes, Buizz can support email, phone, OTP, and role-based login depending on final authentication requirements.",
      },
      {
        question: "Is account security supported?",
        answer:
          "The frontend is prepared for secure account workflows, but production security should be handled with backend validation and proper authentication.",
      },
    ],
  },
  {
    id: "tickets",
    title: "Ticket Delivery & QR",
    icon: QrCode,
    image:
      "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1200&q=80",
    faqs: [
      {
        question: "How will users receive tickets?",
        answer:
          "Tickets can be shown on the success page, user ticket section, email, or notification system after backend integration.",
      },
      {
        question: "Does Buizz support QR tickets?",
        answer:
          "Yes, Buizz frontend is prepared for QR-based ticket preview and organizer-side scanning workflows.",
      },
      {
        question: "Can users view old tickets?",
        answer:
          "Yes, customer ticket history can display current and past tickets once connected with backend booking data.",
      },
    ],
  },
  {
    id: "entry",
    title: "Event Entry Questions",
    icon: CalendarCheck,
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    faqs: [
      {
        question: "How does event entry work?",
        answer:
          "Users can show their QR ticket at the venue. Organizers can scan and validate the ticket through the organizer panel.",
      },
      {
        question: "What if the ticket QR does not scan?",
        answer:
          "The organizer or support team can verify the booking manually using booking details if backend validation supports it.",
      },
      {
        question: "Can entry rules differ by event?",
        answer:
          "Yes, entry rules may depend on organizer instructions, venue policy, ticket category, and event type.",
      },
    ],
  },
  {
    id: "organizer",
    title: "Organizer Onboarding",
    icon: Users,
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    faqs: [
      {
        question: "Can organizers list events on Buizz?",
        answer:
          "Yes, organizers can use Buizz to create listings, manage bookings, track attendees, and use QR scanning workflows.",
      },
      {
        question: "Can organizers manage attendees?",
        answer:
          "Yes, the organizer dashboard can support attendee lists, ticket status, QR validation, and basic analytics.",
      },
      {
        question: "Does Buizz support admin approval?",
        answer:
          "Yes, the frontend structure supports admin approval flows for organizers, events, bookings, and platform operations.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Support",
    icon: UserRoundCheck,
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    faqs: [
      {
        question: "Can users update profile details?",
        answer:
          "Yes, customer profile pages can support editable user details after backend integration.",
      },
      {
        question: "How can users contact support?",
        answer:
          "Users can contact support through the Contact Us page. The form can later connect with email, CRM, or support ticket APIs.",
      },
      {
        question: "Can FAQ content be changed later?",
        answer:
          "Yes, this FAQ page uses production-safe placeholder content that can be customized after client approval.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <main className="relative isolate min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
          <div className="absolute inset-0 -z-10">
            <img
              src={heroImage}
              alt="Buizz FAQ support"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,27,114,0.58),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(102,38,185,0.55),transparent_36%)]" />
          </div>

          <div className="relative mx-auto max-w-[1600px]">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-xl sm:text-sm">
                  Buizz Help Center
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:mt-6 sm:text-6xl lg:text-7xl">
                  Frequently Asked Questions
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:mt-6 sm:text-lg sm:leading-8">
                  Answers for booking, OTP, ticket delivery, event entry,
                  organizer onboarding, and account support questions.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                  <Link
                    href="#faq-content"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-bold text-white shadow-[0_15px_40px_var(--color-glow)] transition hover:-translate-y-1 hover:opacity-90 sm:px-7"
                  >
                    Browse FAQ <ArrowRight size={17} />
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
                  <p className="text-xs font-bold text-white/70">Support</p>
                  <p className="mt-1 text-2xl font-black">Quick answers</p>
                </div>

                <div className="rotate-2 rounded-[2.5rem] border border-white/15 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl transition group-hover:rotate-0">
                  <div className="relative h-[460px] overflow-hidden rounded-[2rem] bg-black">
                    <img
                      src={featuredImage}
                      alt="FAQ support overview"
                      className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                    <div className="absolute bottom-6 left-6 right-6 z-10 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                        FAQ overview
                      </p>
                      <h2 className="mt-3 text-3xl font-black">
                        Find answers faster
                      </h2>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/75">
                        Helpful support content for users, organizers, and
                        platform visitors.
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

        <section id="faq-content" className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-[260px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                  Contents
                </p>

                <div className="mt-4 grid gap-2">
                  {faqGroups.map((group) => (
                    <a
                      key={group.id}
                      href={`#${group.id}`}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-hover)] hover:text-[var(--color-brand-primary)]"
                    >
                      {group.title}
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
                      Search guidance
                    </p>
                    <h2 className="mt-3 text-3xl font-black text-[var(--app-foreground)] sm:text-4xl">
                      Start with common questions
                    </h2>
                    <p className="mt-4 text-base leading-8 text-[var(--app-muted)]">
                      This FAQ page uses production-safe placeholder answers.
                      Final answers can be updated after the client confirms
                      booking, payment, support, and organizer workflows.
                    </p>

                    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 py-3">
                      <Search size={18} className="text-[var(--color-brand-primary)]" />
                      <span className="text-sm font-semibold text-[var(--app-muted)]">
                        Browse sections below to find the right answer.
                      </span>
                    </div>
                  </div>

                  <div className="relative min-h-56">
                    <img
                      src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80"
                      alt="Support guidance"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  </div>
                </div>
              </div>

              {faqGroups.map((group, index) => (
                <section
                  key={group.id}
                  id={group.id}
                  className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                >
                  <div className="grid lg:grid-cols-[0.72fr_1fr]">
                    <div className="relative min-h-56 lg:min-h-full">
                      <img
                        src={group.image}
                        alt={group.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5 text-white">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
                          Group {String(index + 1).padStart(2, "0")}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-white">
                          {group.title}
                        </h2>
                      </div>
                    </div>

                    <div className="space-y-3 p-5 sm:p-6">
                      {group.faqs.map((faq) => (
                        <details
                          key={faq.question}
                          className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 open:border-[var(--color-brand-primary)] open:bg-[var(--app-elevated)]"
                        >
                          <summary className="cursor-pointer list-none text-sm font-black text-[var(--app-foreground)]">
                            {faq.question}
                          </summary>
                          <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
                            {faq.answer}
                          </p>
                        </details>
                      ))}
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
                Still need help?
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                Get support from Buizz
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Contact Support",
                  href: "/contact-us",
                  text: "Send your query to the Buizz support team.",
                },
                {
                  title: "Read Terms",
                  href: "/terms-and-conditions",
                  text: "Understand platform usage and policy rules.",
                },
                {
                  title: "View Refund Policy",
                  href: "/refund-policy",
                  text: "Check refund and cancellation policy guidance.",
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-hover)]"
                >
                  <h3 className="text-lg font-black">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                    {item.text}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[var(--color-brand-primary)]">
                    Open page
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
