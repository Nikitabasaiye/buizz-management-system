import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Check if error is 401 Unauthorized (token expired)
    if (error.response?.status === 401) {
      // Clear all auth sessions from localStorage
      const roles = ['customer', 'organizer', 'admin', 'influencer'];
      roles.forEach(role => {
        localStorage.removeItem(`buizz-${role}-session`);
      });
      localStorage.removeItem('buizz-session');
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
