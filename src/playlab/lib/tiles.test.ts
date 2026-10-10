import { describe, expect, it } from 'vitest';
import { mulberry32 } from './random';
import {
  clearSlots, emptySlots, hintTile, isComplete, isCorrect, makeTiles, placeTile, removeTile, scramble, slotStates, slotValues,
} from './tiles';

const apple = 'apple'.split('');

describe('tiles and slots', () => {
  it('gives repeated letters distinct tile ids', () => {
    const tiles = makeTiles('apple', apple);
    expect(new Set(tiles.map((t) => t.id)).size).toBe(5);
    expect(tiles.filter((t) => t.value === 'p')).toHaveLength(2);
  });

  it('places into the first free slot and ignores a full board', () => {
    const tiles = makeTiles('cat', ['c', 'a', 't']);
    let s = emptySlots(3);
    s = placeTile(s, tiles[2]!.id);
    s = placeTile(s, tiles[0]!.id);
    expect(s).toEqual([tiles[2]!.id, tiles[0]!.id, null]);
    s = placeTile(s, tiles[1]!.id);
    expect(isComplete(s)).toBe(true);
    const extra = makeTiles('x', ['x'])[0]!;
    expect(placeTile(s, extra.id)).toBe(s);
  });

  it('removes a tile and clears all', () => {
    const tiles = makeTiles('cat', ['c', 'a', 't']);
    let s = placeTile(emptySlots(3), tiles[0]!.id);
    s = removeTile(s, tiles[0]!.id);
    expect(s).toEqual([null, null, null]);
    expect(removeTile(s, 'nope')).toBe(s);
    expect(clearSlots([tiles[0]!.id, null, null])).toEqual([null, null, null]);
  });

  it('swaps when a placed tile is dropped on an occupied slot, and bumps when it came from the tray', () => {
    const [a, b, c] = makeTiles('w', ['a', 'b', 'c']) as [ReturnType<typeof makeTiles>[number], ReturnType<typeof makeTiles>[number], ReturnType<typeof makeTiles>[number]];
    let s = placeTile(placeTile(emptySlots(3), a.id), b.id); // [a, b, null]
    s = placeTile(s, a.id, 1); // drag a onto b's slot -> swap
    expect(s).toEqual([b.id, a.id, null]);
    s = placeTile(s, c.id, 0); // from tray onto occupied slot -> b goes back to tray
    expect(s).toEqual([c.id, a.id, null]);
  });

  it('validates repeated letters correctly (APPLE with two P tiles)', () => {
    const tiles = makeTiles('apple', apple);
    const [a, p1, p2, l, e] = tiles as [typeof tiles[number], typeof tiles[number], typeof tiles[number], typeof tiles[number], typeof tiles[number]];
    // either P tile may fill either P slot
    expect(isCorrect([a.id, p1.id, p2.id, l.id, e.id], tiles, apple)).toBe(true);
    expect(isCorrect([a.id, p2.id, p1.id, l.id, e.id], tiles, apple)).toBe(true);
    // wrong order
    expect(isCorrect([p1.id, a.id, p2.id, l.id, e.id], tiles, apple)).toBe(false);
  });

  it('never accepts an incomplete answer', () => {
    const tiles = makeTiles('cat', ['c', 'a', 't']);
    expect(isCorrect([tiles[0]!.id, tiles[1]!.id, null], tiles, ['c', 'a', 't'])).toBe(false);
    expect(isCorrect(emptySlots(3), tiles, ['c', 'a', 't'])).toBe(false);
    expect(isCorrect([], [], [])).toBe(false);
  });

  it('reports per-slot states; empty slots are never "wrong"', () => {
    const tiles = makeTiles('cat', ['c', 'a', 't']);
    const s = [tiles[1]!.id, tiles[1 + 1]!.id, null];
    expect(slotStates(s, tiles, ['c', 'a', 't'])).toEqual(['wrong', 'wrong', 'empty']);
    expect(slotValues(s, tiles)).toEqual(['a', 't', '']);
  });

  it('hint picks a tile for the first wrong slot and skips tiles already placed correctly', () => {
    const tiles = makeTiles('apple', apple);
    const [a, p1, p2] = tiles as [typeof tiles[number], typeof tiles[number], typeof tiles[number]];
    // A and first P are right; slot 3 (second P) is empty -> hint must be the *other* P tile
    const slots = [a.id, p1.id, null, null, null];
    expect(hintTile(slots, tiles, apple)).toEqual({ tileId: p2.id, slotIndex: 2 });
    // solved board -> no hint
    const solved = tiles.map((t) => t.id);
    expect(hintTile(solved, tiles, apple)).toBeNull();
  });

  it('scramble never returns the solved order for distinct letters, and keeps every tile', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const tiles = makeTiles('cat', ['c', 'a', 't']);
      const out = scramble(tiles, mulberry32(seed));
      expect(out.map((t) => t.value).join('')).not.toBe('cat');
      expect([...out].sort((x, y) => x.id.localeCompare(y.id))).toEqual(tiles);
    }
    // all-identical letters cannot be scrambled; must not loop forever
    expect(scramble(makeTiles('o', ['o', 'o']), mulberry32(1))).toHaveLength(2);
  });
});
