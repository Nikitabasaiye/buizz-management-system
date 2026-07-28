// import { SEAT_HOLD_STORAGE_KEY } from "@/features/seat-map/constants";
// import { createSeatMapId } from "@/features/seat-map/seatMapTemplateStore";
// import type { SeatHold } from "@/features/seat-map/types";

// export function readSeatHolds() {
//   const now = Date.now();
//   const active = readArray<SeatHold>(SEAT_HOLD_STORAGE_KEY).filter((hold) => new Date(hold.expiresAt).getTime() > now);
//   writeSeatHolds(active);
//   return active;
// }

// export function writeSeatHolds(holds: SeatHold[]) {
//   writeValue(SEAT_HOLD_STORAGE_KEY, holds);
// }

// export function createSeatHold(eventId: string, seatIds: string[], sessionId: string, minutes = 10) {
//   const now = Date.now();
//   const hold: SeatHold = {
//     id: createSeatMapId("seat-hold"),
//     eventId,
//     seatIds,
//     sessionId,
//     createdAt: new Date(now).toISOString(),
//     expiresAt: new Date(now + minutes * 60 * 1000).toISOString(),
//   };
//   writeSeatHolds([hold, ...readSeatHolds().filter((item) => item.eventId !== eventId || item.sessionId !== sessionId)]);
//   return hold;
// }

// export function releaseSeatHold(holdId: string) {
//   writeSeatHolds(readSeatHolds().filter((hold) => hold.id !== holdId));
// }

// function readArray<T>(key: string): T[] {
//   if (typeof window === "undefined") return [];
//   try {
//     const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
//     return Array.isArray(parsed) ? (parsed as T[]) : [];
//   } catch {
//     return [];
//   }
// }

// function writeValue<T>(key: string, value: T) {
//   if (typeof window === "undefined") return;
//   window.localStorage.setItem(key, JSON.stringify(value));
// }
import { SEAT_HOLD_STORAGE_KEY } from "@/features/seat-map/constants";
import { createSeatMapId } from "@/features/seat-map/seatMapTemplateStore";
import type { SeatHold } from "@/features/seat-map/types";

export function readSeatHolds() {
  const now = Date.now();
  const active = readArray<SeatHold>(SEAT_HOLD_STORAGE_KEY).filter((hold) => new Date(hold.expiresAt).getTime() > now);
  writeSeatHolds(active);
  return active;
}

export function writeSeatHolds(holds: SeatHold[]) {
  writeValue(SEAT_HOLD_STORAGE_KEY, holds);
}

export function createSeatHold(eventId: string, seatIds: string[], sessionId: string, minutes = 10) {
  const now = Date.now();
  const hold: SeatHold = {
    id: createSeatMapId("seat-hold"),
    eventId,
    seatIds,
    sessionId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + minutes * 60 * 1000).toISOString(),
  };
  writeSeatHolds([hold, ...readSeatHolds().filter((item) => item.eventId !== eventId || item.sessionId !== sessionId)]);
  // TODO: Replace with POST /api/booking/seat-holds.
  return hold;
}

export function releaseSeatHold(holdId: string) {
  writeSeatHolds(readSeatHolds().filter((hold) => hold.id !== holdId));
  // TODO: Replace with DELETE /api/booking/seat-holds/:holdId.
}

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
