// import type { EventSeatConfig, SeatMapSection, SeatMapSelectionItem, SeatMapTemplate, SeatStatus } from "@/features/seat-map/types";

// export const disabledSeatStatuses = new Set<SeatStatus>(["booked", "blocked", "reserved", "locked", "sold", "disabled", "unavailable"]);

// export const seatStatusStyles: Record<SeatStatus, string> = {
//   available: "border-[var(--app-border)] bg-white text-[var(--app-foreground)] hover:border-[var(--color-brand-secondary)] hover:bg-[var(--color-brand-secondary)] hover:text-white dark:border-[var(--app-border)] dark:bg-[var(--app-card)] dark:text-white dark:hover:bg-[var(--color-brand-primary)]",
//   selected: "border-[var(--color-brand-secondary)] bg-[var(--color-brand-secondary)] text-white shadow-[0_8px_22px_rgba(102,38,185,0.25)]",
//   booked: "cursor-not-allowed border-[var(--app-muted)]/40 bg-[var(--app-muted)]/20 text-[var(--app-muted)]",
//   blocked: "cursor-not-allowed border-[var(--app-foreground)]/30 bg-[var(--app-foreground)]/20 text-[var(--app-muted)]",
//   reserved: "cursor-not-allowed border-[var(--color-brand-accent)]/40 bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]",
//   locked: "cursor-not-allowed border-[var(--color-brand-accent)]/40 bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]",
//   sold: "cursor-not-allowed border-[var(--color-brand-primary)]/35 bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]",
//   disabled: "cursor-not-allowed border-[var(--app-muted)]/40 bg-[var(--app-muted)]/20 text-[var(--app-muted)]",
//   offline: "border-[#F97316]/50 bg-[#FFEDD5] text-[#C2410C]",
//   partner: "border-[#3B82F6]/50 bg-[#DBEAFE] text-[#1D4ED8]",
//   complimentary: "border-[#A855F7]/50 bg-[#F3E8FF] text-[#7E22CE]",
//   unavailable: "cursor-not-allowed border-[#CBD5E1] bg-[#F1F5F9] text-[#64748B]",
// };






// export function resolveSelectionKind(section: SeatMapSection): SeatMapSelectionItem["kind"] {
//   if (section.kind === "standing" || section.kind === "zone") return "zone";
//   if (section.kind === "table") return "table";
//   if (section.kind === "room" || section.kind === "hall") return "room";
//   if (section.kind === "seated" || section.kind === "vip-box") return section.rows?.length ? "seat" : "section";
//   return "pass";
// }

// export function selectionTotal(selection: SeatMapSelectionItem[]) {
//   return selection.reduce((sum, item) => sum + item.price, 0);
// }

// export function formatCurrency(value: number) {
//   return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
// }

// export function getSeatStatusLabel(status: SeatStatus) {
//   const labels: Record<SeatStatus, string> = {
//     available: "Available",
//     selected: "Selected",
//     booked: "Booked",
//     blocked: "Blocked",
//     reserved: "Reserved",
//     locked: "Locked",
//     sold: "Sold",
//     disabled: "Disabled",
//     offline: "Offline Counter",
//     partner: "BookMyShow",
//     complimentary: "Complimentary",
//     unavailable: "Unavailable",
//   };
//   return labels[status];
// }

// export function getEventSeatCounts(template: SeatMapTemplate, config?: EventSeatConfig) {
//   const statusFor = (seatId: string, fallback: SeatStatus) => config?.seatStatuses[seatId] ?? fallback;
//   return template.seats.reduce(
//     (counts, seat) => {
//       const status = statusFor(seat.id, seat.status);
//       const channel = config?.channelAllocations[seat.id] ?? seat.channel;
//       counts.total += 1;
//       if (status === "available" && channel === "buizz_online") counts.available += 1;
//       if (status === "offline" || channel === "offline_counter") counts.offline += 1;
//       if (status === "partner" || channel === "bookmyshow" || channel === "external_partner") counts.partner += 1;
//       if (status === "reserved") counts.reserved += 1;
//       if (status === "complimentary" || channel === "complimentary") counts.complimentary += 1;
//       if (status === "blocked" || status === "disabled" || status === "unavailable") counts.blocked += 1;
//       if (status === "sold") counts.sold += 1;
//       return counts;
//     },
//     { total: 0, available: 0, offline: 0, partner: 0, reserved: 0, complimentary: 0, blocked: 0, sold: 0 },
//   );
// }

// export { formatLayoutType, formatSeatMapDate } from "@/features/seat-map/sampleLayouts";
import type { EventSeatConfig, SeatMapSection, SeatMapSelectionItem, SeatMapTemplate, SeatStatus } from "@/features/seat-map/types";
import { toBackendChannel } from "@/features/seat-map/seatMapTemplateStore";

