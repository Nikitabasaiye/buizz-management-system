import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function OrganizerAnalyticsPage() {
  return (
    <Suspense>
      <RoleDashboardPage role="organizer" section="analytics" />
    </Suspense>
  );
}
