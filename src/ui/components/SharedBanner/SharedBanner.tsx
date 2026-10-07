import { getOffice } from '@core/cities/registry';
import { formatClock, formatShortDate } from '@core/time/format';
import { zonedFields } from '@core/time/zoned';
import { useApp, useT } from '../../app/context';
import styles from './SharedBanner.module.css';

/** Shown while viewing a shared link; nothing from it is saved. */
export function SharedBanner() {
  const app = useApp();
  const t = useT();
  const o = app.overlay.value;
  if (!o) return null;
  const ref = getOffice(o.refId);
  if (!ref) return null;
  const f = zonedFields(o.instant, ref.zone);
  const c = formatClock(f, app.prefs.hourCycle.value);
  const label = `${formatShortDate(f, app.prefs.lang.value)} ${c.period ? `${c.hm} ${c.period}` : c.hm} ${ref.name}`;
  return (
    <div class={styles.banner}>
      <span>{t('shared.banner', { label })}</span>
      <button type="button" class={styles.back} onClick={() => app.exitOverlay()}>
        {t('shared.back')}
      </button>
    </div>
  );
}
