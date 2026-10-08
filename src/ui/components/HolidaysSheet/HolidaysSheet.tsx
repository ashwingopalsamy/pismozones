import type { CalendarId, OfficeId } from '@core/cities/registry';
import { civilDate } from '@core/time/zoned';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import { Flag } from '../Flag/Flag';
import { Sheet, type SheetVariant } from '../Sheet/Sheet';
import styles from './HolidaysSheet.module.css';
import { type HolidayItem, holidaysModel, relativeLabel } from './model';

export interface HolidaysSheetProps {
  open: boolean;
  onClose(): void;
  entry?: 'header' | 'chip';
  focus?: { officeId: OfficeId; date: string } | undefined;
  variant?: SheetVariant;
}

function DateTile({ item, size = 'md' }: { item: HolidayItem; size?: 'md' | 'lg' }) {
  return (
    <span class={`${styles.tile} ${size === 'lg' ? styles.tileLg : ''}`} aria-hidden="true">
      <small>{item.month}</small>
      <b>{item.day}</b>
    </span>
  );
}

/** Pismo's company holidays: one calendar per country, personalised to the offices on screen. */
export function HolidaysSheet({
  open,
  onClose,
  entry = 'header',
  focus,
  variant = 'sheet',
}: HolidaysSheetProps) {
  const app = useApp();
  const t = useT();
  const lang = app.prefs.lang.value;
  const body = useRef<HTMLDivElement>(null);
  const offices = app.displayed.value.filter((d) => !d.temp).map((d) => d.office);
  const m = holidaysModel(
    offices,
    app.cities.viewerOffice?.id ?? null,
    civilDate(app.clock.minuteNow.value, app.env.viewerZone),
    lang,
    focus,
  );
  const [selected, setSelected] = useState<CalendarId[]>(m.selected);
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!open) return;
    app.track('holidays_open', { entry });
    setSelected(m.selected);
  }, [open, focus?.officeId, focus?.date]);
  useLayoutEffect(() => {
    if (open)
      body.current
        ?.querySelector<HTMLElement>('[data-focused]')
        ?.scrollIntoView({ block: 'center' });
  }, [open, selected]);

  const toggle = (id: CalendarId) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const shown = m.countries.filter((c) => selected.includes(c.id));
  const nextUp = shown
    .flatMap((c) => (c.next ? [{ c, item: c.next }] : []))
    .sort((a, b) => a.item.daysUntil - b.item.daysUntil)[0];
  const year = m.countries[0]?.year ?? new Date().getUTCFullYear();

  return (
    <Sheet open={open} onClose={onClose} title={t('holidays.title')} variant={variant}>
      <div class={styles.layout} ref={body}>
        <aside class={styles.rail}>
          <p class={styles.sub}>{t('holidays.subtitle', { year: String(year) })}</p>
          <fieldset class={styles.countries}>
            <legend class="sr-only">{t('holidays.title')}</legend>
            {m.countries.map((c) => (
              <button
                key={c.id}
                type="button"
                class={styles.country}
                aria-pressed={selected.includes(c.id)}
                onClick={() => toggle(c.id)}
              >
                <Flag country={c.iso} size={28} />
                <span class={styles.countryText}>
                  <b>
                    {c.label}
                    {c.yours && <em>{t('holidays.yourOffice')}</em>}
                  </b>
                  <small>{c.offices.join(', ')}</small>
                </span>
                <span class={styles.countryNext}>
                  {c.next ? (
                    <>
                      <b>{`${c.next.month} ${c.next.day}`}</b>
                      <small>{relativeLabel(c.next, lang)}</small>
                    </>
                  ) : (
                    <small>—</small>
                  )}
                </span>
              </button>
            ))}
          </fieldset>
        </aside>

        <div class={styles.main}>
          <div class={styles.toolbar}>
            <fieldset class={styles.seg}>
              <legend class="sr-only">{t('holidays.title')}</legend>
              <button type="button" aria-pressed={!full} onClick={() => setFull(false)}>
                {t('holidays.upcoming')}
              </button>
              <button type="button" aria-pressed={full} onClick={() => setFull(true)}>
                {t('holidays.fullYear')}
              </button>
            </fieldset>
          </div>

          {nextUp && (
            <article class={styles.hero}>
              <DateTile item={nextUp.item} size="lg" />
              <div class={styles.heroText}>
                <span class={styles.eyebrow}>
                  {t('holidays.nextUp')} · {relativeLabel(nextUp.item, lang)}
                </span>
                <h3>{nextUp.item.name}</h3>
                <p>
                  <Flag country={nextUp.c.iso} size={16} />
                  {nextUp.c.offices.join(', ')} · {nextUp.item.weekday}
                  {nextUp.item.half && ` · ${t('holidays.halfDay')}`}
                </p>
              </div>
            </article>
          )}

          {shown.length === 0 && <p class={styles.quiet}>{t('holidays.pick')}</p>}

          {shown.map((c) => {
            const items = full ? c.items : c.items.filter((i) => i.state !== 'past');
            return (
              <section key={c.id} class={styles.section} aria-label={c.label}>
                <header class={styles.sectionHead}>
                  <Flag country={c.iso} size={22} />
                  <b>{c.label}</b>
                  <span>{c.offices.join(', ')}</span>
                  <span class={styles.count}>
                    {t('holidays.left', { n: c.remaining, year: String(c.year) })}
                  </span>
                </header>
                {items.length === 0 ? (
                  <p class={styles.quiet}>{t('holidays.none', { year: String(c.year) })}</p>
                ) : (
                  <ul class={styles.rows}>
                    {items.map((h) => (
                      <li
                        key={h.date + h.name}
                        class={styles.row}
                        data-state={h.state}
                        data-focused={h.focused || undefined}
                      >
                        <DateTile item={h} />
                        <span class={styles.what}>
                          <b>{h.name}</b>
                          <small>{[h.weekday, h.note].filter(Boolean).join(' · ')}</small>
                        </span>
                        <span class={styles.badges}>
                          {h.half && <i>{t('holidays.halfDay')}</i>}
                          {h.state === 'next' && (
                            <i class={styles.nextBadge}>{t('holidays.next')}</i>
                          )}
                        </span>
                        <span class={styles.until}>{relativeLabel(h, lang)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {c.unpublished && (
                  <p class={styles.quiet}>
                    {t('holidays.unpublished', { year: String(c.unpublished) })}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
