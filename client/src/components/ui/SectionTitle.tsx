import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionTitleProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function SectionTitle({ title, description, icon, action, className }: SectionTitleProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="text-xl font-black leading-tight text-[var(--app-foreground)] sm:text-2xl">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[var(--app-muted)]">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
