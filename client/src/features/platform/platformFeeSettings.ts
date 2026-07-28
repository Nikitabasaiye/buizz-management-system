export type FeeChargeBasis = "per_booking" | "per_ticket";
export type FeeValueType = "fixed" | "percentage";
export type TaxableAmountMode = "subtotal" | "subtotal_plus_fees";

export type PlatformFeeMode = "none" | "per_booking" | "per_ticket" | "percentage";
export type ConvenienceFeeMode = "none" | "fixed" | "percentage";
export type TaxFeeMode = "none" | "percentage";

export type PlatformFeeSettings = {
    onlinePaymentsEnabled: boolean;
    mockPaymentMode: boolean;
    currency: "INR";
    freeEventsHaveNoFees: boolean;
    showFeeBreakdownToCustomer: boolean;

    platformFeeEnabled: boolean;
    platformFeeBasis: FeeChargeBasis;
    platformFeeValueType: FeeValueType;
    platformFeeAmount: number;
    platformFeePercentage: number;
    platformFeeMinimum: number;
    platformFeeMaximum: number;

    convenienceFeeEnabled: boolean;
    convenienceFeeBasis: FeeChargeBasis;
    convenienceFeeValueType: FeeValueType;
    convenienceFeeAmount: number;
    convenienceFeePercentage: number;
    convenienceFeeMinimum: number;
    convenienceFeeMaximum: number;

    taxEnabled: boolean;
    taxMode: TaxFeeMode;
    taxLabel: string;
    taxPercentage: number;
    taxableAmountMode: TaxableAmountMode;

    organizerPaysPlatformFee: boolean;
    customerPaysConvenienceFee: boolean;
    includeTaxesInOrganizerSettlement: boolean;

    /** Backward-compatible fields used by older booking/ticket code. */
    platformFeeMode: PlatformFeeMode;
    platformFeePerBooking: number;
    platformFeePerTicket: number;
    convenienceFeeMode: ConvenienceFeeMode;
    convenienceFeeFixed: number;

    updatedAt: string;
    updatedByRole: "super-admin";
};

export type BookingFeeCalculationInput = {
    subtotal: number;
    ticketQuantity: number;
    isFreeRegistration?: boolean;
    settings?: PlatformFeeSettings;
};

export type BookingFeeBreakdown = {
    subtotal: number;
    ticketQuantity: number;

    platformFeeMode: PlatformFeeMode;
    platformFeePerBooking: number;
    platformFeePerTicket: number;
    platformFeePercentage: number;
    platformFee: number;

    platformFeeEnabled: boolean;
    platformFeeBasis: FeeChargeBasis;
    platformFeeValueType: FeeValueType;
    platformFeeAmount: number;
    platformFeeMinimum: number;
    platformFeeMaximum: number;

    convenienceFeeMode: ConvenienceFeeMode;
    convenienceFeeFixed: number;
    convenienceFeePercentage: number;
    convenienceFee: number;

    convenienceFeeEnabled: boolean;
    convenienceFeeBasis: FeeChargeBasis;
    convenienceFeeValueType: FeeValueType;
    convenienceFeeAmount: number;
    convenienceFeeMinimum: number;
    convenienceFeeMaximum: number;

    taxMode: TaxFeeMode;
    taxEnabled: boolean;
    taxLabel: string;
    taxPercentage: number;
    taxableAmountMode: TaxableAmountMode;
    taxes: number;

    total: number;
    organizerPayable: number;
    platformRevenue: number;
    organizerPaysPlatformFee: boolean;
    customerPaysConvenienceFee: boolean;
    includeTaxesInOrganizerSettlement: boolean;
};

export const platformFeeSettingsStorageKey = "buizz-platform-fee-settings";
export const platformFeeSettingsUpdatedEvent = "buizz-platform-fee-settings-updated";
export const legacyPlatformFinanceRulesKey = "buizz-platform-finance-rules";

