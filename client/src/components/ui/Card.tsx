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
        "rounded-[var(--radius-3xl)] border border-[var(--app-border)] bg-[color:var(--app-card)]/92 text-[var(--app-foreground)] shadow-[var(--shadow-card)] backdrop-blur-xl",
        interactive && "transition duration-[var(--motion-base)] hover:-translate-y-1 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-glow)]",
        loading && "pointer-events-none opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
