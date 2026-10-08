import type { Instant } from '../time/types';
import type { WorkKind } from '../work/policy';
import type { PlanResult } from './overlap';

export type Attendance = 'in' | 'stretch' | 'out';

export interface Suggestion {
  /** [startIndex, endIndex) over the plan's 30-minute slots. */
  startIndex: number;
  endIndex: number;
  start: Instant;
  end: Instant;
  /** One entry per office, in plan order: inside work hours, early/late, or outside. */
  attendance: Attendance[];
  inHours: number;
}

const attend = (states: WorkKind[]): Attendance =>
  states.every((s) => s === 'working')
    ? 'in'
    : states.every((s) => s === 'working' || s === 'early' || s === 'late')
      ? 'stretch'
      : 'out';

/**
 * The best non-overlapping meeting windows of `length` slots: most people inside their hours,
 * then fewest stretching into early/late, then earliest.
 */
export function suggestSlots(plan: PlanResult, length: number, count = 3): Suggestion[] {
  const { slots } = plan;
  const offices = slots[0]?.states.length ?? 0;
  const all: Array<Suggestion & { stretch: number }> = [];
  for (let i = 0; i + length <= slots.length; i++) {
    const span = slots.slice(i, i + length);
    const attendance = Array.from({ length: offices }, (_, k) =>
      attend(span.map((s) => s.states[k] as WorkKind)),
    );
    const inHours = attendance.filter((a) => a === 'in').length;
    if (!inHours) continue;
    all.push({
      startIndex: i,
      endIndex: i + length,
      start: (span[0] as (typeof slots)[number]).start,
      end: (span[length - 1] as (typeof slots)[number]).end,
      attendance,
      inHours,
      stretch: attendance.filter((a) => a === 'stretch').length,
    });
  }
  all.sort((a, b) => b.inHours - a.inHours || a.stretch - b.stretch || a.startIndex - b.startIndex);
  const picked: Suggestion[] = [];
  for (const s of all) {
    if (picked.length === count) break;
    if (picked.some((p) => s.startIndex < p.endIndex && p.startIndex < s.endIndex)) continue;
    const { stretch: _, ...rest } = s;
    picked.push(rest);
  }
  return picked.sort((a, b) => a.startIndex - b.startIndex);
}
