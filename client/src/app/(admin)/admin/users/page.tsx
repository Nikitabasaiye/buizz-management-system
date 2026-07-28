import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function AdminUsersPage() {
  return (
    <Suspense>
      <RoleDashboardPage role="admin" section="users" />
    </Suspense>
  );
}
