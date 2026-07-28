export {
  useGetEventsQuery,
  useGetEventByIdQuery,
  useGetEventBySlugQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  usePublishEventMutation,
} from "@/store/api/eventsApi";

import type { Event as BuizzEvent } from "@/types/buizz";

export const eventService = {
  getEventHistory: (_filters?: Record<string, unknown>): BuizzEvent[] => [],
  getPublicEvents: (_filters?: Record<string, unknown>): BuizzEvent[] => [],
  getOrganizerEvents: (_filters?: Record<string, unknown>): BuizzEvent[] => [],
};
