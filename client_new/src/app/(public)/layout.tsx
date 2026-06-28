import type { ReactNode } from "react";
import { PublicLayout } from "@/components/layouts/PublicLayout";

export default function PublicRouteLayout({ children }: { children: ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
