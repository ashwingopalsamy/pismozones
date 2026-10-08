import type { CalendarId } from '../../cities/registry';
import type { CivilDate } from '../../time/types';
import { addDays } from '../../time/zoned';
import { brSp } from './calendars/br-sp';
import { gbEng } from './calendars/gb-eng';
import { inKa } from './calendars/in-ka';
import { pl } from './calendars/pl';
import { sg } from './calendars/sg';
import { usTx } from './calendars/us-tx';
import { compute, iso } from './engine';
import type { CalendarDef, CalendarInfo, Holiday } from './types';

export { easterSunday } from './easter';
export type { CalendarInfo, Holiday } from './types';

const CALENDARS: Record<CalendarId, CalendarDef> = {
  'br-sp': brSp,
  'us-tx': usTx,
  'gb-eng': gbEng,
  'in-ka': inKa,
  sg,
  pl,
};

const cache = new Map<string, readonly Holiday[]>();

export function calendarInfo(id: CalendarId): CalendarInfo {
  return CALENDARS[id].info;
}

export function holidaysIn(id: CalendarId, year: number): readonly Holiday[] {
  const key = `${id}:${year}`;
  let list = cache.get(key);
  if (!list) {
    list = compute(CALENDARS[id], year);
    cache.set(key, list);
  }
  return list;
}

export function holidayOn(id: CalendarId, date: CivilDate): Holiday | undefined {
  const key = iso(date);
  return holidaysIn(id, date.year).find((h) => h.date === key);
}

export function upcomingHolidays(
  ids: readonly CalendarId[],
  from: CivilDate,
  days: number,
): Array<Holiday & { calendar: CalendarId }> {
  const start = iso(from);
  const end = iso(addDays(from, days));
  const out: Array<Holiday & { calendar: CalendarId }> = [];
  for (const id of ids)
    for (let y = from.year; y <= Number(end.slice(0, 4)); y++)
      for (const h of holidaysIn(id, y))
        if (h.date >= start && h.date < end) out.push({ ...h, calendar: id });
  return out.sort(
    (a, b) => a.date.localeCompare(b.date) || ids.indexOf(a.calendar) - ids.indexOf(b.calendar),
  );
}

/** Last date covered by a hand-maintained list, or null when the calendar is rule-based. */
export function listCoverageEnd(id: CalendarId): CivilDate | null {
  let last: string | null = null;
  for (const r of CALENDARS[id].rules)
    if (r.type === 'list') for (const e of r.entries) if (!last || e.date > last) last = e.date;
  return last ? { year: Number(last.slice(0, 4)), month: 12, day: 31 } : null;
}
