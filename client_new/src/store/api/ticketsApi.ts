import { baseApi } from './baseApi';

interface Ticket {
  id: number;
  ticket_number: string;
  booking_id: number;
  event_id: number;
  ticket_type_id: number;
  user_id: number;
  qr_code?: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  scanned_at?: string;
  scanned_by?: number;
  created_at: string;
  updated_at: string;
}

interface TicketsResponse {
  status: string;
  data: Ticket[];
}

interface TicketResponse {
  status: string;
  data: Ticket;
}

interface ScanTicketResponse {
  status: string;
  message: string;
  data: Ticket;
}

export const ticketsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyTickets: builder.query<TicketsResponse, void>({
      query: () => '/tickets/my-tickets',
      providesTags: ['Tickets'],
    }),
    getTicketByNumber: builder.query<TicketResponse, string>({
      query: (ticketNumber) => `/tickets/${ticketNumber}`,
      providesTags: (result, error, ticketNumber) => [{ type: 'Tickets', id: ticketNumber }],
    }),
    scanTicket: builder.mutation<ScanTicketResponse, string>({
      query: (ticketNumber) => ({
        url: `/tickets/${ticketNumber}/scan`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, ticketNumber) => [{ type: 'Tickets', id: ticketNumber }, 'Tickets'],
    }),
    cancelTicket: builder.mutation<{ status: string; message: string }, string>({
      query: (ticketNumber) => ({
        url: `/tickets/${ticketNumber}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, ticketNumber) => [{ type: 'Tickets', id: ticketNumber }, 'Tickets'],
    }),
    getEventTickets: builder.query<TicketsResponse, number>({
      query: (eventId) => `/tickets/event/${eventId}`,
      providesTags: (result, error, eventId) => [{ type: 'Tickets', id: `event-${eventId}` }],
    }),
  }),
});

export const {
  useGetMyTicketsQuery,
  useGetTicketByNumberQuery,
  useScanTicketMutation,
  useCancelTicketMutation,
  useGetEventTicketsQuery,
} = ticketsApi;
