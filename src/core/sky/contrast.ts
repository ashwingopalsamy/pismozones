export type RGB = readonly [number, number, number];

/** Black scrim opacity behind card text; mirrored by --scrim-* tokens in tokens.css. */
export const CARD_SCRIM = { top: 0.18, bottom: 0.36 } as const;

export function parseRgb(s: string): RGB {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(s);
  if (!m) throw new Error(`Not an rgb() colour: ${s}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function overBlack(c: RGB, alpha: number): RGB {
  return [c[0] * (1 - alpha), c[1] * (1 - alpha), c[2] * (1 - alpha)];
}

function luminance(c: RGB): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
