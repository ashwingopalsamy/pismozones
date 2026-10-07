import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export const alias = {
  '@core': dir('./src/core'),
  '@state': dir('./src/state'),
  '@ui': dir('./src/ui'),
};

const { version } = JSON.parse(readFileSync(dir('./package.json'), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [
    preact(),
    cloudflare(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Pismo Zones',
        short_name: 'Pismo Zones',
        description:
          "What time is it for the team? Pismo's time zones, meetings and holidays — computed on your device.",
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'Plan a meeting', url: '/?view=plan' },
          { name: 'Holidays', url: '/?panel=holidays' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,webmanifest}'],
        // The link-preview image is for crawlers, not the offline app.
        globIgnores: ['og-image.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/s\//, /^\/e$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/s/'),
            // Never cached: a stored share page would reference hashed assets a later deploy deletes.
            handler: 'NetworkFirst',
            options: {
              cacheName: 'share-pages',
              networkTimeoutSeconds: 3,
              // Offline or slow: the precached shell (keyed with a revision query).
              plugins: [
                { cacheWillUpdate: async () => null },
                {
                  handlerDidError: async () =>
                    (await caches.match('/index.html', { ignoreSearch: true })) ?? undefined,
                },
              ],
            },
          },
        ],
      },
    }),
  ],
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(version) },
  resolve: { alias },
});
