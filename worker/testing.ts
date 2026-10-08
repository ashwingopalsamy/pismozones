import { build } from 'esbuild';
import { type Request as MfRequest, Response as MfResponse, Miniflare } from 'miniflare';

/** Bundles the real Worker and runs it in workerd; ASSETS is served by `assets(path)`. */
export async function startWorker(assets: (path: string) => string) {
  const out = await build({
    entryPoints: ['worker/index.ts'],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2023',
    tsconfig: 'tsconfig.worker.json',
    write: false,
  });
  // Miniflare 5 (the runtime wrangler itself uses): a manifest plus typed env bindings.
  return new Miniflare({
    workers: [
      {
        config: {
          name: 'pismozones',
          compatibilityDate: '2026-10-01',
          manifest: {
            mainModule: 'index.js',
            modules: { 'index.js': { type: 'esm', contents: out.outputFiles[0]?.text ?? '' } },
          },
          env: {
            EVENTS: { type: 'analytics-engine-dataset', name: 'pismozones_events' },
            ASSETS: {
              type: 'fetcher',
              handler: (request: MfRequest) =>
                new MfResponse(assets(new URL(request.url).pathname), {
                  headers: { 'content-type': 'text/html' },
                }),
            },
          },
        },
      },
    ],
  });
}
