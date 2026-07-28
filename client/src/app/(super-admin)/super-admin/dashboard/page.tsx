import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function SuperAdminDashboardRoute() {
  return (
    <Suspense>
      <RoleDashboardPage role="super-admin" section="dashboard" />
    </Suspense>
  );
}
