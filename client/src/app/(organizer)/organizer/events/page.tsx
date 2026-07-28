"use client";

import Link from "next/link";
import { CalendarDays, Eye, Lock, Pencil, RefreshCw, Ticket, Trash2, Users } from "lucide-react";
import {
  useDeleteEventMutation,
  useGetOrganizerBookingsQuery,
  useGetOrganizerEventsQuery,
} from "@/store/api";
import { toastUtils } from "@/utils/toast";

function isPastOrCompleted(event: any) {
  const status = String(event?.status ?? "").toLowerCase();
  if (status === "completed") return true;

  const endDate = event?.endDate ?? event?.end_date ?? event?.startDate ?? event?.start_date;
  if (!endDate) return false;

  const endTime = new Date(endDate).getTime();
  return Number.isFinite(endTime) && endTime < Date.now();
}

function eventIdOf(event: any) {
  return Number(event?.id ?? event?.event_id ?? event?.eventId);
}

function eventTitleOf(event: any) {
  return event?.title ?? event?.event_title ?? event?.name ?? "Untitled event";
}

function formatDate(value?: string) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrganizerEventsPage() {
  const { data: eventsResponse, isLoading: eventsLoading, refetch: refetchEvents } = useGetOrganizerEventsQuery({
    page: 1,
    limit: 100,
  });
  const { data: bookingsResponse, isLoading: bookingsLoading, refetch: refetchBookings } = useGetOrganizerBookingsQuery({
    page: 1,
    limit: 100,
  });
  const [deleteEvent, { isLoading: deleting }] = useDeleteEventMutation();

  const events = Array.isArray(eventsResponse?.data) ? eventsResponse.data : [];
  const bookings = Array.isArray(bookingsResponse?.data) ? bookingsResponse.data : [];

  const handleDelete = async (event: any) => {
    const id = eventIdOf(event);
    if (!id) return;

    if (isPastOrCompleted(event)) {
      toastUtils.error("Completed or past events need admin or super admin approval before delete.");
      return;
    }

    if (!window.confirm(`Delete ${eventTitleOf(event)}?`)) return;

    try {
      await deleteEvent({ id, role: "organizer" }).unwrap();
      toastUtils.success("Event deleted successfully");
    } catch (error: any) {
      toastUtils.error(error?.data?.message || "Failed to delete event");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--app-background)] px-4 py-6 text-[var(--app-foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1500px] gap-6">
        <header className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_18px_58px_rgba(0,0,0,0.10)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-[var(--color-brand-primary)]">
              Organizer Events
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight">Events and bookings</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--app-muted)]">
              Past or completed events stay visible for records, but organizer edit, update, and delete actions are locked until admin or super admin approval.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                refetchEvents();
                refetchBookings();
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black"
            >
              <RefreshCw className="size-4" />
              Refresh
            </button>
            <Link
              href="/organizer/create-event"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white"
            >
              <CalendarDays className="size-4" />
              Create Event
            </Link>
          </div>
        </header>

        <section className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.10)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">My events</h2>
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1 text-xs font-black">
              {events.length} total
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[var(--app-border)] text-xs font-black uppercase text-[var(--app-muted)]">
                <tr>
                  <th className="px-3 py-3">Event</th>
                  <th className="px-3 py-3">Schedule</th>
                  <th className="px-3 py-3">Venue</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {eventsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center font-black text-[var(--app-muted)]">
                      Loading organizer events...
                    </td>
                  </tr>
                ) : events.length ? (
                  events.map((event: any) => {
                    const id = eventIdOf(event);
                    const locked = isPastOrCompleted(event);
                    const venue = event?.venue?.name ?? event?.venue_name ?? event?.venue ?? "Venue pending";
                    const city = event?.venue?.city ?? event?.city ?? "";

                    return (
                      <tr key={id || eventTitleOf(event)} className="border-b border-[var(--app-border)] last:border-0">
                        <td className="px-3 py-4 align-top">
                          <p className="font-black">{eventTitleOf(event)}</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">#{id || "draft"}</p>
                        </td>
                        <td className="px-3 py-4 align-top font-semibold text-[var(--app-muted)]">
                          {formatDate(event?.startDate ?? event?.start_date)}
                        </td>
                        <td className="px-3 py-4 align-top font-semibold text-[var(--app-muted)]">
                          {venue}{city ? `, ${city}` : ""}
                        </td>
                        <td className="px-3 py-4 align-top">
                          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--app-subtle)] px-3 py-1 text-xs font-black">
                            {locked ? <Lock className="size-3.5 text-[var(--color-brand-primary)]" /> : null}
                            {locked ? "Locked after event date" : String(event?.status ?? "draft")}
                          </span>
                        </td>
                        <td className="px-3 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/events/${id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 font-black">
                              <Eye className="size-4" />
                              View
                            </Link>
                            <Link
                              href={locked ? "#" : `/organizer/create-event?eventId=${id}`}
                              onClick={(eventClick) => {
                                if (locked) {
                                  eventClick.preventDefault();
                                  toastUtils.error("This event is completed or past. Request admin approval to update it.");
                                }
                              }}
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 font-black"
                            >
                              <Pencil className="size-4" />
                              Update
                            </Link>
                            <button
                              type="button"
                              disabled={deleting}
                              onClick={() => handleDelete(event)}
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-brand-primary)]/40 px-3 font-black text-[var(--color-brand-primary)] disabled:opacity-50"
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center font-black text-[var(--app-muted)]">
                      No organizer events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.10)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Ticket className="size-5 text-[var(--color-brand-primary)]" />
              All bookings
            </h2>
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1 text-xs font-black">
              {bookings.length} total
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[var(--app-border)] text-xs font-black uppercase text-[var(--app-muted)]">
                <tr>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Event</th>
                  <th className="px-3 py-3">Tickets</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Booked At</th>
                </tr>
              </thead>
              <tbody>
                {bookingsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center font-black text-[var(--app-muted)]">
                      Loading organizer bookings...
                    </td>
                  </tr>
                ) : bookings.length ? (
                  bookings.map((booking: any) => (
                    <tr key={booking?.id ?? booking?.booking_id ?? booking?.bookingNumber} className="border-b border-[var(--app-border)] last:border-0">
                      <td className="px-3 py-4 align-top">
                        <p className="font-black">{booking?.customerName ?? booking?.customer_name ?? booking?.user_name ?? "Customer"}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{booking?.customerEmail ?? booking?.customer_email ?? booking?.user_email ?? ""}</p>
                      </td>
                      <td className="px-3 py-4 align-top font-semibold">{booking?.eventTitle ?? booking?.event_title ?? booking?.title ?? "Event"}</td>
                      <td className="px-3 py-4 align-top font-semibold">
                        <Users className="mr-1 inline size-4 text-[var(--color-brand-primary)]" />
                        {booking?.quantity ?? booking?.ticket_quantity ?? booking?.total_tickets ?? 1}
                      </td>
                      <td className="px-3 py-4 align-top font-black">Rs. {Number(booking?.amount ?? booking?.total_amount ?? booking?.total ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-4 align-top">
                        <span className="rounded-full bg-[var(--app-subtle)] px-3 py-1 text-xs font-black">
                          {booking?.status ?? booking?.payment_status ?? "pending"}
                        </span>
                      </td>
                      <td className="px-3 py-4 align-top font-semibold text-[var(--app-muted)]">{formatDate(booking?.createdAt ?? booking?.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center font-black text-[var(--app-muted)]">
                      No bookings found for your organizer account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
