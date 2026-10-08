import type { Span } from '@core/parse/types';
import styles from './CommandBar.module.css';

/** Mirrors the input text, colouring each span by the role the parser gave it. */
export function Highlight({
  text,
  spans,
  ghost,
}: {
  text: string;
  spans: readonly Span[];
  ghost: string;
}) {
  const parts: Array<{ at: number; text: string; role?: string }> = [];
  let at = 0;
  for (const s of [...spans].sort((a, b) => a.start - b.start)) {
    if (s.start > at) parts.push({ at, text: text.slice(at, s.start) });
    parts.push({ at: s.start, text: text.slice(s.start, s.end), role: s.role });
    at = s.end;
  }
  if (at < text.length) parts.push({ at, text: text.slice(at) });
  return (
    <span class={styles.highlight} aria-hidden="true">
      {parts.map((p) => (
        <span key={p.at} class={p.role ? styles[p.role] : undefined}>
          {p.text}
        </span>
      ))}
      {ghost && <span class={styles.ghost}>{ghost}</span>}
    </span>
  );
}
