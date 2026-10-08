import { expect, it, vi } from 'vitest';
import { handleEvents, ORIGIN_RE } from './events';

const batch = {
  v: 1,
  s: 'abcd1234abcd1234',
  a: '2.0.0',
  e: [
    { n: 'commit', b: ['ruler'], d: [2.5], t: 1200 },
    { n: 'view', b: ['plan'], d: [], t: 1300 },
  ],
};
const post = (
  body: string,
  origin = 'https://pismozones.ashwingopalsamy.in',
  init: RequestInit = {},
) =>
  new Request('https://pismozones.ashwingopalsamy.in/e', {
    method: 'POST',
    body,
    headers: { origin, 'content-type': 'text/plain' },
    ...init,
  });

it('writes one positional data point per event', async () => {
  const writeDataPoint = vi.fn();
  const res = await handleEvents(post(JSON.stringify(batch)), {
    EVENTS: { writeDataPoint },
  } as never);
  expect(res.status).toBe(204);
  expect(writeDataPoint).toHaveBeenNthCalledWith(1, {
    indexes: ['commit'],
    blobs: [
      'commit',
      '1',
      '2.0.0',
      'XX',
      'abcd1234abcd1234',
      'ruler',
      '',
      '',
      '',
      '',
      '',
      'pismozones.ashwingopalsamy.in',
    ],
    doubles: [1200, 2.5],
  });
  expect(writeDataPoint).toHaveBeenCalledTimes(2);
});

it.each([
  ['wrong method', new Request('https://x/e'), 405],
  ['foreign origin', post(JSON.stringify(batch), 'https://evil.example'), 403],
  ['no origin', new Request('https://x/e', { method: 'POST', body: JSON.stringify(batch) }), 403],
  ['oversized', post('x'.repeat(20_000)), 413],
  [
    'declared oversized',
    post('{}', undefined, {
      headers: { origin: 'https://pismozones.ashwingopalsamy.in', 'content-length': '20000' },
    }),
    413,
  ],
  ['not json', post('{'), 400],
  ['bad event', post(JSON.stringify({ ...batch, e: [{ n: 'nope', b: [], d: [], t: 1 }] })), 400],
  ['NaN double', post(JSON.stringify(batch).replace('2.5', '"NaN"')), 400],
])('%s → %i and writes nothing', async (_n, req, status) => {
  const writeDataPoint = vi.fn();
  expect((await handleEvents(req as Request, { EVENTS: { writeDataPoint } } as never)).status).toBe(
    status,
  );
  expect(writeDataPoint).not.toHaveBeenCalled();
});

it('accepts preview aliases and localhost, nothing else', () => {
  for (const o of [
    'https://pismozones.acme.workers.dev',
    'https://pr-12-pismozones.acme.workers.dev',
    'http://localhost:5173',
    'https://pismozones.vercel.app',
    'https://pismozones-git-main-ashwin.vercel.app',
  ])
    expect(ORIGIN_RE.test(o)).toBe(true);
  for (const o of [
    'https://pismozones.ashwingopalsamy.in.evil.example',
    'https://evilpismozones.acme.workers.dev',
    'http://pismozones.ashwingopalsamy.in',
    'https://evil.vercel.app',
  ])
    expect(ORIGIN_RE.test(o)).toBe(false);
});
