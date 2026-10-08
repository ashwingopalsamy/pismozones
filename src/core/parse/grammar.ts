import { formatOffset } from '../time/format';
import { isValidZone } from '../time/zoned';
import type { Token } from './lexer';
import {
  CONJUNCTIONS,
  CONNECTORS_IN,
  CONNECTORS_TO,
  DAY_WORDS,
  DURATION_LEADS,
  FILLERS,
  FIXED_ABBR,
  FRACTION_WORDS,
  MAX_ALIAS_WORDS,
  MONTHS,
  NEXT_WORDS,
  NOON_WORDS,
  NOW_WORDS,
  PLACE_ALIASES,
  RANGE_WORDS,
  RECURRENCE,
  SEASONAL_ABBR,
  THIS_WORDS,
  UNITS,
  WEEKDAYS,
} from './lexicon';
import type { PlaceRef, Span, SpanRole } from './types';

export interface TimeTok {
  hour: number;
  minute: number;
  /** Bare or unpadded 1–12 with no meridiem: resolved with the business-hours bias. */
  biasable: boolean;
  invalid: boolean;
  start: number;
  end: number;
}

export type DateTok = { start: number; end: number; invalid?: boolean } & (
  | { kind: 'offset'; days: number }
  | { kind: 'weekday'; weekday: number; next: boolean }
  | { kind: 'monthday'; month: number; day: number; year?: number }
  | { kind: 'numeric'; parts: number[] }
  | { kind: 'iso'; year: number; month: number; day: number }
);

export interface PlaceTok {
  ref: PlaceRef;
  /** The abbreviation used, when the place came from one (lexicon key). */
  abbr?: string;
  start: number;
  end: number;
  beforeConnector: boolean;
}

export interface Analysis {
  times: TimeTok[];
  dates: DateTok[];
  duration: { minutes: number; start: number; end: number } | null;
  places: PlaceTok[];
  connector: 'to' | 'in' | null;
  tonight: boolean;
  /** "now" / "agora" was typed explicitly. */
  now: boolean;
  unknown: Token[];
  recurrence: Token | null;
  /** Two times joined by a range word or dash ("9-5", "3 to 5pm"). */
  range: boolean;
  spans: Span[];
}

const isTimeLike = (t: Token | undefined) =>
  !!t && (t.kind === 'number' || t.kind === 'clock' || t.kind === 'meridiem' || t.kind === 'hmark');

function makeTime(
  h: number,
  m: number,
  meridiem: string | null,
  form: { padded?: boolean; hmark?: boolean; hasMinutes?: boolean; hhmm?: boolean },
  start: number,
  end: number,
): TimeTok {
  if (meridiem) {
    const invalid = h < 1 || h > 12 || m > 59;
    return {
      hour: (h % 12) + (meridiem === 'pm' ? 12 : 0),
      minute: m,
      biasable: false,
      invalid,
      start,
      end,
    };
  }
  const invalid = h > 23 || m > 59;
  const explicit = form.hmark || form.hhmm || form.padded || h === 0 || h >= 13;
  return { hour: h, minute: m, biasable: !explicit && !invalid, invalid, start, end };
}

