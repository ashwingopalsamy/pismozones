import type { CalendarId, Office, OfficeId } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import { formatShortDate } from '@core/time/format';
import type { CivilDate, Weekday } from '@core/time/types';
import { upcomingHolidays } from '@core/work/holidays';

export interface HolidayItem {
  date: string;
  dateLabel: string;
  name: string;
  offices: string;
  half: boolean;
  focused: boolean;
}

export interface HolidaysModel {
  months: Array<{ title: string; items: HolidayItem[] }>;
  noCalendar: string[];
}

const DAYS = 90;

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
  const merged = new Map<string, HolidayItem & { officeIds: OfficeId[] }>();
  for (const h of upcomingHolidays([...byCalendar.keys()], today, DAYS)) {
    const key = `${h.date}|${h.name.en}`;
    const owners = byCalendar.get(h.calendar) ?? [];
    const existing = merged.get(key);
    if (existing) {
      existing.officeIds.push(...owners.map((o) => o.id));
      existing.offices = [existing.offices, ...owners.map((o) => o.name)].join(', ');
      continue;
    }
    const [y, m, d] = h.date.split('-').map(Number) as [number, number, number];
    merged.set(key, {
      date: h.date,
      dateLabel: formatShortDate(
        {
          year: y,
          month: m,
          day: d,
          weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday,
        },
        lang,
      ),
      name: lang === 'pt-BR' ? h.name.pt : h.name.en,
      offices: owners.map((o) => o.name).join(', '),
      half: h.kind === 'half',
      focused: false,
      officeIds: owners.map((o) => o.id),
    });
  }
  const monthName = new Intl.DateTimeFormat(lang, { month: 'long', timeZone: 'UTC' });
  const months: HolidaysModel['months'] = [];
  for (const { officeIds, ...item } of merged.values()) {
    item.focused = !!focus && focus.date === item.date && officeIds.includes(focus.officeId);
    const [y, m] = item.date.split('-').map(Number) as [number, number];
    const title = monthName.format(Date.UTC(y, m - 1, 1));
    const last = months.at(-1);
    if (last?.title === title) last.items.push(item);
    else months.push({ title, items: [item] });
  }
  return { months, noCalendar: offices.filter((o) => !o.holidayCalendar).map((o) => o.name) };
}
