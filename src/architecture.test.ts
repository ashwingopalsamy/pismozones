import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) return walk(p);
        return /\.(ts|tsx)$/.test(p) && !p.includes('.test.') ? [p] : [];
      })
    : [];
const imports = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1] as string);

describe('architecture', () => {
  it('core imports only core', () => {
    for (const f of walk('src/core'))
      for (const i of imports(f)) expect(i, `${f} → ${i}`).toMatch(/^(\.{1,2}\/|@core\/)/);
  });
  it('core is pure (no clock, DOM or storage access)', () => {
    for (const f of walk('src/core')) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(
        /Date\.now\(|new Date\(\)|\bwindow\.|\bdocument\.|localStorage|navigator\./,
      );
    }
  });
  it('state never imports ui; worker never imports state or ui', () => {
    for (const f of walk('src/state'))
      for (const i of imports(f)) expect(i, f).not.toMatch(/^@ui\/|\/ui\//);
    for (const f of walk('worker'))
      for (const i of imports(f)) expect(i, f).not.toMatch(/^@(state|ui)\/|preact/);
  });
});
