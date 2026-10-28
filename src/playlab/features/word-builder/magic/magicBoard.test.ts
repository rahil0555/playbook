import { describe, expect, it } from 'vitest';
import { englishWords } from '../../../data/en/words';
import { mulberry32 } from '../../../lib/random';
import type { DifficultyLevel } from '../../../types/learning';
import { buildMagicTiles, decoyCount, emptyMagicSlots, isSpelled, misplacedSlots, moveTile, nextHint, slotFor, type MagicSlots } from './magicBoard';

const LEVELS: DifficultyLevel[] = ['starter', 'explorer', 'adventurer'];

describe('decoys', () => {
  it('Starter has none, Explorer 1, Adventurer 2', () => {
    expect(LEVELS.map(decoyCount)).toEqual([0, 1, 2]);
  });

  it('never include a letter from the word, so they can never fit a slot or replace a needed letter', () => {
    for (const w of englishWords) {
      for (const level of LEVELS) {
        for (let seed = 1; seed <= 15; seed++) {
          const target = w.text.split('');
          const tiles = buildMagicTiles(w.id, target, level, mulberry32(seed));
          const decoys = tiles.filter((t) => t.decoy);
          expect(decoys).toHaveLength(decoyCount(level));
          for (const d of decoys) expect(target).not.toContain(d.value);
          expect(new Set(decoys.map((d) => d.value)).size).toBe(decoys.length);
          expect(new Set(tiles.map((t) => t.id)).size).toBe(tiles.length);
        }
      }
    }
  });

  it('every word stays completable at every level (greedy solve using only the real tiles)', () => {
    for (const w of englishWords) {
      for (const level of LEVELS) {
        const target = w.text.split('');
        const tiles = buildMagicTiles(w.id, target, level, mulberry32(7));
        let slots = emptyMagicSlots(target.length);
        for (let i = 0; i < target.length; i++) {
          const tile = tiles.find((t) => !t.decoy && t.value === target[i] && !slots.includes(t.id))!;
          expect(tile, `${w.text}/${level} slot ${i}`).toBeTruthy();
          const r = moveTile(target, slots, tiles, tile.id, i);
          expect(r.kind).toBe('moved');
          if (r.kind === 'moved') slots = r.slots;
        }
        expect(isSpelled(target, slots, tiles)).toBe(true);
      }
    }
  });

  it('starter tiles are never in the solved order', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const tiles = buildMagicTiles('cat', ['c', 'a', 't'], 'starter', mulberry32(seed));
      expect(tiles.map((t) => t.value).join('')).not.toBe('cat');
    }
  });
});

describe('the tray never spells the answer', () => {
  it('the needed letters are never in the solved left-to-right order, at any level (decoys or not)', () => {
    for (const w of englishWords) {
      const target = w.text.split('');
      if (new Set(target).size === 1) continue; // a word of one repeated letter has only one order
      for (const level of LEVELS) {
        for (let seed = 1; seed <= 40; seed++) {
          const tiles = buildMagicTiles(w.id, target, level, mulberry32(seed));
          const real = tiles.filter((t) => !t.decoy).map((t) => t.value).join('');
          expect(real, `${w.text}/${level}/seed ${seed}`).not.toBe(w.text);
        }
      }
    }
  });
});

