import { CITIES, decodeHash, getCityTime } from './_shared.js';

export const config = { runtime: 'edge' };

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

  const ogImageUrl = data
    ? `${origin}/api/og?h=${encodeURIComponent(hash)}`
    : `${origin}/api/og`;

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
