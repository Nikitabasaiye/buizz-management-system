export const superAdminService = {
  getSuperAdminDashboard() {
    return {
      events: [],
      bookings: [],
      revenue: {} as any,
      settlements: {} as any,
      notifications: [],
    };
  },
};
