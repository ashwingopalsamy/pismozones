import { getOffice } from '../cities/registry';
import { formatOffset } from '../time/format';
import { offsetMinutes, zonedFields } from '../time/zoned';
import type { Analysis } from './grammar';
import { SEASONAL_ABBR } from './lexicon';
import { pickSource, resolve, resolveDate, zoneOf } from './resolve';
import { aliasForZone, displayFor, placeSuggestions, replaceToken } from './suggest';
import type { Diagnostic, ParseContext, ParseResult, PlaceRef, Suggestion } from './types';

const MAX_DESTINATIONS = 6;

const error = (
  a: Analysis,
  diagnostic: Diagnostic,
  suggestions: Suggestion[] = [],
): ParseResult => ({
  status: 'error',
  spans: a.spans,
  diagnostic,
  suggestions,
});

/** Returns the first problem with a query, in precedence order, or null when it can resolve. */
export function diagnose(a: Analysis, ctx: ParseContext, input: string): ParseResult | null {
  if (a.recurrence) return error(a, { code: 'recurrence_unsupported', token: a.recurrence.text });
  if (a.range || a.times.length > 1) return error(a, { code: 'range_unsupported' });
  if (a.times.some((t) => t.invalid)) return error(a, { code: 'invalid_time' });

  const { sourceRef, destinations } = pickSource(a, ctx);
  const base = zonedFields(ctx.now, zoneOf(sourceRef));
  if (a.dates.some((d) => resolveDate(d, base, ctx.locale) === null))
    return error(a, { code: 'invalid_date' });

  for (const p of a.places) {
    const s = p.abbr ? SEASONAL_ABBR[p.abbr] : undefined;
    if (s?.ambiguousWith) {
      const office = s.office ? getOffice(s.office) : undefined;
      const usRef: PlaceRef = office
        ? { kind: 'office', id: office.id }
        : { kind: 'zone', zone: s.zone, label: s.label };
      const usAlias = office?.aliases[0] ?? aliasForZone(s.zone) ?? s.zone;
      const other = s.ambiguousWith;
      const otherAlias =
        other.kind === 'zone'
          ? (aliasForZone(other.zone) ?? other.zone)
          : (getOffice(other.id)?.aliases[0] ?? '');
      return {
        status: 'ambiguous',
        spans: a.spans,
        diagnostic: { code: 'ambiguous_abbreviation', token: p.abbr as string },
        options: [
          { query: replaceToken(input, p, usAlias), display: displayFor(usRef) },
          { query: replaceToken(input, p, otherAlias), display: displayFor(other) },
        ],
      };
    }
  }

  const unknown = a.unknown[0];
  if (!unknown && a.places.some((p) => p.abbr && SEASONAL_ABBR[p.abbr])) {
    const resolved = resolve(a, ctx, input);
    if (resolved.status === 'ok') {
      for (const p of a.places) {
        const s = p.abbr ? SEASONAL_ABBR[p.abbr] : undefined;
        if (!s) continue;
        const actual = offsetMinutes(resolved.intent.instant, s.zone);
        if (actual === s.offset) continue;
        const office = s.office ? getOffice(s.office) : undefined;
        const cityAlias = office?.aliases[0] ?? aliasForZone(s.zone);
        const cityRef: PlaceRef = office
          ? { kind: 'office', id: office.id }
          : { kind: 'zone', zone: s.zone, label: s.label };
        const fixed = s.offset === 0 ? 'utc' : formatOffset(s.offset).toLowerCase();
        const suggestions: Suggestion[] = [];
        if (cityAlias)
          suggestions.push({
            query: replaceToken(input, p, cityAlias),
            display: displayFor(cityRef),
          });
        suggestions.push({
          query: replaceToken(input, p, fixed),
          display: { kind: 'zone', zone: formatOffset(s.offset), label: formatOffset(s.offset) },
        });
        return error(
          a,
          {
            code: 'abbreviation_out_of_season',
            token: p.abbr as string,
            params: { place: office?.name ?? s.label, actual: formatOffset(actual) },
          },
          suggestions,
        );
      }
    }
  }

  if (unknown)
    return error(
      a,
      { code: 'unknown_token', token: unknown.text },
      placeSuggestions(input, unknown),
    );
  if (destinations.length > MAX_DESTINATIONS) return error(a, { code: 'too_many_destinations' });
  if (a.dates.length && !a.times.length && !a.duration) return error(a, { code: 'missing_time' });
  if (!a.places.length && !a.times.length && !a.dates.length && !a.duration)
    return error(a, { code: 'nothing_to_convert' });
  return null;
}
