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
  const { pathname, search, hash = '' } = env.location;
  const params = new URLSearchParams(search);
  const boot: Boot = {
    view: 'zones',
    panel: null,
    entry: 'direct',
    shareInvalid: env.shareErrorFlag,
  };
  let shared: SharedView | null = null;

  // Tokens are [0-9a-z.] only, so they are never percent-decoded: a mangled escape is just invalid.
  // The old app also opened `/?share=<v1>` (where its /s/ page redirected) and `#<v1>`.
  const hashToken = hash.length > 1 ? hash.slice(1) : null;
  const token = /^\/s\/([^/]+)\/?$/.exec(pathname)?.[1] ?? params.get('share');
  const decoded = decodeShare(token ?? hashToken ?? '');
  if (decoded) {
    shared = { ...decoded, openedAt: env.scheduler.now() };
    boot.entry = 'share';
  } else if (token !== null) {
    // An unrelated #fragment is not a broken share link.
    boot.shareInvalid = true;
  }
  if (params.get('view') === 'plan') {
    boot.view = 'plan';
    boot.entry = 'shortcut';
  }
  if (params.get('panel') === 'holidays') {
    boot.panel = 'holidays';
    boot.entry = 'shortcut';
  }
  if (pathname !== '/' || search || hash) env.replaceUrl('/');
  return { boot, shared };
}
