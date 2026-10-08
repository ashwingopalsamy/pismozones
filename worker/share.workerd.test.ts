import type { Miniflare } from 'miniflare';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './headers';
import { startWorker } from './testing';

const SHELL =
  '<!doctype html><html lang="en"><head><title>Pismo Zones</title><meta property="og:title" content="Pismo Zones">' +
  '<meta property="og:description" content="x"><meta property="og:url" content="x"><meta name="twitter:title" content="x">' +
  '<meta name="twitter:description" content="x"><link rel="canonical" href="x"></head><body><div id="root"></div></body></html>';

let mf: Miniflare;
beforeAll(async () => {
  mf = await startWorker(() => SHELL);
});
afterAll(() => mf.dispose());

it('rewrites meta for a valid token', async () => {
  const res = await mf.dispatchFetch('https://x/s/10p00hwf');
  const html = await res.text();
  expect(html).toContain('<title>15:00 in Austin · Wed 7 Oct</title>');
  expect(html).toContain('property="og:title" content="15:00 in Austin · Wed 7 Oct"');
  expect(html).toContain(
    'name="twitter:description" content="17:00 São Paulo · 21:00 Bristol · 01:30 Bengaluru (+1d)"',
  );
  expect(html).toContain(
    'property="og:url" content="https://pismozones.ashwingopalsamy.in/s/10p00hwf"',
  );
  expect(html).toContain('rel="canonical" href="https://pismozones.ashwingopalsamy.in/s/10p00hwf"');
  expect(res.headers.get('content-security-policy')).toBe(
    SECURITY_HEADERS['Content-Security-Policy'],
  );
  expect([res.status, res.headers.get('cache-control'), res.headers.get('content-type')]).toEqual([
    200,
    'public, max-age=300',
    'text/html; charset=utf-8',
  ]);
});

it('flags invalid tokens without touching meta', async () => {
  const html = await (await mf.dispatchFetch('https://x/s/zz')).text();
  expect(html).toContain('data-share-error="1"');
  expect(html).toContain('<title>Pismo Zones</title>');
});
