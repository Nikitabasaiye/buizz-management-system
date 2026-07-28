import axios from 'axios';
import type { RevenueFilters } from "@/types/buizz";
import { getRoleSession } from "@/features/auth/authSession";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.buizz.com/api/v1'
).replace(/\/$/, '');

const getAuthConfig = () => {
  const session =
    getRoleSession('super-admin') ||
    getRoleSession('admin') ||
    getRoleSession('organizer');
  return session?.token
    ? { headers: { Authorization: `Bearer ${session.token}` } }
    : {};
};

export const revenueService = {
  getOrganizerRevenue: async (organizerId: string, filters?: RevenueFilters) => {
    const response = await axios.get(
      `${API_BASE}/admin/analytics/organizers/${organizerId}/revenue`,
      { ...getAuthConfig(), params: filters },
    );
    return response.data.data;
  },
  
  getAdminRevenue: async (filters?: RevenueFilters) => {
    const response = await axios.get(`${API_BASE}/admin/revenue`, {
      ...getAuthConfig(),
      params: filters,
    });
    return response.data.data;
  },
  
  getSuperAdminRevenue: async (filters?: RevenueFilters) => {
    const response = await axios.get(`${API_BASE}/admin/analytics/organizers`, {
      ...getAuthConfig(),
      params: filters,
    });
    return response.data.data;
  },
};
