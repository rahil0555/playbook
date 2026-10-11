import { describe, expect, it } from 'vitest';
import { STICKERS, STICKER_SLOTS, stickerForRound, stickerSummary } from './stickers';

describe('stickers', () => {
  it('the book has twelve different stickers, each with a real illustration', () => {
    expect(STICKER_SLOTS).toBe(12);
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(12);
    expect(new Set(STICKERS.map((s) => s.art)).size).toBe(12);
  });

  it('round 1 earns the first sticker, round 2 the second, and so on', () => {
    expect(stickerForRound(1).id).toBe(STICKERS[0]!.id);
    expect(stickerForRound(2).id).toBe(STICKERS[1]!.id);
    expect(stickerForRound(12).id).toBe(STICKERS[11]!.id);
  });

  it('after the book is full the stickers repeat, and bad numbers are treated as round 1', () => {
    expect(stickerForRound(13).id).toBe(STICKERS[0]!.id);
    expect(stickerForRound(0).id).toBe(STICKERS[0]!.id);
    expect(stickerForRound(-4).id).toBe(STICKERS[0]!.id);
    expect(stickerForRound(2.7).id).toBe(STICKERS[1]!.id);
  });

  it('the summary counts filled slots and extra repeats', () => {
    expect(stickerSummary(0)).toEqual({ unlocked: 0, extra: 0 });
    expect(stickerSummary(3)).toEqual({ unlocked: 3, extra: 0 });
    expect(stickerSummary(12)).toEqual({ unlocked: 12, extra: 0 });
    expect(stickerSummary(14)).toEqual({ unlocked: 12, extra: 2 });
    expect(stickerSummary(-1)).toEqual({ unlocked: 0, extra: 0 });
  });

  it('slot i is unlocked exactly when the child has finished at least i+1 rounds', () => {
    for (let rounds = 0; rounds <= 15; rounds++) {
      const { unlocked } = stickerSummary(rounds);
      for (let slot = 0; slot < STICKER_SLOTS; slot++) {
        expect(slot < unlocked).toBe(rounds > slot);
      }
    }
  });
});
