"use client";

import { Footer } from "@/components/common/Footer";
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
};

const contactInfo = {
  email: "support@buizz.com",
  partnersEmail: "partners@buizz.com",
  phone: "+91 98765 43210",
  location: "Maharashtra, India",
};

const contactCards = [
  {
    title: "Customer Support",
    description:
      "Get help with bookings, QR tickets, account queries, and event-related support.",
    icon: HelpCircle,
    value: contactInfo.email,
  },
  {
    title: "Organizer Partnership",
    description:
      "Connect with Buizz to list events, manage attendees, and grow your audience.",
    icon: Users,
    value: contactInfo.partnersEmail,
  },
];

const supportOptions = [
  {
    title: "Ticket help",
    text: "Support for booking confirmation, QR tickets, ticket access, and customer queries.",
    icon: Ticket,
  },
  {
    title: "Organizer onboarding",
    text: "Guidance for event listing, dashboard access, attendee management, and QR workflows.",
    icon: Users,
  },
];

const faqs = [
  {
    question: "How can I contact Buizz support?",
    answer:
      "Submit the contact form and the Buizz team can review your query. The form is ready to connect with backend email, CRM, or support ticket APIs later.",
  },
  {
    question: "Can organizers list events on Buizz?",
    answer:
      "Yes. Organizers can contact Buizz for event listing, ticketing setup, QR entry workflows, and dashboard onboarding.",
  },
  {
    question: "Can this form be connected to backend later?",
    answer:
      "Yes. Backend can save inquiries, send emails, create support tickets, and notify the right team based on the selected topic.",
  },
];

