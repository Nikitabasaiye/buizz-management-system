import { RoleAuthPage } from "@/features/dashboard/RoleAuthPages";

export default function SuperAdminForgotPasswordRoute() {
  return <RoleAuthPage role="super-admin" mode="forgot-password" />;
}
