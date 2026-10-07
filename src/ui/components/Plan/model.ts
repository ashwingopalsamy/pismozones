import type { Office, OfficeId } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import type { PlanResult } from '@core/plan/overlap';
import { formatClock, formatShortDate, type HourCycle } from '@core/time/format';
import { relativeDay } from '@core/time/relative';
import type { Instant } from '@core/time/types';
import { toInstant, zonedFields } from '@core/time/zoned';
import { type WorkKind, workState } from '@core/work/policy';
import { translate } from '../../i18n';

export interface PlanViewModel {
  dayTitle: string;
  best: { label: string; outside: string | null; start: Instant; working: number } | null;
  rows: Array<{ id: OfficeId; name: string; at: string; kind: WorkKind; cells: WorkKind[] }>;
  axis: Array<{ pct: number; label: string }>;
  band: { leftPct: number; widthPct: number } | null;
  cursorPct: number | null;
  noCalendar: string[];
}

const clock = (t: Instant, zone: string, hc: HourCycle) => {
  const c = formatClock(zonedFields(t, zone), hc);
  return c.period ? `${c.hm} ${c.period}` : c.hm;
};

export function planViewModel(
  plan: PlanResult,
  offices: readonly Office[],
  ref: Office,
  moment: Instant,
  hc: HourCycle,
  lang: Lang,
  viewerZone: string,
  now: Instant,
): PlanViewModel {
  const { start, end } = plan.day;
  const length = end - start;
  const date = zonedFields(start, ref.zone);
  const rel = relativeDay(date, zonedFields(now, viewerZone));
  const n = plan.slots.length;

  const best = plan.best
    ? (() => {
        const b = plan.best;
        const from = (plan.slots[b.startIndex] as (typeof plan.slots)[number]).start;
        const to = (plan.slots[b.endIndex - 1] as (typeof plan.slots)[number]).end;
        const names = b.outside.map(
          (o) => offices.find((x) => x.id === o.officeId)?.name ?? o.officeId,
        );
        return {
          label: translate(lang, 'plan.best', {
            range: `${clock(from, ref.zone, hc)}–${clock(to, ref.zone, hc)}`,
            n: b.working,
            total: offices.length,
          }),
          outside: names.length
            ? translate(lang, 'plan.outside', { names: names.join(', ') })
            : null,
          start: from,
          working: b.working,
        };
      })()
    : null;

  const axis = [0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
    const t = toInstant({ ...date, hour: h, minute: 0, second: 0 }, ref.zone).instant;
    const label =
      hc === 'h23' ? String(h).padStart(2, '0') : `${((h + 11) % 12) + 1}${h < 12 ? 'a' : 'p'}`;
    return { pct: ((t - start) / length) * 100, label };
  });

  return {
    dayTitle: `${rel ? `${translate(lang, `day.${rel}`)}, ` : ''}${formatShortDate(date, lang)}`,
    best,
    rows: offices.map((o, k) => ({
      id: o.id,
      name: o.name,
      at: clock(moment, o.zone, hc),
      kind: workState(moment, o).kind,
      cells: plan.slots.map((s) => s.states[k] as WorkKind),
    })),
    axis,
    band: plan.best
      ? {
          leftPct: (plan.best.startIndex / n) * 100,
          widthPct: ((plan.best.endIndex - plan.best.startIndex) / n) * 100,
        }
      : null,
    cursorPct: moment >= start && moment < end ? ((moment - start) / length) * 100 : null,
    noCalendar: offices.filter((o) => !o.holidayCalendar).map((o) => o.name),
  };
}
