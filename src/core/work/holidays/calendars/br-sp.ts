import type { CalendarDef } from '../types';

export const brSp: CalendarDef = {
  info: {
    id: 'br-sp',
    status: 'public',
    sources: [
      'https://www.planalto.gov.br/ccivil_03/leis/l0662.htm',
      'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm',
      'https://legislacao.prefeitura.sp.gov.br/leis/lei-14485-de-19-de-julho-de-2007',
    ],
  },
  rules: [
    {
      type: 'fixed',
      month: 1,
      day: 1,
      name: { en: "New Year's Day", pt: 'Confraternização Universal' },
    },
    {
      type: 'fixed',
      month: 1,
      day: 25,
      name: { en: 'São Paulo Anniversary', pt: 'Aniversário de São Paulo' },
    },
    { type: 'easter', offset: -48, name: { en: 'Carnival', pt: 'Carnaval' } },
    { type: 'easter', offset: -47, name: { en: 'Carnival', pt: 'Carnaval' } },
    {
      type: 'easter',
      offset: -46,
      kind: 'half',
      // Ponto facultativo until 14:00: the morning is off and work resumes in the afternoon.
      hours: { start: 840, end: 1080 },
      name: { en: 'Ash Wednesday', pt: 'Quarta-feira de Cinzas' },
    },
    { type: 'easter', offset: -2, name: { en: 'Good Friday', pt: 'Sexta-feira Santa' } },
    { type: 'fixed', month: 4, day: 21, name: { en: 'Tiradentes', pt: 'Tiradentes' } },
    { type: 'fixed', month: 5, day: 1, name: { en: 'Labour Day', pt: 'Dia do Trabalho' } },
    { type: 'easter', offset: 60, name: { en: 'Corpus Christi', pt: 'Corpus Christi' } },
    {
      type: 'fixed',
      month: 7,
      day: 9,
      name: { en: 'Constitutionalist Revolution', pt: 'Revolução Constitucionalista' },
    },
    {
      type: 'fixed',
      month: 9,
      day: 7,
      name: { en: 'Independence Day', pt: 'Independência do Brasil' },
    },
    {
      type: 'fixed',
      month: 10,
      day: 12,
      name: { en: 'Our Lady of Aparecida', pt: 'Nossa Senhora Aparecida' },
    },
    { type: 'fixed', month: 11, day: 2, name: { en: "All Souls' Day", pt: 'Finados' } },
    {
      type: 'fixed',
      month: 11,
      day: 15,
      name: { en: 'Republic Day', pt: 'Proclamação da República' },
    },
    {
      type: 'fixed',
      month: 11,
      day: 20,
      name: { en: 'Black Consciousness Day', pt: 'Dia da Consciência Negra' },
    },
    { type: 'fixed', month: 12, day: 25, name: { en: 'Christmas Day', pt: 'Natal' } },
  ],
};
