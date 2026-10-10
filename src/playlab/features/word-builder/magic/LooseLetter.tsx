import { useEffect, useRef } from 'react';
import { motion, useAnimationControls, type PanInfo } from 'framer-motion';
import { elementUnder } from '../../../lib/dom';
import { springs } from '../../../motion/variants';
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
  /** pointer released; slot under it or null */
  onDrop: (tileId: string, slot: number | null) => void;
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
  const wobble = useAnimationControls();
  const dragging = useRef(false);

  useEffect(() => {
    if (wobbleKey > 0) void wobble.start({ rotate: [0, -12, 10, -6, 3, 0], x: [0, -6, 6, -3, 2, 0], transition: { duration: 0.55, ease: 'easeInOut' } });
  }, [wobbleKey, wobble]);

  return (
    <motion.button
      type="button"
      layoutId={`pl-magic-${tile.id}`}
      data-magic-tile={tile.id}
      data-value={tile.value}
      data-decoy={tile.decoy}
      aria-pressed={selected}
      aria-label={`Letter ${tile.value.toUpperCase()}${selected ? ', picked up. Now choose a spot' : '. Tap to pick it up, or drag it'}`}
      disabled={disabled}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: selected ? 1.12 : 1, opacity: 1, y: selected ? -6 : 0 }}
      transition={{ ...springs.bouncy, delay: selected ? 0 : index * 0.05 }}
      whileHover={disabled ? undefined : { y: -4 }}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      drag={!disabled}
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.2}
      whileDrag={{ scale: 1.22, rotate: -6, zIndex: 50 }}
      onDragStart={() => {
        dragging.current = true;
      }}
      onDrag={(_, info) => onHover(slotAt(info))}
      onDragEnd={(_, info) => {
        onHover(null);
        onDrop(tile.id, slotAt(info));
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
      <motion.span animate={wobble} aria-hidden="true" className="block">
        {tile.value}
      </motion.span>
      {hinted ? <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-sky-700 text-xs text-white">★</span> : null}
    </motion.button>
  );
}
