"use client";

import { Armchair } from "lucide-react";
import { useMemo } from "react";

import type { Seat, SeatMapLayout, SeatMapSection, SeatMapSelectionItem, SeatStatus } from "@/features/seat-map/types";
import { disabledSeatStatuses, seatStatusStyles } from "@/features/seat-map/utils";

export function ExactSeatRenderer({
  layout,
  selected,
  onSelectionChange,
  maxSelection,
  readonly,
}: {
  layout: SeatMapLayout;
  selected: SeatMapSelectionItem[];
  onSelectionChange: (items: SeatMapSelectionItem[]) => void;
  maxSelection: number;
  readonly?: boolean;
}) {
  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);

  const toggleSeat = (floorLabel: string, section: SeatMapSection, seat: Seat) => {
    if (readonly || disabledSeatStatuses.has(seat.status)) return;
    if (selectedIds.has(seat.id)) {
      onSelectionChange(selected.filter((item) => item.id !== seat.id));
      return;
    }
    if (selected.length >= maxSelection) return;
    onSelectionChange([
      ...selected,
      {
        id: seat.id,
        label: seat.label,
        sectionId: section.id,
        sectionLabel: section.label,
        floorLabel,
        price: seat.price,
        kind: "seat",
      },
    ]);
  };

  return (
    <div className="grid gap-4">
      {layout.floors.map((floor) => (
        <section key={floor.id} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[var(--app-foreground)]">{floor.label}</p>
            <p className="text-xs font-semibold text-[var(--app-muted)]">{floor.sections.length} section(s)</p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {floor.sections.map((section) => (
              <article key={section.id} className="rounded-xl border border-[var(--app-border)] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[var(--app-foreground)]">{section.label}</p>
                    <p className="text-xs font-semibold text-[var(--app-muted)]">Rs. {section.price} per seat</p>
                  </div>
                  <span className="rounded-lg px-2 py-1 text-xs font-black text-white" style={{ backgroundColor: section.color }}>{section.capacity}</span>
                </div>
                <div className="mt-4 grid gap-1.5">
                  {section.rows?.map((row) => (
                    <div key={row.id} className="grid grid-cols-[26px_minmax(0,1fr)] items-center gap-2">
                      <span className="text-[10px] font-black text-[var(--app-muted)]">{row.label}</span>
                      <div className="flex gap-1">
                        {row.seats.map((seat) => {
                          const status: SeatStatus = selectedIds.has(seat.id) ? "selected" : seat.status;
                          return (
                            <button
                              key={seat.id}
                              type="button"
                              title={`${section.label} ${seat.label}`}
                              disabled={disabledSeatStatuses.has(seat.status)}
                              onClick={() => toggleSeat(floor.label, section, seat)}
                              className={`grid size-7 place-items-center rounded-lg border text-[10px] font-black transition ${seatStatusStyles[status]}`}
                            >
                              {seat.label.replace(/[A-Z]/g, "") || <Armchair className="size-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
