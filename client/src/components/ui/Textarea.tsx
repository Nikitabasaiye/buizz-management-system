"use client";

import { AlertCircle } from "lucide-react";
import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, leftIcon, className, id, ...props }, ref) => {
    const textareaId = id ?? props.name;
    const helperId = textareaId ? `${textareaId}-helper` : undefined;

    return (
      <label className="block">
        {label ? <span className="mb-2 block text-sm font-black text-[var(--app-foreground)]">{label}</span> : null}
        <span className="relative block">
          {leftIcon ? <span className="absolute left-4 top-4 text-[var(--color-brand-primary)]">{leftIcon}</span> : null}
          <textarea
            ref={ref}
            id={textareaId}
            aria-invalid={Boolean(error)}
            aria-describedby={helperId}
            className={cn(
              "min-h-32 w-full resize-y rounded-[var(--radius-xl)] border border-[var(--app-border)] bg-[var(--app-input)] px-4 py-3 text-sm font-semibold text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] hover:border-[var(--color-border-strong)] hover:bg-[var(--app-hover)] focus:border-[var(--color-brand-primary)] focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60",
              Boolean(leftIcon) && "pl-11",
              error && "border-[var(--color-status-danger)] focus:border-[var(--color-status-danger)]",
              className,
            )}
            {...props}
          />
        </span>
        {(hint || error) ? (
          <span
            id={helperId}
            className={cn(
              "mt-2 flex items-center gap-1.5 text-xs font-bold",
              error ? "text-[var(--color-status-danger)]" : "text-[var(--app-muted)]",
            )}
          >
            {error ? <AlertCircle className="size-3.5" aria-hidden="true" /> : null}
            {error || hint}
          </span>
        ) : null}
      </label>
    );
  },
);

Textarea.displayName = "Textarea";
