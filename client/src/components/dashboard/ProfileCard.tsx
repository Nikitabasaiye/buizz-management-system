"use client";

export type DashboardProfile = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  lastLogin: string;
  createdAt: string;
  avatarUrl: string;
};

export function ProfileCard({
  profile,
  onClick,
}: {
  profile: DashboardProfile;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-left shadow-[0_12px_34px_rgba(15,23,42,0.08)] transition duration-300 hover:scale-[1.02] hover:border-[var(--color-brand-primary)]/50 hover:bg-[var(--app-elevated)] hover:shadow-[0_18px_48px_rgba(236,27,114,0.16)]"
      aria-label={`Open ${profile.name} profile`}
    >
      <img
        src={profile.avatarUrl}
        alt={`${profile.name} avatar`}
        className="size-11 shrink-0 rounded-full border-2 border-white object-cover shadow-md"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-[var(--app-foreground)]">
          {profile.name}
        </span>
        <span className="mt-0.5 block truncate text-xs font-bold text-[var(--app-muted)]">
          Role: {profile.role}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-[var(--app-muted)]">
          {profile.email}
        </span>
      </span>
    </button>
  );
}
