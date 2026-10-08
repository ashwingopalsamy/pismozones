import { getOffice, type Office } from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import type { DecodedShare } from '@core/share/codec';
import { formatClock, formatShortDate } from '@core/time/format';
import { dayDelta } from '@core/time/relative';
import { zonedFields } from '@core/time/zoned';

/** Link-preview text, computed for the shared instant in each office's own zone (h23, like the cards). */
export function ogText(p: DecodedShare, lang: Lang): { title: string; description: string } {
  const ref = getOffice(p.refId) as Office;
  const at = zonedFields(p.instant, ref.zone);
  const title = `${formatClock(at, 'h23').hm} ${lang === 'pt-BR' ? 'em' : 'in'} ${ref.name} · ${formatShortDate(at, lang)}`;
  const others = p.officeIds.flatMap((id) => {
    const office = id === p.refId ? undefined : getOffice(id);
    if (!office) return [];
    const f = zonedFields(p.instant, office.zone);
    const d = dayDelta(f, at);
    return [
      `${formatClock(f, 'h23').hm} ${office.name}${d ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)}d)` : ''}`,
    ];
  });
  return { title, description: others.length ? others.join(' · ') : 'Pismo Zones' };
}
