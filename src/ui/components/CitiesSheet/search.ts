import { OFFICES, type Office } from '@core/cities/registry';
import { normalize } from '@core/text/normalize';

const haystack = new Map(
  OFFICES.map((o) => [
    o.id,
    normalize([o.name, o.countryName.en, o.countryName.pt, o.zone, ...o.aliases].join(' ')),
  ]),
);

/** Offices whose name, country (either language), alias or zone contains the query. */
export function searchOffices(q: string): Office[] {
  const needle = normalize(q);
  if (!needle) return [...OFFICES];
  return OFFICES.filter((o) => haystack.get(o.id)?.includes(needle));
}
