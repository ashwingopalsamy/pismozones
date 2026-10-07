import { describe, expect, it } from 'vitest';
import { toWire, validateBatch } from './schema';

describe('event schema', () => {
  it('maps props positionally', () => {
    expect(toWire('commit', { method: 'ruler', hoursFromNow: 2.5 }, 1200)).toEqual({
      n: 'commit',
      b: ['ruler'],
      d: [2.5],
      t: 1200,
    });
  });
  it('accepts a valid batch and rejects malformed ones', () => {
    expect(
      validateBatch({
        v: 1,
        s: 'abc',
        a: '2.0.0',
        e: [{ n: 'commit', b: ['ruler'], d: [2.5], t: 1 }],
      }),
    ).not.toBeNull();
    for (const bad of [
      { v: 1, s: 'a', a: 'b', e: [{ n: 'nope', b: [], d: [], t: 1 }] },
      { v: 1, s: 'a', a: 'b', e: [{ n: 'commit', b: [], d: [2.5], t: 1 }] },
      { v: 1, s: 'a', a: 'b', e: [{ n: 'commit', b: ['x'.repeat(65)], d: [1], t: 1 }] },
      { v: 1, s: 'a', a: 'b', e: [{ n: 'commit', b: ['ruler'], d: [Number.NaN], t: 1 }] },
      {
        v: 1,
        s: 'a',
        a: 'b',
        e: Array.from({ length: 51 }, () => ({ n: 'view', b: ['plan'], d: [], t: 1 })),
      },
      { v: 2, s: 'a', a: 'b', e: [] },
      'string',
      null,
    ])
      expect(validateBatch(bad), JSON.stringify(bad)?.slice(0, 60)).toBeNull();
  });
});
