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

it('world-clock grid: local labels, half-hour zones, DST days, 12h', () => {
  const m = vm({ ref: 'saopaulo', offices: ['saopaulo', 'bangalore'], date: [2026, 10, 7] });
  expect(m.columns).toHaveLength(24);
  expect(m.rows[1]?.cells[0]?.label).toBe('8:30');
  expect(vm({ ref: 'bristol', offices: ['bristol'], date: [2026, 10, 25] }).columns).toHaveLength(
    25,
  );
  expect(
    vm({ ref: 'saopaulo', offices: ['saopaulo'], date: [2026, 10, 7], hc: 'h12' }).rows[0]
      ?.cells[13]?.label,
  ).toBe('1p');
});

it('spells out the best window per city', () => {
  const m = vm({
    ref: 'saopaulo',
    offices: ['saopaulo', 'austin', 'bristol', 'bangalore'],
    date: [2026, 10, 7],
  });
  expect(m.best?.perCity.map((p) => p.text)).toEqual(
    expect.arrayContaining([expect.stringMatching(/^Bengaluru outside \(/)]),
  );
});
