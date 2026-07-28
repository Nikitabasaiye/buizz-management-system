"use client";

import Link from "next/link";
import {
  Award,
  Heart,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Ticket,
  UserCircle,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { LocationSelector } from "@/components/common/LocationPicker";
import { useAppStore } from "@/store/app.store";
import { useAuthStore } from "@/store/auth.store";

const pageLinks = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/plays", label: "Plays" },
  { href: "/activities", label: "Activities" },
] as const;

const profileLinks = [
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/profile/tickets", label: "My Tickets", icon: Ticket },
  { href: "/profile/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile/passport", label: "Stickers", icon: Award },
  { href: "/profile/settings", label: "Settings", icon: Settings },
] as const;

const brandBtn =
  "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white shadow-[0_14px_30px_rgba(102,38,185,0.25)] hover:shadow-[0_18px_38px_rgba(102,38,185,0.32)]";

const lightSoftBtn =
  "border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--color-brand-primary)] hover:bg-white hover:text-[var(--color-brand-primary)] hover:border-[var(--color-brand-primary)]/40";

const darkSoftBtn =
  "border border-[var(--app-border)] bg-[var(--app-subtle)] text-[#F6B7DD] hover:bg-[var(--app-hover)] hover:text-white hover:border-[var(--color-brand-secondary)]/40";

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname() ?? "/";

  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const isAuthenticated = useAuthStore(
    (state) => state.status === "authenticated",
  );

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const isDark = resolvedTheme === "dark";
  const softBtn = isDark ? darkSoftBtn : lightSoftBtn;

  const isActiveLink = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const searchAction =
    pageLinks.find((link) => link.href !== "/" && isActiveLink(link.href))
      ?.href ?? "/events";

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeFloatingMenus = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", closeFloatingMenus);
    return () => document.removeEventListener("mousedown", closeFloatingMenus);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const syncResolvedTheme = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;

      setResolvedTheme(resolved);
    };

    syncResolvedTheme();
    media.addEventListener("change", syncResolvedTheme);

    return () => media.removeEventListener("change", syncResolvedTheme);
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 w-full border-b shadow-sm backdrop-blur-2xl transition-colors duration-300 ${isDark
          ? "border-[var(--app-border)] bg-[var(--app-card)]/95 text-white"
          : "border-[var(--app-border)] bg-[#F8F7FC]/95 text-[var(--app-foreground)]"
        }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-[1920px] items-center gap-1.5 px-3 min-[360px]:gap-2 sm:h-[70px] sm:px-5 xl:h-[82px] xl:gap-4 xl:px-8 2xl:px-12">
        <Link
          href="/"
          className="flex h-10 w-28 shrink-0 items-center min-[360px]:w-32 sm:h-12 sm:w-40 xl:h-16 xl:w-52 2xl:w-56"
          aria-label="Go to Buizz home"
        >
          <BuizzLogo
            variant={isDark ? "dark" : "light"}
            size="xl"
            className="w-full"
          />
        </Link>

        <div className="hidden shrink-0 2xl:block">
          <LocationSelector />
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          {pageLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex h-10 items-center rounded-full px-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.96] 2xl:px-4 ${isActiveLink(link.href)
                  ? brandBtn
                  : isDark
                    ? "text-white/70 hover:bg-[var(--app-subtle)] hover:text-white"
                    : "text-[var(--app-muted)] hover:bg-white hover:text-[var(--color-brand-primary)]"
                }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <form
          action={searchAction}
          className={`hidden h-11 overflow-hidden rounded-full border xl:grid xl:w-[230px] xl:grid-cols-[minmax(0,1fr)_auto] 2xl:w-[360px] ${isDark
              ? "border-[var(--app-border)] bg-[var(--app-subtle)]"
              : "border-[var(--app-border)] bg-[var(--app-subtle)]"
            }`}
        >
          <label className="flex min-w-0 items-center gap-2 px-4">
            <Search className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
            <input
              name="q"
              type="search"
              placeholder="Search events"
              className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${isDark
                  ? "text-white placeholder:text-white/70"
                  : "text-[var(--app-foreground)] placeholder:text-[var(--app-muted)]"
                }`}
            />
          </label>

          <button
            type="submit"
            className={`px-4 text-xs font-black transition-all duration-300 active:scale-[0.96] ${brandBtn}`}
          >
            Search
          </button>
        </form>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <Link
            href="/profile/wishlist"
            className={`grid size-10 place-items-center rounded-full transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.96] ${softBtn}`}
            aria-label="Open wishlist"
          >
            <Heart className="size-4" />
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-3 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.96] ${softBtn}`}
            aria-label="Toggle theme"
          >
            <span className="relative grid size-4 place-items-center">
              <Sun
                className={`absolute size-4 transition duration-300 ${isDark ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                  }`}
              />
              <Moon
                className={`absolute size-4 transition duration-300 ${isDark ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
                  }`}
              />
            </span>
            <span className="text-xs font-black">
              {isDark ? "Dark" : "Light"}
            </span>
          </button>

          <div className="relative">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.96] ${brandBtn}`}
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                <UserCircle className="size-5" />
                Profile
              </button>
            ) : (
              <Link
                href="/login"
                className={`rounded-full px-5 py-2.5 text-sm font-black transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.96] ${brandBtn}`}
              >
                Sign In
              </Link>
            )}

            {profileOpen && isAuthenticated ? (
              <div
                className={`absolute right-0 top-12 w-64 rounded-3xl border p-2 shadow-2xl ${isDark
                    ? "border-[var(--app-border)] bg-[var(--app-card)] text-white"
                    : "border-[var(--app-border)] bg-white text-[var(--app-foreground)]"
                  }`}
              >
                {profileLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setProfileOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.96] ${isDark
                        ? "text-white/70 hover:bg-[var(--app-subtle)] hover:text-white"
                        : "text-[var(--app-muted)] hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)]"
                      }`}
                  >
                    <Icon className="size-4 text-[var(--color-brand-primary)]" />
                    {label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 min-[360px]:gap-2 xl:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className={`grid size-9 shrink-0 place-items-center rounded-full transition-all duration-300 active:scale-[0.96] min-[360px]:size-10 ${softBtn}`}
            aria-label="Open search"
            aria-expanded={searchOpen}
          >
            <Search className="size-4" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={`grid size-9 shrink-0 place-items-center rounded-full transition-all duration-300 active:scale-[0.96] min-[360px]:size-10 ${softBtn}`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`grid size-9 shrink-0 place-items-center rounded-full transition-all duration-300 active:scale-[0.96] min-[360px]:size-10 ${brandBtn}`}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      {searchOpen ? (
        <form
          action={searchAction}
          className={`grid grid-cols-[minmax(0,1fr)_auto] border-t px-3 py-3 xl:hidden ${isDark
              ? "border-[var(--app-border)] bg-[var(--app-card)]"
              : "border-[var(--app-border)] bg-[#F8F7FC]"
            }`}
        >
          <input
            name="q"
            type="search"
            placeholder="Search events, plays, activities..."
            className={`min-h-12 min-w-0 rounded-l-2xl px-4 text-sm font-bold outline-none ${isDark
                ? "bg-[var(--app-subtle)] text-white placeholder:text-white/70"
                : "bg-white text-[var(--app-foreground)] placeholder:text-[var(--app-muted)]"
              }`}
            autoFocus
          />

          <button
            type="submit"
            className={`rounded-r-2xl px-4 text-xs font-black transition-all duration-300 active:scale-[0.96] sm:px-5 ${brandBtn}`}
          >
            Search
          </button>
        </form>
      ) : null}

      {menuOpen ? (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm xl:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className={`ml-auto flex h-[100dvh] w-[92vw] max-w-[400px] flex-col overflow-y-auto p-4 shadow-2xl sm:w-[78vw] ${isDark
                ? "bg-[var(--app-card)] text-white"
                : "bg-[#F8F7FC] text-[var(--app-foreground)]"
              }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <BuizzLogo
                variant={isDark ? "dark" : "light"}
                size="lg"
                className="w-36 min-[360px]:w-40"
              />

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className={`grid size-10 shrink-0 place-items-center rounded-full transition-all duration-300 active:scale-[0.96] ${softBtn}`}
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-4 overflow-hidden rounded-3xl bg-[var(--app-subtle)] p-3">
              <LocationSelector />
            </div>

            <div className="grid gap-2">
              {pageLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-sm font-black transition-all duration-300 active:scale-[0.96] ${isActiveLink(link.href)
                      ? brandBtn
                      : isDark
                        ? "bg-[var(--app-subtle)] text-white hover:bg-[var(--app-hover)]"
                        : "bg-[var(--app-subtle)] text-[var(--app-foreground)] hover:bg-white hover:text-[var(--color-brand-primary)]"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-5 border-t border-[var(--app-border)] pt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--color-brand-primary)]">
                Account
              </p>

              {isAuthenticated ? (
                <div className="grid gap-2">
                  {profileLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition-all duration-300 active:scale-[0.96] ${isDark
                          ? "bg-[var(--app-subtle)] text-white hover:bg-[var(--app-hover)]"
                          : "bg-[var(--app-subtle)] text-[var(--app-foreground)] hover:bg-white hover:text-[var(--color-brand-primary)]"
                        }`}
                    >
                      <Icon className="size-4 text-[var(--color-brand-primary)]" />
                      {label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className={`flex min-h-12 items-center justify-center rounded-2xl px-4 text-sm font-black transition-all duration-300 active:scale-[0.96] ${brandBtn}`}
                >
                  Sign In
                </Link>
              )}
            </div>

            <div className="mt-auto pt-6">
              <p className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-xs font-bold leading-5 text-[var(--app-muted)]">
                Buizz helps you discover events, plays, activities, and verified
                tickets near you.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
