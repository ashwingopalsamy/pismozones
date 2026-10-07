import { OFFICES, type OfficeId } from '../cities/registry';
import type { PlaceRef } from './types';

const office = (id: OfficeId): PlaceRef => ({ kind: 'office', id });
const zone = (z: string, label: string): PlaceRef => ({ kind: 'zone', zone: z, label });

const ZONE_ALIASES: Array<[string, PlaceRef]> = [
  ['utc', zone('UTC', 'UTC')],
  ['z', zone('UTC', 'UTC')],
  ['china', zone('Asia/Shanghai', 'China')],
  ['shanghai', zone('Asia/Shanghai', 'China')],
  ['beijing', zone('Asia/Shanghai', 'China')],
  ['new york', zone('America/New_York', 'New York')],
  ['nyc', zone('America/New_York', 'New York')],
  ['san francisco', zone('America/Los_Angeles', 'Pacific')],
  ['sf', zone('America/Los_Angeles', 'Pacific')],
  ['los angeles', zone('America/Los_Angeles', 'Pacific')],
  ['tokyo', zone('Asia/Tokyo', 'Tokyo')],
  ['dubai', zone('Asia/Dubai', 'Dubai')],
  ['berlin', zone('Europe/Berlin', 'Berlin')],
];

/** Normalised alias → place. Keys may contain spaces; match longest first. */
export const PLACE_ALIASES: ReadonlyMap<string, PlaceRef> = new Map([
  ...OFFICES.flatMap((o) => o.aliases.map((a): [string, PlaceRef] => [a, office(o.id)])),
  ...ZONE_ALIASES,
]);

/** Fixed-offset abbreviations that unambiguously name a Pismo office zone. */
export const FIXED_ABBR: Readonly<Record<string, { place: PlaceRef; offset: number }>> = {
  brt: { place: office('saopaulo'), offset: -180 },
  ist: { place: office('bangalore'), offset: 330 },
  sgt: { place: office('singapore'), offset: 480 },
  art: { place: office('buenosaires'), offset: -180 },
  cot: { place: office('bogota'), offset: -300 },
  wib: { place: office('jakarta'), offset: 420 },
  ict: { place: office('hochiminh'), offset: 420 },
};

export interface SeasonalAbbr {
  zone: string;
  office?: OfficeId;
  offset: number;
  label: string;
  ambiguousWith?: PlaceRef;
}

/** Abbreviations that only hold for part of the year in their zone. */
export const SEASONAL_ABBR: Readonly<Record<string, SeasonalAbbr>> = {
  gmt: { zone: 'Europe/London', office: 'bristol', offset: 0, label: 'GMT' },
  bst: { zone: 'Europe/London', office: 'bristol', offset: 60, label: 'BST' },
  cst: {
    zone: 'America/Chicago',
    office: 'austin',
    offset: -360,
    label: 'CST',
    ambiguousWith: zone('Asia/Shanghai', 'China'),
  },
  cdt: { zone: 'America/Chicago', office: 'austin', offset: -300, label: 'CDT' },
  est: { zone: 'America/New_York', offset: -300, label: 'EST' },
  edt: { zone: 'America/New_York', offset: -240, label: 'EDT' },
  pst: { zone: 'America/Los_Angeles', offset: -480, label: 'PST' },
  pdt: { zone: 'America/Los_Angeles', offset: -420, label: 'PDT' },
  cet: { zone: 'Europe/Warsaw', office: 'warsaw', offset: 60, label: 'CET' },
  cest: { zone: 'Europe/Warsaw', office: 'warsaw', offset: 120, label: 'CEST' },
  aest: { zone: 'Australia/Sydney', office: 'sydney', offset: 600, label: 'AEST' },
  aedt: { zone: 'Australia/Sydney', office: 'sydney', offset: 660, label: 'AEDT' },
};