describe('moveTile: a letter is placed, moved or swapped, and nothing is lost or duplicated', () => {
  const target = 'apple'.split('');
  const tiles = buildMagicTiles('apple', target, 'adventurer', mulberry32(3));
  const real = (v: string) => tiles.filter((t) => !t.decoy && t.value === v);
  const decoy = tiles.find((t) => t.decoy)!;
  const a = real('a')[0]!;
  const p1 = real('p')[0]!;
  const p2 = real('p')[1]!;
  const l = real('l')[0]!;
  const e = real('e')[0]!;

  /** every tile is in at most one spot, and the tiles still on the board plus the tray are all the tiles */
  const invariant = (slots: MagicSlots) => {
    const onBoard = slots.filter((id): id is string => id !== null);
    expect(new Set(onBoard).size, 'no tile is in two spots').toBe(onBoard.length);
    expect(onBoard.every((id) => tiles.some((t) => t.id === id)), 'only known tiles').toBe(true);
  };

  it('a wrong letter is placed where it was put, and stays there: nothing is refused or sent back', () => {
    const r = moveTile(target, emptyMagicSlots(5), tiles, a.id, 1);
    expect(r).toEqual({ kind: 'moved', slots: [null, a.id, null, null, null], from: null, to: 1 });
    expect(misplacedSlots(target, [null, a.id, null, null, null], tiles)).toEqual([1]);
  });

  it('input is never mutated', () => {
    const slots = emptyMagicSlots(5);
    moveTile(target, slots, tiles, a.id, 1);
    expect(slots).toEqual(emptyMagicSlots(5));
  });

  it('a wrong letter moves to an empty spot, and the spot it left is empty', () => {
    const wrong = moveTile(target, emptyMagicSlots(5), tiles, a.id, 1);
    if (wrong.kind !== 'moved') throw new Error('expected moved');
    const moved = moveTile(target, wrong.slots, tiles, a.id, 4);
    expect(moved).toMatchObject({ kind: 'moved', from: 1, to: 4 });
    if (moved.kind !== 'moved') throw new Error('expected moved');
    expect(moved.slots).toEqual([null, null, null, null, a.id]);
    invariant(moved.slots);
  });

  it('two wrong letters swap places: both stay on the board, neither is lost', () => {
    const first = moveTile(target, emptyMagicSlots(5), tiles, a.id, 1); // a in slot 2 (wrong)
    if (first.kind !== 'moved') throw new Error('expected moved');
    const second = moveTile(target, first.slots, tiles, l.id, 0); // l in slot 1 (wrong)
    if (second.kind !== 'moved') throw new Error('expected moved');
    const swapped = moveTile(target, second.slots, tiles, l.id, 1); // l onto a's spot: a goes to l's old spot
    expect(swapped).toMatchObject({ kind: 'moved', from: 0, to: 1 });
    if (swapped.kind !== 'moved') throw new Error('expected moved');
    expect(swapped.slots).toEqual([a.id, l.id, null, null, null]);
    invariant(swapped.slots);
  });

  it('a letter from the tray dropped on a wrong letter replaces it, and that letter goes back to the tray', () => {
    const first = moveTile(target, emptyMagicSlots(5), tiles, a.id, 0); // a in slot 1 (right)
    if (first.kind !== 'moved') throw new Error('expected moved');
    const wrong = moveTile(target, first.slots, tiles, l.id, 2); // l in slot 3 (wrong)
    if (wrong.kind !== 'moved') throw new Error('expected moved');
    const replaced = moveTile(target, wrong.slots, tiles, e.id, 2); // e from the tray onto l
    expect(replaced).toMatchObject({ kind: 'moved', from: null, to: 2 });
    if (replaced.kind !== 'moved') throw new Error('expected moved');
    expect(replaced.slots.includes(l.id)).toBe(false); // l is back in the tray
    expect(replaced.slots[2]).toBe(e.id);
    invariant(replaced.slots);
  });

  it('a right letter can be picked up and moved, and a letter can be dropped on it: correctness is feedback, not a restriction', () => {
    const right = moveTile(target, emptyMagicSlots(5), tiles, a.id, 0);
    if (right.kind !== 'moved') throw new Error('expected moved');
    const moved = moveTile(target, right.slots, tiles, a.id, 4); // the right A moves to an empty spot
    expect(moved).toMatchObject({ kind: 'moved', from: 0, to: 4 });
    if (moved.kind !== 'moved') throw new Error('expected moved');
    expect(moved.slots).toEqual([null, null, null, null, a.id]);
    const replaced = moveTile(target, right.slots, tiles, l.id, 0); // a tray L dropped on the right A: the A goes back to the tray
    expect(replaced).toMatchObject({ kind: 'moved', from: null, to: 0 });
    if (replaced.kind !== 'moved') throw new Error('expected moved');
    expect(replaced.slots).toEqual([l.id, null, null, null, null]); // nothing lost: the A is in the tray
  });

  it('dropping a letter on the spot it is already on changes nothing', () => {
    const wrong = moveTile(target, emptyMagicSlots(5), tiles, a.id, 1);
    if (wrong.kind !== 'moved') throw new Error('expected moved');
    expect(moveTile(target, wrong.slots, tiles, a.id, 1)).toEqual({ kind: 'same' });
  });

  it('the repeated P: either P tile is right for either P spot, and each tile is only in one spot', () => {
    const first = moveTile(target, emptyMagicSlots(5), tiles, p2.id, 1); // p2 right in slot 2
    if (first.kind !== 'moved') throw new Error('expected moved');
    const second = moveTile(target, first.slots, tiles, p1.id, 2); // p1 right in slot 3
    expect(second).toMatchObject({ kind: 'moved', to: 2 });
    if (second.kind !== 'moved') throw new Error('expected moved');
    expect(second.slots.slice(1, 3)).toEqual([p2.id, p1.id]);
    // two right P's swap places, and both stay right: either P is right in either P spot
    expect(moveTile(target, second.slots, tiles, p1.id, 1)).toEqual({ kind: 'moved', slots: [null, p1.id, p2.id, null, null], from: 2, to: 1 });
  });

  it('a decoy is always wrong, and can be moved like any other wrong letter', () => {
    for (let i = 0; i < 5; i++) {
      const r = moveTile(target, emptyMagicSlots(5), tiles, decoy.id, i);
      expect(r.kind).toBe('moved');
      if (r.kind === 'moved') expect(misplacedSlots(target, r.slots, tiles)).toEqual([i]);
    }
  });

  it('ignores unknown tiles and out-of-range spots', () => {
    expect(moveTile(target, emptyMagicSlots(5), tiles, 'nope', 0)).toEqual({ kind: 'ignored' });
    expect(moveTile(target, emptyMagicSlots(5), tiles, a.id, 9)).toEqual({ kind: 'ignored' });
  });
});

