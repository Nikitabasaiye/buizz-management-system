"use client";

import type { CSSProperties } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";

type ActionFeedbackProps = {
  successMessage?: string;
  errorMessage?: string;
  className?: string;
};

export function ActionFeedback({
  successMessage,
  errorMessage,
  className = "",
}: ActionFeedbackProps) {
  if (!successMessage && !errorMessage) return null;

  const success = Boolean(successMessage);
  const Icon = success ? CheckCircle2 : TriangleAlert;

  const feedbackStyle = {
    "--feedback-color": success
      ? "var(--color-status-success)"
      : "var(--color-brand-primary)",
  } as CSSProperties;

  return (
    <div
      style={feedbackStyle}
      className={[
        "mt-3 flex items-start gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-black",
        "text-[var(--feedback-color)]",
        "[background:color-mix(in_srgb,var(--feedback-color)_10%,var(--app-elevated))]",
        "[border-color:color-mix(in_srgb,var(--feedback-color)_32%,var(--app-border))]",
        "shadow-sm",
        className,
      ].join(" ")}
      role={success ? "status" : "alert"}
      aria-live="polite"
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="leading-5">{successMessage || errorMessage}</span>
    </div>
  );
}