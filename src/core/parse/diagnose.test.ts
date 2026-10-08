import { describe, expect, it } from 'vitest';
import { CTX } from './corpus';
import { parse } from './index';

const err = (input: string) => parse(input, CTX);

describe('parse — diagnostics', () => {
  it('seasonal abbreviation out of season offers the city or fixed UTC', () => {
    const r = err('3pm GMT');
    expect(r).toMatchObject({
      status: 'error',
      diagnostic: { code: 'abbreviation_out_of_season', token: 'gmt' },
    });
    if (r?.status === 'error')
      expect(r.suggestions.map((s) => s.query)).toEqual(['3pm bristol', '3pm utc']);
  });
  it('CST asks US Central or China', () => {
    const r = err('2026-07-15 3pm CST');
    expect(r).toMatchObject({
      status: 'ambiguous',
      diagnostic: { code: 'ambiguous_abbreviation', token: 'cst' },
    });
    if (r?.status === 'ambiguous')
      expect(r.options.map((o) => o.query)).toEqual([
        '2026-07-15 3pm austin',
        '2026-07-15 3pm china',
      ]);
  });
  it.each([
    ['9-5 brt', 'range_unsupported'],
    ['3 to 5pm sp', 'range_unsupported'],
    ['every monday 10am', 'recurrence_unsupported'],
    ['25:00 sp', 'invalid_time'],
    ['13pm sp', 'invalid_time'],
    ['32 oct 3pm', 'invalid_date'],
    ['tomorrow', 'missing_time'],
    ['what is the', 'nothing_to_convert'],
    ['hello', 'unknown_token'],
    ['3pm bristol to austin, sp, ist, sg, warsaw, sydney, mexico', 'too_many_destinations'],
  ])('%s → %s', (input, code) => {
    expect(err(input)).toMatchObject({ diagnostic: { code } });
  });
  it('suggests the nearest city for a typo', () => {
    const r = err('3pm brstol');
    expect(r).toMatchObject({
      status: 'error',
      diagnostic: { code: 'unknown_token', token: 'brstol' },
    });
    if (r?.status === 'error')
      expect(r.suggestions[0]).toEqual({
        query: '3pm bristol',
        display: { kind: 'office', id: 'bristol' },
      });
  });
  it('an unknown source is never replaced by the reference', () => {
    expect(err('3pm zzt to brt')?.status).toBe('error');
  });
});
