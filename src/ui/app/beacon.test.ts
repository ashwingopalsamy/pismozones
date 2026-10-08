import { expect, it } from 'vitest';
import { injectBeacon } from './beacon';

it('injects the beacon once, only with a token', () => {
  injectBeacon(undefined, document);
  injectBeacon('', document);
  expect(document.querySelectorAll('script[data-cf-beacon]')).toHaveLength(0);
  injectBeacon('abc', document);
  injectBeacon('abc', document);
  const s = document.querySelectorAll('script[data-cf-beacon]');
  expect(s).toHaveLength(1);
  expect(s[0]?.getAttribute('src')).toBe('https://static.cloudflareinsights.com/beacon.min.js');
  expect((s[0] as HTMLScriptElement).defer).toBe(true);
  expect(JSON.parse(s[0]?.getAttribute('data-cf-beacon') ?? '')).toEqual({
    token: 'abc',
    spa: true,
  });
});
