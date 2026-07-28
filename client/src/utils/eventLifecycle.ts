import type { Event } from "@/types/buizz";

import { addMinutes, toDateTime } from "./dateTime";

export function getEventStartDate(event: Pick<Event, "venues"> | { date?: string; time?: string }) {
  if ("venues" in event) {
    const venue = event.venues?.[0];
    const schedule = venue?.schedules?.[0];
    const slot = schedule?.timeSlots?.[0];
    return toDateTime(schedule?.date, slot?.startTime);
  }

  return toDateTime(event.date, event.time);
}

export function isEventExpired(event: Pick<Event, "venues" | "visibility"> | { date?: string; time?: string; visibility?: { autoHideAfterMinutes?: number } }, now = new Date()) {
  const startsAt = getEventStartDate(event);
  if (!startsAt) return false;
  const hideAfter = event.visibility?.autoHideAfterMinutes ?? 30;
  return addMinutes(startsAt, hideAfter).getTime() <= now.getTime();
}

export function isEventPubliclyVisible(event: Event, now = new Date()) {
  return event.status === "published" && event.visibility?.isPublic !== false && !isEventExpired(event, now);
}

export function getEventLifecycleStatus(event: Event, now = new Date()) {
  if (isEventExpired(event, now)) return "completed";
  return event.status;
}
