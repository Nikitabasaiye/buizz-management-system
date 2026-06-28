export function HeroBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid min-h-[420px] content-end rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
          Discover
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
          Premium event discovery for Maharashtra.
        </h1>
      </div>
    </section>
  );
}
