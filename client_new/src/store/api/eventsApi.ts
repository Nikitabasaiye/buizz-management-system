import { baseApi } from './baseApi';

interface TicketType {
  id?: number;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  isFree?: boolean;
  saleStartDate?: string;
  saleEndDate?: string;
}

interface Event {
  id: number;
  title: string;
  description?: string;
  slug: string;
  location?: string;
  venue?: string;
  city?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  image_url?: string;
  banner_url?: string;
  category?: string;
  customCategory?: string;
  tags?: string[];
  type: 'online' | 'offline' | 'hybrid' | 'custom';
  customType?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  organization_id?: number;
  ticketTypes?: TicketType[];
  created_at: string;
  updated_at: string;
}

interface EventsResponse {
  status: string;
  data: {
    events: Event[];
    total: number;
    page: number;
    limit: number;
  };
}

interface EventResponse {
  status: string;
  data: Event;
}

interface GetEventsParams {
  page?: number;
  limit?: number;
  category?: string;
  city?: string;
  search?: string;
  status?: string;
}

export const eventsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEvents: builder.query<EventsResponse, GetEventsParams | void>({
      query: (params) => ({
        url: '/events',
        params: params ?? {},
      }),
      providesTags: ['Events'],
    }),
    getEventById: builder.query<EventResponse, number | string>({
      query: (id) => `/events/${id}`,
      providesTags: (result, error, id) => [{ type: 'Events', id }],
    }),
    getEventBySlug: builder.query<EventResponse, string>({
      query: (slug) => `/events/slug/${slug}`,
      providesTags: (result, error, slug) => [{ type: 'Events', id: slug }],
    }),
    createEvent: builder.mutation<EventResponse, Partial<Event>>({
      query: (event) => ({
        url: '/events',
        method: 'POST',
        body: event,
      }),
      invalidatesTags: ['Events'],
    }),
    updateEvent: builder.mutation<EventResponse, { id: number; data: Partial<Event> }>({
      query: ({ id, data }) => ({
        url: `/events/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Events', id }, 'Events'],
    }),
    deleteEvent: builder.mutation<{ status: string; message: string }, number>({
      query: (id) => ({
        url: `/events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Events'],
    }),
    publishEvent: builder.mutation<EventResponse, number>({
      query: (id) => ({
        url: `/events/${id}/publish`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Events', id }, 'Events'],
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetEventByIdQuery,
  useGetEventBySlugQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  usePublishEventMutation,
} = eventsApi;
