import { getOffice, type Office, type OfficeId } from '@core/cities/registry';
import { planDay } from '@core/plan/overlap';
import type { HourCycle } from '@core/time/format';
import { NOW } from '@state/testing';
import { expect, it } from 'vitest';
import { planViewModel } from './model';

const vm = (o: {
  ref: OfficeId;
  offices: OfficeId[];
  date: [number, number, number];
  hc?: HourCycle;
}) => {
  const ref = getOffice(o.ref) as Office;
  const offices = o.offices.map((id) => getOffice(id) as Office);
  const [year, month, day] = o.date;
  const plan = planDay({ year, month, day }, ref.zone, offices);
  return planViewModel(plan, offices, ref, NOW, 'live', o.hc ?? 'h23', 'en', 'UTC', NOW);
};

it('local hour labels, half-hour zones, DST days, 12h', () => {
  const m = vm({ ref: 'saopaulo', offices: ['saopaulo', 'bangalore'], date: [2026, 10, 7] });
  expect(m.hours).toBe(24);
  expect(m.rows[1]?.labels[0]).toMatchObject({ text: '8', sub: ':30' });
  expect(vm({ ref: 'bristol', offices: ['bristol'], date: [2026, 10, 25] }).hours).toBe(25);
  expect(
    vm({ ref: 'saopaulo', offices: ['saopaulo'], date: [2026, 10, 7], hc: 'h12' }).rows[0]
      ?.labels[13],
  ).toMatchObject({ text: '1', suffix: 'p' });
});

it('work states are continuous segments; the best window is per city', () => {
  const m = vm({
    ref: 'saopaulo',
    offices: ['saopaulo', 'austin', 'bristol', 'bangalore'],
    date: [2026, 10, 7],
  });
  expect(m.rows[0]?.segments.find((s) => s.kind === 'working')).toMatchObject({
    from: 9 / 24,
    to: 18 / 24,
  });
  expect(m.best?.perCity.find((p) => p.id === 'bangalore')?.outside).toBe(true);
});
