import { useRef, useState, type ReactNode } from 'react';
import { LayoutGroup, motion, type PanInfo } from 'framer-motion';
import { letterColor } from '../lib/accents';
import { elementUnder } from '../lib/dom';
import { isPlaced, type SlotState, type Slots, type Tile } from '../lib/tiles';
import { dragProps, springs } from '../motion/variants';

interface TileBoardProps {
  tiles: Tile[];
  slots: Slots;
  /** Put a tile in a slot (slotIndex undefined = first free slot) */
  onPlace: (tileId: string, slotIndex?: number) => void;
  onRemove: (tileId: string) => void;
  /** After "Check": per-slot result. Omit while the child is still building. */
  slotStates?: SlotState[];
  /** Faint guide letters shown in empty slots (Starter level, like the reference reel) */
  guide?: string[];
  hintTileId?: string | null;
  locked?: boolean;
  kind: 'letter' | 'word';
  /** how a tile value is displayed (letters are shown uppercase) */
  format?: (value: string) => string;
  /** accessible noun, e.g. "letter" or "word" */
  noun: string;
  /** rendered after the last slot, e.g. the sentence's full stop */
  trailing?: ReactNode;
}

const SIZE = {
  letter: { box: 'h-[4.1rem] w-[4.1rem] sm:h-20 sm:w-20', text: 'text-[2.3rem] sm:text-5xl' },
  word: { box: 'h-14 min-w-[4.5rem] px-4 sm:h-16 sm:px-5', text: 'text-2xl sm:text-3xl' },
} as const;

function slotAt(info: PanInfo): number | null {
  const slot = elementUnder(info, '[data-slot]');
  return slot ? Number(slot.dataset.slot) : null;
}

/**
 * Shared tile tray + answer slots used by the word builder and sentence builder.
 * - tap a tile in the tray: it flies into the first free slot
 * - tap a placed tile: it flies back to the tray
 * - drag a tile onto any slot (touch or mouse); dropping a placed tile elsewhere returns it
 * - tiles keep a stable "bay" in the tray, so nothing reflows while playing
 */
export function TileBoard({ tiles, slots, onPlace, onRemove, slotStates, guide, hintTileId, locked = false, kind, format = (v) => v, noun, trailing }: TileBoardProps) {
  const [over, setOver] = useState<number | null>(null);
  const dragging = useRef(false);
  const size = SIZE[kind];
  const byId = new Map(tiles.map((t) => [t.id, t]));

  const renderTile = (tile: Tile, placedIn: number | null) => {
    const color = kind === 'letter' ? letterColor(tile.value.charCodeAt(0)) : '#12312c';
    const isHint = hintTileId === tile.id;
    return (
      <motion.button
        key={tile.id}
        type="button"
        layoutId={`pl-tile-${tile.id}`}
        transition={{ layout: springs.snappy }}
        disabled={locked}
        data-tile={tile.id}
        data-value={tile.value}
        data-placed={placedIn !== null}
        aria-label={placedIn !== null ? `${noun} ${format(tile.value)}, in slot ${placedIn + 1}. Tap to take it back` : `${noun} ${format(tile.value)}. Tap to place it`}
        drag={!locked}
        dragSnapToOrigin
        dragMomentum={dragProps.dragMomentum}
        dragElastic={dragProps.dragElastic}
        dragTransition={dragProps.dragTransition}
        whileDrag={dragProps.whileDrag}
        whileTap={{ scale: 0.92 }}
        onDragStart={() => {
          dragging.current = true;
        }}
        onDrag={(_, info) => setOver(slotAt(info))}
        onDragEnd={(_, info) => {
          const target = slotAt(info);
          setOver(null);
          if (target !== null) onPlace(tile.id, target);
          else if (placedIn !== null) onRemove(tile.id);
          // keep the flag until the click that follows pointer-up has been ignored
          setTimeout(() => (dragging.current = false), 0);
        }}
        onClick={() => {
          if (dragging.current) return;
          if (placedIn !== null) onRemove(tile.id);
          else onPlace(tile.id);
        }}
        className={`pl-draggable pl-chunk relative z-10 inline-flex cursor-grab items-center justify-center rounded-3xl border-2 bg-white font-display font-bold leading-none active:cursor-grabbing ${size.box} ${size.text} ${
          isHint ? 'border-sky-500 ring-4 ring-sky-300' : 'border-black/10'
        }`}
        style={{ color }}
      >
        <span aria-hidden="true">{format(tile.value)}</span>
        {isHint ? <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-sky-700 text-xs text-white">★</span> : null}
      </motion.button>
    );
  };

  return (
    <LayoutGroup>
      <div role="group" aria-label="Your answer" className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {slots.map((tileId, i) => {
          const tile = tileId ? byId.get(tileId) : undefined;
          const state = slotStates?.[i];
          return (
            <div
              key={i}
              data-slot={i}
              role="group"
              data-state={state ?? (tile ? 'filled' : 'empty')}
              aria-label={tile ? `Slot ${i + 1}: ${format(tile.value)}` : `Slot ${i + 1}: empty`}
              className={`relative flex items-center justify-center rounded-3xl border-[3px] border-dashed transition-colors ${size.box} ${
                state === 'correct'
                  ? 'border-brand-500 bg-brand-100'
                  : state === 'wrong'
                    ? 'border-sun-500 bg-sun-100'
                    : over === i
                      ? 'scale-105 border-sky-500 bg-sky-100'
                      : tile
                        ? 'border-transparent bg-black/[0.04]'
                        : 'border-black/20 bg-white/70'
              }`}
            >
              {tile ? renderTile(tile, i) : guide?.[i] ? <span aria-hidden="true" className={`font-display font-bold text-black/15 ${size.text}`}>{format(guide[i] as string)}</span> : null}
            </div>
          );
        })}
        {trailing}
      </div>

      {locked && slots.every((id) => id !== null) ? null : (
      <ul aria-label={`Available ${noun}s`} className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {tiles.map((tile) => (
          <li key={tile.id}>
            {isPlaced(slots, tile.id) ? <span aria-hidden="true" className={`block rounded-3xl bg-black/[0.045] ${size.box}`} /> : renderTile(tile, null)}
          </li>
        ))}
      </ul>
      )}
    </LayoutGroup>
  );
}
