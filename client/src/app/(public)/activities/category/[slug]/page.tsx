import { CategoryPageTemplate } from "@/features/discovery/components/DiscoveryPageTemplate";
import { activitiesDiscoveryConfig, resolveCategoryFromSlug } from "@/features/discovery/data";

type RouteParams = Promise<{ slug: string }>;
type PublicSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ActivityCategoryPage({ params, searchParams }: { params: RouteParams; searchParams: PublicSearchParams }) {
  const [{ slug }, queryParams] = await Promise.all([params, searchParams]);
  const query = Array.isArray(queryParams.q) ? queryParams.q[0] : queryParams.q;
  const category = resolveCategoryFromSlug(activitiesDiscoveryConfig, slug) ?? titleFromSlug(slug);

  return <CategoryPageTemplate config={activitiesDiscoveryConfig} category={category} initialSearchQuery={query ?? ""} />;
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
