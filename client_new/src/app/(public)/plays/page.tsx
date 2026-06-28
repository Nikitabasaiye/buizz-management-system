import { DiscoveryPageTemplate } from "@/features/discovery/components/DiscoveryPageTemplate";
import { playsDiscoveryConfig } from "@/features/discovery/data";

type PublicSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PlaysPage({ searchParams }: { searchParams: PublicSearchParams }) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;

  return <DiscoveryPageTemplate config={playsDiscoveryConfig} initialSearchQuery={query ?? ""} />;
}
