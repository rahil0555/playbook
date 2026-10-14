import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { usePlayLab } from '../../../app/PlayLabContext';
import { Button } from '../../../components/Button';
import { CelebrationEffect, useBurst } from '../../../components/CelebrationEffect';
import { FeedbackMessage } from '../../../components/FeedbackMessage';
import { PronunciationControl } from '../../../components/PronunciationControl';
import { useSpeech } from '../../../hooks/useAudio';
import type { Round } from '../../../hooks/useRound';
import { Illustration } from '../../../illustrations/Illustration';
import { letterColor } from '../../../lib/accents';
import { PRAISE, pickLine, TRY_AGAIN } from '../../../lib/messages';
import { springs } from '../../../motion/variants';
import type { WordEntry } from '../../../types/learning';
import { FlyingTile, type Flight } from '../../../moments/FlyingTile';
import { CompletionCreature, WordSplash } from './CompletionCreature';
import { useMoments } from '../../../moments/useMoments';
import { LikeButton } from '../../../components/LikeButton';
import { measureTile, LooseLetter } from './LooseLetter';
import { createRepeatGate, PHONICS_DELAY_MS, PHONICS_GAP_MS } from './magicFeel';
import type { Scheduled } from '../../../services/audioService';
import type { Pose } from '../../../moments/flightPath';
import { OutlineSlot } from './OutlineSlot';
import { StorybookCutscene } from './StorybookCutscene';
import { buildMagicTiles, emptyMagicSlots, isMagicDone, isTilePlaced, nextHint, slotFor, tryPlace, type MagicSlots, type MagicTile } from './magicBoard';

const colorOf = (letter: string) => letterColor(letter.charCodeAt(0));

