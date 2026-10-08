import type { AppEnv, Scheduler } from './env';

/** Wed 7 Oct 2026 14:22 UTC — 11:22 São Paulo, 19:52 Bengaluru. */
export const NOW = Date.UTC(2026, 9, 7, 14, 22);

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  constructor(seed: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(seed)) this.data.set(k, v);
  }
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

interface Timer {
  id: number;
  at: number;
  fn: () => void;
  every?: number;
}

/** Deterministic scheduler: time moves only when a test says so. */
export class FakeScheduler implements Scheduler {
  private t: number;
  private timers: Timer[] = [];
  private visible = new Set<() => void>();
  private nextId = 1;
  constructor(start = NOW) {
    this.t = start;
  }
  now() {
    return this.t;
  }
  setTimeout(fn: () => void, ms: number) {
    const id = this.nextId++;
    this.timers.push({ id, at: this.t + Math.max(0, ms), fn });
    return id;
  }
  setInterval(fn: () => void, ms: number) {
    const id = this.nextId++;
    this.timers.push({ id, at: this.t + ms, fn, every: ms });
    return id;
  }
  clearTimeout(id: number) {
    this.timers = this.timers.filter((t) => t.id !== id);
  }
  clearInterval(id: number) {
    this.clearTimeout(id);
  }
  onVisible(fn: () => void) {
    this.visible.add(fn);
    return () => this.visible.delete(fn);
  }
  advance(ms: number) {
    const target = this.t + ms;
    for (;;) {
      const due = this.timers
        .filter((t) => t.at <= target)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      this.t = due.at;
      if (due.every) due.at += due.every;
      else this.timers = this.timers.filter((t) => t !== due);
      due.fn();
    }
    this.t = target;
  }
  setTime(ms: number) {
    this.t = ms;
  }
  fireVisible() {
    for (const fn of this.visible) fn();
  }
}

export type TestEnv = AppEnv & {
  sent: string[];
  advance(ms: number): void;
  setTime(ms: number): void;
  fireVisible(): void;
};

export function makeEnv(
  over: Partial<AppEnv> & { storageData?: Record<string, string> } = {},
): TestEnv {
  const { storageData, ...rest } = over;
  const scheduler = new FakeScheduler();
  const sent: string[] = [];
  const env: AppEnv = {
    storage: new MemoryStorage(storageData),
    viewerZone: 'Asia/Kolkata',
    languages: ['en-GB'],
    prefersDark: () => true,
    location: { pathname: '/', search: '', origin: 'http://localhost' },
    replaceUrl: () => {},
    scheduler,
    send: (body) => sent.push(body),
    appVersion: 'test',
    shareErrorFlag: false,
    ...rest,
  };
  return {
    ...env,
    sent,
    advance: (ms) => scheduler.advance(ms),
    setTime: (ms) => scheduler.setTime(ms),
    fireVisible: () => scheduler.fireVisible(),
  };
}
