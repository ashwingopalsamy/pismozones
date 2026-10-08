import type { OfficeId } from '@core/cities/registry';
import { civilDate } from '@core/time/zoned';
import { useEffect } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import { Sheet } from '../Sheet/Sheet';
import styles from './HolidaysSheet.module.css';
import { holidaysModel } from './model';

export interface HolidaysSheetProps {
  open: boolean;
  onClose(): void;
  entry?: 'header' | 'chip';
  focus?: { officeId: OfficeId; date: string } | undefined;
}

export function HolidaysSheet({ open, onClose, entry = 'header', focus }: HolidaysSheetProps) {
  const app = useApp();
  const t = useT();
  useEffect(() => {
    if (open) app.track('holidays_open', { entry });
  }, [open]);
  const offices = app.displayed.value.filter((d) => !d.temp).map((d) => d.office);
  const m = holidaysModel(
    offices,
    civilDate(app.clock.minuteNow.value, app.env.viewerZone),
    app.prefs.lang.value,
    focus,
  );
  return (
    <Sheet open={open} onClose={onClose} title={t('holidays.title')}>
      {m.months.length === 0 && <p class={styles.note}>{t('holidays.empty')}</p>}
      {m.months.map((month) => (
        <section key={month.title} aria-label={month.title}>
          <h3 class={styles.month}>{month.title}</h3>
          <ul class={styles.list}>
            {month.items.map((h) => (
              <li
                key={`${h.date}${h.name}`}
                class={`${styles.item} ${h.focused ? styles.focused : ''}`}
              >
                <span class={styles.date}>{h.dateLabel}</span>
                <span class={styles.name}>
                  <b>{h.name}</b>
                  <span>
                    {h.offices}
                    {h.half && <span class={styles.half}> · {t('holidays.halfDay')}</span>}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {m.noCalendar.length > 0 && (
        <p class={styles.note}>{`${t('plan.noCalendar')}: ${m.noCalendar.join(', ')}`}</p>
      )}
    </Sheet>
  );
}
