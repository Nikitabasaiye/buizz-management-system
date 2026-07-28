"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

export const LIGHT_LOGO_SRC = "/images/light mode-logo.png";
export const DARK_LOGO_SRC = "/images/Dark  mode_logo.png";

export type BuizzLogoProps = {
  variant?: "auto" | "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
};

const sizeStyles = {
  sm: "w-24",
  md: "w-32",
  lg: "w-40",
  xl: "w-48",
} as const;

const responsiveSizes = {
  sm: "96px",
  md: "128px",
  lg: "160px",
  xl: "192px",
} as const;

function getDocumentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";

  const root = document.documentElement;
  const resolvedTheme = root.dataset.resolvedTheme;

  if (resolvedTheme === "dark" || resolvedTheme === "light") {
    return resolvedTheme;
  }

  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function BuizzLogo({
  variant = "auto",
  size = "md",
  className,
  showSubtitle = false,
  subtitle = "Event Experiences & Tickets",
}: BuizzLogoProps) {
  const [documentTheme, setDocumentTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (variant !== "auto") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => setDocumentTheme(getDocumentTheme());
    const observer = new MutationObserver(syncTheme);

    syncTheme();
    media.addEventListener("change", syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-resolved-theme"],
    });

    return () => {
      media.removeEventListener("change", syncTheme);
      observer.disconnect();
    };
  }, [variant]);

  const resolvedVariant = variant === "auto" ? documentTheme : variant;
  const source = resolvedVariant === "dark" ? DARK_LOGO_SRC : LIGHT_LOGO_SRC;

  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-col items-start",
        sizeStyles[size],
        className,
      )}
      data-buizz-logo={resolvedVariant}
    >
      <Image
        src={source}
        alt="Buizz.com"
        width={320}
        height={100}
        sizes={responsiveSizes[size]}
        className="block h-auto w-full max-w-full object-contain"
      />

      {showSubtitle ? (
        <span
          className={cn(
            "mt-1 block w-full text-left text-[11px] font-black leading-tight",
            resolvedVariant === "dark" ? "text-white/70" : "text-slate-500",
          )}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
