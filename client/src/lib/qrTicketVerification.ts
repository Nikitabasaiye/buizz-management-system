export type TicketQrPayload = {
    bookingId?: string;
    ticketId?: string;
    eventId?: string;
    gate?: string;
    signedToken?: string;
    issuedAt?: string;
};

export type VerifiableTicketRecord = {
    bookingId?: string;
    ticketId?: string;
    eventId?: string;
    eventName?: string;
    customerName?: string;
    buyerName?: string;
    status?: string;
    qrStatus?: string;
    checkedInAt?: string;
};

export type TicketVerificationResult = {
    valid: boolean;
    status:
    | "valid"
    | "already_checked_in"
    | "cancelled"
    | "refunded"
    | "invalid_qr"
    | "not_found"
    | "wrong_event";
    title: string;
    message: string;
    ticket?: VerifiableTicketRecord;
    payload?: TicketQrPayload;
};

export function parseTicketQrPayload(rawValue: unknown): TicketQrPayload | null {
    if (!rawValue) return null;

    if (typeof rawValue === "object") {
        return rawValue as TicketQrPayload;
    }

    if (typeof rawValue !== "string") {
        return null;
    }

    try {
        const parsed = JSON.parse(rawValue) as TicketQrPayload;
        return parsed;
    } catch {
        const ticketMatch = rawValue.match(/TKT-[A-Z0-9-]+/i);
        const bookingMatch = rawValue.match(/BUIZZ-[A-Z0-9-]+/i);

        if (!ticketMatch && !bookingMatch) return null;

        return {
            ticketId: ticketMatch?.[0],
            bookingId: bookingMatch?.[0],
        };
    }
}

export function verifyTicketQr(
    rawValue: unknown,
    tickets: VerifiableTicketRecord[],
    options?: {
        expectedEventId?: string;
    },
): TicketVerificationResult {
    const payload = parseTicketQrPayload(rawValue);

    if (!payload?.ticketId && !payload?.bookingId) {
        return {
            valid: false,
            status: "invalid_qr",
            title: "Invalid QR",
            message: "This QR code does not contain a valid Buizz ticket or booking ID.",
        };
    }

    const ticket = tickets.find((item) => {
        const sameBooking =
            payload.bookingId &&
            item.bookingId &&
            item.bookingId === payload.bookingId;

        const sameTicket =
            !sameBooking &&
            payload.ticketId &&
            item.ticketId &&
            item.ticketId === payload.ticketId;

        return Boolean(sameBooking || sameTicket);
    });

    if (!ticket) {
        return {
            valid: false,
            status: "not_found",
            title: "Ticket Not Found",
            message: "This ticket was not found in Buizz records.",
            payload,
        };
    }

    if (
        options?.expectedEventId &&
        ticket.eventId &&
        ticket.eventId !== options.expectedEventId
    ) {
        return {
            valid: false,
            status: "wrong_event",
            title: "Wrong Event",
            message: "This ticket belongs to another event.",
            ticket,
            payload,
        };
    }

    const status = String(ticket.status ?? "").toLowerCase();

    if (status === "cancelled") {
        return {
            valid: false,
            status: "cancelled",
            title: "Cancelled Ticket",
            message: "This ticket has been cancelled and cannot be used for entry.",
            ticket,
            payload,
        };
    }

    if (status === "refunded") {
        return {
            valid: false,
            status: "refunded",
            title: "Refunded Ticket",
            message: "This ticket has been refunded and cannot be used for entry.",
            ticket,
            payload,
        };
    }

    if (ticket.checkedInAt || String(ticket.qrStatus ?? "").toLowerCase().includes("checked")) {
        return {
            valid: false,
            status: "already_checked_in",
            title: "Already Checked In",
            message: "This ticket has already been used for entry.",
            ticket,
            payload,
        };
    }

    return {
        valid: true,
        status: "valid",
        title: "Valid Ticket",
        message: "Ticket verified successfully. Entry can be allowed.",
        ticket,
        payload,
    };
}

export function markTicketCheckedIn<T extends VerifiableTicketRecord>(
    tickets: T[],
    ticketId?: string,
    bookingId?: string,
): T[] {
    const checkedInAt = new Date().toISOString();

    return tickets.map((ticket) => {
        const sameBooking = bookingId && ticket.bookingId === bookingId;
        const sameTicket = !sameBooking && ticketId && ticket.ticketId === ticketId;

        if (!sameTicket && !sameBooking) return ticket;

        return {
            ...ticket,
            status: ticket.status ?? "Valid",
            qrStatus: "Checked In",
            checkedInAt,
        };
    });
}
