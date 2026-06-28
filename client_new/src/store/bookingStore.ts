import { create } from "zustand";
import type { BookingTicketSelection } from "@/types";

type BookingState = {
  selections: BookingTicketSelection[];
  setSelections: (selections: BookingTicketSelection[]) => void;
  resetBooking: () => void;
};

export const useBookingStore = create<BookingState>((set) => ({
  selections: [],
  setSelections: (selections) => set({ selections }),
  resetBooking: () => set({ selections: [] }),
}));
