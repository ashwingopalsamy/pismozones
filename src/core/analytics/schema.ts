/** First-party product events. Positional: Analytics Engine stores blobs/doubles by index. */
export const SCHEMA_VERSION = 1;

export const EVENTS = {
  session_start: {
    blobs: ['lang', 'hourCycle', 'theme', 'device', 'display', 'entry'],
    doubles: ['activeCount'],
  },
  commit: { blobs: ['method'], doubles: ['hoursFromNow'] },
  parse_outcome: { blobs: ['status', 'shape', 'code', 'abbr'], doubles: ['parseMs', 'tokens'] },
  back_to_live: { blobs: ['method'], doubles: ['pinnedSeconds'] },
  view: { blobs: ['view'], doubles: [] },
  plan_best: { blobs: [], doubles: ['working', 'total'] },
  cities_change: { blobs: ['action', 'officeId'], doubles: ['activeCount'] },
  share: { blobs: ['channel', 'version'], doubles: [] },
  share_open: { blobs: ['valid', 'version'], doubles: [] },
  share_exit: { blobs: [], doubles: ['secondsViewed'] },
  holidays_open: { blobs: ['entry'], doubles: [] },
  setting: { blobs: ['key', 'value'], doubles: [] },
  pwa: { blobs: ['outcome'], doubles: [] },
  error: { blobs: ['code', 'component'], doubles: [] },
} as const satisfies Record<string, { blobs: readonly string[]; doubles: readonly string[] }>;

export type EventName = keyof typeof EVENTS;
type Blob<E extends EventName> = (typeof EVENTS)[E]['blobs'][number];
type Double<E extends EventName> = (typeof EVENTS)[E]['doubles'][number];
export type EventProps<E extends EventName> = { [K in Blob<E>]: string } & {
  [K in Double<E>]: number;
};

export interface WireEvent {
  n: EventName;
  b: string[];
  d: number[];
  /** Milliseconds since the session started. */
  t: number;
}

export interface WireBatch {
  v: 1;
  /** Random per-page-load id, memory only. */
  s: string;
  /** App version. */
  a: string;
  e: WireEvent[];
}

const MAX_EVENTS = 50;
const BLOB = /^[\w .:+\-−>?/]{0,64}$/u;
const ID = /^[0-9a-z.-]{1,32}$/i;

export function toWire<E extends EventName>(n: E, p: EventProps<E>, t: number): WireEvent {
  const spec = EVENTS[n];
  const props = p as Record<string, string | number>;
  return {
    n,
    b: spec.blobs.map((k) => String(props[k] ?? '')),
    d: spec.doubles.map((k) => Number(props[k] ?? 0)),
    t,
  };
}

const isEventName = (n: unknown): n is EventName =>
  typeof n === 'string' && Object.hasOwn(EVENTS, n);

/** Strict allow-list validation shared by the client and the Worker. */
export function validateBatch(x: unknown): WireBatch | null {
  if (!x || typeof x !== 'object') return null;
  const b = x as Partial<WireBatch>;
  if (
    b.v !== SCHEMA_VERSION ||
    typeof b.s !== 'string' ||
    !ID.test(b.s) ||
    typeof b.a !== 'string' ||
    !ID.test(b.a)
  )
    return null;
  if (!Array.isArray(b.e) || b.e.length < 1 || b.e.length > MAX_EVENTS) return null;
  for (const e of b.e as unknown[]) {
    if (!e || typeof e !== 'object') return null;
    const ev = e as Partial<WireEvent>;
    if (!isEventName(ev.n)) return null;
    const spec = EVENTS[ev.n];
    if (!Array.isArray(ev.b) || ev.b.length !== spec.blobs.length) return null;
    if (!ev.b.every((s) => typeof s === 'string' && BLOB.test(s))) return null;
    if (!Array.isArray(ev.d) || ev.d.length !== spec.doubles.length) return null;
    if (!ev.d.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
    if (typeof ev.t !== 'number' || !Number.isFinite(ev.t) || ev.t < 0) return null;
  }
  return b as WireBatch;
}
