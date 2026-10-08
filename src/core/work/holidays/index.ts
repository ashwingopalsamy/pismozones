import type { CalendarId } from '../../cities/registry';
import type { Lang } from '../../i18n';
import type { CivilDate } from '../../time/types';
import { addDays } from '../../time/zoned';
import { Y2026 } from './company/2026';
import type { CompanyYear, Holiday } from './types';

export type { Holiday } from './types';

/** Portuguese where the company list has it, otherwise English. */
export const holidayName = (h: Holiday, lang: Lang): string =>
  (lang === 'pt-BR' ? h.name.pt : undefined) ?? h.name.en;

/** Pismo publishes one company calendar per country per year; add a year by adding its file here. */
const YEARS: Readonly<Record<number, CompanyYear>> = { 2026: Y2026 };

const iso = (d: CivilDate) =>
  `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

export function publishedYears(_id: CalendarId): readonly number[] {
  return Object.keys(YEARS).map(Number);
}

export function coverage(id: CalendarId, date: CivilDate): 'published' | 'unpublished' {
  return publishedYears(id).includes(date.year) ? 'published' : 'unpublished';
}

export function holidaysIn(id: CalendarId, year: number): readonly Holiday[] {
  return YEARS[year]?.[id] ?? [];
}

/** Undefined both for working days and for years with no published calendar. */
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
