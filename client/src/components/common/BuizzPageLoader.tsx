"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FullPageLogoLoader } from "./BuizzLogoLoader";

const firstLoadDurationMs = 950;
const routeChangeDurationMs = 520;

export function BuizzPageLoader() {
  const pathname = usePathname() ?? "/";
  const [visible, setVisible] = useState(true);
  const firstRender = useRef(true);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    setVisible(true);

    const duration = prefersReducedMotion
      ? 250
      : firstRender.current
        ? firstLoadDurationMs
        : routeChangeDurationMs;

    const timer = window.setTimeout(() => {
      setVisible(false);
      firstRender.current = false;
      document.body.style.overflow = previousOverflow;
    }, duration);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [pathname]);

  if (!visible) return null;

  return <FullPageLogoLoader />;
}