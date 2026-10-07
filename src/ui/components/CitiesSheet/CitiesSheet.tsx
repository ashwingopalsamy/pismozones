import type { OfficeId } from '@core/cities/registry';
import { formatClock, formatOffset } from '@core/time/format';
import { zonedFields } from '@core/time/zoned';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import { Icon } from '../Icon';
import { Sheet } from '../Sheet/Sheet';
import { WorldMap } from '../WorldMap/WorldMap';
import styles from './CitiesSheet.module.css';
import { searchOffices } from './search';

export function CitiesSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const app = useApp();
  const t = useT();
  const [q, setQ] = useState('');
  const rows = useRef(new Map<OfficeId, HTMLLIElement>());
  const dragging = useRef<OfficeId | null>(null);
  // Toggling or reordering moves a row, which drops focus; put it back on the same city.
  const refocus = useRef<OfficeId | null>(null);
  useLayoutEffect(() => {
    if (!refocus.current) return;
    rows.current.get(refocus.current)?.querySelector('button')?.focus();
    refocus.current = null;
  });
  const active = app.cities.activeIds.value;
  const now = app.clock.minuteNow.value;
  const hc = app.prefs.hourCycle.value;
  const pt = app.prefs.lang.value === 'pt-BR';
  // Active offices first, in their saved order, then the rest.
  const found = searchOffices(q);
  const list = [
    ...active.flatMap((id) => found.filter((o) => o.id === id)),
    ...found.filter((o) => !active.includes(o.id)),
  ];

  const onRowKey = (id: OfficeId) => (e: KeyboardEvent) => {
    if (!e.altKey || !active.includes(id) || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    refocus.current = id;
    app.cities.move(id, active.indexOf(id) + (e.key === 'ArrowUp' ? -1 : 1));
  };
  const onGripMove = (e: PointerEvent) => {
    const id = dragging.current;
    if (!id) return;
    for (const [other, el] of rows.current) {
      if (other === id || !active.includes(other)) continue;
      const r = el.getBoundingClientRect();
      if (e.clientY > r.top && e.clientY < r.bottom) app.cities.move(id, active.indexOf(other));
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('cities.title')}>
      <p class={styles.count}>{t('cities.count', { n: active.length })}</p>
      <WorldMap />
      <div class={styles.section}>{t('cities.offices')}</div>
      <ul class={styles.list}>
        {list.map((o) => {
          const on = active.includes(o.id);
          const f = zonedFields(now, o.zone);
          const c = formatClock(f, hc);
          return (
            <li
              key={o.id}
              class={styles.item}
              ref={(el) => {
                if (el) rows.current.set(o.id, el);
                else rows.current.delete(o.id);
              }}
            >
              <button
                type="button"
                class={styles.row}
                aria-pressed={on}
                disabled={on && active.length === 1}
                onClick={() => {
                  refocus.current = o.id;
                  app.cities.toggle(o.id);
                }}
                onKeyDown={onRowKey(o.id)}
              >
                <span class={styles.check}>
                  <Icon name="check" size={15} />
                </span>
                <span class={styles.name}>
                  <b>
                    {o.name}
                    {o.hq && <span class={styles.tag}>{t('tag.hq')}</span>}
                  </b>
                  <span>{pt ? o.countryName.pt : o.countryName.en}</span>
                </span>
                <span class={styles.time}>
                  <b>{c.period ? `${c.hm} ${c.period}` : c.hm}</b>
                  <span>{formatOffset(f.offsetMinutes)}</span>
                </span>
              </button>
              {on && (
                <span
                  class={styles.grip}
                  aria-hidden="true"
                  onPointerDown={(e) => {
                    dragging.current = o.id;
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    } catch {
                      // best-effort
                    }
                  }}
                  onPointerMove={onGripMove}
                  onPointerUp={() => {
                    dragging.current = null;
                  }}
                >
                  <Icon name="grip" size={18} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
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
    </Sheet>
  );
}
