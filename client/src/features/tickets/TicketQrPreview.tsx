"use client";

import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

type BookingQrPayload = {
  eventId: string;
  eventSlug: string;
  bookingUrl: string;
};

type EntryQrPayload = {
  bookingId: string;
  ticketId: string;
  eventId: string;
  signedToken?: string;
};

type TicketQrPreviewProps =
  | { type: "booking"; payload: BookingQrPayload; previewMetadata?: boolean; disabled?: boolean }
  | { type: "entry"; payload: EntryQrPayload | string; previewMetadata?: boolean; disabled?: boolean };

export function TicketQrPreview({ type, payload, previewMetadata = false, disabled = false }: TicketQrPreviewProps) {
  // Use simple string or URL instead of JSON to avoid QR code size limit
  const value = useMemo(() => {
    if (typeof payload === "string") return payload;
    
    // For entry type, use ticket ID or booking ID as simple string
    if (type === "entry") {
      const entryPayload = payload as EntryQrPayload;
      return entryPayload.ticketId || entryPayload.bookingId || entryPayload.eventId || "unknown";
    }
    
    // For booking type, use simple URL or booking ID
    if (type === "booking") {
      const bookingPayload = payload as BookingQrPayload;
      return bookingPayload.bookingUrl || bookingPayload.eventId || bookingPayload.eventSlug || "unknown";
    }
    
    return String(payload || "unknown");
  }, [payload, type]);
  
  const [source, setSource] = useState("");

  useEffect(() => {
    let active = true;
    // Production backend must generate signed QR token and validate server-side.
    QRCode.toDataURL(value, {
      errorCorrectionLevel: "H",
      margin: 3,
      width: 512,
      color: { dark: "#090a0d", light: "#ffffff" },
    }).then((next) => {
      if (active) setSource(next);
    }).catch((error) => {
      if (active) setSource('');
    });
    return () => { active = false; };
  }, [value]);

  return (
    <div className="grid gap-3">
      <div className={`relative mx-auto grid aspect-square w-full max-w-56 place-items-center overflow-hidden rounded-lg bg-white p-2 ${disabled ? "opacity-40" : ""}`}>
        {source ? <img src={source} alt={`${type} QR code`} className="size-full" /> : <QrCode className="size-20 animate-pulse text-black/30" />}
        {disabled ? <span className="absolute inset-x-3 top-1/2 -translate-y-1/2 rotate-[-8deg] rounded bg-[var(--color-brand-primary)] px-2 py-2 text-xs font-black uppercase text-white">Entry blocked</span> : null}
      </div>
      {previewMetadata ? (
        <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-left">
          <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">{type === "booking" ? "Event Booking QR" : "Ticket Entry QR"}</p>
          <p className="mt-1 break-all text-xs font-semibold text-[var(--app-muted)]">{value}</p>
        </div>
      ) : null}
    </div>
  );
}
