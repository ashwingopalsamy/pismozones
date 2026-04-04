// Shared decode logic for Vercel Edge Functions.
// IMPORTANT: CITIES order must match src/hooks/useTimeConversion.js exactly.
// Only APPEND new cities. Never reorder or remove.
export const CITIES = [
  { id: 'saopaulo', name: 'Sao Paulo', flag: '\u{1F1E7}\u{1F1F7}', timezone: 'America/Sao_Paulo' },
  { id: 'austin', name: 'Austin', flag: '\u{1F1FA}\u{1F1F8}', timezone: 'America/Chicago' },
  { id: 'bristol', name: 'Bristol', flag: '\u{1F1EC}\u{1F1E7}', timezone: 'Europe/London' },
  { id: 'bangalore', name: 'Bangalore', flag: '\u{1F1EE}\u{1F1F3}', timezone: 'Asia/Kolkata' },
  { id: 'singapore', name: 'Singapore', flag: '\u{1F1F8}\u{1F1EC}', timezone: 'Asia/Singapore' },
  { id: 'warsaw', name: 'Warsaw', flag: '\u{1F1F5}\u{1F1F1}', timezone: 'Europe/Warsaw' },
  { id: 'mexicocity', name: 'Mexico City', flag: '\u{1F1F2}\u{1F1FD}', timezone: 'America/Mexico_City' },
  { id: 'buenosaires', name: 'Buenos Aires', flag: '\u{1F1E6}\u{1F1F7}', timezone: 'America/Argentina/Buenos_Aires' },
  { id: 'bogota', name: 'Bogota', flag: '\u{1F1E8}\u{1F1F4}', timezone: 'America/Bogota' },
  { id: 'sydney', name: 'Sydney', flag: '\u{1F1E6}\u{1F1FA}', timezone: 'Australia/Sydney' },
  { id: 'hochiminh', name: 'Ho Chi Minh', flag: '\u{1F1FB}\u{1F1F3}', timezone: 'Asia/Ho_Chi_Minh' },
  { id: 'jakarta', name: 'Jakarta', flag: '\u{1F1EE}\u{1F1E9}', timezone: 'Asia/Jakarta' },
];

const EPOCH = new Date('2025-01-01T00:00:00Z');

export function decodeHash(hash) {
  const h = (hash || '').replace(/^#/, '');
  if (h.length < 7 || h.length > 16) return null;

  try {
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

    const source = CITIES[sourceIdx];
    const cities = cityIds.map(id => CITIES.find(c => c.id === id)).filter(Boolean);

    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const time12 = `${h12}:${String(minute).padStart(2, '0')} ${period}`;

    const dateDisplay = dateObj.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceFlag: source.flag,
      sourceTimezone: source.timezone,
      hour, minute, date,
      time24, time12, dateDisplay,
      cityIds,
      cities,
    };
  } catch {
    return null;
  }
}

// Compute time in a city given source time
export function getCityTime(sourceHour, sourceMinute, sourceTimezone, targetTimezone) {
  const now = new Date();
  const sourceLocal = new Date(now.toLocaleString('en-US', { timeZone: sourceTimezone }));
  const targetLocal = new Date(now.toLocaleString('en-US', { timeZone: targetTimezone }));
  const diffMinutes = Math.round((targetLocal - sourceLocal) / 60000);

  let totalMinutes = sourceHour * 60 + sourceMinute + diffMinutes;
  // Normalize to 0-1439
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const period = h >= 12 ? 'PM' : 'AM';

  return {
    hour: h,
    minute: m,
    time24: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    time12: `${h12}:${String(m).padStart(2, '0')} ${period}`,
  };
}

// Time-of-day gradient colors (simplified from client)
export function getGradientForHour(hour) {
  if (hour >= 6 && hour < 9) return { bg: '#4264a4', text: '#ffffff' };    // dawn
  if (hour >= 9 && hour < 17) return { bg: '#62a8de', text: '#ffffff' };   // day
  if (hour >= 17 && hour < 19) return { bg: '#de9e34', text: '#ffffff' };  // dusk
  if (hour >= 19 && hour < 21) return { bg: '#ce6e38', text: '#ffffff' };  // sunset
  return { bg: '#0e1028', text: '#ffffff' };                                // night
}
