import { getOffice } from '../cities/registry';
import { formatOffset } from '../time/format';
import { dayDelta } from '../time/relative';
import type { CivilDate } from '../time/types';
import { addDays, offsetMinutes, toInstant, zonedFields } from '../time/zoned';
import type { Analysis, DateTok, TimeTok } from './grammar';
import type { Notice, ParseContext, ParseResult, PlaceRef } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

export function dateOrderFor(locale: string): 'DMY' | 'MDY' {
  return /^en-US$/i.test(locale) ? 'MDY' : 'DMY';
}

export function zoneOf(ref: PlaceRef): string {
  return ref.kind === 'zone' ? ref.zone : (getOffice(ref.id)?.zone ?? 'UTC');
}

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const validDate = (d: CivilDate) =>
  d.month >= 1 && d.month <= 12 && d.day >= 1 && d.day <= daysIn(d.year, d.month);

/** Nearest occurrence of a month/day to the base date (within ±182 days). */
function nearest(month: number, day: number, base: CivilDate): CivilDate {
  const candidates = [base.year - 1, base.year, base.year + 1].map((year) => ({
    year,
    month,
    day,
  }));
  return candidates.reduce((best, c) =>
    Math.abs(dayDelta(c, base)) < Math.abs(dayDelta(best, base)) ? c : best,
  );
}

/** Resolves a date token against the source zone's "today"; null when the date is invalid. */
export function resolveDate(
  d: DateTok,
  base: CivilDate & { weekday: number },
  locale: string,
): CivilDate | null {
  switch (d.kind) {
    case 'offset':
      return addDays(base, d.days);
    case 'weekday': {
      let delta = (d.weekday - base.weekday + 7) % 7;
      if (d.next && delta === 0) delta = 7;
      return addDays(base, delta);
    }
    case 'iso': {
      const c = { year: d.year, month: d.month, day: d.day };
      return validDate(c) ? c : null;
    }
    case 'monthday': {
      if (d.month < 1 || d.month > 12 || d.day < 1 || d.day > daysIn(2024, d.month)) return null;
      const c = nearest(d.month, d.day, base);
      return validDate(c) ? c : null;
    }
    case 'numeric': {
      const [a = 0, b = 0, c] = d.parts;
      const [day, month] = dateOrderFor(locale) === 'MDY' ? [b, a] : [a, b];
      if (c !== undefined) {
        const year = c < 100 ? 2000 + c : c;
        const date = { year, month, day };
        return validDate(date) ? date : null;
      }
      if (month < 1 || month > 12 || day < 1 || day > daysIn(2024, month)) return null;
      const n = nearest(month, day, base);
      return validDate(n) ? n : null;
    }
  }
}

/** Applies the business-hours bias (spec D9). Returns the hour and an extra day for "tonight 12". */
export function biasHour(t: TimeTok, tonight: boolean): { hour: number; extraDay: number } {
  if (!t.biasable) return { hour: t.hour, extraDay: 0 };
  const h = t.hour;
  if (tonight) return h === 12 ? { hour: 0, extraDay: 1 } : { hour: h + 12, extraDay: 0 };
  if (h >= 7 && h <= 11) return { hour: h, extraDay: 0 };
  if (h === 12) return { hour: 12, extraDay: 0 };
  return { hour: h + 12, extraDay: 0 };
}

const replaceSpan = (input: string, start: number, end: number, text: string) =>
  input.slice(0, start) + text + input.slice(end);

/** Builds the ok result for an analysis that diagnose() has already accepted. */
export function resolve(a: Analysis, ctx: ParseContext, input: string): ParseResult {
  const notices: Notice[] = [];
  const before = a.places.filter((p) => p.beforeConnector);
  const after = a.places.filter((p) => !p.beforeConnector);
  let source = before[0];
  let destinations = [...before.slice(1), ...after];
  if (!source && a.connector === 'in' && after.length) {
    source = after[0];
    destinations = after.slice(1);
  }
  const implicitSource = !source;
  const sourceRef: PlaceRef = source?.ref ?? { kind: 'office', id: ctx.referenceId };
  const zone = zoneOf(sourceRef);
  const isNow = a.times.length === 0 && a.dates.length === 0 && !a.duration;

  let instant = ctx.now;
  let resolution: 'exact' | 'gap' | 'overlap' = 'exact';
  const time = a.times[0];
  if (a.duration) {
    instant = ctx.now + a.duration.minutes * 60_000;
  } else if (time) {
    const base = zonedFields(ctx.now, zone);
    const date = a.dates[0] ? resolveDate(a.dates[0], base, ctx.locale) : base;
    const { hour, extraDay } = biasHour(time, a.tonight);
    const day = addDays(date ?? base, extraDay);
    const r = toInstant({ ...day, hour, minute: time.minute, second: 0 }, zone);
    instant = r.instant;
    resolution = r.kind;
    if (time.biasable) {
      const opposite = hour >= 12 ? hour - 12 : hour + 12;
      notices.push({
        code: 'hour_bias',
        params: { hour },
        alternative: {
          query: replaceSpan(input, time.start, time.end, hhmm(opposite % 24, time.minute)),
          display: { kind: 'clock', hour: opposite % 24, minute: time.minute },
        },
      });
    }
    if (r.kind === 'gap') {
      const earlier = zonedFields(r.earlier, zone);
      const shown = zonedFields(r.instant, zone);
      notices.push({
        code: 'dst_gap',
        params: { time: hhmm(hour, time.minute), shown: hhmm(shown.hour, shown.minute) },
        alternative: {
          query: replaceSpan(input, time.start, time.end, hhmm(earlier.hour, earlier.minute)),
          display: { kind: 'clock', hour: earlier.hour, minute: earlier.minute },
        },
      });
    } else if (r.kind === 'overlap') {
      const label = formatOffset(offsetMinutes(r.later, zone));
      const query = source
        ? replaceSpan(input, source.start, source.end, label.toLowerCase()) +
          (destinations.length ? '' : ` to ${input.slice(source.start, source.end)}`)
        : `${input.trimEnd()} ${label.toLowerCase()}`;
      notices.push({
        code: 'dst_overlap',
        params: { time: hhmm(hour, time.minute) },
        alternative: { query, display: { kind: 'text', text: label } },
      });
    }
  }

  if (implicitSource)
    notices.splice(time?.biasable ? 1 : 0, 0, {
      code: 'implicit_source',
      params: { officeId: ctx.referenceId },
    });
  if (a.places.some((p) => p.abbr === 'ist')) {
    const at = notices.findIndex((n) => n.code === 'dst_gap' || n.code === 'dst_overlap');
    notices.splice(at < 0 ? notices.length : at, 0, { code: 'ist_is_india' });
  }

  return {
    status: 'ok',
    intent: {
      instant,
      isNow,
      source: sourceRef,
      destinations: destinations.map((p) => p.ref),
      implicitSource,
      resolution,
    },
    spans: a.spans,
    notices,
  };
}
