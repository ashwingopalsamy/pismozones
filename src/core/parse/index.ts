import { diagnose } from './diagnose';
import { analyse } from './grammar';
import { lex } from './lexer';
import { resolve } from './resolve';
import type { ParseContext, ParseResult } from './types';

export { parseClockInput } from './clock';
export { dateOrderFor } from './resolve';
export { damerauLevenshtein } from './suggest';
export type * from './types';

/** Parses a command-bar query. Synchronous, deterministic, and total: never throws. */
export function parse(input: string, ctx: ParseContext): ParseResult | null {
  if (!input.trim()) return null;
  const a = analyse(lex(input));
  return diagnose(a, ctx, input) ?? resolve(a, ctx, input);
}
