import {
  type EventName,
  type EventProps,
  toWire,
  type WireBatch,
  type WireEvent,
} from '@core/analytics/schema';
import type { AppEnv } from './env';

const FLUSH_EVERY = 60_000;
const MAX_BUFFER = 50;

export type TrackFn = <E extends EventName>(name: E, props: EventProps<E>) => void;

function randomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Buffers events in memory and ships them in one beacon per minute / page hide. No cookies, no storage. */
export function createTracker(env: Pick<AppEnv, 'send' | 'scheduler' | 'appVersion'>): {
  track: TrackFn;
  flush(): void;
  sessionId: string;
} {
  const sessionId = randomId();
  const started = env.scheduler.now();
  let buffer: WireEvent[] = [];
  const flush = () => {
    if (!buffer.length) return;
    const batch: WireBatch = { v: 1, s: sessionId, a: env.appVersion, e: buffer };
    buffer = [];
    try {
      env.send(JSON.stringify(batch));
    } catch {
      // Analytics must never break the app.
    }
  };
  env.scheduler.setInterval(flush, FLUSH_EVERY);
  return {
    sessionId,
    flush,
    track(name, props) {
      buffer.push(toWire(name, props, Math.max(0, env.scheduler.now() - started)));
      if (buffer.length >= MAX_BUFFER) flush();
    },
  };
}
