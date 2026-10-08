import { formatClock } from '@core/time/format';
import { zonedFields } from '@core/time/zoned';
import type { Ref } from 'preact';
import { useApp, useT } from '../../app/context';
import { Flag } from '../Flag/Flag';
import { Icon } from '../Icon';
import styles from './CityPill.module.css';

export interface CityPillProps {
  /** 'time': name + local time; 'name': name only; 'code': 3-letter code (tight lanes). */
  mode: 'time' | 'name' | 'code';
  expanded: boolean;
  onOpen(): void;
  ref?: Ref<HTMLButtonElement>;
}

/** The reference city (whose time typed queries and the Plan use) and the way into the cities panel. */
export function CityPill({ mode, expanded, onOpen, ref }: CityPillProps) {
  const app = useApp();
  const t = useT();
  const office = app.reference.value;
  const moment = app.moment.value;
  const n = app.cities.activeIds.value.length;
  const c = formatClock(zonedFields(moment, office.zone), app.prefs.hourCycle.value);
  return (
    <button
      ref={ref ?? null}
      type="button"
      class={styles.pill}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={t('pill.cities', { city: office.name, n: String(n) })}
      title={t('pill.cities', { city: office.name, n: String(n) })}
      onClick={onOpen}
    >
      <Flag country={office.country} size={24} />
      <span class={styles.name}>{mode === 'code' ? office.code : office.name}</span>
      {mode === 'time' && (
        <span class={styles.time}>{c.period ? `${c.hm} ${c.period}` : c.hm}</span>
      )}
      {mode !== 'code' && <Icon name="chevronDown" size={14} />}
    </button>
  );
}
