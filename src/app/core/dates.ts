// Dates always follow the studio's clock (Lisbon), even when the person
// using the site is in Brazil. A "day" is a plain string: YYYY-MM-DD.
export const STUDIO_TIME_ZONE = 'Europe/Lisbon';

// The en-CA format happens to be YYYY-MM-DD.
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: STUDIO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The studio day of an instant (an ISO string from the API, or a Date). */
export function studioDay(instant: string | Date): string {
  return dayFormat.format(new Date(instant));
}

/** Today, in the studio. */
export function studioToday(): string {
  return studioDay(new Date());
}

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: STUDIO_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Minutes since midnight, in the studio, of an instant (14:30 → 870). */
export function studioMinutes(instant: string | Date): number {
  const [hours, minutes] = timeFormat.format(new Date(instant)).split(':').map(Number);
  return hours * 60 + minutes;
}

/** 870 → "14:30" */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * A day and a time in the studio, the way the API expects them:
 * without a time zone, which the API reads as Lisbon time.
 */
export function studioDateTime(day: string, time: string): string {
  return `${day}T${time}:00`;
}

// Day arithmetic runs in UTC, so summer time changes never shift a day.
function toUtcDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

export function addDays(day: string, amount: number): string {
  const date = toUtcDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** The Monday of the week of a day. */
export function startOfWeek(day: string): string {
  const weekday = (toUtcDate(day).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}
