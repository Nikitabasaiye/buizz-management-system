"use client";

import { useMemo } from "react";
import Link from "next/link";

import { BookingFlow } from "@/features/booking/BookingFlow";
import { BookingAuthGuard } from "@/features/auth/AuthGuards";
import { PageLogoLoader } from "@/components/common/BuizzLogoLoader";
import type { DiscoveryItem } from "@/features/discovery/data";
import { serverEventToDiscoveryItem } from "@/features/discovery/serverEventAdapter";
import { useGetEventByIdQuery, useGetEventBySlugQuery } from "@/store/api";

// Returns true only for positive integer IDs that map to MySQL rows
function isNumericServerId(id: string) {
    return /^\d+$/.test(id.trim());
}

// Returns true for lowercase hyphenated slugs that could be a server slug
// Excludes IDs with uppercase, underscores, or mixed patterns (localStorage-style)
function isSlugId(id: string) {
    const trimmed = id.trim();
    return (
        !isNumericServerId(trimmed) &&
        /^[a-z0-9-]+$/.test(trimmed) &&
        trimmed.includes("-") &&
        trimmed.length > 4
    );
}

export function PublishedBookingFlowClient({
    id,
    kind,
}: {
    id: string;
    kind?: DiscoveryItem["kind"];
}) {
    const numericId = isNumericServerId(id);
    const eventIdNumber = numericId ? Number(id) : 0;
    const slugId = !numericId && isSlugId(id);

    // Only query the server when the ID format matches what the server accepts
    const { data: byIdData, isLoading: byIdLoading } = useGetEventByIdQuery(eventIdNumber, {
        skip: !numericId,
    });
    const { data: bySlugData, isLoading: bySlugLoading } = useGetEventBySlugQuery(id, {
        skip: !slugId,
    });

    const serverEventData = byIdData ?? bySlugData;
    const serverLoading = (numericId && byIdLoading) || (slugId && bySlugLoading);

    const item = useMemo(() => {
        const event = serverEventData?.data;
        if (!event?.id) return null;
        const next = serverEventToDiscoveryItem(event);
        return !kind || next.kind === kind ? next : null;
    }, [serverEventData?.data, kind]);

    if (item) {
        return (
            <BookingAuthGuard>
                <BookingFlow item={item} />
            </BookingAuthGuard>
        );
    }

    // Only show loader if server is still loading AND we have no local fallback yet
    if (serverLoading) {
        return (
            <main className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
                <PageLogoLoader />
            </main>
        );
    }

    return (
        <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-4 py-20 text-[var(--app-foreground)]">
            <div className="mx-auto w-full max-w-xl rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center shadow-[0_18px_58px_rgba(15,23,42,0.08)] sm:rounded-[2rem] sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                    Booking Not Available
                </p>

                <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
                    This event is not open for booking.
                </h1>

                <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[var(--app-muted)]">
                    Only published Buizz events with valid booking setup can be booked.
                    Please check the event page again or explore other events.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href={`/${kind ?? "events"}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(236,27,114,0.28)] transition hover:bg-[#d91665]"
                    >
                        Explore Events
                    </Link>

                    <Link
                        href="/"
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 text-sm font-black text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/50"
                    >
                        Back Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
