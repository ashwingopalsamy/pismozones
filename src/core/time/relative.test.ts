import { describe, expect, it } from 'vitest';
import { dayDelta, formatDelta, relativeDay } from './relative';

const d = (year: number, month: number, day: number) => ({ year, month, day });

describe('relativeDay', () => {
  it('names adjacent days, including across a year boundary', () => {
    expect(relativeDay(d(2026, 10, 7), d(2026, 10, 7))).toBe('today');
    expect(relativeDay(d(2026, 10, 8), d(2026, 10, 7))).toBe('tomorrow');
    expect(relativeDay(d(2026, 10, 6), d(2026, 10, 7))).toBe('yesterday');
    expect(relativeDay(d(2027, 1, 1), d(2026, 12, 31))).toBe('tomorrow');
    expect(relativeDay(d(2026, 10, 10), d(2026, 10, 7))).toBeNull();
    expect(dayDelta(d(2027, 1, 1), d(2026, 12, 31))).toBe(1);
  });
});

describe('formatDelta', () => {
  it('formats signed offsets from now', () => {
    expect(formatDelta(9_000_000)).toBe('+2h 30m');
    expect(formatDelta(-2_700_000)).toBe('−45m');
    expect(formatDelta(97_200_000)).toBe('+1d 3h');
    expect(formatDelta(86_400_000)).toBe('+1d');
    expect(formatDelta(3_600_000)).toBe('+1h');
    expect(formatDelta(20_000)).toBe('Now');
  });
});
