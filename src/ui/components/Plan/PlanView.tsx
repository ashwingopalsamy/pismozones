import { planDay } from '@core/plan/overlap';
import { addDays, civilDate, toInstant, zonedFields } from '@core/time/zoned';
import type { WorkKind } from '@core/work/policy';
import { useRef } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import type { Key } from '../../i18n';
import { Icon } from '../Icon';
import { planViewModel } from './model';
import styles from './Plan.module.css';

const QUARTER = 900_000;
const LEGEND: Record<WorkKind, Key> = {
  working: 'plan.legend.working',
  early: 'plan.legend.edge',
  late: 'plan.legend.edge',
  off: 'plan.legend.off',
  weekend: 'plan.legend.weekend',
  holiday: 'plan.legend.holiday',
};
const pct = (f: number) => `${(f * 100).toFixed(3)}%`;

export function PlanView({ layout }: { layout: 'phone' | 'panel' }) {
  const app = useApp();
  const t = useT();
  const dragging = useRef(false);
  const ref = app.reference.value;
  const moment = app.moment.value;
  const offices = app.displayed.value.map((d) => d.office);
  const plan = planDay(civilDate(moment, ref.zone), ref.zone, offices);
  const m = planViewModel(
    plan,
    offices,
    ref,
    moment,
    app.mode.value,
    app.prefs.hourCycle.value,
    app.prefs.lang.value,
    app.env.viewerZone,
    app.clock.minuteNow.value,
  );

  const shiftDay = (days: number) => {
    const f = zonedFields(moment, ref.zone);
    const d = addDays(f, days);
    app.pin(
      toInstant({ ...d, hour: f.hour, minute: f.minute, second: 0 }, ref.zone).instant,
      'day_nav',
    );
  };
  // Anywhere on the timeline: press to pin, drag to scrub (15-minute steps).
  const scrubTo = (e: PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const f = rect.width ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
    const at = plan.day.start + f * (plan.day.end - plan.day.start);
    app.scrub(Math.min(Math.round(at / QUARTER) * QUARTER, plan.day.end - QUARTER));
  };

  return (
    <section
      class={`${styles.plan} ${layout === 'panel' ? styles.panel : ''}`}
      aria-label={t('view.plan')}
    >
      <div class={styles.head}>
        <h2 class={styles.title}>{t('view.plan')}</h2>
        <div class={styles.daynav}>
          <button
            type="button"
            class={styles.chev}
            aria-label={t('a11y.prevDay')}
            onClick={() => shiftDay(-1)}
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <span class={styles.dayLabel}>{m.dayTitle}</span>
          <button
            type="button"
            class={styles.chev}
            aria-label={t('a11y.nextDay')}
            onClick={() => shiftDay(1)}
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
        <span class={styles.hint}>{t('plan.hoursIn', { place: ref.name })}</span>
      </div>

      {m.best ? (
        <div class={styles.best}>
          <div class={styles.bestMain}>
            <b class={styles.bestLabel}>{m.best.head}</b>
            <ul class={styles.chips}>
              {m.best.perCity.map((p) => (
                <li key={p.id} class={p.outside ? styles.outsideChip : undefined}>
                  <span class={styles.chipName}>{p.name}</span>
                  <span class={styles.chipRange}>{p.range}</span>
                  {p.outside && <em>{t('plan.outsideTag')}</em>}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            class={styles.use}
            onClick={() => {
              const b = m.best;
              if (!b) return;
              app.pin(b.start, 'best_overlap');
              app.track('plan_best', { working: b.working, total: offices.length });
            }}
          >
            {t('plan.useBest')}
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
      ) : (
        <div class={styles.best}>{t('plan.none', { date: m.dayTitle })}</div>
      )}

      <div class={styles.grid} aria-hidden="true">
        <div class={styles.heads}>
          <span class={styles.pillLane} />
          {m.rows.map((r) => (
            <div key={r.id} class={styles.rowHead}>
              <b>
                <i class={`${styles.dot} ${styles[r.kind]}`} />
                {r.name}
              </b>
              <span>{r.at}</span>
            </div>
          ))}
        </div>
        <div class={styles.scroller}>
          <div
            class={styles.area}
            style={`--hours:${m.hours}`}
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
            <div class={styles.pillLane}>
              {m.selected && (
                <b
                  class={styles.selLabel}
                  style={`left:${pct((m.selected.column + 0.5) / m.hours)}`}
                >
                  {m.selected.label}
                </b>
              )}
            </div>
            <div class={styles.tracks}>
              {m.best && (
                <i
                  class={styles.band}
                  style={`left:${pct(m.best.from)};width:${pct(m.best.to - m.best.from)}`}
                />
              )}
              {m.selected && (
                <i
                  class={styles.selCol}
                  style={`left:${pct(m.selected.column / m.hours)};width:${pct(1 / m.hours)}`}
                />
              )}
              {m.rows.map((r) => (
                <div key={r.id} class={styles.track}>
                  {r.segments.map((s) => (
                    <i
                      key={s.from}
                      class={`${styles.seg} ${styles[s.kind]}`}
                      style={`left:${pct(s.from)};width:${pct(s.to - s.from)}`}
                    />
                  ))}
                  <div class={styles.labels}>
                    {r.labels.map((l, i) => (
                      <span
                        key={i}
                        class={`${l.day ? styles.dayMark : ''} ${l.kind === 'working' ? styles.onWork : ''}`}
                      >
                        {l.text}
                        {l.sub && <small>{l.sub}</small>}
                        {l.suffix}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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

      <div class={styles.legend} aria-hidden="true">
        {(['working', 'early', 'weekend', 'holiday'] as const).map((k) => (
          <span key={k}>
            <i class={`${styles.swatch} ${styles[k]}`} />
            {t(LEGEND[k])}
          </span>
        ))}
      </div>
      {m.noCalendar.length > 0 && (
        <p class={styles.note}>{`${t('plan.noCalendar')}: ${m.noCalendar.join(', ')}`}</p>
      )}
    </section>
  );
}
