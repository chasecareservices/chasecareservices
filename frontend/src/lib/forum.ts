/**
 * The Monthly ChaseCare Community Forum is held on the third Thursday of every month [§23].
 */

/** Third Thursday of the given month (month is 0-based, like Date). */
export function thirdThursday(year: number, month: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const THURSDAY = 4;
  const offset = (THURSDAY - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month, 1 + offset + 14));
}

/**
 * The next forum date on or after `from` (compared by calendar day in UTC,
 * which matches Ghana time, GMT+0).
 */
export function nextForumDate(from: Date = new Date()): Date {
  const today = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const thisMonth = thirdThursday(from.getUTCFullYear(), from.getUTCMonth());
  if (thisMonth.getTime() >= today) return thisMonth;
  const nextMonth = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
  return thirdThursday(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth());
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Accra",
  }).format(date);
}
