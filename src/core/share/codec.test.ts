import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SHARE_INDEX } from '../cities/shareIndex';
import { MAX_INSTANT } from '../time/range';
import { decodeShare, encodeShare } from './codec';

const U = Date.UTC;

describe('share codec', () => {
  it("decodes v1 links on the sender's calendar date (fixes C1)", () => {
    expect(decodeShare('10p00hwf')).toEqual({
      version: 1,
      resolution: 'exact',
      refId: 'austin',
      instant: U(2026, 9, 7, 20, 0),
      officeIds: ['saopaulo', 'austin', 'bristol', 'bangalore'],
    });
    expect(decodeShare('10460bzf')).toMatchObject({
      version: 1,
      resolution: 'gap',
      instant: U(2026, 2, 8, 8, 30),
    });
  });
  it('v1 encoder output was independent of the sender timezone (UTC−10…+8)', () => {
    const saved = process.env.TZ;
    for (const tz of [
      'Pacific/Honolulu',
      'America/Chicago',
      'America/Sao_Paulo',
      'Europe/London',
      'Asia/Kolkata',
      'Asia/Singapore',
    ]) {
      process.env.TZ = tz;
      expect(Math.round((new Date(2026, 9, 7).getTime() - U(2025, 0, 1)) / 86_400_000), tz).toBe(
        644,
      );
    }
    process.env.TZ = saved;
  });
  it('encodes v2 instants', () => {
    expect(
      encodeShare({
        instant: U(2026, 9, 8, 14, 0),
        refId: 'bristol',
        officeIds: ['saopaulo', 'austin', 'bristol', 'bangalore', 'singapore'],
      }),
    ).toBe('hryfc.2.v');
  });
  it('round-trips v2', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_INSTANT / 60_000 - 1 }),
        fc.constantFrom(...SHARE_INDEX),
        fc.subarray([...SHARE_INDEX], { minLength: 1 }),
        (min, refId, ids) => {
          const p = { instant: min * 60000, refId, officeIds: ids };
          expect(decodeShare(encodeShare(p))).toEqual({
            ...p,
            officeIds: SHARE_INDEX.filter((i) => ids.includes(i)),
            version: 2,
            resolution: 'exact',
          });
        },
      ),
    );
  });
  it.each([
    '',
    'v1234567',
    'zzzzzzz',
    '1zzz0hwf',
    'hryfc.99.v',
    'hryfc.2.zzzzzzzzzzzzzz',
    'hryfc.2.1000',
    '../etc',
    'hryfc.2.',
    'zzzzzzzz.0.1',
  ])('rejects %j', (t) => {
    expect(decodeShare(t)).toBeNull();
  });
});
