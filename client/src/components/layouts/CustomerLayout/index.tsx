import type { ReactNode } from "react";
import { Navbar } from "@/components/common/Navbar";

export function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
