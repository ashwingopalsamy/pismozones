import type { ComponentChildren } from 'preact';
import { useT } from '../../app/context';
import { LiveSeconds } from '../LiveSeconds';
import type { CardBox, CardModel } from './model';
import styles from './ZoneCard.module.css';

export interface ZoneCardProps {
  model: CardModel;
  live: boolean;
  editable: boolean;
  box: CardBox;
  onEdit?: () => void;
  onAdd?: () => void;
  onHoliday?: () => void;
  /** Replaces the time display (inline editor). */
  editor?: ComponentChildren;
}

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

export function ZoneCard({
  model: m,
  live,
  editable,
  box,
  onEdit,
  onAdd,
  onHoliday,
  editor,
}: ZoneCardProps) {
  const t = useT();
  const day = m.relDay ? t(`day.${m.relDay}`) : m.dateLabel;
  const time = m.clock.period ? `${m.clock.hm} ${m.clock.period}` : m.clock.hm;
  const state = t(m.stateLabel.key, m.stateLabel.params);
  const chipClass = cx(styles.chip, styles[m.state.kind]);
  const timeBody = (
    <span class={styles.time}>
      <span key={m.clock.hm} class={live ? styles.roll : undefined}>
        {m.clock.hm}
      </span>
      {live && <LiveSeconds class={styles.sec} />}
      {m.clock.period && <span class={styles.period}>{m.clock.period}</span>}
    </span>
  );

  return (
    <article
      class={cx(
        styles.card,
        m.isRef && styles.ref,
        m.tags.includes('temp') && styles.temp,
        box.h > 130 && styles.large,
      )}
      style={{ height: `${box.h}px` }}
      aria-label={t('card.a11y', { city: m.name, time, day, state, offset: m.offsetLabel })}
    >
      <div
        class={styles.sky}
        style={{
          background: `linear-gradient(180deg, ${m.sky.top} 0%, ${m.sky.mid} 58%, ${m.sky.bottom} 100%)`,
        }}
      />
      {m.stars.length > 0 && (
        <div class={styles.stars}>
          {m.stars.map((s) => (
            <i
              key={`${s.x}:${s.y}`}
              class={styles.star}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.r}px`,
                height: `${s.r}px`,
                opacity: s.o,
              }}
            />
          ))}
        </div>
      )}
      <div class={styles.scrim} />
      <svg
        class={styles.arc}
        viewBox={`0 0 ${box.w} ${box.h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path class={styles.horizon} d={`M0 ${m.path.horizonY} L${box.w} ${m.path.horizonY}`} />
        <path class={styles.below} d={m.path.below} />
        <path class={styles.above} d={m.path.above} />
        <path
          class={styles.work}
          d={`M${m.path.workX[0].toFixed(1)} ${m.path.horizonY} L${m.path.workX[1].toFixed(1)} ${m.path.horizonY}`}
        />
      </svg>
      <div
        class={cx(styles.sun, !m.sun.up && styles.down)}
        style={{ left: `${m.sun.xPct}%`, top: `${m.sun.yPct}%` }}
      />
      <div class={styles.content}>
        <div class={styles.row}>
          <div class={styles.title}>
            <span class={styles.city}>{m.name}</span>
            {m.tags.map((tag) => (
              <span key={tag} class={styles.tag}>
                {t(`tag.${tag}`)}
              </span>
            ))}
            {onAdd && (
              <button type="button" class={styles.add} onClick={onAdd}>
                {t('tag.add')}
              </button>
            )}
          </div>
          {onHoliday && m.state.kind === 'holiday' ? (
            <button type="button" class={chipClass} onClick={onHoliday}>
              <i class={styles.dot} />
              {state}
            </button>
          ) : (
            <span class={chipClass}>
              <i class={styles.dot} />
              {state}
            </span>
          )}
        </div>
        <div class={cx(styles.row, styles.end)}>
          {editor ??
            (editable ? (
              <button
                type="button"
                class={styles.timeBtn}
                data-edit={m.id}
                onClick={onEdit}
                aria-label={t('card.edit', { city: m.name })}
              >
                {timeBody}
              </button>
            ) : (
              timeBody
            ))}
          <div class={styles.meta}>
            <span>{day}</span>
            <span class={styles.mono}>
              {m.transition
                ? t('card.clocksChange', {
                    from: m.transition.fromLabel,
                    to: m.transition.toLabel,
                    date: m.transition.dateLabel,
                  })
                : m.offsetLabel}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
