import type { OfficeId } from '@core/cities/registry';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../../app/context';
import { EditableTime } from '../EditableTime/EditableTime';
import { type CardBox, cardModel, DESKTOP_BOX } from '../ZoneCard/model';
import { ZoneCard } from '../ZoneCard/ZoneCard';
import styles from './CardList.module.css';

export interface CardListProps {
  box: CardBox;
  editable: boolean;
  onHoliday?: (id: OfficeId) => void;
}

export function CardList({ box, editable, onHoliday }: CardListProps) {
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
  const moment = app.moment.value;
  const live = app.mode.value === 'live';
  const ctx = {
    now: app.clock.minuteNow.value,
    viewerZone: app.env.viewerZone,
    hourCycle: app.prefs.hourCycle.value,
    lang: app.prefs.lang.value,
    refId: app.reference.value.id,
    box,
    starCount: box === DESKTOP_BOX ? 34 : 26,
  };
  return (
    <section ref={list} class={`${styles.list} ${box === DESKTOP_BOX ? styles.wrap : ''}`}>
      {app.displayed.value.map(({ office, temp }) => (
        <ZoneCard
          key={office.id}
          model={cardModel(office, moment, { ...ctx, temp })}
          live={live}
          editable={editable}
          box={box}
          onEdit={() => setEditing(office.id)}
          editor={
            editing === office.id ? (
              <EditableTime
                office={office}
                phone={box !== DESKTOP_BOX}
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
      ))}
    </section>
  );
}
