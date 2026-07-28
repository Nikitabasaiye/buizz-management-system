"use client";

import { CheckCircle, Copy, Eye, Send, Trash2, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";

import type { SeatMapLayout, SeatMapRole, SeatMapStatus } from "@/features/seat-map/types";
import { formatCurrency, formatLayoutType, formatSeatMapDate } from "@/features/seat-map/utils";
import { getLayoutStats } from "@/features/seat-map/sampleLayouts";

export function SavedLayoutCard({
  layout,
  role,
  onPreview,
  onEdit,
  onDuplicate,
  onStatus,
  onDelete,
}: {
  layout: SeatMapLayout;
  role: SeatMapRole;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onStatus: (status: SeatMapStatus) => void;
  onDelete: () => void;
}) {
  const stats = getLayoutStats(layout);
  const canApprove = role === "super-admin";
  const canPublish = role === "super-admin" || role === "admin";
  const canDelete = role === "super-admin" || role === "organizer";

  return (
    <article className="rounded-xl border border-[var(--app-border)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black text-[var(--app-foreground)]">{layout.venueName}</h3>
            <StatusPill status={layout.metadata.status} />
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{formatLayoutType(layout.layoutType)} / Provider: {layout.provider === "seatsio" ? "Seats.io" : "Custom"}</p>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-sm font-black text-[var(--color-brand-secondary)]">{formatCurrency(stats.minPrice)} onwards</p>
          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{stats.capacity.toLocaleString("en-IN")} capacity</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-bold text-[var(--app-muted)] sm:grid-cols-2 lg:grid-cols-4">
        <span>Created by: {layout.metadata.createdByRole}</span>
        <span>Event: {layout.eventId || "Not linked"}</span>
        <span>Updated: {formatSeatMapDate(layout.metadata.updatedAt)}</span>
        <span>Sections: {stats.sections}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton label="Preview" icon={<Eye className="size-4" />} onClick={onPreview} />
        <ActionButton label="Edit" onClick={onEdit} />
        <ActionButton label="Duplicate" icon={<Copy className="size-4" />} onClick={onDuplicate} />
        {role === "organizer" ? <ActionButton label="Submit" icon={<Send className="size-4" />} onClick={() => onStatus("pending")} /> : null}
        {canApprove ? <ActionButton label="Approve" icon={<CheckCircle className="size-4" />} onClick={() => onStatus("approved")} /> : null}
        {canPublish ? <ActionButton label="Publish" icon={<UploadCloud className="size-4" />} onClick={() => onStatus("published")} /> : null}
        {canDelete ? <ActionButton label="Delete" icon={<Trash2 className="size-4" />} onClick={onDelete} danger /> : null}
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: SeatMapStatus }) {
  const tone =
    status === "published"
      ? "bg-[#22C55E]/10 text-[#22C55E]"
      : status === "approved"
        ? "bg-[var(--color-brand-secondary)]/10 text-[var(--color-brand-secondary)]"
        : status === "pending"
          ? "bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]"
          : "bg-[var(--app-subtle)] text-[var(--app-muted)]";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${tone}`}>{status}</span>;
}

function ActionButton({ label, icon, danger, onClick }: { label: string; icon?: ReactNode; danger?: boolean; onClick: () => void }) {
  const toneClass = danger
    ? "border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444] hover:text-white dark:hover:bg-[#EF4444]"
    : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-foreground)] hover:border-[var(--color-brand-secondary)]/40 hover:text-[var(--color-brand-secondary)] dark:border-[var(--app-border)] dark:bg-[var(--app-subtle)] dark:text-white dark:hover:bg-[var(--app-hover)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-xs font-black transition ${toneClass}`}
    >
      {icon}
      {label}
    </button>
  );
}
