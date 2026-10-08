import { formatClock, formatShortDate } from '@core/time/format';
import { zonedFields } from '@core/time/zoned';
import type { AppState } from '@state/index';
import { toast } from '../components/Toast/store';
import { translate } from '../i18n';

/** "Thu 8 Oct 15:00 Bristol" for the current moment and reference. */
export function momentLabel(app: AppState): string {
  const ref = app.reference.value;
  const f = zonedFields(app.moment.value, ref.zone);
  const c = formatClock(f, app.prefs.hourCycle.value);
  return `${formatShortDate(f, app.prefs.lang.value)} ${c.period ? `${c.hm} ${c.period}` : c.hm} ${ref.name}`;
}

/** Native share sheet on touch devices, clipboard elsewhere. */
export async function shareCurrent(
  app: AppState,
  nav: Pick<Navigator, 'share' | 'clipboard'>,
  coarse: boolean,
): Promise<'native' | 'clipboard' | 'failed'> {
  const url = app.shareUrl();
  const label = momentLabel(app);
  try {
    if (coarse && nav.share) {
      await nav.share({ url, title: `Pismo Zones · ${label}` });
      app.track('share', { channel: 'native', version: '2' });
      return 'native';
    }
    await nav.clipboard.writeText(url);
    toast.show(translate(app.prefs.lang.value, 'share.copied', { label }));
    app.track('share', { channel: 'clipboard', version: '2' });
    return 'clipboard';
  } catch {
    return 'failed';
  }
}
