"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAppStore } from "@/store/app.store";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    root.dataset.theme = theme;
  }, [theme]);

  return children;
}
