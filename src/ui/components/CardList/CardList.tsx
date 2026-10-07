import type { OfficeId } from '@core/cities/registry';
import type { ComponentChildren } from 'preact';
import { useApp } from '../../app/context';
import { type CardBox, cardModel, DESKTOP_BOX } from '../ZoneCard/model';
import { ZoneCard } from '../ZoneCard/ZoneCard';
import styles from './CardList.module.css';

export interface CardListProps {
  box: CardBox;
  editable: boolean;
  onEdit?: (id: OfficeId) => void;
  onHoliday?: (id: OfficeId) => void;
  /** Inline editor for the card being edited. */
  editor?: { id: OfficeId; node: ComponentChildren } | null;
}

export function CardList({ box, editable, onEdit, onHoliday, editor }: CardListProps) {
  const app = useApp();
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
    <section class={`${styles.list} ${box === DESKTOP_BOX ? styles.wrap : ''}`}>
      {app.displayed.value.map(({ office, temp }) => (
        <ZoneCard
          key={office.id}
          model={cardModel(office, moment, { ...ctx, temp })}
          live={live}
          editable={editable}
          box={box}
          editor={editor?.id === office.id ? editor.node : undefined}
          {...(onEdit ? { onEdit: () => onEdit(office.id) } : {})}
          {...(onHoliday ? { onHoliday: () => onHoliday(office.id) } : {})}
          {...(temp ? { onAdd: () => app.cities.add(office.id) } : {})}
        />
      ))}
    </section>
  );
}
