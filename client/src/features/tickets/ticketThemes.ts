import type { TicketLayoutType, TicketQrPosition, TicketThemeKey } from "./ticketTypes";

export type TicketThemeConfig = {
  key: TicketThemeKey;
  label: string;
  badgeLabel: string;
  layoutType: TicketLayoutType;
  description: string;
  categoryIcon: string;
  tagline: string;
  accentClass: string;
  backgroundClass: string;
  borderClass: string;
  textClass: string;
  qrPosition: TicketQrPosition;
  showBanner: boolean;
  showOrganizerLogo: boolean;
  showSponsorLogo: boolean;
  watermarkText: string;
  allowedForOrganizerCustomization: boolean;
  lockedElements: string[];
  enabled?: boolean;
  status?: "Active" | "Disabled" | "Draft";
  categoryKeywords?: string[];
  isDefault?: boolean;
};

function theme(
  key: string,
  label: string,
  badgeLabel: string,
  layoutType: TicketLayoutType,
  categoryIcon: string,
  tagline: string,
  options: Partial<TicketThemeConfig> = {}
): TicketThemeConfig {
  return {
    key,
    label,
    badgeLabel,
    layoutType,
    description: `${label} is a responsive Buizz ticket theme for approved organizer events.`,
    categoryIcon,
    tagline,
    accentClass: "bg-[var(--color-brand-primary)] text-white",
    backgroundClass: "bg-[var(--app-elevated)]",
    borderClass: "border-[var(--app-border)]",
    textClass: "text-[var(--app-foreground)]",
    qrPosition: "right",
    showBanner: true,
    showOrganizerLogo: true,
    showSponsorLogo: false,
    watermarkText: "BUIZZ VERIFIED",
    allowedForOrganizerCustomization: true,
    lockedElements: ["buizzLogo", "qrCode", "terms"],
    enabled: true,
    status: "Active",
    ...options,
  };
}

export const builtInTicketThemes: TicketThemeConfig[] = [
  theme("defaultPremium", "Default Premium", "Buizz Premium", "premium", "Ticket", "Your access, beautifully delivered.", { isDefault: true }),
  theme("musicNeon", "Music Neon", "Live Access", "premium", "Music", "Feel every beat.", { categoryKeywords: ["music", "concert", "singer", "dj", "band"] }),
  theme("comedyFun", "Comedy Fun", "Laugh Pass", "standard", "Mic", "Good seats. Better stories.", { categoryKeywords: ["comedy", "standup", "humor"] }),
  theme("movieCinema", "Movie Cinema", "Screening Pass", "cinema", "Clapperboard", "Your seat for the big screen.", { categoryKeywords: ["movie", "cinema", "film", "screening"] }),
  theme("sportsStadium", "Sports Stadium", "Match Access", "boardingPass", "Trophy", "Be there when it happens.", { categoryKeywords: ["sports", "match", "tournament", "cricket", "football", "stadium"] }),
  theme("theatreElegant", "Theatre Elegant", "Stage Pass", "premium", "Drama", "A live story awaits.", { categoryKeywords: ["theatre", "theater", "drama", "play", "stage"] }),
  theme("workshopClean", "Workshop Clean", "Learning Pass", "minimal", "BookOpen", "Learn, build, and connect.", { categoryKeywords: ["workshop", "education", "training", "technology", "seminar", "class"] }),
  theme("festivalVibrant", "Festival Vibrant", "Festival Access", "wristband", "Sparkles", "One pass. A full celebration.", { categoryKeywords: ["festival", "party", "nightlife", "carnival", "celebration"] }),
  theme("kidsPlayful", "Kids Playful", "Family Pass", "wallet", "Wand", "A bright day for the whole family.", { categoryKeywords: ["kids", "children", "family", "magic", "cartoon"] }),
  theme("businessMinimal", "Business Minimal", "Delegate Pass", "minimal", "Briefcase", "Meet the room that moves ideas.", { categoryKeywords: ["business", "startup", "corporate", "conference", "summit", "networking"] }),
  theme("luxuryTable", "Luxury Table", "Table Access", "table", "Armchair", "Reserved for your table.", { categoryKeywords: ["table", "lounge", "vip table", "bottle service"] }),
  theme("vipPremium", "VIP Premium", "VIP Access", "premium", "Crown", "Premium access, priority entry."),
  theme("vvipLuxury", "VVIP Luxury", "VVIP Access", "wallet", "Gem", "The highest level of access."),
  theme("studentClean", "Student Clean", "Student Pass", "minimal", "GraduationCap", "Made for the next generation."),
  theme("familyPass", "Family Pass", "Family Access", "wallet", "Users", "Your group, one smooth entry."),
  theme("creatorPass", "Creator Pass", "Creator Access", "qrCard", "Camera", "Access for makers and media."),
  theme("crewPass", "Crew Pass", "Crew Access", "qrCard", "Badge", "Authorized event operations access."),
  theme("parkingPass", "Parking Pass", "Vehicle Access", "qrCard", "Car", "Verified vehicle entry.", { showBanner: false, qrPosition: "center" }),
];

export const ticketThemes = Object.fromEntries(
  builtInTicketThemes.map((item) => [item.key, item])
) as Record<string, TicketThemeConfig>;

export function getTicketTheme(key?: TicketThemeKey) {
  return (key && ticketThemes[key]) || ticketThemes.defaultPremium;
}

export function getOrganizerTicketThemes() {
  return builtInTicketThemes.filter((item) => item.enabled !== false && item.allowedForOrganizerCustomization);
}
