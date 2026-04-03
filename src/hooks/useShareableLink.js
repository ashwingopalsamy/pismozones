import { CITIES } from './useTimeConversion';

// Date epoch for compact encoding
const EPOCH = new Date('2025-01-01T00:00:00Z');

function toBase36Pad(num, len) {
  return num.toString(36).padStart(len, '0');
}

/**
 * Encode current view state into a compact hash string (~8 chars).
 * Format: <source:1><time:3><date:3><cities:1-2> (all base36)
 */
export function encodeShareLink(sourceId, hour, minute, dateStr, activeCityIds) {
  const sourceIdx = CITIES.findIndex(c => c.id === sourceId);
  if (sourceIdx < 0) return null;

  const timeMinutes = hour * 60 + minute;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateDays = Math.round((new Date(y, m - 1, d) - EPOCH) / 86400000);

  let cityBits = 0;
  activeCityIds.forEach(id => {
    const idx = CITIES.findIndex(c => c.id === id);
    if (idx >= 0) cityBits |= (1 << idx);
  });

  return sourceIdx.toString(36)
    + toBase36Pad(timeMinutes, 3)
    + toBase36Pad(dateDays, 3)
    + cityBits.toString(36);
}

/**
 * Decode a hash string back into view state.
 * Returns { sourceId, hour, minute, date, cityIds } or null if invalid.
 */
export function decodeShareLink(hash) {
  const h = hash.replace(/^#/, '');
  if (h.length < 7) return null;

  try {
    // Version check: if starts with 'v', it's a future version we don't support
    if (h[0] === 'v') return null;

    const sourceIdx = parseInt(h[0], 36);
    if (sourceIdx >= CITIES.length) return null;

    const timeMinutes = parseInt(h.slice(1, 4), 36);
    const hour = Math.floor(timeMinutes / 60);
    const minute = timeMinutes % 60;
    if (hour > 23 || minute > 59) return null;

    const dateDays = parseInt(h.slice(4, 7), 36);
    const dateMs = EPOCH.getTime() + dateDays * 86400000;
    const dateObj = new Date(dateMs);
    const date = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

    const cityBits = parseInt(h.slice(7), 36);
    const cityIds = [];
    CITIES.forEach((city, i) => {
      if (cityBits & (1 << i)) cityIds.push(city.id);
    });

    return {
      sourceId: CITIES[sourceIdx].id,
      hour,
      minute,
      date,
      cityIds,
    };
  } catch {
    return null;
  }
}

/**
 * Build the full shareable URL from current state.
 */
export function buildShareUrl(sourceId, hour, minute, dateStr, activeCityIds) {
  const hash = encodeShareLink(sourceId, hour, minute, dateStr, activeCityIds);
  if (!hash) return null;
  const base = window.location.origin + window.location.pathname;
  return `${base}#${hash}`;
}
