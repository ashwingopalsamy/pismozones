import type { CalendarDef } from '../types';

// Ustawa o dniach wolnych od pracy (Christmas Eve added from 2025). Sunday-only feasts omitted.
export const pl: CalendarDef = {
  info: {
    id: 'pl',
    status: 'public',
    sources: ['https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19510040028'],
  },
  rules: [
    { type: 'fixed', month: 1, day: 1, name: { en: "New Year's Day", pt: 'Ano-Novo' } },
    { type: 'fixed', month: 1, day: 6, name: { en: 'Epiphany', pt: 'Epifania' } },
    { type: 'easter', offset: 1, name: { en: 'Easter Monday', pt: 'Segunda-feira de Páscoa' } },
    { type: 'fixed', month: 5, day: 1, name: { en: 'Labour Day', pt: 'Dia do Trabalho' } },
    {
      type: 'fixed',
      month: 5,
      day: 3,
      name: { en: 'Constitution Day', pt: 'Dia da Constituição' },
    },
    { type: 'easter', offset: 60, name: { en: 'Corpus Christi', pt: 'Corpus Christi' } },
    {
      type: 'fixed',
      month: 8,
      day: 15,
      name: { en: 'Assumption Day', pt: 'Assunção de Nossa Senhora' },
    },
    {
      type: 'fixed',
      month: 11,
      day: 1,
      name: { en: "All Saints' Day", pt: 'Dia de Todos os Santos' },
    },
    {
      type: 'fixed',
      month: 11,
      day: 11,
      name: { en: 'Independence Day', pt: 'Dia da Independência' },
    },
    { type: 'fixed', month: 12, day: 24, name: { en: 'Christmas Eve', pt: 'Véspera de Natal' } },
    { type: 'fixed', month: 12, day: 25, name: { en: 'Christmas Day', pt: 'Natal' } },
    {
      type: 'fixed',
      month: 12,
      day: 26,
      name: { en: 'Second Day of Christmas', pt: 'Segundo dia de Natal' },
    },
  ],
};
