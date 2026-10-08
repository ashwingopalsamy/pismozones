import {
  ANCHOR,
  DEFAULT_ACTIVE,
  getOffice,
  type OfficeId,
  officeForZone,
} from '@core/cities/registry';
import type { Lang } from '@core/i18n';
import type { HourCycle } from '@core/time/format';

export interface Prefs {
  hourCycle: 'auto' | HourCycle;
  theme: 'system' | 'dark' | 'light';
  lang: 'auto' | Lang;
}

export interface Persisted {
  schema: 1;
  activeIds: OfficeId[];
  refId: OfficeId | null;
  prefs: Prefs;
  history: string[];
}

export const STORAGE_KEY = 'pz:v1';
const LEGACY = {
  cities: 'pismo-active-cities',
  theme: 'pismo-theme',
  explicit: 'pismo-theme-explicit',
} as const;
const HISTORY_MAX = 20;

const isOffice = (id: unknown): id is OfficeId =>
  typeof id === 'string' && getOffice(id) !== undefined;
const uniqueOffices = (ids: unknown): OfficeId[] =>
  Array.isArray(ids) ? [...new Set(ids.filter(isOffice))] : [];

export function defaultPersisted(viewerZone: string): Persisted {
  const viewer = officeForZone(viewerZone)?.id;
  const activeIds = [...DEFAULT_ACTIVE];
  if (viewer && !activeIds.includes(viewer)) activeIds.push(viewer);
  return {
    schema: 1,
    activeIds,
    refId: null,
    prefs: { hourCycle: 'auto', theme: 'system', lang: 'auto' },
    history: [],
  };
}

function read(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function sanitize(raw: unknown, viewerZone: string): Persisted {
  const base = defaultPersisted(viewerZone);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Record<keyof Persisted, unknown>> & {
    prefs?: Partial<Record<keyof Prefs, unknown>>;
  };
  const uniq = uniqueOffices(r.activeIds);
  const saved = uniq.length ? uniq : base.activeIds;
  // São Paulo can never be removed, whatever storage says.
  const activeIds = saved.includes(ANCHOR) ? saved : [ANCHOR, ...saved];
  const p = r.prefs ?? {};
  return {
    schema: 1,
    activeIds,
    // The reference is always a visible card; a temporary one doesn't survive a reload.
    refId: isOffice(r.refId) && activeIds.includes(r.refId) ? r.refId : null,
    prefs: {
      hourCycle: p.hourCycle === 'h12' || p.hourCycle === 'h23' ? p.hourCycle : 'auto',
      theme: p.theme === 'dark' || p.theme === 'light' ? p.theme : 'system',
      lang: p.lang === 'en' || p.lang === 'pt-BR' ? p.lang : 'auto',
    },
    history: Array.isArray(r.history)
      ? r.history.filter((q): q is string => typeof q === 'string').slice(0, HISTORY_MAX)
      : [],
  };
}

function migrateLegacy(storage: Storage | null, viewerZone: string): Persisted | null {
  const cities = read(storage, LEGACY.cities);
  const theme = read(storage, LEGACY.theme);
  if (cities === null && theme === null) return null;
  const p = defaultPersisted(viewerZone);
  try {
    const ids = uniqueOffices(JSON.parse(cities ?? 'null'));
    if (ids.length) p.activeIds = ids;
  } catch {
    // Unreadable legacy list: keep defaults.
  }
  if ((theme === 'dark' || theme === 'light') && read(storage, LEGACY.explicit) === 'true')
    p.prefs.theme = theme;
  try {
    for (const key of Object.values(LEGACY)) storage?.removeItem(key);
  } catch {
    // Ignore: migration is best-effort.
  }
  savePersisted(storage, p);
  return p;
}

/** Never throws: corrupt or inaccessible storage yields defaults. Migrates the pre-revamp keys once. */
export function loadPersisted(storage: Storage | null, viewerZone: string): Persisted {
  const current = read(storage, STORAGE_KEY);
  if (current !== null) {
    try {
      return sanitize(JSON.parse(current), viewerZone);
    } catch {
      return defaultPersisted(viewerZone);
    }
  }
  return migrateLegacy(storage, viewerZone) ?? defaultPersisted(viewerZone);
}

export function savePersisted(storage: Storage | null, p: Persisted): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Quota or privacy mode: the app keeps working in memory.
  }
}
