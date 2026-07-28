import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/cn";

type SearchBarProps = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "placeholder">;

export function SearchBar({
  className,
  inputClassName,
  placeholder = "Search events, artists, venues, cities",
  ...props
}: SearchBarProps) {
  return (
    <label
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-input)] px-4 text-[var(--app-foreground)] transition duration-200",
        "hover:border-[var(--color-brand-primary)]/45 hover:bg-[var(--app-hover)]",
        "focus-within:border-[var(--color-brand-primary)] focus-within:bg-[var(--app-elevated)] focus-within:shadow-[var(--shadow-focus)]",
        className,
      )}
    >
      <Search className="size-5 shrink-0 text-[var(--color-brand-primary)]" />

      <input
        className={cn(
          "min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)]",
          inputClassName,
        )}
        placeholder={placeholder}
        {...props}
      />
    </label>
  );
}