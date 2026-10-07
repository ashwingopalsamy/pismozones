import { describe, expect, it } from 'vitest';
import { normalize } from '../text/normalize';
import { isValidZone } from '../time/zoned';
import { DEFAULT_ACTIVE, getOffice, OFFICES, officeForZone } from './registry';
import { SHARE_INDEX } from './shareIndex';

describe('registry', () => {
  it('keeps the v1 share order forever (append-only)', () => {
    expect(SHARE_INDEX).toEqual([
      'saopaulo',
      'austin',
      'bristol',
      'bangalore',
      'singapore',
      'warsaw',
      'mexicocity',
      'buenosaires',
      'bogota',
      'sydney',
      'hochiminh',
      'jakarta',
    ]);
  });
  it('every office is valid, aliases are normalised and unique', () => {
    const seen = new Set<string>();
    for (const o of OFFICES) {
      expect(isValidZone(o.zone)).toBe(true);
      for (const a of o.aliases) {
        expect(normalize(a)).toBe(a);
        expect(seen.has(a)).toBe(false);
        seen.add(a);
      }
    }
    expect(OFFICES.map((o) => o.id).sort()).toEqual([...SHARE_INDEX].sort());
  });
  it('looks up offices', () => {
    expect(getOffice('saopaulo')?.hq).toBe(true);
    expect(officeForZone('Asia/Kolkata')?.id).toBe('bangalore');
    expect(officeForZone('America/New_York')).toBeUndefined();
    expect(DEFAULT_ACTIVE).toEqual(['austin', 'saopaulo', 'bristol', 'bangalore']);
  });
});
