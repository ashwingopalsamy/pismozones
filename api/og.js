import { ImageResponse } from '@vercel/og';

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

function getGradientForHour(hour) {
  if (hour >= 6  && hour < 9)  return { bg: '#4264a4', text: '#ffffff' }; // dawn
  if (hour >= 9  && hour < 17) return { bg: '#62a8de', text: '#ffffff' }; // day
  if (hour >= 17 && hour < 19) return { bg: '#de9e34', text: '#ffffff' }; // dusk
  if (hour >= 19 && hour < 21) return { bg: '#ce6e38', text: '#ffffff' }; // sunset
  return { bg: '#0e1028', text: '#ffffff' };                               // night
}
// ─────────────────────────────────────────────────────────────────────────────

const HASH_RE = /^[0-9a-z]{7,16}$/;

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const rawHash = searchParams.get('h');

  // Validate: only base36 chars, 7-16 chars long
  const hash = rawHash && HASH_RE.test(rawHash) ? rawHash : null;

  // If hash was provided but invalid, return 400 early (no font fetch)
  if (rawHash && !hash) {
    return new Response('Invalid share hash', { status: 400 });
  }

  const data = hash ? decodeHash(hash) : null;

  // Load Inter font from self-hosted files (same deployment, no external CDN)
  const origin = new URL(req.url).origin;
  const fontData = await fetch(`${origin}/fonts/inter-latin.woff2`).then(r => r.arrayBuffer());

  if (!data) {
    // Static branded image (no share hash)
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0f11 0%, #1a1a2e 50%, #16213e 100%)',
          fontFamily: 'Inter',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', display: 'flex',
              background: 'linear-gradient(135deg, #4A90D9, #F5A623, #E8984A)',
              opacity: 0.9,
            }} />
            <span style={{ fontSize: '52px', fontWeight: 600, color: '#ffffff' }}>
              Pismo Zones
            </span>
          </div>
          <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.6)', marginBottom: '48px' }}>
            Global Timezone Converter for Distributed Teams
          </span>
          <div style={{ display: 'flex', gap: '16px' }}>
            {['Sao Paulo', 'Austin', 'Bristol', 'Bangalore', 'Singapore'].map((name, i) => {
              const colors = [
                { bg: '#62a8de' }, { bg: '#0e1028' }, { bg: '#62a8de' },
                { bg: '#de9e34' }, { bg: '#ce6e38' },
              ];
              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  width: '180px', height: '80px', borderRadius: '16px',
                  background: colors[i].bg, color: '#ffffff',
                  fontSize: '14px', gap: '4px',
                }}>
                  <span style={{ fontSize: '13px', opacity: 0.8 }}>{name}</span>
                  <span style={{ fontSize: '22px', fontWeight: 600 }}>--:--</span>
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', marginTop: '32px' }}>
            pismozones.vercel.app
          </span>
        </div>
      ),
      {
        width: 1200, height: 630,
        fonts: [
          { name: 'Inter', data: fontData, weight: 400 },
          { name: 'Inter', data: fontData, weight: 600 },
        ],
      },
    );
  }

  // Dynamic image for shared link
  const sharedCities = data.cities
    .filter(c => c.id !== data.sourceId)
    .slice(0, 5)
    .map(c => {
      const t = getCityTime(data.hour, data.minute, data.sourceTimezone, c.timezone);
      const grad = getGradientForHour(t.hour);
      return { ...c, ...t, ...grad };
    });

  const sourceGrad = getGradientForHour(data.hour);

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f0f11 0%, #1a1a2e 50%, #16213e 100%)',
        fontFamily: 'Inter', padding: '48px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
            background: 'linear-gradient(135deg, #4A90D9, #F5A623, #E8984A)',
            opacity: 0.9,
          }} />
          <span style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff' }}>
            Pismo Zones
          </span>
          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', marginLeft: '12px' }}>
            Shared View
          </span>
        </div>

        {/* Source city hero */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: sourceGrad.bg, borderRadius: '20px', padding: '28px 36px',
          marginBottom: '24px', color: sourceGrad.text,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>{data.sourceFlag}</span>
              <span style={{ fontSize: '28px', fontWeight: 600 }}>{data.sourceName}</span>
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '3px 10px',
                background: 'rgba(255,255,255,0.2)', borderRadius: '100px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>Source</span>
            </div>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>{data.dateDisplay}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '64px', fontWeight: 600, letterSpacing: '-2px' }}>
              {data.time24}
            </span>
          </div>
        </div>

        {/* Other cities grid */}
        {sharedCities.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {sharedCities.map((city, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flex: sharedCities.length <= 3 ? '1 1 0' : '1 1 calc(50% - 8px)',
                minWidth: '200px',
                background: city.bg, borderRadius: '16px', padding: '18px 24px',
                color: city.text,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{city.flag}</span>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>{city.name}</span>
                </div>
                <span style={{ fontSize: '28px', fontWeight: 600 }}>{city.time24}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 'auto', paddingTop: '16px',
        }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
            pismozones.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      fonts: [
        { name: 'Inter', data: fontData, weight: 400 },
        { name: 'Inter', data: fontData, weight: 600 },
      ],
    },
  );
}
