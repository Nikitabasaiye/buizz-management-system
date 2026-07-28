import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function OrganizerOfflineBookingRoute() {
  return (
    <Suspense>
      <RoleDashboardPage role="organizer" section="offline-booking" />
    </Suspense>
  );
}
