import { useMemo } from 'react';
import { DateTime } from 'luxon';
import { CITIES } from './useTimeConversion';

// Country-to-code fallback for cities missing the `code` field in CITIES.
const COUNTRY_CODE_MAP = {
  'India': 'IN',
  'Singapore': 'SG',
  'Poland': 'PL',
  'Mexico': 'MX',
  'Argentina': 'AR',
  'Colombia': 'CO',
  'Australia': 'AU',
};

function getCityCode(city) {
  return city.code || COUNTRY_CODE_MAP[city.country] || city.country;
}

/**
 * Classify a fractional hour into a penalty score and human-readable impact label.
 *
 * Ranges (t = hour + minute/60):
 *   9.0 <= t < 18.0  ->  score 0, 'ok'
 *  18.0 <= t < 19.0  ->  score 1, 'at close'
 *   8.0 <= t <  9.0  ->  score 1, 'early'
 *  19.0 <= t < 20.0  ->  score 2, 'late'
 *   7.0 <= t <  8.0  ->  score 2, 'early'
 *   t < 7.0 or t >= 20.0 -> score 3, 'late' (if t>=18) or 'early' (if t<9)
 */
function classifyHour(t) {
  if (t >= 9.0 && t < 18.0) return { score: 0, impact: 'ok' };
  if (t >= 18.0 && t < 19.0) return { score: 1, impact: 'at close' };
  if (t >= 8.0 && t < 9.0) return { score: 1, impact: 'early' };
  if (t >= 19.0 && t < 20.0) return { score: 2, impact: 'late' };
  if (t >= 7.0 && t < 8.0) return { score: 2, impact: 'early' };
  // t < 7.0 or t >= 20.0
  if (t >= 18.0) return { score: 3, impact: 'late' };
  return { score: 3, impact: 'early' };
}

/**
 * Map impact label to a visual state for color coding.
 *   'ok'       -> 'ok'    (green)
 *   'early'    -> 'edge'  (amber) when score <= 2, 'out' (red) when score 3
 *   'at close' -> 'edge'  (amber)
 *   'late'     -> 'edge'  (amber) when score <= 2, 'out' (red) when score 3
 */
function impactToState(impact, score) {
  if (impact === 'ok') return 'ok';
  if (score >= 3) return 'out';
  return 'edge';
}

/**
 * Build human-readable impact notes from per-city scores.
 * Groups cities by impact type (skip 'ok'), produces entries like:
 *   {type: 'early', text: 'US early'}
 *   {type: 'edge',  text: 'PL at close'}
 *   {type: 'late',  text: 'IN, SG late'}
 */
function buildImpactNotes(cityScores) {
  const groups = {};

  for (const cs of cityScores) {
    if (cs.impact === 'ok') continue;
    if (!groups[cs.impact]) groups[cs.impact] = [];
    groups[cs.impact].push(cs.code);
  }

  // Map impact labels to the display type used in the UI.
  // 'at close' renders as type 'edge', everything else matches directly.
  const impactToType = (impact) => {
    if (impact === 'at close') return 'edge';
    return impact; // 'early' or 'late'
  };

  return Object.entries(groups).map(([impact, codes]) => ({
    type: impactToType(impact),
    text: `${codes.join(', ')} ${impact}`,
  }));
}

/**
 * Compute ranked meeting time suggestions across selected timezones.
 *
 * Scores each hour slot (0-23) in the source city's timezone by converting
 * to every active city's local time and summing per-city penalties.
 *
 * @param {Object} params
 * @param {string[]} params.activeCityIds - IDs of cities to include
 * @param {DateTime} params.sourceDateTime - Luxon DateTime in source timezone
 * @param {string} params.sourceId - ID of the source city
 *
 * @returns {{ suggestions: Array, cities: Array, sourceCity: Object }}
 */
export function useMeetingSuggestions({ activeCityIds, sourceDateTime, sourceId }) {
  return useMemo(() => {
    const sourceCity = CITIES.find(c => c.id === sourceId) || CITIES[0];
    const activeCities = CITIES.filter(c => activeCityIds.includes(c.id));
    const cityCount = activeCities.length;

    // Active cities sorted by UTC offset, west to east
    const cities = [...activeCities].sort((a, b) => {
      const offA = sourceDateTime.setZone(a.timezone).offset;
      const offB = sourceDateTime.setZone(b.timezone).offset;
      return offA !== offB ? offA - offB : a.name.localeCompare(b.name);
    });

    // Use the source date as the reference day for conversions. We anchor
    // on midnight of the source date so each candidate hour converts to a
    // concrete instant that respects DST boundaries for that specific day.
    const refDate = sourceDateTime.startOf('day');

    // Score every 30-minute slot (48 slots) in the source timezone
    const scored = [];
    const allSlots = [];
    for (let slotIdx = 0; slotIdx < 48; slotIdx++) {
      const hour = Math.floor(slotIdx / 2);
      const minute = (slotIdx % 2) * 30;
      const slotStart = refDate.set({ hour, minute });
      let totalScore = 0;
      const cityScores = [];

      for (const city of cities) {
        const local = slotStart.setZone(city.timezone);
        const t = local.hour + local.minute / 60;
        const { score, impact } = classifyHour(t);
        totalScore += score;

        cityScores.push({
          id: city.id,
          code: getCityCode(city),
          name: city.name,
          hour: local.hour,
          minute: local.minute,
          state: impactToState(impact, score),
          impact,
          offset: local.offset,
        });
      }

      // Quality label
      let quality;
      if (totalScore <= Math.floor(cityCount * 0.5)) {
        quality = 'best';
      } else if (totalScore <= cityCount) {
        quality = 'good';
      } else {
        quality = 'stretch';
      }

      const okCount = cityScores.filter(cs => cs.state === 'ok').length;
      const fractionalHour = hour + minute / 60;

      const slot = {
        hour,
        minute,
        totalScore,
        quality,
        okCount,
        sweetLeft: (fractionalHour / 24) * 100,
        sweetWidth: (0.5 / 24) * 100,
        cityScores,
        impact: buildImpactNotes(cityScores),
      };

      scored.push(slot);
      allSlots.push(slot);
    }

    // Sort: ascending totalScore, then prefer slots closer to 14:00
    scored.sort((a, b) => {
      if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;
      const aFrac = a.hour + (a.minute || 0) / 60;
      const bFrac = b.hour + (b.minute || 0) / 60;
      return Math.abs(aFrac - 14) - Math.abs(bFrac - 14);
    });

    // Take top 3, deduplicated by hour (keep best slot per hour)
    const seenHours = new Set();
    const top = [];
    for (const slot of scored) {
      if (seenHours.has(slot.hour)) continue;
      seenHours.add(slot.hour);
      top.push(slot);
      if (top.length >= 3) break;
    }
    const suggestions = top.map((slot, i) => ({
      rank: i + 1,
      ...slot,
    }));

    return { suggestions, allSlots, cities, sourceCity };
  }, [activeCityIds, sourceDateTime, sourceId]);
}
