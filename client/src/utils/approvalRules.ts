import type { AdminPermissions, UserRole } from "@/types/buizz";

export type ApprovalArea =
  | "organizerApproval"
  | "eventApproval"
  | "refundManage"
  | "ticketDesignManage"
  | "seatMapManage"
  | "supportManage";

const approvalPermissionMap: Partial<Record<ApprovalArea, keyof AdminPermissions>> = {
  organizerApproval: "approveOrganizers",
  eventApproval: "approveEvents",
  refundManage: "manageSupportTickets",
  ticketDesignManage: "canCustomizeTicketDesign",
  seatMapManage: "canManageSeatMap",
  supportManage: "manageSupportTickets",
};

export function canAdminApprove(adminPermissions: AdminPermissions, approvalArea: ApprovalArea) {
  const permission = approvalPermissionMap[approvalArea];
  return permission ? Boolean(adminPermissions[permission]) : false;
}

export function canSuperAdminApprove(role: UserRole) {
  return role === "super_admin";
}
