"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { QueryProvider } from "./QueryProvider";
import { ReduxProvider } from "./ReduxProvider";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";

export function GlobalProviders({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider>
            <MotionConfig reducedMotion="user">
              <ToastProvider>{children}</ToastProvider>
            </MotionConfig>
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </ReduxProvider>
  );
}
