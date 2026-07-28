import { builtInTicketThemes, type TicketThemeConfig } from "./ticketThemes";
import {
  ticketStorageKeys,
  type BuizzTicketData,
  type TicketThemeRequest,
  type TicketThemeSettings,
} from "./ticketTypes";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.buizz.com/api/v1";

async function getAuthToken(): Promise<string> {
  let token = "";
  try {
    const s = JSON.parse(localStorage.getItem("buizz-customer-session") || "{}");
    token = s?.token || "";
  } catch {}
  if (!token) {
    try {
      const s = JSON.parse(localStorage.getItem("buizz-auth") || "{}");
      token = s?.state?.user?.token || "";
    } catch {}
  }
  return token;
}

export async function loadTicketThemes(): Promise<TicketThemeConfig[]> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/ticket-themes`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Failed to load ticket themes");
  return response.json();
}

export async function saveTicketThemes(themes: TicketThemeConfig[]): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/ticket-themes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(themes),
  });
  if (!response.ok) throw new Error("Failed to save ticket themes");
}

export async function loadTicketThemeRequests(): Promise<TicketThemeRequest[]> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/ticket-theme-requests`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Failed to load ticket theme requests");
  return response.json();
}

export async function saveTicketThemeRequests(requests: TicketThemeRequest[]): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/ticket-theme-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(requests),
  });
  if (!response.ok) throw new Error("Failed to save ticket theme requests");
}

export async function loadEventTicketSettings(eventId: string): Promise<TicketThemeSettings> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/events/${eventId}/ticket-settings`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Failed to load event ticket settings");
  return response.json();
}

export async function saveEventTicketSetting(eventId: string, settings: TicketThemeSettings): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/events/${eventId}/ticket-settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error("Failed to save event ticket settings");
}

export async function loadUserTickets(): Promise<BuizzTicketData[]> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/tickets/my-tickets`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Failed to load user tickets");
  return response.json();
}

export async function saveUserTickets(tickets: BuizzTicketData[]): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/tickets/my-tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(tickets),
  });
  if (!response.ok) throw new Error("Failed to save user tickets");
}

export async function recordTicketScan(ticket: BuizzTicketData): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/tickets/${ticket.bookingId}/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      bookingId: ticket.bookingId,
      ticketId: ticket.bookingId,
      eventId: ticket.event.id,
      gate: ticket.ticket.gate,
    }),
  });
  if (!response.ok) throw new Error("Failed to record ticket scan");
}
