import { shuffle, type Rng } from './random';

/**
 * Tile / slot model shared by the word builder (letters) and the sentence
 * builder (words). Tiles always have unique ids, so repeated letters or words
 * (the two P's in APPLE) are distinct objects and can never be confused.
 */
export interface Tile {
  id: string;
  /** canonical lowercase value compared against the target */
  value: string;
}

/** One entry per answer slot: the id of the tile sitting in it, or null. */
export type Slots = (string | null)[];

export type SlotState = 'correct' | 'wrong' | 'empty';

export function makeTiles(idPrefix: string, values: readonly string[]): Tile[] {
  return values.map((value, i) => ({ id: `${idPrefix}-${i}`, value }));
}

/** Shuffle tiles, guaranteeing the order differs from the solved order when possible. */
export function scramble(tiles: readonly Tile[], rng: Rng = Math.random): Tile[] {
  const solved = tiles.map((t) => t.value).join('\u0000');
  const allSame = tiles.every((t) => t.value === tiles[0]?.value);
  let out = shuffle(tiles, rng);
  for (let tries = 0; !allSame && tiles.length > 1 && out.map((t) => t.value).join('\u0000') === solved && tries < 20; tries++) {
    out = shuffle(tiles, rng);
  }
  return out;
}

export const emptySlots = (n: number): Slots => Array.from({ length: n }, () => null);

export const slotIndexOf = (slots: Slots, tileId: string): number => slots.indexOf(tileId);

export const isPlaced = (slots: Slots, tileId: string): boolean => slots.includes(tileId);

export const isComplete = (slots: Slots): boolean => slots.length > 0 && slots.every((s) => s !== null);

export const filledCount = (slots: Slots): number => slots.filter((s) => s !== null).length;

/**
 * Put a tile into a slot.
 *  - without `slotIndex`: first empty slot (no-op when full)
 *  - with `slotIndex`: that slot. If a different tile is there it is swapped into the
 *    dragged tile's old slot, or bumped back to the tray when the dragged tile came from the tray.
 * Returns the same array when nothing changes.
 */
export function placeTile(slots: Slots, tileId: string, slotIndex?: number): Slots {
  const from = slots.indexOf(tileId);
  const target = slotIndex ?? slots.indexOf(null);
  if (target < 0 || target >= slots.length || from === target) return slots;
  const next = [...slots];
  const occupant = next[target] ?? null;
  if (from >= 0) next[from] = occupant;
  next[target] = tileId;
  return next;
}

/**
 * A slot whose word is right for that slot is locked: the word is not picked up, and nothing is dropped over it. A right word is
 * final, so locking it never costs the child anything.
 */
export function isLockedSlot(slots: Slots, tiles: readonly Tile[], target: readonly string[], slotIndex: number): boolean {
  const id = slots[slotIndex];
  if (!id) return false;
  return tiles.find((t) => t.id === id)?.value === target[slotIndex];
}

/**
 * placeTile, with locked words respected: a right word is never moved, and a drop over one is refused (null). Dropping a word on
 * its own spot changes nothing. Any other word can be moved to an empty spot, or swapped with a wrong one.
 */
export function moveTile(slots: Slots, tiles: readonly Tile[], target: readonly string[], tileId: string, slotIndex?: number): Slots | null {
  const from = slots.indexOf(tileId);
  if (from >= 0 && isLockedSlot(slots, tiles, target, from)) return null;
  if (slotIndex !== undefined && isLockedSlot(slots, tiles, target, slotIndex)) return null;
  return placeTile(slots, tileId, slotIndex);
}

export function removeTile(slots: Slots, tileId: string): Slots {
  return slots.includes(tileId) ? slots.map((s) => (s === tileId ? null : s)) : slots;
}

export const clearSlots = (slots: Slots): Slots => emptySlots(slots.length);

/** Values currently in each slot ('' when empty). */
export function slotValues(slots: Slots, tiles: readonly Tile[]): string[] {
  const byId = new Map(tiles.map((t) => [t.id, t.value]));
  return slots.map((id) => (id ? (byId.get(id) ?? '') : ''));
}

/** Per-slot comparison against the target. Empty slots are 'empty', never 'wrong'. */
export function slotStates(slots: Slots, tiles: readonly Tile[], target: readonly string[]): SlotState[] {
  return slotValues(slots, tiles).map((v, i) => (v === '' ? 'empty' : v === target[i] ? 'correct' : 'wrong'));
}

/** True only when every slot is filled AND every slot matches. Incomplete answers can never pass. */
export function isCorrect(slots: Slots, tiles: readonly Tile[], target: readonly string[]): boolean {
  if (slots.length !== target.length || !isComplete(slots)) return false;
  return slotStates(slots, tiles, target).every((s) => s === 'correct');
}

/**
 * Which tile should the child try next? Finds the first slot that is not yet
 * correct and returns a tile with the needed value that is not already
 * sitting in a correct slot. Handles repeated letters (APPLE's second P).
 */
export function hintTile(slots: Slots, tiles: readonly Tile[], target: readonly string[]): { tileId: string; slotIndex: number } | null {
  const states = slotStates(slots, tiles, target);
  const slotIndex = states.findIndex((s) => s !== 'correct');
  if (slotIndex < 0) return null;
  const needed = target[slotIndex];
  const correctlyPlaced = new Set(slots.filter((id, i) => id !== null && states[i] === 'correct'));
  const tile = tiles.find((t) => t.value === needed && !correctlyPlaced.has(t.id));
  return tile ? { tileId: tile.id, slotIndex } : null;
}
