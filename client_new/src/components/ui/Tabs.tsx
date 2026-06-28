"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type TabsProps = {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
};

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div role="tablist" className="inline-flex rounded-[var(--radius-full)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={cn(
            "relative min-h-9 rounded-[var(--radius-full)] px-4 text-sm font-black transition",
            active === tab ? "text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          {active === tab && <motion.span layoutId="active-tab" className="absolute inset-0 rounded-[var(--radius-full)] bg-[var(--color-brand-primary)]" />}
          <span className="relative">{tab}</span>
        </button>
      ))}
    </div>
  );
}
