import { describe, expect, it } from 'vitest';
import { CTX } from './corpus';
import { parse } from './index';

const U = Date.UTC;
const ok = (input: string, ctx = CTX) => {
  const r = parse(input, ctx);
  if (r?.status !== 'ok')
    throw new Error(`${input}: ${r ? `${r.status} ${r.diagnostic.code}` : 'null'}`);
  return r;
};

describe('review fixes — parser', () => {
  it('C-1: out-of-range instants are invalid, never thrown', () => {
    expect(() => parse('in 9999999999 hours bst', CTX)).not.toThrow();
    expect(parse('in 9999999999 hours bst', CTX)).toMatchObject({
      status: 'error',
      diagnostic: { code: 'invalid_time' },
    });
    expect(parse('in 9999999999 hours', CTX)).toMatchObject({
      status: 'error',
      diagnostic: { code: 'invalid_time' },
    });
    expect(parse('0026-10-12 3pm sp', CTX)).toMatchObject({
      status: 'error',
      diagnostic: { code: 'invalid_date' },
    });
  });
  it('I-1: overlap alternative with an implicit source re-parses to the later instant', () => {
    const r = ok('2026-11-01 1:30am to sp', { ...CTX, referenceId: 'austin' });
    const alt = r.notices.find((n) => n.code === 'dst_overlap')?.alternative?.query;
    expect(alt).toBe('utc−6 2026-11-01 1:30am to sp');
    expect(ok(alt as string).intent.instant).toBe(U(2026, 10, 1, 7, 30));
  });
  it.each([
    'tomorrow in 2 hours',
    '3pm sp to bristol in 2 hours',
    'tomorrow fri 3pm sp',
    'oct 12 tomorrow 3pm',
  ])('I-2: %s mixes two times and is rejected', (input) => {
    expect(parse(input, CTX)).toMatchObject({
      status: 'error',
      diagnostic: { code: 'conflicting_terms' },
    });
  });
  it('I-3: duration forms', () => {
    expect(ok('in 2hrs').intent.instant).toBe(CTX.now + 2 * 3_600_000);
    expect(ok('in 1h30').intent.instant).toBe(CTX.now + 90 * 60_000);
    expect(ok('in 30m').intent.instant).toBe(CTX.now + 30 * 60_000);
    expect(ok('in 1.5 hours').intent.instant).toBe(CTX.now + 90 * 60_000);
  });
  it('I-4: a 4-digit year after a month-day is a year', () => {
    expect(ok('12 oct 2026 3pm sp').intent.instant).toBe(U(2026, 9, 12, 18));
    expect(ok('oct 12 2026 3pm sp').intent.instant).toBe(U(2026, 9, 12, 18));
    expect(ok('15 oct 2027 3pm sp').intent.instant).toBe(U(2027, 9, 15, 18));
  });
  it('I-5: now / agora / half past / quarter to', () => {
    expect(ok('now in sp').intent).toMatchObject({
      isNow: true,
      source: { kind: 'office', id: 'saopaulo' },
    });
    expect(ok('agora sp').intent.isNow).toBe(true);
    expect(ok('half past 3 sp').intent.instant).toBe(U(2026, 9, 7, 18, 30));
    expect(ok('quarter to 10 sp').intent.instant).toBe(U(2026, 9, 7, 12, 45));
  });
  it('I-6: typographic apostrophes and long aliases', () => {
    expect(ok('what’s the time in bristol').intent).toMatchObject({
      isNow: true,
      source: { kind: 'office', id: 'bristol' },
    });
    expect(ok('3 o’clock sp').intent.instant).toBe(U(2026, 9, 7, 18));
    expect(ok('ho chi minh city 9am').intent.source).toEqual({ kind: 'office', id: 'hochiminh' });
  });
  it('I-7: impossible fixed offsets are rejected', () => {
    expect(parse('3pm utc+99 to sp', CTX)?.status).toBe('error');
    expect(parse('3pm utc+5:75 to sp', CTX)?.status).toBe('error');
  });
  it('24h "h" clocks and zero-padded hours are explicit; generic US zones resolve', () => {
    expect(ok('3h30 sp')).toMatchObject({ notices: [], intent: { instant: U(2026, 9, 7, 6, 30) } });
    expect(ok('05 sp')).toMatchObject({ notices: [], intent: { instant: U(2026, 9, 7, 8) } });
    expect(ok('3pm ct to sp').intent.source).toEqual({ kind: 'office', id: 'austin' });
    expect(ok('3pm et to sp').intent.source).toMatchObject({
      kind: 'zone',
      zone: 'America/New_York',
    });
  });
});
