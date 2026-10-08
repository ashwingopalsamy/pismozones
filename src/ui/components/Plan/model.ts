import type { Office, OfficeId } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import type { PlanResult } from '@core/plan/overlap';
import { type Attendance, suggestSlots } from '@core/plan/suggest';
import { formatClock, formatShortDate, type HourCycle } from '@core/time/format';
import { dayDelta, relativeDay } from '@core/time/relative';
import type { Instant } from '@core/time/types';
import { zonedFields } from '@core/time/zoned';
import { type WorkKind, workState } from '@core/work/policy';
import type { Mode } from '@state/moment';
import { translate } from '../../i18n';

const HOUR = 3_600_000;

/** A row's label for one reference hour: its local hour, a small ":30" for half-hour zones, or the date at local midnight. */
export interface HourLabel {
  text: string;
  /** 12-hour suffix ("a" / "p"), rendered after the minutes. */
  suffix: string | null;
  /** Work state at the start of this hour (labels on working hours render light-on-dark). */
  kind: WorkKind;
  sub: string | null;
  /** True when this cell starts a new local day (text is then the short date). */
  day: boolean;
}

export interface PlanRow {
  id: OfficeId;
  name: string;
  country: string;
  /** City colour for its bars. */
  hue: string;
  /** Work hours, e.g. "09–18". */
  hours: string;
  /** Local time at the selected moment, with the weekday when it differs from the reference day. */
  at: string;
  kind: WorkKind;
  labels: HourLabel[];
  /** Contiguous work-state runs as fractions of the reference day; 'off' is left empty. */
  segments: Array<{ kind: Exclude<WorkKind, 'off'>; from: number; to: number }>;
}

export interface PlanViewModel {
  dayTitle: string;
  /** Hours in the reference city's day: 23, 24 or 25. */
  hours: number;
  rows: PlanRow[];
  /** The hour column holding the selected moment, with its pill label. */
  selected: { column: number; label: string } | null;
  best: {
    start: Instant;
    working: number;
    head: string;
    from: number;
    to: number;
    perCity: Array<{ id: OfficeId; name: string; range: string; outside: boolean }>;
  } | null;
  noCalendar: string[];
}

const clock = (t: Instant, zone: string, hc: HourCycle) => {
  const c = formatClock(zonedFields(t, zone), hc);
  return c.period ? `${c.hm} ${c.period}` : c.hm;
};

const hourText = (hour: number, hc: HourCycle) =>
  hc === 'h23' ? String(hour) : String(((hour + 11) % 12) + 1);
const suffixFor = (hour: number, hc: HourCycle) => (hc === 'h23' ? null : hour < 12 ? 'a' : 'p');

