import { normalize } from '../text/normalize';

export type TokenKind =
  | 'word'
  | 'number'
  | 'clock'
  | 'meridiem'
  | 'hmark'
  | 'isodate'
  | 'numdate'
  | 'offset'
  | 'arrow'
  | 'comma'
  | 'dash'
  | 'amp'
  | 'punct';

export interface Token {
  kind: TokenKind;
  text: string;
  start: number;
  end: number;
  value?: number | [number, number] | [number, number, number];
}

const ISODATE = /^(\d{4})-(\d{2})-(\d{2})(?!\d)/;
const NUMDATE = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?!\d)/;
const CLOCK = /^(\d{1,2})[:.h](\d{2})(?!\d)/i;
const NUMBER = /^\d+/;
const ATTACHED_MERIDIEM = /^(a\.m\.|p\.m\.|am|pm|a|p)(?![\p{L}])/iu;
const HMARK = /^h(?![p{L}\d])/i;
const OFFSET = /^(?:utc|gmt)([+−-])(\d{1,2})(?::?(\d{2}))?(?!\d)/i;
const ARROW = /^(→|->|=>)/;
const WORD = /^[\p{L}][\p{L}'_/]*(?:[.-][\p{L}][\p{L}'_/]*)*/u;
const PUNCT = /^[.?!;:()"'@]/;
const STANDALONE_MERIDIEM = new Set(['am', 'pm', 'a.m', 'p.m', 'a.m.', 'p.m.']);

/** Single left-to-right scan; every non-space code point ends up in exactly one token. */
export function lex(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const push = (kind: TokenKind, len: number, value?: Token['value'], text?: string) => {
    const raw = input.slice(i, i + len);
    const token: Token = { kind, text: text ?? normalize(raw), start: i, end: i + len };
    if (value !== undefined) token.value = value;
    out.push(token);
    i += len;
  };

  while (i < input.length) {
    const rest = input.slice(i);
    if (/^\s/.test(rest)) {
      i++;
      continue;
    }
    const iso = ISODATE.exec(rest);
    if (iso) {
      push('isodate', iso[0].length, [Number(iso[1]), Number(iso[2]), Number(iso[3])]);
      continue;
    }
    const nd = NUMDATE.exec(rest);
    if (nd) {
      const v: [number, number] | [number, number, number] = nd[3]
        ? [Number(nd[1]), Number(nd[2]), Number(nd[3])]
        : [Number(nd[1]), Number(nd[2])];
      push('numdate', nd[0].length, v);
      continue;
    }
    const clock = CLOCK.exec(rest);
    if (clock) {
      push('clock', clock[0].length, [Number(clock[1]), Number(clock[2])]);
      afterTime();
      continue;
    }
    const num = NUMBER.exec(rest);
    if (num) {
      push('number', num[0].length, Number(num[0]));
      if (!afterTime() && HMARK.test(input.slice(i))) push('hmark', 1);
      continue;
    }
    const off = OFFSET.exec(rest);
    if (off) {
      const minutes = Number(off[2]) * 60 + Number(off[3] ?? 0);
      push('offset', off[0].length, off[1] === '+' ? minutes : -minutes);
      continue;
    }
    const arrow = ARROW.exec(rest);
    if (arrow) {
      push('arrow', arrow[0].length, undefined, '→');
      continue;
    }
    const ch = rest[0];
    if (ch === ',') push('comma', 1);
    else if (ch === '&') push('amp', 1);
    else if (ch === '-' || ch === '–') push('dash', 1, undefined, '-');
    else {
      const word = WORD.exec(rest);
      if (word) {
        const text = normalize(word[0]);
        if (STANDALONE_MERIDIEM.has(text))
          push('meridiem', word[0].length, undefined, text[0] === 'a' ? 'am' : 'pm');
        else push('word', word[0].length);
      } else if (PUNCT.test(rest)) push('punct', 1);
      else push('word', (rest.codePointAt(0) ?? 0) > 0xffff ? 2 : 1);
    }
  }
  return out;

  /** Consumes a meridiem glued to the preceding number/clock ("3pm", "3:15p"). */
  function afterTime(): boolean {
    const m = ATTACHED_MERIDIEM.exec(input.slice(i));
    if (!m) return false;
    push('meridiem', m[0].length, undefined, m[0].toLowerCase()[0] === 'a' ? 'am' : 'pm');
    return true;
  }
}