export const DEFAULT_PLATFORM_FEE_SETTINGS: PlatformFeeSettings = {
    onlinePaymentsEnabled: true,
    mockPaymentMode: true,
    currency: "INR",
    freeEventsHaveNoFees: true,
    showFeeBreakdownToCustomer: true,

    platformFeeEnabled: true,
    platformFeeBasis: "per_booking",
    platformFeeValueType: "percentage",
    platformFeeAmount: 0,
    platformFeePercentage: 7,
    platformFeeMinimum: 0,
    platformFeeMaximum: 0,

    convenienceFeeEnabled: false,
    convenienceFeeBasis: "per_booking",
    convenienceFeeValueType: "percentage",
    convenienceFeeAmount: 0,
    convenienceFeePercentage: 0,
    convenienceFeeMinimum: 0,
    convenienceFeeMaximum: 0,

    taxEnabled: false,
    taxMode: "percentage",
    taxLabel: "Taxes",
    taxPercentage: 0,
    taxableAmountMode: "subtotal",

    organizerPaysPlatformFee: false,
    customerPaysConvenienceFee: true,
    includeTaxesInOrganizerSettlement: false,

    platformFeeMode: "percentage",
    platformFeePerBooking: 0,
    platformFeePerTicket: 0,
    convenienceFeeMode: "none",
    convenienceFeeFixed: 0,

    updatedAt: "2026-06-30T00:00:00.000Z",
    updatedByRole: "super-admin",
};

function safeNumber(value: unknown, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, parsed);
}

function clampPercentage(value: unknown, fallback = 0) {
    return Math.min(100, Math.max(0, safeNumber(value, fallback)));
}

function safeBasis(value: unknown, fallback: FeeChargeBasis): FeeChargeBasis {
    return value === "per_ticket" || value === "per_booking" ? value : fallback;
}

function safeValueType(value: unknown, fallback: FeeValueType): FeeValueType {
    if (value === "fixed_amount") return "fixed";
    return value === "percentage" || value === "fixed" ? value : fallback;
}

function safeTaxableMode(value: unknown): TaxableAmountMode {
    if (value === "subtotal_plus_customer_fees") return "subtotal_plus_fees";
    if (value === "ticket_subtotal") return "subtotal";
    return value === "subtotal_plus_fees" ? "subtotal_plus_fees" : "subtotal";
}

function safePlatformMode(value: unknown): PlatformFeeMode {
    if (
        value === "none" ||
        value === "per_booking" ||
        value === "per_ticket" ||
        value === "percentage"
    ) {
        return value;
    }
    return "per_booking";
}

function safeConvenienceMode(value: unknown): ConvenienceFeeMode {
    if (value === "none" || value === "fixed" || value === "percentage") {
        return value;
    }
    return "percentage";
}

function safeTaxMode(value: unknown): TaxFeeMode {
    return value === "none" ? "none" : "percentage";
}

function inferPlatformFeeMode(settings: Partial<PlatformFeeSettings>): PlatformFeeMode {
    if (settings.platformFeeEnabled === false) return "none";
    if (settings.platformFeeValueType === "percentage") return "percentage";
    if (settings.platformFeeBasis === "per_ticket") return "per_ticket";
    return safePlatformMode(settings.platformFeeMode ?? "per_booking");
}

function inferConvenienceFeeMode(settings: Partial<PlatformFeeSettings>): ConvenienceFeeMode {
    if (settings.convenienceFeeEnabled === false) return "none";
    if (settings.convenienceFeeValueType === "fixed") return "fixed";
    return safeConvenienceMode(settings.convenienceFeeMode ?? "percentage");
}

