import { describe, expect, it } from 'vitest';
import { getOffice } from '../cities/registry';
import { workState } from './policy';

const U = Date.UTC;
const o = (id: string) => {
  const office = getOffice(id);
  if (!office) throw new Error(id);
  return office;
};

describe('workState', () => {
  it('classifies a normal weekday', () => {
    expect(workState(U(2026, 9, 7, 15), o('saopaulo'))).toEqual({ kind: 'working' });
    expect(workState(U(2026, 9, 9, 12, 30), o('austin')).kind).toBe('early'); // 07:30 CDT
    expect(workState(U(2026, 9, 8, 14), o('bangalore')).kind).toBe('late'); // 19:30 IST
    expect(workState(U(2026, 9, 8, 14), o('singapore')).kind).toBe('off'); // 22:00 SGT
  });
  it('weekends and holidays', () => {
    expect(workState(U(2026, 9, 10, 15), o('austin')).kind).toBe('weekend');
    const h = workState(U(2026, 9, 12, 15), o('saopaulo'));
    expect(h.kind).toBe('holiday');
    expect(h.holiday?.name.en).toBe('Our Lady of Aparecida');
    expect(workState(U(2026, 9, 11, 23), o('sydney')).kind).toBe('working'); // Mon 12 Oct 10:00 AEDT; no calendar
  });
  it('Friday evening in Austin is Saturday in Singapore', () => {
    const t = U(2026, 9, 9, 23);
    expect(workState(t, o('austin')).kind).toBe('late'); // Fri 18:00 CDT
    expect(workState(t, o('singapore')).kind).toBe('weekend'); // Sat 07:00 SGT
  });
  it('Ash Wednesday starts at 14:00 in São Paulo', () => {
    expect(workState(U(2026, 1, 18, 14), o('saopaulo'))).toMatchObject({
      kind: 'off',
      halfDay: { kind: 'half' },
    }); // 11:00
    expect(workState(U(2026, 1, 18, 16), o('saopaulo'))).toMatchObject({
      kind: 'early',
      halfDay: { kind: 'half' },
    }); // 13:00
    expect(workState(U(2026, 1, 18, 17, 30), o('saopaulo'))).toMatchObject({
      kind: 'working',
      halfDay: { kind: 'half' },
    }); // 14:30
  });
});
