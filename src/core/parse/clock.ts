import { analyse } from './grammar';
import { lex } from './lexer';
import { biasHour } from './resolve';

/** Reads a typed clock time ("1530", "3:30p", "noon", "3") for inline card editing. */
export function parseClockInput(
  text: string,
): { hour: number; minute: number; biased: boolean } | null {
  const a = analyse(lex(text));
  const time = a.times[0];
  if (!time || a.times.length > 1 || time.invalid) return null;
  if (a.unknown.length || a.places.length || a.dates.length || a.duration || a.range) return null;
  const { hour } = biasHour(time, false);
  return { hour, minute: time.minute, biased: time.biasable };
}
