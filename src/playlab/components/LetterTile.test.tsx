import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LETTER_TILE_PALETTE, LetterTileFace, letterTileColor } from './LetterTile';

/** WCAG contrast of white text on a colour (the tile letter is always white). */
function contrastWithWhite(hex: string): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return 1.05 / (lum + 0.05);
}

describe('the BOOK-style letter tile', () => {
  it('every palette colour keeps a 4:1 contrast with its white letter', () => {
    for (const colour of LETTER_TILE_PALETTE) expect(contrastWithWhite(colour), colour).toBeGreaterThanOrEqual(4);
  });

  it('a letter always has the same tile colour, whichever case it is typed in', () => {
    expect(letterTileColor('b')).toBe(letterTileColor('b'));
    expect(letterTileColor('B')).toBe(letterTileColor('b'));
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') expect(LETTER_TILE_PALETTE).toContain(letterTileColor(letter));
  });

  it('shows the letter in capitals, as a single text, with no face, eyes, mouth or feet', () => {
    const { container } = render(<LetterTileFace text="b" />);
    expect(container.querySelector('.pl-tile__letter')?.textContent).toBe('B');
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('[class*="monster"], [class*="eye"], [class*="mouth"]')).toBeNull();
    expect(container.querySelector('.pl-tile')).not.toBeNull();
  });

  it('a word tile keeps the word and is marked as the wider word variant', () => {
    const { container } = render(<LetterTileFace text="two" word />);
    expect(container.querySelector('.pl-tile--word .pl-tile__letter')?.textContent).toBe('two');
  });

  it('is decorative for assistive technology: the button or slot around it carries the name', () => {
    const { container } = render(<LetterTileFace text="c" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
