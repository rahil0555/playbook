import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { usePlayLab } from '../../../app/PlayLabContext';
import { Button } from '../../../components/Button';
import { CelebrationEffect, useBurst } from '../../../components/CelebrationEffect';
import { FeedbackMessage } from '../../../components/FeedbackMessage';
import { PronunciationControl } from '../../../components/PronunciationControl';
import { useSpeech } from '../../../hooks/useAudio';
import type { Round } from '../../../hooks/useRound';
import { Illustration } from '../../../illustrations/Illustration';
import { PRAISE, pickLine, TRY_AGAIN } from '../../../lib/messages';
import { springs } from '../../../motion/variants';
import type { WordEntry } from '../../../types/learning';
import { FlyingTile, type Flight } from '../../../moments/FlyingTile';
import { CompletionCreature, WordSplash } from './CompletionCreature';
import { useMoments } from '../../../moments/useMoments';
import { measureTile, LooseLetter, TILE_BOX, tilesPerRow } from './LooseLetter';
import { createRepeatGate, PHONICS_DELAY_MS, PHONICS_GAP_MS } from './magicFeel';
import type { Scheduled } from '../../../services/audioService';
import type { Pose } from '../../../moments/flightPath';
import { OutlineSlot } from './OutlineSlot';
import { VoiceAnswer } from '../../../components/VoiceAnswer';
import { VoicePractice } from '../../../components/VoicePractice';
import { StorySentence, type StoryStage } from '../../story/StorySentence';
import { TennisScene } from '../../story/TennisScene';
import { letterTileColor } from '../../../components/LetterTile';
import { evaluateVoiceAnswer, normalizeAnswer } from '../../../services/speechInput/evaluate';
import type { RecognizedResult } from '../../../services/speechInput/recognizer';
import { StorybookCutscene } from './StorybookCutscene';
import { buildMagicTiles, emptyMagicSlots, isRightAt, isSpelled, isTilePlaced, misplacedSlots, moveTile, nextHint, slotFor, type MagicSlots, type MagicTile } from './magicBoard';

/** the gap between the letters of a word spelled by voice: each one flies in on its own */
const VOICE_LETTER_GAP_MS = 380;

