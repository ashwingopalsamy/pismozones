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

export default defineConfig({
  plugins: [preact(), cloudflare()],
  resolve: { alias },
});
