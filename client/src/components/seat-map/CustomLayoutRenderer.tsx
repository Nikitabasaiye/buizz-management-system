"use client";

import type { SeatMapLayout, SeatMapSelectionItem } from "@/features/seat-map/types";
import { CoordinateCanvas } from "@/components/seat-map/rendering-parts";

export function CustomLayoutRenderer(props: {
  layout: SeatMapLayout;
  selected: SeatMapSelectionItem[];
  onSelectionChange: (items: SeatMapSelectionItem[]) => void;
  maxSelection: number;
  readonly?: boolean;
}) {
  return <CoordinateCanvas {...props} title="Custom Layout" />;
}
