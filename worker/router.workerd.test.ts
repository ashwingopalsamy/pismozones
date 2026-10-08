import type { Miniflare } from 'miniflare';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { startWorker } from './testing';

const seen: string[] = [];
let mf: Miniflare;
beforeAll(async () => {
  mf = await startWorker((path) => {
    seen.push(path);
    return '<!doctype html><html><head><title>Pismo Zones</title></head></html>';
  });
});
afterAll(() => mf.dispose());

it('routes /s through the shell, passes everything else to assets', async () => {
  expect((await mf.dispatchFetch('https://x/s/10p00hwf')).status).toBe(200);
  await (await mf.dispatchFetch('https://x/app.js')).text();
  expect(seen).toEqual(['/', '/app.js']);
});

it('serves Portuguese previews when the first language tag is pt', async () => {
  const res = await mf.dispatchFetch('https://x/s/10p00hwf', {
    headers: { 'accept-language': 'pt-BR,pt;q=0.9,en' },
  });
  expect(await res.text()).toContain('<title>15:00 em Austin · qua 7 out</title>');
});

it('routes /e to event ingest', async () => {
  const res = await mf.dispatchFetch('https://x/e', {
    method: 'POST',
    headers: { origin: 'https://pismozones.ashwingopalsamy.in' },
    body: JSON.stringify({
      v: 1,
      s: 'abcd1234abcd1234',
      a: '2.0.0',
      e: [{ n: 'view', b: ['plan'], d: [], t: 1 }],
    }),
  });
  expect(res.status).toBe(204);
  expect((await mf.dispatchFetch('https://x/e')).status).toBe(405);
});
