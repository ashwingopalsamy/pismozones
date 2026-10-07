import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export const alias = {
  '@core': dir('./src/core'),
  '@state': dir('./src/state'),
  '@ui': dir('./src/ui'),
};

const { version } = JSON.parse(readFileSync(dir('./package.json'), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [preact(), cloudflare()],
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(version) },
  resolve: { alias },
});
