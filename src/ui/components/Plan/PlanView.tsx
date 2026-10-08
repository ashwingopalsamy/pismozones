import { planDay } from '@core/plan/overlap';
import { addDays, civilDate, toInstant, zonedFields } from '@core/time/zoned';
import type { WorkKind } from '@core/work/policy';
import { useRef } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import type { Key } from '../../i18n';
import { Icon } from '../Icon';
import { planViewModel } from './model';
import styles from './Plan.module.css';

const LEGEND: Record<WorkKind, Key> = {
  working: 'plan.legend.working',
  early: 'plan.legend.edge',
  late: 'plan.legend.edge',
  off: 'plan.legend.off',
  weekend: 'plan.legend.weekend',
  holiday: 'plan.legend.holiday',
};

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
  // Pointer on a column pins its start; dragging across columns scrubs.
  const columnAt = (e: PointerEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-col]');
    return el ? Number(el.dataset.col) : null;
  };
  const scrubTo = (e: PointerEvent) => {
    const c = columnAt(e);
    const col = c === null ? undefined : m.columns[c];
    if (col) app.scrub(col.start);
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
          <span class={styles.bestText}>
            <span class={styles.bestLabel}>{m.best.head}</span>
            <span class={styles.perCity}>
              {m.best.perCity.map((p) => (
                <span key={p.id}>{p.text}</span>
              ))}
            </span>
          </span>
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

      <div class={styles.scroller}>
        <div
          class={styles.grid}
          aria-hidden="true"
          style={`--cols:${m.columns.length}`}
          onPointerDown={(e) => {
            if (columnAt(e) === null) return;
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
          <span class={styles.corner} />
          {m.columns.map((c, i) => (
            <span key={c.start} class={styles.colHead}>
              {m.selected?.column === i && <b class={styles.selLabel}>{m.selected.label}</b>}
            </span>
          ))}
          {m.rows.map((r) => [
            <span key={`${r.id}-h`} class={styles.rowHead}>
              <b>
                <i class={`${styles.dot} ${styles[r.kind]}`} />
                {r.name}
              </b>
              <span>
                {r.hours} · {r.at}
              </span>
            </span>,
            ...r.cells.map((c, i) => {
              const inBest = m.best && i >= m.best.columns[0] && i < m.best.columns[1];
              return (
                <span
                  key={`${r.id}-${i}`}
                  data-col={i}
                  class={`${styles.slot} ${styles[c.kinds[0]]} ${c.kinds[1] ? styles[`to_${c.kinds[1]}`] : ''} ${inBest ? styles.inBest : ''} ${m.selected?.column === i ? styles.sel : ''}`}
                >
                  {c.label}
                  {c.dayMark && <sup class={styles.dayMark}>{c.dayMark}</sup>}
                </span>
              );
            }),
          ])}
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
        {(['working', 'early', 'off', 'weekend', 'holiday'] as const).map((k) => (
          <span key={k}>
            <i class={`${styles.cell} ${styles[k]}`} />
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
