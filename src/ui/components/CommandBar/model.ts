import { getOffice } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import { PLACE_ALIASES } from '@core/parse/lexicon';
import type { Notice, ParseResult, PlaceRef, Suggestion } from '@core/parse/types';
import { normalize } from '@core/text/normalize';
import { formatClock, formatShortDate, type HourCycle } from '@core/time/format';
import { dayDelta, relativeDay } from '@core/time/relative';
import type { Instant } from '@core/time/types';
import { zonedFields } from '@core/time/zoned';
import { type Key, translate } from '../../i18n';

export interface SentenceModel {
  kind: 'ok' | 'error' | 'ambiguous';
  text: string;
  chips: Array<{ label: string; query: string }>;
  notes: string[];
}

interface Ctx {
  now: Instant;
  viewerZone: string;
  hc: HourCycle;
  lang: Lang;
}

const zoneOf = (p: PlaceRef) => (p.kind === 'zone' ? p.zone : (getOffice(p.id)?.zone ?? 'UTC'));
const nameOf = (p: PlaceRef) => (p.kind === 'zone' ? p.label : (getOffice(p.id)?.name ?? p.id));
const clockText = (h: number, m: number, hc: HourCycle) => {
  const c = formatClock({ hour: h, minute: m }, hc);
  return c.period ? `${c.hm} ${c.period}` : c.hm;
};

export function suggestionLabel(s: Suggestion, hc: HourCycle): string {
  const d = s.display;
  if (d.kind === 'office') return getOffice(d.id)?.name ?? d.id;
  if (d.kind === 'zone') return d.label;
  if (d.kind === 'clock') return clockText(d.hour, d.minute, hc);
  return d.text;
}

function noteFor(n: Notice, lang: Lang, ref: string): string | null {
  const p = n.params ?? {};
  switch (n.code) {
    case 'hour_bias':
      return null;
    case 'implicit_source':
      return translate(lang, 'notice.implicit_source', { place: ref });
    case 'ist_is_india':
      return translate(lang, 'notice.ist_is_india');
    case 'dst_gap':
      return translate(lang, 'notice.dst_gap', {
        time: String(p.time ?? ''),
        shown: String(p.shown ?? ''),
      });
    case 'dst_overlap':
      return translate(lang, 'notice.dst_overlap', { time: String(p.time ?? '') });
  }
}

export function sentenceModel(r: ParseResult, ctx: Ctx): SentenceModel {
  const t = (k: Key, params?: Record<string, string | number>) => translate(ctx.lang, k, params);
  if (r.status !== 'ok') {
    const d = r.diagnostic;
    const token =
      d.code.startsWith('abbreviation') || d.code.startsWith('ambiguous')
        ? (d.token ?? '').toUpperCase()
        : (d.token ?? '');
    const list = r.status === 'ambiguous' ? r.options : r.suggestions;
    return {
      kind: r.status,
      text: t(`diag.${d.code}`, { ...d.params, token }),
      chips: list.map((s) => ({ label: suggestionLabel(s, ctx.hc), query: s.query })),
      notes: [],
    };
  }
  const { intent } = r;
  const viewer = zonedFields(ctx.now, ctx.viewerZone);
  const src = zonedFields(intent.instant, zoneOf(intent.source));
  const rel = relativeDay(src, viewer);
  const head = intent.isNow
    ? t('sentence.now')
    : `${rel ? `${t(`day.${rel}`)}, ` : ''}${formatShortDate(src, ctx.lang)}`;
  const dests = intent.destinations.map((d) => {
    const f = zonedFields(intent.instant, zoneOf(d));
    const delta = dayDelta(f, src);
    return `${clockText(f.hour, f.minute, ctx.hc)} ${nameOf(d)}${delta > 0 ? ' (+1d)' : delta < 0 ? ' (−1d)' : ''}`;
  });
  const text = `${head} · ${clockText(src.hour, src.minute, ctx.hc)} ${nameOf(intent.source)}${dests.length ? ` → ${dests.join(' · ')}` : ''}`;
  const chips = r.notices.flatMap((n) => {
    if (!n.alternative) return [];
    const label =
      n.code === 'hour_bias'
        ? t('notice.hour_bias', { alt: suggestionLabel(n.alternative, ctx.hc) })
        : suggestionLabel(n.alternative, ctx.hc);
    return [{ label, query: n.alternative.query }];
  });
  const notes = r.notices.flatMap((n) => {
    const s = noteFor(n, ctx.lang, nameOf(intent.source));
    return s ? [s] : [];
  });
  return { kind: 'ok', text, chips, notes };
}

const ALIASES = [...PLACE_ALIASES.keys()]
  .filter((a) => a.length > 2)
  .sort((a, b) => a.length - b.length);

/** Completes the final word to the shortest city alias it prefixes, e.g. "3pm bris" → "3pm bristol". */
export function completion(query: string): string | null {
  const m = /(\S+)$/.exec(query);
  if (!m) return null;
  const word = normalize(m[1] as string);
  if (word.length < 2) return null;
  const hit = ALIASES.find((a) => a.startsWith(word) && a !== word);
  return hit ? query.slice(0, m.index) + hit : null;
}
