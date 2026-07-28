import type { Booking, PlatformFee, Revenue, Settlement } from "@/types/buizz";

export function calculateRevenueSummary(bookings: Booking[]): Revenue {
  const amountFor = (source: Booking["source"]) =>
    bookings
      .filter((booking) => booking.source === source && booking.status !== "cancelled" && booking.status !== "refunded")
      .reduce((sum, booking) => sum + Number(booking.amount ?? booking.totalAmount ?? 0), 0);

  const onlineRevenue = amountFor("online");
  const offlineRevenue = amountFor("offline");
  const reservedValue = amountFor("reserved");
  const grossRevenue = onlineRevenue + offlineRevenue + reservedValue;
  const platformFees = Math.round(grossRevenue * 0.08);

  return {
    onlineRevenue,
    offlineRevenue,
    reservedValue,
    grossRevenue,
    platformFees,
    netOrganizerAmount: grossRevenue - platformFees,
    paidAmount: 0,
    remainingAmount: grossRevenue - platformFees,
    currency: "INR",
  };
}

export function calculateSettlementSummary(revenue: Revenue, platformFee?: PlatformFee): Settlement {
  const feeAmount =
    "calculatedAmount" in (platformFee ?? {})
      ? Number((platformFee as { calculatedAmount?: number }).calculatedAmount ?? revenue.platformFees)
      : revenue.platformFees;

  return {
    settlementId: `settlement-${revenue.eventId ?? revenue.organizerId ?? ""}`,
    status: "pending",
    grossRevenue: revenue.grossRevenue,
    platformFees: feeAmount,
    organizerPayable: Math.max(0, revenue.grossRevenue - feeAmount),
    paidAmount: revenue.paidAmount,
    remainingAmount: Math.max(0, revenue.grossRevenue - feeAmount - revenue.paidAmount),
    updatedAt: new Date().toISOString(),
  };
}
