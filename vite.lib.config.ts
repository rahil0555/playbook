import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Optional library build: `npm run build:lib` -> dist-lib/ (ESM + one CSS file).
// React, ReactDOM and Framer Motion are peer dependencies and are NOT bundled.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    // keep fonts as separate files (referenced relatively from the CSS) instead of base64 in the stylesheet
    assetsInlineLimit: 0,
    outDir: 'dist-lib',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/playlab/index.ts'),
      formats: ['es'],
      fileName: () => 'playlab.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'framer-motion'],
    },
  },
});
