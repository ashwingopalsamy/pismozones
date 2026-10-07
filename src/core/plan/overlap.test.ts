import { describe, expect, it } from 'vitest';
import { getOffice, type Office } from '../cities/registry';
import { planDay } from './overlap';

const U = Date.UTC;
const offs = (...ids: string[]): Office[] => ids.map((i) => getOffice(i) as Office);
const five = offs('saopaulo', 'austin', 'bristol', 'bangalore', 'singapore');

describe('planDay', () => {
  it('finds the best overlap across five offices', () => {
    const p = planDay({ year: 2026, month: 10, day: 8 }, 'America/Sao_Paulo', five);
    expect(p.slots).toHaveLength(48);
    expect(p.slots[22]?.start).toBe(U(2026, 9, 8, 14, 0)); // 11:00 São Paulo
    expect(p.best).toEqual({
      startIndex: 22,
      endIndex: 28,
      working: 3,
      outside: [
        { officeId: 'bangalore', kind: 'late' },
        { officeId: 'singapore', kind: 'off' },
      ],
    });
    expect(p.allWorking).toBe(false);
  });
  it('handles 23h and 25h days', () => {
    expect(planDay({ year: 2026, month: 3, day: 8 }, 'America/Chicago', five).slots).toHaveLength(
      46,
    );
    expect(planDay({ year: 2026, month: 11, day: 1 }, 'America/Chicago', five).slots).toHaveLength(
      50,
    );
  });
  it('refers to a half-hour zone', () => {
    expect(planDay({ year: 2026, month: 10, day: 8 }, 'Asia/Kolkata', five).slots[0]?.start).toBe(
      U(2026, 9, 7, 18, 30),
    );
  });
  it('reports no overlap on a shared weekend', () => {
    expect(
      planDay({ year: 2026, month: 10, day: 10 }, 'America/Sao_Paulo', offs('saopaulo', 'bristol'))
        .best,
    ).toBeNull();
  });
  it('excludes an office on holiday', () => {
    const p = planDay(
      { year: 2026, month: 10, day: 12 },
      'America/Sao_Paulo',
      offs('saopaulo', 'austin', 'bristol'),
    );
    expect(p.best?.outside).toContainEqual({ officeId: 'saopaulo', kind: 'holiday' });
  });
  it('splits the best window when who is working changes (I-8)', () => {
    const p = planDay(
      { year: 2026, month: 7, day: 15 },
      'Europe/London',
      offs('sydney', 'bristol', 'singapore'),
    );
    expect(p.best).toEqual({
      startIndex: 4,
      endIndex: 18,
      working: 2,
      outside: [{ officeId: 'bristol', kind: 'off' }],
    });
  });
});
