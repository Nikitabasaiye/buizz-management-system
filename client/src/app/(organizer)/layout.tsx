import type { ReactNode } from "react";
import { OrganizerLayout } from "@/components/layouts/OrganizerLayout";
import { PanelAuthGuard } from "@/features/auth/AuthGuards";

export default function OrganizerRouteLayout({ children }: { children: ReactNode }) {
  return (
    <PanelAuthGuard role="organizer">
      <OrganizerLayout>{children}</OrganizerLayout>
    </PanelAuthGuard>
  );
}
