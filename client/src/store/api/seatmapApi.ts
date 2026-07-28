import { apiSlice } from '../apiSlice';

export interface SeatMapTemplate {
  template_id: string;
  name: string;
  description: string;
  venue_type: string;
  total_seats: number;
  seat_layout: any;
  seat_categories: any[];
  created_at: string;
}

export interface SeatMapOverride {
  override_id: string;
  event_id: string;
  template_id: string;
  custom_layout: any;
  seat_availability: any;
  created_at: string;
}

export const seatmapApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Seat Map Templates
    getSeatMapTemplates: builder.query<SeatMapTemplate[], void>({
      query: () => '/seatmaps/templates',
      providesTags: ['SeatMap'],
    }),

    getSeatMapTemplate: builder.query<SeatMapTemplate, string>({
      query: (templateId) => `/seatmaps/templates/${templateId}`,
      providesTags: ['SeatMap'],
    }),

    createSeatMapTemplate: builder.mutation<SeatMapTemplate, Partial<SeatMapTemplate>>({
      query: (data) => ({
        url: '/seatmaps/templates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SeatMap'],
    }),

    updateSeatMapTemplate: builder.mutation<SeatMapTemplate, { templateId: string; data: Partial<SeatMapTemplate> }>({
      query: ({ templateId, data }) => ({
        url: `/seatmaps/templates/${templateId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['SeatMap'],
    }),

    deleteSeatMapTemplate: builder.mutation<void, string>({
      query: (templateId) => ({
        url: `/seatmaps/templates/${templateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SeatMap'],
    }),

    // Seat Map Overrides for Events
    getEventSeatMap: builder.query<SeatMapOverride, string>({
      query: (eventId) => `/seatmaps/event/${eventId}`,
      providesTags: ['SeatMap'],
    }),

    createEventSeatMap: builder.mutation<SeatMapOverride, { eventId: string; templateId: string; customLayout?: any }>({
      query: ({ eventId, templateId, customLayout }) => ({
        url: `/seatmaps/event/${eventId}`,
        method: 'POST',
        body: { templateId, customLayout },
      }),
      invalidatesTags: ['SeatMap', 'Event'],
    }),

    updateEventSeatMap: builder.mutation<SeatMapOverride, { eventId: string; data: Partial<SeatMapOverride> }>({
      query: ({ eventId, data }) => ({
        url: `/seatmaps/event/${eventId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['SeatMap', 'Event'],
    }),

    deleteEventSeatMap: builder.mutation<void, string>({
      query: (eventId) => ({
        url: `/seatmaps/event/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SeatMap', 'Event'],
    }),

    // Seat Availability
    getSeatAvailability: builder.query<any, { eventId: string; categoryId?: string }>({
      query: ({ eventId, categoryId }) => ({
        url: `/seatmaps/availability/${eventId}`,
        params: categoryId ? { categoryId } : undefined,
      }),
      providesTags: ['SeatMap'],
    }),

    // Bulk Seat Operations
    reserveSeats: builder.mutation<any, { eventId: string; seats: string[] }>({
      query: ({ eventId, seats }) => ({
        url: `/seatmaps/reserve/${eventId}`,
        method: 'POST',
        body: { seats },
      }),
      invalidatesTags: ['SeatMap'],
    }),

    releaseSeats: builder.mutation<any, { eventId: string; seats: string[] }>({
      query: ({ eventId, seats }) => ({
        url: `/seatmaps/release/${eventId}`,
        method: 'POST',
        body: { seats },
      }),
      invalidatesTags: ['SeatMap'],
    }),
  }),
});

export const {
  useGetSeatMapTemplatesQuery,
  useGetSeatMapTemplateQuery,
  useCreateSeatMapTemplateMutation,
  useUpdateSeatMapTemplateMutation,
  useDeleteSeatMapTemplateMutation,
  useGetEventSeatMapQuery,
  useCreateEventSeatMapMutation,
  useUpdateEventSeatMapMutation,
  useDeleteEventSeatMapMutation,
  useGetSeatAvailabilityQuery,
  useReserveSeatsMutation,
  useReleaseSeatsMutation,
} = seatmapApi;
