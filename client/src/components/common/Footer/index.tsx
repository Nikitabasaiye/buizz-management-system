"use client";

import Link from "next/link";
import { ArrowRight, Mail, MapPin, Send } from "lucide-react";
import { FormEvent, useState } from "react";

import { BuizzLogo } from "@/components/brand/BuizzLogo";

type FooterLink = {
  label: string;
  href: string;
};

const menuLinks: FooterLink[] = [
  { label: "About Us", href: "/about-us" },
  { label: "Events", href: "/events" },
  { label: "Plays", href: "/plays" },
  { label: "Activities", href: "/activities" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact-us" },
];

const categoryLinks: FooterLink[] = [
  { label: "Music Events", href: "/events/category/music-events" },
  { label: "Comedy Shows", href: "/events/category/comedy-events" },
  { label: "Workshops", href: "/events/category/workshops" },
  { label: "Festivals", href: "/events/category/festivals" },
  { label: "Business Events", href: "/events/category/business-events" },
  { label: "List Your Event", href: "/organizer/intro" },
];

const supportLinks: FooterLink[] = [
  { label: "Help Center", href: "/help-center" },
  { label: "FAQ", href: "/faq" },
  { label: "Terms", href: "/terms-and-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Refund Policy", href: "/refund-policy" },
];

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
  { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
  { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
  { label: "Twitter", href: "https://x.com", icon: "twitter" },
  { label: "YouTube", href: "https://youtube.com", icon: "youtube" },
] as const;

type SocialIconName = (typeof socialLinks)[number]["icon"];

export function Footer() {
  return <SharedFooter />;
}

export function SharedFooter() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const subscribe = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const email = newsletterEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterMessage("Enter a valid email address.");
      setMessageType("error");
      return;
    }

    try {
      const existing = JSON.parse(
        window.localStorage.getItem("buizz-newsletter-emails") ?? "[]",
      ) as string[];

      const next = Array.from(new Set([...existing, email]));

      window.localStorage.setItem(
        "buizz-newsletter-emails",
        JSON.stringify(next),
      );

      setNewsletterEmail("");
      setNewsletterMessage("Subscribed successfully.");
      setMessageType("success");
    } catch {
      setNewsletterMessage("Something went wrong. Please try again.");
      setMessageType("error");
    }
  };

  return (
    <footer className="relative overflow-hidden bg-[#1d1528] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(236,27,114,0.16),transparent_22rem),radial-gradient(circle_at_88%_0%,rgba(102,38,185,0.18),transparent_24rem)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-brand-primary),var(--color-brand-accent),var(--color-brand-secondary),transparent)]" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-7 lg:grid-cols-[0.95fr_1.35fr_0.95fr] lg:items-start">
          <div>
            <Link href="/" className="inline-flex" aria-label="Go to Buizz home">
              <BuizzLogo
                variant="dark"
                size="xl"
                className="w-32 sm:w-36 lg:w-40"
              />
            </Link>

            <p className="mt-3 max-w-sm text-xs font-semibold leading-5 text-white/62 sm:text-sm sm:leading-6">
              Discover events, plays, activities, workshops and festivals with
              secure Buizz ticketing.
            </p>

            <div className="mt-4 grid gap-2 text-xs font-semibold text-white/64 sm:text-sm">
              <p className="flex items-center gap-2">
                <MapPin className="size-3.5 shrink-0 text-[var(--color-brand-primary)]" />
                Maharashtra, India
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-3.5 shrink-0 text-[var(--color-brand-primary)]" />
                support@buizz.com
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {socialLinks.map(({ label, href, icon }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-8 place-items-center rounded-full border border-white/12 bg-white/[0.055] text-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white"
                >
                  <SocialIcon name={icon} />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:pt-1">
            <FooterColumn title="Menu" links={menuLinks} />
            <FooterColumn title="Categories" links={categoryLinks} />
            <FooterColumn title="Support" links={supportLinks} />
          </div>

          <NewsletterForm
            email={newsletterEmail}
            message={newsletterMessage}
            messageType={messageType}
            onEmail={setNewsletterEmail}
            onSubmit={subscribe}
          />
        </div>

        <div className="relative mt-6 border-t border-white/10 pt-4">
          <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(236,27,114,0.65),rgba(246,196,83,0.45),transparent)]" />

          <div className="flex flex-col gap-3 text-[11px] font-semibold text-white/48 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
            <div>
              <p>Copyright 2026 Buizz. All rights reserved.</p>
              <p className="mt-0.5">Developed by Aventra Innovations.</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="/privacy-policy" className="transition hover:text-white">
                Privacy
              </Link>
              <Link href="/terms-and-conditions" className="transition hover:text-white">
                Terms
              </Link>
              <Link href="/refund-policy" className="transition hover:text-white">
                Refund
              </Link>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-sm font-black text-white">{title}</p>

      <div className="mt-2.5 grid gap-1.5 sm:gap-2">
        {links.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className="text-xs font-semibold text-white/58 transition-colors duration-300 hover:text-white sm:text-sm"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewsletterForm({
  email,
  message,
  messageType,
  onEmail,
  onSubmit,
}: {
  email: string;
  message: string;
  messageType: "success" | "error" | "";
  onEmail: (value: string) => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_14px_42px_rgba(0,0,0,0.14)]">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-brand-accent)]">
        Newsletter
      </p>

      <h3 className="mt-2.5 text-lg font-black leading-tight tracking-[-0.04em] text-white sm:text-xl">
        Get event updates first.
      </h3>

      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-white/60 sm:text-sm">
        Trending events, offers and organizer updates.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-3 overflow-hidden rounded-2xl border border-white/12 bg-white text-[#101828] sm:rounded-full"
      >
        <div className="grid grid-cols-[1fr_auto]">
          <input
            value={email}
            onChange={(event) => onEmail(event.target.value)}
            placeholder="Your email address"
            className="min-h-10 min-w-0 bg-transparent px-4 text-sm font-semibold outline-none placeholder:text-[#667085]"
          />

          <button
            type="submit"
            className="grid w-10 place-items-center bg-[var(--color-brand-primary)] text-white transition hover:brightness-110 active:scale-[0.96]"
            aria-label="Subscribe"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>

      {message ? (
        <p
          className={`mt-2 text-xs font-black ${messageType === "success"
              ? "text-[#22C55E]"
              : "text-[var(--color-brand-accent)]"
            }`}
        >
          {message}
        </p>
      ) : null}

      <Link
        href="/events"
        className="mt-3 inline-flex items-center gap-2 text-xs font-black text-white transition hover:text-[var(--color-brand-accent)] sm:text-sm"
      >
        Explore events
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function SocialIcon({ name }: { name: SocialIconName }) {
  if (name === "instagram") {
    return (
      <svg
        className="size-3.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "facebook") {
    return (
      <svg
        className="size-3.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M14 8h2V5h-2c-2.4 0-4 1.7-4 4.1V11H8v3h2v7h3v-7h2.4l.6-3h-3V9.2c0-.7.4-1.2 1-1.2Z" />
      </svg>
    );
  }

  if (name === "linkedin") {
    return (
      <svg
        className="size-3.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M5 9h4v12H5V9Zm2-6.5A2.3 2.3 0 1 1 7 7a2.3 2.3 0 0 1 0-4.5ZM11 9h3.7v1.7h.1c.5-.9 1.8-1.9 3.6-1.9 3.9 0 4.6 2.5 4.6 5.8V21h-4v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21H11V9Z" />
      </svg>
    );
  }

  if (name === "twitter") {
    return (
      <svg
        className="size-3.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="m5 5 14 14M19 5 5 19" />
      </svg>
    );
  }

  return (
    <svg
      className="size-3.5"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.5 12 5.5 12 5.5s-5 0-6.9.6A3 3 0 0 0 3 8.2 31 31 0 0 0 2.5 12a31 31 0 0 0 .5 3.8 3 3 0 0 0 2.1 2.1c1.9.6 6.9.6 6.9.6s5 0 6.9-.6a3 3 0 0 0 2.1-2.1c.4-1.4.5-3.8.5-3.8s0-2.4-.5-3.8ZM10 15.3V8.7l5.7 3.3-5.7 3.3Z" />
    </svg>
  );
}