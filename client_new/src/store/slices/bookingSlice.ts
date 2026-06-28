import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TicketSelection {
  ticketTypeId: number;
  ticketTypeName: string;
  price: number;
  quantity: number;
}

interface BookingState {
  selections: TicketSelection[];
  customerDetails: {
    name?: string;
    email?: string;
    phone?: string;
  };
  currentBookingId?: string;
}

const initialState: BookingState = {
  selections: [],
  customerDetails: {},
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelections: (state, action: PayloadAction<TicketSelection[]>) => {
      state.selections = action.payload;
    },
    addSelection: (state, action: PayloadAction<TicketSelection>) => {
      const existing = state.selections.find(s => s.ticketTypeId === action.payload.ticketTypeId);
      if (existing) {
        existing.quantity = action.payload.quantity;
      } else {
        state.selections.push(action.payload);
      }
    },
    removeSelection: (state, action: PayloadAction<number>) => {
      state.selections = state.selections.filter(s => s.ticketTypeId !== action.payload);
    },
    setCustomerDetails: (state, action: PayloadAction<BookingState['customerDetails']>) => {
      state.customerDetails = { ...state.customerDetails, ...action.payload };
    },
    setCurrentBookingId: (state, action: PayloadAction<string>) => {
      state.currentBookingId = action.payload;
    },
    resetBooking: (state) => {
      state.selections = [];
      state.customerDetails = {};
      state.currentBookingId = undefined;
    },
  },
});

export const {
  setSelections,
  addSelection,
  removeSelection,
  setCustomerDetails,
  setCurrentBookingId,
  resetBooking,
} = bookingSlice.actions;
export default bookingSlice.reducer;
