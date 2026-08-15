import { baseApi } from './baseApi';

interface ScanTicketRequest {
  ticketNumber?: string;
  qrData?: string | object;
}

interface TicketDetails {
  ticketNumber: string;
  status: string;
  price: number;
  checkedIn: boolean;
  checkedInAt?: string;
}

interface EventDetails {
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
}

interface ScanResponse {
  success: boolean;
  message: string;
  data: unknown;
}

interface TicketDetailsResponse {
  success: boolean;
  data: {
    ticket: TicketDetails;
    event: EventDetails;
  };
}

export const qrApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    scanQrTicket: builder.mutation<ScanResponse, ScanTicketRequest>({
      query: (data) => ({
        url: '/qr/scan',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Tickets'],
    }),
    getTicketDetails: builder.query<TicketDetailsResponse, string>({
      query: (ticketNumber) => `/qr/details/${ticketNumber}`,
      providesTags: (result, error, ticketNumber) => [{ type: 'Tickets', id: ticketNumber }],
    }),
  }),
});

export const {
  useScanQrTicketMutation,
  useGetTicketDetailsQuery,
  useLazyGetTicketDetailsQuery,
} = qrApi;
