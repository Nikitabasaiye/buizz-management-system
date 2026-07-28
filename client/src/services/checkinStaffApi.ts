import axios from 'axios';

const API_BASE = '/api/v1/checkin-staff-management';

interface CheckinStaffAssignment {
  id: number;
  event_id: number;
  staff_id: number;
  staff_name: string;
  staff_email: string;
  staff_role: string;
  staff_avatar?: string;
  assigned_by: number;
  permissions: {
    scan?: boolean;
    view?: boolean;
    manage?: boolean;
  };
  is_active: boolean;
  assigned_at: string;
}

interface AssignStaffData {
  event_id: number;
  staff_id?: number;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  permissions?: {
    scan?: boolean;
    view?: boolean;
    manage?: boolean;
  };
}

export const checkinStaffApi = {
  // Assign staff to event
  async assignStaff(data: AssignStaffData): Promise<CheckinStaffAssignment> {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/assign`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Get all staff for an event
  async getEventStaff(eventId: number): Promise<CheckinStaffAssignment[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/event/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Update staff assignment
  async updateAssignment(
    assignmentId: number,
    data: { permissions?: object; is_active?: boolean }
  ): Promise<CheckinStaffAssignment> {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_BASE}/assignment/${assignmentId}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Remove staff assignment
  async removeStaff(assignmentId: number): Promise<CheckinStaffAssignment> {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_BASE}/assignment/${assignmentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Get events where current user is assigned as check-in staff
  async getMyEvents(): Promise<any[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/my-events`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  }
};
