import { describe, expect, it } from 'vitest';
import { normalize } from './normalize';

describe('normalize', () => {
  it('strips diacritics, lowercases and collapses whitespace', () => {
    expect(normalize('  SÃO   Paulo ')).toBe('sao paulo');
    expect(normalize('Bogotá')).toBe('bogota');
  });
});
