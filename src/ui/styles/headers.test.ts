import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { SECURITY_HEADERS } from '../../../worker/headers';

const file = () => readFileSync('public/_headers', 'utf8');

it('_headers mirrors the Worker security headers', () => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(file()).toContain(`  ${k}: ${v}`);
});

it('_headers caches hashed assets forever and the shell and service worker never', () => {
  expect(file()).toMatch(/\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
  expect(file()).toMatch(/\/fonts\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
  expect(file()).toMatch(/\/sw\.js\n {2}Cache-Control: no-cache/);
  expect(file()).toMatch(/\/index\.html\n {2}Cache-Control: no-cache/);
});
