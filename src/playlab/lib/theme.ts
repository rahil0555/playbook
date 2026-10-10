/**
 * Brand colour scale. The default scale is hand-tuned around Edurance teal
 * #16a286 (brand-500) and mirrored in styles/playlab.css. A host can pass
 * `theme.brandColor` to re-brand; the scale is then derived by mixing with
 * white/black. 700+ stays dark enough for white text on typical hues, but hosts
 * choosing very light colours should check contrast themselves.
 */
export const BRAND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export const DEFAULT_BRAND = '#16a286';

const HEX = /^#?([0-9a-f]{6})$/i;

export function isValidHex(value: string | undefined): value is string {
  return !!value && HEX.test(value);
}

type RGB = [number, number, number];

const toRgb = (hex: string): RGB => {
  const m = HEX.exec(hex);
  const n = parseInt(m ? (m[1] as string) : '16a286', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round((a[i] as number) + ((b[i] as number) - (a[i] as number)) * t)) as RGB;

const TARGETS: Record<number, { toward: RGB; amount: number }> = {
  50: { toward: [255, 255, 255], amount: 0.92 },
  100: { toward: [255, 255, 255], amount: 0.82 },
  200: { toward: [255, 255, 255], amount: 0.64 },
  300: { toward: [255, 255, 255], amount: 0.4 },
  400: { toward: [255, 255, 255], amount: 0.18 },
  500: { toward: [0, 0, 0], amount: 0 },
  600: { toward: [0, 0, 0], amount: 0.14 },
  700: { toward: [0, 0, 0], amount: 0.3 },
  800: { toward: [0, 0, 0], amount: 0.42 },
  900: { toward: [0, 0, 0], amount: 0.52 },
};

/** CSS custom properties ("--pl-brand-500": "22 162 134", ...) for a brand colour. */
export function brandCssVars(hex: string | undefined): Record<string, string> {
  if (!isValidHex(hex) || hex.replace('#', '').toLowerCase() === DEFAULT_BRAND.slice(1)) return {};
  const base = toRgb(hex);
  return Object.fromEntries(
    BRAND_STEPS.map((step) => {
      const { toward, amount } = TARGETS[step] as { toward: RGB; amount: number };
      return [`--pl-brand-${step}`, mix(base, toward, amount).join(' ')];
    }),
  );
}
