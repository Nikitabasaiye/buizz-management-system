import { create } from "zustand";
import type { EventSummary } from "@/types";

type EventState = {
  selectedEvent: EventSummary | null;
  setSelectedEvent: (event: EventSummary | null) => void;
};

export const useEventStore = create<EventState>((set) => ({
  selectedEvent: null,
  setSelectedEvent: (selectedEvent) => set({ selectedEvent }),
}));
