import type { OfficeId } from '@core/cities/registry';
import { decodeShare } from '@core/share/codec';
import type { Instant } from '@core/time/types';
import type { AppEnv } from './env';

export interface SharedView {
  instant: Instant;
  refId: OfficeId;
  officeIds: OfficeId[];
  version: 1 | 2;
  openedAt: Instant;
}

export interface Boot {
  view: 'zones' | 'plan';
  panel: 'holidays' | null;
  entry: 'direct' | 'share' | 'shortcut';
  shareInvalid: boolean;
}

/** Reads the URL exactly once, before anything can rewrite it, then normalises it to "/". */
export function bootFromLocation(env: AppEnv): { boot: Boot; shared: SharedView | null } {
  const { pathname, search } = env.location;
  const params = new URLSearchParams(search);
  const boot: Boot = {
    view: 'zones',
    panel: null,
    entry: 'direct',
    shareInvalid: env.shareErrorFlag,
  };
  let shared: SharedView | null = null;

  const match = /^\/s\/([^/]+)\/?$/.exec(pathname);
  if (match) {
    const decoded = decodeShare(decodeURIComponent(match[1] as string));
    if (decoded) {
      shared = { ...decoded, openedAt: env.scheduler.now() };
      boot.entry = 'share';
    } else {
      boot.shareInvalid = true;
    }
  }
  if (params.get('view') === 'plan') {
    boot.view = 'plan';
    boot.entry = 'shortcut';
  }
  if (params.get('panel') === 'holidays') {
    boot.panel = 'holidays';
    boot.entry = 'shortcut';
  }
  if (pathname !== '/' || search) env.replaceUrl('/');
  return { boot, shared };
}
