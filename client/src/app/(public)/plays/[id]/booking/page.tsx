import { PublishedBookingFlowClient } from "@/features/booking/PublishedBookingFlowClient";

type RouteParams = Promise<{ id: string }>;

export default async function PlayBookingPage({
    params,
}: {
    params: RouteParams;
}) {
    const { id } = await params;

    return (
        <PublishedBookingFlowClient id={id} kind="plays" />
    );
}
