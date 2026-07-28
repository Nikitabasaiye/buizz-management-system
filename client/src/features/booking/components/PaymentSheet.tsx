"use client";

import {
  CalendarDays,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  QrCode,
  ShieldCheck,
  Tag,
  Ticket,
  Users,
  X,
  Zap,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BookingLineItem } from "@/store/ticket.store";
import type { DiscoveryItem } from "@/features/discovery/data";

type PaymentSheetProps = {
  open: boolean;
  onClose: () => void;
  onPay: () => Promise<void>;
  item: DiscoveryItem;
  date: string;
  time: string;
  venue: string;
  city: string;
  lineItems: BookingLineItem[];
  ticketQuantity: number;
  subtotal: number;
  platformFee: number;
  convenienceFee: number;
  taxes: number;
  total: number;
  isFreeRegistration: boolean;
  isPaymentLoading: boolean;
  paymentMessage: string;
  selectedSeats?: string[];
};

export function PaymentSheet({
  open,
  onClose,
  onPay,
  item,
  date,
  time,
  venue,
  city,
  lineItems,
  ticketQuantity,
  subtotal,
  platformFee,
  convenienceFee,
  taxes,
  total,
  isFreeRegistration,
  isPaymentLoading,
  paymentMessage,
  selectedSeats = [],
}: PaymentSheetProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSummaryExpanded(false);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const ticketLabel = lineItems.map((l) => `${l.label} x${l.quantity}`).join(", ");
  const seatLabel = selectedSeats.length
    ? selectedSeats.slice(0, 6).join(", ") + (selectedSeats.length > 6 ? ` +${selectedSeats.length - 6} more` : "")
    : null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Payment checkout"
    >
      <div className="relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white text-[#101828] shadow-[0_-24px_80px_rgba(0,0,0,0.30)] sm:max-w-[480px] sm:rounded-[2rem]">

        {/* drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#ec1b72]/10 text-[#ec1b72]">
              <Lock className="size-4" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#ec1b72]">
                Secure Checkout
              </p>
              <p className="text-base font-black leading-tight text-[#101828]">
                {isFreeRegistration ? "Complete Registration" : "Complete Payment"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPaymentLoading}
            className="grid size-9 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-[#ec1b72]/40 hover:text-[#ec1b72] disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* event summary */}
          <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-[#f8f9fd]">
            <div className="flex gap-3 p-3">
              <img
                src={item.image}
                alt={item.title}
                className="size-16 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-black leading-tight text-[#101828]">
                  {item.title}
                </p>
                <div className="mt-1.5 grid gap-1 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3 shrink-0 text-[#ec1b72]" />
                    {date}{time && ` • ${time}`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3 shrink-0 text-[#ec1b72]" />
                    <span className="truncate">{venue}, {city}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Ticket className="size-3.5 shrink-0 text-[#ec1b72]" />
                  <span className="line-clamp-1">{ticketLabel}</span>
                </div>
                <span className="shrink-0 rounded-full bg-[#ec1b72]/10 px-2 py-0.5 text-[10px] font-black text-[#ec1b72]">
                  {ticketQuantity} ticket{ticketQuantity !== 1 ? "s" : ""}
                </span>
              </div>
              {seatLabel && (
                <div className="mt-1.5 flex items-start gap-2 text-[11px] font-semibold text-slate-500">
                  <Users className="mt-0.5 size-3 shrink-0" />
                  <span>{seatLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* fare breakdown */}
          <div className="mx-4 mt-3 overflow-hidden rounded-2xl border border-slate-100">
            <button
              type="button"
              onClick={() => setSummaryExpanded(false)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-black text-[#101828] transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Tag className="size-4 text-[#ec1b72]" />
                Total Payable
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#ec1b72]">
                  ₹{total.toLocaleString("en-IN")}
                </span>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform ${summaryExpanded ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {summaryExpanded && (
              <div className="border-t border-slate-100 px-4 pb-3 pt-2">
                <div className="space-y-2 text-sm">
                  {lineItems.map((line) => (
                    <FareRow
                      key={`${line.label}-${line.price}`}
                      label={`${line.label} × ${line.quantity}`}
                      value={`₹${(line.price * line.quantity).toLocaleString("en-IN")}`}
                    />
                  ))}
                  <div className="my-1 border-t border-dashed border-slate-200" />
                  <FareRow label="Subtotal" value={`₹${subtotal.toLocaleString("en-IN")}`} />
                  {convenienceFee > 0 && (
                    <FareRow label="Convenience fee" value={`₹${convenienceFee.toLocaleString("en-IN")}`} muted />
                  )}
                  {taxes > 0 && (
                    <FareRow label="Taxes & GST" value={`₹${taxes.toLocaleString("en-IN")}`} muted />
                  )}
                  <div className="my-1 border-t border-slate-200" />
                  <FareRow label="Total Payable" value={`₹${total.toLocaleString("en-IN")}`} strong />
                </div>
              </div>
            )}
          </div>

          {/* error message */}
          {paymentMessage && (
            <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-[#EF4444]/25 bg-[#EF4444]/8 px-3 py-2.5 text-sm font-semibold text-[#DC2626]">
              <X className="mt-0.5 size-4 shrink-0" />
              {paymentMessage}
            </div>
          )}

          {/* security badges */}
          <div className="mx-4 mb-2 mt-4 flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3 text-[#22C55E]" /> 256-bit SSL
            </span>
            <span className="flex items-center gap-1">
              <Lock className="size-3 text-[#22C55E]" /> PCI DSS Compliant
            </span>
            <span className="flex items-center gap-1">
              <Zap className="size-3 text-[#22C55E]" /> Instant Confirmation
            </span>
            <span className="flex items-center gap-1">
              <QrCode className="size-3 text-[#22C55E]" /> QR Ticket on Email
            </span>
          </div>
        </div>

        {/* sticky pay button */}
        <div className="border-t border-slate-100 bg-white px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={isPaymentLoading}
            onClick={onPay}
            className="relative flex min-h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#ec1b72] text-base font-black text-white shadow-[0_16px_40px_rgba(236,27,114,0.38)] transition hover:bg-[#d91665] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPaymentLoading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>Opening payment gateway…</span>
              </>
            ) : isFreeRegistration ? (
              <>
                <CheckCircle2 className="size-5" />
                <span>Confirm Free Registration</span>
              </>
            ) : (
              <>
                <CreditCard className="size-5" />
                <span>Pay ₹{total.toLocaleString("en-IN")}</span>
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">
            {isFreeRegistration
              ? "No payment required for this event"
              : "You will be redirected to the payment gateway"}
          </p>
        </div>
      </div>
    </div>
  );
}

function FareRow({
  label,
  value,
  strong = false,
  muted = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-base font-black text-[#101828]" : muted ? "text-slate-400" : "text-slate-700"}`}>
      <span className="min-w-0 font-semibold">{label}</span>
      <span className={`shrink-0 ${strong ? "font-black text-[#ec1b72]" : "font-semibold"}`}>{value}</span>
    </div>
  );
}