describe('spelled and misplaced', () => {
  const target = 'book'.split('');
  const tiles = buildMagicTiles('book', target, 'starter', mulberry32(9));
  const oes = tiles.filter((t) => !t.decoy && t.value === 'o');
  const b = tiles.find((t) => !t.decoy && t.value === 'b')!;
  const k = tiles.find((t) => !t.decoy && t.value === 'k')!;

  it('a full board is spelled only when every spot is right; a full wrong board is not, and its wrong spots are listed', () => {
    const full = [oes[0]!.id, b.id, oes[1]!.id, k.id]; // the O and the B are in each other's spots; the second O and the K are right
    expect(isSpelled(target, full, tiles)).toBe(false);
    expect(misplacedSlots(target, full, tiles)).toEqual([0, 1]);
  });

  it('a board with a gap is never spelled', () => {
    expect(isSpelled(target, [b.id, oes[0]!.id, oes[1]!.id, null], tiles)).toBe(false);
  });

  it('BOOK: both O letters are placed and moved independently, and the word is spelled when all four are right', () => {
    let slots = emptyMagicSlots(4);
    const o1Wrong = moveTile(target, slots, tiles, oes[0]!.id, 0); // an O in the B spot: wrong
    if (o1Wrong.kind !== 'moved') throw new Error('expected moved');
    slots = o1Wrong.slots;
    const o1Right = moveTile(target, slots, tiles, oes[0]!.id, 1); // the same O moved to its own spot
    if (o1Right.kind !== 'moved') throw new Error('expected moved');
    slots = o1Right.slots;
    expect(slots).toEqual([null, oes[0]!.id, null, null]);
    const o2 = moveTile(target, slots, tiles, oes[1]!.id, 2);
    if (o2.kind !== 'moved') throw new Error('expected moved');
    slots = o2.slots;
    const bOk = moveTile(target, slots, tiles, b.id, 0);
    if (bOk.kind !== 'moved') throw new Error('expected moved');
    slots = bOk.slots;
    const kOk = moveTile(target, slots, tiles, k.id, 3);
    if (kOk.kind !== 'moved') throw new Error('expected moved');
    expect(isSpelled(target, kOk.slots, tiles)).toBe(true);
    expect(misplacedSlots(target, kOk.slots, tiles)).toEqual([]);
  });
});

describe('slotFor and nextHint', () => {
  const target = 'apple'.split('');
  const tiles = buildMagicTiles('apple', target, 'explorer', mulberry32(5));
  /** the word laid out in its own spots, using the real tiles (each tile once: the two P's are two tiles) */
  const spelled = () => {
    const used = new Set<string>();
    return target.map((v) => {
      const tile = tiles.find((t) => !t.decoy && t.value === v && !used.has(t.id))!;
      used.add(tile.id);
      return tile.id;
    });
  };

  it('typed letters go to the first spot that needs them: an empty one, or one with a wrong letter (which it replaces)', () => {
    expect(slotFor(target, emptyMagicSlots(5), tiles, 'p')).toBe(1);
    const r = moveTile(target, emptyMagicSlots(5), tiles, tiles.find((t) => t.value === 'p' && !t.decoy)!.id, 1);
    if (r.kind !== 'moved') throw new Error('expected moved');
    expect(slotFor(target, r.slots, tiles, 'p')).toBe(2);
    expect(slotFor(target, emptyMagicSlots(5), tiles, 'z')).toBeNull();
    const wrong = moveTile(target, emptyMagicSlots(5), tiles, tiles.find((t) => t.value === 'l' && !t.decoy)!.id, 0); // an l where the a is needed
    if (wrong.kind !== 'moved') throw new Error('expected moved');
    expect(slotFor(target, wrong.slots, tiles, 'a')).toBe(0);
  });

  it('hints point at the first spot that is not right yet, with a letter for it, never a decoy; none when spelled', () => {
    const h = nextHint(target, emptyMagicSlots(5), tiles)!;
    expect(h.slotIndex).toBe(0);
    expect(tiles.find((t) => t.id === h.tileId)!.value).toBe('a');
    const board = spelled();
    expect(isSpelled(target, board, tiles)).toBe(true);
    expect(nextHint(target, board, tiles)).toBeNull();
  });

  it('a wrong letter on the board is the hint when it is the only letter for the spot', () => {
    const a = tiles.find((t) => !t.decoy && t.value === 'a')!;
    const wrong = moveTile(target, emptyMagicSlots(5), tiles, a.id, 3); // an a where the l is needed
    if (wrong.kind !== 'moved') throw new Error('expected moved');
    const h = nextHint(target, wrong.slots, tiles)!;
    expect(h).toEqual({ tileId: expect.any(String), slotIndex: 0 });
    expect(tiles.find((t) => t.id === h.tileId)!.value).toBe('a');
  });
});
