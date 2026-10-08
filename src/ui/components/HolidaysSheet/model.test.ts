import { getOffice, type Office, type OfficeId } from '@core/cities/registry';
import { expect, it } from 'vitest';
import { holidaysModel, relativeLabel } from './model';

const offices = (ids: OfficeId[]) => ids.map((id) => getOffice(id) as Office);
const OCT_7 = { year: 2026, month: 10, day: 7 };

it('one calendar per country, the viewer’s first, with the next holiday and a countdown', () => {
  const m = holidaysModel(
    offices(['saopaulo', 'austin', 'bangalore', 'jakarta']),
    'bangalore',
    OCT_7,
    'en',
  );
  expect(m.countries.map((c) => c.id)).toEqual(['in', 'br', 'us']);
  expect(m.countries[0]).toMatchObject({ yours: true, iso: 'IN', offices: ['Bengaluru'] });
  const br = m.countries.find((c) => c.id === 'br');
  expect(br?.next).toMatchObject({
    date: '2026-10-12',
    state: 'next',
    daysUntil: 5,
    day: '12',
    month: 'Oct',
  });
  expect(relativeLabel(br?.next as never, 'en')).toBe('in 5 days');
  expect(m.selected).toEqual(['in', 'br', 'us']);
});

it('opening from a card focuses that country and date', () => {
  const m = holidaysModel(offices(['saopaulo', 'austin']), null, OCT_7, 'en', {
    officeId: 'austin',
    date: '2026-11-26',
  });
  expect(m.selected).toEqual(['us']);
  expect(m.countries.find((c) => c.id === 'us')?.items.find((i) => i.focused)?.date).toBe(
    '2026-11-26',
  );
});

it('notes next year’s calendar is unpublished once it is within 90 days', () => {
  const c = holidaysModel(offices(['saopaulo']), null, { year: 2026, month: 12, day: 1 }, 'en')
    .countries[0];
  expect(c?.unpublished).toBe(2027);
  expect(
    holidaysModel(offices(['saopaulo']), null, { year: 2026, month: 9, day: 1 }, 'en').countries[0]
      ?.unpublished,
  ).toBeNull();
});
