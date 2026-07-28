"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import type { DashboardProfile } from "@/components/dashboard/ProfileCard";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import { useAppStore } from "@/store/app.store";

import {
  getDashboardProfile,
  createInitialsAvatar,
  createProfileStorageIdentity,
  roleSessionKey,
  roleTitles,
  type NavItem,
  type Role,
} from "./SharedDashboardComponents";

function getRoleHomeHref(role: Role) {
  if (role === "super-admin") return "/super-admin/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/organizer/dashboard";
}

function getRoleLoginHref(role: Role) {
  if (role === "super-admin") return "/super-admin/login";
  if (role === "admin") return "/admin/login";
  return "/organizer/login";
}

export function DashboardShell({
  role,
  nav,
  email,
  children,
}: {
  role: Role;
  nav: NavItem[];
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const appTheme = useAppStore((state) => state.theme);
  const setAppTheme = useAppStore((state) => state.setTheme);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [dashboardTheme, setDashboardTheme] = useState<"light" | "dark">(
    "light",
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [profile, setProfile] = useState<DashboardProfile>(() =>
    getDashboardProfile(role, email),
  );

  const { loadingKey, runAction } = useActionFeedback();

  useEffect(() => {
    const saved = window.localStorage.getItem(
      "buizz-dashboard-sidebar-collapsed-v2",
    );

    // Default sidebar is expanded. User can click Hide/View to change it.
    setDesktopSidebarCollapsed(saved === null ? false : saved === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "buizz-dashboard-sidebar-collapsed-v2",
      String(desktopSidebarCollapsed),
    );
  }, [desktopSidebarCollapsed]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const syncDashboardTheme = () => {
      setDashboardTheme(
        appTheme === "system" ? (media.matches ? "dark" : "light") : appTheme,
      );
    };

    syncDashboardTheme();
    media.addEventListener("change", syncDashboardTheme);

    return () => {
      media.removeEventListener("change", syncDashboardTheme);
    };
  }, [appTheme]);

  useEffect(() => {
    setProfile(getDashboardProfile(role, email));
  }, [role, email]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;

      if (
        profileMenuRef.current &&
        target &&
        !profileMenuRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    setProfileMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!logoutConfirmOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && loadingKey !== "dashboard-logout") {
        setLogoutConfirmOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [logoutConfirmOpen, loadingKey]);

  const toggleDashboardTheme = () => {
    setAppTheme(dashboardTheme === "light" ? "dark" : "light");
  };

  const activeNavItem = nav.find(
    (item) =>
      item.type !== "group" &&
      item.href &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );

  const pageTitle = activeNavItem?.label ?? "Dashboard";
  const roleTitle = roleTitles[role];

  const closeFloatingUi = () => {
    setProfileMenuOpen(false);
    setProfileOpen(false);
    setMobileNavOpen(false);
  };

  const requestLogout = () => {
    closeFloatingUi();
    setLogoutConfirmOpen(true);
  };

  const logout = () => {
    void runAction(
      "dashboard-logout",
      () => {
        window.localStorage.removeItem(roleSessionKey[role]);
        window.localStorage.removeItem("buizz-auth-user");
        window.localStorage.removeItem("buizz-current-role");

        router.push(getRoleLoginHref(role));
      },
      "Logged out successfully",
    );
  };

  const renderNavLinks = ({
    mode,
    collapsed,
  }: {
    mode: "desktop" | "mobile";
    collapsed: boolean;
  }) => (
    <nav
      aria-label={`${roleTitle} navigation`}
      className={
        collapsed
          ? "grid flex-1 content-start gap-2 overflow-y-auto overflow-x-visible px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : mode === "desktop"
            ? "grid flex-1 content-start gap-1.5 overflow-y-auto px-3 py-4 [scrollbar-width:none] xl:px-4 [&::-webkit-scrollbar]:hidden"
            : "grid content-start gap-1.5 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      }
    >
      {nav.map((item, index) => {
        if (item.type === "group") {
          if (collapsed) {
            return (
              <div
                key={`${mode}-${item.groupLabel}-${index}`}
                className="my-2 flex justify-center"
              >
                <span className="h-px w-8 rounded-full bg-[var(--app-border)]" />
              </div>
            );
          }

          return (
            <div
              key={`${mode}-${item.groupLabel}-${index}`}
              className="mt-4 first:mt-1"
            >
              <div className="flex items-center gap-2 px-3 pb-1">
                <span className="h-px flex-1 bg-[var(--app-border)]" />

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-muted)]">
                  {item.groupLabel}
                </p>

                <span className="h-px flex-1 bg-[var(--app-border)]" />
              </div>
            </div>
          );
        }

        const href = item.href ?? "#";
        const Icon = item.icon ?? LayoutDashboard;
        const active = pathname === href || pathname.startsWith(`${href}/`);

        if (collapsed) {
          return (
            <Link
              key={`${mode}-${href}`}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMobileNavOpen(false)}
              title={item.label}
              className={`group relative mx-auto grid size-12 place-items-center rounded-2xl transition duration-300 ${active
                  ? "bg-[var(--color-brand-primary)] text-white shadow-[0_16px_34px_rgb(var(--brand-primary-rgb)/0.28)]"
                  : "bg-[var(--app-elevated)] text-[var(--app-muted)] hover:-translate-y-0.5 hover:bg-[var(--color-brand-primary)]/10 hover:text-[var(--color-brand-primary)]"
                }`}
            >
              <Icon className="size-5" />

              <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-2xl bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-black text-white opacity-0 shadow-[0_16px_36px_rgb(var(--brand-primary-rgb)/0.28)] transition group-hover:block group-hover:opacity-100">
                {item.label}
              </span>

              {active ? (
                <span className="absolute -right-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-white/90" />
              ) : null}
            </Link>
          );
        }

        return (
          <Link
            key={`${mode}-${href}`}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMobileNavOpen(false)}
            className={`group relative inline-flex min-h-11 min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-3 text-sm font-black transition duration-300 ${active
                ? "bg-[var(--color-brand-primary)] text-white shadow-[0_16px_38px_rgb(var(--brand-primary-rgb)/0.28)]"
                : "text-[var(--app-muted)] hover:-translate-y-0.5 hover:bg-[var(--color-brand-primary)]/10 hover:text-[var(--color-brand-primary)] hover:ring-1 hover:ring-[var(--color-brand-primary)]/15"
              }`}
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-xl transition duration-300 ${active
                  ? "bg-white/18 text-white"
                  : "bg-[var(--app-elevated)] text-[var(--color-brand-primary)] group-hover:bg-[var(--color-brand-primary)]/12"
                }`}
            >
              <Icon className="size-4" />
            </span>

            <span className="truncate">{item.label}</span>

            {active ? (
              <span className="ml-auto size-2 shrink-0 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <main
      className="min-h-screen min-w-0 overflow-x-hidden bg-[var(--app-background)] text-[var(--app-foreground)] transition-colors duration-300 lg:grid"
      style={{
        gridTemplateColumns: desktopSidebarCollapsed
          ? "112px minmax(0, 1fr)"
          : "316px minmax(0, 1fr)",
      }}
    >
      <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-elevated)]/94 px-3 py-2.5 shadow-[0_10px_32px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] shadow-sm transition active:scale-[0.98]"
            aria-label="Open dashboard navigation"
            aria-expanded={mobileNavOpen}
          >
            <Menu className="size-5" />
          </button>

          <Link
            href={getRoleHomeHref(role)}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <BuizzLogo size="sm" className="w-24 shrink-0" />

            <span className="min-w-0">
              <span className="block truncate text-sm font-black leading-tight text-[var(--app-foreground)]">
                {pageTitle}
              </span>

              <span className="block truncate text-[10px] font-bold text-[var(--app-muted)] sm:text-[11px]">
                {roleTitle} Panel
              </span>
            </span>
          </Link>

          <ThemeToggle
            theme={dashboardTheme}
            onToggle={toggleDashboardTheme}
            compact
          />

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]"
            aria-label="Open profile"
          >
            <img
              src={profile.avatarUrl}
              alt=""
              className="size-7 rounded-full object-cover"
            />
          </button>
        </div>
      </header>

      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-[80] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Dashboard navigation"
        >
          <button
            type="button"
            aria-label="Close dashboard navigation"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />

          <aside className="absolute left-0 top-0 flex h-[100dvh] w-[min(88vw,380px)] max-w-[380px] flex-col overflow-hidden rounded-r-[2rem] border-r border-[var(--app-border)] bg-[var(--app-sidebar)] shadow-[22px_0_70px_rgba(15,23,42,0.28)] buizz-dashboard-enter">
            <div className="border-b border-[var(--app-border)] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="size-2.5 rounded-full bg-[#FFBD2E]" />
                  <span className="size-2.5 rounded-full bg-[#28C840]" />
                </div>

                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]"
                  aria-label="Close dashboard navigation"
                >
                  <X className="size-5" />
                </button>
              </div>

              <Link
                href={getRoleHomeHref(role)}
                onClick={() => setMobileNavOpen(false)}
                className="flex min-w-0 items-center gap-3"
              >
                <BuizzLogo size="lg" className="w-[132px] shrink-0" />

                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[var(--app-foreground)]">
                    {roleTitle}
                  </span>

                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-muted)]">
                    Panel
                  </span>
                </span>
              </Link>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {renderNavLinks({
                mode: "mobile",
                collapsed: false,
              })}
            </div>

            <div className="border-t border-[var(--app-border)] p-4">
              <div className="mb-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-2xl object-cover"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--app-foreground)]">
                      {profile.name}
                    </p>

                    <p className="truncate text-xs font-bold text-[var(--app-muted)]">
                      {email}
                    </p>
                  </div>
                </div>
              </div>

              <LogoutButton
                onClick={requestLogout}
                compact
                loading={loadingKey === "dashboard-logout"}
              />
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="relative z-20 hidden overflow-visible lg:block">
        <div
          className={`sticky top-5 ml-4 flex h-[calc(100dvh-2.5rem)] flex-col rounded-[2rem] border border-white/70 bg-[var(--app-sidebar)]/92 shadow-[0_24px_80px_rgba(15,23,42,0.14)] ring-1 ring-black/5 backdrop-blur-2xl transition-all duration-300 ${desktopSidebarCollapsed
              ? "w-20 overflow-visible"
              : "w-[280px] overflow-hidden"
            }`}
        >
          <button
            type="button"
            onClick={() =>
              setDesktopSidebarCollapsed((collapsed) => !collapsed)
            }
            className={`absolute z-40 grid place-items-center border border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-foreground)] shadow-[0_12px_30px_rgba(15,23,42,0.14)] transition hover:border-[var(--color-brand-primary)]/40 hover:text-[var(--color-brand-primary)] ${desktopSidebarCollapsed
                ? "-right-3 top-[72px] size-8 rounded-full"
                : "right-4 top-4 min-h-8 rounded-full px-3 text-[11px] font-black"
              }`}
            aria-label={
              desktopSidebarCollapsed
                ? "View full dashboard sidebar"
                : "Hide dashboard sidebar"
            }
            title={
              desktopSidebarCollapsed
                ? "View full sidebar"
                : "Hide sidebar"
            }
          >
            {desktopSidebarCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <ChevronLeft className="size-4" />
                Hide
              </span>
            )}
          </button>

          <div
            className={`shrink-0 border-b border-[var(--app-border)] ${desktopSidebarCollapsed ? "p-4 pt-5" : "p-4 pr-16"
              }`}
          >
            <div
              className={`mb-4 flex items-center gap-1.5 ${desktopSidebarCollapsed ? "justify-center" : "justify-start"
                }`}
            >
              <span className="size-2.5 rounded-full bg-[#FF5F57]" />
              <span className="size-2.5 rounded-full bg-[#FFBD2E]" />
              <span className="size-2.5 rounded-full bg-[#28C840]" />
            </div>

            {desktopSidebarCollapsed ? (
              <Link
                href={getRoleHomeHref(role)}
                className="mx-auto flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-[var(--app-elevated)] shadow-sm"
                title={roleTitle}
              >
                <BuizzLogo size="sm" className="!w-8 max-w-8 shrink-0" />
              </Link>
            ) : (
              <Link
                href={getRoleHomeHref(role)}
                className="flex min-w-0 items-center gap-3"
              >
                <BuizzLogo size="lg" className="w-[132px] shrink-0" />

                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[var(--app-foreground)]">
                    {roleTitle}
                  </span>

                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-muted)]">
                    Panel
                  </span>
                </span>
              </Link>
            )}
          </div>

          {renderNavLinks({
            mode: "desktop",
            collapsed: desktopSidebarCollapsed,
          })}

          <div className="mt-auto shrink-0 border-t border-[var(--app-border)] p-3">
            {desktopSidebarCollapsed ? (
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--app-elevated)] shadow-sm transition hover:-translate-y-0.5"
                  title={profile.name}
                >
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="size-9 rounded-2xl object-cover"
                  />
                </button>

                <button
                  type="button"
                  onClick={requestLogout}
                  disabled={loadingKey === "dashboard-logout"}
                  className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)] hover:text-white disabled:opacity-60"
                  title="Logout"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="mb-3 flex w-full min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-left transition hover:border-[var(--color-brand-primary)]/35"
                >
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-2xl object-cover"
                  />

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[var(--app-foreground)]">
                      {profile.name}
                    </span>

                    <span className="block truncate text-xs font-bold text-[var(--app-muted)]">
                      {profile.role}
                    </span>
                  </span>
                </button>

                <LogoutButton
                  onClick={requestLogout}
                  compact
                  loading={loadingKey === "dashboard-logout"}
                />
              </>
            )}
          </div>
        </div>
      </aside>

      <section className="relative z-10 w-full min-w-0 max-w-[100vw] overflow-x-hidden px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 md:px-5 lg:max-w-none lg:px-6 lg:py-5 xl:px-8 2xl:px-10">
        <header className="sticky top-3 z-30 mb-5 hidden w-full max-w-none flex-col gap-3 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)]/88 p-3 shadow-[0_18px_54px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition duration-300 lg:flex lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] ring-1 ring-[var(--color-brand-primary)]/15">
              <LayoutDashboard className="size-5" />
            </span>

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--app-muted)]">
                {roleTitle} Panel
              </p>

              <h1 className="mt-0.5 truncate text-2xl font-black tracking-tight text-[var(--app-foreground)]">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <ThemeToggle
              theme={dashboardTheme}
              onToggle={toggleDashboardTheme}
              compact
            />

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="inline-flex min-h-10 max-w-[220px] items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black transition duration-300 hover:border-[var(--color-brand-primary)]/50 hover:bg-[var(--color-brand-primary)] hover:text-white"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="size-6 shrink-0 rounded-full object-cover"
                />

                <span className="truncate">Profile</span>

                <ChevronDown className="size-4 shrink-0" />
              </button>

              {profileMenuOpen ? (
                <div
                  className="absolute right-0 z-30 mt-3 w-72 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
                  role="menu"
                >
                  <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="size-12 shrink-0 rounded-2xl object-cover ring-2 ring-white"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[var(--app-foreground)]">
                          {profile.name}
                        </p>

                        <p className="mt-0.5 truncate text-xs font-bold text-[var(--app-muted)]">
                          {profile.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setProfileOpen(true);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-xs font-black transition hover:bg-[var(--color-brand-primary)]/10 hover:text-[var(--color-brand-primary)]"
                    >
                      <span>Edit profile</span>

                      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted)]">
                        Open
                      </span>
                    </button>

                    {role === "organizer" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          router.push("/organizer/profile");
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-xs font-black transition hover:bg-[var(--color-brand-primary)]/10 hover:text-[var(--color-brand-primary)]"
                      >
                        <span>View full profile</span>

                        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted)]">
                          Page
                        </span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={requestLogout}
                      className="mt-1 flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--color-brand-primary)]/10 px-3 py-3 text-left text-xs font-black text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)] hover:text-white"
                    >
                      <span>Logout</span>

                      <span className="text-[10px] uppercase tracking-[0.14em]">
                        Exit
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <LogoutButton
              onClick={requestLogout}
              compact
              loading={loadingKey === "dashboard-logout"}
            />
          </div>
        </header>

        <div
          key={pathname}
          className="w-full max-w-none min-w-0 overflow-x-hidden buizz-dashboard-enter"
        >
          {children}
        </div>
      </section>

      {logoutConfirmOpen ? (
        <div
          className="fixed inset-0 z-[90] grid items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
          onClick={() => {
            if (loadingKey !== "dashboard-logout") {
              setLogoutConfirmOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-t-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_28px_90px_rgba(15,23,42,0.30)] buizz-dashboard-enter sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
                <ShieldCheck className="size-5" />
              </span>

              <div className="min-w-0">
                <h2
                  id="logout-confirm-title"
                  className="text-xl font-black text-[var(--app-foreground)]"
                >
                  Logout from dashboard?
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                  You will be signed out from the {roleTitle} panel and
                  redirected to the login page.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                disabled={loadingKey === "dashboard-logout"}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 text-sm font-black text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  logout();
                }}
                disabled={loadingKey === "dashboard-logout"}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white shadow-[0_16px_36px_rgb(var(--brand-primary-rgb)/0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingKey === "dashboard-logout"
                  ? "Logging out..."
                  : "Logout"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DashboardProfileModal
        profile={profile}
        open={profileOpen}
        theme={dashboardTheme}
        onThemeToggle={toggleDashboardTheme}
        onLogout={requestLogout}
        onClose={() => setProfileOpen(false)}
        onProfileSaved={setProfile}
      />
    </main>
  );
}

function getProfileStorageKey(profile: DashboardProfile) {
  return `buizz-dashboard-profile-${profile.role.toLowerCase().replace(/\s+/g, "-")}-${createProfileStorageIdentity(profile)}`;
}

function getDefaultAvatarUrl(profile: DashboardProfile) {
  return createInitialsAvatar(profile.name, profile.role);
}

function DashboardProfileModal({
  profile,
  open,
  theme,
  onThemeToggle,
  onLogout,
  onClose,
  onProfileSaved,
}: {
  profile: DashboardProfile;
  open: boolean;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onLogout: () => void;
  onClose: () => void;
  onProfileSaved: (profile: DashboardProfile) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftProfile, setDraftProfile] = useState<DashboardProfile>(profile);
  const [uploadError, setUploadError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    setDraftProfile(profile);
    setUploadError("");
    setSavedMessage("");
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handlePhotoSelected = (file: File | undefined) => {
    setUploadError("");
    setSavedMessage("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image is too large. Please upload an image below 2 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      if (!result) {
        setUploadError("Could not read this image. Please try another file.");
        return;
      }

      setDraftProfile((current) => ({
        ...current,
        avatarUrl: result,
      }));
    };

    reader.onerror = () => {
      setUploadError("Image upload failed. Please try again.");
    };

    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    const nextProfile: DashboardProfile = {
      ...draftProfile,
      name: draftProfile.name.trim() || profile.name,
      email: draftProfile.email.trim() || profile.email,
      phone: draftProfile.phone.trim() || profile.phone,
      city: draftProfile.city.trim() || profile.city,
      avatarUrl: draftProfile.avatarUrl || getDefaultAvatarUrl(profile),
    };

    window.localStorage.setItem(
      getProfileStorageKey(nextProfile),
      JSON.stringify(nextProfile),
    );

    onProfileSaved(nextProfile);
    setSavedMessage("Profile updated successfully.");

    window.setTimeout(() => {
      onClose();
    }, 500);
  };

  const removePhoto = () => {
    setUploadError("");
    setSavedMessage("");
    setDraftProfile((current) => ({
      ...current,
      avatarUrl: getDefaultAvatarUrl(current),
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] grid items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit dashboard profile"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[92dvh] w-full max-w-3xl overflow-hidden rounded-t-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_28px_90px_rgba(15,23,42,0.30)] sm:rounded-[2rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--app-border)] p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
              Dashboard Profile
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--app-foreground)]">
              Edit profile
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
              Update your name, contact details, and profile photo for this dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/35 hover:text-[var(--color-brand-primary)]"
            aria-label="Close profile modal"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="max-h-[calc(92dvh-160px)] overflow-y-auto p-5">
          <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="rounded-[1.6rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-center">
              <div className="relative mx-auto size-32 overflow-hidden rounded-[2rem] border border-white/70 bg-[var(--app-elevated)] shadow-[0_18px_44px_rgba(15,23,42,0.12)]">
                <img
                  src={draftProfile.avatarUrl || getDefaultAvatarUrl(profile)}
                  alt={`${draftProfile.name} profile photo`}
                  className="size-full object-cover"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-2xl bg-[var(--color-brand-primary)] text-white shadow-[0_12px_28px_rgb(var(--brand-primary-rgb)/0.30)]"
                  aria-label="Upload profile photo"
                >
                  <Camera className="size-4" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
              />

              <h3 className="mt-4 break-words text-lg font-black text-[var(--app-foreground)]">
                {draftProfile.name || profile.name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
                {draftProfile.role}
              </p>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white transition hover:bg-[var(--color-brand-secondary)]"
                >
                  <Upload className="size-4" />
                  Upload Photo
                </button>

                <button
                  type="button"
                  onClick={removePhoto}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-black text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/35 hover:text-[var(--color-brand-primary)]"
                >
                  <Trash2 className="size-4" />
                  Remove Photo
                </button>
              </div>

              <p className="mt-3 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                Supported: JPG, PNG, WEBP. Max size: 2 MB.
              </p>
            </aside>

            <section className="grid min-w-0 gap-4">
              {uploadError ? (
                <div className="rounded-2xl border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/10 p-3 text-sm font-black text-[var(--color-brand-primary)]">
                  {uploadError}
                </div>
              ) : null}

              {savedMessage ? (
                <div className="rounded-2xl border border-[#22C55E]/25 bg-[#22C55E]/10 p-3 text-sm font-black text-[#16A34A]">
                  {savedMessage}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-[var(--app-foreground)]">
                    Name
                  </span>
                  <input
                    value={draftProfile.name}
                    onChange={(event) =>
                      setDraftProfile((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]"
                    placeholder="Full name"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-[var(--app-foreground)]">
                    Role
                  </span>
                  <input
                    value={draftProfile.role}
                    readOnly
                    className="min-h-11 cursor-not-allowed rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold text-[var(--app-muted)] outline-none"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-[var(--app-foreground)]">
                    Email
                  </span>
                  <input
                    value={draftProfile.email}
                    onChange={(event) =>
                      setDraftProfile((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]"
                    placeholder="Email address"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-[var(--app-foreground)]">
                    Phone
                  </span>
                  <input
                    value={draftProfile.phone}
                    onChange={(event) =>
                      setDraftProfile((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]"
                    placeholder="Phone number"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-[var(--app-foreground)]">
                    City
                  </span>
                  <input
                    value={draftProfile.city}
                    onChange={(event) =>
                      setDraftProfile((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]"
                    placeholder="City"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-[var(--app-foreground)]">
                    Status
                  </span>
                  <input
                    value={draftProfile.status}
                    onChange={(event) =>
                      setDraftProfile((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="min-h-11 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]"
                    placeholder="Status"
                  />
                </label>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[var(--app-foreground)]">
                      Dashboard theme
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      Current dashboard mode: {theme}
                    </p>
                  </div>

                  <ThemeToggle
                    theme={theme}
                    onToggle={onThemeToggle}
                    compact
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[var(--app-border)] bg-[var(--app-elevated)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/10 px-5 text-sm font-black text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)] hover:text-white"
          >
            <LogOut className="size-4" />
            Logout
          </button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 text-sm font-black text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/35"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveProfile}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white shadow-[0_16px_36px_rgb(var(--brand-primary-rgb)/0.24)] transition hover:-translate-y-0.5"
            >
              <Save className="size-4" />
              Save Profile
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
