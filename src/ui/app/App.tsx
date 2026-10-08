import type { OfficeId } from '@core/cities/registry';
import { useEffect, useErrorBoundary, useRef, useState } from 'preact/hooks';
import { toast } from '../components/Toast/store';
import { Toast } from '../components/Toast/Toast';
import { translate } from '../i18n';
import { announcement } from './announce';
import { useApp } from './context';
import { ErrorFallback } from './ErrorFallback';
import type { Install } from './install';
import { lazyComponent } from './lazy';
import { type LayoutActions, PhoneLayout } from './PhoneLayout';
import { shareCurrent } from './share';
import { handleShortcut } from './shortcuts';
import { UpdatePrompt } from './UpdatePrompt';
import { WideLayout } from './WideLayout';

// Sheets load right after the entry (they render closed at mount), keeping the first paint lean.
const SettingsSheet = lazyComponent(() =>
  import('../components/SettingsSheet/SettingsSheet').then((m) => m.SettingsSheet),
);
const CitiesSheet = lazyComponent(() =>
  import('../components/CitiesSheet/CitiesSheet').then((m) => m.CitiesSheet),
);
const HolidaysSheet = lazyComponent(() =>
  import('../components/HolidaysSheet/HolidaysSheet').then((m) => m.HolidaysSheet),
);
const ShortcutsSheet = lazyComponent(() =>
  import('./ShortcutsSheet').then((m) => m.ShortcutsSheet),
);

const WIDE = '(min-width: 768px)';
const THEME_COLORS = { dark: '#000000', light: '#f2f2f5' } as const;

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? true);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const on = () => setMatches(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return matches;
}

type SheetName = 'settings' | 'cities' | 'holidays' | 'shortcuts' | null;

export function App({ install }: { install?: Install }) {
  const app = useApp();
  const [error] = useErrorBoundary((err: unknown) => {
    app.track('error', { code: err instanceof Error ? err.name : 'unknown', component: 'App' });
  });
  const wide = useMedia(WIDE);
  const [sheet, setSheet] = useState<SheetName>(app.boot.panel === 'holidays' ? 'holidays' : null);
  const [holidayFocus, setHolidayFocus] = useState<
    { officeId: OfficeId; date: string } | undefined
  >();
  const [holidayEntry, setHolidayEntry] = useState<'header' | 'chip'>('header');
  const command = useRef<HTMLInputElement>(null);
  const lang = app.prefs.lang.value;
  const theme = app.prefs.theme.value;
  const explicit = app.prefs.prefs.value.theme;

  useEffect(() => {
    if (app.boot.shareInvalid) toast.show(translate(lang, 'shared.invalid'), 3200);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mql) return;
    const on = () => {
      app.prefs.systemDark.value = mql.matches;
    };
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (explicit === 'system') delete root.dataset.theme;
    else root.dataset.theme = explicit;
    root.lang = lang === 'pt-BR' ? 'pt-BR' : 'en';
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
      meta.content =
        explicit === 'system'
          ? meta.media.includes('light')
            ? THEME_COLORS.light
            : THEME_COLORS.dark
          : THEME_COLORS[theme];
  }, [explicit, theme, lang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet) return;
      if (
        handleShortcut(e, app, {
          focusCommand: () => command.current?.focus(),
          openShortcuts: () => setSheet('shortcuts'),
        })
      )
        e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet]);

  if (error) return <ErrorFallback />;

  const actions: LayoutActions = {
    openSettings: () => setSheet('settings'),
    openCities: () => setSheet('cities'),
    openHolidays: (focus) => {
      setHolidayFocus(focus);
      setHolidayEntry(focus ? 'chip' : 'header');
      setSheet('holidays');
    },
    share: () =>
      void shareCurrent(app, navigator, window.matchMedia?.('(pointer: coarse)').matches ?? false),
  };
  const close = () => setSheet(null);

  return (
    <>
      {wide ? (
        <WideLayout actions={actions} commandRef={command} />
      ) : (
        <PhoneLayout actions={actions} />
      )}
      <SettingsSheet
        open={sheet === 'settings'}
        onClose={close}
        onOpenCities={() => setSheet('cities')}
        onOpenHolidays={() => actions.openHolidays()}
        {...(install ? { install } : {})}
      />
      <CitiesSheet open={sheet === 'cities'} onClose={close} />
      <HolidaysSheet
        open={sheet === 'holidays'}
        onClose={close}
        entry={holidayEntry}
        focus={holidayFocus}
      />
      <ShortcutsSheet open={sheet === 'shortcuts'} onClose={close} />
      <Toast />
      <UpdatePrompt />
      <div class="sr-only" role="status" aria-live="polite">
        {announcement.value}
      </div>
    </>
  );
}
