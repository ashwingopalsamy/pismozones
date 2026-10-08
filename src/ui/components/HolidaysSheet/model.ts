import type { CalendarId, Office, OfficeId } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import { formatShortDate } from '@core/time/format';
import type { CivilDate, Weekday } from '@core/time/types';
import { addDays } from '@core/time/zoned';
import {
  coverage,
  type Holiday,
  holidayName,
  holidaysIn,
  upcomingHolidays,
} from '@core/work/holidays';
import { translate } from '../../i18n';

export type HolidayTab = 'upcoming' | CalendarId;

export interface HolidayItem {
  date: string;
  dateLabel: string;
  name: string;
  note: string | null;
  offices: string;
  half: boolean;
  focused: boolean;
  state: 'past' | 'today' | 'next' | 'upcoming';
}

export interface HolidayMonth {
  title: string;
  items: HolidayItem[];
}

export interface HolidaysModel {
  tabs: Array<{ id: HolidayTab; label: string }>;
  selected: HolidayTab;
  upcoming: HolidayMonth[];
  country: Partial<Record<CalendarId, HolidayMonth[]>>;
  /** First year without a published company calendar inside the upcoming window. */
  unpublished: number | null;
  noCalendar: string[];
}

const DAYS = 90;

const iso = (d: CivilDate) =>
  `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

export function holidaysModel(
  offices: readonly Office[],
  today: CivilDate,
  lang: Lang,
  focus?: { officeId: OfficeId; date: string },
): HolidaysModel {
  const byCalendar = new Map<CalendarId, Office[]>();
  for (const o of offices)
    if (o.holidayCalendar)
      byCalendar.set(o.holidayCalendar, [...(byCalendar.get(o.holidayCalendar) ?? []), o]);
  const ids = [...byCalendar.keys()];
  const todayKey = iso(today);
  const monthName = new Intl.DateTimeFormat(lang, { month: 'long', timeZone: 'UTC' });

  const item = (h: Holiday, owners: Office[], next: boolean): HolidayItem => {
    const [y, m, d] = h.date.split('-').map(Number) as [number, number, number];
    return {
      date: h.date,
      dateLabel: formatShortDate(
        { year: y, month: m, day: d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday },
        lang,
      ),
      name: holidayName(h, lang),
      note: h.note ?? null,
      offices: owners.map((o) => o.name).join(', '),
      half: h.kind === 'half',
      focused:
        !!focus && focus.date === h.date && owners.some((o) => o.id === focus.officeId),
      state:
        h.date < todayKey ? 'past' : h.date === todayKey ? 'today' : next ? 'next' : 'upcoming',
    };
  };
  const group = (items: HolidayItem[]): HolidayMonth[] => {
    const months: HolidayMonth[] = [];
    for (const it of items) {
      const [y, m] = it.date.split('-').map(Number) as [number, number];
      const title = monthName.format(Date.UTC(y, m - 1, 1));
      const last = months.at(-1);
      if (last?.title === title) last.items.push(it);
      else months.push({ title, items: [it] });
    }
    return months;
  };

  // Upcoming: merged across offices; the same holiday on the same day is one row.
  const merged = new Map<string, { h: Holiday; owners: Office[] }>();
  for (const h of upcomingHolidays(ids, today, DAYS)) {
    const key = `${h.date}|${h.name.en}`;
    const owners = byCalendar.get(h.calendar) ?? [];
    const hit = merged.get(key);
    if (hit) hit.owners.push(...owners);
    else merged.set(key, { h, owners: [...owners] });
  }
  let first = true;
  const upcoming = group(
    [...merged.values()].map(({ h, owners }) => {
      const it = item(h, owners, first && h.date > todayKey);
      if (h.date > todayKey) first = false;
      return it;
    }),
  );

  // Country tabs: the whole published year.
  const country: HolidaysModel['country'] = {};
  for (const id of ids) {
    let next = true;
    country[id] = group(
      holidaysIn(id, today.year).map((h) => {
        const it = item(h, byCalendar.get(id) ?? [], next && h.date > todayKey);
        if (h.date > todayKey) next = false;
        return it;
      }),
    );
  }

  const end = addDays(today, DAYS);
  let unpublished: number | null = null;
  for (let y = today.year; y <= end.year && ids.length; y++)
    if (coverage(ids[0] as CalendarId, { year: y, month: 1, day: 1 }) === 'unpublished') {
      unpublished = y;
      break;
    }

  const focusCal = focus ? offices.find((o) => o.id === focus.officeId)?.holidayCalendar : null;
  return {
    tabs: [
      { id: 'upcoming', label: translate(lang, 'holidays.upcoming') },
      ...ids.map((id) => ({ id, label: translate(lang, `country.${id}`) })),
    ],
    selected: focusCal && ids.includes(focusCal) ? focusCal : 'upcoming',
    upcoming,
    country,
    unpublished,
    noCalendar: offices.filter((o) => !o.holidayCalendar).map((o) => o.name),
  };
}
