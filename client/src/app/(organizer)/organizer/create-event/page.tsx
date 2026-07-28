import { Suspense } from "react";

import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function CreateEventPage() {
  return (
    <Suspense fallback={null}>
      <RoleDashboardPage role="organizer" section="create-event" />
    </Suspense>
  );
}