export default function ContactUsPage() {
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    topic: "Customer Support",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [notice, setNotice] = useState("");

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.firstName.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus("error");
      setNotice("Please fill first name, email, and message.");
      return;
    }

    setStatus("loading");
    setNotice("");

    await new Promise((resolve) => setTimeout(resolve, 700));

    setStatus("success");
    setNotice("Message submitted successfully. Our team will contact you soon.");

    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      topic: "Customer Support",
      message: "",
    });
  }

  return (
    <>
      <main className="relative isolate min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
        <div className="absolute inset-0 -z-20">
          <img
            src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1900&q=80"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[var(--app-background)]/92" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--color-glow),transparent_34%),radial-gradient(circle_at_bottom_right,rgb(102_38_185_/_0.18),transparent_36%)]" />
        </div>

        <section
          id="contact-hero"
          className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
        >
          <div className="absolute inset-0 -z-10">
            <img
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1900&q=80"
              alt="Buizz event support"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,27,114,0.58),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(102,38,185,0.55),transparent_36%)]" />
          </div>

          <div className="relative mx-auto max-w-[1600px]">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl">
                  {/* <Sparkles size={16} /> */}
                  Contact Buizz
                </div>

                <h1 className="mt-6 text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
                  Let’s build better event experiences
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                  Reach Buizz for customer support, organizer onboarding, ticket
                  queries, event listing support, and platform partnership
                  discussions.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="#contact-form"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-7 py-3 text-sm font-bold text-white shadow-[0_15px_40px_var(--color-glow)] transition hover:-translate-y-1 hover:opacity-90"
                  >
                    Send Message <ArrowRight size={17} />
                  </Link>

                  <Link
                    href="#faqs"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/20"
                  >
                    View FAQs
                  </Link>
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="absolute -left-6 top-8 z-10 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-bold text-white/70">Support</p>
                  <p className="mt-1 text-2xl font-black">Customer-ready</p>
                </div>

                <div className="absolute -right-3 bottom-12 z-10 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-bold text-white/70">Organizers</p>
                  <p className="mt-1 text-2xl font-black">Onboarding</p>
                </div>

                <div className="rotate-2 rounded-[2.5rem] border border-white/15 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                  <div className="overflow-hidden rounded-[2rem] bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80"
                      alt="Buizz support team"
                      className="h-[460px] w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-3">
              <HeroInfo
                icon={<Mail size={18} />}
                label="Support Email"
                value={contactInfo.email}
              />
              <HeroInfo
                icon={<Phone size={18} />}
                label="Support Phone"
                value={contactInfo.phone}
              />
              <HeroInfo
                icon={<MapPin size={18} />}
                label="Location"
                value={contactInfo.location}
              />
            </div>
          </div>
        </section>

        <section id="contact-form" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                Send message
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                Tell us how we can help
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--app-muted)]">
                Use this form for support, organizer onboarding, event listing
                help, ticket questions, or platform-related queries.
              </p>

              <div className="mt-8 grid gap-4">
                {contactCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-subtle)] text-[var(--color-brand-primary)]">
                      <card.icon size={21} />
                    </div>
                    <h3 className="font-black">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                      {card.description}
                    </p>
                    <p className="mt-4 text-sm font-black text-[var(--color-brand-primary)]">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)]/90 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-5">
              <form
                onSubmit={handleSubmit}
                className="rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-card)] p-5 sm:p-7"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-black text-[var(--app-foreground)]">
                    How can we help today?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                    Share your query and our team will use this information to
                    guide the next step.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="First Name"
                    value={form.firstName}
                    onChange={(value) => updateField("firstName", value)}
                    placeholder="Enter first name"
                  />
                  <Field
                    label="Last Name"
                    value={form.lastName}
                    onChange={(value) => updateField("lastName", value)}
                    placeholder="Enter last name"
                  />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) => updateField("email", value)}
                    placeholder="Enter email address"
                  />
                  <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(value) => updateField("phone", value)}
                    placeholder="Enter phone number"
                  />
                </div>

                <label className="mt-4 block">
                  <span className="text-sm font-bold text-[var(--app-foreground)]">
                    Topic
                  </span>
                  <select
                    value={form.topic}
                    onChange={(event) => updateField("topic", event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 text-sm text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)]"
                  >
                    <option>Customer Support</option>
                    <option>Organizer Partnership</option>
                    <option>Ticket Issue</option>
                    <option>Event Listing</option>
                    <option>Platform Question</option>
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-bold text-[var(--app-foreground)]">
                    Message
                  </span>
                  <textarea
                    value={form.message}
                    onChange={(event) =>
                      updateField("message", event.target.value)
                    }
                    placeholder="Write your message..."
                    rows={6}
                    className="mt-2 w-full resize-none rounded-2xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 py-3 text-sm text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
                  />
                </label>

                {notice ? (
                  <div
                    className={`mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${status === "success"
                        ? "border-green-500/30 bg-green-500/10 text-green-500"
                        : "border-red-500/30 bg-red-500/10 text-red-500"
                      }`}
                  >
                    <CheckCircle2 size={16} />
                    {notice}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-black text-white shadow-[0_12px_35px_var(--color-glow)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {status === "loading" ? "Sending..." : "Send Message"}
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="bg-[var(--app-subtle)]/80 px-4 py-16 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1600px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                Support options
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                Built for customers and organizers
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--app-muted)]">
                Buizz provides dedicated support paths for customers and
                organizers to keep booking, ticketing, and event management
                experiences smooth.
              </p>

              <div className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
                <img
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
                  alt="Support workflow"
                  className="h-72 w-full rounded-[1.5rem] object-cover"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {supportOptions.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-hover)]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-subtle)] text-[var(--color-brand-primary)]">
                    <item.icon size={22} />
                  </div>
                  <h3 className="text-lg font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faqs" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
            <div className="mb-10 text-center">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                FAQs
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                Frequently asked questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] open:border-[var(--color-brand-primary)]"
                >
                  <summary className="cursor-pointer list-none text-base font-black text-[var(--app-foreground)]">
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

        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] overflow-hidden rounded-[2.5rem] border border-[var(--app-border)] bg-[var(--app-foreground)] text-[var(--app-background)] shadow-[0_20px_80px_rgba(0,0,0,0.18)]">
            <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                  Need help with Buizz?
                </p>
                <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                  Send us your query and we will guide the next step
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/events"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-bold text-white"
                >
                  Explore Events <ArrowRight size={17} />
                </Link>
                <Link
                  href="#contact-hero"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-bold text-white"
                >
                  Back to Top
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

function HeroInfo({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
        {icon}
      </div>
      <p className="text-sm text-white/65">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[var(--app-foreground)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 text-sm text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)]"
      />
    </label>
  );
}
