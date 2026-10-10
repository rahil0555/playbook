import type { AccentName } from '../types/learning';

/**
 * Static class strings per accent (Tailwind only generates classes it can see
 * literally, so these cannot be built dynamically).
 * `solid` backgrounds are chosen so their label text has >= 4.5:1 contrast.
 */
export interface AccentStyle {
  hex: string;
  soft: string;
  softer: string;
  solid: string;
  solidText: string;
  text: string;
  border: string;
  ring: string;
}

export const ACCENTS: Record<AccentName, AccentStyle> = {
  brand: { hex: '#16a286', soft: 'bg-brand-100', softer: 'bg-brand-50', solid: 'bg-brand-700', solidText: 'text-white', text: 'text-brand-800', border: 'border-brand-300', ring: 'ring-brand-500' },
  coral: { hex: '#e8573f', soft: 'bg-coral-100', softer: 'bg-[#fff1ee]', solid: 'bg-coral-700', solidText: 'text-white', text: 'text-coral-700', border: 'border-coral-300', ring: 'ring-coral-500' },
  sun: { hex: '#f5b82e', soft: 'bg-sun-100', softer: 'bg-[#fff8e6]', solid: 'bg-sun-500', solidText: 'text-ink', text: 'text-sun-700', border: 'border-sun-300', ring: 'ring-sun-500' },
  sky: { hex: '#2f8fd8', soft: 'bg-sky-100', softer: 'bg-[#eef6fd]', solid: 'bg-sky-700', solidText: 'text-white', text: 'text-sky-700', border: 'border-sky-300', ring: 'ring-sky-500' },
  plum: { hex: '#8a5cc7', soft: 'bg-plum-100', softer: 'bg-[#f5effc]', solid: 'bg-plum-700', solidText: 'text-white', text: 'text-plum-700', border: 'border-plum-300', ring: 'ring-plum-500' },
};

/** Letter glyph colours, all >= 3:1 on white (they are used at large sizes only). */
export const LETTER_COLORS = ['#e8573f', '#16a286', '#2f8fd8', '#8a5cc7', '#d9741c'] as const;
export const letterColor = (index: number): string => LETTER_COLORS[index % LETTER_COLORS.length] as string;