export const disabledSeatStatuses = new Set<SeatStatus>(["booked", "blocked", "reserved", "locked", "sold", "disabled", "unavailable"]);

export const seatStatusStyles: Record<SeatStatus, string> = {
  available: "border-[var(--app-border)] bg-white text-[var(--app-foreground)] hover:border-[var(--color-brand-secondary)] hover:bg-[var(--color-brand-secondary)] hover:text-white dark:border-[var(--app-border)] dark:bg-[var(--app-card)] dark:text-white dark:hover:bg-[var(--color-brand-primary)]",
  selected: "border-[var(--color-brand-secondary)] bg-[var(--color-brand-secondary)] text-white shadow-[0_8px_22px_rgba(102,38,185,0.25)]",
  booked: "cursor-not-allowed border-[var(--app-muted)]/40 bg-[var(--app-muted)]/20 text-[var(--app-muted)]",
  blocked: "cursor-not-allowed border-[var(--app-foreground)]/30 bg-[var(--app-foreground)]/20 text-[var(--app-muted)]",
  reserved: "cursor-not-allowed border-[var(--color-brand-accent)]/40 bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]",
  locked: "cursor-not-allowed border-[var(--color-brand-accent)]/40 bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]",
  sold: "cursor-not-allowed border-[var(--color-brand-primary)]/35 bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]",
  disabled: "cursor-not-allowed border-[var(--app-muted)]/40 bg-[var(--app-muted)]/20 text-[var(--app-muted)]",
  offline: "border-[#F97316]/50 bg-[#FFEDD5] text-[#C2410C]",
  partner: "border-[#3B82F6]/50 bg-[#DBEAFE] text-[#1D4ED8]",
  complimentary: "border-[#A855F7]/50 bg-[#F3E8FF] text-[#7E22CE]",
  unavailable: "cursor-not-allowed border-[#CBD5E1] bg-[#F1F5F9] text-[#64748B]",
  hold: "border-[#F59E0B]/50 bg-[#FEF3C7] text-[#B45309]",
  vip: "border-[#EC1B72]/50 bg-[#FCE7F3] text-[#BE185D]",
  staff: "border-[#0EA5E9]/50 bg-[#E0F2FE] text-[#0369A1]",
};

export function resolveSelectionKind(section: SeatMapSection): SeatMapSelectionItem["kind"] {
  if (section.kind === "standing" || section.kind === "zone") return "zone";
  if (section.kind === "table") return "table";
  if (section.kind === "room" || section.kind === "hall") return "room";

  if (section.kind === "seated" || section.kind === "vip-box") {
    return section.rows?.length ? "seat" : "section";
  }

  return "pass";
}

export function selectionTotal(selection: SeatMapSelectionItem[]) {
  return selection.reduce((sum, item) => sum + item.price, 0);
}

export function formatCurrency(value: number) {
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

export function getSeatStatusLabel(status: SeatStatus) {
  const labels: Record<SeatStatus, string> = {
    available: "Available",
    selected: "Selected",
    booked: "Booked",
    blocked: "Blocked",
    reserved: "Reserved",
    locked: "Locked",
    sold: "Sold",
    disabled: "Disabled",
    offline: "Offline Counter",
    partner: "BookMyShow / Partner",
    complimentary: "Complimentary",
    unavailable: "Unavailable",
    hold: "Hold",
    vip: "VIP",
    staff: "Staff/Crew",
  };
  return labels[status];
}

export function getEventSeatCounts(template: SeatMapTemplate, config?: EventSeatConfig) {
  const statusFor = (seatId: string, fallback: SeatStatus) => config?.seatStatuses[seatId] ?? fallback;
  return template.seats.reduce(
    (counts, seat) => {
      const status = statusFor(seat.id, seat.status as SeatStatus);
      const channel = config?.channelAllocations[seat.id] ?? toBackendChannel(String(seat.channel ?? seat.salesChannel ?? "buizz_online"));
      counts.total += 1;
      if (status === "available" && channel === "buizz_online") counts.available += 1;
      if (status === "offline" || channel === "offline_counter") counts.offline += 1;
      if (status === "partner" || channel === "bookmyshow" || channel === "external_partner") counts.partner += 1;
      if (status === "reserved") counts.reserved += 1;
      if (status === "complimentary" || channel === "complimentary") counts.complimentary += 1;
      if (status === "blocked" || status === "disabled" || status === "unavailable") counts.blocked += 1;
      if (status === "sold" || status === "booked") counts.sold += 1;
      return counts;
    },
    { total: 0, available: 0, offline: 0, partner: 0, reserved: 0, complimentary: 0, blocked: 0, sold: 0 },
  );
}

export function formatLayoutType(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatSeatMapDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
