import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function AdminSettingsPage() {
  return (
    <Suspense>
      <RoleDashboardPage role="admin" section="settings" />
    </Suspense>
  );
}