/** One Magic Letters question. State resets per word (keyed by word id in the parent). */
/** `storyStage` is set on the read-along story: the sentence replaces the picture, and it carries the word's hint. */
export function MagicQuestion({ round, word, storyStage }: { round: Round<WordEntry>; word: WordEntry; storyStage?: StoryStage }) {
  // every letter has its own tile colour, the same on every screen (see letterTileColor in components/LetterTile)
  const colorOf = (letter: string) => letterTileColor(letter);
  const { content, level, reducedMotion, audio } = usePlayLab();
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
  /** a letter is in the wrong spot (or a typed letter did not fit): the child is told, gently, and can move it */
  const [missed, setMissed] = useState(false);
  /** feedback for a spoken answer: `counted` when it was judged (a wrong word is an attempt); otherwise the child is asked to say it again */
  const [voiceNote, setVoiceNote] = useState<{ text: string; counted: boolean } | null>(null);
  const [announce, setAnnounce] = useState('');
  // Logic is judged the instant a letter is dropped; the visuals follow: a copy of the bubble flies to the
  // slot, and the slot only shows its own letter once that flight has landed.
  const [flights, setFlights] = useState<Flight[]>([]);
  const [landed, setLanded] = useState<ReadonlySet<number>>(() => new Set());
  const [grand, setGrand] = useState<number | null>(null);
  const landedRef = useRef(new Set<number>());
  /** spots a flying letter is on its way to: nothing else is dropped there until that letter has landed */
  const inFlight = useRef(new Set<number>());
  const generation = useRef(0);
  const scene = useRef<HTMLDivElement>(null);
  const freshTimer = useRef<ReturnType<typeof setTimeout>>();
  const voiceTimer = useRef<ReturnType<typeof setTimeout>>();
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
  /** the spoken cheer for the finished word: the celebration waits for it (see the effect on `celebrated`) */
  const cheered = useRef<PromiseLike<unknown> | null>(null);
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
      clearTimeout(voiceTimer.current);
      generation.current += 1; // a cheer still waiting for its letter sound does not play after the question is gone
    },
    [],
  );

  useEffect(() => {
    if (!celebrated) return;
    const start = reducedMotion ? 0 : 400;
    const open = setTimeout(() => setStory(true), start);
    const close = setTimeout(() => setStory(false), start + 4200);
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, [celebrated, reducedMotion]);

  // The word's celebration starts when Pip has landed on it, and the next word comes once the cheer has been said (useRound).
  useEffect(() => {
    if (celebrated) round.celebrate(cheered.current);
    // runs once per landing: `round` is stable for this question
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrated]);

  /** the word is spelled: every spot holds its own letter (a wrong board is never spelled) */
  const done = isSpelled(target, slots, tiles);
  /** spelled AND every letter has finished landing: now the word is "complete" */
  const complete = done && landed.size === target.length;
  /** the spots that hold a letter that does not belong there yet */
  const misplaced = misplacedSlots(target, slots, tiles);
  const hint = !done && round.attempts >= 2 ? nextHint(target, slots, tiles) : null;
  /** a finished story word plays the tennis reward once: the counter moves when the word becomes complete, not on every render */
  const storyActive = storyStage !== undefined;
  const [tennisRun, setTennisRun] = useState(0);
  useEffect(() => {
    if (storyActive && complete) setTennisRun((n) => n + 1);
  }, [complete, storyActive]);

  /** A typed letter that fits nowhere: it is not placed, the child is told, and it wobbles. */
  const miss = useCallback(
    (tile: MagicTile) => {
      sfx('oops');
      round.submit(`${tile.value}`, word.text, false);
      setWobble((w) => ({ ...w, [tile.id]: (w[tile.id] ?? 0) + 1 }));
      setMissed(true);
      setVoiceNote(null);
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
   * The word is spelled and its last letter has landed: one event. Pip hops on, the letters take their gold finish, the strip shows
   * a green ring, the confetti bursts, and the fanfare plays now. The spoken cheer follows the fanfare's first note, not the whole
   * fanfare, so it is heard during the celebration. (Scheduled by Pip's hop in CompletionCreature.)
   */
  const onCreatureLand = useCallback(() => {
    setCelebrated(true);
    void stripRing.start({ opacity: [0, 0.95, 0], scale: [0.985, 1.015, 1.03], transition: { duration: 0.75, ease: 'easeOut' } });
    fire('burst', { x: 50, y: 30 });
    moments.celebrate();
    // the cheer waits for the last letter's sound to finish (or is said at once when there is none still playing)
    const gen = generation.current;
    const lastDone: Promise<unknown> = lastSound.current?.done ?? Promise.resolve();
    cheered.current = lastDone.then(() => (gen === generation.current ? moments.say(`Hooray! You spelled ${word.text}!`).done : undefined));
  }, [fire, moments, stripRing, word.text]);

  /** the last letter has landed: a gold splash, a small shake of the picture, and Pip leaps off it toward the word */
  const finishWord = (slotIndex: number) => {
    sfx('sparkle');
    setSplash((n) => n + 1);
    setGrand(slotIndex);
    if (!reducedMotion) void animal.start({ rotate: [0, -7, 6, -3, 0], scale: [1, 1.06, 1], transition: { duration: 0.5, ease: 'easeOut' } });
    setCreature((c) => ({ n: c.n + 1, from: launchOffset() }));
  };

  /**
   * A letter has arrived in a spot. A right letter gets its chime and its own sound, and when it completes the word, the completion
   * starts (Pip's hop, then the landing). A wrong letter is simply there, to be moved: no chime, no sound.
   */
  const land = (slotIndex: number, tileId: string) => {
    inFlight.current.delete(slotIndex);
    if (landedRef.current.has(slotIndex)) return;
    landedRef.current.add(slotIndex);
    setLanded(new Set(landedRef.current));
    setFresh(slotIndex);
    clearTimeout(freshTimer.current);
    freshTimer.current = setTimeout(() => setFresh(null), 1200);
    // a letter already said when its tile was picked up is not said again
    const alreadySaid = soundedTiles.current.delete(tileId);
    const value = tiles.find((t) => t.id === tileId)?.value;
    if (value !== target[slotIndex]) return;
    if (isSpelled(target, slotsRef.current, tiles) && landedRef.current.size === target.length) finishWord(slotIndex);
    else sfx('chime');
    // the letter's own sound for this word, after its chime
    const id = word.sounds[slotIndex];
    if (id && !alreadySaid && phonicsGate.allow(id)) lastSound.current = moments.sayPhonic(id);
  };

  const onFlightLand = (f: Flight) => {
    if (f.generation === generation.current) land(f.slotIndex, f.id);
  };
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
    };
  };

  /**
   * Put a letter on a spot: a letter from the tray (dragged, tapped, or spelled by voice), or a letter already on the board that is
   * moved or swapped. `pose` = where a dragged letter was let go. Every drop is judged at once: a letter in the wrong spot stays
   * there, and it can be moved on from there.
   */
  const attempt = (tileId: string, slotIndex: number, pose: Pose | null = null) => {
    if (done) return;
    const tile = tiles.find((t) => t.id === tileId);
    if (!tile) return;
    if (inFlight.current.has(slotIndex)) {
      setAnnounce(`Wait for the letter to land in slot ${slotIndex + 1}.`);
      return;
    }
    const result = moveTile(target, slotsRef.current, tiles, tileId, slotIndex);
    if (result.kind === 'locked') {
      setAnnounce(`Slot ${slotIndex + 1} already has its letter.`);
      return;
    }
    if (result.kind !== 'moved') return;
    const right = tile.value === target[slotIndex];
    const next = result.slots;
    commitSlots(next);
    setSelected(null);
    setVoiceNote(null);
    setMissed(misplacedSlots(target, next, tiles).length > 0);
    if (right) {
      setAnnounce(`${tile.value.toUpperCase()} placed in slot ${slotIndex + 1}.`);
    } else {
      sfx('oops');
      round.submit(`${tile.value}@${slotIndex + 1}`, word.text, false);
      setWobble((w) => ({ ...w, [tile.id]: (w[tile.id] ?? 0) + 1 }));
      setAnnounce(`${tile.value.toUpperCase()} doesn’t go in slot ${slotIndex + 1}. Move it to another spot.`);
    }
    if (isSpelled(target, next, tiles)) round.submit(word.text, word.text, true);

    if (result.from !== null) {
      // a letter moved by hand is there at once: it does not fly. The spot it left is empty, unless a letter was swapped into it.
      if (next[result.from] === null) landedRef.current.delete(result.from);
      setLanded(new Set(landedRef.current));
      landedRef.current.delete(slotIndex);
      land(slotIndex, tileId);
      return;
    }
    // a letter from the tray flies to its spot (or appears at once with reduced motion, or when nothing can be measured). A letter
    // it replaces has gone back to the tray, so the spot is empty until the new letter lands.
    landedRef.current.delete(slotIndex);
    setLanded(new Set(landedRef.current));
    const flight = reducedMotion ? null : planFlight(tile, slotIndex, pose);
    if (flight) {
      inFlight.current.add(slotIndex);
      setFlights((all) => [...all, flight]);
    } else land(slotIndex, tileId);
  };

  /** A letter in the tray: picked up (with its sound), or, with another letter picked up, that letter goes to its spot. */
  const tapTile = (tileId: string) => {
    if (done) return;
    const at = slotsRef.current.indexOf(tileId);
    if (at >= 0) {
      // a letter already on the board: with another letter picked up, that one goes to this spot (a swap, or a replacement)
      if (selected !== null && selected !== tileId) {
        tapSlot(at);
        return;
      }
      if (isRightAt(target, slotsRef.current, tiles, at)) {
        setAnnounce('That letter is already in the right spot.');
        return;
      }
      const picking = selected !== tileId;
      setSelected(picking ? tileId : null);
      setVoiceNote(null);
      setPicks((n) => n + 1);
      setAnnounce(picking ? `${tiles.find((t) => t.id === tileId)?.value.toUpperCase()} picked up. Now choose a spot.` : 'Put the letter down.');
      return;
    }
    // the pop itself is played by the tile (LooseLetter); here the picked-up letter's phonics sound is spoken
    const t = tiles.find((x) => x.id === tileId);
    const picking = selected !== tileId;
    setSelected((s) => (s === tileId ? null : tileId));
    setVoiceNote(null);
    setPicks((n) => n + 1);
    if (picking && t) {
      // the sound this letter makes in THIS word: the spot it is heading for is the first empty one with that letter.
      // A decoy, a spare copy, or a silent letter has no sound here: picking it still stops the sound before it.
      const slot = slotFor(target, slotsRef.current, tiles, t.value);
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
  /** a spot is tapped: the letter picked up goes there (a move, a swap, or a replacement) */
  const tapSlot = (slotIndex: number) => {
    if (isRightAt(target, slotsRef.current, tiles, slotIndex)) setAnnounce(`Slot ${slotIndex + 1} already has its letter.`);
    else if (selected) attempt(selected, slotIndex);
    else setAnnounce('Pick up a letter first, then choose a spot.');
  };
  const dropTile = (tileId: string, slotIndex: number | null, pose: Pose | null) => {
    if (slotIndex === null) {
      // dropped in empty space: a letter that was in a spot goes back to the tray; a letter from the tray springs back
      if (isTilePlaced(slotsRef.current, tileId)) takeBack(tileId);
      return;
    }
    attempt(tileId, slotIndex, pose);
  };
  /** a letter dragged out of its spot and let go in empty space goes back to the tray; its spot is empty again */
  const takeBack = (tileId: string) => {
    const at = slotsRef.current.indexOf(tileId);
    if (at < 0) return;
    const next = slotsRef.current.map((id) => (id === tileId ? null : id));
    landedRef.current.delete(at);
    setLanded(new Set(landedRef.current));
    commitSlots(next);
    setSelected(null);
    setMissed(misplacedSlots(target, next, tiles).length > 0);
    setAnnounce(`${tiles.find((t) => t.id === tileId)?.value.toUpperCase()} is back in the tray.`);
  };
  /** A letter held down repeats the sound it makes in this word, until it is let go (only one sound at a time). */
  const holdTile = (tileId: string) => {
    const t = tiles.find((x) => x.id === tileId);
    const slot = t ? slotFor(target, slotsRef.current, tiles, t.value) : null;
    const id = slot !== null ? (word.sounds[slot] ?? null) : null;
    stop();
    if (id) loopPhonic(id);
  };
  /** Let go: the repeating sound stops at once. A drop then says the letter's sound once, from the landing. */
  const releaseTile = () => stop();

  /** the latest drop judgement, for the letters a spoken answer places one after another (a timer must not see an old one) */
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  /**
   * A correct spoken word is spelled the way a child would spell it: one letter after another, each through the same judgement
   * as a tap or a drag. The spot that is not right yet is the one filled next; a letter still flying there is waited for.
   */
  const spellByVoice = () => {
    const step = () => {
      const now = nextHint(target, slotsRef.current, tiles);
      if (!now) return;
      if (!inFlight.current.has(now.slotIndex)) attemptRef.current(now.tileId, now.slotIndex);
      voiceTimer.current = setTimeout(step, VOICE_LETTER_GAP_MS);
    };
    clearTimeout(voiceTimer.current);
    step();
  };

  /**
   * A spoken answer is judged by the rules for a typed letter: a correct word is spelled out, a wrong one is an attempt with the
   * retry feedback. A transcript too unsure to judge uses no attempt: the child is asked to say it again.
   */
  const heardSpeech = (result: RecognizedResult) => {
    if (done || round.solved) return;
    const verdict = evaluateVoiceAnswer(result.transcript, [word.text], result.confidence);
    if (verdict.result === 'retry') {
      setVoiceNote({ text: verdict.feedback, counted: false });
      return;
    }
    const response = normalizeAnswer(result.transcript);
    setSelected(null);
    setMissed(false);
    if (verdict.result === 'correct') {
      setVoiceNote(null);
      round.submit(response, word.text, true);
      setAnnounce('You said it. Spelling the word now.');
      spellByVoice();
      return;
    }
    sfx('oops');
    round.submit(response, word.text, false);
    setVoiceNote({ text: verdict.feedback, counted: true });
  };

  // Typing a letter puts it in the first spot that needs it (keyboard / screen-reader friendly), exactly as a drop would: a
  // wrong letter there is replaced. A copy of the letter already on the board in a wrong spot is moved from there.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || done || !/^[a-z]$/i.test(e.key)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const value = e.key.toLowerCase();
      const now = slotsRef.current;
      const spot = slotFor(target, now, tiles, value);
      const tile =
        tiles.find((x) => x.value === value && !isTilePlaced(now, x.id)) ??
        (spot === null ? undefined : tiles.find((x) => x.value === value && !isRightAt(target, now, tiles, now.indexOf(x.id))));
      if (!tile) return;
      if (spot === null) miss(tile);
      else attempt(tile.id, spot);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tiles, target, done, attempt, miss]);

  const startAgain = () => {
    moments.cancelSpeech(); // a line still waiting to be said
    stop(); // and a line already being said (a cheer or a letter sound)
    soundedTiles.current.clear();
    lastSound.current = null;
    clearTimeout(voiceTimer.current); // letters of a word spelled by voice that are still on their way
    setVoiceNote(null);
    setCreature((c) => ({ n: 0, from: c.from })); // Pip goes back to the picture's side of the board
    setCelebrated(false);
    setStory(false);
    setSplash(0);
    stripRing.set({ opacity: 0 });
    generation.current += 1; // flights still in the air belong to the old round
    landedRef.current = new Set();
    inFlight.current.clear();
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
  const selectedOnBoard = selected !== null && isTilePlaced(slots, selected);
  const mood = complete ? 'cheer' : missed ? 'oops' : selected ? 'think' : 'happy';

  return (
    <div ref={scene} className={`${storyStage ? 'pl-story-stage' : 'pl-story-board'} relative overflow-clip rounded-[2.6rem] p-2 sm:p-6`}>
      <CelebrationEffect burst={burst} onDone={clear} />
      {flights.map((f) => (
        <FlyingTile key={`${f.generation}-${f.id}`} flight={f} onLand={onFlightLand} onDone={onFlightDone} />
      ))}
      {storyStage ? null : <StorybookCutscene word={word} open={story} />}

      <div className={storyStage ? 'relative grid items-center gap-2 sm:gap-4' : 'relative grid items-center gap-2 sm:gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8'}>
        {storyStage ? null : (
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
        )}

        <div className="flex min-w-0 flex-col items-center gap-2 sm:gap-4">
          {storyStage ? (
            <StorySentence
              sentence={storyStage.sentence}
              targets={storyStage.targets}
              spelled={storyStage.spelled}
              hint={storyStage.hint}
              target={word.text}
              complete={complete}
            />
          ) : null}
          {/* the target word: glowing outlines on a parchment strip (on the story screen, a plain outline on the lavender screen) */}
          <div ref={stripRef} role="group" aria-label="Word slots. Drop each letter on its outline" className={`pl-story-strip pl-slot-row relative w-full rounded-[2rem] px-3 pb-3 pt-[4.25rem] sm:px-5 sm:pb-5 sm:pt-[5rem]${storyStage ? ' pl-story-strip--stage' : ''}`} style={{ '--n': target.length } as CSSProperties}>
            {/* Pip's perch: a band above the letters that is always there, so nothing moves when the word is finished */}
            <CompletionCreature trigger={creature.n} from={creature.from} perchRef={perchRef} reducedMotion={reducedMotion} onLand={onCreatureLand} />
            {storyStage && tennisRun > 0 ? <TennisScene key={`tennis-${tennisRun}`} reducedMotion={reducedMotion} /> : null}
            {splash > 0 && !reducedMotion ? <WordSplash key={splash} /> : null}
            <motion.span aria-hidden="true" initial={{ opacity: 0 }} animate={stripRing} className="pointer-events-none absolute inset-0 rounded-[2rem] border-4 border-brand-500" />
            {target.map((letter, i) => {
              const placed = slots[i] ? (tiles.find((t) => t.id === slots[i]) ?? null) : null;
              const wrongHere = placed !== null && placed.value !== letter && landed.has(i);
              return (
                <OutlineSlot
                  key={i}
                  index={i}
                  letter={letter}
                  color={colorOf(letter)}
                  placed={placed}
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
                >
                  {/* a letter in the wrong spot is the letter itself: it can be dragged to another spot, or tapped and moved */}
                  {wrongHere && placed ? (
                    <LooseLetter
                      key={placed.id}
                      tile={placed}
                      color={colorOf(placed.value)}
                      index={i}
                      fill
                      selected={selected === placed.id}
                      hinted={hint?.tileId === placed.id}
                      disabled={done}
                      wobbleKey={wobble[placed.id] ?? 0}
                      onTap={tapTile}
                      onHover={setOver}
                      onDrop={dropTile}
                      onHoldStart={holdTile}
                      onHoldEnd={releaseTile}
                    />
                  ) : null}
                </OutlineSlot>
              );
            })}
          </div>

          {/* phones: the tiles in even rows of at most four (the tray's padding holds each row to its width), so the tray and the outlines fit on one screen */}
          {!complete ? (
            <ul aria-label="Loose letters" className="pl-story-tray flex w-full flex-wrap items-center justify-center gap-2 rounded-[1.9rem] py-2 sm:gap-4 sm:py-4" style={{ '--per-row': tilesPerRow(tiles.length) } as CSSProperties}>
              {tiles.map((tile, i) => (
                <li key={tile.id}>
                  {isTilePlaced(slots, tile.id) ? (
                    <span aria-hidden="true" className={`block rounded-[1.8rem] bg-white/70 shadow-[inset_0_4px_8px_rgba(120,90,160,0.28)] ${TILE_BOX}`} />
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
              {/* one message at a time: each is replaced at once (a new one never waits for the old one to leave) */}
              {complete ? (
                <FeedbackMessage key="ok" tone="success" title={`${pickLine(PRAISE, round.index)} Hooray!`}>
                  You spelled <strong>{word.text}</strong>! On to the next one…
                </FeedbackMessage>
              ) : missed && !done ? (
                <FeedbackMessage key="retry" tone="retry" nudge={round.attempts} title={pickLine(TRY_AGAIN, round.attempts)}>
                  {misplaced.length > 0 ? 'That letter isn’t in the right spot yet. Drag it to another spot, or tap it and then tap a spot.' : 'That letter doesn’t go there. Try another!'}
                </FeedbackMessage>
              ) : voiceNote ? (
                voiceNote.counted ? (
                  <FeedbackMessage key="voice-retry" tone="retry" nudge={round.attempts} title={pickLine(TRY_AGAIN, round.attempts)}>
                    {voiceNote.text}
                  </FeedbackMessage>
                ) : (
                  <FeedbackMessage key="voice-again" tone="retry" nudge={round.attempts} title="Let’s hear it again">
                    {voiceNote.text}
                  </FeedbackMessage>
                )
              ) : hint ? (
                <FeedbackMessage key="hint" tone="hint" title="Need a hint?">
                  Look for the glowing spot and the letter with a star.
                </FeedbackMessage>
              ) : selected ? (
                <FeedbackMessage key="picked" tone="info" mood="think" nudge={picks} title="Nice pick!">
                  {selectedOnBoard ? 'Now tap another spot to move it there, or tap it again to put it down.' : 'Now tap its glowing spot, or drag it there.'}
                </FeedbackMessage>
              ) : (
                <FeedbackMessage key="idle" tone="info" mood={mood} nudge={landed.size} title="Spell the word!">
                  Drag each letter onto its outline, or tap a letter and then tap a spot.
                </FeedbackMessage>
              )}
            </div>
            {!done ? (
              <Button variant="secondary" accent="brand" icon="refresh" onClick={startAgain} className="shrink-0 self-end sm:mb-1">
                Shuffle letters
              </Button>
            ) : null}
          </div>
          {/* the same answer, spoken: judged by heardSpeech with the rules for a typed letter. It sits below the feedback, so the
              feedback keeps its place on a desktop; not offered once the word is spelled. */}
          {!done ? <VoiceAnswer language={content.language} solved={round.solved} onTranscript={heardSpeech} audio={audio} /> : null}
          {/* after the word is finished the child can say it too; "Next word" above is always there, so skipping costs nothing */}
          {complete && !storyStage ? <VoicePractice expected={[word.text]} prompt="Say the word for the picture" /> : null}
        </div>
      </div>
    </div>
  );
}
