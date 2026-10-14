import { motion } from 'framer-motion';
import { usePlayLab } from '../../../app/PlayLabContext';
import { LetterMonster } from '../../../components/LetterMonster';
import { wave } from '../../../motion/variants';
import { SnapBurst } from '../../../moments/SnapBurst';
import { StarBurst } from '../../../moments/StarBurst';

interface OutlineSlotProps {
  index: number;
  /** the target letter for this slot (lowercase) */
  letter: string;
  color: string;
  /** id of the tile that landed here */
  landedId: string | null;
  /** the flying letter has arrived: only now does the slot show its own letter (logic is already filled) */
  landed: boolean;
  /** just landed: play the snap, the squash and the burst */
  fresh: boolean;
  /** this landing completed the word: a slightly bigger sparkle */
  grand: boolean;
  /** a letter is held over (or close to) this spot while dragging */
  over: boolean;
  /** hint: pulse this slot */
  hinted: boolean;
  /** the next empty slot in reading order: it glows a little brighter */
  next: boolean;
  /** word finished: the monsters hop in a wave */
  done: boolean;
  /** the word has landed its celebration: each monster cheers, in turn, left to right */
  celebrated: boolean;
  /** is a tile currently picked up (tap fallback)? */
  armed: boolean;
  onActivate: (index: number) => void;
}

/** a square that fills its column of the word's row (the row sets the size, see .pl-slot-row) */
const TILE = 'aspect-square w-full';

/**
 * A soft, glowing EMPTY outline (it never shows its target letter). The right letter flies in on its own layer (FlyingTile);
 * when it arrives the outline becomes that letter's monster, which snaps in with a squash, a glow flash, a burst of dots and
 * stars. The slot is a real button so the tap-to-place fallback works with mouse, touch and keyboard.
 */
export function OutlineSlot({ index, letter, color, landedId, landed, fresh, grand, over, hinted, next, done, celebrated, armed, onActivate }: OutlineSlotProps) {
  const { reducedMotion } = usePlayLab();
  const filled = landedId !== null;
  const label = filled ? `Slot ${index + 1}: ${letter.toUpperCase()}, done` : `Slot ${index + 1}, empty${armed ? '. Tap to place the letter you picked up' : ''}`;
  const snap = fresh && !reducedMotion;
  return (
    <button
      type="button"
      data-magic-slot={index}
      data-state={filled ? 'filled' : over ? 'over' : hinted ? 'hint' : 'empty'}
      aria-label={label}
      aria-disabled={filled}
      onClick={() => !filled && onActivate(index)}
      className={`relative grid place-items-center rounded-[1.8rem] transition-[transform,background-color,border-color] ${TILE} ${
        landed
          ? ''
          : `border-[3px] border-dashed ${over ? 'pl-drop-pulse scale-105 border-sky-500 bg-sky-100' : armed ? 'border-sky-500 bg-white' : 'border-amber-400/90 bg-white/80'}`
      }`}
      style={landed ? undefined : { boxShadow: over || armed ? undefined : 'inset 0 0 18px rgba(255,200,80,0.45), 0 0 0 4px rgba(255,255,255,0.6), 0 6px 0 rgba(160,110,60,0.12)' }}
    >
      {!landed && (next || hinted || armed) ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-3 -z-10 rounded-[2.2rem] ${reducedMotion ? '' : 'pl-aura'}`}
          style={{ background: `radial-gradient(circle, ${hinted ? 'rgba(125,200,255,0.9)' : 'rgba(255,224,120,0.95)'} 0%, rgba(255,255,255,0) 70%)` }}
        />
      ) : null}

      {/* An unfilled slot is an EMPTY glowing outline: the target letter is never drawn here (no ghost, watermark or
          stroke glyph), so the word cannot be read before the child has placed its letters. */}
      {landed ? (
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
            {/* squash-and-stretch as the monster snaps in */}
            <motion.span
              aria-hidden="true"
              className="relative block h-full w-full"
              initial={snap ? { scaleX: 1.25, scaleY: 0.74 } : false}
              animate={snap ? { scaleX: [1.25, 0.88, 1.05, 1], scaleY: [0.74, 1.2, 0.96, 1], y: [4, -12, 0, -3, 0] } : { scaleX: 1, scaleY: 1, y: 0 }}
              transition={{ duration: 0.46, ease: 'easeOut' }}
            >
              <LetterMonster letter={letter} color={color} mood={celebrated ? 'cheer' : 'idle'} bounce={celebrated && !reducedMotion} phase={index * 0.2} blinkDelay={(index * 0.9) % 4} />
            </motion.span>
          </motion.span>
          {fresh ? <SnapBurst color={color} seed={index + 1} count={grand ? 16 : 10} /> : null}
          {fresh ? <StarBurst seed={index + 1} count={grand ? 14 : 8} spread={grand ? 90 : 56} /> : null}
        </span>
      ) : null}
    </button>
  );
}
