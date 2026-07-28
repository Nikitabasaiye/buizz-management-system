import { api } from "./api";
import { bookingService } from "./bookingService";

export const bookingApi = {
  client: api,
  ...bookingService,
};
