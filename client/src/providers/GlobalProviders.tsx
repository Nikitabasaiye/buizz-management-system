"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { QueryProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";
import { ReduxProvider } from "./ReduxProvider";
import { VisitorTracker } from "./VisitorTracker";

export function GlobalProviders({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider>
            <MotionConfig reducedMotion="user">
              <ToastProvider>
                <VisitorTracker />
                {children}
              </ToastProvider>
            </MotionConfig>
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </ReduxProvider>
  );
}
