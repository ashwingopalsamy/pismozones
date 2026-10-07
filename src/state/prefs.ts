import type { Lang } from '@core/i18n';
import { type HourCycle, resolveHourCycle } from '@core/time/format';
import { computed, type ReadonlySignal, type Signal, signal } from '@preact/signals';
import type { AppEnv } from './env';
import type { Prefs } from './storage';

export interface PrefsState {
  prefs: Signal<Prefs>;
  lang: ReadonlySignal<Lang>;
  locale: ReadonlySignal<string>;
  hourCycle: ReadonlySignal<HourCycle>;
  theme: ReadonlySignal<'dark' | 'light'>;
  /** Updated by the app when the OS colour scheme changes. */
  systemDark: Signal<boolean>;
  set<K extends keyof Prefs>(key: K, value: Prefs[K]): void;
}

export function createPrefs(
  initial: Prefs,
  env: Pick<AppEnv, 'languages' | 'prefersDark'>,
): PrefsState {
  const prefs = signal(initial);
  const systemDark = signal(env.prefersDark());
  const first = env.languages[0] ?? 'en-GB';
  const locale = computed(() => first);
  const lang = computed<Lang>(() => {
    const p = prefs.value.lang;
    if (p !== 'auto') return p;
    return first.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
  });
  const hourCycle = computed(() => resolveHourCycle(prefs.value.hourCycle, locale.value));
  const theme = computed<'dark' | 'light'>(() => {
    const t = prefs.value.theme;
    if (t !== 'system') return t;
    return systemDark.value ? 'dark' : 'light';
  });
  return {
    prefs,
    lang,
    locale,
    hourCycle,
    theme,
    systemDark,
    set: (key, value) => {
      prefs.value = { ...prefs.value, [key]: value };
    },
  };
}
