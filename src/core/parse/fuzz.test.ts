import fc from 'fast-check';
import { expect, it } from 'vitest';
import { CTX } from './corpus';
import { parse } from './index';

it('never throws and accounts for every non-space character', () => {
  const words = fc
    .array(
      fc.constantFrom(
        '3pm',
        'sp',
        'to',
        'ist',
        'tomorrow',
        '-',
        '→',
        ',',
        '15:00',
        'brt',
        'cst',
        'oct',
        '12/10',
        '😀',
        '99',
        'in',
        '2',
        'hours',
        '?',
      ),
    )
    .map((a) => a.join(' '));
  fc.assert(
    fc.property(
      fc.oneof(fc.string({ maxLength: 500 }), fc.string({ unit: 'binary', maxLength: 80 }), words),
      (input) => {
        const r = parse(input, CTX);
        if (r === null) {
          expect(input.trim()).toBe('');
          return;
        }
        const covered = new Set<number>();
        for (const s of r.spans) for (let i = s.start; i < s.end; i++) covered.add(i);
        for (let i = 0; i < input.length; i++)
          if (!/\s/.test(input[i] as string)) expect(covered.has(i)).toBe(true);
      },
    ),
    { numRuns: 2000 },
  );
});
