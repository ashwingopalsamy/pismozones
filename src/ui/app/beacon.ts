const SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

/** Cloudflare Web Analytics (cookieless page views, Core Web Vitals); a no-op without a token. */
export function injectBeacon(token: string | undefined, doc: Document): void {
  if (!token || doc.querySelector('script[data-cf-beacon]')) return;
  const script = doc.createElement('script');
  script.defer = true;
  script.src = SRC;
  script.dataset.cfBeacon = JSON.stringify({ token, spa: true });
  doc.head.append(script);
}
