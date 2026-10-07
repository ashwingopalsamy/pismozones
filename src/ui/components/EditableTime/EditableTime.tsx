import type { Office } from '@core/cities/registry';
import { parseClockInput } from '@core/parse/clock';
import { toInstant, zonedFields } from '@core/time/zoned';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import styles from './EditableTime.module.css';

const HOUR = 3_600_000;
const QUARTER = 900_000;
const pad = (n: number) => String(n).padStart(2, '0');

export interface EditableTimeProps {
  office: Office;
  phone: boolean;
  /** `refocus`: the editor closed from the keyboard, so focus returns to the card. */
  onDone(refocus: boolean): void;
}

/** Inline editor for a card's time: type "1530", "3:30p", "noon"; arrows nudge; Enter commits. */
export function EditableTime({ office, phone, onDone }: EditableTimeProps) {
  const app = useApp();
  const t = useT();
  const local = () => {
    const f = zonedFields(app.moment.value, office.zone);
    return `${pad(f.hour)}:${pad(f.minute)}`;
  };
  const [text, setText] = useState(local);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  const parsed = parseClockInput(text);
  const hint = !parsed
    ? t('edit.invalid')
    : parsed.biased
      ? t('edit.biased', {
          time: `${pad(parsed.hour)}:${pad(parsed.minute)}`,
          alt: `${pad((parsed.hour + 12) % 24)}:${pad(parsed.minute)}`,
        })
      : t('edit.hint');

  const nudge = (delta: number) => {
    app.cities.refId.value = office.id;
    app.nudge(delta, 'card_edit');
    setText(local());
  };
  const shiftDay = (days: number) => {
    app.cities.refId.value = office.id;
    app.shiftDay(days, office.zone, 'card_edit');
    setText(local());
  };
  const commit = () => {
    if (!parsed) return;
    const date = zonedFields(app.moment.value, office.zone);
    const { instant } = toInstant(
      { ...date, hour: parsed.hour, minute: parsed.minute, second: 0 },
      office.zone,
    );
    app.pin(instant, 'card_edit', { refId: office.id });
    onDone(true);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? HOUR : QUARTER;
    const actions: Record<string, () => void> = {
      Enter: commit,
      Escape: () => onDone(true),
      ArrowUp: () => nudge(step),
      ArrowDown: () => nudge(-step),
      PageUp: () => shiftDay(1),
      PageDown: () => shiftDay(-1),
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };
  const onBlur = (e: FocusEvent) => {
    if (box.current?.contains(e.relatedTarget as Node | null)) return;
    onDone(false);
  };
  // Chips never take focus: WebKit doesn't focus tapped buttons, so the input's blur would close
  // the editor before the click lands. (Preventing pointerdown instead would cancel the tap.)
  const keepFocus = (e: MouseEvent) => e.preventDefault();

  return (
    <div class={styles.edit} ref={box} onFocusOut={onBlur}>
      <input
        ref={input}
        class={styles.input}
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        autoComplete="off"
        spellcheck={false}
        aria-label={t('card.edit', { city: office.name })}
        aria-describedby={`hint-${office.id}`}
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        onKeyDown={onKeyDown}
      />
      <span id={`hint-${office.id}`} class={styles.hint} aria-live="polite">
        {hint}
      </span>
      {phone && (
        <div class={styles.chips}>
          {(
            [
              ['edit.earlier1h', () => nudge(-HOUR)],
              ['edit.earlier15', () => nudge(-QUARTER)],
              ['edit.later15', () => nudge(QUARTER)],
              ['edit.later1h', () => nudge(HOUR)],
              ['edit.nextDay', () => shiftDay(1)],
            ] as const
          ).map(([key, act]) => (
            <button
              key={key}
              type="button"
              class={styles.chip}
              onMouseDown={keepFocus}
              onClick={act}
            >
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
