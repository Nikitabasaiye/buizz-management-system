"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle({
  theme,
  onToggle,
  compact = false,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
  compact?: boolean;
}) {
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center justify-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] text-xs font-black text-[var(--app-foreground)] transition duration-300 hover:scale-[1.02] hover:border-[var(--color-brand-primary)]/50 hover:bg-[var(--color-brand-primary)] hover:text-white hover:shadow-[0_14px_36px_rgba(236,27,114,0.14)] ${compact ? "min-h-9 min-w-9 px-0" : "min-h-10 w-full px-3"}`}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      <span className="relative grid size-4 place-items-center">
        <Sun
          className={`absolute size-4 transition duration-300 ${isLight ? "rotate-0 opacity-100" : "rotate-90 opacity-0"}`}
        />
        <Moon
          className={`absolute size-4 transition duration-300 ${isLight ? "-rotate-90 opacity-0" : "rotate-0 opacity-100"}`}
        />
      </span>
      {compact ? null : <span>{isLight ? "Light Mode" : "Dark Mode"}</span>}
    </button>
  );
}
