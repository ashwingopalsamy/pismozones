import { ANCHOR, type Office, type OfficeId } from '@core/cities/registry';
import { formatClock, formatOffset } from '@core/time/format';
import { zonedFields } from '@core/time/zoned';
import { workState } from '@core/work/policy';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import { Icon } from '../Icon';
import styles from './CitiesSheet.module.css';
import { searchOffices } from './search';

/**
 * Search, then Active and Available cities. Picking a row makes it the reference city (adding it
 * when inactive); the ＋/− button adds or removes. São Paulo is always on.
 */
export function CityList({ wide = false }: { wide?: boolean }) {
  const app = useApp();
  const t = useT();
  const [q, setQ] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const refocus = useRef<OfficeId | null>(null);
  // Toggling or reordering moves a row, which drops focus; put it back on the same city.
  useLayoutEffect(() => {
    if (!refocus.current) return;
    root.current?.querySelector<HTMLElement>(`[data-pick="${refocus.current}"]`)?.focus();
    refocus.current = null;
  });

  const active = app.cities.activeIds.value;
  const refId = app.reference.value.id;
  const moment = app.moment.value;
  const hc = app.prefs.hourCycle.value;
  const pt = app.prefs.lang.value === 'pt-BR';
  const found = searchOffices(q);
  const on = active.flatMap((id) => found.filter((o) => o.id === id));
  const off = found.filter((o) => !active.includes(o.id));

  const toggle = (id: OfficeId) => {
    refocus.current = id;
    app.cities.toggle(id);
  };
  const onKey = (o: Office) => (e: KeyboardEvent) => {
    const rows = [...(root.current?.querySelectorAll<HTMLElement>('[data-pick]') ?? [])];
    const i = rows.indexOf(e.currentTarget as HTMLElement);
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.altKey && active.includes(o.id)) {
      e.preventDefault();
      refocus.current = o.id;
      app.cities.move(o.id, active.indexOf(o.id) + (e.key === 'ArrowUp' ? -1 : 1));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      rows[i + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && active.includes(o.id)) {
      e.preventDefault();
      toggle(o.id);
    }
  };

  const row = (o: Office) => {
    const isOn = active.includes(o.id);
    const f = zonedFields(moment, o.zone);
    const c = formatClock(f, hc);
    const kind = workState(moment, o).kind;
    const time = c.period ? `${c.hm} ${c.period}` : c.hm;
    return (
      <li key={o.id} class={styles.item} data-ref={o.id === refId || undefined}>
        <button
          type="button"
          class={styles.pick}
          data-pick={o.id}
          aria-current={o.id === refId ? 'true' : undefined}
          aria-label={`${o.name}, ${time}. ${t('cities.makeRef', { city: o.name })}`}
          onClick={() => app.cities.setReference(o.id)}
          onKeyDown={onKey(o)}
        >
          <i class={`${styles.dot} ${styles[kind]}`} />
          <span class={styles.name}>
            <b>
              {o.name}
              {o.hq && <span class={styles.tag}>{t('tag.hq')}</span>}
            </b>
            <span>{pt ? o.countryName.pt : o.countryName.en}</span>
          </span>
          <span class={styles.time}>
            <b>{time}</b>
            <span>{formatOffset(f.offsetMinutes)}</span>
          </span>
        </button>
        {o.id === ANCHOR ? (
          <span
            class={styles.lock}
            role="img"
            title={t('cities.always')}
            aria-label={t('cities.always')}
          >
            <Icon name="lock" size={15} />
          </span>
        ) : (
          <button
            type="button"
            class={`${styles.action} ${isOn ? styles.remove : ''}`}
            aria-label={`${isOn ? t('cities.remove') : t('cities.add')} ${o.name}`}
            title={`${isOn ? t('cities.remove') : t('cities.add')} ${o.name}`}
            onClick={() => toggle(o.id)}
          >
            <Icon name={isOn ? 'minus' : 'plus'} size={16} />
          </button>
        )}
      </li>
    );
  };

  return (
    <div ref={root} class={wide ? styles.wide : undefined}>
      <label class={styles.search}>
        <Icon name="search" size={18} />
        <span class="sr-only">{t('cities.search')}</span>
        <input
          type="search"
          value={q}
          placeholder={t('cities.search')}
          autoComplete="off"
          spellcheck={false}
          onInput={(e) => setQ(e.currentTarget.value)}
        />
      </label>
      {on.length > 0 && (
        <>
          <div class={styles.section}>
            {t('cities.active')} · {active.length}
          </div>
          <ul class={styles.list}>{on.map(row)}</ul>
        </>
      )}
      {off.length > 0 && (
        <>
          <div class={styles.section}>{t('cities.available')}</div>
          <ul class={styles.list}>{off.map(row)}</ul>
        </>
      )}
      <p class={styles.hint}>{t('cities.reorderHint')}</p>
    </div>
  );
}
