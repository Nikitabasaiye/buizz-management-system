import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TicketSelection {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  price: number;
}

interface BookingState {
  selections: TicketSelection[];
  currentBooking: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: BookingState = {
  selections: [],
  currentBooking: null,
  loading: false,
  error: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelections: (state, action: PayloadAction<TicketSelection[]>) => {
      state.selections = action.payload;
    },
    addSelection: (state, action: PayloadAction<TicketSelection>) => {
      const existingIndex = state.selections.findIndex(
        (s) => s.ticketTypeId === action.payload.ticketTypeId
      );
      if (existingIndex >= 0) {
        state.selections[existingIndex] = action.payload;
      } else {
        state.selections.push(action.payload);
      }
    },
    removeSelection: (state, action: PayloadAction<string>) => {
      state.selections = state.selections.filter(
        (s) => s.ticketTypeId !== action.payload
      );
    },
    clearSelections: (state) => {
      state.selections = [];
    },
    setCurrentBooking: (state, action: PayloadAction<any>) => {
      state.currentBooking = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setSelections,
  addSelection,
  removeSelection,
  clearSelections,
  setCurrentBooking,
  setLoading,
  setError,
  clearError,
} = bookingSlice.actions;

export default bookingSlice.reducer;
