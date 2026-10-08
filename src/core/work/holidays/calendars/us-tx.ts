import type { CalendarDef } from '../types';

// US federal holidays, excluding Columbus Day and Veterans Day (rarely observed by private employers).
export const usTx: CalendarDef = {
  info: {
    id: 'us-tx',
    status: 'public',
    sources: ['https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/'],
  },
  rules: [
    {
      type: 'fixed',
      month: 1,
      day: 1,
      observe: 'us',
      name: { en: "New Year's Day", pt: 'Ano-Novo' },
    },
    {
      type: 'nth',
      month: 1,
      weekday: 1,
      n: 3,
      name: { en: 'Martin Luther King Jr. Day', pt: 'Dia de Martin Luther King Jr.' },
    },
    {
      type: 'nth',
      month: 2,
      weekday: 1,
      n: 3,
      name: { en: "Washington's Birthday", pt: 'Dia dos Presidentes' },
    },
    { type: 'nth', month: 5, weekday: 1, n: -1, name: { en: 'Memorial Day', pt: 'Memorial Day' } },
    {
      type: 'fixed',
      month: 6,
      day: 19,
      observe: 'us',
      name: { en: 'Juneteenth', pt: 'Juneteenth' },
    },
    {
      type: 'fixed',
      month: 7,
      day: 4,
      observe: 'us',
      name: { en: 'Independence Day', pt: 'Dia da Independência dos EUA' },
    },
    {
      type: 'nth',
      month: 9,
      weekday: 1,
      n: 1,
      name: { en: 'Labor Day', pt: 'Dia do Trabalho (EUA)' },
    },
    {
      type: 'nth',
      month: 11,
      weekday: 4,
      n: 4,
      name: { en: 'Thanksgiving', pt: 'Ação de Graças' },
    },
    {
      type: 'fixed',
      month: 12,
      day: 25,
      observe: 'us',
      name: { en: 'Christmas Day', pt: 'Natal' },
    },
  ],
};
