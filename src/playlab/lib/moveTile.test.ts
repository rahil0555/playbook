import { describe, expect, it } from 'vitest';
import { emptySlots, isLockedSlot, makeTiles, moveTile } from './tiles';

// the sentence "The sun is bright" (target), built as "The sun bright is": "is" and "bright" are each in the other's spot
const target = ['The', 'sun', 'is', 'bright'];
const tiles = makeTiles('s', target);
const [the, sun, is, bright] = tiles as [(typeof tiles)[number], (typeof tiles)[number], (typeof tiles)[number], (typeof tiles)[number]];

describe('isLockedSlot', () => {
  it('a slot whose word is right is locked; a wrong or empty slot is not', () => {
    const slots = [the.id, sun.id, bright.id, is.id];
    expect(isLockedSlot(slots, tiles, target, 0)).toBe(true);
    expect(isLockedSlot(slots, tiles, target, 1)).toBe(true);
    expect(isLockedSlot(slots, tiles, target, 2)).toBe(false);
    expect(isLockedSlot(emptySlots(4), tiles, target, 0)).toBe(false);
  });
});

describe('moveTile (Sentence Fun)', () => {
  it('drags a wrong word onto a wrong word: they swap, and nothing is lost or duplicated', () => {
    const slots = [the.id, sun.id, bright.id, is.id];
    const next = moveTile(slots, tiles, target, bright.id, 3); // bright onto is
    expect(next).toEqual([the.id, sun.id, is.id, bright.id]);
    expect(next).not.toBe(slots); // a new array: the input is untouched
    expect(slots).toEqual([the.id, sun.id, bright.id, is.id]);
  });

  it('moves a wrong word to an empty spot, and the spot it left is empty', () => {
    const slots = [the.id, sun.id, bright.id, null];
    expect(moveTile(slots, tiles, target, bright.id, 3)).toEqual([the.id, sun.id, null, bright.id]);
  });

  it('a tray word dropped on a wrong word replaces it; the replaced word leaves the sentence', () => {
    const slots = [the.id, sun.id, bright.id, null];
    const next = moveTile(slots, tiles, target, is.id, 2);
    expect(next).toEqual([the.id, sun.id, is.id, null]);
    expect(next?.includes(bright.id)).toBe(false);
  });

  it('a right word is never moved, and a drop over one is refused (null)', () => {
    const slots = [the.id, sun.id, bright.id, is.id];
    expect(moveTile(slots, tiles, target, the.id, 3)).toBeNull(); // picking up a right word
    expect(moveTile(slots, tiles, target, bright.id, 0)).toBeNull(); // dropping onto a right word
  });

  it('dropping a word on its own spot changes nothing', () => {
    const slots = [the.id, sun.id, bright.id, is.id];
    expect(moveTile(slots, tiles, target, bright.id, 2)).toBe(slots);
  });

  it('with no spot given, a word goes to the first free spot (or nowhere when the sentence is full)', () => {
    expect(moveTile([the.id, null, null, null], tiles, target, sun.id)).toEqual([the.id, sun.id, null, null]);
    const full = [the.id, sun.id, bright.id, is.id];
    expect(moveTile(full, tiles, target, is.id)).toBe(full);
  });
});

describe('moveTile with a repeated word', () => {
  it('"the" twice: each copy is its own word; a right copy is locked, and the other copy goes to its own spot', () => {
    const words = ['the', 'cat', 'and', 'the', 'dog'];
    const copies = makeTiles('r', words);
    const [first, , , second] = copies as [(typeof copies)[number], (typeof copies)[number], (typeof copies)[number], (typeof copies)[number]];
    const slots = [null, null, null, null, null];
    const placed = moveTile(slots, copies, words, second.id, 3); // the second "the" is right in its spot
    expect(placed).toEqual([null, null, null, second.id, null]);
    expect(moveTile(placed!, copies, words, second.id, 0)).toBeNull(); // right, so it stays
    const moved = moveTile(placed!, copies, words, first.id, 3); // the first "the" onto the right one: refused
    expect(moved).toBeNull();
    const elsewhere = moveTile(placed!, copies, words, first.id, 0); // the first "the" to the empty spot: right and locked as well
    expect(elsewhere).toEqual([first.id, null, null, second.id, null]);
  });
});
