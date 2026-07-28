"use client";

export type IntegrationPermissionKey = "offlineBooking" | "createEvents" | "viewBookings" | "manageAttendees" | "ticketScanner";

export function permissionLabel(key: IntegrationPermissionKey) {
  const labels: Record<IntegrationPermissionKey, string> = {
    offlineBooking: "Offline Booking",
    createEvents: "Create Events",
    viewBookings: "View Bookings",
    manageAttendees: "Manage Attendees",
    ticketScanner: "Ticket Scanner",
  };
  return labels[key];
}
