import type { DiscoveryItem } from "@/features/discovery/data";
import type { Event as ServerEvent } from "@/store/api/eventsApi";

type FlatSearchEvent = {
  id: number | string;
  title?: string;
  description?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  type?: string;
  category?: string;
  language?: string;
  ageRestriction?: string;
  age_restriction?: string;
  duration?: string;
  termsConditions?: string;
  terms_conditions?: string;
  venueName?: string;
  venueCity?: string;
  venueState?: string;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  availableSeats?: number;
  totalSeats?: number;
  banner?: string;
  organizer?: { name?: string; email?: string; phone?: string };
};

export type ServerDiscoveryEvent = ServerEvent | FlatSearchEvent;

type ServerTicketType = {
  id?: number | string;
  name?: string;
  description?: string;
  price?: number | string;
  quantity?: number | string;
  availableQuantity?: number | string;
  available_quantity?: number | string;
};

const defaultEventImage =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80";

function getEventKind(event: ServerDiscoveryEvent): DiscoveryItem["kind"] {
  const value = `${event.category ?? ""} ${event.type ?? ""}`.toLowerCase();

  if (value.includes("play") || value.includes("theatre")) return "plays";
  if (
    value.includes("activit") ||
    value.includes("workshop") ||
    value.includes("game") ||
    value.includes("theme park") ||
    value.includes("sport")
  ) {
    return "activities";
  }

  return "events";
}

function getVenue(event: ServerDiscoveryEvent) {
  const nestedVenue = "venue" in event ? event.venue : undefined;

  return {
    name: nestedVenue?.name ?? ("venueName" in event ? event.venueName : "") ?? "Venue pending",
    city: nestedVenue?.city ?? ("venueCity" in event ? event.venueCity : "") ?? "City pending",
    state: nestedVenue?.state ?? ("venueState" in event ? event.venueState : "") ?? "",
  };
}

function toNumber(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function getTicketTypes(event: ServerDiscoveryEvent): ServerTicketType[] {
  if (!("ticketTypes" in event) || !Array.isArray(event.ticketTypes)) return [];
  return event.ticketTypes as ServerTicketType[];
}

function getMinPrice(event: ServerDiscoveryEvent) {
  if ("minPrice" in event && event.minPrice !== undefined && event.minPrice !== null) {
    return toNumber(event.minPrice);
  }

  const prices = getTicketTypes(event)
    .map((ticket) => toNumber(ticket.price))
    .filter((price) => price > 0);

  return prices.length ? Math.min(...prices) : 0;
}

function formatDate(value: unknown) {
  if (!value) return "Date pending";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatTime(value: unknown) {
  if (!value) return "";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getServerValue<T = unknown>(event: ServerDiscoveryEvent, ...keys: string[]): T | undefined {
  const record = event as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value as T;
  }

  return undefined;
}

export function serverEventToDiscoveryItem(event: ServerDiscoveryEvent): DiscoveryItem {
  const kind = getEventKind(event);
  const venue = getVenue(event);
  const price = getMinPrice(event);
  const title = event.title || "Untitled event";
  const category = event.category || "Event";
  const startDate = getServerValue<string>(event, "startDate", "start_date") || "";
  const dateLabel = formatDate(startDate);
  const timeLabel = formatTime(startDate);
  const ticketBlocks = getTicketTypes(event).map((ticket) => {
    const quantity = toNumber(ticket.quantity);
    const availableQuantity = toNumber(ticket.availableQuantity ?? ticket.available_quantity ?? quantity);

    return {
      blockId: String(ticket.id ?? ticket.name ?? "ticket"),
      id: String(ticket.id ?? ticket.name ?? "ticket"),
      name: ticket.name ?? "Entry Pass",
      description: ticket.description,
      price: toNumber(ticket.price),
      totalQuantity: quantity,
      onlineQuantity: availableQuantity,
      offlineQuantity: 0,
      reservedQuantity: 0,
      soldOnline: Math.max(0, quantity - availableQuantity),
      status: availableQuantity > 0 ? "active" : "sold_out",
    };
  });

  return {
    id: String(event.id),
    title,
    kind,
    category,
    genre: category,
    language: getServerValue<string>(event, "language") || undefined,
    ageRestriction: getServerValue<string>(event, "ageRestriction", "age_restriction") || undefined,
    duration: getServerValue<string>(event, "duration") || undefined,
    termsConditions: getServerValue<string>(event, "termsConditions", "terms_conditions") || undefined,
    date: dateLabel,
    dateValue: String(startDate || ""),
    venue: venue.name,
    city: venue.city,
    distanceKm: 0,
    price,
    priceLabel: price > 0 ? `Rs. ${price.toLocaleString("en-IN")} onwards` : "Free",
    rating: 0,
    popularity: toNumber("views" in event ? event.views : 0),
    image: event.banner || defaultEventImage,
    description: event.description || "Event details will be updated soon.",
    badge: "Live",
    tags: Array.from(new Set([category, event.type, venue.city, venue.state].filter(Boolean).map(String))),
    quickFilters: [],
    href: `/${kind}/${event.id}`,
    slot: timeLabel ? `${dateLabel} at ${timeLabel}` : dateLabel,
    ticketBlocks,
  } as DiscoveryItem & { ticketBlocks: typeof ticketBlocks };
}

export function filterDiscoveryItemsByKind(items: DiscoveryItem[], kind: DiscoveryItem["kind"]) {
  return items.filter((item) => item.kind === kind);
}
