"use client";

import { Edit3, Mail, MapPin, Phone, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionFeedback } from "@/components/common/ActionFeedback";
import { LoadingButton } from "@/components/common/LoadingButton";
import { useActionFeedback } from "@/hooks/useActionFeedback";
import type { DashboardProfile } from "./ProfileCard";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

export function ProfileModal({
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
  onProfileSaved?: (profile: DashboardProfile) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const { loadingKey, successMessage, errorMessage, runAction } = useActionFeedback();

  useEffect(() => {
    setForm(profile);
    setIsEditing(false);
  }, [profile]);

  if (!open) return null;

  const profileStorageKey = `buizz-dashboard-profile-${profile.role.toLowerCase().replace(/\s+/g, "-")}`;

  const saveProfile = () => {
    void runAction(
      "save-profile",
      () => {
        const updated = { ...profile, ...form };
        window.localStorage.setItem(profileStorageKey, JSON.stringify(updated));
        setForm(updated);
        setIsEditing(false);
        onProfileSaved?.(updated);
      },
      "Profile updated successfully."
    );
  };

  const editFields = [
    { label: "Name", value: form.name, key: "name", icon: ShieldCheck },
    { label: "Email", value: form.email, key: "email", icon: Mail },
    { label: "Phone", value: form.phone, key: "phone", icon: Phone },
    { label: "City", value: form.city, key: "city", icon: MapPin },
  ] as const;

  const readonlyDetails = [
    { label: "Role", value: form.role, icon: ShieldCheck },
    { label: "Account status", value: form.status, icon: ShieldCheck },
    { label: "Last login", value: form.lastLogin, icon: ShieldCheck },
    { label: "Created date", value: form.createdAt, icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${form.name} profile`}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/20 bg-[var(--app-elevated)] text-[var(--app-foreground)] shadow-2xl"
      >
        <div className="relative bg-[var(--color-brand-ink)] px-6 py-7 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/10 text-white transition duration-300 hover:scale-[1.02] hover:bg-[var(--color-brand-primary)]"
            aria-label="Close profile modal"
          >
            <X className="size-4 text-current" />
          </button>
          <img
            src={form.avatarUrl}
            alt={`${form.name} avatar`}
            className="size-20 rounded-full border-4 border-white object-cover shadow-2xl"
          />
          <h2 className="mt-4 text-2xl font-black">{form.name}</h2>
          <p className="mt-1 text-sm font-bold text-white/70">Role: {form.role}</p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {editFields.map(({ label, value, key, icon: Icon }) => (
              <label
                key={label}
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4"
              >
                <span className="flex items-center gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
                  <Icon className="size-4 text-[var(--color-brand-primary)]" />
                  {label}
                </span>
                {isEditing ? (
                  <input
                    value={value}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    className="mt-2 min-h-10 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black outline-none focus:border-[var(--color-brand-primary)]"
                  />
                ) : (
                  <span className="mt-2 block text-sm font-black">{value}</span>
                )}
              </label>
            ))}

            {readonlyDetails.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4"
              >
                <div className="flex items-center gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
                  <Icon className="size-4 text-[var(--color-brand-primary)]" />
                  {label}
                </div>
                <p className="mt-2 text-sm font-black">{value}</p>
              </div>
            ))}
          </div>

          <ActionFeedback successMessage={successMessage} errorMessage={errorMessage} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            {isEditing ? (
              <LoadingButton
                loading={loadingKey === "save-profile"}
                loadingText="Saving..."
                onClick={saveProfile}
                className="min-h-10 rounded-md bg-[var(--color-brand-primary)] px-3 text-xs font-black text-white"
              >
                Save Profile
              </LoadingButton>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] transition duration-300 hover:scale-[1.02] hover:border-[var(--color-brand-primary)]/50 hover:shadow-[0_14px_36px_rgba(236,27,114,0.14)]"
              >
                <Edit3 className="size-4 text-current" />
                Edit Profile
              </button>
            )}
            <LogoutButton onClick={onLogout} />
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] text-xs font-black text-[var(--app-foreground)] transition duration-300 hover:scale-[1.02] hover:border-[var(--color-brand-primary)]/50 hover:shadow-[0_14px_36px_rgba(236,27,114,0.14)]"
            >
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
