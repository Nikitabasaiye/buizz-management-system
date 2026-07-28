"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

export function SuccessScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-4 py-10 text-[var(--color-text-primary)]">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-2xl rounded-[32px] border border-[var(--color-border-default)] bg-white p-6 text-center shadow-[0_28px_80px_rgb(17 24 39/0.10)] sm:p-10"
      >
        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.45, type: "spring", stiffness: 170 }}
          className="mx-auto grid size-24 place-items-center rounded-full bg-[var(--color-status-success)]/10 text-[var(--color-status-success)]"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.35, type: "spring", stiffness: 220 }}
            className="grid size-16 place-items-center rounded-full bg-[var(--color-status-success)] text-white"
          >
            <Check className="size-9" />
          </motion.span>
        </motion.div>

        <h1 className="mt-7 text-4xl font-black leading-tight text-[var(--color-text-primary)]">Welcome to Buizz 🎉</h1>
        <p className="mx-auto mt-4 max-w-lg text-base font-semibold leading-7 text-[var(--color-text-secondary)]">
          Your organizer account has been created successfully.
        </p>
        <p className="mx-auto mt-2 max-w-lg text-base font-semibold leading-7 text-[var(--color-text-secondary)]">
          We are reviewing your documents. Verification usually takes 24-48 hours.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/organizer/dashboard"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgb(var(--brand-primary-rgb)/0.24)] transition hover:scale-[1.02] hover:bg-[var(--color-brand-primary)]"
          >
            Go to Dashboard <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/organizer/intro"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--color-border-default)] bg-white px-6 text-sm font-black text-[var(--color-text-primary)] transition hover:scale-[1.02] hover:border-[var(--color-brand-secondary)] hover:text-[var(--color-brand-primary)]"
          >
            Explore Features
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
