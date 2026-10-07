import { describe, expect, it } from 'vitest';
import { CTX, OK_ROWS } from './corpus';
import { parse } from './index';

describe('parse — happy paths', () => {
  for (const row of OK_ROWS)
    it(`parses: ${row.input}${row.ctx ? ` ${JSON.stringify(row.ctx)}` : ''}`, () => {
      const r = parse(row.input, { ...CTX, ...row.ctx });
      expect(r?.status).toBe('ok');
      if (r?.status !== 'ok') return;
      expect(r.intent).toMatchObject({
        instant: row.expect.instant,
        source: row.expect.source,
        destinations: row.expect.dest,
        isNow: row.expect.isNow ?? false,
        implicitSource: row.expect.implicit ?? false,
        resolution: row.expect.resolution ?? 'exact',
      });
      expect(r.notices.map((n) => n.code)).toEqual(row.expect.notices ?? []);
      if (row.expect.alternative)
        expect(r.notices.find((n) => n.alternative)?.alternative?.query).toBe(
          row.expect.alternative,
        );
    });

  it('returns null for blank input', () => {
    expect(parse('   ', CTX)).toBeNull();
  });
});
