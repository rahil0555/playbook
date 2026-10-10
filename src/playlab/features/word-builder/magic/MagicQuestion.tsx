import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
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
import type { WordEntry } from '../../../types/learning';
import { LooseLetter } from './LooseLetter';
import { OutlineSlot } from './OutlineSlot';
import { buildMagicTiles, emptyMagicSlots, isMagicDone, isTilePlaced, nextHint, slotFor, tryPlace, type MagicSlots, type MagicTile } from './magicBoard';

const colorOf = (letter: string) => letterColor(letter.charCodeAt(0));

/** One Magic Letters question. State resets per word (keyed by word id in the parent). */
export function MagicQuestion({ round, word }: { round: Round<WordEntry>; word: WordEntry }) {
  const { level } = usePlayLab();
  const { speak, sfx } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const target = useMemo(() => word.text.split(''), [word.text]);

  const [tiles, setTiles] = useState<MagicTile[]>(() => buildMagicTiles(word.id, target, level));
  const [slots, setSlots] = useState<MagicSlots>(() => emptyMagicSlots(target.length));
  const [selected, setSelected] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const [wobble, setWobble] = useState<Record<string, number>>({});
  const [missed, setMissed] = useState(false);
  const [announce, setAnnounce] = useState('');
  const freshTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(freshTimer.current), []);

  const done = isMagicDone(slots);
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

  /** Judge one drop (drag, tap-tap, or typed letter). */
  const attempt = useCallback(
    (tileId: string, slotIndex: number) => {
      if (done) return;
      const tile = tiles.find((t) => t.id === tileId);
      if (!tile) return;
      const result = tryPlace(target, slots, tiles, tileId, slotIndex);
      if (result.kind === 'placed') {
        setSlots(result.slots);
        setSelected(null);
        setMissed(false);
        setFresh(slotIndex);
        clearTimeout(freshTimer.current);
        freshTimer.current = setTimeout(() => setFresh(null), 1200);
        const finished = isMagicDone(result.slots);
        if (finished) {
          round.submit(word.text, word.text, true);
          fire('burst', { x: 50, y: 42 });
          sfx('correct');
          void speak(word.text);
          // the success message below is itself a live region; announcing the word here too would read it twice
          setAnnounce(`${tile.value.toUpperCase()} placed in slot ${slotIndex + 1}.`);
        } else {
          sfx('place');
          setAnnounce(`${tile.value.toUpperCase()} placed in slot ${slotIndex + 1}.`);
        }
      } else if (result.kind === 'wrong') {
        miss(tile, slotIndex);
      } else if (result.kind === 'occupied') {
        setAnnounce(`Slot ${slotIndex + 1} is already filled.`);
        setSelected(null);
      }
    },
    [done, tiles, target, slots, round, word.text, fire, sfx, speak, miss],
  );

  const tapTile = (tileId: string) => {
    if (done) return;
    sfx('tap');
    setSelected((s) => (s === tileId ? null : tileId));
    const t = tiles.find((x) => x.id === tileId);
    setAnnounce(selected === tileId ? 'Put the letter down.' : `${t?.value.toUpperCase()} picked up. Now choose a spot.`);
  };
  const tapSlot = (slotIndex: number) => {
    if (selected) attempt(selected, slotIndex);
    else setAnnounce('Pick up a letter first, then choose a spot.');
  };
  const dropTile = (tileId: string, slotIndex: number | null) => {
    if (slotIndex === null) return; // dropped in empty space: it just springs back
    attempt(tileId, slotIndex);
  };

  // Typing a letter places it in the first matching empty slot (keyboard / screen-reader friendly).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || done || !/^[a-z]$/i.test(e.key)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const value = e.key.toLowerCase();
      const tile = tiles.find((x) => x.value === value && !isTilePlaced(slots, x.id));
      if (!tile) return;
      const idx = slotFor(target, slots, value);
      if (idx === null) miss(tile, null);
      else attempt(tile.id, idx);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tiles, slots, target, done, attempt, miss]);

  const startAgain = () => {
    setTiles(buildMagicTiles(word.id, target, level));
    setSlots(emptyMagicSlots(target.length));
    setSelected(null);
    setMissed(false);
    setFresh(null);
    setAnnounce('Fresh start. Letters shuffled.');
  };

  return (
    <div className="relative overflow-hidden rounded-5xl bg-brand-50 p-4 shadow-soft sm:p-7">
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-100" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-sun-100" />
      <CelebrationEffect burst={burst} onDone={clear} />

      <div className="relative grid items-center gap-4 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
        <div className="flex items-center gap-4 md:flex-col md:gap-2 md:text-center">
          <span className="relative grid h-24 w-24 shrink-0 place-items-center rounded-[1.8rem] bg-white shadow-soft sm:h-32 sm:w-32 md:h-44 md:w-44 md:rounded-[2.4rem]">
            <Illustration name={word.illustration} className="h-[78%] w-[78%]" label={done ? word.text : 'Picture clue'} />
            <span aria-hidden="true" className="absolute -right-2 -top-2 text-2xl text-sun-500">✦</span>
            <span aria-hidden="true" className="absolute -bottom-1 -left-2 text-xl text-brand-400">✦</span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1 md:items-center">
            <p className="max-w-xs text-[1.02rem] leading-snug text-ink-soft">{word.clue}</p>
            <PronunciationControl label="Hear the clue" accent="brand" onPlay={() => speak(word.clue)} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-5">
        <LayoutGroup>
          <div role="group" aria-label="Word slots. Drop each letter on its outline" className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {target.map((letter, i) => (
              <OutlineSlot
                key={i}
                index={i}
                letter={letter}
                color={colorOf(letter)}
                landedId={slots[i] ?? null}
                fresh={fresh === i}
                over={over === i}
                hinted={hint?.slotIndex === i}
                done={done}
                armed={selected !== null}
                onActivate={tapSlot}
              />
            ))}
          </div>

          {!done ? (
            <ul aria-label="Loose letters" className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {tiles.map((tile, i) => (
                <li key={tile.id}>
                  {isTilePlaced(slots, tile.id) ? (
                    <span aria-hidden="true" className="block h-[4.4rem] w-[4.4rem] rounded-[1.6rem] bg-black/[0.045] sm:h-[5.4rem] sm:w-[5.4rem]" />
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
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </LayoutGroup>

        <p role="status" className="sr-only">
          {announce}
        </p>

        <div className="min-h-[5.5rem] w-full max-w-xl">
          <AnimatePresence mode="wait">
            {done ? (
              <FeedbackMessage
                key="ok"
                tone="success"
                title={pickLine(PRAISE, round.index)}
                action={{ label: round.index + 1 < round.total ? 'Next word' : 'Finish', onClick: round.next, icon: 'arrow-right' }}
              >
                You spelled <strong>{word.text}</strong>!
              </FeedbackMessage>
            ) : missed ? (
              <FeedbackMessage key="retry" tone="retry" title={pickLine(TRY_AGAIN, round.attempts)} action={{ label: 'Start this word again', onClick: startAgain, icon: 'refresh' }}>
                That letter goes in a different spot. Try another!
              </FeedbackMessage>
            ) : hint ? (
              <FeedbackMessage key="hint" tone="hint" title="Need a hint?">
                Look for the glowing spot and the letter with a star.
              </FeedbackMessage>
            ) : (
              <p key="idle" className="text-center text-[0.98rem] text-ink-soft">
                Drag each letter onto its outline, or tap a letter and then tap a spot.
              </p>
            )}
          </AnimatePresence>
        </div>
        {!done ? (
          <Button variant="ghost" accent="brand" icon="refresh" onClick={startAgain} className="-mt-2">
            Shuffle letters
          </Button>
        ) : null}
        </div>
      </div>
    </div>
  );
}
