import type { ReactNode } from "react";

export function Modal({ children }: { children: ReactNode }) {
  return <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] p-6">{children}</div>;
}
