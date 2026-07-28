import { RoleAuthPage } from "@/features/dashboard/RoleAuthPages";

export default function SuperAdminLoginRoute() {
  return <RoleAuthPage role="super-admin" mode="login" />;
}
