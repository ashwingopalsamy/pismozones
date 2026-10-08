import { getOffice, type Office } from '@core/cities/registry';
import { planDay } from '@core/plan/overlap';
import { NOW } from '@state/testing';
import { expect, it } from 'vitest';
import { planViewModel } from './model';

it('labels the best overlap for five offices', () => {
  const five = ['saopaulo', 'austin', 'bristol', 'bangalore', 'singapore'].map(
    (i) => getOffice(i) as Office,
  );
  const p = planDay({ year: 2026, month: 10, day: 8 }, 'America/Sao_Paulo', five);
  const m = planViewModel(
    p,
    five,
    getOffice('saopaulo') as Office,
    Date.UTC(2026, 9, 8, 14),
    'h23',
    'en',
    'Asia/Kolkata',
    NOW,
  );
  expect(m.best).toEqual({
    label: 'Best overlap 11:00–14:00 · 3 of 5 working',
    outside: 'Bengaluru, Singapore outside',
    start: Date.UTC(2026, 9, 8, 14),
    working: 3,
  });
  expect(m.band).toEqual({ leftPct: (22 / 48) * 100, widthPct: (6 / 48) * 100 });
  expect(m.cursorPct).toBeCloseTo((22 / 48) * 100, 5);
  expect(m.noCalendar).toEqual([]);
  expect(m.dayTitle).toBe('Tomorrow, Thu 8 Oct');
  expect(m.axis.map((a) => a.label)).toEqual(['00', '03', '06', '09', '12', '15', '18', '21']);
  expect(m.rows[0]).toMatchObject({
    id: 'saopaulo',
    name: 'São Paulo',
    at: '11:00',
    kind: 'working',
  });
});
