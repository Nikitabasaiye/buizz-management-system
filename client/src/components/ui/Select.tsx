"use client";

import { AlertCircle, ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  loading?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, loading, className, id, disabled, children, ...props }, ref) => {
    const selectId = id ?? props.name;
    const helperId = selectId ? `${selectId}-helper` : undefined;

    return (
      <label className="block">
        {label && <span className="mb-2 block text-sm font-black text-[var(--app-foreground)]">{label}</span>}
        <span className="relative block">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled || loading}
            aria-invalid={Boolean(error)}
            aria-describedby={helperId}
            className={cn(
              "h-12 w-full appearance-none rounded-[var(--radius-xl)] border border-[var(--app-border)] bg-[var(--app-input)] px-4 pr-11 text-sm font-semibold text-[var(--app-foreground)] outline-none transition hover:border-[var(--color-border-strong)] hover:bg-[var(--app-hover)] focus:border-[var(--color-brand-primary)] focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60",
              error && "border-[var(--color-status-danger)] focus:border-[var(--color-status-danger)]",
              className
            )}
            {...props}
          >
            {children}
          </select>
          {loading ? (
            <span className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[var(--color-text-muted)] border-t-transparent" />
          ) : (
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          )}
        </span>
        {(hint || error) && (
          <span
            id={helperId}
            className={cn(
              "mt-2 flex items-center gap-1.5 text-xs font-bold",
              error ? "text-[var(--color-status-danger)]" : "text-[var(--color-text-muted)]"
            )}
          >
            {error && <AlertCircle className="size-3.5" aria-hidden="true" />}
            {error || hint}
          </span>
        )}
      </label>
    );
  }
);

Select.displayName = "Select";
