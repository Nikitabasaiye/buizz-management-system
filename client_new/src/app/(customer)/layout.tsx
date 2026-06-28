import type { ReactNode } from "react";
import { CustomerLayout } from "@/components/layouts/CustomerLayout";

export default function CustomerRouteLayout({ children }: { children: ReactNode }) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
