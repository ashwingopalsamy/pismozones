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
  /** São Paulo's full-width hero card. */
  hero?: boolean;
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
  hero = false,
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
        hero && styles.hero,
      )}
      data-hero={hero || undefined}
      style={{ height: `${box.h}px` }}
      aria-label={t('card.a11y', { city: m.name, time, day, state, offset: m.offsetLabel })}
    >
      <div
        class={styles.sky}
        style={{
          background: `linear-gradient(180deg, ${m.sky.top} 0%, ${m.sky.mid} 58%, ${m.sky.bottom} 100%)`,
        }}
      />
      {m.glow && (
        <div
          class={styles.glow}
          style={`opacity:${m.glow.alpha.toFixed(3)};background:radial-gradient(circle ${Math.round(
            Math.min(m.glow.r * box.w, box.h * 2.4),
          )}px at ${(m.glow.x * 100).toFixed(1)}% ${(m.glow.y * 100).toFixed(1)}%, ${m.glow.color}, transparent)`}
        />
      )}
      {m.stars.length > 0 && (
        <div class={styles.stars}>
          {m.stars.map((s) => (
            <i
              key={`${s.x}:${s.y}`}
              class={cx(styles.star, s.bright && styles.bright)}
              style={`left:${s.x.toFixed(2)}%;top:${s.y.toFixed(2)}%;width:${s.r}px;height:${s.r}px;--o:${s.o.toFixed(3)};--amp:${s.amp.toFixed(2)};--dur:${s.dur.toFixed(2)}s;--delay:${s.delay.toFixed(2)}s`}
            />
          ))}
          {m.shooting && (
            <i
              class={styles.meteor}
              style={`left:${m.shooting.x.toFixed(1)}%;top:${m.shooting.y.toFixed(1)}%;--cycle:${m.shooting.cycle.toFixed(1)}s;--delay:${m.shooting.delay.toFixed(1)}s`}
            />
          )}
        </div>
      )}
      <div class={styles.scrim} />
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
            <span>{hero ? `${day} · ${m.hours}` : day}</span>
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
