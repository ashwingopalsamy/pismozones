import { describe, expect, it } from 'vitest';
import { lex } from './lexer';

const kinds = (s: string) => lex(s).map((t) => [t.kind, t.text]);

describe('lex', () => {
  it('splits attached meridiems and clocks', () => {
    expect(kinds('3pm')).toEqual([
      ['number', '3'],
      ['meridiem', 'pm'],
    ]);
    expect(kinds('3:15PM')).toEqual([
      ['clock', '3:15'],
      ['meridiem', 'pm'],
    ]);
    expect(kinds('3.15pm')).toEqual([
      ['clock', '3.15'],
      ['meridiem', 'pm'],
    ]);
    expect(kinds('15h30')).toEqual([['clock', '15h30']]);
    expect(kinds('9h')).toEqual([
      ['number', '9'],
      ['hmark', 'h'],
    ]);
    expect(kinds('1530')).toEqual([['number', '1530']]);
  });
  it('dates, offsets and punctuation', () => {
    expect(kinds('2026-10-12')).toEqual([['isodate', '2026-10-12']]);
    expect(kinds('12/10')).toEqual([['numdate', '12/10']]);
    expect(kinds('utc+5:30')).toEqual([['offset', 'utc+5:30']]);
    expect(kinds('a→b, c & d 9-5')).toEqual([
      ['word', 'a'],
      ['arrow', '→'],
      ['word', 'b'],
      ['comma', ','],
      ['word', 'c'],
      ['amp', '&'],
      ['word', 'd'],
      ['number', '9'],
      ['dash', '-'],
      ['number', '5'],
    ]);
  });
  it('treats sentence punctuation as punctuation, not words', () => {
    expect(kinds('bristol?')).toEqual([
      ['word', 'bristol'],
      ['punct', '?'],
    ]);
    expect(kinds('meio-dia')).toEqual([['word', 'meio-dia']]);
  });
  it('normalises text but keeps original offsets', () => {
    const t = lex('  SÃO Paulo');
    expect(t[0]).toMatchObject({ kind: 'word', text: 'sao', start: 2, end: 5 });
    expect(t[1]).toMatchObject({ kind: 'word', text: 'paulo', start: 6, end: 11 });
  });
  it('keeps an emoji as one token covering both UTF-16 units', () => {
    expect(lex('😀')).toEqual([{ kind: 'word', text: '😀', start: 0, end: 2 }]);
  });
});
