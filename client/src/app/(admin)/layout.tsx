import type { ReactNode } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { PanelAuthGuard } from "@/features/auth/AuthGuards";

export default function AdminRouteLayout({ children }: { children: ReactNode }) {
  return (
    <PanelAuthGuard role="admin">
      <AdminLayout>{children}</AdminLayout>
    </PanelAuthGuard>
  );
}
