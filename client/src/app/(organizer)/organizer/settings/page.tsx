import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function OrganizerSettingsPage() {
  return (
    <Suspense>
      <RoleDashboardPage role="organizer" section="settings" />
    </Suspense>
  );
}
