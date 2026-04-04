export const config = { runtime: 'edge' };

// ─── Inlined from _shared.js ─────────────────────────────────────────────────
// IMPORTANT: CITIES order must match src/hooks/useTimeConversion.js exactly.
// Only APPEND new cities. Never reorder or remove.
const CITIES = [
  { id: 'saopaulo',     name: 'Sao Paulo',     flag: '\u{1F1E7}\u{1F1F7}', timezone: 'America/Sao_Paulo' },
  { id: 'austin',       name: 'Austin',         flag: '\u{1F1FA}\u{1F1F8}', timezone: 'America/Chicago' },
  { id: 'bristol',      name: 'Bristol',         flag: '\u{1F1EC}\u{1F1E7}', timezone: 'Europe/London' },
  { id: 'bangalore',    name: 'Bangalore',       flag: '\u{1F1EE}\u{1F1F3}', timezone: 'Asia/Kolkata' },
  { id: 'singapore',    name: 'Singapore',       flag: '\u{1F1F8}\u{1F1EC}', timezone: 'Asia/Singapore' },
  { id: 'warsaw',       name: 'Warsaw',          flag: '\u{1F1F5}\u{1F1F1}', timezone: 'Europe/Warsaw' },
  { id: 'mexicocity',   name: 'Mexico City',     flag: '\u{1F1F2}\u{1F1FD}', timezone: 'America/Mexico_City' },
  { id: 'buenosaires',  name: 'Buenos Aires',    flag: '\u{1F1E6}\u{1F1F7}', timezone: 'America/Argentina/Buenos_Aires' },
  { id: 'bogota',       name: 'Bogota',          flag: '\u{1F1E8}\u{1F1F4}', timezone: 'America/Bogota' },
  { id: 'sydney',       name: 'Sydney',          flag: '\u{1F1E6}\u{1F1FA}', timezone: 'Australia/Sydney' },
  { id: 'hochiminh',    name: 'Ho Chi Minh',     flag: '\u{1F1FB}\u{1F1F3}', timezone: 'Asia/Ho_Chi_Minh' },
  { id: 'jakarta',      name: 'Jakarta',         flag: '\u{1F1EE}\u{1F1E9}', timezone: 'Asia/Jakarta' },
];

const EPOCH = new Date('2025-01-01T00:00:00Z');

function decodeHash(hash) {
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
    CITIES.forEach((city, i) => { if (cityBits & (1 << i)) cityIds.push(city.id); });
    const source = CITIES[sourceIdx];
    const cities = cityIds.map(id => CITIES.find(c => c.id === id)).filter(Boolean);
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const time12 = `${h12}:${String(minute).padStart(2, '0')} ${period}`;
    const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { sourceId: source.id, sourceName: source.name, sourceFlag: source.flag, sourceTimezone: source.timezone, hour, minute, date, time24, time12, dateDisplay, cityIds, cities };
  } catch { return null; }
}

function getCityTime(sourceHour, sourceMinute, sourceTimezone, targetTimezone) {
  const now = new Date();
  const sourceLocal = new Date(now.toLocaleString('en-US', { timeZone: sourceTimezone }));
  const targetLocal = new Date(now.toLocaleString('en-US', { timeZone: targetTimezone }));
  const diffMinutes = Math.round((targetLocal - sourceLocal) / 60000);
  let totalMinutes = sourceHour * 60 + sourceMinute + diffMinutes;
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const period = h >= 12 ? 'PM' : 'AM';
  return { hour: h, minute: m, time24: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, time12: `${h12}:${String(m).padStart(2, '0')} ${period}` };
}
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const HASH_RE = /^[0-9a-z]{7,16}$/;
const CANONICAL_ORIGIN = 'https://pismozones.vercel.app';

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const rawHash = searchParams.get('h') || '';

  // Validate: only base36 chars, 7-16 chars long
  const hash = HASH_RE.test(rawHash) ? rawHash : '';

  // Hardcode origin to prevent Host header injection
  const origin = CANONICAL_ORIGIN;

  const data = hash ? decodeHash(hash) : null;

  // Fallback values
  const title = data
    ? `Pismo Zones \u2013 ${data.sourceName} at ${data.time12}`
    : 'Pismo Zones \u2013 Global Timezone Converter';

  const cityNames = data
    ? data.cities.map(c => {
        const t = getCityTime(data.hour, data.minute, data.sourceTimezone, c.timezone);
        return `${c.name} ${t.time12}`;
      }).join(' \u00b7 ')
    : 'Track time across Pismo offices worldwide.';

  const description = data
    ? `${data.dateDisplay} \u2013 ${cityNames}`
    : 'Track time across Pismo offices in Sao Paulo, Bristol, Bangalore, Austin & Singapore. Privacy-first, zero-tracking.';

  const ogImageUrl = `${origin}/og-image.png`;

  // Redirect real users to the SPA with the share param
  const spaUrl = `${origin}/?share=${encodeURIComponent(hash)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(`${origin}/s/${hash}`)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:site_name" content="Pismo Zones" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
  <meta name="twitter:creator" content="@ashwin2125" />

  <!-- Redirect real users to SPA -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}" />
  <link rel="canonical" href="${escapeHtml(`${origin}/s/${hash}`)}" />
</head>
<body style="font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0f11;color:#fff;margin:0;">
  <div style="text-align:center;padding:2rem;">
    <h1 style="font-size:1.5rem;margin-bottom:0.5rem;">Pismo Zones</h1>
    <p style="opacity:0.6;">Redirecting...</p>
    <p style="margin-top:1rem;"><a href="${escapeHtml(spaUrl)}" style="color:#4A90D9;">Click here if not redirected</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  });
}
