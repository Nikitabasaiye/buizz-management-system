"use client";

import { Minus, Plus, Ticket } from "lucide-react";
import type { ReactNode } from "react";

import {
  getOnlineAvailableQuantity,
  getTicketBlockId,
  type BookingType,
  type CapacityTicketBlock,
  type PricingMode,
} from "@/features/booking/capacityEngine";

type CapacityTicketSelectionProps = {
  bookingType: BookingType;
  pricingMode: PricingMode;
  blocks: CapacityTicketBlock[];
  quantities: Record<string, number>;
  capacityMessage?: string;
  maxTickets?: number;
  onChange: (value: Record<string, number>) => void;
};

export function CapacityTicketSelection({
  bookingType,
  pricingMode,
  blocks,
  quantities,
  capacityMessage,
  maxTickets = 10,
  onChange,
}: CapacityTicketSelectionProps) {
  const totalQuantity = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  const isFree = pricingMode === "free" || bookingType === "free_registration";

  const updateQuantity = (block: CapacityTicketBlock, nextQuantity: number) => {
    const blockId = getTicketBlockId(block);
    const available = getOnlineAvailableQuantity(block);
    const cappedByBlock = Math.max(0, Math.min(available, nextQuantity));
    const otherSelected = totalQuantity - (quantities[blockId] ?? 0);
    const cappedByBooking = Math.max(0, Math.min(cappedByBlock, maxTickets - otherSelected));

    onChange({
      ...quantities,
      [blockId]: cappedByBooking,
    });
  };

  return (
    <section className="mx-auto w-full max-w-3xl min-w-0 max-w-[100vw] overflow-hidden px-0 pb-4 text-[var(--app-foreground)]">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.08)] sm:p-5">
        <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">
          {isFree ? "Registration" : "Tickets"}
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight">Select Tickets</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
          You can add up to {maxTickets} tickets only
        </p>

        <div className="mt-5 grid min-w-0 gap-3">
          {blocks.map((block) => {
            const blockId = getTicketBlockId(block);
            const quantity = quantities[blockId] ?? 0;
            const available = getOnlineAvailableQuantity(block);
            const soldOut = available <= 0 || block.status === "sold_out";
            const fastFilling = !soldOut && available <= Math.max(5, Math.ceil(Number(block.totalQuantity || 0) * 0.18));

            return (
              <article
                key={blockId}
                className={`grid min-w-0 gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                  soldOut ? "opacity-55" : ""
                }`}
              >
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
                      <Ticket className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-black uppercase leading-snug">{block.name}</h3>
                      <p className="mt-2 text-sm font-black">
                        {isFree || block.price === 0 ? "FREE" : `Rs. ${block.price.toLocaleString("en-IN")}`}
                        <span className={`ml-2 text-xs ${soldOut ? "text-[var(--app-muted)]" : fastFilling ? "text-[#F97316]" : "text-[#16A34A]"}`}>
                          {soldOut ? "Sold Out" : fastFilling ? "Fast Filling" : `${available.toLocaleString("en-IN")} available`}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {quantity > 0 ? (
                  <div className="inline-flex w-fit max-w-full items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-1">
                    <QuantityButton label={`Decrease ${block.name}`} disabled={quantity <= 0} onClick={() => updateQuantity(block, quantity - 1)}>
                      <Minus className="size-4" />
                    </QuantityButton>
                    <span className="grid size-10 place-items-center text-sm font-black">{quantity}</span>
                    <QuantityButton label={`Increase ${block.name}`} disabled={soldOut || totalQuantity >= maxTickets || quantity >= available} onClick={() => updateQuantity(block, quantity + 1)}>
                      <Plus className="size-4" />
                    </QuantityButton>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={soldOut || totalQuantity >= maxTickets}
                    onClick={() => updateQuantity(block, 1)}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--color-brand-primary)] px-5 text-sm font-black text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--app-border)] disabled:text-[var(--app-muted)] sm:w-auto"
                  >
                    Add
                  </button>
                )}
              </article>
            );
          })}
        </div>

        {capacityMessage ? (
          <p className="mt-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-sm font-black text-[#EF4444]">
            {capacityMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function QuantityButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-lg text-sm font-black transition hover:bg-[var(--app-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
