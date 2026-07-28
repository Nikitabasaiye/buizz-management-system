import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

type PagePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  actionHref = "/",
  actionLabel = "Back to Home",
}: PagePlaceholderProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--app-background)] px-4 py-10 text-[var(--app-foreground)] sm:px-6 lg:px-8">
      <section className="relative mx-auto flex min-h-[64vh] w-full max-w-7xl flex-col justify-center">
        <div className="pointer-events-none absolute -left-24 top-12 size-72 rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-12 size-72 rounded-full bg-[var(--color-brand-secondary)]/10 blur-3xl" />

        <div className="relative max-w-4xl overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 shadow-[var(--shadow-card)] sm:p-8 lg:p-10">
          <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-brand-primary),var(--color-brand-accent),transparent)]" />

          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
            <Sparkles className="size-3.5" />
            {eyebrow}
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-[-0.05em] text-[var(--app-foreground)] sm:text-5xl">
            {title}
          </h1>

          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-[var(--app-muted)]">
            {description}
          </p>

          <Link href={actionHref} className="buizz-button-primary mt-6 px-5">
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}