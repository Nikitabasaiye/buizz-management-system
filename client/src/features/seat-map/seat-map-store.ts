// "use client";

// import { create } from "zustand";
// import { persist } from "zustand/middleware";

// import { mockSeatMapLayouts } from "@/features/seat-map/mock-layouts";
// import type { SeatMapLayout, SeatMapStatus } from "@/features/seat-map/types";

// type SeatMapStore = {
//   layouts: SeatMapLayout[];
//   upsertLayout: (layout: SeatMapLayout) => void;
//   duplicateLayout: (layoutId: string) => void;
//   deleteLayout: (layoutId: string) => void;
//   setLayoutStatus: (layoutId: string, status: SeatMapStatus) => void;
// };

// export const useSeatMapStore = create<SeatMapStore>()(
//   persist(
//     (set) => ({
//       layouts: mockSeatMapLayouts,
//       upsertLayout: (layout) =>
//         set((state) => ({
//           layouts: [{ ...layout, metadata: { ...layout.metadata, updatedAt: new Date().toISOString() } }, ...state.layouts.filter((item) => item.id !== layout.id)],
//         })),
//       duplicateLayout: (layoutId) =>
//         set((state) => {
//           const source = state.layouts.find((layout) => layout.id === layoutId);
//           if (!source) return state;
//           const copy: SeatMapLayout = {
//             ...source,
//             id: `${source.id}-copy-${Date.now().toString(36)}`,
//             venueName: `${source.venueName} Copy`,
//             metadata: { ...source.metadata, status: "draft", updatedAt: new Date().toISOString() },
//           };
//           return { layouts: [copy, ...state.layouts] };
//         }),
//       deleteLayout: (layoutId) => set((state) => ({ layouts: state.layouts.filter((layout) => layout.id !== layoutId) })),
//       setLayoutStatus: (layoutId, status) =>
//         set((state) => ({
//           layouts: state.layouts.map((layout) =>
//             layout.id === layoutId ? { ...layout, metadata: { ...layout.metadata, status, updatedAt: new Date().toISOString() } } : layout
//           ),
//         })),
//     }),
//     { name: "buizz-seat-map-layouts-v2", version: 1 }
//   )
// );
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { mockSeatMapLayouts } from "@/features/seat-map/sampleLayouts";
import type { SeatMapLayout, SeatMapStatus } from "@/features/seat-map/types";

// Legacy Zustand adapter. Keep this only for older pages that still import useSeatMapStore.
// New Admin/Super Admin/Organizer/Public seat-map pages should use:
// seatMapTemplateStore.ts + eventSeatConfigStore.ts + publicSeatMapService.ts.

type SeatMapStore = {
  layouts: SeatMapLayout[];
  upsertLayout: (layout: SeatMapLayout) => void;
  duplicateLayout: (layoutId: string) => void;
  deleteLayout: (layoutId: string) => void;
  setLayoutStatus: (layoutId: string, status: SeatMapStatus) => void;
};

export const useSeatMapStore = create<SeatMapStore>()(
  persist(
    (set) => ({
      layouts: mockSeatMapLayouts,
      upsertLayout: (layout) =>
        set((state) => ({
          layouts: [{ ...layout, metadata: { ...layout.metadata, updatedAt: new Date().toISOString() } }, ...state.layouts.filter((item) => item.id !== layout.id)],
        })),
      duplicateLayout: (layoutId) =>
        set((state) => {
          const source = state.layouts.find((layout) => layout.id === layoutId);
          if (!source) return state;
          const copy: SeatMapLayout = {
            ...source,
            id: `${source.id}-copy-${Date.now().toString(36)}`,
            venueName: `${source.venueName} Copy`,
            metadata: { ...source.metadata, status: "draft", updatedAt: new Date().toISOString() },
          };
          return { layouts: [copy, ...state.layouts] };
        }),
      deleteLayout: (layoutId) => set((state) => ({ layouts: state.layouts.filter((layout) => layout.id !== layoutId) })),
      setLayoutStatus: (layoutId, status) =>
        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === layoutId ? { ...layout, metadata: { ...layout.metadata, status, updatedAt: new Date().toISOString() } } : layout,
          ),
        })),
    }),
    { name: "buizz-seat-map-layouts-legacy-adapter", version: 2 },
  ),
);
