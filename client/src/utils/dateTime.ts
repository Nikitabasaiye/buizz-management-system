export function toDateTime(date?: string, time?: string) {
  const datePart = date?.trim();
  const timePart = time?.trim();
  if (!datePart) return null;
  const value = timePart ? `${datePart}T${timePart.length === 5 ? `${timePart}:00` : timePart}` : datePart;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function hoursUntil(date: Date, now = new Date()) {
  return (date.getTime() - now.getTime()) / 3_600_000;
}

export function formatDateTime(value?: string | Date) {
  if (!value) return "Not set";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
