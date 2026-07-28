import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AdminPermissionKey =
  | "approveOrganizers"
  | "approveEvents"
  | "publishEvents"
  | "featureEvents"
  | "suspendEvents"
  | "approveRatings"
  | "canCustomizeTicketDesign"
  | "manageUsers"
  | "manageEvents"
  | "canManageSeatMap"
  | "viewRevenue"
  | "viewReports"
  | "viewSupportTickets"
  | "manageSupportTickets"
  | "assignSupportTickets"
  | "resolveSupportTickets"
  | "publishEvents"
  | "changeTicketPriority";

export type OrganizerPermissionKey =
  | "createEvents"
  | "editEvents"
  | "canManageSeatMap"
  | "viewBookings"
  | "offlineBooking"
  | "ticketScanner"
  | "viewRevenue"
  | "manageAttendees"
  | "createSupportTicket"
  | "viewOwnSupportTickets";

export type AdminPermissions = Record<AdminPermissionKey, boolean>;
export type OrganizerPermissions = Record<OrganizerPermissionKey, boolean>;

type PermissionState = {
  adminPermissions: Record<string, AdminPermissions>;
  organizerPermissions: Record<string, OrganizerPermissions>;
  toggleAdminPermission: (adminId: string, permission: AdminPermissionKey) => void;
  toggleOrganizerPermission: (organizerId: string, permission: OrganizerPermissionKey) => void;
  setAdminPermissions: (adminId: string, permissions: AdminPermissions) => void;
  setOrganizerPermissions: (organizerId: string, permissions: OrganizerPermissions) => void;
};

export const adminPermissionLabels: Record<AdminPermissionKey, string> = {
  approveOrganizers: "Approve Organizers",
  approveEvents: "Approve Events",
  publishEvents: "Publish Events",
  featureEvents: "Feature Events",
  suspendEvents: "Suspend Events",
  approveRatings: "Approve customer platform ratings",
  canCustomizeTicketDesign: "Customize ticket design",
  manageUsers: "Manage Users",
  manageEvents: "Manage Events",
  canManageSeatMap: "Manage Seat Maps",
  viewRevenue: "View Revenue",
  viewReports: "View Reports",
  viewSupportTickets: "View Support Tickets",
  manageSupportTickets: "Manage Support Tickets",
  assignSupportTickets: "Assign Support Tickets",
  resolveSupportTickets: "Resolve Support Tickets",
  changeTicketPriority: "Change Ticket Priority",
};

export const organizerPermissionLabels: Record<OrganizerPermissionKey, string> = {
  createEvents: "Create Events",
  editEvents: "Edit Events",
  canManageSeatMap: "Manage Seat Maps",
  viewBookings: "View Bookings",
  offlineBooking: "Offline Booking",
  ticketScanner: "Ticket Scanner",
  viewRevenue: "View Revenue",
  manageAttendees: "Manage Attendees",
  createSupportTicket: "Create Support Ticket",
  viewOwnSupportTickets: "View Own Support Tickets",
};

export const adminPermissionKeys = Object.keys(adminPermissionLabels) as AdminPermissionKey[];
export const organizerPermissionKeys = Object.keys(organizerPermissionLabels) as OrganizerPermissionKey[];

export const defaultAdminPermissions: AdminPermissions = {
  approveOrganizers: true,
  approveEvents: true,
  publishEvents: true,
  featureEvents: true,
  suspendEvents: true,
  approveRatings: false,
  canCustomizeTicketDesign: false,
  manageUsers: true,
  manageEvents: true,
  canManageSeatMap: true,
  viewRevenue: true,
  viewReports: true,
  viewSupportTickets: true,
  manageSupportTickets: true,
  assignSupportTickets: false,
  resolveSupportTickets: true,
  changeTicketPriority: false,
};

export const defaultOrganizerPermissions: OrganizerPermissions = {
  createEvents: true,
  editEvents: true,
  canManageSeatMap: true,
  viewBookings: true,
  offlineBooking: true,
  ticketScanner: true,
  viewRevenue: true,
  manageAttendees: true,
  createSupportTicket: true,
  viewOwnSupportTickets: true,
};

function createInitialAdminPermissions() {
  return {} as Record<string, AdminPermissions>;
}

function createInitialOrganizerPermissions() {
  return {} as Record<string, OrganizerPermissions>;
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set) => ({
      adminPermissions: createInitialAdminPermissions(),
      organizerPermissions: createInitialOrganizerPermissions(),
      toggleAdminPermission: (adminId, permission) =>
        set((state) => {
          const current = state.adminPermissions[adminId] ?? defaultAdminPermissions;
          return {
            adminPermissions: {
              ...state.adminPermissions,
              [adminId]: { ...current, [permission]: !current[permission] },
            },
          };
        }),
      toggleOrganizerPermission: (organizerId, permission) =>
        set((state) => {
          const current = state.organizerPermissions[organizerId] ?? defaultOrganizerPermissions;
          return {
            organizerPermissions: {
              ...state.organizerPermissions,
              [organizerId]: { ...current, [permission]: !current[permission] },
            },
          };
        }),
      setAdminPermissions: (adminId, permissions) =>
        set((state) => ({
          adminPermissions: { ...state.adminPermissions, [adminId]: permissions },
        })),
      setOrganizerPermissions: (organizerId, permissions) =>
        set((state) => ({
          organizerPermissions: { ...state.organizerPermissions, [organizerId]: permissions },
        })),
    }),
    {
      name: "buizz-permissions",
      version: 1,
    }
  )
);
