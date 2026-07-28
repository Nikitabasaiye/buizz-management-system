"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAppStore, type ThemeMode } from "@/store/app.store";

const themeStorageKey = "buizz-theme";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    if (isThemeMode(savedTheme)) {
      setTheme(savedTheme);
      return;
    }

    window.localStorage.setItem(themeStorageKey, "system");
  }, [setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const resolvedTheme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;

      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
      root.dataset.theme = theme;
      root.dataset.resolvedTheme = resolvedTheme;
      window.localStorage.setItem(themeStorageKey, theme);
    };

    applyTheme();

    if (theme === "system") {
      media.addEventListener("change", applyTheme);
      return () => media.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  return <>{children}</>;
}
