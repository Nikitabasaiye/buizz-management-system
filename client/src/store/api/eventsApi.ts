import { apiSlice } from '../apiSlice';

export interface TicketType {
  id?: number;
  name: string;
  price: number;
  quantity?: number;
  availableQuantity?: number;
  available_quantity?: number;
  description?: string;
}

export interface Event {
  id: number;
  title: string;
  subtitle?: string;
  slug: string;
  description: string;
  organizerId: number;
  organizerName: string;
  organizationName?: string;
  category: string;
  language?: string;
  ageRestriction?: string;
  duration?: string;
  type: 'online' | 'offline' | 'hybrid';
  status: 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'rejected' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  onlineLink?: string;
  banner?: string;
  images: string[];
  ticketTypes: TicketType[];
  tags: string[];
  isFeatured: boolean;
  totalSeats?: number;
  availableSeats?: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  termsConditions?: string;
}

interface EventsResponse {
  success?: boolean;
  status?: string;
  data: {
    events: Event[];
    pagination: { page: number; limit: number; total: number; pages: number };
  };
}

export interface CreateEventBody {
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  customCategory?: string;
  language?: string;
  ageRestriction?: string;
  duration?: string;
  type: 'online' | 'offline' | 'hybrid' | 'custom';
  customType?: string;
  startDate: string;
  endDate: string;
  venue?: { name: string; address: string; city: string; state: string; country: string };
  onlineLink?: string;
  banner?: string;
  images?: string[];
  ticketTypes: TicketType[];
  tags?: string[];
  totalSeats?: number;
  termsConditions?: string;
}

export type UpdateEventBody = Partial<CreateEventBody> & {
  status?: Event['status'] | string;
};

interface EventMutationResult {
  event?: Event;
  message?: string;
  approvalRequest?: {
    id?: number;
    approval_id?: number;
    request_id?: number;
    status?: string;
    [key: string]: unknown;
  };
  requiresApproval?: boolean;
}

interface ImageUploadResponse {
  url: string;
  publicId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType?: string;
}

export const eventsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ── Public ──────────────────────────────────────────────────────────────
    getEvents: builder.query<EventsResponse, {
      page?: number; limit?: number; search?: string;
      status?: string; category?: string; type?: string;
    }>({
      query: (params) => ({ url: '/events', params }),
      providesTags: ['Event'],
    }),

    getEventById: builder.query<{ success?: boolean; status?: string; data: Event }, number>({
      query: (id) => `/events/${id}`,
      providesTags: (_, __, id) => [{ type: 'Event', id }],
    }),

    getEventBySlug: builder.query<{ success?: boolean; status?: string; data: Event }, string>({
      query: (slug) => `/events/slug/${slug}`,
      providesTags: (_, __, slug) => [{ type: 'Event', id: slug }],
    }),

    // ── Protected ────────────────────────────────────────────────────────────
    getDraftEvents: builder.query<EventsResponse, void>({
      query: () => '/events/drafts',
      providesTags: ['Event'],
    }),

    saveDraft: builder.mutation<{ success: boolean; data: { event: Event; isDraft: boolean } }, CreateEventBody & { eventId?: number }>({
      query: (body) => ({
        url: body.eventId ? `/events/draft/${body.eventId}` : '/events/draft',
        method: body.eventId ? 'PUT' : 'POST',
        body,
        headers: { 'x-buizz-role': 'organizer' },
      }),
      invalidatesTags: ['Event'],
    }),

    createEvent: builder.mutation<{ success?: boolean; status?: string; data: EventMutationResult }, CreateEventBody & { role?: string }>({
      query: ({ role, ...body }) => ({
        url: '/events',
        method: 'POST',
        body,
        headers: { 'x-buizz-role': role ?? 'organizer' },
      }),
      invalidatesTags: ['Event', 'Analytics'],
    }),

    updateEvent: builder.mutation<{ success: boolean; data: Event }, { id: number; data: UpdateEventBody; role?: string }>({
      query: ({ id, data, role }) => ({ url: `/events/${id}`, method: 'PUT', body: data, headers: { 'x-buizz-role': role ?? 'organizer' } }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Event', id }, 'Analytics'],
    }),

    deleteEvent: builder.mutation<{ success: boolean; message: string }, number | { id: number; role?: string }>({
      query: (arg) => {
        const id = typeof arg === 'number' ? arg : arg.id;
        const role = typeof arg === 'number' ? 'organizer' : arg.role ?? 'organizer';
        return { url: `/events/${id}`, method: 'DELETE', headers: { 'x-buizz-role': role } };
      },
      invalidatesTags: ['Event', 'Analytics'],
    }),

    publishEvent: builder.mutation<{ success: boolean; data: Event }, number | { id: number; role?: string }>({
      query: (arg) => {
        const id = typeof arg === 'number' ? arg : arg.id;
        const role = typeof arg === 'number' ? 'organizer' : arg.role ?? 'organizer';
        return { url: `/events/${id}/publish`, method: 'PATCH', headers: { 'x-buizz-role': role } };
      },
      invalidatesTags: (_, __, arg) => [{ type: 'Event', id: typeof arg === 'number' ? arg : arg.id }, 'Analytics'],
    }),

    submitEventForReview: builder.mutation<{ status: string; message: string; data: Event }, number>({
      query: (id) => ({ url: `/events/${id}/submit`, method: 'PATCH', headers: { 'x-buizz-role': 'organizer' } }),
      invalidatesTags: (_, __, id) => [{ type: 'Event', id }, 'Analytics', 'Approval'],
    }),

    uploadEventImage: builder.mutation<ImageUploadResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('image', file);
        return {
          url: '/events/upload-image',
          method: 'POST',
          body: formData,
          headers: { 'x-buizz-role': 'organizer', 'x-buizz-form-data': 'true' },
        };
      },
      transformResponse: (response: { status: string; data: ImageUploadResponse }) => response.data,
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetEventsQuery,
  useGetDraftEventsQuery,
  useSaveDraftMutation,
  useGetEventByIdQuery,
  useGetEventBySlugQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  usePublishEventMutation,
  useSubmitEventForReviewMutation,
  useUploadEventImageMutation,
} = eventsApi;
