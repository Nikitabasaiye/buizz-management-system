import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function AdminDashboardPage() {
  return (
    <Suspense>
      <RoleDashboardPage role="admin" section="dashboard" />
    </Suspense>
  );
}
