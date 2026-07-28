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
    <div className={cn("rounded-[var(--radius-3xl)] border border-dashed border-[var(--app-border)] bg-[color:var(--app-card)]/90 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur-xl", className)}>
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--app-subtle)] text-[var(--color-brand-primary)]">
        {icon || <CalendarX2 className="size-6" aria-hidden="true" />}
      </div>
      <h2 className="mt-5 text-xl font-black text-[var(--app-foreground)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--app-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
