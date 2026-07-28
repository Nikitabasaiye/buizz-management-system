"use client";

import type { SeatMapLayout, SeatMapSelectionItem } from "@/features/seat-map/types";
import { FlatSectionGrid } from "@/components/seat-map/rendering-parts";

export function TableRenderer(props: {
  layout: SeatMapLayout;
  selected: SeatMapSelectionItem[];
  onSelectionChange: (items: SeatMapSelectionItem[]) => void;
  maxSelection: number;
  readonly?: boolean;
}) {
  return <FlatSectionGrid {...props} title="Tables" />;
}
