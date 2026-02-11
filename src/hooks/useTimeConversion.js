import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DateTime } from 'luxon';

export const CITIES = [
  {
    id: 'saopaulo',
    name: 'São Paulo',
    country: 'Brazil',
    timezone: 'America/Sao_Paulo',
    flag: '🇧🇷',
    address: 'Av. Brg. Faria Lima, 4221 São Paulo, SP, 04538-133',
  },
  {
    id: 'austin',
    name: 'Austin',
    country: 'USA',
    timezone: 'America/Chicago',
    flag: '🇺🇸',
    address: '12401 Research Blvd, Building II, Austin, Texas, 78759',
  },
  {
    id: 'bristol',
    name: 'Bristol',
    country: 'UK',
    timezone: 'Europe/London',
    flag: '🇬🇧',
    address: 'One Temple Quay, Temple Back E, Bristol, BS1 6DZ',
  },
  {
    id: 'bangalore',
    name: 'Bangalore',
    country: 'India',
    timezone: 'Asia/Kolkata',
    flag: '🇮🇳',
    address: 'Regus The Estate, 8th Floor, Dickenson Road, Bangalore, 560042',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    timezone: 'Asia/Singapore',
    flag: '🇸🇬',
    address: 'Level 8, 71 Robinson Road, Singapore, 068895',
  },
];

const GRADIENT_STOPS = [
  { time: 0, top: [10, 10, 18], bottom: [26, 26, 46] },
  { time: 4, top: [30, 42, 74], bottom: [42, 26, 10] },
  { time: 6, top: [74, 106, 154], bottom: [245, 166, 35] },
  { time: 9, top: [125, 211, 252], bottom: [224, 242, 254] },
  { time: 12, top: [135, 206, 235], bottom: [186, 230, 253] },
  { time: 17, top: [251, 191, 36], bottom: [96, 165, 250] },
  { time: 19, top: [249, 115, 22], bottom: [49, 46, 129] },
  { time: 21, top: [30, 27, 75], bottom: [15, 10, 26] },
  { time: 24, top: [10, 10, 18], bottom: [26, 26, 46] },
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

const getWorkState = (hour) => {
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
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const sourceCity = useMemo(() => {
    return CITIES.find(c => c.id === sourceId) || CITIES[0];
  }, [sourceId]);

  const convertedTimes = useMemo(() => {
    // Keep `tick` as an explicit dependency to recompute seconds every second.
    void tick;
    
    return CITIES.map(city => {
      const convertedDt = sourceDateTime.setZone(city.timezone);
      const nowInZone = DateTime.now().setZone(city.timezone);
      const hour = convertedDt.hour;
      const minute = convertedDt.minute;
      
      const gradientColors = getGradientColors(hour, minute);
      const workState = getWorkState(hour);
      
      const sourceDay = sourceDateTime.startOf('day');
      const cityDay = convertedDt.startOf('day');
      const dayOffset = Math.round(cityDay.diff(sourceDay, 'days').days);
      
      let dayLabel = null;
      if (dayOffset === 1) dayLabel = 'Tomorrow';
      else if (dayOffset === -1) dayLabel = 'Yesterday';
      else if (dayOffset > 1) dayLabel = `+${dayOffset} days`;
      else if (dayOffset < -1) dayLabel = `${dayOffset} days`;
      
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
  }, [sourceDateTime, sourceId, tick]);

  const groupedCities = useMemo(() => {
    const others = convertedTimes.filter(c => c.id !== 'saopaulo');
    return {
      working: others.filter(c => c.workState === 'working'),
      startingSoon: others.filter(c => c.workState === 'startingSoon'),
      outside: others.filter(c => c.workState === 'outside'),
    };
  }, [convertedTimes]);

  const brazilTime = convertedTimes.find(c => c.id === 'saopaulo');

  const updateTime = useCallback((updates) => {
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
    sourceId,
    sourceCity,
    use24Hour,
    brazilTime,
    groupedCities,
    convertedTimes,
    sourceTimeComponents,
    cities: CITIES,
    updateTime,
    setToNow,
    setSource,
    toggleFormat,
  };
}
