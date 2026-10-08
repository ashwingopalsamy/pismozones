export type OfficeId =
  | 'saopaulo'
  | 'austin'
  | 'bristol'
  | 'bangalore'
  | 'singapore'
  | 'warsaw'
  | 'mexicocity'
  | 'buenosaires'
  | 'bogota'
  | 'sydney'
  | 'hochiminh'
  | 'jakarta';

/** Pismo company leave calendars, one per country. */
export type CalendarId = 'in' | 'br' | 'uk' | 'us' | 'pl';

export interface Office {
  id: OfficeId;
  name: string;
  /** 3-letter city code for tight layouts (display only). */
  code: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  countryName: { en: string; pt: string };
  zone: string;
  lat: number;
  lon: number;
  /** Normalised (see text/normalize) and unique across offices. */
  aliases: readonly string[];
  /** Minutes after local midnight. */
  workHours: { start: number; end: number };
  holidayCalendar: CalendarId | null;
  hq?: true;
}

const HOURS = { start: 540, end: 1080 } as const;

export const OFFICES: readonly Office[] = [
  {
    id: 'saopaulo',
    code: 'SAO',
    name: 'São Paulo',
    country: 'BR',
    countryName: { en: 'Brazil', pt: 'Brasil' },
    zone: 'America/Sao_Paulo',
    lat: -23.55,
    lon: -46.63,
    aliases: ['sao paulo', 'saopaulo', 'sampa', 'sp', 'gru', 'hq', 'brazil', 'brasil'],
    workHours: HOURS,
    holidayCalendar: 'br',
    hq: true,
  },
  {
    id: 'austin',
    code: 'AUS',
    name: 'Austin',
    country: 'US',
    countryName: { en: 'United States', pt: 'Estados Unidos' },
    zone: 'America/Chicago',
    lat: 30.27,
    lon: -97.74,
    aliases: ['austin', 'atx', 'aus', 'texas', 'usa'],
    workHours: HOURS,
    holidayCalendar: 'us',
  },
  {
    id: 'bristol',
    code: 'BRS',
    name: 'Bristol',
    country: 'GB',
    countryName: { en: 'United Kingdom', pt: 'Reino Unido' },
    zone: 'Europe/London',
    lat: 51.45,
    lon: -2.59,
    aliases: ['bristol', 'brs', 'london', 'uk', 'england', 'britain'],
    workHours: HOURS,
    holidayCalendar: 'uk',
  },
  {
    id: 'bangalore',
    code: 'BLR',
    name: 'Bengaluru',
    country: 'IN',
    countryName: { en: 'India', pt: 'Índia' },
    zone: 'Asia/Kolkata',
    lat: 12.97,
    lon: 77.59,
    aliases: ['bangalore', 'bengaluru', 'blr', 'india'],
    workHours: HOURS,
    holidayCalendar: 'in',
  },
  {
    id: 'singapore',
    code: 'SIN',
    name: 'Singapore',
    country: 'SG',
    countryName: { en: 'Singapore', pt: 'Singapura' },
    zone: 'Asia/Singapore',
    lat: 1.35,
    lon: 103.82,
    aliases: ['singapore', 'singapura', 'sin', 'sg'],
    workHours: HOURS,
    holidayCalendar: null,
  },
  {
    id: 'warsaw',
    code: 'WAW',
    name: 'Warsaw',
    country: 'PL',
    countryName: { en: 'Poland', pt: 'Polônia' },
    zone: 'Europe/Warsaw',
    lat: 52.23,
    lon: 21.01,
    aliases: ['warsaw', 'warszawa', 'waw', 'poland', 'polska'],
    workHours: HOURS,
    holidayCalendar: 'pl',
  },
  {
    id: 'mexicocity',
    code: 'MEX',
    name: 'Mexico City',
    country: 'MX',
    countryName: { en: 'Mexico', pt: 'México' },
    zone: 'America/Mexico_City',
    lat: 19.43,
    lon: -99.13,
    aliases: ['mexico city', 'ciudad de mexico', 'cdmx', 'mex', 'mexico'],
    workHours: HOURS,
    holidayCalendar: null,
  },
  {
    id: 'buenosaires',
    code: 'BUE',
    name: 'Buenos Aires',
    country: 'AR',
    countryName: { en: 'Argentina', pt: 'Argentina' },
    zone: 'America/Argentina/Buenos_Aires',
    lat: -34.6,
    lon: -58.38,
    aliases: ['buenos aires', 'bue', 'argentina'],
    workHours: HOURS,
    holidayCalendar: null,
  },
  {
    id: 'bogota',
    code: 'BOG',
    name: 'Bogotá',
    country: 'CO',
    countryName: { en: 'Colombia', pt: 'Colômbia' },
    zone: 'America/Bogota',
    lat: 4.71,
    lon: -74.07,
    aliases: ['bogota', 'bog', 'colombia'],
    workHours: HOURS,
    holidayCalendar: null,
  },
  {
    id: 'sydney',
    code: 'SYD',
    name: 'Sydney',
    country: 'AU',
    countryName: { en: 'Australia', pt: 'Austrália' },
    zone: 'Australia/Sydney',
    lat: -33.87,
    lon: 151.21,
    aliases: ['sydney', 'syd', 'australia'],
    workHours: HOURS,
    holidayCalendar: null,
  },
  {
    id: 'hochiminh',
    code: 'SGN',
    name: 'Ho Chi Minh',
    country: 'VN',
    countryName: { en: 'Vietnam', pt: 'Vietnã' },
    zone: 'Asia/Ho_Chi_Minh',
    lat: 10.82,
    lon: 106.63,
    aliases: ['ho chi minh', 'ho chi minh city', 'hcmc', 'saigon', 'sgn', 'vietnam'],
    workHours: HOURS,
    holidayCalendar: null,
  },
  {
    id: 'jakarta',
    code: 'JKT',
    name: 'Jakarta',
    country: 'ID',
    countryName: { en: 'Indonesia', pt: 'Indonésia' },
    zone: 'Asia/Jakarta',
    lat: -6.21,
    lon: 106.85,
    aliases: ['jakarta', 'cgk', 'indonesia'],
    workHours: HOURS,
    holidayCalendar: null,
  },
];

const byId = new Map(OFFICES.map((o) => [o.id as string, o]));

export function getOffice(id: string): Office | undefined {
  return byId.get(id);
}

/** Legacy IANA names some platforms still report (e.g. ICU returns Asia/Calcutta). */
const ZONE_ALIASES: Readonly<Record<string, string>> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Europe/Belfast': 'Europe/London',
  GB: 'Europe/London',
  Singapore: 'Asia/Singapore',
  'Brazil/East': 'America/Sao_Paulo',
  'US/Central': 'America/Chicago',
  'Australia/ACT': 'Australia/Sydney',
  'Australia/NSW': 'Australia/Sydney',
  Poland: 'Europe/Warsaw',
  'Mexico/General': 'America/Mexico_City',
};

const canonical = (zone: string) => ZONE_ALIASES[zone] ?? zone;

/** True when two IANA names denote the same zone, including legacy aliases. */
export function sameZone(a: string, b: string): boolean {
  return canonical(a) === canonical(b);
}

/** Exact IANA match (aliases resolved) — offset-based guessing is wrong across DST. */
export function officeForZone(zone: string): Office | undefined {
  return OFFICES.find((o) => sameZone(o.zone, zone));
}

export const DEFAULT_ACTIVE: readonly OfficeId[] = ['saopaulo', 'austin', 'bangalore', 'bristol'];

/** São Paulo (HQ) is always active and always shown first. */
export const ANCHOR: OfficeId = 'saopaulo';
