import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@core': dir('./src/core'),
      '@state': dir('./src/state'),
      '@ui': dir('./src/ui'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['src/core/**/*.test.ts', 'src/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          include: ['src/state/**/*.test.{ts,tsx}', 'src/ui/**/*.test.{ts,tsx}'],
          setupFiles: ['src/test-setup.ts'],
        },
      },
      {
        extends: true,
        // Pure handlers run in Node; *.workerd.test.ts run the bundled Worker in workerd (worker/testing.ts).
        test: { name: 'worker', environment: 'node', include: ['worker/**/*.test.ts'] },
      },
    ],
  },
});
