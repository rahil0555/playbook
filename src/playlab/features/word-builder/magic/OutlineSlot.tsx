import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { usePlayLab } from '../../../app/PlayLabContext';
import { wave } from '../../../motion/variants';
import { StarBurst } from './StarBurst';

interface OutlineSlotProps {
  index: number;
  /** the target letter for this slot (lowercase) */
  letter: string;
  color: string;
  /** id of the tile that landed here */
  landedId: string | null;
  /** the flying letter has arrived: only now does the slot show its own letter (logic is already filled) */
  landed: boolean;
  /** just landed: play glow + burst */
  fresh: boolean;
  /** this landing completed the word: a slightly bigger sparkle */
  grand: boolean;
  /** a tile is hovering over this slot while dragging */
  over: boolean;
  /** hint: pulse this slot */
  hinted: boolean;
  /** the next empty slot in reading order: it glows a little brighter */
  next: boolean;
  /** word finished: letters hop in a wave */
  done: boolean;
  /** is a tile currently picked up (tap fallback)? */
  armed: boolean;
  onActivate: (index: number) => void;
}

const TILE = 'h-[4.4rem] w-[4.4rem] sm:h-[5.4rem] sm:w-[5.4rem]';

/**
 * A magical, softly glowing outline of the target letter. The right tile flies in on its own layer (FlyingLetter);
 * when it arrives the slot turns into the same glossy tile, squashing and springing in with a glow flash and a
 * small star burst. The slot is a real button so the tap-to-place fallback works with mouse, touch and keyboard.
 */
export function OutlineSlot({ index, letter, color, landedId, landed, fresh, grand, over, hinted, next, done, armed, onActivate }: OutlineSlotProps) {
  const { reducedMotion } = usePlayLab();
  const filled = landedId !== null;
  const label = filled ? `Slot ${index + 1}: ${letter.toUpperCase()}, done` : `Slot ${index + 1}, empty${armed ? '. Tap to place the letter you picked up' : ''}`;
  const squash = fresh && !reducedMotion;
  return (
    <button
      type="button"
      data-magic-slot={index}
      data-state={filled ? 'filled' : over ? 'over' : hinted ? 'hint' : 'empty'}
      aria-label={label}
      aria-disabled={filled}
      onClick={() => !filled && onActivate(index)}
      className={`relative grid place-items-center rounded-[1.6rem] transition-[transform,background-color,border-color] ${TILE} ${
        landed
          ? ''
          : `border-[3px] border-dashed ${over ? 'scale-105 border-sky-500 bg-sky-100' : armed ? 'border-sky-500 bg-white' : 'border-amber-400/80 bg-white/75'}`
      }`}
      style={landed ? undefined : { boxShadow: over || armed ? undefined : 'inset 0 0 18px rgba(255,200,80,0.55), 0 0 0 4px rgba(255,255,255,0.55)' }}
    >
      {!landed && (next || hinted || armed) ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-3 -z-10 rounded-[2.2rem] ${reducedMotion ? '' : 'pl-aura'}`}
          style={{ background: `radial-gradient(circle, ${hinted ? 'rgba(125,200,255,0.9)' : 'rgba(255,224,120,0.95)'} 0%, rgba(255,255,255,0) 70%)` }}
        />
      ) : null}

      {/* faint outline of the letter: stroke only, never filled */}
      {!landed ? (
        <motion.span
          aria-hidden="true"
          animate={hinted ? { opacity: [0.45, 1, 0.45] } : { opacity: next ? 0.75 : 0.5 }}
          transition={hinted ? { duration: 1.4, repeat: 3, ease: 'easeInOut' } : { duration: 0.2 }}
          className="select-none font-display text-[2.9rem] font-bold uppercase leading-none sm:text-[3.7rem]"
          style={{ color: 'transparent', WebkitTextStroke: `3px ${color}`, filter: `drop-shadow(0 0 5px ${color}88)` }}
        >
          {letter}
        </motion.span>
      ) : (
        <span className="relative block h-full w-full">
          {fresh ? (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-5 rounded-full"
              style={{ background: `radial-gradient(circle, ${color}cc, ${color}00 66%)` }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1.35, 1.7] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          ) : null}
          {/* hop wave when the word is finished */}
          <motion.span initial="idle" animate={done ? 'go' : 'idle'} custom={index} variants={wave} className="block h-full w-full">
            {/* squash-and-stretch as it snaps in */}
            <motion.span
              aria-hidden="true"
              className="pl-gem grid h-full w-full place-items-center rounded-[1.6rem]"
              style={{ '--gem': color } as CSSProperties}
              initial={squash ? { scaleX: 1.25, scaleY: 0.74 } : false}
              animate={squash ? { scaleX: [1.25, 0.88, 1.05, 1], scaleY: [0.74, 1.2, 0.96, 1], y: [4, -12, 0, -3, 0] } : { scaleX: 1, scaleY: 1, y: 0 }}
              transition={{ duration: 0.46, ease: 'easeOut' }}
            >
              <span className="font-display text-[2.6rem] font-bold uppercase leading-none sm:text-[3.2rem]">{letter}</span>
            </motion.span>
          </motion.span>
          {fresh ? <StarBurst seed={index + 1} count={grand ? 14 : 8} spread={grand ? 90 : 56} /> : null}
        </span>
      )}
    </button>
  );
}
