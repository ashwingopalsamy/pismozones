import { getOffice, type OfficeId } from '@core/cities/registry';
import { KNOWN_TZ_ABBRS } from '@core/parse/abbreviations';
import { parse } from '@core/parse/index';
import { shapeOf } from '@core/parse/shape';
import type { ParseResult } from '@core/parse/types';
import type { AppState } from '@state/index';
import { announce } from '../../app/announce';
import { translate } from '../../i18n';
import { sentenceModel } from './model';

let lastParseMs = 0;

/** Sets the command text and its live preview. Synchronous: the preview always matches the text. */
export function setQuery(app: AppState, text: string) {
  app.query.value = text;
  if (!text.trim()) {
    app.preview.value = null;
    return;
  }
  const started = performance.now();
  app.preview.value = parse(text, {
    now: app.clock.minuteNow.value,
    referenceId: app.homeRef.value.id,
    locale: app.prefs.locale.value,
  });
  lastParseMs = performance.now() - started;
}

function outcome(app: AppState, r: ParseResult) {
  const unknown =
    r.status === 'error' && r.diagnostic.code === 'unknown_token' ? (r.diagnostic.token ?? '') : '';
  app.track('parse_outcome', {
    status: r.status,
    shape: shapeOf(r.spans),
    code: r.status === 'ok' ? '' : r.diagnostic.code,
    abbr: KNOWN_TZ_ABBRS.has(unknown) ? unknown : '',
    parseMs: Math.round(lastParseMs * 100) / 100,
    tokens: r.spans.length,
  });
}

/** Enter: commits an ok preview (pins, or returns to live for "now" queries). Errors do nothing. */
export function commitQuery(app: AppState): boolean {
  const r = app.preview.value;
  if (r?.status !== 'ok') return false;
  const { intent } = r;
  const active = app.cities.activeIds.value;
  const extras = intent.destinations.flatMap((d): OfficeId[] =>
    d.kind === 'office' && !active.includes(d.id) ? [d.id] : [],
  );
  const refId = intent.source.kind === 'office' ? intent.source.id : undefined;
  outcome(app, r);
  app.history.remember(app.query.value);
  if (intent.isNow) {
    app.backToLive('key');
    app.extras.value = extras;
    if (refId) app.cities.refId.value = refId;
  } else {
    app.pin(intent.instant, 'command', { ...(refId ? { refId } : {}), extras });
  }
  const s = sentenceModel(r, {
    now: app.clock.minuteNow.value,
    viewerZone: app.env.viewerZone,
    hc: app.prefs.hourCycle.value,
    lang: app.prefs.lang.value,
  });
  announce(s.text);
  setQuery(app, '');
  return true;
}

/** Esc: clears a non-empty query (reporting the abandon); on an empty one, returns to live. */
export function escapeQuery(app: AppState) {
  const r = app.preview.value;
  if (app.query.value.trim()) {
    if (r) outcome(app, r);
    setQuery(app, '');
    return;
  }
  app.backToLive('esc');
  announce(translate(app.prefs.lang.value, 'moment.live'));
}

export const officeName = (id: OfficeId) => getOffice(id)?.name ?? id;
