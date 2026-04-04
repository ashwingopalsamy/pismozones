import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Exclude Vercel Edge Functions from Vite's build.
  // api/ files use @vercel/og and other server-only modules that cannot
  // be bundled by Vite — Vercel handles them independently at deploy time.
  build: {
    rollupOptions: {
      external: (id) => id.startsWith('@vercel/og'),
      output: {
        manualChunks: undefined,
      },
    },
  },
})