export const CONNECTORS_TO: ReadonlySet<string> = new Set(['to', 'into', 'vs', 'para', 'pra']);
export const CONNECTORS_IN: ReadonlySet<string> = new Set(['in', 'em']);
export const CONJUNCTIONS: ReadonlySet<string> = new Set(['and', 'e']);
export const RANGE_WORDS: ReadonlySet<string> = new Set(['to', 'until', 'till', 'ate']);

export const FILLERS: ReadonlySet<string> = new Set([
  'what',
  'whats',
  "what's",
  'is',
  'it',
  'the',
  'time',
  'at',
  'on',
  'me',
  'show',
  'convert',
  'from',
  'please',
  'will',
  'be',
  'when',
  'for',
  "o'clock",
  'oclock',
  'meeting',
  'call',
  'sync',
  'standup',
  'with',
  'team',
  'que',
  'horas',
  'hora',
  'as',
  'às',
  'de',
  'do',
  'da',
  'feira',
]);

export const RECURRENCE: ReadonlySet<string> = new Set([
  'every',
  'daily',
  'weekly',
  'weekdays',
  'todo',
  'toda',
  'todos',
  'todas',
]);

/** Day offset from today; `tonight` also biases bare hours to the evening. */
export const DAY_WORDS: Readonly<Record<string, { offset: number; tonight?: true }>> = {
  today: { offset: 0 },
  tonight: { offset: 0, tonight: true },
  tomorrow: { offset: 1 },
  tmrw: { offset: 1 },
  tmr: { offset: 1 },
  yesterday: { offset: -1 },
  hoje: { offset: 0 },
  amanha: { offset: 1 },
  ontem: { offset: -1 },
};

export const NEXT_WORDS: ReadonlySet<string> = new Set(['next', 'proximo', 'proxima']);
export const THIS_WORDS: ReadonlySet<string> = new Set(['this', 'este', 'esta']);

export const WEEKDAYS: Readonly<Record<string, number>> = {
  sunday: 0,
  sun: 0,
  domingo: 0,
  dom: 0,
  monday: 1,
  mon: 1,
  segunda: 1,
  'segunda-feira': 1,
  seg: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  terca: 2,
  'terca-feira': 2,
  ter: 2,
  wednesday: 3,
  wed: 3,
  quarta: 3,
  'quarta-feira': 3,
  qua: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  quinta: 4,
  'quinta-feira': 4,
  qui: 4,
  friday: 5,
  fri: 5,
  sexta: 5,
  'sexta-feira': 5,
  sex: 5,
  saturday: 6,
  sat: 6,
  sabado: 6,
  sab: 6,
};

export const MONTHS: Readonly<Record<string, number>> = {
  january: 1,
  jan: 1,
  janeiro: 1,
  february: 2,
  feb: 2,
  fevereiro: 2,
  fev: 2,
  march: 3,
  mar: 3,
  marco: 3,
  april: 4,
  apr: 4,
  abril: 4,
  abr: 4,
  may: 5,
  maio: 5,
  mai: 5,
  june: 6,
  jun: 6,
  junho: 6,
  july: 7,
  jul: 7,
  julho: 7,
  august: 8,
  aug: 8,
  agosto: 8,
  ago: 8,
  september: 9,
  sep: 9,
  sept: 9,
  setembro: 9,
  set: 9,
  october: 10,
  oct: 10,
  outubro: 10,
  out: 10,
  november: 11,
  nov: 11,
  novembro: 11,
  december: 12,
  dec: 12,
  dezembro: 12,
  dez: 12,
};

/** Minutes per unit for "in N <unit>" durations. */
export const UNITS: Readonly<Record<string, number>> = {
  hour: 60,
  hours: 60,
  hr: 60,
  hrs: 60,
  h: 60,
  hora: 60,
  horas: 60,
  minute: 1,
  minutes: 1,
  min: 1,
  mins: 1,
  minuto: 1,
  minutos: 1,
};

export const NOON_WORDS: Readonly<Record<string, number>> = {
  noon: 12,
  midday: 12,
  'meio-dia': 12,
  midnight: 0,
  'meia-noite': 0,
};

export const DURATION_LEADS: ReadonlySet<string> = new Set(['in', 'daqui', 'em']);
