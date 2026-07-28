"use client";

import { Check, Eye, MessageSquareText, Printer, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { approveTicketDesign, rejectTicketDesign } from "./ticketApi";
import { TicketTemplate } from "./TicketTemplate";
import {
  loadTicketThemeRequests,
  saveTicketThemeRequests,
} from "./ticketMockData";
import { createBlankTicketPreview } from "./ticketPreviewData";
import type { TicketThemeRequest } from "./ticketTypes";

type ReviewStatusFilter = "All Status" | TicketThemeRequest["status"];
type PreviewTab = "Desktop Preview" | "Mobile Preview" | "Print Preview";

const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold outline-none focus:border-[var(--color-brand-primary)]";

const statusOptions: ReviewStatusFilter[] = [
  "All Status",
  "Pending",
  "Approved",
  "Changes Requested",
  "Rejected",
];

function statusTone(status: TicketThemeRequest["status"]) {
  if (status === "Approved") return "bg-[#22C55E]/15 text-[#22C55E]";
  if (status === "Rejected") return "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]";
  if (status === "Changes Requested") return "bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]";
  return "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]";
}

function ReviewStatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="min-w-[168px] snap-start rounded-[22px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] md:min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--app-muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-[var(--app-foreground)]">
        {value}
      </p>
    </article>
  );
}

