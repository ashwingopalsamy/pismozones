import { describe, expect, it } from 'vitest';
import type { CalendarId } from '../../cities/registry';
import { easterSunday, holidayOn, upcomingHolidays } from './index';

const on = (id: CalendarId, s: string) => {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return holidayOn(id, { year: y, month: m, day: d });
};

describe('holidays', () => {
  it('computes Easter', () => {
    expect(easterSunday(2024)).toEqual({ year: 2024, month: 3, day: 31 });
    expect(easterSunday(2026)).toEqual({ year: 2026, month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ year: 2027, month: 3, day: 28 });
  });
  it('São Paulo', () => {
    expect(on('br-sp', '2026-02-17')?.name.pt).toBe('Carnaval');
    expect(on('br-sp', '2026-02-18')).toMatchObject({
      kind: 'half',
      name: { en: 'Ash Wednesday', pt: 'Quarta-feira de Cinzas' },
    });
    expect(on('br-sp', '2026-04-03')?.name.en).toBe('Good Friday');
    expect(on('br-sp', '2026-06-04')?.name.en).toBe('Corpus Christi');
    expect(on('br-sp', '2026-10-12')?.name).toEqual({
      en: 'Our Lady of Aparecida',
      pt: 'Nossa Senhora Aparecida',
    });
    expect(on('br-sp', '2026-11-20')?.name.pt).toBe('Dia da Consciência Negra');
    expect(on('br-sp', '2026-01-25')?.name.pt).toBe('Aniversário de São Paulo');
  });
  it('Austin (US federal, without Columbus and Veterans Day)', () => {
    expect(on('us-tx', '2026-01-19')?.name.en).toBe('Martin Luther King Jr. Day');
    expect(on('us-tx', '2026-05-25')?.name.en).toBe('Memorial Day');
    expect(on('us-tx', '2026-07-03')?.name.en).toBe('Independence Day (observed)');
    expect(on('us-tx', '2026-09-07')?.name.en).toBe('Labor Day');
    expect(on('us-tx', '2026-11-26')?.name.en).toBe('Thanksgiving');
    expect(on('us-tx', '2026-10-12')).toBeUndefined();
    expect(on('us-tx', '2026-11-11')).toBeUndefined();
  });
  it('Bristol (England bank holidays with substitutes)', () => {
    expect(on('gb-eng', '2026-04-06')?.name.en).toBe('Easter Monday');
    expect(on('gb-eng', '2026-05-04')?.name.en).toBe('Early May bank holiday');
    expect(on('gb-eng', '2026-08-31')?.name.en).toBe('Summer bank holiday');
    expect(on('gb-eng', '2026-12-28')?.name.en).toBe('Boxing Day (substitute day)');
    expect(on('gb-eng', '2027-12-27')?.name.en).toBe('Christmas Day (substitute day)');
    expect(on('gb-eng', '2027-12-28')?.name.en).toBe('Boxing Day (substitute day)');
  });
  it('Warsaw', () => {
    expect(on('pl', '2026-04-06')?.name.en).toBe('Easter Monday');
    expect(on('pl', '2026-12-24')?.name.en).toBe('Christmas Eve');
  });
  it('Bengaluru and Singapore (lists)', () => {
    expect(on('in-ka', '2026-01-26')?.name.en).toBe('Republic Day');
    expect(on('in-ka', '2026-10-02')?.name.en).toBe('Gandhi Jayanti');
    expect(on('in-ka', '2026-11-01')?.name.en).toBe('Kannada Rajyotsava');
    expect(on('sg', '2026-08-10')?.name.en).toBe('National Day (observed)');
  });
  it('upcoming merges calendars in date order', () => {
    const u = upcomingHolidays(['br-sp', 'gb-eng'], { year: 2026, month: 10, day: 7 }, 30);
    expect(u.map((h) => [h.calendar, h.date])).toEqual([
      ['br-sp', '2026-10-12'],
      ['br-sp', '2026-11-02'],
    ]);
  });
});
