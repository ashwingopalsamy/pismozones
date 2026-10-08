import { planDay } from '@core/plan/overlap';
import { formatClock } from '@core/time/format';
import { addDays, civilDate, toInstant, zonedFields } from '@core/time/zoned';
import type { WorkKind } from '@core/work/policy';
import { useRef, useState } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import type { Key } from '../../i18n';
import { Flag } from '../Flag/Flag';
import { Icon } from '../Icon';
import { planViewModel, suggestionsView } from './model';
import styles from './Plan.module.css';

const QUARTER = 900_000;
const HOUR = 3_600_000;
const LEGEND: Record<WorkKind, Key> = {
  working: 'plan.legend.working',
  early: 'plan.legend.edge',
  late: 'plan.legend.edge',
  off: 'plan.legend.off',
  weekend: 'plan.legend.weekend',
  holiday: 'plan.legend.holiday',
};
const LENGTHS: Array<{ slots: number; key: Key }> = [
  { slots: 1, key: 'plan.len.30' },
  { slots: 2, key: 'plan.len.60' },
  { slots: 3, key: 'plan.len.90' },
  { slots: 4, key: 'plan.len.120' },
];
const ATTEND: Record<'in' | 'stretch' | 'out', Key> = {
  in: 'plan.att.in',
  stretch: 'plan.att.stretch',
  out: 'plan.att.out',
};
const pct = (f: number) => `${(f * 100).toFixed(3)}%`;
/** A city's colour at ~20% over the track, for early/late hours. */
const tint = (hue: string) => `color-mix(in srgb, ${hue} 24%, transparent)`;

