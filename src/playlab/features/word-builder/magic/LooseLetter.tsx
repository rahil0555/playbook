import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useSpring, type PanInfo } from 'framer-motion';
import { usePlayLab } from '../../../app/PlayLabContext';
import { useSpeech } from '../../../hooks/useAudio';
import { StarBurst } from '../../../moments/StarBurst';
import { tapSoundGate } from './magicFeel';
import { springs } from '../../../motion/variants';
import { clamp, measurePose, type Pose } from '../../../moments/flightPath';
import { nearestSlot } from '../../../lib/dom';
import { LetterTileFace } from '../../../components/LetterTile';
import type { MagicTile } from './magicBoard';

/** kept under its old name for Magic Letters: where a tile is right now */
export const measureTile = measurePose;

/**
 * Every letter tile is the same square: 56 px on the narrowest phones, 60 px from 360 px, and 86 px from the sm breakpoint, so four
 * tiles and their gaps fit a row at each of those widths (the tray's padding in playlab.css uses the same sizes). The tile's letter
 * is sized to the square, so no letter pushes its tile taller.
 */
export const TILE_BOX = 'h-14 w-14 min-[360px]:h-[3.75rem] min-[360px]:w-[3.75rem] sm:h-[5.4rem] sm:w-[5.4rem]';

/**
 * How many tiles go in each row on a phone: as few rows as possible, at most four to a row, and the rows as even as they can be
 * (five tiles are three and two, not four and one). The tray's padding uses this to hold each row to that width.
 */
export function tilesPerRow(count: number, maxPerRow = 4): number {
  const rows = Math.max(1, Math.ceil(count / maxPerRow));
  return Math.max(1, Math.ceil(count / rows));
}

interface LooseLetterProps {
  tile: MagicTile;
  color: string;
  index: number;
  selected: boolean;
  hinted: boolean;
  disabled: boolean;
  /** increments each time this tile should wobble (a miss) */
  wobbleKey: number;
  onTap: (tileId: string) => void;
  /** slot under the letter while dragging (null = none) */
  onHover: (slot: number | null) => void;
  /** pointer released; slot it is over or close to, or null, plus where the tile was when let go (viewport coordinates) */
  onDrop: (tileId: string, slot: number | null, pose: Pose | null) => void;
  /** the letter is picked up by a drag: its sound starts repeating */
  onHoldStart: (tileId: string) => void;
  /** the letter is let go (before it is dropped): its sound stops at once */
  onHoldEnd: () => void;
  /** the letter sits in a spot (a wrong one): it fills the spot instead of keeping the tray's size */
  fill?: boolean;
}

/** Where the tile was when let go: the pointer position plus the grab offset, with the scale/tilt it had. */
function releasePose(el: Element | null, info: PanInfo, grab: { dx: number; dy: number } | null): Pose | null {
  const m = measureTile(el);
  if (!m || !grab) return m;
  return { ...m, cx: info.point.x - window.scrollX + grab.dx, cy: info.point.y - window.scrollY + grab.dy };
}

/** The spot this tile is over or close to (empty, or holding a letter a swap would take). The glow and the drop both use it, so what the child sees is where it lands. */
function nearestSpot(el: HTMLElement | null): number | null {
  const slot = nearestSlot(el, '[data-magic-slot]');
  return slot ? Number(slot.dataset.magicSlot) : null;
}

/**
 * A draggable letter tile (BOOK style). Press it and it gives a little squish; drag it and it stretches and leans into its motion;
 * let it go and it snaps back. A miss makes it wobble. Drag it onto a spot, or tap it to pick it up (then tap a spot). The drag
 * target is the outer button; the motion runs on inner spans so they never fight the drag.
 */
