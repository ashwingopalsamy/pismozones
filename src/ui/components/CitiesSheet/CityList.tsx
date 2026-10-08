import { ANCHOR, type Office, type OfficeId } from '@core/cities/registry';
import { formatClock } from '@core/time/format';
import { zonedFields } from '@core/time/zoned';
import { type WorkKind, workState } from '@core/work/policy';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import type { Key } from '../../i18n';
import { Flag } from '../Flag/Flag';
import { Icon } from '../Icon';
import styles from './CitiesSheet.module.css';
import { searchOffices } from './search';

const STATE: Record<WorkKind, Key> = {
  working: 'state.working',
  early: 'cities.state.early',
  late: 'state.late',
  off: 'state.off',
  weekend: 'state.weekend',
  holiday: 'cities.state.holiday',
};

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
    const isRef = o.id === refId;
    return (
      <li
        key={o.id}
        class={`${styles.item} ${isOn ? styles.on : ''}`}
        data-ref={isRef || undefined}
      >
        <button
          type="button"
          class={styles.pick}
          data-pick={o.id}
          aria-current={isRef ? 'true' : undefined}
          aria-label={`${o.name}, ${time}. ${t('cities.makeRef', { city: o.name })}`}
          onClick={() => app.cities.setReference(o.id)}
          onKeyDown={onKey(o)}
        >
          <Flag country={o.country} size={28} />
          <span class={styles.name}>
            <b>
              {o.name}
              {o.hq && <span class={styles.tag}>{t('tag.hq')}</span>}
            </b>
            <span>{pt ? o.countryName.pt : o.countryName.en}</span>
          </span>
          <span class={styles.time}>
            <b>{time}</b>
            <span class={styles[kind]}>
              <i class={styles.dot} />
              {t(STATE[kind])}
            </span>
          </span>
        </button>
        {o.id === ANCHOR ? (
          <span
            class={styles.lock}
            role="img"
            title={t('cities.always')}
            aria-label={t('cities.always')}
          >
            <Icon name="lock" size={16} />
          </span>
        ) : isOn ? (
          <button
            type="button"
            class={styles.check}
            aria-label={`${t('cities.remove')} ${o.name}`}
            title={`${t('cities.remove')} ${o.name}`}
            onClick={() => toggle(o.id)}
          >
            <Icon name="check" size={16} />
          </button>
        ) : (
          <button
            type="button"
            class={styles.add}
            aria-label={`${t('cities.add')} ${o.name}`}
            title={`${t('cities.add')} ${o.name}`}
            onClick={() => toggle(o.id)}
          >
            <Icon name="plus" size={16} />
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
