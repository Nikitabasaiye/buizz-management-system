import { apiSlice } from '../apiSlice';

interface CheckInRequest {
  ticketId?: number;
  ticketNumber?: string;
  qrData?: string;
  scannerId?: string;
  notes?: string;
}

interface ValidateTicketRequest {
  ticketNumber?: string;
  qrData?: string;
}

export type ScanStatus = 'success' | 'already_used' | 'invalid';

export interface ValidateTicketResponse {
  success: boolean;
  data: {
    valid: boolean;
    alreadyUsed?: boolean;
    reason?: string;
    checkedInAt?: string;
    ticket?: {
      ticketNumber: string;
      userName: string;
      email?: string;
      phone?: string;
      ticketType: string;
    };
  };
}

interface CheckInResponse {
  success: boolean;
  message?: string;
  data: {
    id: number;
    ticketId: number;
    ticketNumber: string;
    userName: string;
    email: string;
    phone: string;
    checkedInAt: string;
    checkedBy: number;
    scannerId: string | null;
  };
}

interface CheckInBatchRequest {
  tickets: Array<{ ticketId?: number; ticketNumber?: string }>;
  scannerId?: string;
  notes?: string;
}

interface CheckInBatchResponse {
  success: boolean;
  data: {
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      ticketId: number | string;
      success: boolean;
      message: string;
      checkin: any | null;
    }>;
  };
}

interface CheckInStats {
  totalTickets: number;
  checkedIn: number;
  notCheckedIn: number;
  checkinRate: number;
  byHour: Array<{ hour: number; count: number }>;
  byScanner: Array<{ scannerId: string | null; count: number }>;
}

export const checkinApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    validateTicket: builder.mutation<ValidateTicketResponse, { eventId: number; data: ValidateTicketRequest }>({
      query: ({ eventId, data }) => ({
        url: `/checkin/events/${eventId}/validate`,
        method: 'POST',
        body: data,
      }),
    }),
    checkInTicket: builder.mutation<CheckInResponse, { eventId: number; data: CheckInRequest }>({
      query: ({ eventId, data }) => ({
        url: `/checkin/events/${eventId}/checkin`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CheckIn'],
    }),
    
    checkInBatch: builder.mutation<CheckInBatchResponse, { eventId: number; data: CheckInBatchRequest }>({
      query: ({ eventId, data }) => ({
        url: `/checkin/events/${eventId}/checkin/batch`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CheckIn'],
    }),
    
    getEventCheckins: builder.query<any, { eventId: number; page?: number; limit?: number; status?: string; fromDate?: string; toDate?: string }>({
      query: ({ eventId, ...params }) => ({
        url: `/checkin/events/${eventId}/checkins`,
        params,
      }),
      providesTags: ['CheckIn'],
    }),
    
    getCheckinStats: builder.query<CheckInStats, number>({
      query: (eventId) => `/checkin/events/${eventId}/checkins/stats`,
      providesTags: ['CheckIn'],
    }),
    
    getTicketCheckin: builder.query<any, number>({
      query: (ticketId) => `/checkin/tickets/${ticketId}/checkin`,
      providesTags: (result, error, ticketId) => [{ type: 'CheckIn', id: ticketId }],
    }),
    
    getEventAttendeesList: builder.query<any, number>({
      query: (eventId) => `/checkin/events/${eventId}/attendees`,
      providesTags: ['CheckIn'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useValidateTicketMutation,
  useCheckInTicketMutation,
  useCheckInBatchMutation,
  useGetEventCheckinsQuery,
  useGetCheckinStatsQuery,
  useGetTicketCheckinQuery,
  useGetEventAttendeesListQuery,
} = checkinApi;
