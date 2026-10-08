import { describe, expect, it } from 'vitest';
import { parseClockInput } from './clock';

describe('parseClockInput', () => {
  it('reads typed clock times with the same bias as the command bar', () => {
    expect(parseClockInput('1530')).toEqual({ hour: 15, minute: 30, biased: false });
    expect(parseClockInput('930')).toEqual({ hour: 9, minute: 30, biased: false });
    expect(parseClockInput('3:30p')).toEqual({ hour: 15, minute: 30, biased: false });
    expect(parseClockInput('3')).toEqual({ hour: 15, minute: 0, biased: true });
    expect(parseClockInput('9')).toEqual({ hour: 9, minute: 0, biased: true });
    expect(parseClockInput('03:30')).toEqual({ hour: 3, minute: 30, biased: false });
    expect(parseClockInput('noon')).toEqual({ hour: 12, minute: 0, biased: false });
    expect(parseClockInput('24:00')).toBeNull();
    expect(parseClockInput('abc')).toBeNull();
  });
});
