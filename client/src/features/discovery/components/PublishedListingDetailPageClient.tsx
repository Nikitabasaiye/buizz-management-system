"use client";

import { useMemo } from "react";

import { ListingDetailPage } from "@/features/booking/ListingDetailPage";
import type { DiscoveryItem } from "@/features/discovery/data";
import { serverEventToDiscoveryItem } from "@/features/discovery/serverEventAdapter";
import { useGetEventByIdQuery, useGetEventBySlugQuery } from "@/store/api";

function isNumericServerId(id: string) {
    return /^\d+$/.test(id.trim());
}

function isSlugId(id: string) {
    const trimmed = id.trim();
    return (
        !isNumericServerId(trimmed) &&
        /^[a-z0-9-]+$/.test(trimmed) &&
        trimmed.includes("-") &&
        trimmed.length > 4
    );
}

export function PublishedListingDetailPageClient({
    id,
    kind,
}: {
    id: string;
    kind: DiscoveryItem["kind"];
}) {
    const numericId = isNumericServerId(id);
    const slugId = !numericId && isSlugId(id);

    const { data: byIdData, isLoading: byIdLoading } = useGetEventByIdQuery(Number(id), {
        skip: !numericId,
    });
    const { data: bySlugData, isLoading: bySlugLoading } = useGetEventBySlugQuery(id, {
        skip: !slugId,
    });

    const item = useMemo(() => {
        const event = byIdData?.data ?? bySlugData?.data;
        if (!event) return null;

        const next = serverEventToDiscoveryItem(event);
        return next.kind === kind ? next : null;
    }, [byIdData?.data, bySlugData?.data, kind]);

    if (item) {
        return <ListingDetailPage item={item} requestedId={id} />;
    }

    if ((numericId && byIdLoading) || (slugId && bySlugLoading)) {
        return (
            <main className="min-h-screen bg-[var(--app-background)] px-4 py-20 text-[var(--app-foreground)]">
                <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center shadow-sm">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                        Loading
                    </p>
                    <h1 className="mt-3 text-2xl font-black">Opening event details...</h1>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--app-background)] px-4 py-20 text-[var(--app-foreground)]">
            <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                    Not Available
                </p>

                <h1 className="mt-3 text-2xl font-black">This listing is not available.</h1>

                <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
                    Only published Buizz events with valid backend records are shown on the public website.
                </p>
            </div>
        </main>
    );
}
