import type {
  CivilDate,
  CivilDateTime,
  Disambiguation,
  Instant,
  Resolution,
  Weekday,
  ZonedFields,
  ZoneId,
} from './types';

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FIXED = /^UTC(?:([+−-])(\d{1,2})(?::?(\d{2}))?)?$/;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatters.set(zone, f);
  }
  return f;
}

/** Minutes east of UTC for a fixed-offset zone id, or null for anything else. */
export function parseFixedOffset(zone: string): number | null {
  const m = FIXED.exec(zone);
  if (!m) return null;
  if (!m[1]) return 0;
  const hours = Number(m[2]);
  const mins = Number(m[3] ?? 0);
  if (hours > 14 || mins > 59) return null;
  const minutes = hours * 60 + mins;
  return m[1] === '+' ? minutes : -minutes;
}

export function isValidZone(zone: string): boolean {
  if (parseFixedOffset(zone) !== null) return true;
  try {
    formatterFor(zone);
    return true;
  } catch {
    return false;
  }
}

function fromShiftedUtc(shifted: number, offset: number): ZonedFields {
  const d = new Date(shifted);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay() as Weekday,
    offsetMinutes: offset,
  };
}

export function zonedFields(instant: Instant, zone: ZoneId): ZonedFields {
  const fixed = parseFixedOffset(zone);
  if (fixed !== null) return fromShiftedUtc(instant + fixed * 60_000, fixed);
  const parts: Record<string, string> = {};
  for (const p of formatterFor(zone).formatToParts(new Date(instant))) parts[p.type] = p.value;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  const wallMs = Date.UTC(year, month - 1, day, hour, minute, second);
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday: WEEKDAYS.indexOf(parts.weekday ?? '') as Weekday,
    offsetMinutes: Math.round((wallMs - Math.floor(instant / 1000) * 1000) / 60_000),
  };
}

export function offsetMinutes(instant: Instant, zone: ZoneId): number {
  return zonedFields(instant, zone).offsetMinutes;
}

export function civilDate(instant: Instant, zone: ZoneId): CivilDate {
  const f = zonedFields(instant, zone);
  return { year: f.year, month: f.month, day: f.day };
}

function sameWallTime(f: CivilDateTime, c: CivilDateTime): boolean {
  return (
    f.year === c.year &&
    f.month === c.month &&
    f.day === c.day &&
    f.hour === c.hour &&
    f.minute === c.minute &&
    f.second === c.second
  );
}

/**
 * Converts a wall-clock time in a zone to an instant, classifying DST gaps and overlaps.
 * `compatible` matches Temporal: gaps shift forward, overlaps take the earlier instant.
 */
export function toInstant(
  civil: CivilDateTime,
  zone: ZoneId,
  disambiguation: Disambiguation = 'compatible',
): Resolution {
  const g = Date.UTC(
    civil.year,
    civil.month - 1,
    civil.day,
    civil.hour,
    civil.minute,
    civil.second,
  );
  const before = offsetMinutes(g - DAY_MS, zone);
  const after = offsetMinutes(g + DAY_MS, zone);
  const a = g - before * 60_000;
  const b = g - after * 60_000;
  const aValid = sameWallTime(zonedFields(a, zone), civil);
  const bValid = sameWallTime(zonedFields(b, zone), civil);

  if (aValid && bValid && a !== b) {
    if (disambiguation === 'reject') throw new RangeError('Ambiguous local time (DST overlap)');
    const earlier = Math.min(a, b);
    const later = Math.max(a, b);
    return {
      instant: disambiguation === 'later' ? later : earlier,
      kind: 'overlap',
      earlier,
      later,
    };
  }
  if (aValid || bValid) {
    const t = aValid ? a : b;
    return { instant: t, kind: 'exact', earlier: t, later: t };
  }
  if (disambiguation === 'reject') throw new RangeError('Nonexistent local time (DST gap)');
  return { instant: disambiguation === 'earlier' ? b : a, kind: 'gap', earlier: b, later: a };
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

const midnight = (d: CivilDate): CivilDateTime => ({ ...d, hour: 0, minute: 0, second: 0 });

export function startOfDay(
  date: CivilDate,
  zone: ZoneId,
): { start: Instant; end: Instant; lengthMs: number } {
  const start = toInstant(midnight(date), zone).instant;
  const end = toInstant(midnight(addDays(date, 1)), zone).instant;
  return { start, end, lengthMs: end - start };
}
