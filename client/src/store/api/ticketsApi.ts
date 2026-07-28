import { apiSlice } from '../apiSlice';

export interface Ticket {
  ticket_number: string;
  event_id: number;
  user_id: number;
  payment_id: number;
  ticket_type: string;
  price: number;
  qr_code: string;
  qr_data?: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  scanned_at?: string;
  event_title?: string;
  event_date?: string;
  venue_name?: string;
  venue_address?: string;
  venue_city?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  order_id?: string;
  transaction_id?: string;
  created_at: string;
}

export interface TicketScanInfo {
  ticket: {
    ticketNumber: string;
    status: string;
    price: number;
    checkedIn: boolean;
    checkedInAt: string | null;
  };
  event: {
    id: number;
    title: string;
    description: string;
    type: string;
    startDate: string;
    endDate: string;
    venueName: string;
    venueAddress: string;
    venueCity: string;
    banner: string;
    status: string;
  };
}

export const ticketsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyTickets: builder.query<{
      success: boolean;
      data: { tickets: Ticket[]; page: number; limit: number };
    }, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/tickets/my-tickets', params }),
      providesTags: ['Ticket'],
    }),

    getTicketByNumber: builder.query<{ success: boolean; data: Ticket }, string>({
      query: (ticketNumber) => `/tickets/${ticketNumber}`,
      providesTags: (_, __, tn) => [{ type: 'Ticket', id: tn }],
    }),

    getTicketScanInfo: builder.query<{ success: boolean; data: TicketScanInfo }, string>({
      query: (ticketNumber) => `/tickets/${ticketNumber}/scan-info`,
    }),

    scanTicket: builder.mutation<{ success: boolean; message: string; data: Ticket }, string>({
      query: (ticketNumber) => ({ url: `/tickets/${ticketNumber}/scan`, method: 'POST' }),
      invalidatesTags: (_, __, tn) => [{ type: 'Ticket', id: tn }],
    }),

    cancelTicket: builder.mutation<{ success: boolean; message: string }, string>({
      query: (ticketNumber) => ({ url: `/tickets/${ticketNumber}/cancel`, method: 'POST' }),
      invalidatesTags: ['Ticket', 'Booking'],
    }),

    getEventTickets: builder.query<{
      success: boolean;
      data: { tickets: Ticket[]; page: number; limit: number };
    }, { eventId: number; page?: number; limit?: number }>({
      query: ({ eventId, ...params }) => ({ url: `/tickets/event/${eventId}`, params }),
      providesTags: ['Ticket'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetMyTicketsQuery,
  useGetTicketByNumberQuery,
  useGetTicketScanInfoQuery,
  useScanTicketMutation,
  useCancelTicketMutation,
  useGetEventTicketsQuery,
} = ticketsApi;
