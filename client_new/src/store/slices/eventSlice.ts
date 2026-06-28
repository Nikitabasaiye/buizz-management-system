import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Event {
  id: number;
  title: string;
  slug: string;
  city: string;
  start_date: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
}

interface EventState {
  selectedEvent: Event | null;
  filters: {
    category?: string;
    city?: string;
    search?: string;
  };
}

const initialState: EventState = {
  selectedEvent: null,
  filters: {},
};

const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    setSelectedEvent: (state, action: PayloadAction<Event | null>) => {
      state.selectedEvent = action.payload;
    },
    setFilters: (state, action: PayloadAction<EventState['filters']>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const { setSelectedEvent, setFilters, clearFilters } = eventSlice.actions;
export default eventSlice.reducer;
