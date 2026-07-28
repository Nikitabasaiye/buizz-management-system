export type TicketType = "male" | "female" | "couple" | "kids" | "vip" | "gold" | "platinum" | "custom";

export type EventStatus =
  | "draft"
  | "pending-review"
  | "approved"
  | "rejected"
  | "published"
  | "unpublished"
  | "completed"
  | "cancelled";

export type EventSummary = {
  id: string;
  title: string;
  slug: string;
  city: string;
  startsAt: string;
  status: EventStatus;
};
