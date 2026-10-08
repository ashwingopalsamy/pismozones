import type { Token } from './lexer';
import { PLACE_ALIASES } from './lexicon';
import type { PlaceRef, Suggestion, SuggestionDisplay } from './types';

/** Optimal-string-alignment Damerau–Levenshtein distance. */
export function damerauLevenshtein(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) (d[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const row = d[i] as number[];
      const up = d[i - 1] as number[];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(
        (up[j] as number) + 1,
        (row[j - 1] as number) + 1,
        (up[j - 1] as number) + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        row[j] = Math.min(row[j] as number, ((d[i - 2] as number[])[j - 2] as number) + 1);
    }
  return (d[a.length] as number[])[b.length] as number;
}

export function displayFor(ref: PlaceRef): SuggestionDisplay {
  return ref.kind === 'office'
    ? { kind: 'office', id: ref.id }
    : { kind: 'zone', zone: ref.zone, label: ref.label };
}

const sameRef = (x: PlaceRef, y: PlaceRef) =>
  x.kind === 'office'
    ? y.kind === 'office' && x.id === y.id
    : y.kind === 'zone' && x.zone === y.zone;

/** The query with one token's characters replaced. */
export function replaceToken(
  input: string,
  t: { start: number; end: number },
  text: string,
): string {
  return input.slice(0, t.start) + text + input.slice(t.end);
}

/** Up to three place aliases within edit distance 2 of an unknown word, best first. */
export function placeSuggestions(input: string, token: Token): Suggestion[] {
  const scored: Array<{ alias: string; ref: PlaceRef; dist: number }> = [];
  for (const [alias, ref] of PLACE_ALIASES) {
    if (alias.length < 3) continue;
    const dist = damerauLevenshtein(token.text, alias);
    if (dist <= 2) scored.push({ alias, ref, dist });
  }
  scored.sort((x, y) => x.dist - y.dist || x.alias.length - y.alias.length);
  const out: Suggestion[] = [];
  for (const s of scored) {
    if (out.length === 3) break;
    if (
      out.some(
        (o) =>
          o.display.kind !== 'clock' &&
          o.display.kind !== 'text' &&
          sameRef(refOf(o.display), s.ref),
      )
    )
      continue;
    out.push({ query: replaceToken(input, token, s.alias), display: displayFor(s.ref) });
  }
  return out;
}

function refOf(d: Extract<SuggestionDisplay, { kind: 'office' | 'zone' }>): PlaceRef {
  return d.kind === 'office'
    ? { kind: 'office', id: d.id }
    : { kind: 'zone', zone: d.zone, label: d.label };
}

/** First alias that names a zone place, for suggesting a city instead of an abbreviation. */
export function aliasForZone(zone: string): string | undefined {
  for (const [alias, ref] of PLACE_ALIASES)
    if (ref.kind === 'zone' && ref.zone === zone && alias.length > 2) return alias;
  return undefined;
}
