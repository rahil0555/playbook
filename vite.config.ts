/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps every asset URL relative, so the built app can be hosted
// at /, at /playlab/, or under any other sub-path without rebuilding.
// Navigation uses the URL hash, so no server-side rewrite rules are needed.
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: { include: ['react', 'react-dom', 'react/jsx-runtime', 'framer-motion'] },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/playlab/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    css: false,
    // Every activity screen is its own lazily loaded chunk (app/routes.tsx). The FIRST test to
    // touch a chunk pays its import cost in jsdom, which can exceed vitest's 5s default; the
    // queries in those tests already allow 15s, so give the whole test the same budget.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
