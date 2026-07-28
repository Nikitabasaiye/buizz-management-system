"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2, MapPin, QrCode, Ticket, XCircle } from "lucide-react";
import { useGetTicketScanInfoQuery } from "@/store/api/ticketsApi";
import { parseTicketQrPayload } from "@/features/tickets";

export default function ScanTicketPage() {
  const searchParams = useSearchParams();
  const [ticketNumber, setTicketNumber] = useState("");
  const [inputValue, setInputValue] = useState("");

  // Auto-populate from URL query params (e.g. QR code scan redirects here)
  useEffect(() => {
    const qr = searchParams?.get("qrPayload") || searchParams?.get("ticketId") || searchParams?.get("t") || "";
    if (qr) {
      const parsed = parseTicketQrPayload(qr);
      const resolved = parsed?.ticketId ?? parsed?.bookingId ?? qr;
      setTicketNumber(resolved);
      setInputValue(resolved);
    }
  }, [searchParams]);

  const { data, isLoading, isError, isFetching } = useGetTicketScanInfoQuery(ticketNumber, {
    skip: !ticketNumber,
  });

  const info = data?.data;
  const ticket = info?.ticket;
  const event = info?.event;

  const statusColor =
    ticket?.status === "active"
      ? "text-green-400 bg-green-400/10 border-green-400/30"
      : ticket?.status === "used"
      ? "text-blue-400 bg-blue-400/10 border-blue-400/30"
      : "text-red-400 bg-red-400/10 border-red-400/30";

  const StatusIcon = ticket?.status === "active" ? CheckCircle2 : XCircle;

  return (
    <main className="min-h-screen bg-[#0f0f1a] px-4 py-8 text-white">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#6c63ff]">
            <QrCode className="size-7" />
          </div>
          <h1 className="text-2xl font-black">Ticket Verification</h1>
          <p className="mt-1 text-sm text-white/60">Scan or enter a ticket number to verify</p>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter ticket number or QR payload"
            className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#6c63ff]"
            onKeyDown={(e) => e.key === "Enter" && setTicketNumber(inputValue.trim())}
          />
          <button
            type="button"
            onClick={() => setTicketNumber(inputValue.trim())}
            className="min-h-12 rounded-2xl bg-[#6c63ff] px-5 text-sm font-black transition hover:bg-[#5a52e0]"
          >
            Verify
          </button>
        </div>

        {/* Loading */}
        {(isLoading || isFetching) && ticketNumber && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <QrCode className="mx-auto size-8 animate-pulse text-[#6c63ff]" />
            <p className="mt-3 text-sm font-semibold text-white/60">Verifying ticket…</p>
          </div>
        )}

        {/* Error */}
        {isError && ticketNumber && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-center">
            <XCircle className="mx-auto size-8 text-red-400" />
            <p className="mt-3 font-black text-red-400">Ticket Not Found</p>
            <p className="mt-1 text-sm text-white/50">This ticket number does not exist in our system.</p>
          </div>
        )}

        {/* Result */}
        {ticket && event && !isLoading && !isFetching && (
          <div className="mt-6 grid gap-4">
            {/* Status banner */}
            <div className={`flex items-center gap-3 rounded-2xl border p-4 ${statusColor}`}>
              <StatusIcon className="size-6 shrink-0" />
              <div>
                <p className="font-black uppercase tracking-wide text-sm">
                  {ticket.status === "active" ? "Valid — Entry Permitted" :
                   ticket.status === "used" ? "Already Scanned" : "Invalid Ticket"}
                </p>
                {ticket.checkedIn && ticket.checkedInAt && (
                  <p className="mt-0.5 text-xs opacity-70">
                    Scanned at {new Date(ticket.checkedInAt).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            </div>

            {/* Event details */}
            <div className="rounded-2xl border border-white/10 bg-[#16213e] p-5">
              {event.banner && (
                <img
                  src={event.banner}
                  alt={event.title}
                  className="mb-4 h-36 w-full rounded-xl object-cover"
                />
              )}
              <p className="text-xs font-black uppercase tracking-widest text-[#6c63ff]">Event</p>
              <h2 className="mt-1 text-xl font-black">{event.title}</h2>

              <div className="mt-4 grid gap-2 text-sm text-white/70">
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-[#6c63ff]" />
                  {event.startDate
                    ? new Date(event.startDate).toLocaleString("en-IN", {
                        weekday: "short", day: "2-digit", month: "short",
                        year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
                      })
                    : "Date pending"}
                </p>
                {event.venueName && (
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-[#6c63ff]" />
                    {[event.venueName, event.venueCity].filter(Boolean).join(", ")}
                  </p>
                )}
                {event.venueAddress && (
                  <p className="ml-6 text-xs text-white/40">{event.venueAddress}</p>
                )}
              </div>
            </div>

            {/* Ticket details */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-[#6c63ff]">Ticket</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-white/40">Ticket Number</p>
                  <p className="mt-1 font-black">{ticket.ticketNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Status</p>
                  <p className="mt-1 font-black capitalize">{ticket.status}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Price</p>
                  <p className="mt-1 font-black">₹{Number(ticket.price).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Check-in</p>
                  <p className="mt-1 font-black">{ticket.checkedIn ? "Done" : "Pending"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
