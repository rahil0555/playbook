import { describe, expect, it } from 'vitest';
import { emptySlots, makeTiles, placeTile, slotStates, type Slots } from './tiles';

// the sentence "The sun is bright", built in any order: correctness is feedback, so every word can move, right or wrong
const target = ['The', 'sun', 'is', 'bright'];
const tiles = makeTiles('s', target);
const [the, sun, is, bright] = tiles as [(typeof tiles)[number], (typeof tiles)[number], (typeof tiles)[number], (typeof tiles)[number]];

/** every word is in at most one spot, and every word is either on the board or in the tray (none lost, none duplicated) */
function expectNoneLostOrDuplicated(slots: Slots) {
  const onBoard = slots.filter((id): id is string => id !== null);
  expect(new Set(onBoard).size, 'no word in two spots').toBe(onBoard.length);
  const inTray = tiles.filter((t) => !onBoard.includes(t.id));
  expect(onBoard.length + inTray.length, 'every word accounted for').toBe(tiles.length);
}

describe('placeTile moves and swaps correct words too (correctness is feedback, not a restriction)', () => {
  it('a correct word moves into an empty spot, and its old spot is empty again', () => {
    const slots = [the.id, sun.id, is.id, null];
    const next = placeTile(slots, is.id, 3);
    expect(next).toEqual([the.id, sun.id, null, is.id]);
    expect(slotStates(next, tiles, target)).toEqual(['correct', 'correct', 'empty', 'wrong']);
    expectNoneLostOrDuplicated(next);
  });

  it('two correct words swap places', () => {
    const slots = [the.id, sun.id, is.id, bright.id];
    const next = placeTile(slots, the.id, 1);
    expect(next).toEqual([sun.id, the.id, is.id, bright.id]);
    expectNoneLostOrDuplicated(next);
  });

  it('a correct word swaps with an incorrect word, and the incorrect word takes the correct one\'s spot', () => {
    const slots = [the.id, is.id, sun.id, bright.id]; // The is right, is and sun are wrong, bright is right
    const next = placeTile(slots, the.id, 1);
    expect(next).toEqual([is.id, the.id, sun.id, bright.id]);
    expectNoneLostOrDuplicated(next);
  });

  it('a tray word dropped on an occupied correct spot replaces it, and the correct word goes back to the tray', () => {
    const slots = [the.id, sun.id, null, null];
    const next = placeTile(slots, is.id, 0);
    expect(next).toEqual([is.id, sun.id, null, null]);
    expect(next.includes(the.id)).toBe(false); // back in the tray, not lost
    expectNoneLostOrDuplicated(next);
  });

  it('dropping a word on its own spot changes nothing', () => {
    const slots = [the.id, sun.id, is.id, bright.id];
    expect(placeTile(slots, bright.id, 3)).toBe(slots);
  });

  it('a correct word that is moved away and back ends where it started, with nothing else changed', () => {
    const start = [the.id, sun.id, is.id, null];
    const away = placeTile(start, is.id, 3);
    const back = placeTile(away, is.id, 2);
    expect(back).toEqual(start);
  });
});

describe('placeTile with a repeated word: each copy is its own word and can move on its own', () => {
  it('"the" twice: a correct copy moves, and the other copy takes its own spot', () => {
    const words = ['the', 'cat', 'and', 'the', 'dog'];
    const copies = makeTiles('r', words);
    const [first, , , second] = copies as [(typeof copies)[number], (typeof copies)[number], (typeof copies)[number], (typeof copies)[number]];
    const placed = placeTile(emptySlots(5), second.id, 3); // the second "the" is right in spot 4
    const moved = placeTile(placed, second.id, 0); // ...and moves to spot 1 (right there too, as "the" starts the sentence)
    expect(moved).toEqual([second.id, null, null, null, null]);
    const other = placeTile(moved, first.id, 3); // the first "the" lands in the spot the other one left
    expect(other).toEqual([second.id, null, null, first.id, null]);
  });
});
