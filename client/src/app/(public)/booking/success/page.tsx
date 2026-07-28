"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { Footer } from "@/components/common/Footer";
import { PageLogoLoader } from "@/components/common/BuizzLogoLoader";
import { bookingToBuizzTickets } from "@/features/account/serverTicketAdapter";
import { BuizzTicketGrid } from "@/features/tickets";
import type { BookingDetails } from "@/store/api/bookingsApi";
import { apiSlice } from "@/store/apiSlice";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export default function BookingSuccessQueryPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("orderId") || "";
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const invalidated = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided.");
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        let token = "";
        try {
          const zustand = JSON.parse(localStorage.getItem("buizz-auth") || "{}");
          token = zustand?.state?.user?.token || "";
        } catch {}
        if (!token) {
          try {
            const session = JSON.parse(localStorage.getItem("buizz-customer-session") || "{}");
            token = session?.token || "";
          } catch {}
        }

        const res = await fetch(`${API_BASE}/bookings/${orderId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });

        const data = await res.json();
        if (data?.success && data?.data) {
          setBooking(data.data);
          if (!invalidated.current) {
            invalidated.current = true;
            dispatch(apiSlice.util.invalidateTags(["Ticket", "Booking"]));
          }
        } else {
          setError(data?.message || "Booking details not found.");
        }
      } catch {
        setError("Failed to load booking details.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [orderId, dispatch]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
        <PageLogoLoader />
      </main>
    );
  }

  if (error || !booking) {
    return (
      <>
        <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-4 py-20 text-[var(--app-foreground)]">
          <div className="mx-auto w-full max-w-md rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 text-center shadow-[0_18px_58px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              Booking Confirmed
            </p>
            <h1 className="mt-3 text-2xl font-black">Payment Successful</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
              {error || "Your booking is confirmed. Check your tickets below."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/profile/tickets"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white transition hover:bg-[#d91665]"
              >
                View My Tickets
              </Link>
              <Link
                href="/events"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 text-sm font-black transition hover:border-[var(--color-brand-primary)]/50"
              >
                Explore Events
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const tickets = bookingToBuizzTickets(booking);

  return (
    <>
      <main className="min-h-screen overflow-x-hidden bg-[var(--app-background)] px-3 py-6 text-[var(--app-foreground)] min-[360px]:px-4 sm:px-5 sm:py-8 lg:px-8">
        <section className="mx-auto grid w-full max-w-[1920px] gap-6">
          <div>
            <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">
              Payment successful
            </p>
            <h1 className="mt-2 text-3xl font-black">Your Buizz booking pass is ready</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
              Order {booking.orderId}. Your QR pass is ready for verified entry at the venue.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_18px_58px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-black">{booking.event?.title}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
              {typeof booking.event?.venue === "string" ? booking.event.venue : ""}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-black uppercase text-[var(--app-muted)]">Order ID</p>
                <p className="mt-1 font-black">{booking.orderId}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-[var(--app-muted)]">Amount Paid</p>
                <p className="mt-1 font-black">
                  Rs. {Number(booking.amount).toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-[var(--app-muted)]">Transaction ID</p>
                <p className="mt-1 break-all font-black">{booking.transactionId || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-[var(--app-muted)]">Tickets</p>
                <p className="mt-1 font-black">{booking.tickets?.length ?? 0}</p>
              </div>
            </div>
          </div>

          {tickets.length > 0 && <BuizzTicketGrid tickets={tickets} showActions />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/profile/tickets"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(236,27,114,0.28)] transition hover:bg-[#d91665]"
            >
              View All Tickets
            </Link>
            <Link
              href="/events"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 text-sm font-black transition hover:border-[var(--color-brand-primary)]/50"
            >
              Explore More Events
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
