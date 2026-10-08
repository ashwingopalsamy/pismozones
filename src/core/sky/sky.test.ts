import { describe, expect, it } from 'vitest';
import { CARD_SCRIM, contrastRatio, overBlack, parseRgb, type RGB } from './contrast';
import { nightDepth, skyFor, starAlpha, sunGlow } from './sky';
import { solarElevation, sunSamples } from './sun';

const U = Date.UTC;

describe('sun', () => {
  it('solar elevation matches known geometry (±0.5°)', () => {
    expect(solarElevation(U(2026, 5, 21, 12, 10), 51.45, -2.59)).toBeCloseTo(61.98, 0);
    expect(solarElevation(U(2026, 11, 21, 0, 10), 51.45, -2.59)).toBeCloseTo(-61.98, 0);
    expect(solarElevation(U(2026, 2, 20, 12, 7), 0, 0)).toBeGreaterThan(89);
    expect(sunSamples(U(2026, 5, 21), U(2026, 5, 22), 51.45, -2.59)).toHaveLength(97);
  });
});

describe('sky', () => {
  it('dawn and dusk share night and day, and differ at the horizon in between', () => {
    expect(skyFor(-60, true)).toEqual(skyFor(-60, false));
    expect(skyFor(40, true)).toEqual(skyFor(40, false));
    expect(skyFor(1, true).bottom).not.toBe(skyFor(1, false).bottom);
    expect([starAlpha(-3), starAlpha(-7.5), starAlpha(-12), starAlpha(10)]).toEqual([0, 0.5, 1, 0]);
    expect([nightDepth(-12), nightDepth(-16), nightDepth(-30)]).toEqual([0, 0.5, 1]);
  });

  it('the glow sits left at sunrise, centred at noon, right at sunset, gone in deep night', () => {
    expect(sunGlow(2, -85)?.x).toBeLessThan(0.2);
    expect(sunGlow(60, 0)?.x).toBeCloseTo(0.5, 5);
    expect(sunGlow(2, 85)?.x).toBeGreaterThan(0.8);
    expect(sunGlow(-10, 120)).toBeNull();
  });

  it('white card text passes WCAG at every elevation, in both palettes, even under the glow (spec §5.6)', () => {
    const white: RGB = [255, 255, 255];
    const lit = (c: RGB, glow: RGB, a: number): RGB => [
      c[0] + (glow[0] - c[0]) * a,
      c[1] + (glow[1] - c[1]) * a,
      c[2] + (glow[2] - c[2]) * a,
    ];
    for (const rising of [true, false])
      for (let el = -90; el <= 90; el++) {
        const s = skyFor(el, rising);
        const g = sunGlow(el, rising ? -60 : 60);
        const top = parseRgb(s.top);
        const bottom = parseRgb(s.bottom);
        const glowTop = g ? lit(top, parseRgb(g.color), g.y < 0.5 ? g.alpha : 0) : top;
        const glowBottom = g ? lit(bottom, parseRgb(g.color), g.y >= 0.5 ? g.alpha : 0) : bottom;
        const tag = `${rising ? 'dawn' : 'dusk'} @${el}`;
        expect(
          contrastRatio(white, overBlack(glowTop, CARD_SCRIM.top)),
          `top ${tag}`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(white, overBlack(glowBottom, CARD_SCRIM.bottom)),
          `bottom ${tag}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
  });
});