export function analyse(tokens: Token[]): Analysis {
  const a: Analysis = {
    times: [],
    dates: [],
    duration: null,
    places: [],
    connector: null,
    tonight: false,
    now: false,
    unknown: [],
    recurrence: null,
    range: false,
    spans: [],
  };
  let seenConnector = false;
  const span = (start: number, end: number, role: SpanRole) => a.spans.push({ start, end, role });
  const markConnector = (kind: 'to' | 'in') => {
    if (!a.connector) a.connector = kind;
    seenConnector = true;
  };
  const place = (ref: PlaceRef, start: number, end: number, abbr?: string) => {
    const p: PlaceTok = { ref, start, end, beforeConnector: !seenConnector };
    if (abbr) p.abbr = abbr;
    a.places.push(p);
    span(start, end, 'place');
  };

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i] as Token;
    const next = tokens[i + 1];
    const prev = tokens[i - 1];

    if (t.kind === 'isodate') {
      const [year, month, day] = t.value as [number, number, number];
      a.dates.push({ kind: 'iso', year, month, day, start: t.start, end: t.end });
      span(t.start, t.end, 'date');
      i++;
    } else if (t.kind === 'numdate') {
      a.dates.push({ kind: 'numeric', parts: t.value as number[], start: t.start, end: t.end });
      span(t.start, t.end, 'date');
      i++;
    } else if (t.kind === 'clock') {
      const [h, m] = t.value as [number, number];
      const mer = next?.kind === 'meridiem' ? next.text : null;
      const end = mer ? (next as Token).end : t.end;
      a.times.push(
        makeTime(
          h,
          m,
          mer,
          { padded: t.text.startsWith('0'), hasMinutes: true, hmark: t.text.includes('h') },
          t.start,
          end,
        ),
      );
      span(t.start, end, 'time');
      i += mer ? 2 : 1;
    } else if (t.kind === 'number') {
      const n = t.value as number;
      if (next?.kind === 'meridiem') {
        a.times.push(makeTime(n, 0, next.text, {}, t.start, next.end));
        span(t.start, next.end, 'time');
        i += 2;
      } else if (next?.kind === 'hmark') {
        a.times.push(makeTime(n, 0, null, { hmark: true }, t.start, next.end));
        span(t.start, next.end, 'time');
        i += 2;
      } else if (/^\d{3,4}$/.test(t.text)) {
        const invalid = t.text.length > 4;
        const time = makeTime(Math.floor(n / 100), n % 100, null, { hhmm: true }, t.start, t.end);
        a.times.push(invalid ? { ...time, invalid } : time);
        span(t.start, t.end, 'time');
        i++;
      } else if (next?.kind === 'word' && MONTHS[next.text] !== undefined) {
        const month = MONTHS[next.text] as number;
        const year = yearAt(i + 2);
        const end = year ? (tokens[i + 2] as Token).end : next.end;
        a.dates.push({
          kind: 'monthday',
          month,
          day: n,
          ...(year ? { year } : {}),
          start: t.start,
          end,
        });
        span(t.start, end, 'date');
        i += year ? 3 : 2;
      } else {
        const time = makeTime(n, 0, null, { padded: /^0\d$/.test(t.text) }, t.start, t.end);
        a.times.push(Number.isInteger(n) ? time : { ...time, invalid: true, biasable: false });
        span(t.start, t.end, 'time');
        i++;
      }
    } else if (t.kind === 'offset' && Number.isNaN(t.value)) {
      a.unknown.push(t);
      span(t.start, t.end, 'unknown');
      i++;
    } else if (t.kind === 'offset') {
      const label = formatOffset(t.value as number);
      place({ kind: 'zone', zone: label, label }, t.start, t.end);
      i++;
    } else if (t.kind === 'arrow') {
      markConnector('to');
      span(t.start, t.end, 'connector');
      i++;
    } else if (t.kind === 'comma' || t.kind === 'amp') {
      span(t.start, t.end, 'connector');
      i++;
    } else if (t.kind === 'dash') {
      if (isTimeLike(prev) && isTimeLike(next)) a.range = true;
      span(t.start, t.end, 'connector');
      i++;
    } else if (t.kind === 'punct') {
      span(t.start, t.end, 'filler');
      i++;
    } else if (t.kind === 'meridiem' || t.kind === 'hmark') {
      a.unknown.push(t);
      span(t.start, t.end, 'unknown');
      i++;
    } else {
      i = word(i);
    }
  }
  return a;

  /** A 4-digit year token at index k ("12 oct 2026"), if any. */
  function yearAt(k: number): number | undefined {
    const y = tokens[k];
    return y?.kind === 'number' && /^\d{4}$/.test(y.text) ? (y.value as number) : undefined;
  }

  /** Handles a word token (possibly with lookahead); returns the next index. */
  function word(i: number): number {
    const t = tokens[i] as Token;
    const w = t.text;
    const next = tokens[i + 1];
    const prev = tokens[i - 1];

    if (RECURRENCE.has(w)) {
      a.recurrence = t;
      span(t.start, t.end, 'date');
      return i + 1;
    }

    // Durations: "in 2 hours", "em 30 min", "daqui a 2 horas".
    const lead = w === 'daqui' && next?.text === 'a' ? 2 : DURATION_LEADS.has(w) ? 1 : 0;
    const num = tokens[i + lead];
    const unit = tokens[i + lead + 1];
    if (lead && num?.kind === 'clock' && num.text.includes('h')) {
      const [h, m] = num.value as [number, number];
      a.duration = { minutes: h * 60 + m, start: t.start, end: num.end };
      span(t.start, num.end, 'duration');
      return i + lead + 1;
    }
    if (
      lead &&
      num?.kind === 'number' &&
      unit &&
      (unit.kind === 'hmark' || UNITS[unit.text] !== undefined)
    ) {
      const per = unit.kind === 'hmark' ? 60 : (UNITS[unit.text] as number);
      a.duration = {
        minutes: Math.round((num.value as number) * per),
        start: t.start,
        end: unit.end,
      };
      span(t.start, unit.end, 'duration');
      return i + lead + 2;
    }

    if (NOW_WORDS.has(w)) {
      a.now = true;
      span(t.start, t.end, 'time');
      return i + 1;
    }

    // "half past 3", "quarter past 3", "quarter to 3"
    const fraction = FRACTION_WORDS[w];
    const hourTok = tokens[i + 2];
    if (
      fraction !== undefined &&
      (next?.text === 'past' || next?.text === 'to') &&
      hourTok?.kind === 'number' &&
      Number.isInteger(hourTok.value) &&
      (hourTok.value as number) >= 1 &&
      (hourTok.value as number) <= 12
    ) {
      const h = hourTok.value as number;
      const past = next.text === 'past';
      const time = makeTime(
        past ? h : h === 1 ? 12 : h - 1,
        past ? fraction : 60 - fraction,
        null,
        {},
        t.start,
        hourTok.end,
      );
      a.times.push({ ...time, biasable: true });
      span(t.start, hourTok.end, 'time');
      return i + 3;
    }

    for (let k = MAX_ALIAS_WORDS; k >= 1; k--) {
      const group = tokens.slice(i, i + k);
      if (group.length < k || group.some((g) => g.kind !== 'word')) continue;
      const ref = PLACE_ALIASES.get(group.map((g) => g.text).join(' '));
      if (ref) {
        place(ref, t.start, (group[k - 1] as Token).end);
        return i + k;
      }
    }

    const fixed = FIXED_ABBR[w];
    if (fixed) {
      place(fixed.place, t.start, t.end, w);
      return i + 1;
    }
    const seasonal = SEASONAL_ABBR[w];
    if (seasonal) {
      const ref: PlaceRef = seasonal.office
        ? { kind: 'office', id: seasonal.office }
        : { kind: 'zone', zone: seasonal.zone, label: seasonal.label };
      place(ref, t.start, t.end, w);
      return i + 1;
    }

    const day = DAY_WORDS[w];
    if (day) {
      if (day.tonight) a.tonight = true;
      a.dates.push({ kind: 'offset', days: day.offset, start: t.start, end: t.end });
      span(t.start, t.end, 'date');
      return i + 1;
    }

    if ((NEXT_WORDS.has(w) || THIS_WORDS.has(w)) && next && WEEKDAYS[next.text] !== undefined) {
      const weekday = WEEKDAYS[next.text] as number;
      a.dates.push({
        kind: 'weekday',
        weekday,
        next: NEXT_WORDS.has(w),
        start: t.start,
        end: next.end,
      });
      span(t.start, next.end, 'date');
      return i + 2;
    }
    if (WEEKDAYS[w] !== undefined) {
      a.dates.push({
        kind: 'weekday',
        weekday: WEEKDAYS[w] as number,
        next: false,
        start: t.start,
        end: t.end,
      });
      span(t.start, t.end, 'date');
      return i + 1;
    }

    if (MONTHS[w] !== undefined && next?.kind === 'number' && next.text.length <= 2) {
      const year = yearAt(i + 2);
      const end = year ? (tokens[i + 2] as Token).end : next.end;
      a.dates.push({
        kind: 'monthday',
        month: MONTHS[w] as number,
        day: next.value as number,
        ...(year ? { year } : {}),
        start: t.start,
        end,
      });
      span(t.start, end, 'date');
      return year ? i + 3 : i + 2;
    }

    if (NOON_WORDS[w] !== undefined) {
      a.times.push({
        hour: NOON_WORDS[w] as number,
        minute: 0,
        biasable: false,
        invalid: false,
        start: t.start,
        end: t.end,
      });
      span(t.start, t.end, 'time');
      return i + 1;
    }

    if (CONNECTORS_TO.has(w) || RANGE_WORDS.has(w)) {
      if (isTimeLike(prev) && (next?.kind === 'number' || next?.kind === 'clock')) a.range = true;
      else if (CONNECTORS_TO.has(w)) markConnector('to');
      span(t.start, t.end, 'connector');
      return i + 1;
    }
    if (CONNECTORS_IN.has(w)) {
      markConnector('in');
      span(t.start, t.end, 'connector');
      return i + 1;
    }
    if (CONJUNCTIONS.has(w)) {
      span(t.start, t.end, 'connector');
      return i + 1;
    }
    if (FILLERS.has(w)) {
      span(t.start, t.end, 'filler');
      return i + 1;
    }

    if (w.includes('/') && isValidZone(w)) {
      const label = (w.split('/').pop() ?? w)
        .replace(/_/g, ' ')
        .replace(/\b\p{L}/gu, (c) => c.toUpperCase());
      place({ kind: 'zone', zone: w, label }, t.start, t.end);
      return i + 1;
    }

    a.unknown.push(t);
    span(t.start, t.end, 'unknown');
    return i + 1;
  }
}
