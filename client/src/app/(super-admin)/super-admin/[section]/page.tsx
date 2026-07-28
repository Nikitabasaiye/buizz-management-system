import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-[var(--app-background)] p-4 text-[var(--app-foreground)]">
      <section className="mx-auto grid min-h-[70vh] max-w-xl place-items-center text-center">
        <div className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-6">
          <div className="mx-auto size-12 animate-spin rounded-full border-4 border-[var(--app-border)] border-t-[var(--color-brand-primary)]" />
          <p className="mt-5 text-sm font-semibold text-[var(--app-muted)]">Loading...</p>
        </div>
      </section>
    </main>
  );
}

export default async function SuperAdminSectionRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RoleDashboardPage role="super-admin" section={section} />
    </Suspense>
  );
}
