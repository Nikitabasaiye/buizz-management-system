"use client";

import dynamic from "next/dynamic";

import type { Role } from "./SharedDashboardComponents";

function DashboardLoadingState() {
    return (
        <main className="min-h-screen bg-[var(--app-background)] p-4 text-[var(--app-foreground)] sm:p-6">
            <section className="mx-auto grid min-h-[70vh] max-w-xl place-items-center text-center">
                <div className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
                    <div className="mx-auto size-12 animate-spin rounded-full border-4 border-[var(--app-border)] border-t-[var(--color-brand-primary)]" />

                    <h1 className="mt-5 text-xl font-black text-[var(--app-foreground)]">
                        Loading Buizz dashboard
                    </h1>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                        Preparing your secure dashboard workspace...
                    </p>
                </div>
            </section>
        </main>
    );
}

const RoleDashboardPage = dynamic(
    () =>
        import("./RoleDashboardPages").then((module) => module.RoleDashboardPage),
    {
        ssr: false,
        loading: () => <DashboardLoadingState />,
    },
);

export function DashboardRouteClient({
    role,
    section,
}: {
    role: Role;
    section: string;
}) {
    return <RoleDashboardPage role={role} section={section || "dashboard"} />;
}