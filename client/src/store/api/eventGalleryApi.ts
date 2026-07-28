import { apiSlice } from '../apiSlice';

export interface EventGalleryImage {
  id: number;
  event_id: number;
  image_url: string;
  caption: string | null;
  is_featured: boolean | number;
  sort_order: number;
  uploaded_by?: number;
  uploader_name?: string;
  created_at?: string;
}

export const eventGalleryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEventGalleryImages: builder.query<EventGalleryImage[], number | string>({
      query: (eventId) => `/event-gallery/event/${eventId}`,
      transformResponse: (response: { success?: boolean; data?: EventGalleryImage[] } | EventGalleryImage[]) =>
        Array.isArray(response) ? response : response.data ?? [],
      providesTags: (_result, _error, eventId) => [{ type: 'Event', id: `gallery-${eventId}` }],
    }),
  }),
  overrideExisting: true,
});

export const { useGetEventGalleryImagesQuery } = eventGalleryApi;
