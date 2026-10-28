import type { DifficultyLevel } from '../../../types/learning';
import { shuffle, type Rng } from '../../../lib/random';

/**
 * Pure placement logic for the "Magic Letters" mode of Word Builder (and the story's words).
 * Every letter the child puts down is judged at once: a letter in its own spot is right and is locked there. A letter in another spot
 * is wrong, but it stays where it was put, and the child can move it to an empty spot or swap it with the letter there. A wrong
 * letter is never sent back to the tray and never needs a restart.
 */
export interface MagicTile {
  id: string;
  /** lowercase letter */
  value: string;
  /** an extra letter that is not in the word and fits nowhere */
  decoy: boolean;
}

/** One entry per slot: id of the tile in it, or null. */
export type MagicSlots = (string | null)[];

export type MoveResult =
  /** the letter is in its new spot; `from` is the spot it came from (null: the tray), and `to` the spot it went to */
  | { kind: 'moved'; slots: MagicSlots; from: number | null; to: number }
  /** a right letter is never moved, and nothing is dropped over one */
  | { kind: 'locked' }
  /** the letter is already on that spot */
  | { kind: 'same' }
  /** unknown tile or spot */
  | { kind: 'ignored' };

/** Starter is easy (no decoys); Explorer 1; Adventurer 2. */
export const decoyCount = (level: DifficultyLevel): number => (level === 'starter' ? 0 : level === 'explorer' ? 1 : 2);

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * All letters of the word (each its own tile, so repeated letters are separate tiles)
 * plus decoys. Decoys are drawn only from letters that are NOT in the word, so they can
 * never fit any slot and can never be confused with a needed letter: the word always
 * stays completable. The order is shuffled, and the needed letters never appear in the solved
 * left-to-right order (decoys or not), so the tray itself never spells the answer.
 */
export function buildMagicTiles(wordId: string, target: readonly string[], level: DifficultyLevel, rng: Rng = Math.random): MagicTile[] {
  const real: MagicTile[] = target.map((value, i) => ({ id: `${wordId}-${i}`, value, decoy: false }));
  const pool = shuffle(ALPHABET.filter((l) => !target.includes(l)), rng);
  const decoys: MagicTile[] = pool.slice(0, decoyCount(level)).map((value, i) => ({ id: `${wordId}-d${i}`, value, decoy: true }));
  const all = [...real, ...decoys];
  const solved = target.join('');
  const allSame = all.length > 1 && all.every((t) => t.value === all[0]?.value);
  let out = shuffle(all, rng);
  for (let tries = 0; !allSame && out.filter((t) => !t.decoy).map((t) => t.value).join('') === solved && tries < 50; tries++) {
    out = shuffle(all, rng);
  }
  return out;
}

export const emptyMagicSlots = (n: number): MagicSlots => Array.from({ length: n }, () => null);

export const isTilePlaced = (slots: MagicSlots, tileId: string): boolean => slots.includes(tileId);

/** The letter in this spot is the letter the word needs here. An empty spot is not right. */
export function isRightAt(target: readonly string[], slots: MagicSlots, tiles: readonly MagicTile[], slotIndex: number): boolean {
  const id = slots[slotIndex];
  if (!id) return false;
  return tiles.find((t) => t.id === id)?.value === target[slotIndex];
}

/** Every spot holds its own letter: the word is spelled. An incomplete or wrong board is never spelled. */
export const isSpelled = (target: readonly string[], slots: MagicSlots, tiles: readonly MagicTile[]): boolean =>
  slots.length === target.length && target.every((_, i) => isRightAt(target, slots, tiles, i));

/** The spots that hold a letter that does not belong there. */
export const misplacedSlots = (target: readonly string[], slots: MagicSlots, tiles: readonly MagicTile[]): number[] =>
  slots.flatMap((id, i) => (id !== null && !isRightAt(target, slots, tiles, i) ? [i] : []));

/**
 * Put a letter on a spot: from the tray, or from another spot. An empty spot takes it; a wrong letter on that spot is swapped with
 * it (a letter from the tray sends that one back to the tray). A right letter, either the one moved or the one on the spot, is never
 * moved. Never mutates. Repeated letters: any matching letter is right for any matching spot.
 */
export function moveTile(target: readonly string[], slots: MagicSlots, tiles: readonly MagicTile[], tileId: string, slotIndex: number): MoveResult {
  if (!tiles.some((t) => t.id === tileId) || slotIndex < 0 || slotIndex >= target.length) return { kind: 'ignored' };
  const from = slots.indexOf(tileId);
  if (from === slotIndex) return { kind: 'same' };
  if (from >= 0 && isRightAt(target, slots, tiles, from)) return { kind: 'locked' };
  if (isRightAt(target, slots, tiles, slotIndex)) return { kind: 'locked' };
  const next = [...slots];
  const occupant = next[slotIndex] ?? null;
  if (from >= 0) next[from] = occupant;
  next[slotIndex] = tileId;
  return { kind: 'moved', slots: next, from: from >= 0 ? from : null, to: slotIndex };
}

/**
 * The first spot that needs this letter and does not hold it yet: an empty spot, or one with a wrong letter (which the typed letter
 * replaces, as a drop would). Null when every spot for the letter is already right.
 */
export function slotFor(target: readonly string[], slots: MagicSlots, tiles: readonly MagicTile[], value: string): number | null {
  const i = target.findIndex((l, idx) => l === value && !isRightAt(target, slots, tiles, idx));
  return i < 0 ? null : i;
}

/**
 * Gentle hint: the first spot that is not right yet, and a letter that belongs there. A letter from the tray is preferred; if every
 * such letter is already on the board (in a wrong spot), that one is the hint. Null when the word is spelled.
 */
export function nextHint(target: readonly string[], slots: MagicSlots, tiles: readonly MagicTile[]): { tileId: string; slotIndex: number } | null {
  const slotIndex = target.findIndex((_, i) => !isRightAt(target, slots, tiles, i));
  if (slotIndex < 0) return null;
  const needed = tiles.filter((t) => !t.decoy && t.value === target[slotIndex]);
  const tile = needed.find((t) => !isTilePlaced(slots, t.id)) ?? needed.find((t) => !isRightAt(target, slots, tiles, slots.indexOf(t.id)));
  return tile ? { tileId: tile.id, slotIndex } : null;
}
