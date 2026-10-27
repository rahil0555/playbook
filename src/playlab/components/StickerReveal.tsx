import { motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { STICKER_SLOTS, stickerForRound } from '../data/stickers';
import { springs } from '../motion/variants';
import { StickerArt } from './StickerArt';

interface StickerRevealProps {
  /** rounds finished so far, the one just finished included: its sticker is the one shown */
  rounds: number;
  className?: string;
}

/**
 * The sticker a finished round has just earned. Only shown when a round has actually been finished: a sticker is never promised for
 * a single answer. Past the twelve book slots the sticker is a repeat, and the card says so.
 */
export function StickerReveal({ rounds, className = '' }: StickerRevealProps) {
  const { reducedMotion } = usePlayLab();
  const n = Math.max(1, rounds);
  const sticker = stickerForRound(n);
  const slot = ((n - 1) % STICKER_SLOTS) + 1;
  const repeat = n > STICKER_SLOTS;
  return (
    <div data-testid="sticker-reveal" className={`flex items-center gap-3 rounded-[1.8rem] bg-sun-100 px-4 py-2 text-left ${className}`}>
      <motion.span initial={reducedMotion ? false : { scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={springs.bouncy} className="shrink-0">
        <StickerArt sticker={sticker} slot={slot} size="h-16 w-16" />
      </motion.span>
      <p className="font-display text-lg font-semibold leading-tight">
        {repeat ? 'Extra sticker' : 'New sticker'}: {sticker.title}!
        <span className="block text-sm font-normal text-ink-soft">{repeat ? 'Another one for your sticker book.' : 'Find it in your sticker book.'}</span>
      </p>
    </div>
  );
}
