export interface Scheduler {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  setInterval(fn: () => void, ms: number): number;
  clearInterval(id: number): void;
  /** Calls fn whenever the page becomes visible again; returns an unsubscribe. */
  onVisible(fn: () => void): () => void;
}

/** Everything the state layer needs from the outside world, injected so tests stay deterministic. */
export interface AppEnv {
  storage: Storage | null;
  viewerZone: string;
  languages: readonly string[];
  prefersDark(): boolean;
  location: { pathname: string; search: string; hash?: string; origin: string };
  replaceUrl(path: string): void;
  scheduler: Scheduler;
  send(body: string): void;
  appVersion: string;
  shareErrorFlag: boolean;
}

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    s.getItem('pz:v1');
    return s;
  } catch {
    return null;
  }
}

function viewerZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function browserEnv(): AppEnv {
  return {
    storage: safeStorage(),
    viewerZone: viewerZone(),
    languages: navigator.languages?.length ? navigator.languages : [navigator.language || 'en-GB'],
    prefersDark: () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true,
    location: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      origin: location.origin,
    },
    replaceUrl: (path) => history.replaceState(history.state, '', path),
    scheduler: {
      now: () => Date.now(),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id),
      setInterval: (fn, ms) => window.setInterval(fn, ms),
      clearInterval: (id) => window.clearInterval(id),
      onVisible: (fn) => {
        const handler = () => {
          if (document.visibilityState === 'visible') fn();
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
      },
    },
    send: (body) => {
      if (!navigator.sendBeacon?.('/e', body))
        void fetch('/e', { method: 'POST', body, keepalive: true }).catch(() => {});
    },
    appVersion: import.meta.env.VITE_APP_VERSION ?? 'dev',
    shareErrorFlag: document.documentElement.dataset.shareError === '1',
  };
}
