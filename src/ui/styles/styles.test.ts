import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CARD_SCRIM } from '@core/sky/contrast';
import { expect, it } from 'vitest';

const tokens = () => readFileSync('src/ui/styles/tokens.css', 'utf8');
const REQUIRED = [
  '--ground',
  '--surface-1',
  '--surface-2',
  '--glass',
  '--line',
  '--text-1',
  '--text-2',
  '--text-3',
  '--text-4',
  '--accent',
  '--focus',
  '--ok',
  '--warn',
  '--neutral',
  '--plan-work',
  '--plan-edge',
  '--plan-late',
  '--plan-off',
  '--font-ui',
  '--font-mono',
  '--r-chip',
  '--r-control',
  '--r-card',
  '--r-sheet',
  '--ease-out',
  '--ease-spring',
  '--dur-press',
  '--dur-snap',
  '--dur-confirm',
  '--dur-sky',
  '--z-dock',
  '--z-header',
  '--z-sheet',
  '--z-toast',
  '--scrim-top',
  '--scrim-bottom',
];

it('defines every token', () => {
  const css = tokens();
  for (const t of REQUIRED) expect(css, t).toContain(`${t}:`);
});

it('card scrim tokens equal the contrast-tested core constants', () => {
  const css = tokens();
  expect(css).toContain(`--scrim-top: ${CARD_SCRIM.top};`);
  expect(css).toContain(`--scrim-bottom: ${CARD_SCRIM.bottom};`);
});

it('component CSS uses tokens only', () => {
  const walk = (d: string): string[] =>
    existsSync(d)
      ? readdirSync(d).flatMap((f) => {
          const p = join(d, f);
          return statSync(p).isDirectory() ? walk(p) : p.endsWith('.module.css') ? [p] : [];
        })
      : [];
  for (const f of walk('src/ui')) {
    const css = readFileSync(f, 'utf8');
    expect(css, f).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|!important/i);
  }
});
