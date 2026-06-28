import { BookingFlow } from "@/features/booking/BookingFlow";
import { findDiscoveryItemById } from "@/features/discovery/data";

type RouteParams = Promise<{ id: string }>;

export default async function BookingPage({ params }: { params: RouteParams }) {
  const { id } = await params;
  return <BookingFlow item={findDiscoveryItemById(id)} />;
}
