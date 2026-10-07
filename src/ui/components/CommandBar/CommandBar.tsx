import { forwardRef } from 'preact/compat';
import { useRef, useState } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import { Icon } from '../Icon';
import { commitQuery, escapeQuery, setQuery } from './actions';
import styles from './CommandBar.module.css';
import { Highlight } from './Highlight';
import { completion } from './model';
import { Sentence } from './Sentence';

export interface CommandBarProps {
  placement: 'top' | 'dock';
  /** Render the preview sentence under the bar (default: only for 'top'). */
  sentence?: boolean;
}

export const CommandBar = forwardRef<HTMLInputElement, CommandBarProps>(function CommandBar(
  { placement, sentence = placement === 'top' },
  ref,
) {
  const app = useApp();
  const t = useT();
  const mirror = useRef<HTMLDivElement>(null);
  const [historyAt, setHistoryAt] = useState(-1);
  const text = app.query.value;
  const r = app.preview.value;
  const done = completion(text);
  const ghost = done ? done.slice(text.length) : '';

  const onKeyDown = (e: KeyboardEvent) => {
    const items = app.history.items.value;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (commitQuery(app)) setHistoryAt(-1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      escapeQuery(app);
      setHistoryAt(-1);
    } else if (e.key === 'Tab' && done && !e.shiftKey) {
      e.preventDefault();
      setQuery(app, done);
    } else if (
      (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
      (!text || historyAt >= 0) &&
      items.length
    ) {
      e.preventDefault();
      const next = e.key === 'ArrowUp' ? Math.min(historyAt + 1, items.length - 1) : historyAt - 1;
      setHistoryAt(next);
      setQuery(app, next >= 0 ? (items[next] ?? '') : '');
    }
  };

  return (
    <div class={`${styles.wrap} ${styles[placement]}`}>
      <label class={styles.bar}>
        <Icon name="search" size={18} />
        <div class={styles.field}>
          <div class={styles.mirror} ref={mirror}>
            <Highlight text={text} spans={r?.spans ?? []} ghost={ghost} />
          </div>
          <input
            ref={ref}
            class={styles.input}
            type="text"
            aria-label={t('command.label')}
            placeholder={t('command.placeholder')}
            enterKeyHint="go"
            autoComplete="off"
            autoCapitalize="off"
            spellcheck={false}
            value={text}
            onInput={(e) => {
              setHistoryAt(-1);
              setQuery(app, e.currentTarget.value);
            }}
            onScroll={(e) => {
              if (mirror.current) mirror.current.scrollLeft = e.currentTarget.scrollLeft;
            }}
            onKeyDown={onKeyDown}
          />
        </div>
        {text && (
          <button
            type="button"
            class={styles.clear}
            aria-label={t('command.clear')}
            onClick={() => setQuery(app, '')}
          >
            <Icon name="close" size={15} />
          </button>
        )}
      </label>
      {sentence && <Sentence />}
    </div>
  );
});
