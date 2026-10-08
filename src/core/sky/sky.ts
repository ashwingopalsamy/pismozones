export interface SkyStops {
  top: string;
  mid: string;
  bottom: string;
}

type Keyframe = readonly [elevation: number, zenith: string, middle: string, horizon: string];

/** Deep night, shared by dawn and dusk. */
const NIGHT: readonly Keyframe[] = [
  [-90, '#02040b', '#050a1b', '#0a1330'],
  [-18, '#03060f', '#08112a', '#121b40'],
];

/** Full daylight, shared by morning and afternoon. */
const DAY: readonly Keyframe[] = [
  [15, '#2c66b5', '#5a8fcf', '#8fb0d2'],
  [35, '#2563c0', '#4a86d0', '#86acd6'],
  [90, '#1f5cc0', '#4282d2', '#7fa8d8'],
];

/** Dawn: cool indigo → lavender → rose → peach as the sun rises. */
const DAWN: readonly Keyframe[] = [
  ...NIGHT,
  [-12, '#071027', '#121f4c', '#2a2f62'],
  [-6, '#10204f', '#3a3f7f', '#76587e'],
  [-2, '#1d3270', '#5b5f98', '#a86a72'],
  [2, '#2b4f93', '#7a7fb0', '#b98670'],
  [6, '#2f5ea6', '#6f93c4', '#b49a7c'],
  ...DAY,
];

/** Dusk: warmer — amber and coral at sunset, magenta and violet into the night. */
const DUSK: readonly Keyframe[] = [
  ...NIGHT,
  [-12, '#080f26', '#1a1a4a', '#33264f'],
  [-6, '#141c4c', '#4a3878', '#88486a'],
  [-2, '#1f2c66', '#6a4d86', '#b65a45'],
  [2, '#2a4686', '#8a6a96', '#c2763f'],
  [6, '#2e5aa0', '#7887b4', '#bb8a52'],
  ...DAY,
];

/** Every keyframe table, for the contrast test. */
export const SKY_TABLES = { dawn: DAWN, dusk: DUSK } as const;

const channels = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

function mix(a: string, b: string, t: number): string {
  const x = channels(a);
  const y = channels(b);
  return `rgb(${x.map((v, i) => Math.round(v + ((y[i] as number) - v) * t)).join(', ')})`;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** Sky gradient for a solar elevation; `rising` picks the dawn palette over the dusk one. */
export function skyFor(elevation: number, rising = true): SkyStops {
  const table = rising ? DAWN : DUSK;
  let i = 0;
  while (i < table.length - 2 && elevation > (table[i + 1]?.[0] ?? 90)) i++;
  const a = table[i] as Keyframe;
  const b = table[i + 1] as Keyframe;
  const t = clamp((elevation - a[0]) / (b[0] - a[0]));
  return { top: mix(a[1], b[1], t), mid: mix(a[2], b[2], t), bottom: mix(a[3], b[3], t) };
}

/** 0 in daylight → 1 by nautical dusk (−12°): how many stars are out. */
export function starAlpha(elevation: number): number {
  return clamp((-elevation - 3) / 9);
}

/** 0 at nautical dusk → 1 in full astronomical night (−20°): the faintest stars and the deepest twinkle. */
export function nightDepth(elevation: number): number {
  return clamp((-elevation - 12) / 8);
}

export interface SunGlow {
  /** Centre, as fractions of the card (0,0 top-left). */
  x: number;
  y: number;
  /** Radius as a fraction of the card's width. */
  r: number;
  color: string;
  alpha: number;
}

/** Where the horizon sits on a card, as a fraction of its height. */
export const HORIZON_Y = 0.78;

/**
 * Sunlight without a disc: a soft glow where the sun is — low left at sunrise, high and centred at
 * noon, low right at sunset — warm near the horizon, whiter overhead, an afterglow just after sunset.
 */
export function sunGlow(elevation: number, hourAngle: number): SunGlow | null {
  if (elevation < -8) return null;
  const rising = hourAngle < 0;
  const x = 0.5 + clamp(hourAngle / 110, -1, 1) * 0.46;
  const up = Math.max(elevation, 0);
  const y = elevation < 0 ? 0.92 : clamp(HORIZON_Y - (up / 60) * 0.62, 0.16, 0.9);
  const warm = rising ? '#ffb39a' : '#ffa060';
  const color = mix(warm, '#fff3d6', clamp((elevation - 10) / 30));
  const alpha =
    elevation < 0
      ? 0.34 * ((elevation + 8) / 8)
      : elevation < 8
        ? 0.34
        : 0.34 - 0.14 * clamp((elevation - 8) / 25);
  return { x, y, r: elevation < 8 ? 0.62 : 0.48, color, alpha };
}
