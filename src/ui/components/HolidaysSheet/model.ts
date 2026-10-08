import type { CalendarId, Office, OfficeId } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import type { CivilDate } from '@core/time/types';
import { addDays } from '@core/time/zoned';
import { coverage, holidayName, holidaysIn } from '@core/work/holidays';
import { translate } from '../../i18n';

export interface HolidayItem {
  date: string;
  /** Date-tile parts: "12", "Oct", "Mon". */
  day: string;
  month: string;
  weekday: string;
  name: string;
  note: string | null;
  half: boolean;
  focused: boolean;
  state: 'past' | 'today' | 'next' | 'upcoming';
  /** Whole days from today (negative when past). */
  daysUntil: number;
}

/** One company calendar, personalised to the offices on screen. */
export interface CountryCalendar {
  id: CalendarId;
  /** ISO 3166-1 alpha-2, for the flag. */
  iso: string;
  label: string;
  offices: string[];
  /** The viewer's own office follows this calendar. */
  yours: boolean;
  year: number;
  items: HolidayItem[];
  next: HolidayItem | null;
  remaining: number;
  /** The year after this one when its calendar isn't published yet and it starts within 90 days. */
  unpublished: number | null;
}

export interface HolidaysModel {
  countries: CountryCalendar[];
  /** Countries shown initially: the focused one when opened from a card, otherwise all. */
  selected: CalendarId[];
}

const iso = (d: CivilDate) =>
  `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
const dayNumber = (s: string) => {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

export function holidaysModel(
  offices: readonly Office[],
  viewerOffice: OfficeId | null,
  today: CivilDate,
  lang: Lang,
  focus?: { officeId: OfficeId; date: string },
): HolidaysModel {
  const todayKey = iso(today);
  const todayN = dayNumber(todayKey);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang, { ...opts, timeZone: 'UTC' });
  const monthF = fmt({ month: 'short' });
  const weekdayF = fmt({ weekday: 'short' });

  const byCalendar = new Map<CalendarId, Office[]>();
  for (const o of offices)
    if (o.holidayCalendar)
      byCalendar.set(o.holidayCalendar, [...(byCalendar.get(o.holidayCalendar) ?? []), o]);

  const ahead = addDays(today, 90);
  const countries = [...byCalendar.entries()].map(([id, owners]): CountryCalendar => {
    let nextSeen = false;
    const items = holidaysIn(id, today.year).map((h): HolidayItem => {
      const n = dayNumber(h.date);
      const at = new Date(n * 86_400_000);
      const upcoming = h.date > todayKey;
      const state =
        h.date < todayKey ? 'past' : h.date === todayKey ? 'today' : nextSeen ? 'upcoming' : 'next';
      if (upcoming) nextSeen = true;
      return {
        date: h.date,
        day: String(at.getUTCDate()),
        month: monthF.format(at),
        weekday: weekdayF.format(at),
        name: holidayName(h, lang),
        note: h.note ?? null,
        half: h.kind === 'half',
        focused: !!focus && focus.date === h.date && owners.some((o) => o.id === focus.officeId),
        state,
        daysUntil: n - todayN,
      };
    });
    const unpublishedYear = today.year + 1;
    return {
      id,
      iso: owners[0]?.country ?? '',
      label: translate(lang, `country.${id}`),
      offices: owners.map((o) => o.name),
      yours: owners.some((o) => o.id === viewerOffice),
      year: today.year,
      items,
      next: items.find((i) => i.state === 'today' || i.state === 'next') ?? null,
      remaining: items.filter((i) => i.state !== 'past').length,
      unpublished:
        ahead.year >= unpublishedYear &&
        coverage(id, { year: unpublishedYear, month: 1, day: 1 }) === 'unpublished'
          ? unpublishedYear
          : null,
    };
  });
  // The viewer's own calendar first; the rest keep the order of the cities on screen.
  countries.sort((a, b) => Number(b.yours) - Number(a.yours));

  const focusCal = focus ? offices.find((o) => o.id === focus.officeId)?.holidayCalendar : null;
  return {
    countries,
    selected: focusCal && byCalendar.has(focusCal) ? [focusCal] : countries.map((c) => c.id),
  };
}

/** "Today", "Tomorrow", "in 12 days" — nothing for past days. */
export function relativeLabel(item: HolidayItem, lang: Lang): string {
  if (item.daysUntil < 0) return '';
  if (item.daysUntil === 0) return translate(lang, 'holidays.today');
  if (item.daysUntil === 1) return translate(lang, 'holidays.tomorrow');
  return translate(lang, 'holidays.inDays', { n: item.daysUntil });
}
