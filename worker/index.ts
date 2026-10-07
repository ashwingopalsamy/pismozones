import type { Lang } from '@core/i18n';
import { renderSharePage } from './share';

const SHARE_PATH = /^\/s\/([^/]+)\/?$/;

const langFrom = (header: string | null): Lang =>
  (header ?? '').trim().toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';

// Runs only for `run_worker_first` paths (/s/*, /e); everything else is a static-asset hit.
export default {
  async fetch(request, env) {
    const token = SHARE_PATH.exec(new URL(request.url).pathname)?.[1];
    if (token && (request.method === 'GET' || request.method === 'HEAD')) {
      const shell = await env.ASSETS.fetch(new Request(new URL('/', request.url)));
      return renderSharePage(shell, token, langFrom(request.headers.get('accept-language')));
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
