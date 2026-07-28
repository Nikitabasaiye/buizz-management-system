import { Suspense } from "react";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPages";

export default function AdminBookingsPage() {
  return (
    <Suspense>
      <RoleDashboardPage role="admin" section="bookings" />
    </Suspense>
  );
}
