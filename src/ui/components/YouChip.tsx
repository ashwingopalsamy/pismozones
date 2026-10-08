import { sameZone } from '@core/cities/registry';
import { formatClock } from '@core/time/format';
import { zonedFields } from '@core/time/zoned';
import { useApp, useT } from '../app/context';

/** Shown when no displayed card is in the viewer's zone. */
export function YouChip({ class: className }: { class?: string | undefined }) {
  const app = useApp();
  const t = useT();
  if (app.displayed.value.some((d) => sameZone(d.office.zone, app.env.viewerZone))) return null;
  const c = formatClock(
    zonedFields(app.clock.minuteNow.value, app.env.viewerZone),
    app.prefs.hourCycle.value,
  );
  return (
    <span class={className}>
      {t('you.chip', { time: c.period ? `${c.hm} ${c.period}` : c.hm })}
    </span>
  );
}
