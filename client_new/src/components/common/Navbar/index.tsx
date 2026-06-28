"use client";

import Link from "next/link";
import { Award, Heart, Menu, Moon, Search, Settings, Sun, Ticket, UserCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  { href: "/profile/passport", label: "Passport", icon: Award },
  { href: "/profile/settings", label: "Settings", icon: Settings },
] as const;

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const isAuthenticated = useAuthStore((state) => state.status === "authenticated");
  const isLight = theme === "light";
  const logoSrc = isLight ? "/images/logo-light.png" : "/images/logo-dark.png";
  const isActiveLink = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const activeDiscoveryLink = pageLinks.find((link) => link.href !== "/" && isActiveLink(link.href));
  const searchAction = activeDiscoveryLink?.href ?? "/events";

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeFloatingMenus = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", closeFloatingMenus);
    return () => document.removeEventListener("mousedown", closeFloatingMenus);
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-[var(--app-border)] bg-[color:var(--app-elevated)]/95 shadow-sm backdrop-blur-2xl">
      <div>
        <nav className="mx-auto flex h-16 max-w-[1500px] flex-nowrap items-center justify-between gap-2 px-3 py-0 sm:px-5 lg:px-8">
          <Link href="/" className="flex h-16 w-32 shrink-0 items-center justify-center p-0 leading-none sm:w-36" aria-label="Buizz home">
            <img src={logoSrc} alt="Buizz" className="block h-full w-full object-contain object-center" />
          </Link>
          <LocationSelector />
          <div className="hidden min-w-0 flex-1 items-center gap-1 bg-transparent p-0 text-xs font-black text-[var(--app-muted)] md:flex lg:flex-none">
            {pageLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex min-h-8 shrink-0 items-center rounded-md px-2.5 transition sm:px-3 ${
                  isActiveLink(link.href)
                    ? "bg-[#e50914] text-white shadow-[0_10px_24px_rgba(229,9,20,0.25)]"
                    : "hover:bg-[var(--app-subtle)] hover:text-[var(--app-foreground)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <form action={searchAction} className="hidden w-[min(38vw,520px)] min-w-[300px] grid-cols-[1fr_auto] overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] shadow-inner xl:min-w-[360px] lg:grid">
            <label className="flex min-h-10 items-center gap-2 px-3">
              <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
              <input
                name="q"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--app-muted)]"
                placeholder="Search events, plays, activities..."
              />
            </label>
            <button type="submit" className="min-h-10 bg-[#e50914] px-4 text-xs font-black text-white transition hover:bg-[#ff2634]">
              Search
            </button>
          </form>
          <div className="hidden items-center gap-1.5 lg:flex xl:gap-2">
            <Link
              href="/profile/wishlist"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-black text-[var(--app-muted)] transition hover:bg-[var(--app-subtle)] hover:text-[var(--app-foreground)] xl:gap-2 xl:px-3"
            >
              <Heart className="size-4" />
              Wishlist
            </Link>
            <button
              type="button"
              onClick={() => setTheme(isLight ? "dark" : "light")}
              className="inline-grid min-h-9 grid-cols-[auto_auto] items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-2.5 text-xs font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/45 xl:gap-2 xl:px-3"
              aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
            >
              {isLight ? <Moon className="size-4" /> : <Sun className="size-4" />}
              {isLight ? "Dark" : "Light"}
            </button>
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#e50914] px-3 text-xs font-black text-white shadow-sm transition hover:bg-[#ff2634]"
                  aria-expanded={profileOpen}
                  aria-label="Open profile panel"
                >
                  <UserCircle className="size-5" />
                  Profile
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 top-11 w-56 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 text-xs font-black text-[var(--app-foreground)] shadow-2xl">
                    {profileLinks.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} onClick={() => setProfileOpen(false)} className={`flex min-h-10 items-center gap-2 rounded-md px-3 transition ${pathname === href ? "bg-[#e50914] !text-white" : "hover:bg-[var(--app-subtle)]"}`}>
                        <Icon className="size-4" />
                        {label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-9 items-center rounded-md border border-[#e50914]/20 bg-[#e50914] px-3 text-xs font-black !text-white shadow-sm transition hover:bg-[#ff2634]"
              >
                Sign In
              </Link>
            )}
          </div>
          <div className="relative flex shrink-0 items-center gap-1 lg:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              className="grid size-9 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)]"
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
            >
              <Search className="size-4" />
            </button>
            <Link
              href="/profile/wishlist"
              className="grid size-9 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)]"
              aria-label="Wishlist"
            >
              <Heart className="size-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((open) => !open);
                setProfileOpen(false);
              }}
              className="grid size-9 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] md:hidden"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileOpen((open) => !open);
                setMenuOpen(false);
              }}
              className="grid size-9 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] sm:inline-flex sm:w-auto sm:px-2"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              <UserCircle className="size-5" />
              <span className="hidden text-xs font-black sm:inline">Profile</span>
            </button>
            {menuOpen ? (
              <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm md:hidden" role="presentation" onClick={() => setMenuOpen(false)}>
                <aside className="ml-auto flex h-dvh w-[78vw] max-w-80 flex-col border-l border-white/10 bg-[var(--app-elevated)] p-3 text-xs font-black text-[var(--app-foreground)] shadow-2xl" role="dialog" aria-label="Mobile navigation menu" onClick={(event) => event.stopPropagation()}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-black">Menu</span>
                    <button type="button" onClick={() => setMenuOpen(false)} className="grid size-9 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)]" aria-label="Close navigation menu">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="grid gap-1">
                    {pageLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex min-h-11 items-center rounded-md px-3 transition ${
                          isActiveLink(link.href)
                            ? "bg-[#e50914] !text-white"
                            : "hover:bg-[var(--app-subtle)]"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-[var(--app-border)] pt-3">
                    <p className="mb-2 px-3 text-[10px] uppercase text-[var(--app-muted)]">Account</p>
                    {isAuthenticated ? (
                      <div className="grid gap-1">
                        {profileLinks.map(({ href, label, icon: Icon }) => (
                          <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`flex min-h-11 items-center gap-2 rounded-md px-3 transition ${pathname === href ? "bg-[#e50914] !text-white" : "hover:bg-[var(--app-subtle)]"}`}>
                            <Icon className="size-4" />
                            {label}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Link href="/login" className="flex min-h-11 items-center justify-center rounded-md bg-[#e50914] px-3 !text-white">
                        Sign In
                      </Link>
                    )}
                  </div>
                </aside>
              </div>
            ) : null}
            {profileOpen ? (
              <div className="absolute right-0 top-11 w-48 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 text-xs font-black text-[var(--app-foreground)] shadow-2xl">
                {isAuthenticated ? profileLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={() => setProfileOpen(false)} className={`flex min-h-10 items-center gap-2 rounded-md px-3 transition ${pathname === href ? "bg-[#e50914] !text-white" : "hover:bg-[var(--app-subtle)]"}`}>
                    <Icon className="size-4" />
                    {label}
                  </Link>
                )) : null}
                <button
                  type="button"
                  onClick={() => setTheme(isLight ? "dark" : "light")}
                  className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left transition hover:bg-[var(--app-subtle)]"
                >
                  {isLight ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  {isLight ? "Dark Mode" : "Light Mode"}
                </button>
                {!isAuthenticated ? (
                  <Link href="/login" className="mt-1 flex min-h-10 items-center justify-center rounded-md bg-[#e50914] px-3 !text-white">
                    Sign In
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </nav>
        {searchOpen ? (
          <form action={searchAction} className="mx-auto grid max-w-[1500px] grid-cols-[1fr_auto] overflow-hidden border-t border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] shadow-inner lg:hidden">
            <label className="flex min-h-12 items-center gap-2 px-3">
              <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
              <input
                name="q"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--app-muted)]"
                placeholder="Search events, plays, activities..."
                autoFocus
              />
            </label>
            <button type="submit" className="min-h-12 bg-[#e50914] px-4 text-xs font-black text-white transition hover:bg-[#ff2634]">
              Search
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
