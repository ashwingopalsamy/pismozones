import { DateTime } from 'luxon';
import { CITIES } from '../hooks/useTimeConversion.js';

const CITY_BY_ID = new Map(CITIES.map(city => [city.id, city]));

const PISMO_ALIASES = {
  saopaulo: ['sao paulo', 'sampa', 'sp', 'brt', 'brazil', 'brasil', 'br'],
  austin: ['austin', 'texas', 'tx', 'ct', 'cst', 'cdt', 'central', 'central time', 'usa', 'us', 'united states'],
  bristol: ['bristol', 'gmt', 'bst', 'uk', 'united kingdom', 'england', 'britain'],
  bangalore: ['bangalore', 'bengaluru', 'ist', 'india', 'ind', 'in'],
  singapore: ['singapore', 'sg'],
  warsaw: ['warsaw', 'poland', 'pl', 'cet', 'cest'],
  mexicocity: ['mexico city', 'cdmx', 'mexico', 'mx'],
  buenosaires: ['buenos aires', 'argentina', 'ar'],
  bogota: ['bogota', 'colombia', 'co'],
  sydney: ['sydney', 'australia', 'au'],
  hochiminh: ['ho chi minh', 'ho chi minh city', 'hcmc', 'hcm', 'saigon', 'vietnam', 'vn'],
  jakarta: ['jakarta', 'indonesia', 'id'],
};

const EXACT_ONLY_ALIASES = new Set([
  'ar',
  'br',
  'co',
  'id',
  'in',
  'mx',
  'pl',
  'sg',
  'tx',
  'uk',
  'us',
  'vn',
]);

const UNSUPPORTED_ZONE_TOKENS = new Map([
  ['est', 'EST'],
  ['edt', 'EDT'],
  ['et', 'ET'],
  ['mst', 'MST'],
  ['mdt', 'MDT'],
  ['mt', 'MT'],
  ['pst', 'PST'],
  ['pdt', 'PDT'],
  ['pt', 'PT'],
]);

const WEEKDAYS = [
  { value: 1, labels: ['monday', 'mon'] },
  { value: 2, labels: ['tuesday', 'tue', 'tues'] },
  { value: 3, labels: ['wednesday', 'wed'] },
  { value: 4, labels: ['thursday', 'thu', 'thur', 'thurs'] },
  { value: 5, labels: ['friday', 'fri'] },
  { value: 6, labels: ['saturday', 'sat'] },
  { value: 7, labels: ['sunday', 'sun'] },
];

const FILLER_WORDS = new Set([
  'at',
  'convert',
  'for',
  'from',
  'office',
  'pismo',
  'please',
  'the',
  'time',
  'timezone',
  'zone',
]);

export const VIRTUAL_SOURCES = new Map([
  ['utc', {
    id: 'utc',
    name: 'UTC',
    country: null,
    code: 'UTC',
    timezone: 'UTC',
    flag: '🌐',
    address: '',
  }],
]);

