"use client";

import { DoorOpen, Sofa } from "lucide-react";

import type { SeatMapLayout, SeatMapSection, SeatMapSelectionItem } from "@/features/seat-map/types";
import { formatCurrency, resolveSelectionKind } from "@/features/seat-map/utils";

type FlatProps = {
  layout: SeatMapLayout;
  selected: SeatMapSelectionItem[];
  onSelectionChange: (items: SeatMapSelectionItem[]) => void;
  maxSelection: number;
  readonly?: boolean;
  title: string;
};

export function FlatSectionGrid({ layout, selected, onSelectionChange, maxSelection, readonly, title }: FlatProps) {
  const toggleSection = (floorLabel: string, section: SeatMapSection, delta: number) => {
    if (readonly || section.status !== "available") return;
    const sectionItems = selected.filter((item) => item.sectionId === section.id);
    if (delta < 0) {
      const removeId = sectionItems.at(-1)?.id;
      if (!removeId) return;
      onSelectionChange(selected.filter((item) => item.id !== removeId));
      return;
    }
    if (selected.length >= maxSelection || sectionItems.length >= section.capacity) return;
    const nextIndex = sectionItems.length + 1;
    onSelectionChange([
      ...selected,
      {
        id: `${section.id}-${nextIndex}`,
        label: nextIndex > 1 ? `${section.label} ${nextIndex}` : section.label,
        sectionId: section.id,
        sectionLabel: section.label,
        floorLabel,
        price: section.price,
        kind: resolveSelectionKind(section),
      },
    ]);
  };

  return (
    <div className="grid gap-4">
      {layout.floors.map((floor) => (
        <section key={floor.id} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[var(--app-foreground)]">{title}</p>
            <p className="text-xs font-semibold text-[var(--app-muted)]">{floor.label}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {floor.sections.map((section) => {
              const selectedCount = selected.filter((item) => item.sectionId === section.id).length;
              return (
                <article key={section.id} className="rounded-xl border border-[var(--app-border)] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--app-foreground)]">{section.label}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{section.kind} / {section.capacity} capacity</p>
                    </div>
                    <span className="rounded-lg px-2 py-1 text-xs font-black text-white" style={{ backgroundColor: section.color }}>{formatCurrency(section.price)}</span>
                  </div>
                  <div className="mt-4 grid min-h-28 place-items-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] text-center">
                    {section.kind === "table" ? <Sofa className="size-9" style={{ color: section.color }} /> : <DoorOpen className="size-9" style={{ color: section.color }} />}
                    <p className="text-xs font-bold text-[var(--app-muted)]">{section.status}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => toggleSection(floor.label, section, -1)} className="grid size-9 place-items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-subtle)] text-lg font-black text-[var(--app-foreground)]">-</button>
                    <span className="text-sm font-black text-[var(--app-foreground)]">{selectedCount}</span>
                    <button type="button" onClick={() => toggleSection(floor.label, section, 1)} className="grid size-9 place-items-center rounded-lg bg-[var(--color-brand-secondary)] text-lg font-black text-white">+</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function CoordinateCanvas({ layout, selected, onSelectionChange, maxSelection, readonly, title }: FlatProps) {
  const floor = layout.floors[0];
  if (!floor) return null;
  const toggle = (section: SeatMapSection) => {
    const selectedItem = selected.find((item) => item.sectionId === section.id);
    if (selectedItem) {
      onSelectionChange(selected.filter((item) => item.id !== selectedItem.id));
      return;
    }
    if (readonly || selected.length >= maxSelection) return;
    onSelectionChange([
      ...selected,
      {
        id: section.id,
        label: section.label,
        sectionId: section.id,
        sectionLabel: section.label,
        floorLabel: floor.label,
        price: section.price,
        kind: resolveSelectionKind(section),
      },
    ]);
  };

  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-black text-[var(--app-foreground)]">{title}</p>
        <p className="text-xs font-semibold text-[var(--app-muted)]">Coordinate based layout</p>
      </div>
      <div className="relative h-[380px] overflow-hidden rounded-xl border border-dashed border-[#cbd5e1] bg-white">
        <div className="absolute left-1/2 top-3 w-56 -translate-x-1/2 rounded-xl bg-[var(--app-foreground)] px-4 py-2 text-center text-xs font-black uppercase text-white">Stage / Focus Area</div>
        {floor.sections.map((section) => {
          const active = selected.some((item) => item.sectionId === section.id);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => toggle(section)}
              className={`absolute rounded-xl border px-3 py-2 text-left text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 ${active ? "ring-4 ring-[var(--color-brand-primary)]/35" : ""}`}
              style={{
                left: `${section.x ?? 12}%`,
                top: `${section.y ?? 20}%`,
                width: `${section.width ?? 24}%`,
                height: `${section.height ?? 18}%`,
                backgroundColor: section.color,
              }}
            >
              <span className="block truncate">{section.label}</span>
              <span className="mt-1 block opacity-80">{formatCurrency(section.price)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
