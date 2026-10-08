import type { Instant } from '@core/time/types';
import { computed, type ReadonlySignal, type Signal, signal } from '@preact/signals';
import type { Scheduler } from './env';

export interface ClockState {
  /** 1 Hz. Only the seconds text may subscribe. */
  now: Signal<Instant>;
  /** Changes once per minute; drives everything else. */
  minuteNow: ReadonlySignal<Instant>;
  start(): () => void;
}

export function createClock(s: Scheduler): ClockState {
  const now = signal(s.now());
  const minuteNow = computed(() => Math.floor(now.value / 60_000) * 60_000);
  const tick = () => {
    now.value = s.now();
  };
  return {
    now,
    minuteNow,
    start() {
      let interval = 0;
      const first = s.setTimeout(
        () => {
          tick();
          interval = s.setInterval(tick, 1000);
        },
        1000 - (s.now() % 1000),
      );
      const offVisible = s.onVisible(tick);
      return () => {
        s.clearTimeout(first);
        s.clearInterval(interval);
        offVisible();
      };
    },
  };
}
