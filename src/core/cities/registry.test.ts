import { describe, expect, it } from 'vitest';
import { normalize } from '../text/normalize';
import { isValidZone } from '../time/zoned';
import { DEFAULT_ACTIVE, getOffice, OFFICES, officeForZone, sameZone } from './registry';
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
    expect(officeForZone('Asia/Calcutta')?.id).toBe('bangalore');
    expect(officeForZone('Asia/Saigon')?.id).toBe('hochiminh');
    expect(officeForZone('America/Buenos_Aires')?.id).toBe('buenosaires');
    expect(sameZone('Asia/Calcutta', 'Asia/Kolkata')).toBe(true);
    expect(sameZone('Europe/London', 'Asia/Kolkata')).toBe(false);
    expect(DEFAULT_ACTIVE).toEqual(['austin', 'saopaulo', 'bristol', 'bangalore']);
  });
});
