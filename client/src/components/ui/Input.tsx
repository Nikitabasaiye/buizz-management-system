"use client";

import { AlertCircle } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, loading, className, id, disabled, ...props }, ref) => {
    const inputId = id ?? props.name;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <label className="block">
        {label && (
          <span className="mb-2 block text-sm font-black text-[var(--app-foreground)]">
            {label}
          </span>
        )}
        <span className="relative block">
          {leftIcon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled || loading}
            aria-invalid={Boolean(error)}
            aria-describedby={helperId}
            className={cn(
              "h-12 w-full rounded-[var(--radius-xl)] border border-[var(--app-border)] bg-[var(--app-input)] px-4 text-sm font-semibold text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] hover:border-[var(--color-border-strong)] hover:bg-[var(--app-hover)] focus:border-[var(--color-brand-primary)] focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60",
              Boolean(leftIcon) && "pl-11",
              (Boolean(rightIcon) || loading) && "pr-11",
              error && "border-[var(--color-status-danger)] focus:border-[var(--color-status-danger)]",
              className
            )}
            {...props}
          />
          {loading && (
            <span className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[var(--color-text-muted)] border-t-transparent" />
          )}
          {!loading && rightIcon && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">{rightIcon}</span>}
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

Input.displayName = "Input";
