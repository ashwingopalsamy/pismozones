import { describe, expect, it } from 'vitest';
import { en } from './en';
import { type Key, translate } from './index';
import { ptBR } from './pt-BR';

describe('i18n', () => {
  it('interpolates params', () => {
    expect(translate('en', 'plan.best', { range: '11:00–14:00', n: 3, total: 5 })).toBe(
      'Best overlap 11:00–14:00 · 3 of 5 working',
    );
    expect(translate('pt-BR', 'state.early', { time: '09:00' })).toBe('Começa às 09:00');
    expect(translate('en', 'diag.unknown_token', { token: 'brstol' })).toBe(
      'Didn’t recognise “brstol”',
    );
  });
  it('pt-BR has every key and keeps every placeholder', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of Object.keys(en) as Key[]) expect(ph(ptBR[k]), k).toEqual(ph(en[k]));
  });
});
