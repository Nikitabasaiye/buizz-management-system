import { PublishedBookingFlowClient } from "@/features/booking/PublishedBookingFlowClient";

type RouteParams = Promise<{ id: string }>;

export default async function ActivityBookingPage({
    params,
}: {
    params: RouteParams;
}) {
    const { id } = await params;

    return (
        <PublishedBookingFlowClient id={id} kind="activities" />
    );
}
