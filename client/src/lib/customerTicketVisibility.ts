export type CustomerVisibleTicketBlock = {
    name?: string;
    price?: number;
    quantity?: number;
    totalQuantity?: number;
    onlineQuantity?: number;
    offlineQuantity?: number;
    reservedQuantity?: number;
    source?: string;
    visibility?: string;
    isReserved?: boolean;
    internalOnly?: boolean;
};

export function getCustomerOnlineQuantity(ticket: CustomerVisibleTicketBlock) {
    if (typeof ticket.onlineQuantity === "number") {
        return Math.max(ticket.onlineQuantity, 0);
    }

    if (typeof ticket.totalQuantity === "number") {
        const offline = ticket.offlineQuantity ?? 0;
        const reserved = ticket.reservedQuantity ?? 0;

        return Math.max(ticket.totalQuantity - offline - reserved, 0);
    }

    return Math.max(ticket.quantity ?? 0, 0);
}

export function isCustomerBookableTicket(ticket: CustomerVisibleTicketBlock) {
    const source = String(ticket.source ?? "").toLowerCase();
    const visibility = String(ticket.visibility ?? "").toLowerCase();

    if (ticket.isReserved) return false;
    if (ticket.internalOnly) return false;

    if (
        source === "offline" ||
        source === "reserved" ||
        source === "counter" ||
        source === "complimentary" ||
        source === "free"
    ) {
        return false;
    }

    if (
        visibility === "offline" ||
        visibility === "reserved" ||
        visibility === "internal" ||
        visibility === "admin"
    ) {
        return false;
    }

    return getCustomerOnlineQuantity(ticket) > 0;
}

export function getCustomerBookableTickets<T extends CustomerVisibleTicketBlock>(
    tickets: T[],
): T[] {
    return tickets
        .filter(isCustomerBookableTicket)
        .map((ticket) => ({
            ...ticket,
            quantity: getCustomerOnlineQuantity(ticket),
            totalQuantity: getCustomerOnlineQuantity(ticket),
        }));
}