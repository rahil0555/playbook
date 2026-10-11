import { useEffect, useRef } from 'react';
import { motion, useAnimationControls, type PanInfo } from 'framer-motion';
import { usePlayLab } from '../../../app/PlayLabContext';
import { elementUnder } from '../../../lib/dom';
import { springs } from '../../../motion/variants';
import { parseTransform, type Pose } from './flightPath';
import type { MagicTile } from './magicBoard';

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
  /** slot under the pointer while dragging (null = none) */
  onHover: (slot: number | null) => void;
  /** pointer released; slot under it or null, plus where the bubble was when let go (viewport coordinates) */
  onDrop: (tileId: string, slot: number | null, pose: Pose | null) => void;
}

/** Where a bubble is right now (viewport coordinates), including any drag offset, scale and tilt. */
export function measureTile(el: Element | null): Pose | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const html = el as HTMLElement;
  const w = html.offsetWidth;
  const h = html.offsetHeight;
  if (!w || !h) return null;
  const { scale, rot } = parseTransform(getComputedStyle(el).transform);
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w, h, scale, rot };
}

/** Where the bubble was when let go: the pointer position plus the grab offset, with the scale/tilt it had. */
function releasePose(el: Element | null, info: PanInfo, grab: { dx: number; dy: number } | null): Pose | null {
  const m = measureTile(el);
  if (!m || !grab) return m;
  return { ...m, cx: info.point.x - window.scrollX + grab.dx, cy: info.point.y - window.scrollY + grab.dy };
}

const slotAt = (info: PanInfo): number | null => {
  const el = elementUnder(info, '[data-magic-slot]');
  return el ? Number(el.dataset.magicSlot) : null;
};

/**
 * A loose letter bubble. Drag it onto a slot, or tap it to select (then tap a slot).
 * The drag target is the outer button; the miss-wobble runs on an inner span so it
 * never fights the drag transform.
 */
export function LooseLetter({ tile, color, index, selected, hinted, disabled, wobbleKey, onTap, onHover, onDrop }: LooseLetterProps) {
  const { reducedMotion } = usePlayLab();
  const wobble = useAnimationControls();
  const jiggle = useAnimationControls();
  const dragging = useRef(false);
  const ref = useRef<HTMLButtonElement>(null);
  /** pointer → bubble-centre offset, taken when the drag starts (so the release point never depends on render timing) */
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  // Picked up: a quick playful jiggle with a little squash and stretch (skipped for reduced motion).
  useEffect(() => {
    if (!selected || reducedMotion) return;
    void jiggle.start({
      x: [0, -5, 5, -4, 3, 0],
      rotate: [0, -7, 7, -5, 3, 0],
      scaleX: [1, 1.1, 0.94, 1.05, 1],
      scaleY: [1, 0.9, 1.07, 0.97, 1],
      transition: { duration: 0.5, ease: 'easeInOut' },
    });
  }, [selected, reducedMotion, jiggle]);

  useEffect(() => {
    if (wobbleKey > 0) void wobble.start({ rotate: [0, -12, 10, -6, 3, 0], x: [0, -6, 6, -3, 2, 0], transition: { duration: 0.55, ease: 'easeInOut' } });
  }, [wobbleKey, wobble]);

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
      whileDrag={{ scale: 1.22, rotate: -6, zIndex: 50 }}
      onDragStart={(_, info) => {
        dragging.current = true;
        const m = measureTile(ref.current);
        grab.current = m ? { dx: m.cx - (info.point.x - window.scrollX), dy: m.cy - (info.point.y - window.scrollY) } : null;
      }}
      onDrag={(_, info) => onHover(slotAt(info))}
      onDragEnd={(_, info) => {
        onHover(null);
        onDrop(tile.id, slotAt(info), releasePose(ref.current, info, grab.current));
        setTimeout(() => (dragging.current = false), 0); // swallow the click that follows pointer-up
      }}
      onClick={() => {
        if (!dragging.current) onTap(tile.id);
      }}
      className={`pl-draggable pl-chunk relative z-10 grid h-[4.4rem] w-[4.4rem] cursor-grab place-items-center rounded-[1.6rem] border-[3px] font-display text-[2.6rem] font-bold uppercase leading-none active:cursor-grabbing sm:h-[5.4rem] sm:w-[5.4rem] sm:text-[3.2rem] ${
        hinted ? 'ring-4 ring-sky-300' : selected ? 'ring-4 ring-white' : ''
      }`}
      style={{ color, borderColor: color, backgroundColor: `${color}1f` }}
    >
      {/* lifted-off-the-tray look: a soft glow and a cast shadow, faded in with opacity only */}
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
      <motion.span animate={jiggle} aria-hidden="true" className="block">
        <motion.span animate={wobble} className="block">
          {tile.value}
        </motion.span>
      </motion.span>
      {hinted ? <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-sky-700 text-xs text-white">★</span> : null}
    </motion.button>
  );
}
