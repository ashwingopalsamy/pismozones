import { ANCHOR, type Office, type OfficeId } from '@core/cities/registry';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../../app/context';
import { EditableTime } from '../EditableTime/EditableTime';
import {
  type CardBox,
  cardModel,
  DESKTOP_BOX,
  HERO_BOX,
  PHONE_BOX,
  PHONE_HERO_BOX,
} from '../ZoneCard/model';
import { ZoneCard } from '../ZoneCard/ZoneCard';
import styles from './CardList.module.css';

export interface CardListProps {
  layout: 'phone' | 'desktop';
  editable: boolean;
  onHoliday?: (id: OfficeId) => void;
}

/** São Paulo as the hero, then every other displayed city (a wrapping lane on desktop). */
export function CardList({ layout, editable, onHoliday }: CardListProps) {
  const app = useApp();
  const [editing, setEditing] = useState<OfficeId | null>(null);
  const list = useRef<HTMLElement>(null);
  const refocus = useRef<OfficeId | null>(null);
  // The editor's input unmounts on close; keyboard users land back on the card they edited.
  useLayoutEffect(() => {
    if (editing !== null || !refocus.current) return;
    list.current?.querySelector<HTMLElement>(`[data-edit="${refocus.current}"]`)?.focus();
    refocus.current = null;
  }, [editing]);
  const desktop = layout === 'desktop';
  const moment = app.moment.value;
  const live = app.mode.value === 'live';
  const base = {
    now: app.clock.minuteNow.value,
    viewerZone: app.env.viewerZone,
    hourCycle: app.prefs.hourCycle.value,
    lang: app.prefs.lang.value,
    refId: app.reference.value.id,
  };

  const card = (office: Office, temp: boolean, box: CardBox, hero: boolean) => (
    <ZoneCard
      key={office.id}
      model={cardModel(office, moment, {
        ...base,
        temp,
        box,
        starCount: hero ? 60 : desktop ? 34 : 26,
      })}
      live={live}
      editable={editable}
      box={box}
      hero={hero}
      onEdit={() => setEditing(office.id)}
      onSelect={() => {
        app.cities.refId.value = office.id;
        app.track('cities_change', {
          action: 'reference',
          officeId: office.id,
          activeCount: app.cities.activeIds.value.length,
        });
      }}
      editor={
        editing === office.id ? (
          <EditableTime
            office={office}
            phone={!desktop}
            onDone={(back) => {
              refocus.current = back ? office.id : null;
              setEditing(null);
            }}
          />
        ) : undefined
      }
      {...(onHoliday ? { onHoliday: () => onHoliday(office.id) } : {})}
      {...(temp ? { onAdd: () => app.cities.add(office.id) } : {})}
    />
  );

  const shown = app.displayed.value;
  const anchor = shown.find((d) => d.office.id === ANCHOR);
  const rest = shown.filter((d) => d.office.id !== ANCHOR);
  return (
    <section ref={list} class={styles.list}>
      {anchor && card(anchor.office, anchor.temp, desktop ? HERO_BOX : PHONE_HERO_BOX, true)}
      {rest.length > 0 &&
        (desktop ? (
          <div class={styles.lane}>
            {rest.map((d) => card(d.office, d.temp, DESKTOP_BOX, false))}
          </div>
        ) : (
          rest.map((d) => card(d.office, d.temp, PHONE_BOX, false))
        ))}
    </section>
  );
}
