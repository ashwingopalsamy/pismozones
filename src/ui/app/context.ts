import type { AppState } from '@state/index';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { type Key, type Params, translate } from '../i18n';

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const app = useContext(AppContext);
  if (!app) throw new Error('useApp() outside <AppContext.Provider>');
  return app;
}

/** Translator bound to the current language; reading it subscribes the component to language changes. */
export function useT(): (key: Key, params?: Params) => string {
  const lang = useApp().prefs.lang.value;
  return (key, params) => translate(lang, key, params);
}
