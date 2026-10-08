import { getOffice, type Office } from '@core/cities/registry';
import { expect, it } from 'vitest';
import { holidaysModel } from './model';

const offs = (...ids: string[]) => ids.map((i) => getOffice(i) as Office);

it('merges and labels upcoming holidays', () => {
  const m = holidaysModel(
    offs('saopaulo', 'bristol', 'sydney'),
    { year: 2026, month: 10, day: 7 },
    'en',
  );
  expect(m.months[0]).toEqual({
    title: 'October',
    items: [
      {
        date: '2026-10-12',
        dateLabel: 'Mon 12 Oct',
        name: 'Our Lady of Aparecida',
        offices: 'São Paulo',
        half: false,
        focused: false,
      },
    ],
  });
  expect(m.noCalendar).toEqual(['Sydney']);
  const christmas = m.months.flatMap((x) => x.items).find((i) => i.date === '2026-12-25');
  expect(christmas?.offices).toBe('São Paulo, Bristol');
  expect(
    holidaysModel(offs('saopaulo'), { year: 2026, month: 10, day: 7 }, 'pt-BR').months[0]?.items[0]
      ?.name,
  ).toBe('Nossa Senhora Aparecida');
});