export function PlanView({ layout }: { layout: 'phone' | 'panel' }) {
  const app = useApp();
  const t = useT();
  const dragging = useRef(false);
  const [length, setLength] = useState(2);
  const [picked, setPicked] = useState<number | null>(null);
  const ref = app.reference.value;
  const moment = app.moment.value;
  const hc = app.prefs.hourCycle.value;
  const offices = app.displayed.value.map((d) => d.office);
  const plan = planDay(civilDate(moment, ref.zone), ref.zone, offices);
  const m = planViewModel(
    plan,
    offices,
    ref,
    moment,
    app.mode.value,
    hc,
    app.prefs.lang.value,
    app.env.viewerZone,
    app.clock.minuteNow.value,
  );
  const suggestions = suggestionsView(plan, offices, ref, length, hc);
  const chosen =
    suggestions.find((s) => s.startIndex === picked) ?? suggestions.find((s) => s.best) ?? null;
  const { start, end } = plan.day;
  const nowAt = moment >= start && moment < end ? (moment - start) / (end - start) : null;
  const axis = Array.from({ length: m.hours }, (_, i) => i)
    .filter((i) => i % 2 === 0)
    .map((i) => {
      const c = formatClock(zonedFields(start + i * HOUR, ref.zone), hc);
      return { i, label: c.period ? `${c.hm} ${c.period}` : c.hm };
    });

  const shiftDay = (days: number) => {
    const f = zonedFields(moment, ref.zone);
    const d = addDays(f, days);
    setPicked(null);
    app.pin(
      toInstant({ ...d, hour: f.hour, minute: f.minute, second: 0 }, ref.zone).instant,
      'day_nav',
    );
  };
  // Press anywhere on the timeline to pin that time; drag to scrub (15-minute steps).
  const scrubTo = (e: PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const f = rect.width ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
    const at = start + f * (end - start);
    app.scrub(Math.min(Math.round(at / QUARTER) * QUARTER, end - QUARTER));
  };

  return (
    <section
      class={`${styles.plan} ${layout === 'panel' ? styles.panel : ''}`}
      aria-label={t('plan.title')}
    >
      <div class={styles.head}>
        <h2 class={styles.title}>{t('plan.title')}</h2>
        <div class={styles.stepper}>
          <button type="button" aria-label={t('a11y.prevDay')} onClick={() => shiftDay(-1)}>
            <Icon name="chevronLeft" size={15} />
          </button>
          <span>{m.dayTitle}</span>
          <button type="button" aria-label={t('a11y.nextDay')} onClick={() => shiftDay(1)}>
            <Icon name="chevronRight" size={15} />
          </button>
        </div>
        <fieldset class={styles.lengths}>
          <legend class="sr-only">{t('plan.length')}</legend>
          {LENGTHS.map((l) => (
            <button
              key={l.slots}
              type="button"
              aria-pressed={length === l.slots}
              onClick={() => {
                setLength(l.slots);
                setPicked(null);
              }}
            >
              {t(l.key)}
            </button>
          ))}
        </fieldset>
        <span class={styles.ref}>
          {t('plan.timesIn')} <Flag country={ref.country} size={16} />
          <b>{ref.name}</b>
        </span>
      </div>

      {suggestions.length > 0 ? (
        <fieldset class={styles.suggestions}>
          <legend class="sr-only">{t('plan.suggestions')}</legend>
          {suggestions.map((s) => {
            const on = s === chosen;
            return (
              <button
                key={s.startIndex}
                type="button"
                aria-pressed={on}
                class={styles.suggestion}
                onClick={() => {
                  setPicked(s.startIndex);
                  app.pin(s.start, 'best_overlap');
                  app.track('plan_best', { working: s.inHours, total: offices.length });
                }}
              >
                <span class={styles.sugHead}>
                  {s.best && <span class={styles.bestTag}>{t('plan.bestFit')}</span>}
                  <b>{s.range}</b>
                  <span class={styles.score}>
                    {t('plan.inHours', { n: s.inHours, total: offices.length })}
                  </span>
                </span>
                <span class={styles.people}>
                  {s.people.map((p) => (
                    <span
                      key={p.id}
                      class={styles[p.attendance]}
                      title={`${p.name} · ${t(ATTEND[p.attendance])}`}
                    >
                      <Flag country={p.country} size={14} />
                      {p.time}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </fieldset>
      ) : (
        <p class={styles.none}>{t('plan.none', { date: m.dayTitle })}</p>
      )}

      <div class={styles.scroller}>
        <div class={styles.timeline} style={`--hours:${m.hours}`} aria-hidden="true">
          <span class={styles.corner} />
          <div class={styles.axis}>
            {axis.map((a) => (
              <span key={a.i} style={`left:${pct((a.i + 0.5) / m.hours)}`}>
                {a.label}
              </span>
            ))}
            {nowAt !== null && m.selected && (
              <b class={styles.nowPill} style={`left:${pct(nowAt)}`}>
                {m.selected.label}
              </b>
            )}
          </div>
          {m.rows.map((r, i) => [
            <div key={`${r.id}-h`} class={styles.rowHead} style={`grid-row:${i + 2}`}>
              <Flag country={r.country} size={24} />
              <span>
                <b>{r.name}</b>
                <small>
                  {r.at} · {t('card.works', { hours: r.hours })}
                </small>
              </span>
            </div>,
            <div key={`${r.id}-t`} class={styles.track} style={`grid-row:${i + 2}`}>
              {r.segments.map((g) => (
                <i
                  key={g.from}
                  class={`${styles.seg} ${styles[g.kind]}`}
                  style={`left:${pct(g.from)};width:${pct(g.to - g.from)};--hue:${r.hue};--tint:${tint(r.hue)}`}
                />
              ))}
              <div class={styles.labels}>
                {r.labels.map((l, k) => (
                  <span
                    key={k}
                    class={`${l.day ? styles.dayMark : ''} ${l.kind === 'working' ? styles.onWork : ''}`}
                  >
                    {l.text}
                    {l.sub && <small>{l.sub}</small>}
                    {l.suffix}
                  </span>
                ))}
              </div>
            </div>,
          ])}
          <div
            class={styles.overlay}
            style={`grid-row:2 / ${m.rows.length + 2}`}
            onPointerDown={(e) => {
              try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              } catch {
                // best-effort
              }
              dragging.current = true;
              scrubTo(e);
            }}
            onPointerMove={(e) => {
              if (dragging.current) scrubTo(e);
            }}
            onPointerUp={() => {
              if (!dragging.current) return;
              dragging.current = false;
              app.endScrub('plan_drag');
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}
          >
            {chosen && (
              <i
                class={styles.band}
                style={`left:${pct(chosen.from)};width:${pct(chosen.to - chosen.from)}`}
              />
            )}
            {nowAt !== null && <i class={styles.now} style={`left:${pct(nowAt)}`} />}
          </div>
        </div>
      </div>

      <table class="sr-only">
        <caption>{t('plan.hoursIn', { place: ref.name })}</caption>
        <thead>
          <tr>
            <th scope="col">{t('plan.table.office')}</th>
            <th scope="col">{t('plan.table.time')}</th>
            <th scope="col">{t('plan.table.state')}</th>
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.name}</th>
              <td>{r.at}</td>
              <td>{t(LEGEND[r.kind])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p class={styles.note}>
        {t('plan.calendars')}
        {m.noCalendar.length > 0 && ` · ${t('plan.noCalendar')}: ${m.noCalendar.join(', ')}`}
      </p>
    </section>
  );
}
