"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Star, XCircle } from "lucide-react";

export type PlatformRating = {
  id: string;
  bookingId: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
  approvedBy?: "admin" | "super-admin";
};

const platformRatingsKey = "buizz-platform-ratings";
const fallbackSummary = {
  average: 0,
  count: 0,
  latest: [] as PlatformRating[],
};

function getRatingTone(status: PlatformRating["status"]) {
  if (status === "approved") {
    return "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]";
  }

  if (status === "rejected") {
    return "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]";
  }

  return "border-[var(--color-brand-accent)]/30 bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]";
}
export function PlatformRatingSummary() {
  const [ratings, setRatings] = useState<PlatformRating[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(platformRatingsKey);
      const parsed = raw ? (JSON.parse(raw) as PlatformRating[]) : [];
      if (Array.isArray(parsed)) setRatings(parsed);
    } catch {
      setRatings([]);
    }
  }, []);

  const summary = useMemo(() => {
    const approved = ratings.filter((item) => item.status === "approved");
    if (!approved.length) return fallbackSummary;

    const total = approved.reduce((sum, item) => sum + item.rating, 0);
    const average = total / approved.length;

    return {
      average,
      count: approved.length,
      latest: approved.slice(0, 3),
    };
  }, [ratings]);

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-10 top-10 size-72 rounded-full bg-[var(--color-brand-primary)]/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 size-80 rounded-full bg-[var(--color-brand-secondary)]/12 blur-3xl" />

      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)]/90 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--color-brand-primary),var(--color-brand-secondary),var(--color-brand-accent))]" />

        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <span className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/10 px-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
              Customer Rating
            </span>

            <h2 className="mt-5 max-w-xl text-3xl font-black tracking-tight text-[var(--app-foreground)] sm:text-4xl">
              Trusted by Buizz customers
            </h2>

            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--app-muted)]">
              Approved customer reviews appear here after Admin or Super Admin moderation.
            </p>

            <div className="mt-6 flex items-end gap-4">
              <p className="bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] bg-clip-text text-7xl font-black leading-none text-transparent">
                {summary.average.toFixed(1)}
              </p>

              <div className="pb-2">
                <div className="flex gap-1 text-[var(--color-brand-accent)]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className="size-5 drop-shadow-sm"
                      fill={index < Math.round(summary.average) ? "currentColor" : "none"}
                    />
                  ))}
                </div>

                <p className="mt-1 text-sm font-bold text-[var(--app-muted)]">
                  {summary.count
                    ? `Based on ${summary.count} approved booking ratings`
                    : "No approved booking ratings yet"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {summary.latest.length ? summary.latest.map((item) => (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/35 hover:shadow-[0_22px_60px_rgba(236,27,114,0.16)]"
              >
                <span className="pointer-events-none absolute inset-y-0 -left-20 w-14 rotate-12 bg-white/20 blur-md transition-all duration-700 group-hover:left-[120%]" />

                <div className="relative z-10">
                  <div className="flex gap-1 text-[var(--color-brand-accent)]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className="size-4"
                        fill={index < item.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>

                  <p className="mt-4 line-clamp-4 text-sm font-semibold leading-7 text-[var(--app-muted)]">
                    {item.comment || "Great booking experience on Buizz."}
                  </p>

                  <p className="mt-4 text-xs font-black text-[var(--color-brand-primary)]">
                    {item.bookingId}
                  </p>
                </div>
              </article>
            )) : (
              <div className="rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-6 text-center text-sm font-black text-[var(--app-muted)] md:col-span-3">
                Approved customer ratings will appear here after review.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PlatformRatingReview({
  role,
  canApprove = false,
}: {
  role: "admin" | "super-admin";
  canApprove?: boolean;
}) {
  const [ratings, setRatings] = useState<PlatformRating[]>([]);
  const canModerate = role === "super-admin" || canApprove;

  useEffect(() => {
    setRatings(readPlatformRatings());
  }, []);

  const updateRating = (id: string, status: PlatformRating["status"]) => {
    if (!canModerate) return;

    const next = ratings.map((item) =>
      item.id === id
        ? {
          ...item,
          status,
          approvedAt: status === "approved" ? new Date().toISOString() : item.approvedAt,
          approvedBy: status === "approved" ? role : item.approvedBy,
        }
        : item
    );

    setRatings(next);
    window.localStorage.setItem(platformRatingsKey, JSON.stringify(next));
  };

  const pending = ratings.filter((item) => item.status === "pending");
  const approved = ratings.filter((item) => item.status === "approved");
  const rejected = ratings.filter((item) => item.status === "rejected");

  return (
    <section className="grid gap-5">
      {role === "admin" && !canApprove ? (
        <div className="rounded-3xl border border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 p-4 text-sm font-black text-[var(--color-brand-primary)]">
          View-only access. Super Admin permission is required to approve or reject ratings.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <RatingStat label="Pending ratings" value={pending.length} tone="pending" />
        <RatingStat label="Approved public" value={approved.length} tone="approved" />
        <RatingStat label="Rejected" value={rejected.length} tone="rejected" />
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_22px_70px_rgba(15,23,42,0.10)] sm:p-5">
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
              Rating moderation
            </p>

            <h2 className="mt-1 text-2xl font-black text-[var(--app-foreground)]">
              Pending platform feedback
            </h2>
          </div>

          <p className="text-sm font-semibold text-[var(--app-muted)]">
            Only approved comments appear publicly.
          </p>
        </div>

        <div className="relative z-10 mt-5 grid gap-3">
          {pending.length ? (
            pending.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 transition duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/35 hover:shadow-[0_18px_50px_rgba(236,27,114,0.14)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/10 px-3 py-1 text-xs font-black text-[var(--color-brand-primary)]">
                        {item.bookingId}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-accent)]/12 px-3 py-1 text-sm font-black text-[var(--color-brand-accent)]">
                        <Star className="size-4 fill-current" />
                        {item.rating}/5
                      </span>

                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getRatingTone(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-semibold leading-7 text-[var(--app-muted)]">
                      {item.comment}
                    </p>

                    <p className="mt-2 text-xs font-bold text-[var(--app-muted)]">
                      Submitted {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-56">
                    <button
                      type="button"
                      disabled={!canModerate}
                      onClick={() => updateRating(item.id, "approved")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-4 text-xs font-black text-white shadow-[0_12px_28px_rgba(34,197,94,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-4" />
                      Approve
                    </button>

                    <button
                      type="button"
                      disabled={!canModerate}
                      onClick={() => updateRating(item.id, "rejected")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 px-4 text-xs font-black text-[var(--color-brand-primary)] transition hover:-translate-y-0.5 hover:bg-[var(--color-brand-primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle className="size-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-8 text-center">
              <Eye className="mx-auto size-9 text-[var(--color-brand-primary)]" />

              <p className="mt-3 text-base font-black text-[var(--app-foreground)]">
                No pending ratings
              </p>

              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                New booking feedback will arrive here with pending status.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RatingStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pending" | "approved" | "rejected";
}) {
  const toneClass = {
    pending: "from-[var(--color-brand-accent)]/18 to-transparent text-[var(--color-brand-accent)]",
    approved: "from-[#22C55E]/18 to-transparent text-[#22C55E]",
    rejected: "from-[var(--color-brand-primary)]/18 to-transparent text-[var(--color-brand-primary)]",
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/35 hover:shadow-[0_20px_60px_rgba(236,27,114,0.14)]">
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${toneClass}`} />

      <div className="relative z-10">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--app-muted)]">
          {label}
        </p>

        <p className={`mt-3 text-4xl font-black ${toneClass.split(" ").at(-1)}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function readPlatformRatings() {
  try {
    const raw = window.localStorage.getItem(platformRatingsKey);
    const parsed = raw ? (JSON.parse(raw) as PlatformRating[]) : [];

    if (Array.isArray(parsed) && parsed.length) return parsed;
    return [];
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
