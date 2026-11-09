/** Pure date helpers for the Weekly Menu view (local time, Monday-starting weeks). */

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];
export type MealSlot = (typeof MEAL_SLOTS)[number];

/** Monday (00:00 local) of the week containing `date`. */
export function mondayOf(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7; // Sunday (0) -> 6
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** `YYYY-MM-DD` using local calendar fields (never UTC, so the day can't shift). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a `YYYY-MM-DD` string as a local date. */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Human-readable range of the week starting at `monday`, e.g. "9 – 15 Nov 2026". */
export function formatRange(monday: Date, locale = 'en-GB'): string {
  const sunday = addDays(monday, 6);
  const day = (d: Date) => d.getDate();
  const month = (d: Date) => d.toLocaleDateString(locale, { month: 'short' });
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  const sameMonth = sameYear && monday.getMonth() === sunday.getMonth();
  if (sameMonth) {
    return `${day(monday)} – ${day(sunday)} ${month(sunday)} ${sunday.getFullYear()}`;
  }
  if (sameYear) {
    return `${day(monday)} ${month(monday)} – ${day(sunday)} ${month(sunday)} ${sunday.getFullYear()}`;
  }
  return `${day(monday)} ${month(monday)} ${monday.getFullYear()} – ${day(sunday)} ${month(sunday)} ${sunday.getFullYear()}`;
}
