import type { DifficultyLevel } from '../../../types/learning';
import { shuffle, type Rng } from '../../../lib/random';

/**
 * Pure placement logic for the "Magic Letters" mode of Word Builder.
 * Unlike classic mode (free arrangement + Check), every drop is judged immediately:
 * a tile only lands if its letter belongs in that slot.
 */
export interface MagicTile {
  id: string;
  /** lowercase letter */
  value: string;
  /** an extra letter that is not in the word and fits nowhere */
  decoy: boolean;
}

/** One entry per slot: id of the tile that landed there, or null. */
export type MagicSlots = (string | null)[];

export type PlaceResult =
  | { kind: 'placed'; slots: MagicSlots; slotIndex: number }
  | { kind: 'wrong' } // the letter does not belong in that slot
  | { kind: 'occupied' } // the slot is already filled
  | { kind: 'ignored' }; // unknown/already-placed tile or invalid slot

/** Starter is easy (no decoys); Explorer 1; Adventurer 2. */
export const decoyCount = (level: DifficultyLevel): number => (level === 'starter' ? 0 : level === 'explorer' ? 1 : 2);

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * All letters of the word (each its own tile, so repeated letters are separate tiles)
 * plus decoys. Decoys are drawn only from letters that are NOT in the word, so they can
 * never fit any slot and can never be confused with a needed letter: the word always
 * stays completable. The order is shuffled and never equals the solved order.
 */
export function buildMagicTiles(wordId: string, target: readonly string[], level: DifficultyLevel, rng: Rng = Math.random): MagicTile[] {
  const real: MagicTile[] = target.map((value, i) => ({ id: `${wordId}-${i}`, value, decoy: false }));
  const pool = shuffle(ALPHABET.filter((l) => !target.includes(l)), rng);
  const decoys: MagicTile[] = pool.slice(0, decoyCount(level)).map((value, i) => ({ id: `${wordId}-d${i}`, value, decoy: true }));
  const all = [...real, ...decoys];
  const solved = target.join('');
  const allSame = all.length > 1 && all.every((t) => t.value === all[0]?.value);
  let out = shuffle(all, rng);
  for (let tries = 0; !allSame && out.filter((t) => !t.decoy).map((t) => t.value).join('') === solved && decoys.length === 0 && tries < 20; tries++) {
    out = shuffle(all, rng);
  }
  return out;
}

export const emptyMagicSlots = (n: number): MagicSlots => Array.from({ length: n }, () => null);

export const isMagicDone = (slots: MagicSlots): boolean => slots.length > 0 && slots.every((s) => s !== null);

export const isTilePlaced = (slots: MagicSlots, tileId: string): boolean => slots.includes(tileId);

/** Try to drop `tileId` onto `slotIndex`. Never mutates. Repeated letters: any matching tile fits any matching slot. */
export function tryPlace(target: readonly string[], slots: MagicSlots, tiles: readonly MagicTile[], tileId: string, slotIndex: number): PlaceResult {
  const tile = tiles.find((t) => t.id === tileId);
  if (!tile || isTilePlaced(slots, tileId) || slotIndex < 0 || slotIndex >= target.length) return { kind: 'ignored' };
  if (slots[slotIndex] !== null) return { kind: 'occupied' };
  if (tile.value !== target[slotIndex]) return { kind: 'wrong' };
  const next = [...slots];
  next[slotIndex] = tileId;
  return { kind: 'placed', slots: next, slotIndex };
}

/** First empty slot that accepts this letter (used by typed letters), or null. */
export function slotFor(target: readonly string[], slots: MagicSlots, value: string): number | null {
  const i = target.findIndex((l, idx) => l === value && slots[idx] === null);
  return i < 0 ? null : i;
}

/** Gentle hint: the first empty slot and an unplaced tile that fits it. */
export function nextHint(target: readonly string[], slots: MagicSlots, tiles: readonly MagicTile[]): { tileId: string; slotIndex: number } | null {
  const slotIndex = slots.findIndex((s) => s === null);
  if (slotIndex < 0) return null;
  const tile = tiles.find((t) => !t.decoy && t.value === target[slotIndex] && !isTilePlaced(slots, t.id));
  return tile ? { tileId: tile.id, slotIndex } : null;
}
