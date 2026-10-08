import { useApp, useT } from '../../app/context';
import { Icon } from '../Icon';
import styles from './MomentPill.module.css';
import { momentPillModel } from './model';

/** `compact`: one line (the date context is on the ruler and cards). */
export function MomentPill({ compact = false }: { compact?: boolean }) {
  const app = useApp();
  const t = useT();
  const m = momentPillModel(
    app.mode.value,
    app.moment.value,
    app.clock.minuteNow.value,
    app.reference.value,
    app.env.viewerZone,
    app.prefs.hourCycle.value,
    app.prefs.lang.value,
  );
  return (
    <div class={`${styles.pill} ${styles[m.tone]} ${compact ? styles.compact : ''}`}>
      <span class={styles.dot} />
      <span class={styles.text}>
        <span class={styles.main}>{m.main}</span>
        {!compact && <span class={styles.sub}>{m.sub}</span>}
      </span>
      <button
        type="button"
        class={styles.reset}
        aria-label={t('moment.backToNow')}
        disabled={m.tone === 'live'}
        onClick={() => app.backToLive('button')}
      >
        <Icon name="reset" />
      </button>
    </div>
  );
}
