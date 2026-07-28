"use client";

import { useGetPaymentHistoryQuery } from "@/store/api/paymentsApi";
import { usePaymentLiveStatus } from "@/hooks/usePaymentLiveStatus";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-[#22C55E]/15 text-[#16A34A]",
  failed:    "bg-[#EF4444]/10 text-[#DC2626]",
  refunded:  "bg-[#8B5CF6]/10 text-[#7C3AED]",
  pending:   "bg-[#F59E0B]/10 text-[#D97706]",
};

const SOURCE_LABELS: Record<string, string> = {
  webhook:    "Webhook",
  verify_api: "Client Verify",
  callback:   "Callback",
  refund:     "Refund",
  create:     "Created",
  manual:     "Manual",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-[var(--app-subtle)] text-[var(--app-muted)]";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${cls}`}>
      {status}
    </span>
  );
}

export function PaymentHistoryPanel({ orderId }: { orderId: string }) {
  const { data, isLoading, isError } = useGetPaymentHistoryQuery(orderId, { skip: !orderId });
  const { status: liveStatus } = usePaymentLiveStatus(orderId);

  if (!orderId) return null;

  return (
    <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
            Payment History
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
            Order: {orderId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[var(--app-muted)]">Live:</span>
          <StatusBadge status={liveStatus} />
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)]">
          <span className="size-4 animate-spin rounded-full border-2 border-[var(--app-border)] border-t-[var(--color-brand-primary)]" />
          Loading history…
        </div>
      )}

      {isError && (
        <p className="mt-4 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/8 px-3 py-2 text-sm font-black text-[#DC2626]">
          Failed to load payment history.
        </p>
      )}

      {!isLoading && !isError && data?.data && (
        <div className="mt-4 space-y-2">
          {data.data.length === 0 && (
            <p className="text-sm font-semibold text-[var(--app-muted)]">No history entries yet.</p>
          )}
          {data.data.map((entry) => (
            <div
              key={entry.id}
              className="grid gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 sm:grid-cols-[auto_1fr_auto]"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] px-2 py-1 text-[10px] font-black uppercase text-[var(--app-muted)]">
                  {entry.gateway || "—"}
                </span>
                <span className="text-[10px] font-black uppercase text-[var(--app-muted)]">
                  {SOURCE_LABELS[entry.source] || entry.source}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {entry.from_status && (
                    <>
                      <StatusBadge status={entry.from_status} />
                      <span className="text-xs text-[var(--app-muted)]">→</span>
                    </>
                  )}
                  <StatusBadge status={entry.to_status} />
                </div>
                {entry.gateway_payment_id && (
                  <p className="mt-1 truncate text-[11px] font-semibold text-[var(--app-muted)]">
                    TXN: {entry.gateway_payment_id}
                  </p>
                )}
                {entry.error_description && (
                  <p className="mt-1 text-[11px] font-semibold text-[#DC2626]">
                    {entry.error_description}
                  </p>
                )}
              </div>

              <p className="shrink-0 text-right text-[11px] font-semibold text-[var(--app-muted)]">
                {new Date(entry.created_at).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
