const SRC = '/_vercel/insights/script.js';

/** Vercel Web Analytics on the Vercel mirror (same-origin script; enabled on the Vercel project). */
export function injectVercelAnalytics(doc: Document): void {
  if (doc.querySelector(`script[src="${SRC}"]`)) return;
  const script = doc.createElement('script');
  script.defer = true;
  script.src = SRC;
  doc.head.append(script);
}
