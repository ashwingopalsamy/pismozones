import type { Lang } from '@core/i18n';
import { decodeShare } from '@core/share/codec';
import { CANONICAL_ORIGIN, SECURITY_HEADERS } from './headers';
import { ogText } from './og';

const setContent = (value: string) => ({
  element(e: Element) {
    e.setAttribute('content', value);
  },
});

/** The SPA shell with share-specific meta, so link previews match what the app will show. */
export function renderSharePage(shell: Response, token: string, lang: Lang): Response {
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=300',
    ...SECURITY_HEADERS,
  });
  const page = new Response(shell.body, { status: 200, headers });
  const decoded = decodeShare(token);
  if (!decoded)
    // The SPA reads this to show its "invalid link" notice; the generic meta stays.
    return new HTMLRewriter()
      .on('html', {
        element(e) {
          e.setAttribute('data-share-error', '1');
        },
      })
      .transform(page);

  const { title, description } = ogText(decoded, lang);
  const url = `${CANONICAL_ORIGIN}/s/${token}`;
  return new HTMLRewriter()
    .on('title', {
      element(e) {
        e.setInnerContent(title);
      },
    })
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[name="twitter:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[name="twitter:description"]', setContent(description))
    .on('meta[property="og:url"]', setContent(url))
    .on('link[rel="canonical"]', {
      element(e) {
        e.setAttribute('href', url);
      },
    })
    .transform(page);
}
