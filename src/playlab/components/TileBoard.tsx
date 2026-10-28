import { useRef, useState, type ReactNode } from 'react';
import { LayoutGroup, motion, type PanInfo } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { useMoments } from '../moments/useMoments';
import { StarBurst } from '../moments/StarBurst';
import { LETTER_TILE_PALETTE, LetterTileFace, letterTileColor } from './LetterTile';
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
  /** the empty slot the next word belongs in: it glows, the others stay plain (words are read left to right) */
  nextSlot?: number;
}

/** a tapped tile lifts for this long (the selection) before it travels to its slot */
const PICK_UP_MS = 150;
/** if a placed word never reports that its glide has finished, it still lands after this long (a safety net only) */
const LANDING_FALLBACK_MS = 1100;

/**
 * A letter tile is the BOOK-style square. A word tile is the same glossy design, as wide as its word needs (never narrower than a
 * square), and a word slot is a little larger than the tile it holds, so a word sits in its slot without being squeezed.
 */
const SIZE = {
  letter: { box: 'h-[4.4rem] w-[4.4rem] sm:h-[5.4rem] sm:w-[5.4rem]', slot: 'h-[4.4rem] w-[4.4rem] sm:h-[5.4rem] sm:w-[5.4rem]' },
  word: {
    box: 'h-[3.75rem] min-w-[4.5rem] px-3 sm:h-[4.5rem] sm:min-w-[5.2rem]',
    slot: 'h-[4.1rem] min-w-[5rem] px-1.5 sm:h-[4.9rem] sm:min-w-[6rem]',
  },
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
export function TileBoard({ tiles, slots, onPlace, onRemove, slotStates, guide, hintTileId, locked = false, kind, format = (v) => v, noun, trailing, nextSlot }: TileBoardProps) {
  const { reducedMotion } = usePlayLab();
  const moments = useMoments();
  const [over, setOver] = useState<number | null>(null);
  /** tray tiles that are lifted right now (their selection), and the slot each one is travelling to */
  const [lifting, setLifting] = useState<ReadonlyMap<string, number>>(new Map());
  /** the slot each landing word is for, bumped when it lands: a small burst marks the landing */
  const [landings, setLandings] = useState<Record<number, number>>({});
  const travelling = useRef(new Map<string, number>());
  /** placed words whose glide has not finished yet: slot index by tile id. The chime and burst wait for the real landing. */
  const awaitingLanding = useRef(new Map<string, number>());
  /** the latest committed slots, so a tap in the same frame as a landing reads the truth */
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const dragging = useRef(false);
  const size = SIZE[kind];
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const landingSlots = new Set(lifting.values());

  /** the word has arrived: its chime and its landing burst, together */
  const landed = (slotIndex: number) => {
    moments.chime();
    setLandings((all) => ({ ...all, [slotIndex]: (all[slotIndex] ?? 0) + 1 }));
  };
  /** a word has been placed: it lands when its glide has finished (reduced motion has no glide: it lands at once) */
  const placedInto = (tileId: string, slotIndex: number) => {
    if (reducedMotion) return landed(slotIndex);
    awaitingLanding.current.set(tileId, slotIndex);
    moments.after(() => {
      if (awaitingLanding.current.delete(tileId)) landed(slotIndex);
    }, LANDING_FALLBACK_MS);
  };
  const stopLifting = (tileId: string) => {
    travelling.current.delete(tileId);
    setLifting((m) => {
      const next = new Map(m);
      next.delete(tileId);
      return next;
    });
  };

  /** Tap a tray tile: it lifts with a pop (the selection), then travels to the first free slot and lands with a chime. */
  const pickUp = (tile: Tile) => {
    // the same tile cannot be tapped twice; a different tile can be picked up while one is still travelling
    if (locked || travelling.current.has(tile.id) || isPlaced(slotsRef.current, tile.id)) return;
    const reserved = new Set(travelling.current.values());
    const target = slotsRef.current.findIndex((s, i) => s === null && !reserved.has(i));
    if (target < 0) return;
    travelling.current.set(tile.id, target);
    setLifting((m) => new Map(m).set(tile.id, target));
    moments.pop();
    moments.after(() => {
      // a drag took this tile while it was lifting: the drag has already placed it, so nothing else happens
      if (travelling.current.get(tile.id) !== target) return;
      stopLifting(tile.id);
      if (isPlaced(slotsRef.current, tile.id)) return;
      onPlace(tile.id, target);
      placedInto(tile.id, target);
    }, PICK_UP_MS);
  };

  /** a letter has its own tile colour (the same on every screen); a word takes the palette in turn */
  const colorFor = (tile: Tile) => (kind === 'letter' ? letterTileColor(tile.value) : (LETTER_TILE_PALETTE[Math.max(0, tiles.indexOf(tile)) % LETTER_TILE_PALETTE.length] as string));

  const renderTile = (tile: Tile, placedIn: number | null) => {
    const isLifted = lifting.has(tile.id);
    const color = colorFor(tile);
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
        onLayoutAnimationComplete={() => {
          // the glide into the slot has finished: this is the landing
          const slotIndex = awaitingLanding.current.get(tile.id);
          if (slotIndex === undefined || placedIn === null) return;
          awaitingLanding.current.delete(tile.id);
          landed(slotIndex);
        }}
        onDragStart={() => {
          dragging.current = true;
          stopLifting(tile.id); // a drag replaces a pending tap-pick-up of the same word
          if (placedIn === null) moments.pop();
        }}
        onDrag={(_, info) => setOver(slotAt(info))}
        onDragEnd={(_, info) => {
          const target = slotAt(info);
          setOver(null);
          if (target !== null) {
            onPlace(tile.id, target);
            placedInto(tile.id, target);
          } else if (placedIn !== null) onRemove(tile.id);
          // keep the flag until the click that follows pointer-up has been ignored
          setTimeout(() => (dragging.current = false), 0);
        }}
        onClick={() => {
          if (dragging.current) return;
          if (placedIn !== null) onRemove(tile.id);
          else pickUp(tile);
        }}
        className={`pl-draggable relative z-10 inline-flex cursor-grab items-center justify-center rounded-[1.6rem] active:cursor-grabbing ${size.box} ${isLifted ? 'ring-4 ring-white' : ''}`}
      >
        {isHint ? <span aria-hidden="true" className="pointer-events-none absolute -inset-1.5 rounded-[1.9rem] border-4 border-sky-300" /> : null}
        <LetterTileFace text={format(tile.value)} color={color} word={kind === 'word'} className="h-full" />
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
          // the spot a lifted word is flying to glows, the same way a word dragged over it does
          const aimed = over === i || (landingSlots.has(i) && !tile);
          // the next empty slot glows; the other empty slots are plain, so the reading order is clear
          const isNext = i === nextSlot;
          return (
            <div
              key={i}
              data-slot={i}
              role="group"
              data-state={state ?? (tile ? 'filled' : 'empty')}
              aria-label={tile ? `Slot ${i + 1}: ${format(tile.value)}` : `Slot ${i + 1}: empty`}
              style={tile || state === 'correct' || state === 'wrong' || !isNext || aimed ? undefined : { boxShadow: 'inset 0 0 16px rgba(255,200,80,0.5), 0 0 0 4px rgba(255,255,255,0.55)' }}
              className={`relative flex items-center justify-center rounded-[1.5rem] border-[3px] border-dashed transition-[transform,background-color,border-color] ${size.slot} ${
                state === 'correct'
                  ? 'border-brand-500 bg-brand-100 shadow-[0_0_0_4px_rgba(22,162,134,0.25)]'
                  : state === 'wrong'
                    ? 'border-sun-500 bg-sun-100'
                    : aimed
                      ? 'scale-105 border-sky-500 bg-sky-100'
                      : tile
                        ? 'border-transparent bg-black/[0.05]'
                        : isNext
                          ? 'border-amber-400/80 bg-white/75'
                          : 'border-black/15 bg-white/55'
              }`}
            >
              {tile ? renderTile(tile, i) : guide?.[i] ? <span aria-hidden="true" className={`font-display font-bold text-black/15 ${kind === 'letter' ? 'text-[2.6rem] sm:text-[3.2rem]' : 'text-[1.7rem] sm:text-[2.1rem]'}`}>{format(guide[i] as string)}</span> : kind === 'word' ? <span aria-hidden="true" className="font-display text-lg font-bold text-black/25">{i + 1}</span> : null}
              {landings[i] ? <StarBurst key={landings[i]} seed={landings[i]! + i} count={6} spread={46} /> : null}
            </div>
          );
        })}
        {trailing}
      </div>

      {locked && slots.every((id) => id !== null) ? null : (
      <ul aria-label={`Available ${noun}s`} className="pl-wood mt-5 flex flex-wrap items-center justify-center gap-3 rounded-[1.9rem] px-3 py-4 sm:gap-4 sm:px-5">
        {tiles.map((tile) => (
          <li key={tile.id}>
            {isPlaced(slots, tile.id) ? (
              // a word already in a slot stays in the tray, faded, so the tray keeps its shape and the child sees what is left
              kind === 'word' ? (
                <span aria-hidden="true" className={`pointer-events-none block rounded-[1.6rem] opacity-30 saturate-50 ${size.box}`}>
                  <LetterTileFace text={format(tile.value)} color={colorFor(tile)} word className="h-full" />
                </span>
              ) : (
                <span aria-hidden="true" className={`block rounded-[1.5rem] bg-black/20 shadow-[inset_0_4px_8px_rgba(60,25,5,0.45)] ${size.box}`} />
              )
            ) : (
              renderTile(tile, null)
            )}
          </li>
        ))}
      </ul>
      )}
    </LayoutGroup>
  );
}