export function LooseLetter({ tile, color, index, selected, hinted, disabled, wobbleKey, onTap, onHover, onDrop, onHoldStart, onHoldEnd, fill = false }: LooseLetterProps) {
  const { reducedMotion } = usePlayLab();
  const { sfx } = useSpeech();
  const squish = useAnimationControls();
  const wobble = useAnimationControls();
  const tilt = useSpring(0, { stiffness: 240, damping: 13 });
  const stretchX = useSpring(1, { stiffness: 320, damping: 14 });
  const stretchY = useSpring(1, { stiffness: 320, damping: 14 });
  /** changes on every pick-up, so the sparkle plays again each time (and only the latest one is kept in the DOM) */
  const [sparkle, setSparkle] = useState(0);
  /** held down by a drag: the tile does not float while it is carried */
  const [held, setHeld] = useState(false);
  const dragging = useRef(false);
  const pressed = useRef(false);
  const ref = useRef<HTMLButtonElement>(null);
  /** pointer → tile-centre offset, taken when the drag starts (so the release point never depends on render timing) */
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (wobbleKey === 0) return;
    if (!reducedMotion) void wobble.start({ rotate: [0, -12, 10, -6, 3, 0], x: [0, -6, 6, -3, 2, 0], transition: { duration: 0.55, ease: 'easeInOut' } });
  }, [wobbleKey, wobble, reducedMotion]);

  /** the press: the tile squishes and stretches the moment it is pressed, before any release */
  const squishNow = () => {
    if (reducedMotion) return;
    void squish.start({
      x: [0, -4, 4, -3, 3, 0],
      scaleX: [1, 1.2, 0.88, 1.08, 0.97, 1],
      scaleY: [1, 0.8, 1.12, 0.96, 1.02, 1],
      transition: { duration: 0.55, ease: 'easeOut' },
    });
  };

  /** A tap also plays a short pop (or a pop for a letter that is put down) and a tiny sparkle; rapid taps share one pop. */
  const feelTap = () => {
    if (!selected) {
      if (tapSoundGate.allow('tap')) sfx('boing');
      if (!reducedMotion) setSparkle((n) => n + 1);
    } else if (tapSoundGate.allow('tap')) {
      sfx('pop');
    }
  };

  return (
    <motion.button
      type="button"
      ref={ref}
      data-magic-tile={tile.id}
      data-value={tile.value}
      data-decoy={tile.decoy}
      aria-pressed={selected}
      aria-label={`Letter ${tile.value.toUpperCase()}${selected ? ', picked up. Now choose a spot' : '. Tap to pick it up, or drag it'}`}
      disabled={disabled}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: selected && !reducedMotion ? 1.12 : 1, opacity: 1, y: selected && !reducedMotion ? -8 : 0 }}
      transition={{ ...springs.bouncy, delay: selected ? 0 : index * 0.05 }}
      whileHover={disabled ? undefined : { y: -4 }}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      drag={!disabled}
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.2}
      whileDrag={{ scale: 1.2, zIndex: 50 }}
      onPointerDown={() => {
        if (disabled) return;
        pressed.current = true;
        squishNow();
      }}
      onDragStart={(_, info) => {
        dragging.current = true;
        setHeld(true);
        onHoldStart(tile.id);
        const m = measureTile(ref.current);
        grab.current = m ? { dx: m.cx - (info.point.x - window.scrollX), dy: m.cy - (info.point.y - window.scrollY) } : null;
      }}
      onDrag={(_, info) => {
        if (!reducedMotion) {
          // the tile leans into the way it is moving and stretches with its speed
          const vx = info.velocity.x;
          const vy = info.velocity.y;
          tilt.set(clamp(vx / 80, -16, 16));
          const stretch = clamp(Math.hypot(vx, vy) / 2600, 0, 0.2);
          stretchX.set(1 + stretch * 0.6);
          stretchY.set(1 - stretch * 0.5);
        }
        onHover(nearestSpot(ref.current));
      }}
      onDragEnd={(_, info) => {
        const slot = nearestSpot(ref.current);
        onHoldEnd(); // the sound stops before the drop can say the letter's own sound
        onHover(null);
        onDrop(tile.id, slot, releasePose(ref.current, info, grab.current));
        setHeld(false);
        pressed.current = false;
        tilt.set(0);
        stretchX.set(1);
        stretchY.set(1);
        if (!reducedMotion) void squish.start({ scaleX: [1.2, 0.86, 1], scaleY: [0.8, 1.14, 1], transition: { duration: 0.4, ease: 'easeOut' } });
        setTimeout(() => (dragging.current = false), 0); // swallow the click that follows pointer-up
      }}
      onClick={() => {
        const wasPressed = pressed.current;
        pressed.current = false;
        if (dragging.current) return;
        if (!wasPressed) squishNow(); // keyboard, or a click without a press
        feelTap();
        onTap(tile.id);
      }}
      className={`pl-draggable relative z-10 grid cursor-grab place-items-center active:cursor-grabbing ${fill ? 'h-full w-full' : TILE_BOX}`}
    >
      {selected && sparkle > 0 && !reducedMotion ? <StarBurst key={sparkle} seed={sparkle + index} count={5} spread={38} /> : null}
      {/* selected / hinted ring (a separate layer, so the tile keeps its shadow) */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-1.5 rounded-[2.2rem] border-4 transition-opacity duration-150 ${hinted ? 'border-sky-300 opacity-100' : selected ? 'border-white opacity-100' : 'opacity-0'}`}
      />
      {/* lifted-off-the-tray look: a soft glow and a ground shadow, faded in with opacity only */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 -z-10 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}66, ${color}00 70%)` }}
        initial={false}
        animate={{ opacity: selected ? 1 : 0 }}
        transition={{ duration: 0.18 }}
      />
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 left-2 right-2 -z-10 h-3 rounded-full bg-black/25 blur-[5px]"
        initial={false}
        animate={{ opacity: selected ? 1 : 0 }}
        transition={{ duration: 0.18 }}
      />
      <motion.span animate={squish} aria-hidden="true" className="block h-full w-full">
        <motion.span animate={wobble} className="block h-full w-full">
          <motion.span style={{ rotate: tilt, scaleX: stretchX, scaleY: stretchY }} className="block h-full w-full">
            <span className={`block h-full w-full ${!reducedMotion && !selected && !held ? 'pl-float' : ''}`}>
              <LetterTileFace text={tile.value} color={color} />
            </span>
          </motion.span>
        </motion.span>
      </motion.span>
      {hinted ? <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-sky-700 text-xs text-white">★</span> : null}
    </motion.button>
  );
}
