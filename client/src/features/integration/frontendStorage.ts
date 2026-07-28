"use client";

export const buizzIntegrationStorageKeys = {
  unifiedEvents: "buizz-events",
  phase3Events: "buizz-organizer-events-v2",
  legacyOrganizerEvents: "buizz-organizer-events",
  onlineBookings: "buizz-online-bookings",
  userTickets: "buizz-user-tickets",
  offlineBookings: "buizz-offline-bookings",
  ticketDesignDrafts: "buizz-ticket-design-drafts",
  ticketDesignDefaults: "buizz-ticket-design-defaults",
  checkIns: "buizz-checkins",
  permissions: "buizz-permissions",
  organizerApplications: "buizz-organizer-applications",
} as const;

export function canUseClientStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readStorageValue<T>(key: string, fallback: T): T {
  if (!canUseClientStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readStorageArray<T>(key: string): T[] {
  const value = readStorageValue<unknown>(key, []);
  return Array.isArray(value) ? (value as T[]) : [];
}

export function writeStorageValue<T>(key: string, value: T) {
  if (!canUseClientStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    throw error;
  }
}

export function upsertStorageRecord<T extends { id?: string; bookingId?: string; ticketId?: string }>(
  key: string,
  record: T,
  getId: (item: T) => string,
) {
  const existing = readStorageArray<T>(key);
  const id = getId(record);
  writeStorageValue(key, [record, ...existing.filter((item) => getId(item) !== id)]);
}

export function uniqueBy<T>(items: T[], getId: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = getId(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
