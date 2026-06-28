import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const tones: Record<BadgeTone, string> = {
  neutral: "bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]",
  primary: "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]",
  success: "bg-[var(--color-status-success)]/10 text-[var(--color-status-success)]",
  warning: "bg-[var(--color-status-warning)]/10 text-[var(--color-status-warning)]",
  danger: "bg-[var(--color-status-danger)]/10 text-[var(--color-status-danger)]",
  info: "bg-[var(--color-status-info)]/10 text-[var(--color-status-info)]",
};

export function Badge({ children, tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-black",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
