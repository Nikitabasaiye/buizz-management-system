export type TicketType = "male" | "female" | "couple" | "kids" | "vip" | "gold" | "platinum" | "custom";

export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export type EventSummary = {
  id: string;
  title: string;
  slug: string;
  city: string;
  startsAt: string;
  status: EventStatus;
};
