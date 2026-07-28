"use client";

import type { SeatMapSelectionItem } from "@/features/seat-map/types";
import { formatCurrency, selectionTotal } from "@/features/seat-map/utils";

export function PriceSummary({ selectedItems }: { selectedItems: SeatMapSelectionItem[] }) {
  const subtotal = selectionTotal(selectedItems);
  const fee = Math.round(subtotal * 0.04);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + fee + tax;

  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase text-[var(--color-brand-secondary)]">Price Summary</p>
      <div className="mt-4 space-y-2 text-sm font-semibold">
        <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
        <SummaryRow label="Convenience fee" value={formatCurrency(fee)} />
        <SummaryRow label="Taxes" value={formatCurrency(tax)} />
      </div>
      <div className="mt-4 border-t border-[var(--app-border)] pt-4">
        <SummaryRow label="Total" value={formatCurrency(total)} strong />
      </div>
    </section>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "text-lg font-black" : ""}`}>
      <span className="text-[var(--app-muted)]">{label}</span>
      <span className="text-right text-[var(--app-foreground)]">{value}</span>
    </div>
  );
}
