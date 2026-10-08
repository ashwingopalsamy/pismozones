import type { CalendarDef } from '../types';

export const gbEng: CalendarDef = {
  info: { id: 'gb-eng', status: 'public', sources: ['https://www.gov.uk/bank-holidays'] },
  rules: [
    {
      type: 'fixed',
      month: 1,
      day: 1,
      observe: 'substitute',
      name: { en: "New Year's Day", pt: 'Ano-Novo' },
    },
    { type: 'easter', offset: -2, name: { en: 'Good Friday', pt: 'Sexta-feira Santa' } },
    { type: 'easter', offset: 1, name: { en: 'Easter Monday', pt: 'Segunda-feira de Páscoa' } },
    {
      type: 'nth',
      month: 5,
      weekday: 1,
      n: 1,
      name: { en: 'Early May bank holiday', pt: 'Feriado bancário de maio' },
    },
    {
      type: 'nth',
      month: 5,
      weekday: 1,
      n: -1,
      name: { en: 'Spring bank holiday', pt: 'Feriado bancário de primavera' },
    },
    {
      type: 'nth',
      month: 8,
      weekday: 1,
      n: -1,
      name: { en: 'Summer bank holiday', pt: 'Feriado bancário de verão' },
    },
    {
      type: 'fixed',
      month: 12,
      day: 25,
      observe: 'substitute',
      name: { en: 'Christmas Day', pt: 'Natal' },
    },
    {
      type: 'fixed',
      month: 12,
      day: 26,
      observe: 'substitute',
      name: { en: 'Boxing Day', pt: 'Boxing Day' },
    },
  ],
};
