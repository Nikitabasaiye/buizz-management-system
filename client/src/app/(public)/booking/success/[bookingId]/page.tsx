import { BookingAuthGuard } from "@/features/auth/AuthGuards";
import { BookingSuccessPage } from "@/features/booking/BookingFlow";

type RouteParams = Promise<{ bookingId: string }>;

export default async function BookingSuccessRoute({ params }: { params: RouteParams }) {
  const { bookingId } = await params;
  return (
    <BookingAuthGuard>
      <BookingSuccessPage bookingId={bookingId} />
    </BookingAuthGuard>
  );
}
