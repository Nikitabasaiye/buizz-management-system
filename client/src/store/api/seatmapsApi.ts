import { apiSlice } from '../apiSlice';

interface SeatMapTemplate {
  id: number;
  name: string;
  description: string | null;
  layout: any;
  rows: number;
  columns: number;
  seat_types: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SeatMapOverride {
  id: number;
  event_id: number;
  template_id: number | null;
  custom_layout: any | null;
  seat_status: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface SeatMapResponse {
  success: boolean;
  data: any;
}

export const seatmapsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Template endpoints
    getSeatMapTemplates: builder.query<SeatMapTemplate[], { is_active?: boolean; search?: string }>({
      query: (params) => ({
        url: '/seatmaps/templates',
        params,
      }),
      providesTags: ['SeatMap'],
    }),
    
    getSeatMapTemplateById: builder.query<SeatMapTemplate, number>({
      query: (id) => `/seatmaps/templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'SeatMap', id }],
    }),
    
    createSeatMapTemplate: builder.mutation<SeatMapTemplate, Partial<SeatMapTemplate>>({
      query: (data) => ({
        url: '/seatmaps/templates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SeatMap'],
    }),
    
    updateSeatMapTemplate: builder.mutation<SeatMapTemplate, { id: number; data: Partial<SeatMapTemplate> }>({
      query: ({ id, data }) => ({
        url: `/seatmaps/templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'SeatMap', id }],
    }),
    
    deleteSeatMapTemplate: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/seatmaps/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SeatMap'],
    }),
    
    // Override endpoints
    getSeatMapOverride: builder.query<SeatMapOverride | null, number>({
      query: (eventId) => `/seatmaps/events/${eventId}/override`,
      providesTags: (result, error, eventId) => [{ type: 'SeatMap', id: eventId }],
    }),
    
    createSeatMapOverride: builder.mutation<SeatMapOverride, { eventId: number; data: Partial<SeatMapOverride> }>({
      query: ({ eventId, data }) => ({
        url: `/seatmaps/events/${eventId}/override`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'SeatMap', id: eventId }],
    }),
    
    updateSeatMapOverride: builder.mutation<SeatMapOverride, { eventId: number; data: Partial<SeatMapOverride> }>({
      query: ({ eventId, data }) => ({
        url: `/seatmaps/events/${eventId}/override`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'SeatMap', id: eventId }],
    }),
    
    deleteSeatMapOverride: builder.mutation<{ success: boolean; message: string }, number>({
      query: (eventId) => ({
        url: `/seatmaps/events/${eventId}/override`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, eventId) => [{ type: 'SeatMap', id: eventId }],
    }),
    
    // Seat status endpoints
    updateSeatStatus: builder.mutation<SeatMapOverride, { eventId: number; seatUpdates: Record<string, string> }>({
      query: ({ eventId, seatUpdates }) => ({
        url: `/seatmaps/events/${eventId}/seats`,
        method: 'PATCH',
        body: seatUpdates,
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'SeatMap', id: eventId }],
    }),
    
    getAvailableSeats: builder.query<{ total: number; available: number; byType: Record<string, { total: number; available: number }> }, number>({
      query: (eventId) => `/seatmaps/events/${eventId}/seats/available`,
      providesTags: (result, error, eventId) => [{ type: 'SeatMap', id: eventId }],
    }),
    
    getEventSeatMap: builder.query<any, number>({
      query: (eventId) => `/seatmaps/events/${eventId}/seatmap`,
      providesTags: (result, error, eventId) => [{ type: 'SeatMap', id: eventId }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetSeatMapTemplatesQuery,
  useGetSeatMapTemplateByIdQuery,
  useCreateSeatMapTemplateMutation,
  useUpdateSeatMapTemplateMutation,
  useDeleteSeatMapTemplateMutation,
  useGetSeatMapOverrideQuery,
  useCreateSeatMapOverrideMutation,
  useUpdateSeatMapOverrideMutation,
  useDeleteSeatMapOverrideMutation,
  useUpdateSeatStatusMutation,
  useGetAvailableSeatsQuery,
  useGetEventSeatMapQuery,
} = seatmapsApi;
