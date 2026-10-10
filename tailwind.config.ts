import type { Config } from 'tailwindcss';

/**
 * Tailwind is scoped to PlayLab so it can live next to another Tailwind (or
 * non-Tailwind) app without collisions:
 *  - `important: '.pl-root.pl-root'` scopes every utility under the PlayLab root element. The class is doubled on
 *    purpose: it raises specificity to (0,3,0) so utilities beat PlayLab's own reset (0,2,1), which in turn
 *    beats ordinary host rules such as `button {}` or `.app button {}`.
 *  - `preflight: false` means no global reset leaks out; a scoped reset lives in
 *    src/playlab/styles/playlab.css
 */
export default {
  content: ['./src/playlab/**/*.{ts,tsx}', './src/standalone/**/*.{ts,tsx}', './index.html'],
  important: '.pl-root.pl-root',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Edurance brand teal (#16a286 is brand-500). The scale lives in CSS variables
        // (see styles/playlab.css and lib/theme.ts) so hosts can re-brand via the `theme` prop.
        // Use 500 for graphics/large glyphs. Use 700+ behind small white text (AA).
        brand: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, `rgb(var(--pl-brand-${n}) / <alpha-value>)`]),
        ),
        cream: '#fffaf0',
        ink: { DEFAULT: '#12312c', soft: '#43615b' },
        coral: { 100: '#ffe3dc', 300: '#ff9d8a', 500: '#e8573f', 700: '#c9402b' },
        sun: { 100: '#fff1c9', 300: '#fbd06a', 500: '#f5b82e', 700: '#8a5a00' },
        sky: { 100: '#d9ecfb', 300: '#8cc6f0', 500: '#2f8fd8', 700: '#1f6fb2' },
        plum: { 100: '#eadffa', 300: '#bfa3ea', 500: '#8a5cc7', 700: '#6f45ac' },
      },
      fontFamily: {
        // Andika is designed for early literacy: single-storey a/g, clear I/l.
        body: ['Andika', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['"Fredoka Variable"', 'Andika', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      boxShadow: {
        soft: '0 2px 0 rgba(18,49,44,0.04), 0 10px 24px -12px rgba(18,49,44,0.22)',
        chunk: '0 5px 0 rgba(18,49,44,0.16)',
      },
    },
  },
  plugins: [],
} satisfies Config;
