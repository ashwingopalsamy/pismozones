import { describe, expect, it } from 'vitest';
import { nextTransition } from './transitions';

const U = Date.UTC;

describe('nextTransition', () => {
  it('finds the next offset change to the minute', () => {
    expect(nextTransition(U(2026, 9, 7, 12), 'Europe/London', 30)).toEqual({
      at: U(2026, 9, 25, 1),
      fromOffset: 60,
      toOffset: 0,
    });
    expect(nextTransition(U(2026, 8, 20), 'Australia/Sydney', 30)).toEqual({
      at: U(2026, 9, 3, 16),
      fromOffset: 600,
      toOffset: 660,
    });
    expect(nextTransition(U(2026, 9, 7), 'America/Chicago', 60)).toEqual({
      at: U(2026, 10, 1, 7),
      fromOffset: -300,
      toOffset: -360,
    });
    expect(nextTransition(U(2026, 9, 7), 'America/Sao_Paulo', 365)).toBeNull();
  });
});
