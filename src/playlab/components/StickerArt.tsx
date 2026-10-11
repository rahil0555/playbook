import { Illustration } from '../illustrations/Illustration';
import type { StickerDef } from '../data/stickers';

/**
 * A sticker: a round, white, die-cut style badge with a coloured rim and a soft shadow.
 * A locked slot is a dashed empty ring with its number, so the child can see how many are still to come.
 */
export function StickerArt({ sticker, slot, locked = false, size = 'h-16 w-16' }: { sticker: StickerDef; slot: number; locked?: boolean; size?: string }) {
  if (locked) {
    return (
      <span
        role="img"
        aria-label={`Sticker ${slot}, not yet. Finish a round to earn it`}
        className={`grid ${size} place-items-center rounded-full border-[3px] border-dashed border-black/20 bg-white/50 font-display text-lg font-bold text-ink-soft`}
      >
        <span aria-hidden="true">{slot}</span>
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={`${sticker.title} sticker`}
      className={`grid ${size} place-items-center rounded-full border-[5px] border-white bg-white shadow-[0_6px_0_rgba(18,49,44,0.14),0_10px_16px_-8px_rgba(18,49,44,0.35)] ring-2 ring-sun-300`}
    >
      <Illustration name={sticker.art} className="h-[72%] w-[72%]" />
    </span>
  );
}