export function planViewModel(
  plan: PlanResult,
  offices: readonly Office[],
  ref: Office,
  moment: Instant,
  mode: Mode,
  hc: HourCycle,
  lang: Lang,
  viewerZone: string,
  now: Instant,
): PlanViewModel {
  const { start, end } = plan.day;
  const length = end - start;
  const refDate = zonedFields(start, ref.zone);
  const rel = relativeDay(refDate, zonedFields(now, viewerZone));
  const hours = Math.round(length / HOUR);
  const n = plan.slots.length;

  const rows = offices.map((o, k): PlanRow => {
    const labels: HourLabel[] = [];
    for (let i = 0; i < hours; i++) {
      const f = zonedFields(start + i * HOUR, o.zone);
      const kind = (plan.slots[i * 2]?.states[k] ?? 'off') as WorkKind;
      const midnight = f.hour === 0 && f.minute === 0;
      labels.push(
        midnight
          ? {
              text: formatShortDate(f, lang).split(' ').slice(0, 2).join(' '),
              suffix: null,
              kind,
              sub: null,
              day: true,
            }
          : {
              text: hourText(f.hour, hc),
              suffix: suffixFor(f.hour, hc),
              kind,
              sub: f.minute ? `:${String(f.minute).padStart(2, '0')}` : null,
              day: false,
            },
      );
    }
    const segments: PlanRow['segments'] = [];
    for (let i = 0; i < n; ) {
      const kind = plan.slots[i]?.states[k] as WorkKind;
      let j = i + 1;
      while (j < n && plan.slots[j]?.states[k] === kind) j++;
      if (kind !== 'off') segments.push({ kind, from: i / n, to: j / n });
      i = j;
    }
    const at = zonedFields(moment, o.zone);
    const otherDay = dayDelta(at, zonedFields(moment, ref.zone)) !== 0;
    return {
      id: o.id,
      name: o.name,
      country: o.country,
      hue: o.hue,
      hours: `${String(Math.floor(o.workHours.start / 60)).padStart(2, '0')}–${String(Math.floor(o.workHours.end / 60)).padStart(2, '0')}`,
      at: `${clock(moment, o.zone, hc)}${otherDay ? ` · ${formatShortDate(at, lang).split(' ')[0]}` : ''}`,
      kind: workState(moment, o).kind,
      labels,
      segments,
    };
  });

  const selected =
    moment >= start && moment < end
      ? {
          column: Math.min(hours - 1, Math.floor((moment - start) / HOUR)),
          label: translate(
            lang,
            mode === 'live'
              ? 'plan.sel.now'
              : mode === 'preview'
                ? 'plan.sel.preview'
                : 'plan.sel.pinned',
            { time: clock(moment, ref.zone, hc) },
          ),
        }
      : null;

  const best = plan.best
    ? (() => {
        const b = plan.best;
        const from = (plan.slots[b.startIndex] as (typeof plan.slots)[number]).start;
        const to = (plan.slots[b.endIndex - 1] as (typeof plan.slots)[number]).end;
        const outside = new Set(b.outside.map((x) => x.officeId));
        return {
          start: from,
          working: b.working,
          head: translate(lang, 'plan.bestHead', { n: b.working, total: offices.length }),
          from: b.startIndex / n,
          to: b.endIndex / n,
          perCity: offices.map((o) => ({
            id: o.id,
            name: o.name,
            range: `${clock(from, o.zone, hc)}–${clock(to, o.zone, hc)}`,
            outside: outside.has(o.id),
          })),
        };
      })()
    : null;

  return {
    dayTitle: `${rel ? `${translate(lang, `day.${rel}`)}, ` : ''}${formatShortDate(refDate, lang)}`,
    hours,
    rows,
    selected,
    best,
    noCalendar: offices.filter((o) => !o.holidayCalendar).map((o) => o.name),
  };
}

export interface SuggestionView {
  startIndex: number;
  endIndex: number;
  start: Instant;
  inHours: number;
  best: boolean;
  /** In the reference city's time. */
  range: string;
  /** Left / width of the window as fractions of the day. */
  from: number;
  to: number;
  people: Array<{
    id: OfficeId;
    name: string;
    country: string;
    time: string;
    attendance: Attendance;
  }>;
}

/** Suggested meeting windows for the planner, ready to render. */
export function suggestionsView(
  plan: PlanResult,
  offices: readonly Office[],
  ref: Office,
  slotsPerMeeting: number,
  hc: HourCycle,
): SuggestionView[] {
  const n = plan.slots.length;
  const found = suggestSlots(plan, slotsPerMeeting);
  const top = Math.max(0, ...found.map((s) => s.inHours));
  let bestTaken = false;
  return found.map((s) => {
    const best = !bestTaken && s.inHours === top;
    if (best) bestTaken = true;
    return {
      startIndex: s.startIndex,
      endIndex: s.endIndex,
      start: s.start,
      inHours: s.inHours,
      best,
      range: `${clock(s.start, ref.zone, hc)}–${clock(s.end, ref.zone, hc)}`,
      from: s.startIndex / n,
      to: s.endIndex / n,
      people: offices.map((o, k) => ({
        id: o.id,
        name: o.name,
        country: o.country,
        time: clock(s.start, o.zone, hc),
        attendance: s.attendance[k] ?? 'out',
      })),
    };
  });
}
