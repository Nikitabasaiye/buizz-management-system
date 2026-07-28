import { getTicketTheme, ticketThemes, type TicketThemeConfig } from "./ticketThemes";
import type { TicketThemeKey } from "./ticketTypes";

export type TicketThemeResolverInput = {
  eventCategory?: string;
  eventType?: string;
  ticketType?: string;
  seatBlockType?: string;
  customThemeKey?: TicketThemeKey;
  organizerSelectedThemeKey?: TicketThemeKey;
  adminApprovedThemeKey?: TicketThemeKey;
};

const ticketTypeMappings: Array<[string[], string]> = [
  [["vvip", "platinum", "diamond"], "vvipLuxury"],
  [["vip"], "vipPremium"],
  [["student"], "studentClean"],
  [["couple", "family"], "familyPass"],
  [["creator", "media"], "creatorPass"],
  [["crew", "staff", "artist"], "crewPass"],
  [["parking", "vehicle"], "parkingPass"],
];

const seatBlockMappings: Array<[string[], string]> = [
  [["fan pit"], "musicNeon"],
  [["vvip lounge"], "vvipLuxury"],
  [["vip lounge"], "vipPremium"],
  [["table"], "luxuryTable"],
  [["balcony"], "theatreElegant"],
  [["stand"], "sportsStadium"],
  [["hall"], "businessMinimal"],
];

const categoryMappings: Array<[string[], string]> = [
  [["music", "concert", "singer", "dj", "live performance", "band"], "musicNeon"],
  [["comedy", "standup", "stand up", "humor"], "comedyFun"],
  [["movie", "cinema", "film", "screening"], "movieCinema"],
  [["sports", "sport", "match", "tournament", "cricket", "football", "stadium"], "sportsStadium"],
  [["theatre", "theater", "drama", "play", "stage"], "theatreElegant"],
  [["workshop", "education", "training", "technology", "seminar", "class"], "workshopClean"],
  [["festival", "party", "nightlife", "carnival", "celebration"], "festivalVibrant"],
  [["kids", "children", "family", "magic", "cartoon"], "kidsPlayful"],
  [["business", "startup", "corporate", "conference", "summit", "networking"], "businessMinimal"],
  [["table", "lounge", "vip table", "bottle service"], "luxuryTable"],
];

export function normalizeTicketThemeValue(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ");
}

export function resolveTicketTheme(input: TicketThemeResolverInput): TicketThemeConfig {
  const explicitKeys = [
    input.adminApprovedThemeKey,
    input.organizerSelectedThemeKey,
    input.customThemeKey,
  ];

  for (const key of explicitKeys) {
    if (key && ticketThemes[key]?.enabled !== false) return getTicketTheme(key);
  }

  const seatBlockTheme = matchTheme(input.seatBlockType, seatBlockMappings);
  if (seatBlockTheme) return getTicketTheme(seatBlockTheme);

  const ticketTypeTheme = matchTheme(input.ticketType, ticketTypeMappings);
  if (ticketTypeTheme) return getTicketTheme(ticketTypeTheme);

  const eventTheme = matchTheme(
    `${input.eventCategory ?? ""} ${input.eventType ?? ""}`,
    categoryMappings
  );
  return getTicketTheme(eventTheme ?? "defaultPremium");
}

function matchTheme(value: string | undefined, mappings: Array<[string[], string]>) {
  const normalized = normalizeTicketThemeValue(value);
  if (!normalized) return undefined;
  return mappings.find(([keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[1];
}
