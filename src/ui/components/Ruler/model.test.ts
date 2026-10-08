import { getOffice, type Office } from '@core/cities/registry';
import { NOW } from '@state/testing';
import { expect, it } from 'vitest';
import { rulerTicks } from './model';

it('places hour ticks in the reference zone', () => {
  const offices = ['saopaulo', 'austin', 'bristol', 'bangalore'].map((i) => getOffice(i) as Office);
  const ticks = rulerTicks(NOW, 'America/Sao_Paulo', offices, 252, 'h23');
  const t11 = ticks.find((t) => t.label === '11');
  expect(t11?.major).toBe(true);
  expect(t11?.x).toBeCloseTo(108.4, 1);
  expect(ticks.some((t) => t.hot)).toBe(true);
  expect(
    rulerTicks(NOW, 'America/Sao_Paulo', offices, 252, 'h12').find((t) => t.x === t11?.x)?.label,
  ).toBe('11a');
});
