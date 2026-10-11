import type { IllustrationId } from '../types/learning';

/**
 * The sticker book. A sticker is earned for every finished round: round 1 gives the first sticker, round 2 the
 * second, and so on. The book shows these twelve; later rounds add repeats. Nothing is stored for stickers: they
 * are derived from the rounds-finished count that progress already keeps.
 */
export interface StickerDef {
  id: string;
  /** shown and read aloud: "Apple sticker" */
  title: string;
  art: IllustrationId;
}

export const STICKERS: readonly StickerDef[] = [
  { id: 'apple', title: 'Apple', art: 'apple' },
  { id: 'cat', title: 'Cat', art: 'cat' },
  { id: 'sun', title: 'Sun', art: 'sun' },
  { id: 'fish', title: 'Fish', art: 'fish' },
  { id: 'kite', title: 'Kite', art: 'kite' },
  { id: 'dog', title: 'Dog', art: 'dog' },
  { id: 'moon', title: 'Moon', art: 'moon' },
  { id: 'whale', title: 'Whale', art: 'whale' },
  { id: 'zebra', title: 'Zebra', art: 'zebra' },
  { id: 'lion', title: 'Lion', art: 'lion' },
  { id: 'tree', title: 'Tree', art: 'tree' },
  { id: 'nest', title: 'Nest', art: 'nest' },
];

export const STICKER_SLOTS = STICKERS.length;

/** The sticker earned by the given finished round (1-based). */
export function stickerForRound(round: number): StickerDef {
  const n = Math.max(1, Math.floor(round));
  return STICKERS[(n - 1) % STICKER_SLOTS] as StickerDef;
}

/** How many of the book's slots are filled, and how many extra (repeat) stickers there are beyond the book. */
export function stickerSummary(roundsFinished: number): { unlocked: number; extra: number } {
  const r = Math.max(0, Math.floor(roundsFinished));
  return { unlocked: Math.min(r, STICKER_SLOTS), extra: Math.max(0, r - STICKER_SLOTS) };
}
