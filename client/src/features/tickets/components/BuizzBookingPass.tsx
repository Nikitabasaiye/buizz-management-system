"use client";

import {
  CalendarDays,
  Clock3,
  Download,
  Eye,
  Info,
  MapPin,
  Music2,
  QrCode,
  Share2,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import type { ReactNode } from "react";

import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { TicketQrPreview } from "../TicketQrPreview";
import type {
  BuizzBookingPass as BuizzBookingPassData,
  BuizzBookingPassStatus,
} from "../ticket-utils";

export type BuizzBookingPassProps = {
  bookingPass?: BuizzBookingPassData;
  bookingId?: string;
  eventTitle?: string;
  eventSlug?: string;
  eventImage?: string;
  organizerName?: string;
  organizerLogo?: string;
  category?: string;
  categoryIcon?: ReactNode;
  dateLabel?: string;
  timeLabel?: string;
  venueName?: string;
  venueCity?: string;
  status?: BuizzBookingPassStatus;
  seatGroups?: {
    section: string;
    sectionColor?: string;
    totalSeats: number;
    seatNumbers: string[];
    amount: number;
  }[];
  totalSeats?: number;
  totalAmountPaid?: number;
  qrValue?: string;
  showActions?: boolean;
  previewMode?: boolean;
  onView?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
};

const statusStyles: Record<BuizzBookingPassStatus, string> = {
  valid: "bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.3)]",
  used: "bg-zinc-500 text-white shadow-[0_10px_24px_rgba(113,113,122,0.28)]",
  cancelled: "bg-red-500 text-white shadow-[0_10px_24px_rgba(239,68,68,0.28)]",
  refunded: "bg-amber-400 text-[#221300] shadow-[0_10px_24px_rgba(251,191,36,0.26)]",
  preview: "bg-[#EC1B72] text-white shadow-[0_10px_24px_rgba(236,27,114,0.3)]",
};

export function BuizzBookingPass({
  bookingPass,
  bookingId: bookingIdProp,
  eventTitle: eventTitleProp,
  eventImage: eventImageProp,
  organizerName: organizerNameProp = "Buizz Organizer",
  organizerLogo: organizerLogoProp,
  category: categoryProp,
  categoryIcon,
  dateLabel: dateLabelProp,
  timeLabel: timeLabelProp,
  venueName: venueNameProp,
  venueCity: venueCityProp,
  status: statusProp,
  seatGroups: seatGroupsProp,
  totalSeats: totalSeatsProp,
  totalAmountPaid: totalAmountPaidProp,
  qrValue: qrValueProp,
  showActions = true,
  previewMode = false,
  onView,
  onDownload,
  onShare,
}: BuizzBookingPassProps) {
  const bookingId = bookingPass?.bookingId ?? bookingIdProp ?? "BUIZZ-PREVIEW";
  const eventTitle = bookingPass?.eventTitle ?? eventTitleProp ?? "Buizz Event";
  const eventImage = bookingPass?.eventImage ?? eventImageProp;
  const organizerName = bookingPass?.organizerName ?? organizerNameProp;
  const organizerLogo = bookingPass?.organizerLogo ?? organizerLogoProp;
  const category = bookingPass?.category ?? categoryProp ?? "Event";
  const dateLabel = bookingPass?.dateLabel ?? dateLabelProp ?? "Date pending";
  const timeLabel = bookingPass?.timeLabel ?? timeLabelProp ?? "Time pending";
  const venueName = bookingPass?.venueName ?? venueNameProp ?? "Venue pending";
  const venueCity = bookingPass?.venueCity ?? venueCityProp;
  const status = bookingPass?.status ?? statusProp ?? "preview";
  const seatGroups = bookingPass?.seatGroups ?? seatGroupsProp ?? [];
  const totalSeats = bookingPass?.totalSeats ?? totalSeatsProp ?? 1;
  const totalAmountPaid = bookingPass?.totalAmountPaid ?? totalAmountPaidProp ?? 0;
  const qrValue = bookingPass?.qrValue ?? qrValueProp ?? "";
  const visibleGroups = seatGroups.length
    ? seatGroups
    : [{ section: "General", totalSeats: Math.max(1, totalSeats), seatNumbers: [`General x${Math.max(1, totalSeats)}`], amount: totalAmountPaid }];
  const disabledQr = status === "cancelled" || status === "refunded";

  return (
    <article
      className="relative mx-auto w-full max-w-[460px] overflow-visible text-white"
      data-ticket-preview={previewMode ? "true" : "false"}
    >
      <div className="relative overflow-hidden rounded-[32px] border border-[#EC1B72]/55 bg-[#08000d] shadow-[0_26px_80px_rgba(0,0,0,0.42)]">
        <div className="relative min-h-[170px] overflow-hidden p-4 sm:min-h-[188px]">
          {eventImage ? (
            <img src={eventImage} alt={eventTitle} className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(236,27,114,0.48),transparent_32%),linear-gradient(145deg,#21002d,#08000d_58%,#16001e)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/58 via-black/56 to-[#08000d]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08000d]/82 via-black/16 to-[#08000d]/62" />

          <div className="relative flex min-w-0 items-start justify-between gap-3">
            <BuizzLogo
              variant="dark"
              size="md"
              className="max-w-[128px] drop-shadow-[0_8px_18px_rgba(0,0,0,0.5)]"
            />
            <div className="flex min-w-0 items-start gap-2">
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-white">BUIZZ PASS</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusStyles[status]}`}>
                  {status}
                </span>
              </div>
              <OrganizerBadge name={organizerName} logo={organizerLogo} />
            </div>
          </div>

          <div className="relative mt-5 min-w-0">
            <h3 className="break-words text-xl font-black leading-tight text-white sm:text-2xl">
              {eventTitle}
            </h3>
            <p className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-[#EC1B72]/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#ff5ba5]">
              {categoryIcon ?? <Music2 className="size-4 shrink-0" />}
              <span className="truncate">{category || "Music"}</span>
            </p>
            <div className="mt-4 grid gap-2 text-xs font-bold text-white/88">
              <Meta icon={<CalendarDays className="size-4" />} value={dateLabel} />
              <Meta icon={<Clock3 className="size-4" />} value={timeLabel} />
              <Meta icon={<MapPin className="size-4" />} value={`${venueName}${venueCity ? `, ${venueCity}` : ""}`} />
            </div>
          </div>
        </div>

        <div className="relative border-t-2 border-dashed border-[#EC1B72]/75 p-4">
          <span className="absolute left-0 top-0 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#EC1B72]/55 bg-[var(--app-background,#fff)]" />
          <span className="absolute right-0 top-0 size-9 -translate-y-1/2 translate-x-1/2 rounded-full border border-[#EC1B72]/55 bg-[var(--app-background,#fff)]" />

          <div className="grid grid-cols-[minmax(0,1fr)_142px] items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#ff5ba5]">Booking ID</p>
              <p className="mt-2 break-all text-base font-black text-white sm:text-lg">{bookingId}</p>
              <div className="mt-3 grid gap-1 text-xs font-bold text-white/70">
                <Meta icon={<Ticket className="size-4" />} value={`${totalSeats} ${totalSeats === 1 ? "seat" : "seats"} on this pass`} />
                <Meta icon={<ShieldCheck className="size-4" />} value="Scan at Gate Entry" />
              </div>
            </div>
            <div className="min-w-0 text-center">
              <div className="mx-auto w-[134px] rounded-2xl border border-[#EC1B72]/65 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.34)]">
                {qrValue ? (
                  <TicketQrPreview type="entry" payload={qrValue} disabled={disabledQr} />
                ) : (
                  <div className="grid aspect-square place-items-center text-slate-900">
                    <QrCode className="size-14" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-[10px] font-black uppercase text-white/66">Scan at Gate Entry</p>
            </div>
          </div>

          <section className="mt-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[#ff5ba5]">Selected Seats</p>
              <p className="text-xs font-black text-white">{totalSeats} total</p>
            </div>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-white/14">
              <table className="w-full min-w-[360px] table-fixed border-collapse text-left text-[11px] text-white">
                <thead className="bg-white/[0.07] text-[10px] uppercase text-white/72">
                  <tr>
                    <th className="w-[28%] px-2 py-3 font-black">Section</th>
                    <th className="w-[18%] px-2 py-3 font-black">Total Seats</th>
                    <th className="w-[30%] px-2 py-3 font-black">Seat Numbers</th>
                    <th className="px-2 py-3 font-black">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGroups.map((group) => (
                    <tr key={`${group.section}-${group.seatNumbers.join("-")}`} className="border-t border-white/10">
                      <td className="break-words px-2 py-3 font-black" style={{ color: group.sectionColor || "#b56bff" }}>{group.section}</td>
                      <td className="px-2 py-3 font-black">{group.totalSeats}</td>
                      <td className="break-words px-2 py-3 font-black text-[#ff5ba5]">{group.seatNumbers.join(", ")}</td>
                      <td className="break-words px-2 py-3 font-black">{formatCurrency(group.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/14 pt-4">
            <p className="pb-1 text-[11px] font-black uppercase text-white/58">Total Amount Paid</p>
            <p className="text-2xl font-black leading-none text-[#ff5ba5]">{formatCurrency(totalAmountPaid)}</p>
          </div>

          <div className="mt-4 flex gap-2 border-t border-dashed border-white/18 pt-4 text-[11px] font-semibold leading-5 text-white/78">
            <Info className="mt-0.5 size-4 shrink-0 text-[#ff5ba5]" />
            <p>Please show this ticket at venue entry. This is a single entry ticket for all selected seats.</p>
          </div>

          {showActions ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <PassAction icon={<Eye className="size-4" />} label="View" onClick={onView} />
              <PassAction icon={<Download className="size-4" />} label="Download" onClick={onDownload} />
              <PassAction icon={<Share2 className="size-4" />} label="Share" onClick={onShare} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function OrganizerBadge({ name, logo }: { name: string; logo?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "BE";

  return (
    <div className="hidden text-center min-[360px]:block">
      <div className="grid size-11 place-items-center overflow-hidden rounded-full bg-white text-[#111827] shadow-[0_12px_24px_rgba(0,0,0,0.34)]">
        {logo ? <img src={logo} alt={name} className="size-full object-cover" /> : <span className="text-sm font-black text-[#EC1B72]">{initials}</span>}
      </div>
      <p className="mt-1 max-w-14 truncate text-[9px] font-black uppercase text-[#ff5ba5]">{name}</p>
    </div>
  );
}

function Meta({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[#ff5ba5]">{icon}</span>
      <span className="min-w-0 break-words">{value}</span>
    </span>
  );
}

function PassAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-[#EC1B72]/45 bg-white/[0.04] px-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#EC1B72]/20"
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function formatCurrency(amount: number) {
  return `\u20b9${Math.max(0, Math.round(amount)).toLocaleString("en-IN")}`;
}
