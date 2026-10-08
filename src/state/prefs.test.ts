import { describe, expect, it } from 'vitest';
import { createPrefs } from './prefs';
import { defaultPersisted } from './storage';

describe('prefs', () => {
  it('resolves language, locale and hour cycle', () => {
    const pt = createPrefs(defaultPersisted('UTC').prefs, {
      languages: ['pt-PT'],
      prefersDark: () => false,
    });
    expect([pt.lang.value, pt.hourCycle.value, pt.theme.value]).toEqual(['pt-BR', 'h23', 'light']);
    const us = createPrefs(defaultPersisted('UTC').prefs, {
      languages: ['en-US'],
      prefersDark: () => true,
    });
    expect([us.lang.value, us.hourCycle.value, us.theme.value]).toEqual(['en', 'h12', 'dark']);
    us.set('hourCycle', 'h23');
    expect(us.hourCycle.value).toBe('h23');
  });
});
