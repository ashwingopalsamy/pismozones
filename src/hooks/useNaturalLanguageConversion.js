import { useCallback, useMemo } from 'react';
import { DateTime } from 'luxon';
import { isHoliday } from '../data/holidays.js';
import { CITIES } from './useTimeConversion.js';
import { parseNaturalTimeQuery, VIRTUAL_SOURCES } from '../lib/naturalTimeParser.js';
import { getGradientColors } from '../lib/timeCardStyles.js';

const CITY_BY_ID = new Map([
  ...CITIES.map(city => [city.id, city]),
  ...VIRTUAL_SOURCES,
]);

function getWorkState(hour, weekday, country, isoDate) {
  if (weekday === 6 || weekday === 7) return 'outside';
  if (country && isoDate && isHoliday(country, isoDate)) return 'outside';
  if (hour >= 9 && hour < 18) return 'working';
  if (hour >= 7 && hour < 9) return 'startingSoon';
  return 'outside';
}

function getUtcOffsetLabel(dateTime) {
  const offsetMinutes = dateTime.offset;
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';

  return offsetMins > 0
    ? `UTC${offsetSign}${offsetHours}:${String(offsetMins).padStart(2, '0')}`
    : `UTC${offsetSign}${offsetHours}`;
}

function getDayLabel(sourceDateTime, dateTime) {
  const sourceDay = DateTime.fromISO(sourceDateTime.toISODate());
  const cityDay = DateTime.fromISO(dateTime.toISODate());
  const dayOffset = Math.round(cityDay.diff(sourceDay, 'days').days);

  if (dayOffset === 1) return '+1d';
  if (dayOffset === -1) return '-1d';
  if (dayOffset > 1) return `+${dayOffset}d`;
  if (dayOffset < -1) return `${dayOffset}d`;
  return null;
}

function getDayOffset(sourceDateTime, dateTime) {
  const sourceDay = DateTime.fromISO(sourceDateTime.toISODate());
  const cityDay = DateTime.fromISO(dateTime.toISODate());
  return Math.round(cityDay.diff(sourceDay, 'days').days);
}

function formatTimeParts(dateTime, use24Hour) {
  if (use24Hour) {
    return {
      time: dateTime.toFormat('HH:mm'),
      period: '',
    };
  }

  const h12 = dateTime.hour === 0 ? 12 : dateTime.hour > 12 ? dateTime.hour - 12 : dateTime.hour;
  return {
    time: `${String(h12).padStart(2, '0')}:${dateTime.toFormat('mm')}`,
    period: dateTime.hour >= 12 ? 'PM' : 'AM',
  };
}

function buildConversionCity(city, dateTime, sourceDateTime, use24Hour) {
  const timeParts = formatTimeParts(dateTime, use24Hour);
  const workState = getWorkState(dateTime.hour, dateTime.weekday, city.country, dateTime.toISODate());
  const gradientColors = getGradientColors(dateTime.hour, dateTime.minute);

  return {
    ...city,
    dateTime,
    hour: dateTime.hour,
    minute: dateTime.minute,
    second: dateTime.second,
    time: timeParts.time,
    period: timeParts.period,
    formattedTime: dateTime.toFormat('HH:mm'),
    formattedSeconds: String(dateTime.second).padStart(2, '0'),
    formattedDate: dateTime.toFormat('EEE, MMM d'),
    dateLabel: dateTime.toFormat('EEE, MMM d'),
    dayOffset: getDayOffset(sourceDateTime, dateTime),
    dayLabel: getDayLabel(sourceDateTime, dateTime),
    utcOffset: getUtcOffsetLabel(dateTime),
    isDST: dateTime.isInDST,
    tzAbbreviation: dateTime.toFormat('ZZZZ'),
    gradientColors,
    contrastOverlay: gradientColors.contrastOverlay,
    workState,
  };
}

export function useNaturalLanguageConversion({
  query,
  sourceDateTime,
  sourceId,
  use24Hour,
  activeCityIds,
  setSource,
  updateTime,
  setActiveCities,
}) {
  const parsed = useMemo(() => {
    return parseNaturalTimeQuery(query, {
      sourceDateTime,
      sourceId,
      activeCityIds,
    });
  }, [query, sourceDateTime, sourceId, activeCityIds]);

  const conversion = useMemo(() => {
    if (parsed.status !== 'ready') {
      return {
        source: null,
        destinations: [],
      };
    }

    const source = buildConversionCity(
      parsed.sourceCity,
      parsed.sourceDateTime,
      parsed.sourceDateTime,
      use24Hour,
    );

    const destinations = parsed.destinationIds
      .map(id => CITY_BY_ID.get(id))
      .filter(Boolean)
      .map(city => buildConversionCity(
        city,
        parsed.sourceDateTime.setZone(city.timezone),
        parsed.sourceDateTime,
        use24Hour,
      ));

    return { source, destinations };
  }, [parsed, use24Hour]);

  const apply = useCallback(() => {
    if (parsed.status !== 'ready') return false;

    const nextActiveIds = [...new Set([
      ...activeCityIds,
      parsed.sourceCity.id,
      ...parsed.destinationIds,
    ])];

    setSource?.(parsed.sourceCity.id);
    updateTime?.({
      hour: parsed.time.hour,
      minute: parsed.time.minute,
      date: parsed.date,
    });
    setActiveCities?.(nextActiveIds);

    return true;
  }, [activeCityIds, parsed, setActiveCities, setSource, updateTime]);

  return {
    status: parsed.status,
    parsed,
    results: conversion.destinations,
    source: conversion.source,
    message: parsed.message,
    apply,
  };
}
