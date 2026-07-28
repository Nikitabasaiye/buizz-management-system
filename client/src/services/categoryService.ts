import { activityCategories, eventCategories, playCategories, slugifyCategory } from "@/features/discovery/data";

export const categoryService = {
  getCategories: () => [
    ...eventCategories.map((name) => ({ id: slugifyCategory(name), name, kind: "event" as const })),
    ...playCategories.map((name) => ({ id: slugifyCategory(name), name, kind: "play" as const })),
    ...activityCategories.map((name) => ({ id: slugifyCategory(name), name, kind: "activity" as const })),
  ],
  getCategoryBySlug: (slug: string) => categoryService.getCategories().find((category) => category.id === slug) ?? null,
};
