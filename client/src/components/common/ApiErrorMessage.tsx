"use client";

import { AlertCircle, CheckCircle2, WifiOff, ShieldAlert, Clock } from "lucide-react";
import { getApiError, isNetworkError, isUnauthorized } from "@/utils/apiError";

interface ApiErrorMessageProps {
  error?: unknown;
  message?: string;
  type?: "error" | "success" | "warning" | "info";
  className?: string;
}

export function ApiErrorMessage({ error, message, type = "error", className = "" }: ApiErrorMessageProps) {
  const text = message ?? (error ? getApiError(error) : null);
  if (!text) return null;

  const isNetwork = error ? isNetworkError(error) : false;
  const isAuth    = error ? isUnauthorized(error) : false;

  const styles = {
    error:   "border-red-500/25 bg-red-500/8 text-red-600",
    success: "border-emerald-500/25 bg-emerald-500/8 text-emerald-600",
    warning: "border-amber-500/25 bg-amber-500/8 text-amber-600",
    info:    "border-blue-500/25 bg-blue-500/8 text-blue-600",
  };

  const Icon =
    type === "success" ? CheckCircle2 :
    isNetwork          ? WifiOff :
    isAuth             ? ShieldAlert :
    type === "warning" ? Clock :
    AlertCircle;

  return (
    <p className={`flex items-start gap-1.5 rounded-xl border px-2.5 py-1.5 text-[9px] font-black leading-4 sm:px-3 sm:py-2 sm:text-xs ${styles[type]} ${className}`}>
      <Icon className="mt-0.5 size-3 shrink-0 sm:size-3.5" />
      {text}
    </p>
  );
}

interface InlineApiErrorProps {
  error?: unknown;
  className?: string;
}

export function InlineApiError({ error, className = "" }: InlineApiErrorProps) {
  if (!error) return null;
  return <ApiErrorMessage error={error} type="error" className={className} />;
}
