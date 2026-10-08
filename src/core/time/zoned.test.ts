import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addDays,
  isValidZone,
  offsetMinutes,
  parseFixedOffset,
  startOfDay,
  toInstant,
  zonedFields,
} from './zoned';

const U = Date.UTC;
const civil = (y: number, mo: number, d: number, h = 0, mi = 0) => ({
  year: y,
  month: mo,
  day: d,
  hour: h,
  minute: mi,
  second: 0,
});

describe('offsetMinutes', () => {
  it('is DST-aware and handles fixed offsets', () => {
    expect(offsetMinutes(U(2026, 9, 7, 12), 'Europe/London')).toBe(60);
    expect(offsetMinutes(U(2026, 11, 7, 12), 'Europe/London')).toBe(0);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'America/Sao_Paulo')).toBe(-180);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'Asia/Kolkata')).toBe(330);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'UTC')).toBe(0);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'UTC+05:30')).toBe(330);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'UTC−3')).toBe(-180);
  });
});

describe('zonedFields', () => {
  it('projects an instant into a zone, crossing the date line', () => {
    expect(zonedFields(U(2026, 9, 7, 23, 30), 'Asia/Singapore')).toEqual({
      year: 2026,
      month: 10,
      day: 8,
      hour: 7,
      minute: 30,
      second: 0,
      weekday: 4,
      offsetMinutes: 480,
    });
  });
});

describe('toInstant', () => {
  it('exact', () => {
    expect(toInstant(civil(2026, 10, 7, 15), 'Europe/London')).toEqual({
      instant: U(2026, 9, 7, 14),
      kind: 'exact',
      earlier: U(2026, 9, 7, 14),
      later: U(2026, 9, 7, 14),
    });
  });
  it('spring-forward gap (Chicago 02:30 does not exist)', () => {
    const r = toInstant(civil(2026, 3, 8, 2, 30), 'America/Chicago');
    expect(r).toEqual({
      instant: U(2026, 2, 8, 8, 30),
      kind: 'gap',
      earlier: U(2026, 2, 8, 7, 30),
      later: U(2026, 2, 8, 8, 30),
    });
    expect(toInstant(civil(2026, 3, 8, 2, 30), 'America/Chicago', 'earlier').instant).toBe(
      U(2026, 2, 8, 7, 30),
    );
    expect(() => toInstant(civil(2026, 3, 8, 2, 30), 'America/Chicago', 'reject')).toThrow(
      RangeError,
    );
  });
  it('fall-back overlap (Chicago 01:30 happens twice)', () => {
    const r = toInstant(civil(2026, 11, 1, 1, 30), 'America/Chicago');
    expect(r).toEqual({
      instant: U(2026, 10, 1, 6, 30),
      kind: 'overlap',
      earlier: U(2026, 10, 1, 6, 30),
      later: U(2026, 10, 1, 7, 30),
    });
    expect(toInstant(civil(2026, 11, 1, 1, 30), 'America/Chicago', 'later').instant).toBe(
      U(2026, 10, 1, 7, 30),
    );
  });
  it('London and Sydney transitions', () => {
    expect(toInstant(civil(2026, 3, 29, 1, 30), 'Europe/London')).toMatchObject({
      kind: 'gap',
      instant: U(2026, 2, 29, 1, 30),
      earlier: U(2026, 2, 29, 0, 30),
    });
    expect(toInstant(civil(2026, 10, 25, 1, 30), 'Europe/London')).toMatchObject({
      kind: 'overlap',
      earlier: U(2026, 9, 25, 0, 30),
      later: U(2026, 9, 25, 1, 30),
    });
    expect(toInstant(civil(2026, 10, 4, 2, 30), 'Australia/Sydney')).toMatchObject({
      kind: 'gap',
      instant: U(2026, 9, 3, 16, 30),
    });
  });
  it('round-trips every real instant in every office zone', () => {
    const zones = [
      'America/Sao_Paulo',
      'America/Chicago',
      'Europe/London',
      'Asia/Kolkata',
      'Asia/Singapore',
      'Europe/Warsaw',
      'America/Mexico_City',
      'America/Argentina/Buenos_Aires',
      'America/Bogota',
      'Australia/Sydney',
      'Asia/Ho_Chi_Minh',
      'Asia/Jakarta',
    ];
    fc.assert(
      fc.property(
        fc.integer({ min: U(2020, 0, 1) / 1000, max: U(2035, 0, 1) / 1000 }),
        fc.constantFrom(...zones),
        (sec, zone) => {
          const t = sec * 1000;
          const r = toInstant(zonedFields(t, zone), zone);
          if (r.kind === 'overlap') expect([r.earlier, r.later]).toContain(t);
          else expect(r).toMatchObject({ kind: 'exact', instant: t });
        },
      ),
      { numRuns: 3000 },
    );
  });
});

describe('startOfDay / addDays', () => {
  it('measures 23h and 25h days', () => {
    expect(startOfDay({ year: 2026, month: 3, day: 8 }, 'America/Chicago')).toEqual({
      start: U(2026, 2, 8, 6),
      end: U(2026, 2, 9, 5),
      lengthMs: 23 * 3_600_000,
    });
    expect(startOfDay({ year: 2026, month: 11, day: 1 }, 'America/Chicago')).toEqual({
      start: U(2026, 10, 1, 5),
      end: U(2026, 10, 2, 6),
      lengthMs: 25 * 3_600_000,
    });
    expect(startOfDay({ year: 2026, month: 10, day: 8 }, 'Asia/Kolkata').start).toBe(
      U(2026, 9, 7, 18, 30),
    );
  });
  it('adds civil days across month and year ends', () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    });
  });
});

describe('zone parsing', () => {
  it('parses fixed offsets and validates zones', () => {
    expect(parseFixedOffset('UTC')).toBe(0);
    expect(parseFixedOffset('UTC+5')).toBe(300);
    expect(parseFixedOffset('UTC-3')).toBe(-180);
    expect(parseFixedOffset('UTC+05:30')).toBe(330);
    expect(parseFixedOffset('Europe/London')).toBeNull();
    expect(parseFixedOffset('UTC+99')).toBeNull();
    expect(parseFixedOffset('UTC+5:75')).toBeNull();
    expect(isValidZone('Europe/London')).toBe(true);
    expect(isValidZone('UTC+05:30')).toBe(true);
    expect(isValidZone('Mars/Olympus')).toBe(false);
  });
});
