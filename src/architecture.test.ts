import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const ALIASES: Record<string, string> = {
  '@core/': 'src/core/',
  '@state/': 'src/state/',
  '@ui/': 'src/ui/',
};

const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) return walk(p);
        return /\.(ts|tsx)$/.test(p) && !p.includes('.test.') && !p.endsWith('.d.ts') ? [p] : [];
      })
    : [];

/** Every import of a file, as an absolute path (local files) or a bare package name. */
function imports(file: string): string[] {
  const specs = [...readFileSync(file, 'utf8').matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(
    (m) => m[1] as string,
  );
  return specs.map((s) => {
    const alias = Object.keys(ALIASES).find((a) => s.startsWith(a));
    if (alias) return resolve(ROOT, (ALIASES[alias] as string) + s.slice(alias.length));
    if (s.startsWith('.')) return resolve(dirname(resolve(ROOT, file)), s);
    return s;
  });
}

const inside = (abs: string, dir: string) => abs.startsWith(resolve(ROOT, dir) + sep);

describe('architecture', () => {
  it('core imports only core (no packages, no other layers)', () => {
    for (const f of walk('src/core'))
      for (const i of imports(f)) expect(inside(i, 'src/core'), `${f} → ${i}`).toBe(true);
  });
  it('core is pure (no clock, DOM or storage access)', () => {
    for (const f of walk('src/core'))
      expect(readFileSync(f, 'utf8'), f).not.toMatch(
        /Date\.now\(|new Date\(\)|\bwindow\.|\bdocument\.|localStorage|navigator\./,
      );
  });
  it('state never imports ui', () => {
    for (const f of walk('src/state'))
      for (const i of imports(f)) expect(inside(i, 'src/ui'), `${f} → ${i}`).toBe(false);
  });
  it('worker never imports state, ui or preact', () => {
    for (const f of walk('worker'))
      for (const i of imports(f)) {
        expect(inside(i, 'src/state') || inside(i, 'src/ui'), `${f} → ${i}`).toBe(false);
        expect(i, f).not.toMatch(/^preact|^@preact/);
      }
  });
});
