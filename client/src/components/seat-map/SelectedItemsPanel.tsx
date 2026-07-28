"use client";

import { Ticket, X } from "lucide-react";

import type { SeatMapSelectionItem } from "@/features/seat-map/types";
import { formatCurrency } from "@/features/seat-map/utils";

export function SelectedItemsPanel({
  selectedItems,
  onRemove,
}: {
  selectedItems: SeatMapSelectionItem[];
  onRemove?: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--color-brand-secondary)]">Selected Items</p>
          <h3 className="mt-1 text-lg font-black text-[var(--app-foreground)]">{selectedItems.length} selected</h3>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-brand-secondary)]/10 text-[var(--color-brand-secondary)]">
          <Ticket className="size-5" />
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {selectedItems.length ? (
          selectedItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--app-foreground)]">{item.sectionLabel} - {item.label}</p>
                <p className="text-xs font-semibold text-[var(--app-muted)]">{item.floorLabel} / {item.kind}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[var(--color-brand-secondary)]">{formatCurrency(item.price)}</span>
                {onRemove ? (
                  <button type="button" aria-label={`Remove ${item.label}`} onClick={() => onRemove(item.id)} className="grid size-8 place-items-center rounded-lg hover:bg-[#ef4444]/10 hover:text-[#ef4444]">
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-semibold text-[var(--app-muted)]">
            No seats, passes, zones, rooms, or tables selected yet.
          </div>
        )}
      </div>
    </section>
  );
}
