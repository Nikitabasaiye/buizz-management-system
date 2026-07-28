"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

type DrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  side?: "left" | "right" | "bottom";
  onClose: () => void;
};

export function Drawer({ open, title, description, children, side = "right", onClose }: DrawerProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const isBottom = side === "bottom";
  const initial = isBottom ? { y: "100%" } : { x: side === "right" ? "100%" : "-100%" };
  const animate = isBottom ? { y: 0 } : { x: 0 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
          onMouseDown={onClose}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            aria-describedby={description ? "drawer-description" : undefined}
            className={
              isBottom
                ? "absolute inset-x-0 bottom-0 max-h-[86vh] rounded-t-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-lg)]"
                : "absolute bottom-0 top-0 w-[min(28rem,100vw)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-lg)] data-[side=left]:left-0 data-[side=right]:right-0"
            }
            data-side={side}
            initial={initial}
            animate={animate}
            exit={initial}
            transition={{ duration: 0.26, ease: [0.2, 0, 0, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="drawer-title" className="text-xl font-black text-[var(--color-text-primary)]">
                  {title}
                </h2>
                {description && (
                  <p id="drawer-description" className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-10 shrink-0 place-items-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-subtle)]"
                aria-label="Close drawer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
