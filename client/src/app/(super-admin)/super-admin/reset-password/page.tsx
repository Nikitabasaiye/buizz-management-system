import { RoleAuthPage } from "@/features/dashboard/RoleAuthPages";

export default function SuperAdminResetPasswordRoute() {
  return <RoleAuthPage role="super-admin" mode="reset-password" />;
}
