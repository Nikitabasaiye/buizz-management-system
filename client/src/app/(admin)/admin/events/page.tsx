import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function AdminEventsPage() {
  return (
    <Suspense>
      <RoleDashboardPage role="admin" section="events" />
    </Suspense>
  );
}