/** One Magic Letters question. State resets per word (keyed by word id in the parent). */
export function MagicQuestion({ round, word }: { round: Round<WordEntry>; word: WordEntry }) {
  const { level, reducedMotion } = usePlayLab();
  const { speak, sfx, stop, loopPhonic } = useSpeech();
  const moments = useMoments();
  const { burst, fire, clear } = useBurst();
  const target = useMemo(() => word.text.split(''), [word.text]);

  const [tiles, setTiles] = useState<MagicTile[]>(() => buildMagicTiles(word.id, target, level));
  const [slots, setSlots] = useState<MagicSlots>(() => emptyMagicSlots(target.length));
  // The latest slots, updated the moment a letter is committed. Two letters typed or tapped in the same frame read this,
  // not the stale render's slots, so a second letter can never land on a slot the first one just filled.
  const slotsRef = useRef(slots);
  const commitSlots = (next: MagicSlots) => {
    slotsRef.current = next;
    setSlots(next);
  };
  const [selected, setSelected] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const [wobble, setWobble] = useState<Record<string, number>>({});
  const [missed, setMissed] = useState(false);
  const [announce, setAnnounce] = useState('');
  // Logic is judged the instant a letter is dropped; the visuals follow: a copy of the bubble flies to the
  // slot, and the slot only shows its own letter once that flight has landed.
  const [flights, setFlights] = useState<Flight[]>([]);
  const [landed, setLanded] = useState<ReadonlySet<number>>(() => new Set());
  const [grand, setGrand] = useState<number | null>(null);
  const landedRef = useRef(new Set<number>());
  const generation = useRef(0);
  const scene = useRef<HTMLDivElement>(null);
  const freshTimer = useRef<ReturnType<typeof setTimeout>>();
  const [phonicsGate] = useState(() => createRepeatGate(PHONICS_GAP_MS));
  /** tiles whose sound was already said when they were picked up: placing them does not say it again */
  const soundedTiles = useRef(new Set<string>());
  /** the most recent letter sound: the cheer waits for it to finish */
  const lastSound = useRef<Scheduled | null>(null);
  const [picks, setPicks] = useState(0);
  /** Pip's hop onto the word: a counter (each completion) and where the picture is, relative to the perch */
  const [creature, setCreature] = useState<{ n: number; from: { x: number; y: number } }>({ n: 0, from: { x: 0, y: -90 } });
  /** the completed word's gold finish, switched on when Pip lands (in turn, left to right) */
  const [celebrated, setCelebrated] = useState(false);
  /** a gold splash under the word, from the moment the last letter lands */
  const [splash, setSplash] = useState(0);
  /** the storybook cutscene for the finished word: it turns over a moment after Pip lands, and clears itself after a few seconds */
  const [story, setStory] = useState(false);
  const pictureRef = useRef<HTMLSpanElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const perchRef = useRef<HTMLSpanElement>(null);
  const stripRing = useAnimationControls();
  const animal = useAnimationControls();
  useEffect(
    () => () => {
      clearTimeout(freshTimer.current);
      generation.current += 1; // a cheer still waiting for its letter sound does not play after the question is gone
    },
    [],
  );

  useEffect(() => {
    if (!celebrated) return;
    const start = reducedMotion ? 0 : 1100;
    const open = setTimeout(() => setStory(true), start);
    const close = setTimeout(() => setStory(false), start + 4200);
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, [celebrated, reducedMotion]);

  const done = isMagicDone(slots);
  /** every letter is in place AND has finished landing: now the word is "complete" */
  const complete = done && landed.size === target.length;
  const hint = !done && round.attempts >= 2 ? nextHint(target, slots, tiles) : null;

  const miss = useCallback(
    (tile: MagicTile, slotIndex: number | null) => {
      sfx('oops');
      round.submit(`${tile.value}${slotIndex === null ? '' : `@${slotIndex + 1}`}`, word.text, false);
      setWobble((w) => ({ ...w, [tile.id]: (w[tile.id] ?? 0) + 1 }));
      setMissed(true);
      setSelected(null);
      setAnnounce(`${tile.value.toUpperCase()} doesn’t go there. Try another spot.`);
    },
    [round, sfx, word.text],
  );

  /** Pip's starting point: from the picture to the perch on the word (both measured now, before anything moves). */
  const launchOffset = (): { x: number; y: number } => {
    const pic = pictureRef.current?.getBoundingClientRect();
    const perch = perchRef.current?.getBoundingClientRect();
    if (!pic || !perch || !pic.width || !perch.width) return { x: 0, y: -90 };
    return { x: pic.left + pic.width / 2 - (perch.left + perch.width / 2), y: pic.top + pic.height / 2 - (perch.top + perch.height / 2) };
  };

  /**
   * Pip has landed on the word: one event. The letters take their gold finish, the strip shows a green ring, the
   * confetti bursts, and the fanfare plays now. The spoken cheer follows the fanfare's first note, not the whole fanfare,
   * so it is heard during the celebration. (Scheduled by Pip's hop in CompletionCreature.)
   */
  const onCreatureLand = useCallback(() => {
    setCelebrated(true);
    void stripRing.start({ opacity: [0, 0.95, 0], scale: [0.985, 1.015, 1.03], transition: { duration: 0.75, ease: 'easeOut' } });
    fire('burst', { x: 50, y: 30 });
    moments.celebrate();
    // the cheer waits for the last letter's sound to finish (or is said at once when there is none still playing)
    const round = generation.current;
    const lastDone: Promise<unknown> = lastSound.current?.done ?? Promise.resolve();
    void lastDone.then(() => {
      if (round === generation.current) moments.say(`Hooray! You spelled ${word.text}!`);
    });
  }, [fire, moments, stripRing, word.text]);

  /** A letter has arrived visually: show it in its slot, and on the last one start the completion (Pip's hop, then the landing). */
  const land = useCallback(
    (slotIndex: number, tileId: string) => {
      if (landedRef.current.has(slotIndex)) return;
      landedRef.current.add(slotIndex);
      setLanded(new Set(landedRef.current));
      const last = landedRef.current.size === target.length;
      setFresh(slotIndex);
      setGrand(last ? slotIndex : null);
      clearTimeout(freshTimer.current);
      freshTimer.current = setTimeout(() => setFresh(null), 1200);
      if (last) {
        // beat 1: the last letter lands, a gold splash spreads under the word and the picture gives a small shake as Pip
        // leaps off it. Beat 2 (about half a second later): Pip lands on the word and the landing happens (onCreatureLand).
        sfx('sparkle');
        setSplash((n) => n + 1);
        if (!reducedMotion) void animal.start({ rotate: [0, -7, 6, -3, 0], scale: [1, 1.06, 1], transition: { duration: 0.5, ease: 'easeOut' } });
        setCreature((c) => ({ n: c.n + 1, from: launchOffset() }));
      } else {
        sfx('chime');
      }
      // the letter's own sound for this word, after its chime; not said again if it was said when the tile was picked up
      const alreadySaid = soundedTiles.current.delete(tileId);
      const id = word.sounds[slotIndex];
      if (id && !alreadySaid && phonicsGate.allow(id)) lastSound.current = moments.sayPhonic(id);
    },
    [target.length, sfx, reducedMotion, animal, word.sounds, moments, phonicsGate],
  );

  const onFlightLand = useCallback(
    (f: Flight) => {
      if (f.generation === generation.current) land(f.slotIndex, f.id);
    },
    [land],
  );
  const onFlightDone = useCallback((f: Flight) => setFlights((all) => all.filter((x) => x.id !== f.id)), []);

  /** Where the bubble is now and where its slot is, relative to the scene; null when nothing can be measured. */
  const planFlight = (tile: MagicTile, slotIndex: number, pose: Pose | null): Flight | null => {
    // absolutely-positioned children are placed from the PADDING box (inside the board's wooden border)
    const el = scene.current;
    const rect = el?.getBoundingClientRect();
    const box = rect && el ? { left: rect.left + el.clientLeft, top: rect.top + el.clientTop } : null;
    const slotEl = scene.current?.querySelector(`[data-magic-slot="${slotIndex}"]`);
    const from = pose ?? measureTile(scene.current?.querySelector(`[data-magic-tile="${tile.id}"]`) ?? null);
    if (!box || !slotEl || !from) return null;
    const s = slotEl.getBoundingClientRect();
    if (!s.width) return null;
    return {
      id: tile.id,
      value: tile.value,
      color: colorOf(tile.value),
      slotIndex,
      generation: generation.current,
      from: { ...from, cx: from.cx - box.left, cy: from.cy - box.top },
      to: { x: s.left + s.width / 2 - box.left, y: s.top + s.height / 2 - box.top },
      face: 'monster',
    };
  };

  /** Judge one drop (drag, tap-tap, or typed letter). `pose` = where a dragged bubble was let go. */
  const attempt = useCallback(
    (tileId: string, slotIndex: number, pose: Pose | null = null) => {
      if (done) return;
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;
      const result = tryPlace(target, slotsRef.current, tiles, tileId, slotIndex);
      if (result.kind === 'placed') {
        commitSlots(result.slots);
        setSelected(null);
        setMissed(false);
        if (isMagicDone(result.slots)) round.submit(word.text, word.text, true);
        // the success message is itself a live region, so the status line never repeats "You spelled…"
        setAnnounce(`${tile.value.toUpperCase()} placed in slot ${slotIndex + 1}.`);
        const flight = reducedMotion ? null : planFlight(tile, slotIndex, pose);
        if (flight) setFlights((all) => [...all, flight]);
        else land(slotIndex, tileId); // reduced motion (or nothing to measure): appear in place, no travel
      } else if (result.kind === 'wrong') {
        miss(tile, slotIndex);
      } else if (result.kind === 'occupied') {
        setAnnounce(`Slot ${slotIndex + 1} is already filled.`);
        setSelected(null);
      }
    },
    [done, tiles, target, round, word.text, reducedMotion, land, miss],
  );

  const tapTile = (tileId: string) => {
    if (done) return;
    // the pop itself is played by the tile (LooseLetter); here the picked-up letter's phonics sound is spoken
    const t = tiles.find((x) => x.id === tileId);
    const picking = selected !== tileId;
    setSelected((s) => (s === tileId ? null : tileId));
    setPicks((n) => n + 1);
    if (picking && t) {
      // the sound this letter makes in THIS word: the spot it is heading for is the first empty one with that letter.
      // A decoy, a spare copy, or a silent letter has no sound here: picking it still stops the sound before it.
      const slot = slotFor(target, slotsRef.current, t.value);
      const id = slot !== null ? (word.sounds[slot] ?? null) : null;
      // a sound just said for this letter is not repeated (rapid taps)
      if (id === null || phonicsGate.allow(id)) {
        stop(); // a different sound (or silence) takes over from anything still being said or waiting
        if (id) {
          soundedTiles.current.add(tileId); // placing this tile will not say it again
          lastSound.current = moments.sayPhonic(id, PHONICS_DELAY_MS);
        }
      }
    }
    setAnnounce(picking ? `${t?.value.toUpperCase()} picked up. Now choose a spot.` : 'Put the letter down.');
  };
  /** tapping the picture wiggles it like a little toy: it never says the word, so it cannot give the answer away */
  const wiggleAnimal = () => {
    sfx('boing');
    if (!reducedMotion) {
      void animal.start({ rotate: [0, -10, 8, -6, 3, 0], scale: [1, 1.1, 0.94, 1.04, 1], transition: { duration: 0.6, ease: 'easeInOut' } });
    }
  };
  const tapSlot = (slotIndex: number) => {
    if (selected) attempt(selected, slotIndex);
    else setAnnounce('Pick up a letter first, then choose a spot.');
  };
  const dropTile = (tileId: string, slotIndex: number | null, pose: Pose | null) => {
    if (slotIndex === null) return; // dropped in empty space: it just springs back
    attempt(tileId, slotIndex, pose);
  };
  /** A letter held down repeats the sound it makes in this word, until it is let go (only one sound at a time). */
  const holdTile = (tileId: string) => {
    const t = tiles.find((x) => x.id === tileId);
    const slot = t ? slotFor(target, slotsRef.current, t.value) : null;
    const id = slot !== null ? (word.sounds[slot] ?? null) : null;
    stop();
    if (id) loopPhonic(id);
  };
  /** Let go: the repeating sound stops at once. A drop then says the letter's sound once, from the landing. */
  const releaseTile = () => stop();

  // Typing a letter places it in the first matching empty slot (keyboard / screen-reader friendly).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || done || !/^[a-z]$/i.test(e.key)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const value = e.key.toLowerCase();
      const now = slotsRef.current;
      const tile = tiles.find((x) => x.value === value && !isTilePlaced(now, x.id));
      if (!tile) return;
      const idx = slotFor(target, now, value);
      if (idx === null) miss(tile, null);
      else attempt(tile.id, idx);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tiles, target, done, attempt, miss]);

  const startAgain = () => {
    moments.cancelSpeech(); // a line still waiting to be said
    stop(); // and a line already being said (a cheer or a letter sound)
    soundedTiles.current.clear();
    lastSound.current = null;
    setCreature((c) => ({ n: 0, from: c.from })); // Pip goes back to the picture's side of the board
    setCelebrated(false);
    setStory(false);
    setSplash(0);
    stripRing.set({ opacity: 0 });
    generation.current += 1; // flights still in the air belong to the old round
    landedRef.current = new Set();
    setLanded(new Set());
    setFlights([]);
    setGrand(null);
    setTiles(buildMagicTiles(word.id, target, level));
    commitSlots(emptyMagicSlots(target.length));
    setSelected(null);
    setMissed(false);
    setFresh(null);
    setAnnounce('Fresh start. Letters shuffled.');
  };

  const nextSlot = slots.findIndex((x) => x === null);
  const mood = complete ? 'cheer' : missed ? 'oops' : selected ? 'think' : 'happy';

  return (
    <div ref={scene} className="pl-story-board relative overflow-clip rounded-[2.6rem] p-3 sm:p-6">
      <CelebrationEffect burst={burst} onDone={clear} />
      {flights.map((f) => (
        <FlyingTile key={`${f.generation}-${f.id}`} flight={f} onLand={onFlightLand} onDone={onFlightDone} />
      ))}
      <StorybookCutscene word={word} open={story} />

      <div className="relative grid items-center gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8">
        <div className="flex items-center gap-4 md:flex-col md:gap-3 md:text-center">
          <motion.span
            ref={pictureRef}
            initial={{ scale: 0.85, rotate: -4, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={springs.bouncy}
            className="pl-frame relative grid h-24 w-24 shrink-0 place-items-center rounded-[1.8rem] sm:h-32 sm:w-32 md:h-44 md:w-44 md:rounded-[2.2rem]"
          >
            <motion.button type="button" onClick={wiggleAnimal} animate={animal} aria-label={complete ? word.text : 'Picture clue. Tap to wiggle it'} className="grid h-full w-full place-items-center rounded-[1.6rem]">
              <Illustration name={word.illustration} className="h-[78%] w-[78%]" label={complete ? word.text : 'Picture clue'} />
            </motion.button>
            {/* decorative sparkles only: Pip now lands on the completed word, not on the picture */}
            <span aria-hidden="true" className="pl-twinkle absolute -right-3 -top-3 text-2xl text-sun-500">✦</span>
            <span aria-hidden="true" className="pl-twinkle absolute -bottom-2 -left-3 text-xl text-brand-400" style={{ animationDelay: '1.2s' }}>✦</span>
          </motion.span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1 md:items-center">
            <p data-magic-clue className="max-w-xs rounded-2xl bg-white/80 px-3 py-1.5 text-[1.02rem] leading-snug text-ink shadow-soft">{word.clue}</p>
            <PronunciationControl label="Hear the clue" accent="brand" onPlay={() => speak(word.clue)} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-4">
          {/* the target word: glowing outlines on a parchment strip */}
          <div ref={stripRef} role="group" aria-label="Word slots. Drop each letter on its outline" className="pl-story-strip pl-slot-row relative w-full rounded-[2rem] px-3 pb-4 pt-[4.25rem] sm:px-5 sm:pb-5 sm:pt-[5rem]" style={{ '--n': target.length } as CSSProperties}>
            {/* Pip's perch: a band above the letters that is always there, so nothing moves when the word is finished */}
            <CompletionCreature trigger={creature.n} from={creature.from} perchRef={perchRef} reducedMotion={reducedMotion} onLand={onCreatureLand} />
            {splash > 0 && !reducedMotion ? <WordSplash key={splash} /> : null}
            <motion.span aria-hidden="true" initial={{ opacity: 0 }} animate={stripRing} className="pointer-events-none absolute inset-0 rounded-[2rem] border-4 border-brand-500" />
            {target.map((letter, i) => (
              <OutlineSlot
                key={i}
                index={i}
                letter={letter}
                color={colorOf(letter)}
                landedId={slots[i] ?? null}
                landed={landed.has(i)}
                fresh={fresh === i}
                grand={grand === i}
                over={over === i}
                hinted={hint?.slotIndex === i}
                next={nextSlot === i && !done}
                done={celebrated}
                celebrated={celebrated}
                armed={selected !== null}
                onActivate={tapSlot}
              />
            ))}
          </div>

          {!complete ? (
            <ul aria-label="Loose letters" className="pl-story-tray flex w-full flex-wrap items-center justify-center gap-3 rounded-[1.9rem] px-3 py-4 sm:gap-4 sm:px-5">
              {tiles.map((tile, i) => (
                <li key={tile.id}>
                  {isTilePlaced(slots, tile.id) ? (
                    <span aria-hidden="true" className="block h-[4.4rem] w-[4.4rem] rounded-[1.8rem] bg-white/70 shadow-[inset_0_4px_8px_rgba(120,90,160,0.28)] sm:h-[5.8rem] sm:w-[5.8rem]" />
                  ) : (
                    <LooseLetter
                      tile={tile}
                      color={colorOf(tile.value)}
                      index={i}
                      selected={selected === tile.id}
                      hinted={hint?.tileId === tile.id}
                      disabled={done}
                      wobbleKey={wobble[tile.id] ?? 0}
                      onTap={tapTile}
                      onHover={setOver}
                      onDrop={dropTile}
                      onHoldStart={holdTile}
                      onHoldEnd={releaseTile}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          <p role="status" className="sr-only">
            {announce}
          </p>

          <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-end lg:gap-3">
            <div className="min-h-[6rem] min-w-0 flex-1">
              <AnimatePresence mode="wait">
                {complete ? (
                  <FeedbackMessage
                    key="ok"
                    tone="success"
                    title={`${pickLine(PRAISE, round.index)} Hooray!`}
                    action={{ label: round.index + 1 < round.total ? 'Next word' : 'Finish', onClick: round.next, icon: 'arrow-right' }}
                  >
                    You spelled <strong>{word.text}</strong>!
                  </FeedbackMessage>
                ) : missed ? (
                  <FeedbackMessage key="retry" tone="retry" nudge={round.attempts} title={pickLine(TRY_AGAIN, round.attempts)} action={{ label: 'Start this word again', onClick: startAgain, icon: 'refresh' }}>
                    That letter goes in a different spot. Try another!
                  </FeedbackMessage>
                ) : hint ? (
                  <FeedbackMessage key="hint" tone="hint" title="Need a hint?">
                    Look for the glowing spot and the letter with a star.
                  </FeedbackMessage>
                ) : selected ? (
                  <FeedbackMessage key="picked" tone="info" mood="think" nudge={picks} title="Nice pick!">
                    Now tap its glowing spot, or drag it there.
                  </FeedbackMessage>
                ) : (
                  <FeedbackMessage key="idle" tone="info" mood={mood} nudge={landed.size} title="Spell the word!">
                    Drag each letter onto its outline, or tap a letter and then tap a spot.
                  </FeedbackMessage>
                )}
              </AnimatePresence>
            </div>
            {!done ? (
              <Button variant="secondary" accent="brand" icon="refresh" onClick={startAgain} className="shrink-0 self-end sm:mb-1">
                Shuffle letters
              </Button>
            ) : complete ? (
              <LikeButton kind="word" id={word.id} label={word.text} className="shrink-0 self-end sm:mb-1" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