function normalizeText(value) {
  return String(value || '')
    .replace(/->|=>|→|⟶|➜/g, ' to ')
    .replace(/\b([ap])\.?\s*m\.?\b/gi, '$1m')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[()[\]{}"'`?!.;,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAlias(value) {
  return normalizeText(value)
    .replace(/[-/]/g, ' ')
    .replace(/:/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripFillers(value) {
  return normalizeAlias(value)
    .split(' ')
    .filter(word => word && !FILLER_WORDS.has(word))
    .join(' ')
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildAliasEntries() {
  const entries = [];

  const addAlias = (cityId, alias, options = {}) => {
    const normalized = normalizeAlias(alias);
    if (!normalized) return;
    entries.push({
      cityId,
      alias: normalized,
      strict: options.strict || EXACT_ONLY_ALIASES.has(normalized),
    });
  };

  CITIES.forEach(city => {
    addAlias(city.id, city.name);
    addAlias(city.id, city.id);
    addAlias(city.id, city.country);
    addAlias(city.id, city.code, { strict: city.code.length <= 2 });
  });

  Object.entries(PISMO_ALIASES).forEach(([cityId, aliases]) => {
    aliases.forEach(alias => addAlias(cityId, alias));
  });

  const deduped = new Map();
  entries.forEach(entry => {
    const key = `${entry.cityId}:${entry.alias}:${entry.strict ? 'strict' : 'loose'}`;
    deduped.set(key, entry);
  });

  return [...deduped.values()].sort((a, b) => {
    if (b.alias.length !== a.alias.length) return b.alias.length - a.alias.length;
    return a.alias.localeCompare(b.alias);
  });
}

const ALIAS_ENTRIES = buildAliasEntries();

function findUnsupportedZones(text) {
  const tokens = stripFillers(text).split(' ').filter(Boolean);
  return unique(tokens.map(token => UNSUPPORTED_ZONE_TOKENS.get(token)));
}

function overlaps(a, b) {
  return a.index < b.end && b.index < a.end;
}

function findCityMatches(text) {
  const normalized = stripFillers(text);
  if (!normalized) return [];

  const padded = ` ${normalized} `;
  const matches = [];

  ALIAS_ENTRIES.forEach(entry => {
    if (entry.strict && normalized !== entry.alias) return;

    const needle = ` ${entry.alias} `;
    let start = 0;
    let index = padded.indexOf(needle, start);

    while (index !== -1) {
      matches.push({
        cityId: entry.cityId,
        city: CITY_BY_ID.get(entry.cityId),
        alias: entry.alias,
        index,
        end: index + entry.alias.length,
      });
      start = index + 1;
      index = padded.indexOf(needle, start);
    }
  });

  const selected = [];
  matches
    .sort((a, b) => {
      const lengthDiff = (b.end - b.index) - (a.end - a.index);
      if (lengthDiff !== 0) return lengthDiff;
      return a.index - b.index;
    })
    .forEach(match => {
      if (!selected.some(existing => overlaps(existing, match))) {
        selected.push(match);
      }
    });

  return selected.sort((a, b) => a.index - b.index);
}

function resolveSingleCity(phrase) {
  const normalized = stripFillers(phrase);
  if (!normalized) return { status: 'empty' };

  if (VIRTUAL_SOURCES.has(normalized)) {
    return { status: 'ready', city: VIRTUAL_SOURCES.get(normalized) };
  }

  const matches = findCityMatches(normalized);
  const cityIds = unique(matches.map(match => match.cityId));

  if (cityIds.length === 0) {
    const unsupported = findUnsupportedZones(normalized);
    if (unsupported.length > 0) {
      return {
        status: 'unsupported',
        unsupported,
        message: `${unsupported.join(', ')} is outside the Pismo office set.`,
      };
    }
    return { status: 'no-match' };
  }

  if (cityIds.length > 1) {
    return {
      status: 'ambiguous',
      options: cityIds.map(id => CITY_BY_ID.get(id)),
      message: 'Use "to" between the source and destination cities.',
    };
  }

  return {
    status: 'ready',
    city: CITY_BY_ID.get(cityIds[0]),
    match: matches.find(match => match.cityId === cityIds[0]),
  };
}

function resolveDestinationCities(phrase) {
  const normalized = stripFillers(phrase);
  if (!normalized) return { status: 'empty', cities: [] };

  if (VIRTUAL_SOURCES.has(normalized)) {
    return { status: 'ready', cities: [VIRTUAL_SOURCES.get(normalized)] };
  }

  const matches = findCityMatches(normalized);
  const cityIds = unique(matches.map(match => match.cityId));

  if (cityIds.length === 0) {
    const unsupported = findUnsupportedZones(normalized);
    if (unsupported.length > 0) {
      return {
        status: 'unsupported',
        cities: [],
        unsupported,
        message: `${unsupported.join(', ')} is outside the Pismo office set.`,
      };
    }
    return { status: 'no-match', cities: [] };
  }

  return {
    status: 'ready',
    cities: cityIds.map(id => CITY_BY_ID.get(id)),
  };
}

function extractDate(text) {
  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const isoDate = `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
    return {
      text: text.replace(isoMatch[0], ' ').replace(/\s+/g, ' ').trim(),
      descriptor: isoMatch[0],
      resolve: () => isoDate,
    };
  }

  const todayMatch = text.match(/\btoday\b/);
  if (todayMatch) {
    return {
      text: text.replace(todayMatch[0], ' ').replace(/\s+/g, ' ').trim(),
      descriptor: 'today',
      resolve: base => base.toISODate(),
    };
  }

  const tomorrowMatch = text.match(/\btomorrow\b/);
  if (tomorrowMatch) {
    return {
      text: text.replace(tomorrowMatch[0], ' ').replace(/\s+/g, ' ').trim(),
      descriptor: 'tomorrow',
      resolve: base => base.plus({ days: 1 }).toISODate(),
    };
  }

  for (const weekday of WEEKDAYS) {
    const labels = weekday.labels.join('|');
    const nextRe = new RegExp(`\\bnext\\s+(${labels})\\b`);
    const nextMatch = text.match(nextRe);
    if (nextMatch) {
      return {
        text: text.replace(nextMatch[0], ' ').replace(/\s+/g, ' ').trim(),
        descriptor: nextMatch[0],
        resolve: base => {
          const days = ((weekday.value - base.weekday + 7) % 7) || 7;
          return base.plus({ days }).toISODate();
        },
      };
    }

    const weekdayRe = new RegExp(`\\b(${labels})\\b`);
    const weekdayMatch = text.match(weekdayRe);
    if (weekdayMatch) {
      return {
        text: text.replace(weekdayMatch[0], ' ').replace(/\s+/g, ' ').trim(),
        descriptor: weekdayMatch[0],
        resolve: base => {
          const days = (weekday.value - base.weekday + 7) % 7;
          return base.plus({ days }).toISODate();
        },
      };
    }
  }

  return {
    text,
    descriptor: null,
    resolve: base => base.toISODate(),
  };
}

function normalizePeriod(period) {
  if (!period) return null;
  return period.toLowerCase() === 'am' ? 'am' : 'pm';
}

function buildTime(hourRaw, minuteRaw, periodRaw) {
  const period = normalizePeriod(periodRaw);
  let hour = Number(hourRaw);
  const minute = minuteRaw === undefined || minuteRaw === '' ? 0 : Number(minuteRaw);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return null;
  }

  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
  }

  if (hour < 0 || hour > 23) return null;

  return { hour, minute, period };
}

function extractTime(text) {
  const patterns = [
    /(^|\s)([01]?\d|2[0-3]|[1-9]):([0-5]\d)\s*(am|pm)?(?=\s|$)/,
    /(^|\s)(1[0-2]|0?[1-9])\s*(am|pm)(?=\s|$)/,
    /(^|\s)([01]?\d|2[0-3]|[1-9])(?=\s|$)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const hasMinute = match.length >= 4 && /^\d{2}$/.test(match[3] || '');
    const hourRaw = match[2];
    const minuteRaw = hasMinute ? match[3] : undefined;
    const periodRaw = hasMinute ? match[4] : match[3];
    const time = buildTime(hourRaw, minuteRaw, periodRaw);

    if (!time) {
      return { status: 'invalid', text, message: 'That time is not valid.' };
    }

    return {
      status: 'ready',
      time,
      text: text.replace(match[0], ' ').replace(/\s+/g, ' ').trim(),
    };
  }

  return { status: 'missing', text };
}

function splitLocations(text) {
  const locationText = normalizeAlias(text);
  const parts = locationText.split(/\bto\b/).map(part => part.trim());

  if (parts.length < 2) {
    return {
      hasTo: false,
      sourcePhrase: locationText,
      destinationPhrase: '',
    };
  }

  return {
    hasTo: true,
    sourcePhrase: parts[0],
    destinationPhrase: parts.slice(1).join(' to '),
  };
}

function getBaseDateTime(sourceDateTime, sourceCity) {
  if (DateTime.isDateTime(sourceDateTime) && sourceDateTime.isValid) {
    return sourceDateTime.setZone(sourceCity.timezone);
  }
  return DateTime.now().setZone(sourceCity.timezone);
}

function getFallbackDestinationIds(activeCityIds, sourceId) {
  const activeIds = activeCityIds?.length
    ? activeCityIds
    : ['austin', 'saopaulo', 'bristol', 'bangalore'];

  return unique(['saopaulo', ...activeIds]).filter(id => id !== sourceId && CITY_BY_ID.has(id));
}

export function parseNaturalTimeQuery(rawQuery, context = {}) {
  const raw = String(rawQuery || '');
  const normalized = normalizeText(raw);

  if (!normalized) {
    return {
      status: 'idle',
      raw,
      message: '',
    };
  }

  const datePart = extractDate(normalized);
  const timePart = extractTime(datePart.text);

  if (timePart.status === 'invalid') {
    return {
      status: 'invalid',
      raw,
      message: timePart.message,
    };
  }

  if (timePart.status === 'missing') {
    const unsupported = findUnsupportedZones(datePart.text);
    return {
      status: unsupported.length > 0 ? 'unsupported' : 'no-time',
      raw,
      unsupported,
      message: unsupported.length > 0
        ? `${unsupported.join(', ')} is outside the Pismo office set.`
        : 'Enter a time with a Pismo city or timezone.',
    };
  }

  const { sourcePhrase, destinationPhrase, hasTo } = splitLocations(timePart.text);
  const currentSource = CITY_BY_ID.get(context.sourceId) || CITIES[0];
  const sourceResolution = resolveSingleCity(sourcePhrase);

  if (sourceResolution.status === 'unsupported' || sourceResolution.status === 'ambiguous') {
    return {
      status: sourceResolution.status,
      raw,
      message: sourceResolution.message,
      options: sourceResolution.options || [],
      unsupported: sourceResolution.unsupported || [],
    };
  }

  if (!hasTo && sourceResolution.status === 'no-match' && stripFillers(sourcePhrase)) {
    const unsupported = findUnsupportedZones(sourcePhrase);
    if (unsupported.length > 0) {
      return {
        status: 'unsupported',
        raw,
        unsupported,
        message: `${unsupported.join(', ')} is outside the Pismo office set.`,
      };
    }
  }

  const sourceCity = sourceResolution.status === 'ready' ? sourceResolution.city : currentSource;
  const destinationResolution = hasTo
    ? resolveDestinationCities(destinationPhrase)
    : { status: 'empty', cities: [] };

  if (destinationResolution.status === 'unsupported') {
    return {
      status: 'unsupported',
      raw,
      message: destinationResolution.message,
      unsupported: destinationResolution.unsupported || [],
    };
  }

  if (hasTo && destinationResolution.cities.length === 0) {
    return {
      status: 'no-match',
      raw,
      message: 'I could not find that destination in the Pismo city list.',
    };
  }

  const destinationIds = hasTo
    ? destinationResolution.cities.map(city => city.id)
    : getFallbackDestinationIds(context.activeCityIds, sourceCity.id);

  const baseDateTime = getBaseDateTime(context.sourceDateTime, sourceCity);
  const dateISO = datePart.resolve(baseDateTime);
  const sourceDateTime = DateTime.fromISO(
    `${dateISO}T${String(timePart.time.hour).padStart(2, '0')}:${String(timePart.time.minute).padStart(2, '0')}:00`,
    { zone: sourceCity.timezone },
  );

  if (!sourceDateTime.isValid) {
    return {
      status: 'invalid',
      raw,
      message: 'That date and time is not valid.',
    };
  }

  return {
    status: 'ready',
    raw,
    sourceCity,
    destinationIds,
    time: timePart.time,
    date: dateISO,
    dateDescriptor: datePart.descriptor,
    sourceDateTime,
    explicitSource: sourceResolution.status === 'ready',
    explicitDestinations: hasTo,
    signature: `${sourceCity.id}|${dateISO}|${timePart.time.hour}:${timePart.time.minute}|${destinationIds.join(',')}`,
    message: '',
  };
}

export function getNaturalTimeAliases() {
  return ALIAS_ENTRIES.map(entry => ({ ...entry }));
}
