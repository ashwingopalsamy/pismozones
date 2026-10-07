import type { Office, OfficeId } from '../cities/registry';
import type { CivilDate, Instant } from '../time/types';
import { startOfDay } from '../time/zoned';
import { type WorkKind, workState } from '../work/policy';

export interface PlanSlot {
  start: Instant;
  end: Instant;
  /** One state per office, in input order. */
  states: WorkKind[];
  working: number;
  score: number;
}

export interface BestWindow {
  startIndex: number;
  /** Exclusive */
  endIndex: number;
  working: number;
  outside: Array<{ officeId: OfficeId; kind: WorkKind }>;
}

export interface PlanResult {
  day: { start: Instant; end: Instant };
  slots: PlanSlot[];
  best: BestWindow | null;
  allWorking: boolean;
}

const EDGE_WEIGHT = 0.25;
const cache = new Map<string, PlanResult>();

/** Splits the reference zone's civil day (23/24/25 h) into slots and finds the best overlap. */
export function planDay(
  refDate: CivilDate,
  refZone: string,
  offices: readonly Office[],
  slotMinutes = 30,
): PlanResult {
  const key = `${refDate.year}-${refDate.month}-${refDate.day}|${refZone}|${offices.map((o) => o.id).join(',')}|${slotMinutes}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const day = startOfDay(refDate, refZone);
  const slots: PlanSlot[] = [];
  for (let start = day.start; start < day.end; start += slotMinutes * 60_000) {
    const states = offices.map((o) => workState(start, o).kind);
    const working = states.filter((s) => s === 'working').length;
    const edges = states.filter((s) => s === 'early' || s === 'late').length;
    slots.push({
      start,
      end: Math.min(start + slotMinutes * 60_000, day.end),
      states,
      working,
      score: working + EDGE_WEIGHT * edges,
    });
  }

  const max = Math.max(0, ...slots.map((s) => s.working));
  let best: { start: number; end: number; sum: number } | null = null;
  for (let i = 0; i < slots.length && max > 0; ) {
    if ((slots[i] as PlanSlot).working !== max) {
      i++;
      continue;
    }
    let j = i;
    let sum = 0;
    while (j < slots.length && (slots[j] as PlanSlot).working === max)
      sum += (slots[j++] as PlanSlot).score;
    if (!best || sum > best.sum) best = { start: i, end: j, sum };
    i = j;
  }

  const result: PlanResult = {
    day: { start: day.start, end: day.end },
    slots,
    best: best
      ? {
          startIndex: best.start,
          endIndex: best.end,
          working: max,
          outside: offices
            .map((o, k) => ({
              officeId: o.id,
              kind: (slots[best.start] as PlanSlot).states[k] as WorkKind,
            }))
            .filter((x) => x.kind !== 'working'),
        }
      : null,
    allWorking: offices.length > 0 && slots.some((s) => s.working === offices.length),
  };
  cache.set(key, result);
  return result;
}
