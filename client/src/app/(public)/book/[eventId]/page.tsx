import { BookingAuthGuard } from "@/features/auth/AuthGuards";
import { CustomerBookingPage } from "@/features/seat-map/CustomerBookingPage";

type RouteParams = Promise<{ eventId: string }>;

export default async function BookEventPage({ params }: { params: RouteParams }) {
  const { eventId } = await params;
  return (
    <BookingAuthGuard>
      <CustomerBookingPage eventId={eventId} />
    </BookingAuthGuard>
  );
}
