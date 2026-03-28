// holidays.js — Holiday date sets by country, used by both
// useTimeConversion (work state) and HolidayPanel (display).

const INDIA_DATES = new Set([
  '2026-01-01', '2026-01-26', '2026-02-19', '2026-03-03',
  '2026-03-19', '2026-04-03', '2026-05-01', '2026-05-28',
  '2026-08-26', '2026-09-14', '2026-10-02', '2026-11-09',
  '2026-11-10', '2026-12-25',
]);

const BRAZIL_DATES = new Set([
  '2026-01-01', '2026-01-25', '2026-02-16', '2026-02-17',
  '2026-02-18', '2026-04-03', '2026-04-05', '2026-04-21',
  '2026-05-01', '2026-06-04', '2026-07-09', '2026-09-07',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20',
  '2026-12-25',
]);

const UK_DATES = new Set([
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04',
  '2026-05-25', '2026-08-31', '2026-12-25', '2026-12-26',
]);

const USA_DATES = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-10-12',
  '2026-11-11', '2026-11-26', '2026-11-27', '2026-12-25',
]);

const POLAND_DATES = new Set([
  '2026-01-01', '2026-01-06', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-03', '2026-05-24', '2026-06-04',
  '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-24',
  '2026-12-25', '2026-12-26',
]);

export const HOLIDAY_DATES_BY_COUNTRY = {
  'India': INDIA_DATES,
  'Brazil': BRAZIL_DATES,
  'UK': UK_DATES,
  'USA': USA_DATES,
  'Poland': POLAND_DATES,
  'Singapore': new Set(),
  'Mexico': new Set(),
  'Argentina': new Set(),
  'Colombia': new Set(),
  'Australia': new Set(),
};

export function isHoliday(country, isoDate) {
  const dates = HOLIDAY_DATES_BY_COUNTRY[country];
  return dates ? dates.has(isoDate) : false;
}
