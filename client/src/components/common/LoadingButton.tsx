"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { ButtonLogoLoader } from "./BuizzLogoLoader";

type LoadingButtonProps = {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

export function LoadingButton({
  children,
  loading = false,
  loadingText = "Loading...",
  disabled,
  className,
  type = "button",
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black",
        "transition duration-300 focus-visible:shadow-[var(--shadow-focus)]",
        "disabled:cursor-not-allowed disabled:opacity-55",
        loading ? "cursor-wait" : "active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      {loading ? <ButtonLogoLoader /> : null}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}