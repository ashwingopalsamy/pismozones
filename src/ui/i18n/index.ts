import type { Lang } from '@core/i18n';
import { en } from './en';
import { ptBR } from './pt-BR';

export type Key = keyof typeof en;
export type Params = Record<string, string | number>;

const DICTS: Record<Lang, Record<Key, string>> = { en, 'pt-BR': ptBR };

export function translate(lang: Lang, key: Key, params?: Params): string {
  const text = DICTS[lang][key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  );
}
