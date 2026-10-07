import { describe, expect, it } from 'vitest';
import { CARD_SCRIM, contrastRatio, overBlack, parseRgb, type RGB } from './contrast';
import { skyFor, starAlpha } from './sky';
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
  it('keyframes are exact at their anchors and interpolate', () => {
    expect(skyFor(90)).toEqual({
      top: 'rgb(30, 86, 178)',
      mid: 'rgb(56, 111, 191)',
      bottom: 'rgb(104, 147, 196)',
    });
    expect(skyFor(-18)).toEqual({
      top: 'rgb(3, 6, 15)',
      mid: 'rgb(8, 17, 41)',
      bottom: 'rgb(17, 28, 66)',
    });
    expect(skyFor(-60).top).toBe('rgb(2, 5, 13)');
    expect([starAlpha(-3), starAlpha(-7.5), starAlpha(-12), starAlpha(10)]).toEqual([0, 0.5, 1, 0]);
  });
  it('white card text passes WCAG at every solar elevation (spec §5.6)', () => {
    const white: RGB = [255, 255, 255];
    for (let el = -90; el <= 90; el++) {
      const s = skyFor(el);
      expect(
        contrastRatio(white, overBlack(parseRgb(s.top), CARD_SCRIM.top)),
        `top @${el}`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(white, overBlack(parseRgb(s.bottom), CARD_SCRIM.bottom)),
        `bottom @${el}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
