import type { SeatMap } from "@/types/buizz";

export const seatMapService = {
  getDefaultSeatMaps: () => {
    // Stub: Mock API store removed, returning empty array
    return [];
  },
  getSeatMapByVenue(venueId: string) {
    // Stub: Mock API store removed, returning null
    return null;
  },
  saveOrganizerDraftSeatMap(payload: Partial<SeatMap> & { layoutName: string }) {
    // Stub: Mock API store removed, returning empty object
    return {} as any;
  },
};
