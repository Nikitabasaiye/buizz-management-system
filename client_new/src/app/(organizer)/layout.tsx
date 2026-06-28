import type { ReactNode } from "react";
import { OrganizerLayout } from "@/components/layouts/OrganizerLayout";

export default function OrganizerRouteLayout({ children }: { children: ReactNode }) {
  return <OrganizerLayout>{children}</OrganizerLayout>;
}
