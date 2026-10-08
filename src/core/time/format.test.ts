import { describe, expect, it } from 'vitest';
import { formatClock, formatOffset, formatShortDate, resolveHourCycle } from './format';

describe('formatClock', () => {
  it('formats 24h and 12h clocks', () => {
    expect(formatClock({ hour: 9, minute: 5 }, 'h23')).toEqual({ hm: '09:05', period: '' });
    expect(formatClock({ hour: 9, minute: 5 }, 'h12')).toEqual({ hm: '9:05', period: 'AM' });
    expect(formatClock({ hour: 0, minute: 0 }, 'h12')).toEqual({ hm: '12:00', period: 'AM' });
    expect(formatClock({ hour: 12, minute: 30 }, 'h12')).toEqual({ hm: '12:30', period: 'PM' });
    expect(formatClock({ hour: 23, minute: 59 }, 'h12')).toEqual({ hm: '11:59', period: 'PM' });
  });
});

describe('formatOffset', () => {
  it('uses a true minus sign and minutes only when needed', () => {
    expect(formatOffset(-180)).toBe('UTC−3');
    expect(formatOffset(330)).toBe('UTC+5:30');
    expect(formatOffset(0)).toBe('UTC+0');
    expect(formatOffset(-570)).toBe('UTC−9:30');
  });
});

describe('formatShortDate', () => {
  it('formats in English and Portuguese', () => {
    expect(formatShortDate({ year: 2026, month: 10, day: 8, weekday: 4 }, 'en')).toBe('Thu 8 Oct');
    expect(formatShortDate({ year: 2026, month: 10, day: 8, weekday: 4 }, 'pt-BR')).toBe(
      'qui 8 out',
    );
  });
});

describe('resolveHourCycle', () => {
  it('follows the locale unless overridden', () => {
    expect(resolveHourCycle('auto', 'en-US')).toBe('h12');
    expect(resolveHourCycle('auto', 'pt-BR')).toBe('h23');
    expect(resolveHourCycle('auto', 'en-GB')).toBe('h23');
    expect(resolveHourCycle('h12', 'pt-BR')).toBe('h12');
  });
});
