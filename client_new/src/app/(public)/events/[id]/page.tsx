import { ListingDetailPage } from "@/features/booking/ListingDetailPage";
import { findDiscoveryItemById } from "@/features/discovery/data";

type RouteParams = Promise<{ id: string }>;

export default async function EventDetailsPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  return <ListingDetailPage item={findDiscoveryItemById(id, "events")} />;
}
