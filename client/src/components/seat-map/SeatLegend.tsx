"use client";

import { Armchair, CircleSlash, LockKeyhole, Sparkles, Ticket } from "lucide-react";

import type { SeatStatus } from "@/features/seat-map/types";
import { seatStatusStyles } from "@/features/seat-map/utils";

const items: { label: string; status: SeatStatus; icon: typeof Armchair }[] = [
  { label: "Available", status: "available", icon: Armchair },
  { label: "Selected", status: "selected", icon: Ticket },
  { label: "Booked", status: "booked", icon: LockKeyhole },
  { label: "Blocked", status: "blocked", icon: CircleSlash },
  { label: "Reserved", status: "reserved", icon: Sparkles },
];

export function SeatLegend() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map(({ label, status, icon: Icon }) => (
        <span key={status} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-white px-3 text-xs font-bold text-[var(--app-foreground)] shadow-sm">
          <span className={`grid size-6 place-items-center rounded-lg border text-[10px] ${seatStatusStyles[status]}`}>
            <Icon className="size-3.5" />
          </span>
          {label}
        </span>
      ))}
    </div>
  );
}
