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
  const scrubTo = (e: PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const f = rect.width ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
    const t = plan.day.start + f * (plan.day.end - plan.day.start);
    app.scrub(Math.min(Math.round(t / QUARTER) * QUARTER, plan.day.end - QUARTER));
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
            <span class={styles.bestLabel}>{m.best.label}</span>
            <span class={styles.outside}>{m.best.outside ?? t('plan.everyone')}</span>
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

      <div class={styles.grid} aria-hidden="true">
        <div class={styles.axis}>
          {m.axis.map((a) => (
            <span key={a.label} style={{ left: `${a.pct}%` }}>
              {a.label}
            </span>
          ))}
        </div>
        <div class={styles.labels}>
          {m.rows.map((r) => (
            <div key={r.id} class={styles.lab}>
              <b>
                <i class={`${styles.dot} ${styles[r.kind]}`} />
                {r.name}
              </b>
              <span>{r.at}</span>
            </div>
          ))}
        </div>
        <div
          class={styles.tracks}
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
        >
          {m.band && (
            <div
              class={styles.band}
              style={{ left: `${m.band.leftPct}%`, width: `${m.band.widthPct}%` }}
            />
          )}
          {m.rows.map((r) => (
            <div key={r.id}>
              <div class={styles.rowLabel}>
                <b>{r.name}</b>
                <span>{r.at}</span>
              </div>
              <div class={styles.bar}>
                {r.cells.map((c, i) => (
                  <i key={i} class={`${styles.cell} ${styles[c]}`} />
                ))}
              </div>
            </div>
          ))}
          {m.cursorPct !== null && (
            <div class={styles.cursor} style={{ left: `${m.cursorPct}%` }} />
          )}
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
