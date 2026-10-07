import type { Office } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import { formatClock, formatShortDate, type HourCycle } from '@core/time/format';
import { formatDelta, relativeDay } from '@core/time/relative';
import type { Instant } from '@core/time/types';
import { zonedFields } from '@core/time/zoned';
import type { Mode } from '@state/moment';
import { translate } from '../../i18n';

export interface PillModel {
  main: string;
  sub: string;
  tone: Mode;
}

export function momentPillModel(
  mode: Mode,
  moment: Instant,
  now: Instant,
  ref: Office,
  viewerZone: string,
  hc: HourCycle,
  lang: Lang,
): PillModel {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  const viewer = zonedFields(now, viewerZone);
  if (mode === 'preview')
    return { main: t('moment.preview'), sub: t('moment.previewHint'), tone: 'preview' };
  if (mode === 'live')
    return {
      main: t('moment.live'),
      sub: `${t('day.today')}, ${formatShortDate(viewer, lang)}`,
      tone: 'live',
    };
  const f = zonedFields(moment, ref.zone);
  const rel = relativeDay(f, viewer);
  const clock = formatClock(f, hc);
  const delta = formatDelta(moment - now);
  return {
    main: delta === 'Now' ? t('moment.now') : delta,
    sub: `${rel ? t(`day.${rel}`) : formatShortDate(f, lang)} · ${clock.period ? `${clock.hm} ${clock.period}` : clock.hm} ${ref.name}`,
    tone: 'pinned',
  };
}
