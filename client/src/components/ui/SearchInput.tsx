"use client";

import { Search, X } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  loading?: boolean;
  onClear?: () => void;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ label = "Search", loading, onClear, value, className, ...props }, ref) => (
    <label className="block">
      <span className="sr-only">{label}</span>
      <span className="relative block">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true" />
        <input
          ref={ref}
          type="search"
          value={value}
          className={cn(
            "h-12 w-full rounded-[var(--radius-full)] border border-[var(--app-border)] bg-[var(--app-input)] pl-11 pr-11 text-sm font-semibold text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] hover:border-[var(--color-border-strong)] hover:bg-[var(--app-hover)] focus:border-[var(--color-brand-primary)] focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60",
            className
          )}
          {...props}
        />
        {loading && <span className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[var(--color-text-muted)] border-t-transparent" />}
        {!loading && onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-subtle)]"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </span>
    </label>
  )
);

SearchInput.displayName = "SearchInput";
