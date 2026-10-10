import { motion } from 'framer-motion';
import { animationFor, letterAnimations, springs, wave } from '../../../motion/variants';
import { StarBurst } from './StarBurst';

interface OutlineSlotProps {
  index: number;
  /** the target letter for this slot (lowercase) */
  letter: string;
  color: string;
  /** id of the tile that landed here */
  landedId: string | null;
  /** just landed: play glow + burst */
  fresh: boolean;
  /** a tile is hovering over this slot while dragging */
  over: boolean;
  /** hint: pulse this slot */
  hinted: boolean;
  /** word finished: letters hop in a wave */
  done: boolean;
  /** is a tile currently picked up (tap fallback)? */
  armed: boolean;
  onActivate: (index: number) => void;
}

/**
 * A faint outline of the target letter. When the right tile lands it snaps in (shared layout),
 * bounces, glows briefly and throws a small star burst. The slot is a real button so the
 * tap-to-place fallback works with mouse, touch and keyboard.
 */
export function OutlineSlot({ index, letter, color, landedId, fresh, over, hinted, done, armed, onActivate }: OutlineSlotProps) {
  const filled = landedId !== null;
  const label = filled ? `Slot ${index + 1}: ${letter.toUpperCase()}, done` : `Slot ${index + 1}, empty${armed ? '. Tap to place the letter you picked up' : ''}`;
  return (
    <button
      type="button"
      data-magic-slot={index}
      data-state={filled ? 'filled' : over ? 'over' : hinted ? 'hint' : 'empty'}
      aria-label={label}
      aria-disabled={filled}
      onClick={() => !filled && onActivate(index)}
      className={`relative grid h-[4.9rem] w-[4.2rem] place-items-center rounded-[1.6rem] border-[3px] border-dashed transition-colors sm:h-[6.2rem] sm:w-[5.2rem] ${
        filled ? 'border-transparent' : over ? 'scale-105 border-sky-500 bg-sky-100' : armed ? 'border-sky-500 bg-white' : 'border-black/15 bg-white/70'
      }`}
      style={filled ? { backgroundColor: `${color}22` } : undefined}
    >
      {/* faint outline of the letter: stroke only, never filled */}
      {!filled ? (
        <motion.span
          aria-hidden="true"
          animate={hinted ? { opacity: [0.35, 0.95, 0.35] } : { opacity: 0.4 }}
          transition={hinted ? { duration: 1.4, repeat: 3, ease: 'easeInOut' } : { duration: 0.2 }}
          className="select-none font-display text-[3.4rem] font-bold uppercase leading-none sm:text-[4.4rem]"
          style={{ color: 'transparent', WebkitTextStroke: `3px ${color}` }}
        >
          {letter}
        </motion.span>
      ) : (
        <motion.span
          layoutId={`pl-magic-${landedId}`}
          transition={{ layout: springs.snappy }}
          className="relative grid h-full w-full place-items-center"
        >
          {fresh ? (
            <motion.span
              aria-hidden="true"
              className="absolute -inset-3 rounded-full"
              style={{ background: `radial-gradient(circle, ${color}99, ${color}00 68%)` }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1.4, 1.7] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          ) : null}
          <motion.span initial="idle" animate={done ? 'go' : 'play'} custom={index} variants={{ ...letterAnimations[animationFor(index)], ...wave }} aria-hidden="true" className="relative font-display text-[3.4rem] font-bold uppercase leading-none sm:text-[4.4rem]" style={{ color }}>
            {letter}
          </motion.span>
          {fresh ? <StarBurst seed={index + 1} /> : null}
        </motion.span>
      )}
    </button>
  );
}
