import { getOffice, type Office } from '@core/cities/registry';
import { expect, it } from 'vitest';
import { LAND } from './land';
import { worldMapModel } from './model';

it('counts every land dot once and lights the right hemisphere', () => {
  const total = LAND.hex
    .join('')
    .split('')
    .reduce(
      (n, h) => n + [...Number.parseInt(h, 16).toString(2)].filter((b) => b === '1').length,
      0,
    );
  const m = worldMapModel(
    Date.UTC(2026, 5, 21, 12),
    ['bristol', 'sydney'].map((i) => getOffice(i) as Office),
  );
  const dots = (s: string) => (s.match(/M/g) ?? []).length;
  expect(dots(m.day) + dots(m.dusk) + dots(m.night)).toBe(total);
  expect(dots(m.day)).toBeGreaterThan(0);
  expect(dots(m.night)).toBeGreaterThan(0);
  expect(m.pins.find((p) => p.id === 'sydney')?.labelLeft).toBe(true);
  expect(m.pins.find((p) => p.id === 'bristol')?.xPct).toBeCloseTo(((-2.59 + 180) / 360) * 100, 3);
});
