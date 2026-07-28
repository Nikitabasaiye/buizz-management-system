export type BookingType =
    | "seated"
    | "theatre_seating"
    | "block_seating"
    | "capacity"
    | "slot_based"
    | "free_registration";

export type PricingMode = "paid" | "free";

export type CapacityTicketBlock = {
    blockId?: string;
    id?: string;
    name: string;
    price: number;
    totalQuantity: number;
    onlineQuantity?: number;
    offlineQuantity?: number;
    reservedQuantity?: number;
    soldOnline?: number;
    status?: "active" | "paused" | "sold_out";
};

type CapacityEngineInput = {
    event?: {
        bookingType?: BookingType;
        pricingMode?: PricingMode;
        seatMapMode?: "capacity_only" | "seat_map";
        ticketBlocks?: CapacityTicketBlock[];
        capacity?: number;
        priceMin?: number;
    } | null;
    item?: {
        kind?: string;
        price?: number;
    } | null;
};

export type CapacityEngineResult = {
    bookingType: BookingType;
    pricingMode: PricingMode;
    usesSeatMap: boolean;
    isFreeRegistration: boolean;
    shouldSkipPayment: boolean;
    maxTicketsPerBooking: number;
    selectionTitle: string;
    selectionDescription: string;
};

export function resolveBookingCapacityEngine({
    event,
    item,
}: CapacityEngineInput): CapacityEngineResult {
    const bookingType = resolveBookingType(event, item);
    const pricingMode = resolvePricingMode(event, item);
    const usesSeatMap = event?.seatMapMode
        ? event.seatMapMode === "seat_map"
        : bookingType === "seated" || bookingType === "theatre_seating";
    const isFreeRegistration = pricingMode === "free" || bookingType === "free_registration";

    return {
        bookingType,
        pricingMode,
        usesSeatMap,
        isFreeRegistration,
        shouldSkipPayment: isFreeRegistration,
        maxTicketsPerBooking: 10,
        selectionTitle: getSelectionTitle(bookingType, pricingMode),
        selectionDescription: getSelectionDescription(bookingType, pricingMode),
    };
}

export function resolveBookingType(
    event?: CapacityEngineInput["event"],
    item?: CapacityEngineInput["item"],
): BookingType {
    if (event?.bookingType) return event.bookingType;
    if (item?.kind === "plays") return "theatre_seating";
    if (item?.kind === "activities") return "slot_based";
    return "seated";
}

export function resolvePricingMode(
    event?: CapacityEngineInput["event"],
    item?: CapacityEngineInput["item"],
): PricingMode {
    if (event?.pricingMode) return event.pricingMode;
    if (Number(event?.priceMin ?? item?.price ?? 0) <= 0) return "free";
    return "paid";
}

export function getTicketBlockId(block: CapacityTicketBlock) {
    return String(block.blockId ?? block.id ?? block.name);
}

export function getOnlineAvailableQuantity(block: CapacityTicketBlock) {
    return Math.max(
        0,
        Number(block.onlineQuantity ?? block.totalQuantity ?? 0) -
        Number(block.soldOnline ?? 0),
    );
}

export function getOfflineQuantity(block: CapacityTicketBlock) {
    return Math.max(0, Number(block.offlineQuantity ?? 0));
}

export function getReservedQuantity(block: CapacityTicketBlock) {
    return Math.max(0, Number(block.reservedQuantity ?? 0));
}

export function getBookableInventoryLabel(block: CapacityTicketBlock) {
    return {
        onlineLeft: getOnlineAvailableQuantity(block),
        offline: getOfflineQuantity(block),
        reserved: getReservedQuantity(block),
        total: Math.max(0, Number(block.totalQuantity ?? 0)),
    };
}

function getSelectionTitle(bookingType: BookingType, pricingMode: PricingMode) {
    if (pricingMode === "free" || bookingType === "free_registration") {
        return "Select Registration Pass";
    }

    if (bookingType === "slot_based") return "Select Slot Pass";
    if (bookingType === "capacity") return "Select Capacity Ticket";
    if (bookingType === "block_seating") return "Select Ticket Block";
    return "Select Ticket Block";
}

function getSelectionDescription(bookingType: BookingType, pricingMode: PricingMode) {
    if (pricingMode === "free" || bookingType === "free_registration") {
        return "Free registration skips payment and directly generates a confirmed Buizz ticket.";
    }

    if (bookingType === "slot_based") {
        return "Date and time slot capacity is controlled by organizer/admin inventory.";
    }

    return "";
}
