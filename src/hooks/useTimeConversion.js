import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DateTime } from 'luxon';
import { isHoliday } from '../data/holidays';

// IMPORTANT: Only APPEND new cities. Never reorder or remove.
// Shareable links encode city positions as a bitfield -- changing order breaks existing links.
export const CITIES = [
  {
    id: 'saopaulo',
    name: 'São Paulo',
    country: 'Brazil',
    code: 'BR',
    timezone: 'America/Sao_Paulo',
    flag: '🇧🇷',
    address: 'Av. Brg. Faria Lima, 4221 São Paulo, SP, 04538-133',
  },
  {
    id: 'austin',
    name: 'Austin',
    country: 'USA',
    code: 'US',
    timezone: 'America/Chicago',
    flag: '🇺🇸',
    address: '12401 Research Blvd, Building II, Austin, Texas, 78759',
  },
  {
    id: 'bristol',
    name: 'Bristol',
    country: 'UK',
    code: 'UK',
    timezone: 'Europe/London',
    flag: '🇬🇧',
    address: 'One Temple Quay, Temple Back E, Bristol, BS1 6DZ',
  },
  {
    id: 'bangalore',
    name: 'Bangalore',
    country: 'India',
    code: 'IN',
    timezone: 'Asia/Kolkata',
    flag: '🇮🇳',
    address: 'Regus The Estate, 8th Floor, Dickenson Road, Bangalore, 560042',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    code: 'SG',
    timezone: 'Asia/Singapore',
    flag: '🇸🇬',
    address: 'Level 8, 71 Robinson Road, Singapore, 068895',
  },
  {
    id: 'warsaw',
    name: 'Warsaw',
    country: 'Poland',
    code: 'PL',
    timezone: 'Europe/Warsaw',
    flag: '🇵🇱',
    address: 'Pismo Warsaw Office',
  },
  {
    id: 'mexicocity',
    name: 'Mexico City',
    country: 'Mexico',
    code: 'MX',
    timezone: 'America/Mexico_City',
    flag: '🇲🇽',
    address: 'Pismo Mexico City Office',
  },
  {
    id: 'buenosaires',
    name: 'Buenos Aires',
    country: 'Argentina',
    code: 'AR',
    timezone: 'America/Argentina/Buenos_Aires',
    flag: '🇦🇷',
    address: 'Pismo Buenos Aires Office',
  },
  {
    id: 'bogota',
    name: 'Bogota',
    country: 'Colombia',
    code: 'CO',
    timezone: 'America/Bogota',
    flag: '🇨🇴',
    address: 'Pismo Bogota Office',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    code: 'AU',
    timezone: 'Australia/Sydney',
    flag: '🇦🇺',
    address: 'Pismo Sydney Office',
  },
  {
    id: 'hochiminh',
    name: 'Ho Chi Minh',
    country: 'Vietnam',
    code: 'VN',
    timezone: 'Asia/Ho_Chi_Minh',
    flag: '🇻🇳',
    address: 'Pismo Ho Chi Minh City Office',
  },
  {
    id: 'jakarta',
    name: 'Jakarta',
    country: 'Indonesia',
    code: 'ID',
    timezone: 'Asia/Jakarta',
    flag: '🇮🇩',
    address: 'Pismo Jakarta Office',
  },
];

// Cities always shown by default
export const DEFAULT_CITY_IDS = [
  'austin', 'saopaulo', 'bristol', 'bangalore',
];

const STORAGE_KEY = 'pismo-active-cities';

const loadActiveCityIds = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_CITY_IDS;
};

const GRADIENT_STOPS = [
  { time: 0,  top: [14, 16, 44],    bottom: [24, 18, 54]    },  // midnight — desaturated navy
  { time: 4,  top: [28, 40, 80],    bottom: [52, 18, 6]     },  // pre-dawn — blue softened
  { time: 6,  top: [66, 100, 164],  bottom: [240, 146, 20]  },  // dawn — unchanged
  { time: 9,  top: [98, 168, 222],  bottom: [165, 194, 224] },  // morning — unchanged
  { time: 12, top: [102, 164, 212], bottom: [135, 180, 220] },  // noon — unchanged
  { time: 17, top: [222, 158, 52],  bottom: [70, 138, 240]  },  // dusk — amber desaturated
  { time: 19, top: [206, 110, 56],  bottom: [46, 42, 116]   },  // sunset — orange-red & blue desaturated
  { time: 21, top: [26, 22, 70],    bottom: [14, 12, 40]    },  // night — indigo desaturated
  { time: 24, top: [14, 16, 44],    bottom: [24, 18, 54]    },  // back to midnight
];

