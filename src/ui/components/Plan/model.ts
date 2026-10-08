import type { Office, OfficeId } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import type { PlanResult } from '@core/plan/overlap';
import { formatClock, formatShortDate, type HourCycle } from '@core/time/format';
import { dayDelta, relativeDay } from '@core/time/relative';
import type { Instant } from '@core/time/types';
import { zonedFields } from '@core/time/zoned';
import { type WorkKind, workState } from '@core/work/policy';
import type { Mode } from '@state/moment';
import { translate } from '../../i18n';

const HOUR = 3_600_000;
const SLOT = 1_800_000;

export interface PlanCell {
  /** The row's local time at the column start: "9", "5:30", or "9a" / "5:30p". */
  label: string;
  /** Work state of each half hour; one entry when both halves agree. */
  kinds: [WorkKind] | [WorkKind, WorkKind];
  /** Marks where the row's local date differs from the reference date (first cell of a run). */
  dayMark: '+1' | '−1' | null;
}

export interface PlanViewModel {
  dayTitle: string;
  /** One per hour of the reference city's day: 23, 24 or 25. */
  columns: Array<{ start: Instant }>;
  rows: Array<{ id: OfficeId; name: string; hours: string; at: string; kind: WorkKind; cells: PlanCell[] }>;
  selected: { column: number; label: string } | null;
  best: {
    start: Instant;
    working: number;
    head: string;
    /** [first, last) column indexes covered by the window. */
    columns: [number, number];
    perCity: Array<{ id: OfficeId; text: string }>;
  } | null;
  noCalendar: string[];
}

const clock = (t: Instant, zone: string, hc: HourCycle) => {
  const c = formatClock(zonedFields(t, zone), hc);
  return c.period ? `${c.hm} ${c.period}` : c.hm;
};

const minutesLabel = (m: number, hc: HourCycle) => {
  const c = formatClock({ hour: Math.floor(m / 60), minute: m % 60 }, hc);
  return c.period ? `${c.hm} ${c.period}` : c.hm;
};

const cellLabel = (hour: number, minute: number, hc: HourCycle) => {
  const mm = minute ? `:${String(minute).padStart(2, '0')}` : '';
  if (hc === 'h23') return `${hour}${mm}`;
  return `${((hour + 11) % 12) + 1}${mm}${hour < 12 ? 'a' : 'p'}`;
};

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
  const refDate = zonedFields(start, ref.zone);
  const rel = relativeDay(refDate, zonedFields(now, viewerZone));

  const columns: PlanViewModel['columns'] = [];
  for (let t = start; t < end; t += HOUR) columns.push({ start: t });
  const slotAt = (t: Instant) => plan.slots[Math.floor((t - start) / SLOT)];

  const rows = offices.map((o, k) => {
    let prev = 0;
    const cells = columns.map((c): PlanCell => {
      const f = zonedFields(c.start, o.zone);
      const a = slotAt(c.start)?.states[k] ?? 'off';
      const b = slotAt(c.start + SLOT)?.states[k];
      const delta = dayDelta(f, refDate);
      const dayMark = delta !== prev && delta !== 0 ? (delta > 0 ? '+1' : '−1') : null;
      prev = delta;
      return {
        label: cellLabel(f.hour, f.minute, hc),
        kinds: b && b !== a ? [a, b] : [a],
        dayMark,
      };
    });
    return {
      id: o.id,
      name: o.name,
      hours: `${minutesLabel(o.workHours.start, hc)}–${minutesLabel(o.workHours.end, hc)}`,
      at: clock(moment, o.zone, hc),
      kind: workState(moment, o).kind,
      cells,
    };
  });

  const inDay = moment >= start && moment < end;
  const selected = inDay
    ? {
        column: Math.floor((moment - start) / HOUR),
        label: translate(lang, mode === 'live' ? 'plan.sel.now' : mode === 'preview' ? 'plan.sel.preview' : 'plan.sel.pinned', {
          time: clock(moment, ref.zone, hc),
        }),
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
          columns: [Math.floor(b.startIndex / 2), Math.ceil(b.endIndex / 2)] as [number, number],
          perCity: offices.map((o) => {
            const range = `${clock(from, o.zone, hc)}–${clock(to, o.zone, hc)}`;
            return {
              id: o.id,
              text: outside.has(o.id)
                ? translate(lang, 'plan.outsideCity', { city: o.name, range })
                : `${o.name} ${range}`,
            };
          }),
        };
      })()
    : null;

  return {
    dayTitle: `${rel ? `${translate(lang, `day.${rel}`)}, ` : ''}${formatShortDate(refDate, lang)}`,
    columns,
    rows,
    selected,
    best,
    noCalendar: offices.filter((o) => !o.holidayCalendar).map((o) => o.name),
  };
}
