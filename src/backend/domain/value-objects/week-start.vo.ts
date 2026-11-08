import { InvalidMenuPayloadError } from '../errors/menu-domain.error.ts';

/** ISO date (`YYYY-MM-DD`) of the Monday that starts a weekly menu. */
export type WeekStart = string & { readonly __brand: 'WeekStart' };

export const WEEK_START_ERROR_MESSAGE =
  'Week start must be a Monday in YYYY-MM-DD format (for example 2026-11-09).';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses and validates a week start. Uses UTC so the server timezone can never
 * shift which weekday a calendar date falls on.
 */
export function parseWeekStart(value: unknown): WeekStart {
  if (typeof value !== 'string') {
    throw new InvalidMenuPayloadError(WEEK_START_ERROR_MESSAGE);
  }

  const match = ISO_DATE.exec(value);
  if (!match) {
    throw new InvalidMenuPayloadError(WEEK_START_ERROR_MESSAGE);
  }

  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));

  // Round-trip check rejects impossible dates such as 2026-02-30.
  if (date.toISOString().slice(0, 10) !== value) {
    throw new InvalidMenuPayloadError(WEEK_START_ERROR_MESSAGE);
  }

  if (date.getUTCDay() !== 1) {
    throw new InvalidMenuPayloadError(WEEK_START_ERROR_MESSAGE);
  }

  return value as WeekStart;
}
