import { CANONICAL_ORIGIN } from '@core/site';

/** Where the app is running: the Cloudflare Worker (canonical), the Vercel mirror, or a dev server. */
export type HostKind = 'cloudflare' | 'vercel' | 'local';

export function hostKind(hostname: string): HostKind {
  if (hostname.endsWith('.vercel.app')) return 'vercel';
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost'))
    return 'local';
  return 'cloudflare';
}

/** Product events always land in the Cloudflare Worker's /e (cross-origin from the Vercel mirror). */
export const eventsUrl = (kind: HostKind) => (kind === 'vercel' ? `${CANONICAL_ORIGIN}/e` : '/e');

export const shareOrigin = (kind: HostKind, origin: string) =>
  kind === 'local' ? origin : CANONICAL_ORIGIN;
