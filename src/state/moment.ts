import type { OfficeId } from '@core/cities/registry';
import type { ParseResult } from '@core/parse/types';
import type { Instant } from '@core/time/types';
import { addDays, toInstant, zonedFields } from '@core/time/zoned';
import { batch, computed, type ReadonlySignal, type Signal, signal } from '@preact/signals';
import type { CitiesState } from './cities';
import type { ClockState } from './clock';
import type { Track } from './track';

export type Mode = 'live' | 'pinned' | 'preview';
export type CommitMethod =
  | 'command'
  | 'card_edit'
  | 'ruler'
  | 'plan_drag'
  | 'day_nav'
  | 'best_overlap'
  | 'keyboard'
  | 'share_link';
export type LiveMethod = 'button' | 'esc' | 'key' | 'plan';

export interface MomentState {
  /** Command-bar text; its parse is `preview`, and the two are always cleared together. */
  query: Signal<string>;
  pinned: Signal<Instant | null>;
  preview: Signal<ParseResult | null>;
  extras: Signal<OfficeId[]>;
  moment: ReadonlySignal<Instant>;
  mode: ReadonlySignal<Mode>;
  pin(
    instant: Instant,
    method: CommitMethod,
    opts?: { refId?: OfficeId; extras?: OfficeId[] },
  ): void;
  scrub(instant: Instant): void;
  endScrub(method: CommitMethod): void;
  nudge(deltaMs: number, method: CommitMethod): void;
  /** Moves by whole civil days in `zone`, keeping the wall time (23/25 h across DST). */
  shiftDay(days: number, zone: string, method: CommitMethod): void;
  backToLive(method: LiveMethod): void;
}

const QUARTER = 900_000;
export const snapQuarter = (t: Instant) => Math.round(t / QUARTER) * QUARTER;

export function createMoment(clock: ClockState, cities: CitiesState, track: Track): MomentState {
  const query = signal('');
  const pinned = signal<Instant | null>(null);
  const preview = signal<ParseResult | null>(null);
  const extras = signal<OfficeId[]>([]);
  let pinnedAt: Instant | null = null;

  const okPreview = computed(() => (preview.value?.status === 'ok' ? preview.value.intent : null));
  const moment = computed(() => {
    const p = okPreview.value;
    if (p) return p.isNow ? clock.minuteNow.value : p.instant;
    return pinned.value ?? clock.minuteNow.value;
  });
  const mode = computed<Mode>(() => {
    const p = okPreview.value;
    if (p) return p.isNow ? 'live' : 'preview';
    return pinned.value !== null ? 'pinned' : 'live';
  });

  const commit = (instant: Instant, method: CommitMethod) =>
    track('commit', {
      method,
      hoursFromNow: Math.round(((instant - clock.now.value) / 3_600_000) * 4) / 4,
    });
  const dropCommand = () =>
    batch(() => {
      preview.value = null;
      query.value = '';
    });
  // Direct manipulation supersedes a pending command, so nothing changes behind a preview.
  const setPinned = (instant: Instant) => {
    if (pinned.value === null) pinnedAt = clock.now.value;
    batch(() => {
      dropCommand();
      pinned.value = instant;
    });
  };

  return {
    query,
    pinned,
    preview,
    extras,
    moment,
    mode,
    pin(instant, method, opts) {
      setPinned(instant);
      if (opts?.refId) cities.refId.value = opts.refId;
      if (opts?.extras) extras.value = opts.extras;
      commit(instant, method);
    },
    scrub(instant) {
      setPinned(instant);
    },
    endScrub(method) {
      if (pinned.value === null) return;
      pinned.value = snapQuarter(pinned.value);
      commit(pinned.value, method);
    },
    nudge(deltaMs, method) {
      setPinned(snapQuarter(moment.value + deltaMs));
      commit(pinned.value as Instant, method);
    },
    shiftDay(days, zone, method) {
      const f = zonedFields(moment.value, zone);
      const date = addDays({ year: f.year, month: f.month, day: f.day }, days);
      setPinned(toInstant({ ...date, hour: f.hour, minute: f.minute, second: 0 }, zone).instant);
      commit(pinned.value as Instant, method);
    },
    backToLive(method) {
      const seconds = pinnedAt === null ? 0 : Math.round((clock.now.value - pinnedAt) / 1000);
      batch(() => {
        pinned.value = null;
        dropCommand();
        extras.value = [];
      });
      pinnedAt = null;
      track('back_to_live', { method, pinnedSeconds: seconds });
    },
  };
}
