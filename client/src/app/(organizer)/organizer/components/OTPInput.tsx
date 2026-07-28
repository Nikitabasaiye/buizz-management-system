"use client";

import { useRef } from "react";

type OTPInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function OTPInput({ value, onChange }: OTPInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(event) => {
            const nextDigit = event.target.value.replace(/\D/g, "").slice(-1);
            const next = digits.map((item, itemIndex) => (itemIndex === index ? nextDigit : item)).join("");
            onChange(next);
            if (nextDigit && index < 5) refs.current[index + 1]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit && index > 0) refs.current[index - 1]?.focus();
          }}
          className="aspect-square min-h-12 rounded-2xl border border-[var(--color-border-default)] bg-white text-center text-lg font-black text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_4px_rgb(var(--brand-primary-rgb)/0.10)] sm:min-h-14"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
