import type { CSSProperties } from 'react';

/**
 * The one letter tile of PlayLab, in the BOOK style: a rounded, glossy, solid-colour square with a large white letter. The same
 * design is used on the tray, on a placed spot (it fills the spot, so it scales to fit it), while it flies, and in the storybook
 * scene. There are no faces, eyes, mouths or feet on a tile. The colours are a small, controlled palette, each with at least 4:1
 * contrast against the white letter.
 */
export const LETTER_TILE_PALETTE = ['#0f8a72', '#c9621a', '#1f6fb2', '#6f45ac', '#c9402b'] as const;

/** A letter always has the same tile colour, on every screen (so a letter is recognised by its colour too). */
export function letterTileColor(text: string): string {
  const code = text.toLowerCase().charCodeAt(0) || 0;
  return LETTER_TILE_PALETTE[code % LETTER_TILE_PALETTE.length] as string;
}

interface LetterTileFaceProps {
  /** the letter (or, for a word tile, the word); letters are shown in capitals, as on the BOOK tiles */
  text: string;
  /** the tile colour; a letter's own colour when left out */
  color?: string;
  /** a word tile: a wider tile whose text is sized by its own font size, not by its width */
  word?: boolean;
  className?: string;
}

/**
 * The tile itself. It fills the box it is given, so the same component is a tray tile, a placed letter in its spot, or the copy
 * that flies between them. It is decorative for assistive tech: the button or slot around it carries the name.
 */
export function LetterTileFace({ text, color, word = false, className = '' }: LetterTileFaceProps) {
  const tone = color ?? letterTileColor(text);
  const shown = word ? text : text.toUpperCase();
  return (
    <span aria-hidden="true" className={`pl-tile${word ? ' pl-tile--word' : ''} ${className}`} style={{ '--tile': tone } as CSSProperties}>
      <span className="pl-tile__gloss" />
      <span className="pl-tile__letter font-display font-black">{shown}</span>
    </span>
  );
}
