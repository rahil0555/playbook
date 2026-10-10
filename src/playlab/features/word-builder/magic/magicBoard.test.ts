import { describe, expect, it } from 'vitest';
import { englishWords } from '../../../data/en/words';
import { mulberry32 } from '../../../lib/random';
import type { DifficultyLevel } from '../../../types/learning';
import { buildMagicTiles, decoyCount, emptyMagicSlots, isMagicDone, nextHint, slotFor, tryPlace } from './magicBoard';

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
          const r = tryPlace(target, slots, tiles, tile.id, i);
          expect(r.kind).toBe('placed');
          if (r.kind === 'placed') slots = r.slots;
        }
        expect(isMagicDone(slots)).toBe(true);
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

describe('tryPlace', () => {
  const target = 'apple'.split('');
  const tiles = buildMagicTiles('apple', target, 'adventurer', mulberry32(3));
  const real = (v: string) => tiles.filter((t) => !t.decoy && t.value === v);

  it('accepts the right letter and rejects the wrong one without changing anything', () => {
    const slots = emptyMagicSlots(5);
    const a = real('a')[0]!;
    const wrong = tryPlace(target, slots, tiles, a.id, 1);
    expect(wrong).toEqual({ kind: 'wrong' });
    const ok = tryPlace(target, slots, tiles, a.id, 0);
    expect(ok.kind).toBe('placed');
    expect(slots).toEqual(emptyMagicSlots(5)); // input untouched
  });

  it('handles the repeated P: either P tile fits either P slot, but each tile and slot only once', () => {
    const [p1, p2] = real('p') as [ReturnType<typeof real>[number], ReturnType<typeof real>[number]];
    let slots = emptyMagicSlots(5);
    const r1 = tryPlace(target, slots, tiles, p2.id, 1);
    expect(r1.kind).toBe('placed');
    if (r1.kind === 'placed') slots = r1.slots;
    expect(tryPlace(target, slots, tiles, p1.id, 1).kind).toBe('occupied');
    expect(tryPlace(target, slots, tiles, p2.id, 2).kind).toBe('ignored'); // already placed
    const r2 = tryPlace(target, slots, tiles, p1.id, 2);
    expect(r2.kind).toBe('placed');
  });

  it('a decoy never fits anywhere', () => {
    const decoy = tiles.find((t) => t.decoy)!;
    for (let i = 0; i < 5; i++) expect(tryPlace(target, emptyMagicSlots(5), tiles, decoy.id, i)).toEqual({ kind: 'wrong' });
  });

  it('ignores unknown tiles and out-of-range slots', () => {
    expect(tryPlace(target, emptyMagicSlots(5), tiles, 'nope', 0)).toEqual({ kind: 'ignored' });
    expect(tryPlace(target, emptyMagicSlots(5), tiles, tiles[0]!.id, 9)).toEqual({ kind: 'ignored' });
  });
});

describe('slotFor and nextHint', () => {
  const target = 'apple'.split('');
  const tiles = buildMagicTiles('apple', target, 'explorer', mulberry32(5));

  it('typed letters go to the first empty matching slot', () => {
    expect(slotFor(target, emptyMagicSlots(5), 'p')).toBe(1);
    const r = tryPlace(target, emptyMagicSlots(5), tiles, tiles.find((t) => t.value === 'p' && !t.decoy)!.id, 1);
    if (r.kind !== 'placed') throw new Error('expected placed');
    expect(slotFor(target, r.slots, 'p')).toBe(2);
    expect(slotFor(target, emptyMagicSlots(5), 'z')).toBeNull();
  });

  it('hints point at the first empty slot with an unplaced tile that fits, never a decoy; none when done', () => {
    const h = nextHint(target, emptyMagicSlots(5), tiles)!;
    expect(h.slotIndex).toBe(0);
    expect(tiles.find((t) => t.id === h.tileId)!.value).toBe('a');
    const done = target.map((_, i) => tiles.filter((t) => !t.decoy)[i]!.id);
    expect(nextHint(target, done, tiles)).toBeNull();
  });
});
