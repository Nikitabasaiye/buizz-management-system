"use client";

import { AlertCircle } from "lucide-react";

import { CustomLayoutRenderer } from "@/components/seat-map/CustomLayoutRenderer";
import { ExactSeatRenderer } from "@/components/seat-map/ExactSeatRenderer";
import { GeneralEntryRenderer } from "@/components/seat-map/GeneralEntryRenderer";
import { RoomHallRenderer } from "@/components/seat-map/RoomHallRenderer";
import { SectionSeatRenderer } from "@/components/seat-map/SectionSeatRenderer";
import { TableRenderer } from "@/components/seat-map/TableRenderer";
import { TimeSlotRenderer } from "@/components/seat-map/TimeSlotRenderer";
import { ZoneRenderer } from "@/components/seat-map/ZoneRenderer";
import type { SeatMapLayout, SeatMapMode, SeatMapSelectionItem } from "@/features/seat-map/types";
import { formatLayoutType } from "@/features/seat-map/utils";

export function SeatMapRenderer({
  layout,
  mode = "customer",
  selected = [],
  onSelectionChange = () => undefined,
  maxSelection = 10,
  readonly = false,
}: {
  layout: SeatMapLayout;
  mode?: SeatMapMode;
  selected?: SeatMapSelectionItem[];
  onSelectionChange?: (selection: SeatMapSelectionItem[]) => void;
  maxSelection?: number;
  readonly?: boolean;
}) {
  const rendererProps = { layout, selected, onSelectionChange, maxSelection, readonly };

  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--app-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-[var(--color-brand-secondary)]">{formatLayoutType(layout.layoutType)} / {layout.provider}</p>
          <h2 className="mt-1 text-xl font-black text-[var(--app-foreground)]">{layout.venueName}</h2>
          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{layout.venueType} - {mode === "builder" ? "Builder preview" : "Customer selection"}</p>
        </div>
        <span className="inline-flex min-h-9 w-fit items-center rounded-xl bg-[var(--app-subtle)] px-3 text-xs font-black text-[var(--app-foreground)]">{selected.length}/{maxSelection} selected</span>
      </div>
      {layout.provider === "seatsio" ? <SeatsIoPlaceholder layout={layout} /> : null}
      {layout.provider === "custom" ? (
        <div className="p-4">
          {layout.stagePosition ? <Stage position={layout.stagePosition} /> : null}
          {layout.layoutType === "general-entry" ? <GeneralEntryRenderer {...rendererProps} /> : null}
          {layout.layoutType === "exact-seat" ? <ExactSeatRenderer {...rendererProps} /> : null}
          {layout.layoutType === "section-seat" ? <SectionSeatRenderer {...rendererProps} /> : null}
          {layout.layoutType === "zone" ? <ZoneRenderer {...rendererProps} /> : null}
          {layout.layoutType === "table" ? <TableRenderer {...rendererProps} /> : null}
          {layout.layoutType === "time-slot" ? <TimeSlotRenderer {...rendererProps} /> : null}
          {layout.layoutType === "room-hall" ? <RoomHallRenderer {...rendererProps} /> : null}
          {layout.layoutType === "custom-layout" ? <CustomLayoutRenderer {...rendererProps} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function Stage({ position }: { position: NonNullable<SeatMapLayout["stagePosition"]> }) {
  return (
    <div className="mb-4 grid place-items-center rounded-xl bg-[var(--app-foreground)] px-4 py-3 text-center text-white">
      <p className="text-[10px] font-black uppercase text-white/52">Stage - {position}</p>
      <p className="text-sm font-black">Performance / Screen Area</p>
    </div>
  );
}

function SeatsIoPlaceholder({ layout }: { layout: SeatMapLayout }) {
  return (
    <div className="p-4">
      <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-[var(--color-brand-secondary)]/35 bg-[var(--color-brand-secondary)]/5 p-6 text-center">
        <div>
          <AlertCircle className="mx-auto size-9 text-[var(--color-brand-secondary)]" />
          <h3 className="mt-3 text-xl font-black text-[var(--app-foreground)]">Seats.io chart placeholder</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--app-muted)]">
            Later, mount the Seats.io chart here with chart key {layout.seatsIoChartKey || "not configured"}, event key {layout.seatsIoEventKey || "not configured"}, and workspace key {layout.seatsIoWorkspaceKey || "not configured"}.
          </p>
        </div>
      </div>
    </div>
  );
}
