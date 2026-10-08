import { getOffice, type Office, type OfficeId } from '@core/cities/registry';
import { encodeShare } from '@core/share/codec';
import type { Instant } from '@core/time/types';
import { batch, computed, effect, type ReadonlySignal, type Signal, signal } from '@preact/signals';
import { type CitiesState, createCities } from './cities';
import { type ClockState, createClock } from './clock';
import type { AppEnv } from './env';
import { createHistory } from './history';
import { createMoment, type MomentState } from './moment';
import { createPrefs, type PrefsState } from './prefs';
import { type Boot, bootFromLocation, type SharedView } from './shareOverlay';
import { loadPersisted, savePersisted } from './storage';
import type { Track } from './track';

export type { Boot, SharedView } from './shareOverlay';

export interface AppState extends MomentState {
  env: AppEnv;
  clock: ClockState;
  cities: CitiesState;
  prefs: PrefsState;
  history: ReturnType<typeof createHistory>;
  overlay: Signal<SharedView | null>;
  boot: Boot;
  /** The office whose zone typed times are read in: preview source ▸ chosen reference. */
  reference: ReadonlySignal<Office>;
  displayed: ReadonlySignal<Array<{ office: Office; temp: boolean }>>;
  view: Signal<'zones' | 'plan'>;
  track: Track;
  exitOverlay(): void;
  shareUrl(): string;
  start(): () => void;
}

export function createAppState(env: AppEnv, track: Track = () => {}): AppState {
  const persisted = loadPersisted(env.storage, env.viewerZone);
  const clock = createClock(env.scheduler);
  const cities = createCities(
    { activeIds: persisted.activeIds, refId: persisted.refId },
    env.viewerZone,
    track,
  );
  const prefs = createPrefs(persisted.prefs, env);
  const history = createHistory(persisted.history);
  const m = createMoment(clock, cities, track);
  const { boot, shared } = bootFromLocation(env);
  const overlay = signal<SharedView | null>(shared);
  const view = signal(boot.view);

  // The shared view borrows the reference and pins its instant; both are restored on exit.
  const stashedRef = cities.refId.value;
  const homeRef = () =>
    stashedRef && cities.activeIds.value.includes(stashedRef) ? stashedRef : null;
  if (shared) {
    cities.refId.value = shared.refId;
    m.scrub(shared.instant);
  }
  if (shared || boot.shareInvalid)
    track('share_open', {
      valid: shared ? 'yes' : 'no',
      version: shared ? String(shared.version) : '?',
    });

  const reference = computed(() => {
    const p = m.preview.value;
    if (p?.status === 'ok' && p.intent.source.kind === 'office') {
      const office = getOffice(p.intent.source.id);
      if (office) return office;
    }
    return cities.defaultRef.value;
  });

  const displayed = computed(() => {
    const active = cities.activeIds.value;
    const base: OfficeId[] = overlay.value ? overlay.value.officeIds : active;
    const p = m.preview.value;
    const previewDests =
      p?.status === 'ok'
        ? p.intent.destinations.flatMap((d) => (d.kind === 'office' ? [d.id] : []))
        : [];
    const ids = [...new Set<OfficeId>([...base, ...m.extras.value, ...previewDests])];
    return ids.flatMap((id) => {
      const office = getOffice(id);
      return office ? [{ office, temp: !active.includes(id) }] : [];
    });
  });

  const exitOverlay = () => {
    const o = overlay.value;
    if (!o) return;
    batch(() => {
      overlay.value = null;
      cities.refId.value = homeRef();
      m.pinned.value = null;
      m.preview.value = null;
      m.query.value = '';
      m.extras.value = [];
    });
    track('share_exit', { secondsViewed: Math.round((env.scheduler.now() - o.openedAt) / 1000) });
  };

  return {
    ...m,
    env,
    clock,
    cities,
    prefs,
    history,
    overlay,
    boot,
    reference,
    displayed,
    view,
    track,
    exitOverlay,
    shareUrl() {
      const instant: Instant = Math.floor(m.moment.value / 60_000) * 60_000;
      const token = encodeShare({
        instant,
        refId: reference.value.id,
        officeIds: displayed.value.map((d) => d.office.id),
      });
      return `${env.location.origin}/s/${token}`;
    },
    start() {
      const stopClock = clock.start();
      // The user's own edits persist even inside a shared view; the view's borrowed reference doesn't.
      const stopPersist = effect(() => {
        savePersisted(env.storage, {
          schema: 1,
          activeIds: cities.activeIds.value,
          refId: overlay.value ? homeRef() : cities.refId.value,
          prefs: prefs.prefs.value,
          history: history.items.value,
        });
      });
      return () => {
        stopClock();
        stopPersist();
      };
    },
  };
}
