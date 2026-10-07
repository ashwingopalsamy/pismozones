import { expect, it } from 'vitest';
import { parseOk } from './corpus';
import { shapeOf } from './shape';

it('summarises a query by span roles', () => {
  expect(shapeOf(parseOk('3pm bristol to austin').spans)).toBe('TP>P');
  expect(shapeOf(parseOk('meeting at 3 with sp team').spans)).toBe('TP');
  expect(shapeOf(parseOk('in 2 hours').spans)).toBe('N');
});