export function normalizePlatformFeeSettings(
    value: Partial<PlatformFeeSettings> | null | undefined,
): PlatformFeeSettings {
    const merged: Partial<PlatformFeeSettings> = {
        ...DEFAULT_PLATFORM_FEE_SETTINGS,
        ...(value ?? {}),
    };

    const legacyPlatformMode = safePlatformMode(merged.platformFeeMode);
    const legacyConvenienceMode = safeConvenienceMode(merged.convenienceFeeMode);

    const platformFeeValueType = safeValueType(
        merged.platformFeeValueType ?? (legacyPlatformMode === "percentage" ? "percentage" : "fixed"),
        legacyPlatformMode === "percentage" ? "percentage" : "fixed",
    );

    const platformFeeBasis = safeBasis(
        merged.platformFeeBasis ?? (legacyPlatformMode === "per_ticket" ? "per_ticket" : "per_booking"),
        legacyPlatformMode === "per_ticket" ? "per_ticket" : "per_booking",
    );

    const convenienceFeeValueType = safeValueType(
        merged.convenienceFeeValueType ?? (legacyConvenienceMode === "fixed" ? "fixed" : "percentage"),
        legacyConvenienceMode === "fixed" ? "fixed" : "percentage",
    );

    const convenienceFeeBasis = safeBasis(merged.convenienceFeeBasis, "per_booking");

    const platformFeeAmount = safeNumber(
        merged.platformFeeAmount ??
        (platformFeeBasis === "per_ticket" ? merged.platformFeePerTicket : merged.platformFeePerBooking),
        20,
    );

    const convenienceFeeAmount = safeNumber(
        merged.convenienceFeeAmount ?? merged.convenienceFeeFixed,
        0,
    );

    const platformFeeEnabled =
        merged.platformFeeEnabled ?? legacyPlatformMode !== "none";
    const convenienceFeeEnabled =
        merged.convenienceFeeEnabled ?? legacyConvenienceMode !== "none";
    const taxMode = safeTaxMode(merged.taxMode);
    const taxEnabled = merged.taxEnabled ?? taxMode !== "none";

    const normalized: PlatformFeeSettings = {
        onlinePaymentsEnabled: merged.onlinePaymentsEnabled !== false,
        mockPaymentMode: merged.mockPaymentMode !== false,
        currency: "INR",
        freeEventsHaveNoFees: merged.freeEventsHaveNoFees !== false,
        showFeeBreakdownToCustomer: merged.showFeeBreakdownToCustomer !== false,

        platformFeeEnabled,
        platformFeeBasis,
        platformFeeValueType,
        platformFeeAmount,
        platformFeePercentage: clampPercentage(merged.platformFeePercentage),
        platformFeeMinimum: safeNumber(merged.platformFeeMinimum),
        platformFeeMaximum: safeNumber(merged.platformFeeMaximum),

        convenienceFeeEnabled,
        convenienceFeeBasis,
        convenienceFeeValueType,
        convenienceFeeAmount,
        convenienceFeePercentage: clampPercentage(merged.convenienceFeePercentage, 2),
        convenienceFeeMinimum: safeNumber(merged.convenienceFeeMinimum),
        convenienceFeeMaximum: safeNumber(merged.convenienceFeeMaximum),

        taxEnabled,
        taxMode: taxEnabled ? "percentage" : "none",
        taxLabel: String(merged.taxLabel || "Taxes"),
        taxPercentage: clampPercentage(merged.taxPercentage, 5),
        taxableAmountMode: safeTaxableMode(merged.taxableAmountMode),

        organizerPaysPlatformFee: Boolean(merged.organizerPaysPlatformFee),
        customerPaysConvenienceFee: merged.customerPaysConvenienceFee !== false,
        includeTaxesInOrganizerSettlement: Boolean(merged.includeTaxesInOrganizerSettlement),

        platformFeeMode: "per_booking",
        platformFeePerBooking: 0,
        platformFeePerTicket: 0,
        convenienceFeeMode: "percentage",
        convenienceFeeFixed: 0,

        updatedAt: merged.updatedAt || new Date().toISOString(),
        updatedByRole: "super-admin",
    };

    normalized.platformFeeMode = inferPlatformFeeMode(normalized);
    normalized.platformFeePerBooking =
        normalized.platformFeeBasis === "per_booking" && normalized.platformFeeValueType === "fixed"
            ? normalized.platformFeeAmount
            : 0;
    normalized.platformFeePerTicket =
        normalized.platformFeeBasis === "per_ticket" && normalized.platformFeeValueType === "fixed"
            ? normalized.platformFeeAmount
            : 0;

    normalized.convenienceFeeMode = inferConvenienceFeeMode(normalized);
    normalized.convenienceFeeFixed =
        normalized.convenienceFeeValueType === "fixed" ? normalized.convenienceFeeAmount : 0;

    return normalized;
}

