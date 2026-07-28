import type { CreateRefundRequestPayload, RefundRequest } from "@/types/buizz";

export const refundService = {
  getRefundRequests(filters?: { eventId?: string; status?: RefundRequest["status"] | "all" }) {
    // Stub: Mock API store removed, returning empty array
    return [];
  },
  createRefundRequest(payload: CreateRefundRequestPayload) {
    // Stub: Mock API store removed, returning empty object
    return {} as any;
  },
  updateRefundStatus(payload: { id: string; status: RefundRequest["status"]; adminComment?: string }) {
    // Stub: Mock API store removed, returning null
    return null;
  },
};
