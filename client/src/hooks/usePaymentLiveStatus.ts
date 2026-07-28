"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export type LivePaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "unknown";

interface UseLiveStatusOptions {
  /** Poll interval in ms. Default 3000. */
  interval?: number;
  /** Stop polling after this many attempts. Default 20. */
  maxAttempts?: number;
  /** Stop polling once a terminal status is reached. Default true. */
  stopOnTerminal?: boolean;
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  const keys = [
    "buizz-customer-session",
    "buizz-organizer-session",
    "buizz-admin-session",
    "buizz-super-admin-session",
  ];
  for (const key of keys) {
    try {
      const s = JSON.parse(localStorage.getItem(key) || "{}");
      const t = s?.token || s?.state?.session?.token || s?.state?.token;
      if (t) return t;
    } catch {}
  }
  return "";
}

const TERMINAL: LivePaymentStatus[] = ["completed", "failed", "refunded"];

export function usePaymentLiveStatus(
  orderId: string | null | undefined,
  options: UseLiveStatusOptions = {}
) {
  const { interval = 3000, maxAttempts = 20, stopOnTerminal = true } = options;

  const [status, setStatus] = useState<LivePaymentStatus>("unknown");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!orderId) return;

    attemptsRef.current = 0;

    const poll = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/payments/status/${orderId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });

        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }

        const json = await res.json();
        const s: LivePaymentStatus =
          (json?.data?.status as LivePaymentStatus) || "unknown";

        setStatus(s);
        setData(json?.data ?? null);
        setError(null);

        attemptsRef.current += 1;

        if (
          (stopOnTerminal && TERMINAL.includes(s)) ||
          attemptsRef.current >= maxAttempts
        ) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Network error");
      }
    };

    // Immediate first call
    poll();
    timerRef.current = setInterval(poll, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [orderId, interval, maxAttempts, stopOnTerminal]);

  return { status, data, error };
}
