import type { ReactNode } from "react";
import { Navbar } from "@/components/common/Navbar";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