export async function readPlatformFeeSettings(): Promise<PlatformFeeSettings> {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
    
    // Resolve auth token
    let token = "";
    try {
        const s = JSON.parse(localStorage.getItem("buizz-customer-session") || "{}");
        token = s?.token || "";
    } catch {}
    if (!token) {
        try {
            const s = JSON.parse(localStorage.getItem("buizz-auth") || "{}");
            token = s?.state?.user?.token || "";
        } catch {}
    }

    const response = await fetch(`${API_BASE}/platform/fee-settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
        throw new Error("Failed to load platform fee settings from server");
    }

    const settings = await response.json();
    return normalizePlatformFeeSettings(settings);
}

export function savePlatformFeeSettings(settings: PlatformFeeSettings) {
    const normalized = normalizePlatformFeeSettings({
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedByRole: "super-admin",
    });

    if (typeof window !== "undefined") {
        window.localStorage.setItem(
            platformFeeSettingsStorageKey,
            JSON.stringify(normalized),
        );

        window.localStorage.setItem(
            legacyPlatformFinanceRulesKey,
            JSON.stringify({
                onlinePaymentsEnabled: normalized.onlinePaymentsEnabled,
                mockPaymentMode: normalized.mockPaymentMode,
                currency: normalized.currency,
                platformFeeMode: normalized.platformFeeMode,
                platformFeePerBooking: normalized.platformFeePerBooking,
                platformFeePerTicket: normalized.platformFeePerTicket,
                platformFeePercentage: normalized.platformFeePercentage,
                convenienceFeeMode: normalized.convenienceFeeMode,
                convenienceFeeFixed: normalized.convenienceFeeFixed,
                convenienceFeePercentage: normalized.convenienceFeePercentage,
                taxMode: normalized.taxMode,
                taxLabel: normalized.taxLabel,
                taxPercentage: normalized.taxPercentage,
                organizerPaysPlatformFee: normalized.organizerPaysPlatformFee,
                customerPaysConvenienceFee: normalized.customerPaysConvenienceFee,
            }),
        );

        window.dispatchEvent(new Event(platformFeeSettingsUpdatedEvent));
        window.dispatchEvent(new Event("storage"));
    }

    return normalized;
}

export function resetPlatformFeeSettings() {
    return savePlatformFeeSettings({
        ...DEFAULT_PLATFORM_FEE_SETTINGS,
        updatedAt: new Date().toISOString(),
    });
}

function applyFeeCapAndFloor(value: number, minimum: number, maximum: number) {
    if (value <= 0) return 0;
    const floored = minimum > 0 ? Math.max(value, minimum) : value;
    return maximum > 0 ? Math.min(floored, maximum) : floored;
}

function calculateConfigurableFee({
    enabled,
    valueType,
    basis,
    amount,
    percentage,
    minimum,
    maximum,
    subtotal,
    ticketQuantity,
}: {
    enabled: boolean;
    valueType: FeeValueType;
    basis: FeeChargeBasis;
    amount: number;
    percentage: number;
    minimum: number;
    maximum: number;
    subtotal: number;
    ticketQuantity: number;
}) {
    if (!enabled || subtotal <= 0) return 0;

    const raw =
        valueType === "percentage"
            ? (subtotal * percentage) / 100
            : basis === "per_ticket"
                ? amount * ticketQuantity
                : amount;

    return Math.round(applyFeeCapAndFloor(raw, minimum, maximum));
}

export function calculateBookingFees({
    subtotal,
    ticketQuantity,
    isFreeRegistration = false,
    settings = DEFAULT_PLATFORM_FEE_SETTINGS,
}: BookingFeeCalculationInput): BookingFeeBreakdown {
    const normalized = normalizePlatformFeeSettings(settings);
    const safeSubtotal = Math.round(safeNumber(subtotal));
    const safeTicketQuantity = Math.max(0, Math.round(safeNumber(ticketQuantity)));

    const freeWithNoFees =
        (isFreeRegistration || safeSubtotal <= 0) && normalized.freeEventsHaveNoFees;

    const platformFee = freeWithNoFees
        ? 0
        : calculateConfigurableFee({
            enabled: normalized.platformFeeEnabled,
            valueType: normalized.platformFeeValueType,
            basis: normalized.platformFeeBasis,
            amount: normalized.platformFeeAmount,
            percentage: normalized.platformFeePercentage,
            minimum: normalized.platformFeeMinimum,
            maximum: normalized.platformFeeMaximum,
            subtotal: safeSubtotal,
            ticketQuantity: safeTicketQuantity,
        });

    const convenienceFee = freeWithNoFees
        ? 0
        : calculateConfigurableFee({
            enabled: normalized.convenienceFeeEnabled,
            valueType: normalized.convenienceFeeValueType,
            basis: normalized.convenienceFeeBasis,
            amount: normalized.convenienceFeeAmount,
            percentage: normalized.convenienceFeePercentage,
            minimum: normalized.convenienceFeeMinimum,
            maximum: normalized.convenienceFeeMaximum,
            subtotal: safeSubtotal,
            ticketQuantity: safeTicketQuantity,
        });

    const customerPlatformFee = normalized.organizerPaysPlatformFee ? 0 : platformFee;
    const customerConvenienceFee = normalized.customerPaysConvenienceFee
        ? convenienceFee
        : 0;

    const taxableAmount =
        normalized.taxableAmountMode === "subtotal_plus_fees"
            ? safeSubtotal + customerPlatformFee + customerConvenienceFee
            : safeSubtotal;

    const taxes =
        freeWithNoFees || !normalized.taxEnabled
            ? 0
            : Math.round((taxableAmount * normalized.taxPercentage) / 100);

    const total = safeSubtotal + customerPlatformFee + customerConvenienceFee + taxes;
    const organizerFeeDeductions =
        (normalized.organizerPaysPlatformFee ? platformFee : 0) +
        (!normalized.customerPaysConvenienceFee ? convenienceFee : 0);
    const organizerPayable = Math.max(
        safeSubtotal - organizerFeeDeductions +
        (normalized.includeTaxesInOrganizerSettlement ? taxes : 0),
        0,
    );
    const platformRevenue = platformFee + convenienceFee;

    return {
        subtotal: safeSubtotal,
        ticketQuantity: safeTicketQuantity,

        platformFeeMode: platformFee > 0 ? normalized.platformFeeMode : "none",
        platformFeePerBooking: normalized.platformFeePerBooking,
        platformFeePerTicket: normalized.platformFeePerTicket,
        platformFeePercentage: normalized.platformFeePercentage,
        platformFee,

        platformFeeEnabled: normalized.platformFeeEnabled,
        platformFeeBasis: normalized.platformFeeBasis,
        platformFeeValueType: normalized.platformFeeValueType,
        platformFeeAmount: normalized.platformFeeAmount,
        platformFeeMinimum: normalized.platformFeeMinimum,
        platformFeeMaximum: normalized.platformFeeMaximum,

        convenienceFeeMode: convenienceFee > 0 ? normalized.convenienceFeeMode : "none",
        convenienceFeeFixed: normalized.convenienceFeeFixed,
        convenienceFeePercentage: normalized.convenienceFeePercentage,
        convenienceFee,

        convenienceFeeEnabled: normalized.convenienceFeeEnabled,
        convenienceFeeBasis: normalized.convenienceFeeBasis,
        convenienceFeeValueType: normalized.convenienceFeeValueType,
        convenienceFeeAmount: normalized.convenienceFeeAmount,
        convenienceFeeMinimum: normalized.convenienceFeeMinimum,
        convenienceFeeMaximum: normalized.convenienceFeeMaximum,

        taxMode: taxes > 0 ? "percentage" : "none",
        taxEnabled: normalized.taxEnabled,
        taxLabel: normalized.taxLabel,
        taxPercentage: normalized.taxPercentage,
        taxableAmountMode: normalized.taxableAmountMode,
        taxes,

        total,
        organizerPayable,
        platformRevenue,
        organizerPaysPlatformFee: normalized.organizerPaysPlatformFee,
        customerPaysConvenienceFee: normalized.customerPaysConvenienceFee,
        includeTaxesInOrganizerSettlement: normalized.includeTaxesInOrganizerSettlement,
    };
}

export function formatPlatformFeeLabel(settings: PlatformFeeSettings) {
    const normalized = normalizePlatformFeeSettings(settings);

    if (!normalized.platformFeeEnabled) return "Platform fee disabled";
    if (normalized.platformFeeValueType === "percentage") {
        return `Platform fee ${normalized.platformFeePercentage}%`;
    }

    return normalized.platformFeeBasis === "per_ticket"
        ? `Platform fee ₹${normalized.platformFeeAmount} per ticket`
        : `Platform fee ₹${normalized.platformFeeAmount} per booking`;
}

export function formatConvenienceFeeLabel(settings: PlatformFeeSettings) {
    const normalized = normalizePlatformFeeSettings(settings);

    if (!normalized.convenienceFeeEnabled) return "Convenience fee disabled";
    if (normalized.convenienceFeeValueType === "percentage") {
        return `Convenience fee ${normalized.convenienceFeePercentage}%`;
    }

    return normalized.convenienceFeeBasis === "per_ticket"
        ? `Convenience fee ₹${normalized.convenienceFeeAmount} per ticket`
        : `Convenience fee ₹${normalized.convenienceFeeAmount} per booking`;
}

export function formatTaxFeeLabel(settings: PlatformFeeSettings) {
    const normalized = normalizePlatformFeeSettings(settings);

    if (!normalized.taxEnabled) return `${normalized.taxLabel} disabled`;
    return `${normalized.taxLabel} ${normalized.taxPercentage}%`;
}

export function getPlatformFeeLabel(breakdown: BookingFeeBreakdown) {
    if (breakdown.platformFeeMode === "none") return "Platform fee";
    if (breakdown.platformFeeValueType === "percentage") {
        return `Platform fee (${breakdown.platformFeePercentage}%)`;
    }

    return breakdown.platformFeeBasis === "per_ticket"
        ? `Platform fee (${breakdown.ticketQuantity} tickets)`
        : "Platform fee";
}

export function getConvenienceFeeLabel(breakdown: BookingFeeBreakdown) {
    if (breakdown.convenienceFeeMode === "none") return "Convenience fee";
    if (breakdown.convenienceFeeValueType === "percentage") {
        return `Convenience fee (${breakdown.convenienceFeePercentage}%)`;
    }

    return breakdown.convenienceFeeBasis === "per_ticket"
        ? `Convenience fee (${breakdown.ticketQuantity} tickets)`
        : "Convenience fee";
}

export function getTaxFeeLabel(breakdown: BookingFeeBreakdown) {
    if (breakdown.taxMode === "percentage") {
        return `${breakdown.taxLabel} (${breakdown.taxPercentage}%)`;
    }

    return breakdown.taxLabel || "Taxes";
}
