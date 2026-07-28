import type {
  BuizzTicketData,
  TicketDesignDraft,
  TicketThemeRequest,
  TicketThemeSettings,
} from "./ticketTypes";
import { ticketStorageKeys } from "./ticketTypes";
import type { TicketThemeConfig } from "./ticketThemes";
import { normalizeBookingPasses } from "./ticket-utils";

export function safeReadStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function safeWriteStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function safeRemoveStorage(key: string) {
  if (typeof window !== "undefined") window.localStorage.removeItem(key);
}

function readArrayStorage<T>(key: string): T[] {
  const value = safeReadStorage<unknown>(key, []);
  return Array.isArray(value) ? value as T[] : [];
}

export const ticketStorage = {
  getThemes: (fallback: TicketThemeConfig[] = []) =>
    safeReadStorage<TicketThemeConfig[]>(ticketStorageKeys.themes, fallback),
  setThemes: (themes: TicketThemeConfig[]) =>
    safeWriteStorage(ticketStorageKeys.themes, themes),
  getDesignDrafts: (fallback: TicketDesignDraft[] = []) =>
    safeReadStorage<TicketDesignDraft[]>(ticketStorageKeys.designDrafts, fallback),
  setDesignDrafts: (drafts: TicketDesignDraft[]) =>
    safeWriteStorage(ticketStorageKeys.designDrafts, drafts),
  getThemeRequests: (fallback: TicketThemeRequest[] = []) =>
    safeReadStorage<TicketThemeRequest[]>(ticketStorageKeys.themeRequests, fallback),
  setThemeRequests: (requests: TicketThemeRequest[]) =>
    safeWriteStorage(ticketStorageKeys.themeRequests, requests),
  getEventSettings: () =>
    safeReadStorage<Record<string, TicketThemeSettings>>(ticketStorageKeys.eventSettings, {}),
  setEventSettings: (settings: Record<string, TicketThemeSettings>) =>
    safeWriteStorage(ticketStorageKeys.eventSettings, settings),
  getUserTickets: () =>
    normalizeBookingPasses(readArrayStorage<BuizzTicketData>(ticketStorageKeys.userTickets)),
  setUserTickets: (tickets: BuizzTicketData[]) =>
    safeWriteStorage(ticketStorageKeys.userTickets, normalizeBookingPasses(tickets)),
  getScans: () =>
    safeReadStorage<Array<Record<string, string>>>(ticketStorageKeys.scans, []),
  setScans: (scans: Array<Record<string, string>>) =>
    safeWriteStorage(ticketStorageKeys.scans, scans),
};
