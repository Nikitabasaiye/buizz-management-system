import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, eyebrow, action, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 rounded-[var(--radius-3xl)] border border-[var(--app-border)] bg-[color:var(--app-card)]/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between sm:p-6", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-black leading-tight text-[var(--app-foreground)] sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--app-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
