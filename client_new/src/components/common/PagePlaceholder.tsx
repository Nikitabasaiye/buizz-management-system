type PagePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PagePlaceholder({ eyebrow, title, description }: PagePlaceholderProps) {
  return (
    <main className="min-h-screen bg-[var(--app-background)] px-4 py-10 text-[var(--app-foreground)] sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[60vh] max-w-5xl flex-col justify-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)]">
          {description}
        </p>
      </section>
    </main>
  );
}
