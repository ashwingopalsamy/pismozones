import type { CivilDate } from '../../time/types';
import { addDays } from '../../time/zoned';
import { easterSunday } from './easter';
import type { CalendarDef, Holiday, Rule } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: CivilDate) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;
const weekday = (d: CivilDate) => new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();

function nthWeekday(year: number, month: number, wd: number, n: number): CivilDate {
  if (n > 0) {
    const first = weekday({ year, month, day: 1 });
    return { year, month, day: 1 + ((wd - first + 7) % 7) + (n - 1) * 7 };
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = weekday({ year, month, day: lastDay });
  return { year, month, day: lastDay - ((last - wd + 7) % 7) };
}

const suffix = (h: Holiday, en: string, pt: string): Holiday['name'] => ({
  en: `${h.name.en} (${en})`,
  pt: `${h.name.pt} (${pt})`,
});

/** Every holiday a calendar produces for one year, before observance shifts. */
function raw(
  rules: readonly Rule[],
  year: number,
): Array<Holiday & { observe?: 'us' | 'substitute' }> {
  const out: Array<Holiday & { observe?: 'us' | 'substitute' }> = [];
  for (const r of rules) {
    if (r.type === 'list') {
      for (const e of r.entries) if (e.date.startsWith(`${year}-`)) out.push(e);
      continue;
    }
    const date =
      r.type === 'fixed'
        ? { year, month: r.month, day: r.day }
        : r.type === 'nth'
          ? nthWeekday(year, r.month, r.weekday, r.n)
          : addDays(easterSunday(year), r.offset);
    const h: Holiday & { observe?: 'us' | 'substitute' } = {
      date: iso(date),
      name: r.name,
      kind: r.kind ?? 'full',
    };
    if (r.type === 'fixed' && r.observe) h.observe = r.observe;
    if (r.type === 'easter' && r.hours) h.hours = r.hours;
    out.push(h);
  }
  return out;
}

/** Holidays dated within `year`, including observed/substitute days that cross year ends. */
export function compute(def: CalendarDef, year: number): Holiday[] {
  const base = [year - 1, year, year + 1].flatMap((y) => raw(def.rules, y));
  base.sort((a, b) => a.date.localeCompare(b.date));
  const taken = new Set(base.map((h) => h.date));
  const out: Holiday[] = [];
  for (const h of base) {
    const { observe: _observe, ...holiday } = h;
    out.push(holiday);
    if (!h.observe) continue;
    const [y, m, d] = h.date.split('-').map(Number) as [number, number, number];
    const date = { year: y, month: m, day: d };
    const wd = weekday(date);
    if (wd !== 0 && wd !== 6) continue;
    if (h.observe === 'us') {
      const shifted = iso(addDays(date, wd === 6 ? -1 : 1));
      out.push({ date: shifted, name: suffix(h, 'observed', 'observado'), kind: h.kind });
      taken.add(shifted);
    } else {
      let next = addDays(date, 1);
      while (weekday(next) === 0 || weekday(next) === 6 || taken.has(iso(next)))
        next = addDays(next, 1);
      out.push({
        date: iso(next),
        name: suffix(h, 'substitute day', 'dia substituto'),
        kind: h.kind,
      });
      taken.add(iso(next));
    }
  }
  return out
    .filter((h) => h.date.startsWith(`${year}-`))
    .sort((a, b) => a.date.localeCompare(b.date));
}
