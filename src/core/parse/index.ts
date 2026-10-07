import { analyse } from './grammar';
import { lex } from './lexer';
import { resolve } from './resolve';
import type { ParseContext, ParseResult } from './types';

export { dateOrderFor } from './resolve';
export type * from './types';

/** Parses a command-bar query. Synchronous, deterministic, and total: never throws. */
export function parse(input: string, ctx: ParseContext): ParseResult | null {
  if (!input.trim()) return null;
  const tokens = lex(input);
  const a = analyse(tokens);
  const unknown = a.unknown[0];
  if (unknown)
    return {
      status: 'error',
      spans: a.spans,
      diagnostic: { code: 'unknown_token', token: unknown.text },
      suggestions: [],
    };
  return resolve(a, ctx, input);
}
