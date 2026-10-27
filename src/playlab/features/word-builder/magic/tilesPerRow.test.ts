import { describe, expect, it } from 'vitest';
import { tilesPerRow } from './LooseLetter';

describe('the letter tray rows on a phone', () => {
  it('keeps every row to at most four tiles', () => {
    for (let count = 1; count <= 12; count += 1) expect(tilesPerRow(count), `${count} tiles`).toBeLessThanOrEqual(4);
  });

  it('spreads the tiles over as few rows as possible, as evenly as it can', () => {
    expect(tilesPerRow(4)).toBe(4); // one row
    expect(tilesPerRow(5)).toBe(3); // three and two, not four and one
    expect(tilesPerRow(6)).toBe(3);
    expect(tilesPerRow(7)).toBe(4); // four and three
    expect(tilesPerRow(8)).toBe(4);
    expect(tilesPerRow(9)).toBe(3); // three rows of three
  });

  it('never returns less than one, even for an empty tray', () => {
    expect(tilesPerRow(0)).toBe(1);
    expect(tilesPerRow(1)).toBe(1);
  });
});
