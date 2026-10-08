import type { Span, SpanRole } from './types';

const LETTER: Record<SpanRole, string> = {
  time: 'T',
  date: 'D',
  place: 'P',
  connector: '>',
  duration: 'N',
  unknown: '?',
  filler: '',
};

/** Free-text-free summary of a query for analytics, e.g. "3pm bristol to austin" → "TP>P". */
export function shapeOf(spans: readonly Span[]): string {
  let out = '';
  for (const s of [...spans].sort((a, b) => a.start - b.start)) {
    const c = LETTER[s.role];
    if (!c || (c !== 'P' && out.endsWith(c))) continue;
    out += c;
  }
  return out.slice(0, 32);
}
