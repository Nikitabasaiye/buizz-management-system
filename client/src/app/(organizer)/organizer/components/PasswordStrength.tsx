"use client";

import { CheckCircle2, Circle } from "lucide-react";

type PasswordStrengthProps = {
  password: string;
};

const requirements = [
  { label: "Minimum 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One number", test: (value: string) => /\d/.test(value) },
  { label: "One special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const passed = requirements.filter((requirement) => requirement.test(password)).length;
  const strength = passed <= 1 ? "Weak" : passed <= 3 ? "Good" : "Strong";
  const barColor = passed <= 1 ? "bg-[var(--color-brand-secondary)]" : passed <= 3 ? "bg-[var(--color-brand-primary)]" : "bg-[var(--color-status-success)]";

  return (
    <div className="rounded-[18px] border border-[var(--color-border-default)] bg-[var(--app-background)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-[var(--color-text-primary)]">Password Strength</p>
        <p className="text-sm font-black text-[var(--color-brand-primary)]">{strength}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border-default)]">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${(passed / requirements.length) * 100}%` }} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {requirements.map((requirement) => {
          const valid = requirement.test(password);
          return (
            <p key={requirement.label} className={`flex items-center gap-2 text-xs font-bold ${valid ? "text-[var(--color-status-success)]" : "text-[var(--color-text-secondary)]"}`}>
              {valid ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
              {requirement.label}
            </p>
          );
        })}
      </div>
    </div>
  );
}