export function TicketDesignReview() {
  const [requests, setRequests] = useState<TicketThemeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadTicketThemeRequests().then((data) => {
      setRequests(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
      }
      setLoading(false);
    });
  }, []);
  const [reviewNote, setReviewNote] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ReviewStatusFilter>("All Status");
  const [themeFilter, setThemeFilter] = useState("All Themes");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("Desktop Preview");

  const filteredRequests = requests.filter((request) => {
    const query = search.trim().toLowerCase();
    const haystack =
      `${request.id} ${request.organizerName} ${request.eventName} ${request.requestedSettings.themeKey}`.toLowerCase();

    const matchesSearch = !query || haystack.includes(query);
    const matchesStatus =
      statusFilter === "All Status" || request.status === statusFilter;
    const matchesTheme =
      themeFilter === "All Themes" ||
      request.requestedSettings.themeKey === themeFilter;
    const matchesDate =
      dateFilter === "All Dates" || request.submittedAt.includes(dateFilter);

    return matchesSearch && matchesStatus && matchesTheme && matchesDate;
  });

  const selected =
    requests.find((request) => request.id === selectedId) ?? requests[0];

  const themeOptions = Array.from(
    new Set(requests.map((request) => request.requestedSettings.themeKey)),
  );

  const requestedTicket = useMemo(
    () =>
      selected
        ? createBlankTicketPreview({
            bookingId: "BUIZZ-2458",
            ticketId: "BUIZZ-2458",
            event: {
              id: selected.eventId,
              slug: selected.eventId.toLowerCase(),
              title: selected.eventName,
              category: "",
              eventType: "",
              bannerUrl: "",
              date: "",
              startTime: "",
              endTime: "",
              venueName: "",
              venueAddress: "",
              city: "",
              state: "",
            },
            theme: {
              organizerSelectedThemeKey: selected.requestedSettings.themeKey,
              layoutType: selected.requestedSettings.layoutType,
              qrPosition: selected.requestedSettings.qrPosition,
              showAmount: selected.requestedSettings.showAmount,
              showBuyerName: selected.requestedSettings.showBuyerName,
              showOrganizerLogo: selected.requestedSettings.showOrganizerLogo,
              settings: selected.requestedSettings,
            },
          })
        : null,
    [selected],
  );

  const persistRequests = (next: TicketThemeRequest[]) => {
    setRequests(next);
    saveTicketThemeRequests(next);
  };

  const updateRequestStatus = async (
    status: TicketThemeRequest["status"],
    fallbackNote: string,
  ) => {
    if (!selected) return;

    if (status === "Approved") {
      await approveTicketDesign(selected.id, reviewNote || fallbackNote);
    }

    if (status === "Rejected") {
      await rejectTicketDesign(selected.id, reviewNote || fallbackNote);
    }

    const reviewedAt = new Date().toLocaleString("en-IN");
    const next = requests.map((request) =>
      request.id === selected.id
        ? {
            ...request,
            status,
            reviewedAt,
            reviewerNote: reviewNote || fallbackNote,
            rejectionReason:
              status === "Rejected" ? reviewNote || fallbackNote : undefined,
          }
        : request,
    );

    persistRequests(next);
    setNotice(`Design marked ${status.toLowerCase()}.`);
    setReviewNote("");
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All Status");
    setThemeFilter("All Themes");
    setDateFilter("All Dates");
  };

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-5">
      {notice ? (
        <p className="rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/10 p-3 text-sm font-black text-[#22C55E]">
          {notice}
        </p>
      ) : null}

      <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [-webkit-overflow-scrolling:touch] md:mx-0 md:grid md:grid-cols-4 md:px-0 md:pb-0">
        <ReviewStatCard
          label="Pending Designs"
          value={requests.filter((request) => request.status === "Pending").length}
        />
        <ReviewStatCard
          label="Approved"
          value={requests.filter((request) => request.status === "Approved").length}
        />
        <ReviewStatCard
          label="Changes Requested"
          value={
            requests.filter((request) => request.status === "Changes Requested")
              .length
          }
        />
        <ReviewStatCard
          label="Rejected"
          value={requests.filter((request) => request.status === "Rejected").length}
        />
      </div>

      <section className="grid gap-3 rounded-[22px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 md:grid-cols-[minmax(0,1fr)_180px_180px_160px_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search organizer, event, theme, request ID..."
          className={inputClass}
        />
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as ReviewStatusFilter)
          }
          className={inputClass}
        >
          {statusOptions.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <select
          value={themeFilter}
          onChange={(event) => setThemeFilter(event.target.value)}
          className={inputClass}
        >
          <option>All Themes</option>
          {themeOptions.map((theme) => (
            <option key={theme}>{theme}</option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className={inputClass}
        >
          <option>All Dates</option>
          <option>June</option>
          <option>2026</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-xs font-black"
        >
          Reset
        </button>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid max-h-[72dvh] content-start gap-3 overflow-y-auto rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
          {filteredRequests.map((request) => (
            <button
              key={request.id}
              type="button"
              onClick={() => setSelectedId(request.id)}
              className={`rounded-[18px] border p-3 text-left transition ${
                selected?.id === request.id
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10"
                  : "border-[var(--app-border)] bg-[var(--app-subtle)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{request.eventName}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-[var(--app-muted)]">
                    {request.organizerName}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusTone(request.status)}`}
                >
                  {request.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-[var(--app-muted)]">
                <span>{request.id}</span>
                <span>{request.requestedSettings.themeKey}</span>
                <span className="col-span-2">{request.submittedAt}</span>
              </div>
            </button>
          ))}
          {!filteredRequests.length ? (
            <p className="rounded-2xl bg-[var(--app-subtle)] p-4 text-sm font-black text-[var(--app-muted)]">
              No ticket design requests match these filters.
            </p>
          ) : null}
        </aside>

        {selected && requestedTicket ? (
          <section className="grid gap-5">
            <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                    {selected.id}
                  </p>
                  <h2 className="mt-1 break-words text-xl font-black text-[var(--app-foreground)]">
                    {selected.eventName}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
                    {selected.organizerName} submitted{" "}
                    {selected.requestedSettings.themeKey} on {selected.submittedAt}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-2 text-xs font-black ${statusTone(selected.status)}`}
                >
                  {selected.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <ReviewValue label="Theme" value={selected.requestedSettings.themeKey} />
                <ReviewValue label="Layout" value={selected.requestedSettings.layoutType} />
                <ReviewValue label="QR Position" value={selected.requestedSettings.qrPosition} />
                <ReviewValue
                  label="Reviewer"
                  value={selected.reviewedAt ? "Buizz Reviewer" : "Not reviewed"}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                <p className="text-xs font-black uppercase text-[var(--app-muted)]">
                  Audit Trail
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-foreground)]">
                  Submitted by {selected.organizerName} at {selected.submittedAt}.
                  {selected.reviewedAt
                    ? ` Reviewed at ${selected.reviewedAt}.`
                    : " Awaiting review."}
                  {selected.reviewerNote ? ` Note: ${selected.reviewerNote}` : ""}
                  {selected.rejectionReason
                    ? ` Reason: ${selected.rejectionReason}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
              <div className="flex flex-wrap gap-2">
                {(["Desktop Preview", "Mobile Preview", "Print Preview"] as PreviewTab[]).map(
                  (tab) => {
                    const Icon =
                      tab === "Mobile Preview"
                        ? Smartphone
                        : tab === "Print Preview"
                          ? Printer
                          : Eye;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPreviewTab(tab)}
                        className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black ${
                          previewTab === tab
                            ? "bg-[var(--color-brand-primary)] text-white"
                            : "border border-[var(--app-border)] bg-[var(--app-subtle)]"
                        }`}
                      >
                        <Icon className="size-4" />
                        {tab}
                      </button>
                    );
                  },
                )}
              </div>

              <div
                className={`mt-4 min-w-0 overflow-hidden ${
                  previewTab === "Mobile Preview"
                    ? "mx-auto max-w-[390px]"
                    : previewTab === "Print Preview"
                      ? "mx-auto max-w-[820px] bg-white p-3"
                      : ""
                }`}
              >
                <TicketTemplate
                  ticketData={requestedTicket}
                  mode={previewTab === "Print Preview" ? "print" : "admin"}
                  showActions={false}
                />
              </div>
            </div>

            <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
              <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
                Reviewer comment
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Reason, correction note, or approval comment..."
                  className="min-h-28 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-sm font-semibold normal-case outline-none"
                />
              </label>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    void updateRequestStatus(
                      "Approved",
                      "Required ticket elements verified.",
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-4 text-sm font-black text-white"
                >
                  <Check className="size-4" />
                  Approve Design
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void updateRequestStatus(
                      "Changes Requested",
                      "Please adjust required ticket layout details.",
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-brand-accent)]/30 bg-[var(--color-brand-accent)]/12 px-4 text-sm font-black text-[var(--color-brand-accent)]"
                >
                  <MessageSquareText className="size-4" />
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void updateRequestStatus(
                      "Rejected",
                      "Please correct QR placement or required terms.",
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white"
                >
                  <X className="size-4" />
                  Reject Design
                </button>
              </div>
            </section>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-[var(--app-foreground)]">
        {value}
      </p>
    </div>
  );
}
