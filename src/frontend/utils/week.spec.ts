import { describe, it, expect } from 'vitest';
import { mondayOf, addDays, toIsoDate, fromIsoDate, formatRange } from './week';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('week helpers', () => {
  it('mondayOf returns the same day for a Monday', () => {
    expect(toIsoDate(mondayOf(d(2026, 11, 9)))).toBe('2026-11-09');
  });

  it('mondayOf goes back six days from a Sunday (ISO weeks)', () => {
    expect(toIsoDate(mondayOf(d(2026, 11, 15)))).toBe('2026-11-09');
  });

  it('mondayOf crosses month and year boundaries', () => {
    expect(toIsoDate(mondayOf(d(2026, 3, 1)))).toBe('2026-02-23'); // Sunday 1 Mar
    expect(toIsoDate(mondayOf(d(2027, 1, 1)))).toBe('2026-12-28'); // Friday 1 Jan
  });

  it('addDays moves across month and year boundaries', () => {
    expect(toIsoDate(addDays(d(2026, 12, 28), 7))).toBe('2027-01-04');
    expect(toIsoDate(addDays(d(2026, 11, 2), -7))).toBe('2026-10-26');
  });

  it('toIsoDate pads month and day, and fromIsoDate round-trips', () => {
    expect(toIsoDate(d(2026, 1, 5))).toBe('2026-01-05');
    expect(toIsoDate(fromIsoDate('2026-03-02'))).toBe('2026-03-02');
  });

  it('formatRange handles same month, month boundary and year boundary', () => {
    expect(formatRange(d(2026, 11, 9))).toBe('9 – 15 Nov 2026');
    expect(formatRange(d(2026, 11, 30))).toBe('30 Nov – 6 Dec 2026');
    expect(formatRange(d(2026, 12, 28))).toBe('28 Dec 2026 – 3 Jan 2027');
  });
});
