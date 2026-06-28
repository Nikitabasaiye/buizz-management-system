import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
  loading?: boolean;
};

export function Card({ children, interactive, loading, className, ...props }: CardProps) {
  return (
    <div
      aria-busy={loading || undefined}
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-sm)]",
        interactive && "transition duration-[var(--motion-base)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)]",
        loading && "pointer-events-none opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
