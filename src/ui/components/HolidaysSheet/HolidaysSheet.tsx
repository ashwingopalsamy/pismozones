import type { OfficeId } from '@core/cities/registry';
import { civilDate } from '@core/time/zoned';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import { Sheet, type SheetVariant } from '../Sheet/Sheet';
import styles from './HolidaysSheet.module.css';
import { type HolidayMonth, type HolidayTab, holidaysModel } from './model';

export interface HolidaysSheetProps {
  open: boolean;
  onClose(): void;
  entry?: 'header' | 'chip';
  focus?: { officeId: OfficeId; date: string } | undefined;
  variant?: SheetVariant;
}

export function HolidaysSheet({
  open,
  onClose,
  entry = 'header',
  focus,
  variant = 'sheet',
}: HolidaysSheetProps) {
  const app = useApp();
  const t = useT();
  const list = useRef<HTMLDivElement>(null);
  const offices = app.displayed.value.filter((d) => !d.temp).map((d) => d.office);
  const m = holidaysModel(
    offices,
    civilDate(app.clock.minuteNow.value, app.env.viewerZone),
    app.prefs.lang.value,
    focus,
  );
  const [tab, setTab] = useState<HolidayTab>(m.selected);
  useEffect(() => {
    if (!open) return;
    app.track('holidays_open', { entry });
    setTab(m.selected);
  }, [open, focus?.officeId, focus?.date]);
  useLayoutEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>('[data-focused]')?.scrollIntoView({ block: 'center' });
  }, [open, tab]);

  const months: HolidayMonth[] = tab === 'upcoming' ? m.upcoming : (m.country[tab] ?? []);
  const tabs = m.tabs.map((x) => x.id);
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
    const next = tabs[(i + tabs.length) % tabs.length] as HolidayTab;
    setTab(next);
    (e.currentTarget as HTMLElement).parentElement
      ?.querySelector<HTMLElement>(`[data-tab="${next}"]`)
      ?.focus();
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('holidays.title')} variant={variant}>
      <div class={styles.tabs} role="tablist" aria-label={t('holidays.title')}>
        {m.tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            data-tab={x.id}
            aria-selected={tab === x.id}
            tabIndex={tab === x.id ? 0 : -1}
            class={styles.tab}
            onClick={() => setTab(x.id)}
            onKeyDown={onTabKey}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div ref={list} role="tabpanel" class={styles.panel}>
        {months.length === 0 && (
          <p class={styles.note}>
            {tab === 'upcoming' || !m.unpublished
              ? t('holidays.empty')
              : t('holidays.unpublished', { year: String(m.unpublished) })}
          </p>
        )}
        {months.map((month) => (
          <section key={month.title} aria-label={month.title}>
            <h3 class={styles.month}>{month.title}</h3>
            <ul class={styles.list}>
              {month.items.map((h) => (
                <li
                  key={`${h.date}${h.name}`}
                  data-focused={h.focused || undefined}
                  class={`${styles.item} ${h.focused ? styles.focused : ''} ${h.state === 'past' ? styles.past : ''}`}
                >
                  <span class={styles.date}>{h.dateLabel}</span>
                  <span class={styles.name}>
                    <b>
                      {h.name}
                      {h.state === 'today' && <i class={styles.badge}>{t('holidays.today')}</i>}
                      {h.state === 'next' && <i class={styles.badge}>{t('holidays.next')}</i>}
                      {h.half && <i class={`${styles.badge} ${styles.half}`}>{t('holidays.halfDay')}</i>}
                    </b>
                    <span>{[h.offices, h.note].filter(Boolean).join(' · ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {m.unpublished !== null && months.length > 0 && (
          <p class={styles.note}>{t('holidays.unpublished', { year: String(m.unpublished) })}</p>
        )}
        {m.noCalendar.length > 0 && (
          <p class={styles.note}>{`${t('plan.noCalendar')}: ${m.noCalendar.join(', ')}`}</p>
        )}
      </div>
    </Sheet>
  );
}
