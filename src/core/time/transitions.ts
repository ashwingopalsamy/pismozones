import type { Instant, ZoneId } from './types';
import { offsetMinutes } from './zoned';

export interface Transition {
  at: Instant;
  fromOffset: number;
  toOffset: number;
}

const STEP = 6 * 3_600_000;
const MINUTE = 60_000;

/** The first instant after `from` (within the horizon) at which the zone's offset changes. */
export function nextTransition(
  from: Instant,
  zone: ZoneId,
  horizonDays: number,
): Transition | null {
  const end = from + horizonDays * 86_400_000;
  const fromOffset = offsetMinutes(from, zone);
  for (let t = from; t < end; t += STEP) {
    const next = Math.min(t + STEP, end);
    const toOffset = offsetMinutes(next, zone);
    if (toOffset === fromOffset) continue;
    let lo = t;
    let hi = next;
    while (hi - lo > MINUTE) {
      const mid = Math.floor((lo + hi) / 2 / MINUTE) * MINUTE;
      if (mid <= lo) break;
      if (offsetMinutes(mid, zone) === fromOffset) lo = mid;
      else hi = mid;
    }
    return { at: hi, fromOffset, toOffset };
  }
  return null;
}
