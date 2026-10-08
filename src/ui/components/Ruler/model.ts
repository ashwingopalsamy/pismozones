import type { Office } from '@core/cities/registry';
import type { HourCycle } from '@core/time/format';
import type { Instant } from '@core/time/types';
import { zonedFields } from '@core/time/zoned';
import { workState } from '@core/work/policy';

/** Scrub scale: one pixel of drag moves time by 75 seconds (12 px per quarter hour). */
export const MS_PER_PX = 75_000;
const QUARTER = 900_000;

export interface Tick {
  x: number;
  major: boolean;
  label: string;
  hot: boolean;
}

export function rulerTicks(
  moment: Instant,
  refZone: string,
  offices: readonly Office[],
  widthPx: number,
  hc: HourCycle,
): Tick[] {
  const centre = widthPx / 2;
  const first = Math.ceil((moment - centre * MS_PER_PX) / QUARTER) * QUARTER;
  const raw: Array<Omit<Tick, 'hot'> & { working: number }> = [];
  for (let t = first; t <= moment + centre * MS_PER_PX; t += QUARTER) {
    const f = zonedFields(t, refZone);
    const major = f.minute === 0;
    const label = !major
      ? ''
      : hc === 'h23'
        ? String(f.hour).padStart(2, '0')
        : `${((f.hour + 11) % 12) + 1}${f.hour < 12 ? 'a' : 'p'}`;
    const working = offices.reduce((n, o) => n + (workState(t, o).kind === 'working' ? 1 : 0), 0);
    raw.push({ x: centre + (t - moment) / MS_PER_PX, major, label, working });
  }
  const max = Math.max(0, ...raw.map((r) => r.working));
  return raw.map(({ working, ...tick }) => ({ ...tick, hot: max >= 2 && working === max }));
}
