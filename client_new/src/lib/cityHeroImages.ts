export const CITY_HERO_FALLBACK_IMAGE = "/images/pune.jpg";

export const cityImages: Record<string, string> = {
  Pune: CITY_HERO_FALLBACK_IMAGE,
};

export function getCityHeroImage(selectedCity: string) {
  return cityImages[selectedCity] ?? CITY_HERO_FALLBACK_IMAGE;
}
