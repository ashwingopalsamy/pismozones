import { useApp, useT } from '../../app/context';
import { setQuery } from './actions';
import styles from './CommandBar.module.css';
import { sentenceModel } from './model';

/** The preview sentence, notes and suggestion chips under (or above) the command bar. */
export function Sentence() {
  const app = useApp();
  const t = useT();
  const r = app.preview.value;
  if (!r) return null;
  const s = sentenceModel(r, {
    now: app.clock.minuteNow.value,
    viewerZone: app.env.viewerZone,
    hc: app.prefs.hourCycle.value,
    lang: app.prefs.lang.value,
  });
  return (
    <div class={`${styles.sentence} ${s.kind !== 'ok' ? styles.err : ''}`}>
      <span>{s.text}</span>
      {s.kind === 'ok' && r.status === 'ok' && !r.intent.isNow && (
        <span class={styles.enter}>{t('moment.previewHint')}</span>
      )}
      {s.notes.map((n) => (
        <span key={n} class={styles.note}>
          {n}
        </span>
      ))}
      {s.chips.length > 0 && (
        <span class={styles.chips}>
          {s.chips.map((c) => (
            <button
              key={c.query}
              type="button"
              class={styles.chip}
              onClick={() => setQuery(app, c.query)}
            >
              {c.label}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
