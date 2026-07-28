import { api } from "./api";
import { eventService } from "./eventService";

export const eventsApi = {
  client: api,
  ...eventService,
};
