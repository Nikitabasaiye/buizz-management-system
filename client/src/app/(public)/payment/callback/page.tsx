"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

type PaymentState = "verifying" | "success" | "failed" | "error";

function getStoredToken(): string {
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
      const token = s?.token || s?.state?.session?.token || s?.state?.token;
      if (token) return token;
    } catch {}
  }
  return "";
}

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<PaymentState>("verifying");
  const [message, setMessage] = useState("");
  const [returnPath, setReturnPath] = useState("/events");
  const [orderId, setOrderId] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const MAX_POLLS = 10;

  useEffect(() => {
    const oid =
      searchParams?.get("orderId") ||
      searchParams?.get("merchantTransactionId") ||
      searchParams?.get("transactionId") ||
      window.sessionStorage.getItem("buizz-pending-order") ||
      "";

    const savedReturn =
      window.sessionStorage.getItem("buizz-pending-booking-return") ||
      "/events";

    setReturnPath(savedReturn);
    setOrderId(oid);

    if (!oid) {
      setState("error");
      setMessage("No order ID found. Cannot verify payment.");
      return;
    }

    const verify = async (): Promise<boolean> => {
      try {
        const token = getStoredToken();
        const res = await fetch(`${API_BASE}/payments/verify/${oid}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });

        const data = await res.json();
        const status: string =
          data?.data?.status || data?.data?.state || "";

        if (status === "COMPLETED" || status === "completed") {
          window.sessionStorage.removeItem("buizz-pending-order");
          window.sessionStorage.removeItem("buizz-pending-booking-return");
          setState("success");
          setTimeout(
            () => router.push(`/booking/success?orderId=${oid}`),
            1800
          );
          return true;
        }

        if (status === "FAILED" || status === "failed") {
          setState("failed");
          setMessage("Your payment was not completed. Please try again.");
          return true;
        }

        // Still pending — keep polling
        return false;
      } catch {
        return false;
      }
    };

    // First attempt immediately
    verify().then((done) => {
      if (done) return;

      // Poll every 2 s up to MAX_POLLS times
      pollRef.current = setInterval(async () => {
        attemptsRef.current += 1;
        const done = await verify();

        if (done || attemptsRef.current >= MAX_POLLS) {
          clearInterval(pollRef.current!);
          if (!done) {
            setState("error");
            setMessage(
              "Payment status could not be confirmed. Please check your bookings or contact support if amount was deducted."
            );
          }
        }
      }, 2000);
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [searchParams, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-4 py-20 text-[var(--app-foreground)]">
      <div className="mx-auto w-full max-w-md rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center shadow-[0_18px_58px_rgba(15,23,42,0.08)] sm:rounded-[2rem] sm:p-8">

        {state === "verifying" && (
          <>
            <div className="mx-auto size-12 animate-spin rounded-full border-4 border-[var(--app-border)] border-t-[var(--color-brand-primary)]" />
            <h1 className="mt-5 text-2xl font-black">Verifying payment…</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
              Please wait while we confirm your payment. Do not close this page.
            </p>
            {orderId && (
              <p className="mt-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-xs font-black text-[var(--app-muted)]">
                Order: {orderId}
              </p>
            )}
          </>
        )}

        {state === "success" && (
          <>
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#22C55E]/15 text-3xl">
              ✅
            </div>
            <h1 className="mt-5 text-2xl font-black text-[#16A34A]">
              Payment Successful!
            </h1>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
              Your booking is confirmed. Redirecting to your tickets…
            </p>
          </>
        )}

        {(state === "failed" || state === "error") && (
          <>
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#EF4444]/10 text-3xl">
              ❌
            </div>
            <h1 className="mt-5 text-2xl font-black text-[#EF4444]">
              {state === "failed" ? "Payment Failed" : "Verification Error"}
            </h1>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
              {message}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={returnPath}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white transition hover:bg-[#d91665]"
              >
                Try Again
              </Link>
              <Link
                href="/profile/bookings"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 text-sm font-black transition hover:border-[var(--color-brand-primary)]/50"
              >
                My Bookings
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
