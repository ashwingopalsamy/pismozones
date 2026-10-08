import type { CivilDate } from './types';

export type RelativeDay = 'today' | 'tomorrow' | 'yesterday' | null;

const dayNumber = (d: CivilDate) => Date.UTC(d.year, d.month - 1, d.day) / 86_400_000;

/** Whole civil days from b to a. */
export function dayDelta(a: CivilDate, b: CivilDate): number {
  return dayNumber(a) - dayNumber(b);
}

export function relativeDay(target: CivilDate, reference: CivilDate): RelativeDay {
  const delta = dayDelta(target, reference);
  if (delta === 0) return 'today';
  if (delta === 1) return 'tomorrow';
  if (delta === -1) return 'yesterday';
  return null;
}

export function formatDelta(ms: number): string {
  if (Math.abs(ms) < 30_000) return 'Now';
  let minutes = Math.round(Math.abs(ms) / 60_000);
  const days = Math.floor(minutes / 1440);
  minutes -= days * 1440;
  const hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  const parts = [
    days ? `${days}d` : '',
    hours ? `${hours}h` : '',
    minutes && !days ? `${minutes}m` : '',
  ];
  return (ms < 0 ? '−' : '+') + parts.filter(Boolean).join(' ');
}
