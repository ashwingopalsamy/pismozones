import { CTX, parseOk } from '@core/parse/corpus';
import { parse } from '@core/parse/index';
import { NOW } from '@state/testing';
import { describe, expect, it } from 'vitest';
import { completion, sentenceModel } from './model';

const c = { now: NOW, viewerZone: 'Asia/Kolkata', hc: 'h23' as const, lang: 'en' as const };

describe('sentenceModel', () => {
  it('describes ok results with day markers and flip chips', () => {
    expect(sentenceModel(parseOk('3pm bristol to austin'), c).text).toBe(
      'Today, Wed 7 Oct · 15:00 Bristol → 09:00 Austin',
    );
    expect(sentenceModel(parseOk('tomorrow 11:30pm sp to sg'), c).text).toBe(
      'Tomorrow, Thu 8 Oct · 23:30 São Paulo → 10:30 Singapore (+1d)',
    );
    expect(sentenceModel(parseOk('meeting at 3 with sp team'), c).chips).toEqual([
      { label: 'Meant 03:00?', query: 'meeting at 03:00 with sp team' },
    ]);
    expect(sentenceModel(parseOk('sp to ist'), c).text).toBe(
      'Now · 11:22 São Paulo → 19:52 Bengaluru',
    );
  });
  it('describes errors with suggestion chips', () => {
    const r = parse('3pm brstol', CTX);
    if (!r) throw new Error('null');
    expect(sentenceModel(r, c)).toMatchObject({
      kind: 'error',
      text: 'Didn’t recognise “brstol”',
      chips: [{ label: 'Bristol', query: '3pm bristol' }],
    });
  });
  it('completes the last word with a city alias', () => {
    expect(completion('3pm bris')).toBe('3pm bristol');
    expect(completion('3pm b')).toBeNull();
    expect(completion('3pm bristol')).toBeNull();
  });
});
