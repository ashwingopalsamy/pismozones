export interface SkyStops {
  top: string;
  mid: string;
  bottom: string;
}

/** [solar elevation°, zenith, middle, horizon] — tuned on the redesign canvas. */
export const SKY_KEYFRAMES: readonly (readonly [number, string, string, string])[] = [
  [-90, '#02040b', '#050a1b', '#0a1330'],
  [-18, '#03060f', '#081129', '#111c42'],
  [-12, '#060c22', '#0f1c48', '#1f2d5e'],
  [-6, '#0c1a48', '#2b3878', '#5a4a7e'],
  [-2, '#162c66', '#46508a', '#a8644f'],
  [2, '#244685', '#5e6a9c', '#c98455'],
  [6, '#28539a', '#5480b4', '#b0957a'],
  [15, '#265aa8', '#4a7cbb', '#7f9fc0'],
  [35, '#2259b2', '#3c75c0', '#6f98c6'],
  [90, '#1e56b2', '#386fbf', '#6893c4'],
];

const channels = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

function mix(a: string, b: string, t: number): string {
  const x = channels(a);
  const y = channels(b);
  return `rgb(${x.map((v, i) => Math.round(v + ((y[i] as number) - v) * t)).join(', ')})`;
}

export function skyFor(elevation: number): SkyStops {
  let i = 0;
  while (i < SKY_KEYFRAMES.length - 2 && elevation > (SKY_KEYFRAMES[i + 1]?.[0] ?? 90)) i++;
  const a = SKY_KEYFRAMES[i] as (typeof SKY_KEYFRAMES)[number];
  const b = SKY_KEYFRAMES[i + 1] as (typeof SKY_KEYFRAMES)[number];
  const t = Math.max(0, Math.min(1, (elevation - a[0]) / (b[0] - a[0])));
  return { top: mix(a[1], b[1], t), mid: mix(a[2], b[2], t), bottom: mix(a[3], b[3], t) };
}

export function starAlpha(elevation: number): number {
  return Math.max(0, Math.min(1, (-elevation - 3) / 9));
}
