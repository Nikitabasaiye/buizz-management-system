import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function AttendeesPage() {
  return (
    <Suspense>
      <RoleDashboardPage role="organizer" section="attendees" />
    </Suspense>
  );
}
