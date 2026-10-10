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
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
