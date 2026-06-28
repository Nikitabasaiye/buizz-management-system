"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store/app.store";

const socialLinks = [
  { label: "Instagram", icon: "instagram" },
  { label: "Facebook", icon: "facebook" },
  { label: "LinkedIn", icon: "linkedin" },
  { label: "Twitter", icon: "twitter" },
  { label: "YouTube", icon: "youtube" },
] as const;

type SocialIconName = (typeof socialLinks)[number]["icon"];

export function SharedFooter() {
  const selectedCity = useAppStore((state) => state.selectedCity);
  const theme = useAppStore((state) => state.theme);
  const logoSrc = theme === "light" ? "/images/logo-light.png" : "/images/logo-dark.png";
  const discoverLinks = [`Events in ${selectedCity}`, "Events", "Plays", "Activities", "All Cities"];

  return (
    <footer className="mt-8 border-t border-[var(--app-border)] bg-[var(--app-elevated)] px-4 py-8 text-[var(--app-foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto md:hidden">
        <div>
          <img src={logoSrc} alt="Buizz" className="h-16 w-36 object-contain" />
          <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-[var(--app-muted)]">Discover, book and explore the best events in {selectedCity}.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[var(--app-muted)]">
            {socialLinks.map(({ label, icon }) => (
              <Link
                key={label}
                href="/"
                aria-label={label}
                title={label}
                className="grid size-9 place-items-center rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] transition hover:border-[#e50914]/50 hover:bg-[#e50914] hover:text-white"
              >
                <SocialIcon name={icon} />
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8 border-t border-[var(--app-border)] pt-5 text-sm font-semibold text-[var(--app-muted)]">
          <p>Copyright 2026 Buizz. All rights reserved.</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/terms">Refund</Link>
          </div>
        </div>
      </div>
      <div className="hidden md:block">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-7 lg:grid-cols-[1.3fr_repeat(4,1fr)_1.4fr]">
          <div>
            <img src={logoSrc} alt="Buizz" className="h-16 w-36 object-contain" />
            <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-[var(--app-muted)]">Discover, book and explore the best events in {selectedCity}.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[var(--app-muted)]">
              {socialLinks.map(({ label, icon }) => (
                <Link
                  key={label}
                  href="/"
                  aria-label={label}
                  title={label}
                  className="grid size-9 place-items-center rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] transition hover:border-[#e50914]/50 hover:bg-[#e50914] hover:text-white"
                >
                  <SocialIcon name={icon} />
                </Link>
              ))}
            </div>
          </div>
          <FooterColumn title="Company" links={["About Us", "Careers", "Blog", "Press", "Contact Us"]} />
          <FooterColumn title="Discover" links={discoverLinks} />
          <FooterColumn title="Categories" links={["Music", "Comedy", "Workshops", "Festivals"]} />
          <FooterColumn title="Support" links={["Help Center", "Terms & Conditions", "Privacy Policy", "Refund Policy", "FAQ"]} />
          <div>
            <p className="text-sm font-black text-[var(--app-foreground)]">Newsletter</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--app-muted)]">Subscribe to get updates on exciting events.</p>
            <div className="mt-4 flex overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-subtle)]">
              <input placeholder="Enter your email" className="min-h-11 w-full bg-transparent px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)]" />
              <button className="grid w-12 place-items-center bg-[#e50914] text-white transition hover:bg-[#f6c453] hover:text-[#090a12]" aria-label="Subscribe">
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-[1500px] flex-col gap-3 border-t border-[var(--app-border)] pt-5 text-sm font-semibold text-[var(--app-muted)] lg:flex-row lg:items-center lg:justify-between">
          <p>Copyright 2026 Buizz. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/terms">Refund</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Footer() {
  return <SharedFooter />;
}

function SocialIcon({ name }: { name: SocialIconName }) {
  if (name === "instagram") {
    return (
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "facebook") {
    return (
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M14 8h2V5h-2c-2.4 0-4 1.7-4 4.1V11H8v3h2v7h3v-7h2.4l.6-3h-3V9.2c0-.7.4-1.2 1-1.2Z" />
      </svg>
    );
  }

  if (name === "linkedin") {
    return (
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M5 9h4v12H5V9Zm2-6.5A2.3 2.3 0 1 1 7 7a2.3 2.3 0 0 1 0-4.5ZM11 9h3.7v1.7h.1c.5-.9 1.8-1.9 3.6-1.9 3.9 0 4.6 2.5 4.6 5.8V21h-4v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21H11V9Z" />
      </svg>
    );
  }

  if (name === "twitter") {
    return (
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="m5 5 14 14M19 5 5 19" />
      </svg>
    );
  }

  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.5 12 5.5 12 5.5s-5 0-6.9.6A3 3 0 0 0 3 8.2 31 31 0 0 0 2.5 12a31 31 0 0 0 .5 3.8 3 3 0 0 0 2.1 2.1c1.9.6 6.9.6 6.9.6s5 0 6.9-.6a3 3 0 0 0 2.1-2.1c.4-1.4.5-3.8.5-3.8s0-2.4-.5-3.8ZM10 15.3V8.7l5.7 3.3-5.7 3.3Z" />
    </svg>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <p className="text-sm font-black text-[var(--app-foreground)]">{title}</p>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <Link key={link} href="/events" className="text-sm font-semibold text-[var(--app-muted)] transition hover:text-[#e50914]">
            {link}
          </Link>
        ))}
      </div>
    </div>
  );
}
