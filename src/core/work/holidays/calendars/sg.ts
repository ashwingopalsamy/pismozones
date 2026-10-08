import type { CalendarDef, Holiday } from '../types';

const h = (date: string, en: string, pt: string): Holiday => ({
  date,
  name: { en, pt },
  kind: 'full',
});

// Ministry of Manpower public holidays, including the observed Mondays exactly as MOM lists them.
export const sg: CalendarDef = {
  info: {
    id: 'sg',
    status: 'public',
    sources: ['https://www.mom.gov.sg/employment-practices/public-holidays'],
  },
  rules: [
    {
      type: 'list',
      entries: [
        h('2026-01-01', "New Year's Day", 'Ano-Novo'),
        h('2026-02-17', 'Chinese New Year', 'Ano-Novo Chinês'),
        h('2026-02-18', 'Chinese New Year', 'Ano-Novo Chinês'),
        h('2026-03-21', 'Hari Raya Puasa', 'Hari Raya Puasa'),
        h('2026-04-03', 'Good Friday', 'Sexta-feira Santa'),
        h('2026-05-01', 'Labour Day', 'Dia do Trabalho'),
        h('2026-05-27', 'Hari Raya Haji', 'Hari Raya Haji'),
        h('2026-05-31', 'Vesak Day', 'Dia de Vesak'),
        h('2026-06-01', 'Vesak Day (observed)', 'Dia de Vesak (observado)'),
        h('2026-08-09', 'National Day', 'Dia Nacional'),
        h('2026-08-10', 'National Day (observed)', 'Dia Nacional (observado)'),
        h('2026-11-08', 'Deepavali', 'Deepavali'),
        h('2026-11-09', 'Deepavali (observed)', 'Deepavali (observado)'),
        h('2026-12-25', 'Christmas Day', 'Natal'),
        h('2027-01-01', "New Year's Day", 'Ano-Novo'),
        h('2027-02-06', 'Chinese New Year', 'Ano-Novo Chinês'),
        h('2027-02-07', 'Chinese New Year', 'Ano-Novo Chinês'),
        h('2027-02-08', 'Chinese New Year (observed)', 'Ano-Novo Chinês (observado)'),
        h('2027-03-10', 'Hari Raya Puasa', 'Hari Raya Puasa'),
        h('2027-03-26', 'Good Friday', 'Sexta-feira Santa'),
        h('2027-05-01', 'Labour Day', 'Dia do Trabalho'),
        h('2027-05-17', 'Hari Raya Haji', 'Hari Raya Haji'),
        h('2027-05-20', 'Vesak Day', 'Dia de Vesak'),
        h('2027-08-09', 'National Day', 'Dia Nacional'),
        h('2027-10-28', 'Deepavali', 'Deepavali'),
        h('2027-12-25', 'Christmas Day', 'Natal'),
      ],
    },
  ],
};
