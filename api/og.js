import { ImageResponse } from '@vercel/og';
import { CITIES, decodeHash, getCityTime, getGradientForHour } from './_shared.js';

export const config = { runtime: 'edge' };

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
          <span style={{
            fontSize: '14px', color: 'rgba(255,255,255,0.3)', marginTop: '32px',
          }}>
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
        { name: 'Inter', data: fontRegular, weight: 400 },
        { name: 'Inter', data: fontSemibold, weight: 600 },
      ],
    },
  );
}
