import axios from 'axios';
import type { RevenueFilters, UpdateSettlementPayload } from "@/types/buizz";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export type DashboardSettlementSummary = Record<string, unknown> & {
  eventId?: string;
  status?: string;
};

export const settlementService = {
  getSettlementSummary: (_filters?: RevenueFilters): DashboardSettlementSummary[] => [],
  
  getOrganizerSummary: async (organizerId: string) => {
    const response = await axios.get(`${API_BASE}/settlements/summary/${organizerId}`);
    return response.data.data;
  },
  
  getEligibleGroups: async (filters?: RevenueFilters) => {
    const response = await axios.get(`${API_BASE}/settlements/eligible`, {
      params: filters,
    });
    return response.data.data;
  },
  
  generateSettlement: async (payload: { organizerId: number; eventId: number }) => {
    const response = await axios.post(`${API_BASE}/settlements/generate`, payload);
    return response.data.data;
  },
  
  generateAllEligibleSettlements: async () => {
    const response = await axios.post(`${API_BASE}/settlements/generate/all-eligible`);
    return response.data.data;
  },
  
  updateSettlement: async (settlementId: string, payload: UpdateSettlementPayload) => {
    const response = await axios.patch(`${API_BASE}/settlements/${settlementId}/status`, payload);
    return response.data.data;
  },
  
  getSettlementById: async (settlementId: string) => {
    const response = await axios.get(`${API_BASE}/settlements/${settlementId}`);
    return response.data.data;
  },
};
