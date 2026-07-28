import type { ReactNode } from "react";
import { PanelAuthGuard } from "@/features/auth/AuthGuards";

export default function SuperAdminRouteLayout({ children }: { children: ReactNode }) {
  return <PanelAuthGuard role="super-admin">{children}</PanelAuthGuard>;
}
