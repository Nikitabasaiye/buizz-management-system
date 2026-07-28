"use client";

import { useState } from "react";

import { PriceSummary } from "@/components/seat-map/PriceSummary";
import { SeatLegend } from "@/components/seat-map/SeatLegend";
import { SeatMapRenderer } from "@/components/seat-map/SeatMapRenderer";
import { SelectedItemsPanel } from "@/components/seat-map/SelectedItemsPanel";
import type { SeatMapLayout, SeatMapSelectionItem } from "@/features/seat-map/types";

export function CustomerPreview({ layout }: { layout: SeatMapLayout }) {
  const [selectedItems, setSelectedItems] = useState<SeatMapSelectionItem[]>([]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4">
        <SeatLegend />
        <SeatMapRenderer layout={layout} mode="customer" selected={selectedItems} onSelectionChange={setSelectedItems} />
      </div>
      <aside className="grid h-fit gap-4">
        <SelectedItemsPanel selectedItems={selectedItems} onRemove={(id) => setSelectedItems((items) => items.filter((item) => item.id !== id))} />
        <PriceSummary selectedItems={selectedItems} />
      </aside>
    </div>
  );
}
