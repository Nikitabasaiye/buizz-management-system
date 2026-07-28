export type TicketRatioLockInput = {
    date?: string;
    time?: string;
    startDate?: string;
    startTime?: string;
    eventDate?: string;
    eventTime?: string;
    venues?: Array<{
        schedules?: Array<{
            date?: string;
            timeSlots?: Array<{
                startTime?: string;
                time?: string;
                label?: string;
            }>;
        }>;
    }>;
};

export type TicketRatioLockStatus = {
    locked: boolean;
    lockAt: Date | null;
    eventStartsAt: Date | null;
    message: string;
};

const TICKET_RATIO_LOCK_HOURS = 12;

export function getTicketRatioLockStatus(
    event: TicketRatioLockInput,
    now = new Date(),
): TicketRatioLockStatus {
    const eventStartsAt = getEventStartDateTime(event);

    if (!eventStartsAt) {
        return {
            locked: false,
            lockAt: null,
            eventStartsAt: null,
            message:
                "Select event date and time. Ticket ratio will lock 12 hours before event start.",
        };
    }

    const lockAt = new Date(
        eventStartsAt.getTime() - TICKET_RATIO_LOCK_HOURS * 60 * 60 * 1000,
    );

    const locked = now.getTime() >= lockAt.getTime();

    return {
        locked,
        lockAt,
        eventStartsAt,
        message: locked
            ? `Ticket ratio is locked because event starts within ${TICKET_RATIO_LOCK_HOURS} hours.`
            : `Ticket ratio can be edited until ${formatLockDateTime(lockAt)}.`,
    };
}

export function getEventStartDateTime(event: TicketRatioLockInput): Date | null {
    const directDate = event.startDate ?? event.eventDate ?? event.date;
    const directTime = event.startTime ?? event.eventTime ?? event.time;

    const direct = parseDateTime(directDate, directTime);
    if (direct) return direct;

    const candidates: Date[] = [];

    for (const venue of event.venues ?? []) {
        for (const schedule of venue.schedules ?? []) {
            const slots = schedule.timeSlots ?? [];

            if (!slots.length) {
                const parsed = parseDateTime(schedule.date, undefined);
                if (parsed) candidates.push(parsed);
                continue;
            }

            for (const slot of slots) {
                const parsed = parseDateTime(
                    schedule.date,
                    slot.startTime ?? slot.time ?? slot.label,
                );

                if (parsed) candidates.push(parsed);
            }
        }
    }

    return candidates.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
}

function parseDateTime(dateValue?: string, timeValue?: string): Date | null {
    if (!dateValue?.trim()) return null;

    const date = dateValue.trim();
    const time = timeValue?.trim();

    const candidates = time
        ? [`${date}T${normalizeTime(time)}`, `${date} ${time}`, `${date} ${normalizeTime(time)}`]
        : [date];

    for (const value of candidates) {
        const parsed = new Date(value);

        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return null;
}

function normalizeTime(value: string) {
    const trimmed = value.trim();

    if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;

    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) return trimmed;

    let hour = Number(match[1]);
    const minute = match[2];
    const period = match[3].toUpperCase();

    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return `${String(hour).padStart(2, "0")}:${minute}`;
}

function formatLockDateTime(value: Date) {
    return value.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}
