import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
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
  /** Put a tile in a slot (slotIndex undefined = first free slot). The parent decides: a right word is never moved. */
  onPlace: (tileId: string, slotIndex?: number) => void;
  onRemove: (tileId: string) => void;
  /** Per-slot result. A slot marked 'correct' is locked: its word is right, so it is not picked up and nothing is dropped over it. */
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

/** the slot under a drag, found without counting the dragged tile's own slot */
function slotAt(info: PanInfo, dragged: HTMLElement | undefined): number | null {
  const slot = elementUnder(info, '[data-slot]', dragged);
  return slot ? Number(slot.dataset.slot) : null;
}

/**
 * Shared tile tray + answer slots used by the sentence builder.
 * - tap a tray tile: it flies into the next free slot (the glowing one)
 * - tap a placed tile, then tap a slot: the tile moves there, or swaps with the tile in it (tap the other tile to do the same)
 * - drag a tile onto a slot: a placed tile moves, or swaps with the one already there; a tray tile replaces the one there
 * - drop a placed tile outside the row: it goes back to the tray
 * - a word that is already right is locked in its slot
 * - tiles keep a stable "bay" in the tray, so nothing reflows while playing
 */
export function TileBoard({ tiles, slots, onPlace, onRemove, slotStates, guide, hintTileId, locked = false, kind, format = (v) => v, noun, trailing, nextSlot }: TileBoardProps) {
  const { reducedMotion } = usePlayLab();
  const moments = useMoments();
  const [over, setOver] = useState<number | null>(null);
  /** tray tiles that are lifted right now (their selection), and the slot each one is travelling to */
  const [lifting, setLifting] = useState<ReadonlyMap<string, number>>(new Map());
  /** a placed tile that is picked up: the next slot tapped is where it goes */
  const [picked, setPicked] = useState<string | null>(null);
  /** the slot each landing word is for, bumped when it lands: a small burst marks the landing */
  const [landings, setLandings] = useState<Record<number, number>>({});
  const travelling = useRef(new Map<string, number>());
  /** placed words whose glide has not finished yet: slot index by tile id. The chime and burst wait for the real landing. */
  const awaitingLanding = useRef(new Map<string, number>());
  /** the latest committed slots, so a tap in the same frame as a landing reads the truth */
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const dragging = useRef(false);
  /** the element of each tile, so a drag can find the slot under it while it is still on top */
  const tileEls = useRef(new Map<string, HTMLElement>());
  const size = SIZE[kind];
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const landingSlots = new Set(lifting.values());

  /** a right word is locked: it is not picked up, and nothing is dropped over it */
  const isLocked = (slotIndex: number) => slotStates?.[slotIndex] === 'correct';

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

  /** Tap a tray tile: it lifts with a pop (the selection), then travels to the next free slot and lands with a chime. */
  const pickUp = (tile: Tile) => {
    // the same tile cannot be tapped twice; a different tile can be picked up while one is still travelling
    if (locked || travelling.current.has(tile.id) || isPlaced(slotsRef.current, tile.id)) return;
    const reserved = new Set(travelling.current.values());
    const target = slotsRef.current.findIndex((s, i) => s === null && !reserved.has(i));
    if (target < 0) return;
    setPicked(null);
    travelling.current.set(tile.id, target);
    setLifting((m) => new Map(m).set(tile.id, target));
    moments.pop();
    moments.after(() => {
      // a drag took this tile while it was lifting: the drag has already placed it, so nothing else happens
      if (travelling.current.get(tile.id) !== target) return;
      stopLifting(tile.id);
      if (isPlaced(slotsRef.current, tile.id)) return;
      // the spot may have been taken while the word lifted: then it goes to the first free spot
      const at = slotsRef.current[target] === null ? target : slotsRef.current.findIndex((s) => s === null);
      if (at < 0) return;
      onPlace(tile.id, at);
      placedInto(tile.id, at);
    }, PICK_UP_MS);
  };

  /** Tap a placed tile: a right one stays put; otherwise it is picked up, or, with another tile picked up, that tile moves to its spot. */
  const tapPlaced = (tileId: string, slotIndex: number) => {
    if (isLocked(slotIndex)) return;
    if (picked !== null && picked !== tileId) {
      onPlace(picked, slotIndex);
      setPicked(null);
      return;
    }
    setPicked(picked === tileId ? null : tileId);
    if (picked !== tileId) moments.pop();
  };

  /** Tap a slot while a placed tile is picked up: the tile goes there (a move, or a swap). The same spot puts it down. */
  const tapSlot = (slotIndex: number) => {
    if (picked === null || isLocked(slotIndex)) return;
    onPlace(picked, slotIndex);
    setPicked(null);
  };
  const slotKey = (event: KeyboardEvent<HTMLDivElement>, slotIndex: number) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    tapSlot(slotIndex);
  };

  /** a letter has its own tile colour (the same on every screen); a word takes the palette in turn */
  const colorFor = (tile: Tile) => (kind === 'letter' ? letterTileColor(tile.value) : (LETTER_TILE_PALETTE[Math.max(0, tiles.indexOf(tile)) % LETTER_TILE_PALETTE.length] as string));

  const renderTile = (tile: Tile, placedIn: number | null) => {
    const isLifted = lifting.has(tile.id) || picked === tile.id;
    const color = colorFor(tile);
    const isHint = hintTileId === tile.id;
    // a right word, once placed, is final: it is shown, but it cannot be picked up or dragged
    const inert = locked || (placedIn !== null && isLocked(placedIn));
    const label =
      placedIn === null
        ? `${noun} ${format(tile.value)}. Tap to place it`
        : isLocked(placedIn)
          ? `${noun} ${format(tile.value)}, in slot ${placedIn + 1}. In the right place`
          : picked === tile.id
            ? `${noun} ${format(tile.value)}, in slot ${placedIn + 1}. Picked up. Now tap a slot`
            : `${noun} ${format(tile.value)}, in slot ${placedIn + 1}. Tap to pick it up, then tap a slot`;
    return (
      <motion.button
        key={tile.id}
        type="button"
        ref={(el: HTMLButtonElement | null) => {
          if (el) tileEls.current.set(tile.id, el);
          else tileEls.current.delete(tile.id);
        }}
        layoutId={`pl-tile-${tile.id}`}
        disabled={inert}
        data-tile={tile.id}
        data-value={tile.value}
        data-placed={placedIn !== null}
        aria-pressed={placedIn !== null ? picked === tile.id : undefined}
        aria-label={label}
        drag={!inert}
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
          setPicked(null);
          if (placedIn === null) moments.pop();
        }}
        onDrag={(_, info) => setOver(slotAt(info, tileEls.current.get(tile.id)))}
        onDragEnd={(_, info) => {
          const target = slotAt(info, tileEls.current.get(tile.id));
          setOver(null);
          if (target !== null && target !== placedIn && !isLocked(target)) {
            onPlace(tile.id, target);
            placedInto(tile.id, target);
          } else if (target === null && placedIn !== null) onRemove(tile.id);
          // keep the flag until the click that follows pointer-up has been ignored
          setTimeout(() => (dragging.current = false), 0);
        }}
        onClick={(event) => {
          if (dragging.current) return;
          if (placedIn !== null) {
            // the click is the tile's own: the slot around it must not also take it as a tap on the spot
            event.stopPropagation();
            tapPlaced(tile.id, placedIn);
          } else pickUp(tile);
        }}
        className={`pl-draggable relative z-10 inline-flex items-center justify-center rounded-[1.6rem] ${inert ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${size.box} ${isLifted ? 'ring-4 ring-white' : ''}`}
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
          // the spot a dragged or a picked-up word is over or can go to: it glows, the same way
          const canTake = picked !== null && !isLocked(i) && tileId !== picked;
          const aimed = (over === i && !isLocked(i)) || (landingSlots.has(i) && !tile);
          // the next empty slot glows; the other empty slots are plain, so the reading order is clear
          const isNext = i === nextSlot;
          const keyboardSpot = canTake && !tile;
          return (
            <div
              key={i}
              data-slot={i}
              role={canTake ? 'button' : 'group'}
              tabIndex={canTake ? 0 : undefined}
              onClick={() => tapSlot(i)}
              onKeyDown={canTake ? (event) => slotKey(event, i) : undefined}
              data-state={state ?? (tile ? 'filled' : 'empty')}
              aria-label={
                tile
                  ? `Slot ${i + 1}: ${format(tile.value)}${canTake ? '. Tap to swap the picked word here' : ''}`
                  : `Slot ${i + 1}: empty${keyboardSpot ? '. Tap to put the picked word here' : ''}`
              }
              style={tile || state === 'correct' || state === 'wrong' || !isNext || aimed || canTake ? undefined : { boxShadow: 'inset 0 0 16px rgba(255,200,80,0.5), 0 0 0 4px rgba(255,255,255,0.55)' }}
              className={`relative flex items-center justify-center rounded-[1.5rem] border-[3px] border-dashed transition-[transform,background-color,border-color] ${size.slot} ${
                state === 'correct'
                  ? 'border-brand-500 bg-brand-100 shadow-[0_0_0_4px_rgba(22,162,134,0.25)]'
                  : aimed
                    ? 'scale-105 border-sky-500 bg-sky-100'
                    : canTake
                      ? 'border-sky-500 bg-sky-50'
                      : state === 'wrong'
                        ? 'border-sun-500 bg-sun-100'
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
