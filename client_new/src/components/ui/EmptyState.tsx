import { CalendarX2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-8 text-center", className)}>
      <div className="mx-auto grid size-14 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]">
        {icon || <CalendarX2 className="size-6" aria-hidden="true" />}
      </div>
      <h2 className="mt-5 text-xl font-black text-[var(--color-text-primary)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
