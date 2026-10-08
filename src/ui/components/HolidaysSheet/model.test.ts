import { getOffice, type Office, type OfficeId } from '@core/cities/registry';
import { expect, it } from 'vitest';
import { holidaysModel } from './model';

const offices = (ids: OfficeId[]) => ids.map((id) => getOffice(id) as Office);

it('tabs follow active countries; a chip focus opens its country at the date', () => {
  const m = holidaysModel(
    offices(['saopaulo', 'austin', 'singapore']),
    { year: 2026, month: 10, day: 7 },
    'en',
    { officeId: 'austin', date: '2026-11-26' },
  );
  expect(m.tabs.map((t) => t.id)).toEqual(['upcoming', 'br', 'us']);
  expect(m.selected).toBe('us');
  expect(m.country.us?.flatMap((x) => x.items).find((i) => i.focused)?.date).toBe('2026-11-26');
  expect(m.noCalendar).toEqual(['Singapore']);
});

it('notes an unpublished year inside the window', () => {
  expect(holidaysModel(offices(['saopaulo']), { year: 2026, month: 12, day: 1 }, 'en').unpublished).toBe(2027);
});
