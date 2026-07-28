"use client";

import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_18px_50px_rgba(17,24,39,0.06)] sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black leading-tight text-[var(--app-foreground)]">{title}</h2>
        {description ? <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
