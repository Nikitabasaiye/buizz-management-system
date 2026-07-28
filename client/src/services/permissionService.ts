import type { AdminPermissions, UpdatePermissionPayload } from "@/types/buizz";
import { adminPermissionLabels, defaultAdminPermissions } from "@/store/permissionStore";
import { canAdminApprove, type ApprovalArea } from "@/utils/approvalRules";

const permissionMemory = new Map<string, AdminPermissions>();

export const permissionService = {
  getAdminPermissions(adminId: string) {
    return permissionMemory.get(adminId) ?? defaultAdminPermissions;
  },
  updateAdminPermissions(payload: UpdatePermissionPayload) {
    permissionMemory.set(payload.adminId, payload.permissions);
    // Stub: Mock API store removed, activity log creation skipped
    return payload.permissions;
  },
  canAdminApprove(adminId: string, approvalArea: ApprovalArea) {
    return canAdminApprove(permissionService.getAdminPermissions(adminId), approvalArea);
  },
  getPermissionLabels: () => adminPermissionLabels,
};