const srgbToLinear = (value) => {
  const channel = value / 255;
  if (channel <= 0.04045) return channel / 12.92;
  return ((channel + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ([r, g, b]) => {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

const getGradientColors = (hour, minute) => {
  const timeValue = hour + (minute / 60);

  let i = 0;
  while(i < GRADIENT_STOPS.length - 1 && timeValue >= GRADIENT_STOPS[i+1].time) i++;

  const lower = GRADIENT_STOPS[i];
  const upper = GRADIENT_STOPS[i+1] || GRADIENT_STOPS[0];

  const range = upper.time - lower.time;
  const t = range > 0 ? (timeValue - lower.time) / range : 0;

  const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const topColor = lerp(lower.top, upper.top, t);
  const bottomColor = lerp(lower.bottom, upper.bottom, t);
  const averageLuminance = (relativeLuminance(topColor) + relativeLuminance(bottomColor)) / 2;
  const contrastOverlay = Math.max(0, Math.min(0.22, (averageLuminance - 0.42) * 0.48));

  return {
    top: `rgb(${topColor.join(',')})`,
    bottom: `rgb(${bottomColor.join(',')})`,
    contrastOverlay,
  };
};

const getWorkState = (hour, weekday, country, isoDate) => {
  // Weekend (Sat=6, Sun=7 in Luxon) or holiday = outside
  if (weekday === 6 || weekday === 7) return 'outside';
  if (country && isoDate && isHoliday(country, isoDate)) return 'outside';
  if (hour >= 9 && hour < 18) return 'working';
  if (hour >= 7 && hour < 9) return 'startingSoon';
  return 'outside';
};

const detectUserTimezone = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const exactMatch = CITIES.find(c => c.timezone === tz);
    if (exactMatch) return exactMatch.id;

    const now = DateTime.now();
    const userOffset = now.offset;
    const sameOffsetCity = CITIES.find(city => {
      const cityOffset = now.setZone(city.timezone).offset;
      return cityOffset === userOffset;
    });

    return sameOffsetCity ? sameOffsetCity.id : 'saopaulo';
  } catch {
    return 'saopaulo';
  }
};

export function useTimeConversion() {
  const [sourceId, setSourceId] = useState(() => detectUserTimezone());
  const [sourceDateTime, setSourceDateTime] = useState(() => {
    const detectedId = detectUserTimezone();
    const city = CITIES.find(c => c.id === detectedId) || CITIES[0];
    return DateTime.now().setZone(city.timezone);
  });
  const [use24Hour, setUse24Hour] = useState(false);
  const [tick, setTick] = useState(0);
  const [activeCityIds, setActiveCityIds] = useState(loadActiveCityIds);
  const intervalRef = useRef(null);

  // Persist activeCityIds whenever it changes
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activeCityIds)); } catch { /* ignore */ }
  }, [activeCityIds]);

  const addCity = useCallback((id) => {
    setActiveCityIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const removeCity = useCallback((id) => {
    if (id === 'saopaulo') return; // anchor city is always shown
    setActiveCityIds(prev => prev.filter(c => c !== id));
  }, []);

  const resetToDefaults = useCallback(() => {
    setActiveCityIds([...DEFAULT_CITY_IDS]);
  }, []);

  // Refs to avoid stale closures in the tick interval
  const isLiveRef = useRef(true);
  const sourceIdRef = useRef(sourceId);
  useEffect(() => { sourceIdRef.current = sourceId; }, [sourceId]);

  const doTick = useCallback(() => {
    setTick(t => t + 1);
    if (isLiveRef.current) {
      const city = CITIES.find(c => c.id === sourceIdRef.current) || CITIES[0];
      setSourceDateTime(DateTime.now().setZone(city.timezone));
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(doTick, 1000);

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current);
      } else {
        doTick();
        intervalRef.current = setInterval(doTick, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [doTick]);

  const sourceCity = useMemo(() => {
    return CITIES.find(c => c.id === sourceId) || CITIES[0];
  }, [sourceId]);

  const convertedTimes = useMemo(() => {
    // Keep `tick` as an explicit dependency to recompute seconds every second.
    void tick;

    // Always include saopaulo (anchor) + whatever is active
    const citySet = new Set(['saopaulo', ...activeCityIds]);

    return CITIES.filter(city => citySet.has(city.id)).map(city => {
      const convertedDt = sourceDateTime.setZone(city.timezone);
      const nowInZone = DateTime.now().setZone(city.timezone);
      const hour = convertedDt.hour;
      const minute = convertedDt.minute;

      const gradientColors = getGradientColors(hour, minute);
      const workState = getWorkState(hour, convertedDt.weekday, city.country, convertedDt.toISODate());

      // Compare local calendar dates as plain ISO strings — avoids UTC-midnight
      // comparison bug where timezones far apart yield wrong ±1d results.
      const sourceDay = DateTime.fromISO(sourceDateTime.toISODate());
      const cityDay   = DateTime.fromISO(convertedDt.toISODate());
      const dayOffset = Math.round(cityDay.diff(sourceDay, 'days').days);

      let dayLabel = null;
      if (dayOffset === 1) dayLabel = '+1d';
      else if (dayOffset === -1) dayLabel = '-1d';
      else if (dayOffset > 1) dayLabel = `+${dayOffset}d`;
      else if (dayOffset < -1) dayLabel = `${dayOffset}d`;

      const offsetMinutes = convertedDt.offset;
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const offsetSign = offsetMinutes >= 0 ? '+' : '-';
      const utcOffset = offsetMins > 0
        ? `UTC${offsetSign}${offsetHours}:${String(offsetMins).padStart(2, '0')}`
        : `UTC${offsetSign}${offsetHours}`;

      const isDST = convertedDt.isInDST;
      const tzAbbreviation = convertedDt.toFormat('ZZZZ');

      return {
        ...city,
        dateTime: convertedDt,
        hour,
        minute,
        second: nowInZone.second,
        isSource: city.id === sourceId,
        workState,
        dayOffset,
        dayLabel,
        utcOffset,
        isDST,
        tzAbbreviation,
        gradientColors,
        contrastOverlay: gradientColors.contrastOverlay,
        formattedTime: convertedDt.toFormat('HH:mm'),
        formattedSeconds: String(nowInZone.second).padStart(2, '0'),
        formattedDate: convertedDt.toFormat('EEE, MMM d'),
      };
    });
  }, [sourceDateTime, sourceId, tick, activeCityIds]);

  const groupedCities = useMemo(() => {
    const others = convertedTimes.filter(c => c.id !== 'saopaulo');
    const sortByOffsetThenName = (a, b) =>
      a.dateTime.offset !== b.dateTime.offset
        ? a.dateTime.offset - b.dateTime.offset
        : a.name.localeCompare(b.name);
    return {
      working: others.filter(c => c.workState === 'working').sort(sortByOffsetThenName),
      startingSoon: others.filter(c => c.workState === 'startingSoon').sort(sortByOffsetThenName),
      outside: others.filter(c => c.workState === 'outside').sort(sortByOffsetThenName),
    };
  }, [convertedTimes]);

  const brazilTime = convertedTimes.find(c => c.id === 'saopaulo');

  // allCities is the full registry sorted by UTC offset — for the selector pool
  const allCities = useMemo(() => {
    return [...CITIES].sort((a, b) => {
      const offA = DateTime.now().setZone(a.timezone).offset;
      const offB = DateTime.now().setZone(b.timezone).offset;
      return offA !== offB ? offA - offB : a.name.localeCompare(b.name);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // sortedCities alias kept for backward compat with CitySelector source picker
  const sortedCities = allCities;

  const updateTime = useCallback((updates) => {
    isLiveRef.current = false; // User is pinning a specific time
    setSourceDateTime(prev => {
      let newDt = prev;
      if (updates.hour !== undefined) newDt = newDt.set({ hour: updates.hour });
      if (updates.minute !== undefined) newDt = newDt.set({ minute: updates.minute });
      if (updates.date !== undefined) {
        const [year, month, day] = updates.date.split('-').map(Number);
        newDt = newDt.set({ year, month, day });
      }
      return newDt;
    });
  }, []);

  const setToNow = useCallback(() => {
    isLiveRef.current = true; // Resume live mode
    const now = DateTime.now().setZone(sourceCity.timezone);
    setSourceDateTime(now);
  }, [sourceCity]);

  const setSource = useCallback((newSourceId) => {
    if (newSourceId === sourceId) return;
    const newSourceCity = CITIES.find(c => c.id === newSourceId);
    if (!newSourceCity) return;
    const newSourceTime = sourceDateTime.setZone(newSourceCity.timezone);
    setSourceId(newSourceId);
    setSourceDateTime(newSourceTime);
  }, [sourceId, sourceDateTime]);

  const toggleFormat = useCallback(() => {
    setUse24Hour(prev => !prev);
  }, []);

  const sourceTimeComponents = useMemo(() => {
    const hour = sourceDateTime.hour;
    return {
      hour,
      minute: sourceDateTime.minute,
      date: sourceDateTime.toFormat('yyyy-MM-dd'),
    };
  }, [sourceDateTime]);

  return {
    sourceDateTime,
    sourceId,
    sourceCity,
    use24Hour,
    brazilTime,
    groupedCities,
    convertedTimes,
    sourceTimeComponents,
    cities: CITIES,
    sortedCities,
    allCities,
    activeCityIds,
    addCity,
    removeCity,
    resetToDefaults,
    updateTime,
    setToNow,
    setSource,
    toggleFormat,
  };
}