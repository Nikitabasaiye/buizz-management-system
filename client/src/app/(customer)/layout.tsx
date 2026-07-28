import type { ReactNode } from "react";
import { CustomerLayout } from "@/components/layouts/CustomerLayout";
import { CustomerAuthGuard } from "@/features/auth/AuthGuards";

export default function CustomerRouteLayout({ children }: { children: ReactNode }) {
  return (
    <CustomerAuthGuard>
      <CustomerLayout>{children}</CustomerLayout>
    </CustomerAuthGuard>
  );
}
