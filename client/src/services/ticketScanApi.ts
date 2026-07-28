import axios from 'axios';

const API_BASE = '/api/v1/ticket-scan';

export const extractTicketNumberFromQr = (value: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return raw;

  try {
    const parsed = JSON.parse(raw);
    const fromJson = parsed.ticket_number || parsed.ticketNumber || parsed.ticket_id || parsed.ticketId;
    if (fromJson) return String(fromJson).trim();
  } catch {
    // Non-JSON QR payloads are expected.
  }

  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/(?:api\/v1\/)?qr\/redirect\/([^/]+)/i)
      || url.pathname.match(/\/(?:api\/v1\/)?ticket-scan\/(?:scan|verify)\/([^/]+)/i)
      || url.pathname.match(/\/ticket\/([^/]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    const match = raw.match(/(?:qr\/redirect|ticket-scan\/(?:scan|verify)|ticket)\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return raw;
};

interface ScanResult {
  success: boolean;
  message: string;
  ticket?: {
    ticketId: number;
    ticketNumber: string;
    bookingNumber: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone: string;
    eventTitle: string;
    eventStart: string;
    eventEnd: string;
    venueName: string;
    venueAddress: string;
    ticketTypeName: string;
    price: number;
    checkedInAt: string;
    status: string;
  };
}

interface ScanData {
  location?: string;
  device_info?: string;
  latitude?: number;
  longitude?: number;
}

interface EventStats {
  event: {
    eventId: number;
    totalAttendees: number;
    totalTickets: number;
    checkedInTickets: number;
    pendingTickets: number;
    cancelledTickets: number;
    checkInRate: number;
  };
  staff: {
    ticketsScanned: number;
    ticketsVerified: number;
    ticketsRejected: number;
    averageScanTime: number | null;
    shiftStart: string | null;
    shiftEnd: string | null;
  };
}

export const ticketScanApi = {
  // Scan ticket QR code
  async scanTicket(ticketNumber: string, scanData: ScanData = {}): Promise<ScanResult> {
    const token = localStorage.getItem('token');
    const normalizedTicketNumber = extractTicketNumberFromQr(ticketNumber);
    const response = await axios.post(`${API_BASE}/scan/${encodeURIComponent(normalizedTicketNumber)}`, scanData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Verify ticket without scanning (view only)
  async verifyTicket(ticketNumber: string): Promise<any> {
    const token = localStorage.getItem('token');
    const normalizedTicketNumber = extractTicketNumberFromQr(ticketNumber);
    const response = await axios.get(`${API_BASE}/verify/${encodeURIComponent(normalizedTicketNumber)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Get scan statistics for an event
  async getEventScanStats(eventId: number): Promise<EventStats> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/stats/event/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Get recent scans for an event
  async getRecentScans(eventId: number, limit: number = 50): Promise<any[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/recent/event/${eventId}?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  }
};
