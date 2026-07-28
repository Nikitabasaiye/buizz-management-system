import { PublishedListingDetailPageClient } from "@/features/discovery/components/PublishedListingDetailPageClient";

type RouteParams = Promise<{ id: string }>;

export default async function EventDetailsPage({ params }: { params: RouteParams }) {
  const { id } = await params;

  return <PublishedListingDetailPageClient id={id} kind="events" />;
}
