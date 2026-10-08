import { getOffice } from '@core/cities/registry';
import { formatClock } from '@core/time/format';
import { zonedFields } from '@core/time/zoned';
import { useApp, useT } from '../../app/context';
import { worldMapModel } from './model';
import styles from './WorldMap.module.css';

/** Dot-matrix world with the live day/night line and a pin per active office. */
export function WorldMap() {
  const app = useApp();
  const t = useT();
  const now = app.clock.minuteNow.value;
  const offices = app.cities.activeIds.value.flatMap((id) => getOffice(id) ?? []);
  const m = worldMapModel(now, offices);
  const utc = formatClock(zonedFields(now, 'UTC'), 'h23').hm;
  return (
    <figure class={styles.map} aria-label={t('cities.map')}>
      <svg class={styles.svg} viewBox="0 0 358 134" aria-hidden="true">
        <path class={styles.night} d={m.night} />
        <path class={styles.dusk} d={m.dusk} />
        <path class={styles.day} d={m.day} />
        <path class={styles.terminator} d={m.terminator} />
      </svg>
      {m.pins.map((p) => (
        <div
          key={p.id}
          class={`${styles.pin} ${p.labelLeft ? styles.left : ''}`}
          style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
        >
          <i />
          <span>{p.name}</span>
        </div>
      ))}
      <figcaption class={styles.caption}>
        <span>{t('cities.map')}</span>
        <span>UTC {utc}</span>
      </figcaption>
    </figure>
  );
}
