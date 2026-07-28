"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { ButtonLogoLoader } from "@/components/common/BuizzLogoLoader";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--color-brand-gradient)] text-white shadow-[0_18px_44px_rgba(236,27,114,0.24)] hover:shadow-[var(--shadow-glow)]",
  secondary:
    "border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--color-brand-primary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--app-hover)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-subtle)] hover:text-[var(--app-foreground)]",
  outline:
    "border border-[var(--app-border)] bg-[color:var(--app-card)]/88 text-[var(--app-foreground)] hover:border-[var(--color-border-strong)] hover:bg-[var(--app-hover)]",
  danger:
    "bg-[var(--color-status-danger)] text-white shadow-[var(--shadow-sm)] hover:brightness-105",
  success:
    "bg-[var(--color-status-success)] text-white shadow-[var(--shadow-sm)] hover:brightness-105",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-base",
  icon: "size-11 p-0",
};

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={!disabled ? { y: -1, scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-full)] font-black transition duration-[var(--motion-base)] outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <ButtonLogoLoader className={variant === "primary" ? "" : "bg-[var(--app-subtle)]"} /> : leftIcon}
      {size !== "icon" && children}
      {!loading && rightIcon}
    </motion.button>
  );
}
