import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LayoutGroup, motion, type PanInfo } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { useMoments } from '../moments/useMoments';
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

/** a tapped tile lifts for this long (the selection) before it travels to its slot */
const PICK_UP_MS = 150;
/** the landing chime waits for the tile to finish its glide */
const GLIDE_MS = 420;

const SIZE = {
  letter: { box: 'h-[4.4rem] w-[4.4rem] sm:h-[5.4rem] sm:w-[5.4rem]', text: 'text-[2.6rem] sm:text-[3.2rem]' },
  word: { box: 'h-[3.75rem] min-w-[4.75rem] px-4 sm:h-[4.5rem] sm:px-6', text: 'text-[1.7rem] sm:text-[2.1rem]' },
} as const;
/** Tile colours: every word gets its own colour, all with white text at >= 3:1 (large text). */
const GEMS = ['#e8573f', '#16a286', '#2f8fd8', '#8a5cc7', '#d9741c'] as const;

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
  const { reducedMotion } = usePlayLab();
  const moments = useMoments();
  const [over, setOver] = useState<number | null>(null);
  /** tray tiles that are lifted right now (their selection), and where each one is travelling to */
  const [lifting, setLifting] = useState<ReadonlySet<string>>(new Set());
  const travelling = useRef(new Map<string, number>());
  const dragging = useRef(false);
  const size = SIZE[kind];
  const byId = new Map(tiles.map((t) => [t.id, t]));

  /** Tap a tray tile: it lifts with a pop (the selection), then travels to the first free slot and lands with a chime. */
  const pickUp = (tile: Tile) => {
    // the same tile cannot be tapped twice; a different tile can be picked up while one is still travelling
    if (locked || travelling.current.has(tile.id)) return;
    const reserved = new Set(travelling.current.values());
    const target = slots.findIndex((s, i) => s === null && !reserved.has(i));
    if (target < 0) return;
    travelling.current.set(tile.id, target);
    setLifting((set) => new Set(set).add(tile.id));
    moments.pop();
    moments.after(() => {
      travelling.current.delete(tile.id);
      setLifting((set) => {
        const next = new Set(set);
        next.delete(tile.id);
        return next;
      });
      onPlace(tile.id, target);
      moments.after(() => moments.chime(), GLIDE_MS);
    }, PICK_UP_MS);
  };

  const renderTile = (tile: Tile, placedIn: number | null) => {
    const isLifted = lifting.has(tile.id);
    const color = kind === 'letter' ? letterColor(tile.value.charCodeAt(0)) : (GEMS[Math.max(0, tiles.indexOf(tile)) % GEMS.length] as string);
    const isHint = hintTileId === tile.id;
    return (
      <motion.button
        key={tile.id}
        type="button"
        layoutId={`pl-tile-${tile.id}`}
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
        initial={placedIn !== null && !reducedMotion ? { scale: 0.55 } : false}
        animate={
          isLifted && !reducedMotion
            ? { x: [0, -6, 6, -3, 0], y: [0, -8, -12, -10], scale: [1, 1.1, 0.96, 1.08], rotate: [0, -6, 5, -2, 0] }
            : { x: 0, y: 0, scale: 1, rotate: 0 }
        }
        transition={isLifted ? { duration: 0.45, ease: 'easeOut', layout: springs.snappy } : { ...springs.bouncy, layout: springs.snappy }}
        onDragStart={() => {
          dragging.current = true;
          if (placedIn === null) moments.pop();
        }}
        onDrag={(_, info) => setOver(slotAt(info))}
        onDragEnd={(_, info) => {
          const target = slotAt(info);
          setOver(null);
          if (target !== null) {
            onPlace(tile.id, target);
            moments.chime();
          } else if (placedIn !== null) onRemove(tile.id);
          // keep the flag until the click that follows pointer-up has been ignored
          setTimeout(() => (dragging.current = false), 0);
        }}
        onClick={() => {
          if (dragging.current) return;
          if (placedIn !== null) onRemove(tile.id);
          else pickUp(tile);
        }}
        className={`pl-draggable pl-gem relative z-10 inline-flex cursor-grab items-center justify-center rounded-[1.5rem] font-display font-bold leading-none active:cursor-grabbing ${size.box} ${size.text} ${isLifted ? 'ring-4 ring-white' : ''}`}
        style={{ '--gem': color } as CSSProperties}
      >
        {isHint ? <span aria-hidden="true" className="pointer-events-none absolute -inset-1.5 rounded-[1.9rem] border-4 border-sky-300" /> : null}
        <span aria-hidden="true">{format(tile.value)}</span>
        {isHint ? <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-sky-700 text-xs text-white">★</span> : null}
      </motion.button>
    );
  };

  return (
    <LayoutGroup>
      <div role="group" aria-label="Your answer" className="pl-paper flex flex-wrap items-center justify-center gap-2.5 rounded-[2rem] px-3 py-4 sm:gap-3.5 sm:px-5 sm:py-5">
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
              style={tile || state ? undefined : { boxShadow: over === i ? undefined : 'inset 0 0 16px rgba(255,200,80,0.5), 0 0 0 4px rgba(255,255,255,0.55)' }}
              className={`relative flex items-center justify-center rounded-[1.5rem] border-[3px] border-dashed transition-colors ${size.box} ${
                state === 'correct'
                  ? 'border-brand-500 bg-brand-100 shadow-[0_0_0_4px_rgba(22,162,134,0.25)]'
                  : state === 'wrong'
                    ? 'border-sun-500 bg-sun-100'
                    : over === i
                      ? 'scale-105 border-sky-500 bg-sky-100'
                      : tile
                        ? 'border-transparent bg-black/[0.05]'
                        : 'border-amber-400/80 bg-white/75'
              }`}
            >
              {tile ? renderTile(tile, i) : guide?.[i] ? <span aria-hidden="true" className={`font-display font-bold text-black/15 ${size.text}`}>{format(guide[i] as string)}</span> : null}
            </div>
          );
        })}
        {trailing}
      </div>

      {locked && slots.every((id) => id !== null) ? null : (
      <ul aria-label={`Available ${noun}s`} className="pl-wood mt-5 flex flex-wrap items-center justify-center gap-3 rounded-[1.9rem] px-3 py-4 sm:gap-4 sm:px-5">
        {tiles.map((tile) => (
          <li key={tile.id}>
            {isPlaced(slots, tile.id) ? <span aria-hidden="true" className={`block rounded-[1.5rem] bg-black/20 shadow-[inset_0_4px_8px_rgba(60,25,5,0.45)] ${size.box}`} /> : renderTile(tile, null)}
          </li>
        ))}
      </ul>
      )}
    </LayoutGroup>
  );
}
