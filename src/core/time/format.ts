import type { Lang } from '../i18n';
import type { CivilDate, Weekday } from './types';

export type HourCycle = 'h12' | 'h23';

const pad = (n: number) => String(n).padStart(2, '0');

const WEEKDAYS: Record<Lang, readonly string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  'pt-BR': ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
};
const MONTHS: Record<Lang, readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  'pt-BR': ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
};

export function resolveHourCycle(pref: 'auto' | HourCycle, locale: string): HourCycle {
  if (pref !== 'auto') return pref;
  const hc = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return hc === 'h11' || hc === 'h12' ? 'h12' : 'h23';
}

export function formatClock(
  f: { hour: number; minute: number },
  hc: HourCycle,
): { hm: string; period: '' | 'AM' | 'PM' } {
  if (hc === 'h23') return { hm: `${pad(f.hour)}:${pad(f.minute)}`, period: '' };
  return { hm: `${((f.hour + 11) % 12) + 1}:${pad(f.minute)}`, period: f.hour < 12 ? 'AM' : 'PM' };
}

export function formatOffset(minutes: number): string {
  const abs = Math.abs(minutes);
  const m = abs % 60;
  return `UTC${minutes < 0 ? '−' : '+'}${Math.floor(abs / 60)}${m ? `:${pad(m)}` : ''}`;
}

export function formatShortDate(d: CivilDate & { weekday: Weekday }, lang: Lang): string {
  return `${WEEKDAYS[lang][d.weekday]} ${d.day} ${MONTHS[lang][d.month - 1]}`;
}
