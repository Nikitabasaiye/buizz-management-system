"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

type StepProgressProps = {
  steps: string[];
  currentStep: number;
};

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  const progress = steps.length <= 1 ? 100 : (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="rounded-[24px] border border-[var(--color-border-default)] bg-white p-4 shadow-[0_18px_50px_rgb(17 24 39/0.06)] sm:p-5">
      <div className="relative">
        <div className="absolute left-5 right-5 top-5 hidden h-px bg-[var(--color-border-default)] sm:block" />
        <motion.div
          className="absolute left-5 top-5 hidden h-px bg-[var(--color-brand-primary)] sm:block"
          initial={{ width: 0 }}
          animate={{ width: `calc((100% - 40px) * ${progress / 100})` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => {
            const complete = index < currentStep;
            const active = index === currentStep;

            return (
              <div key={step} className="relative z-10 flex items-center gap-3 sm:flex-col sm:items-start">
                <motion.span
                  className={`grid size-10 shrink-0 place-items-center rounded-full border text-sm font-black transition ${
                    complete
                      ? "border-[var(--color-status-success)] bg-[var(--color-status-success)] text-white"
                      : active
                        ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white shadow-[0_14px_30px_rgb(var(--brand-primary-rgb)/0.26)]"
                        : "border-[var(--color-border-default)] bg-[var(--app-background)] text-[var(--color-text-secondary)]"
                  }`}
                  animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={{ duration: 0.45 }}
                >
                  {complete ? <Check className="size-5" /> : index + 1}
                </motion.span>
                <div>
                  <p className={`text-sm font-black ${active || complete ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                    {step}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {complete ? "Completed" : active ? "In progress" : "Pending"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
