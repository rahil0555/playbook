import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { usePlayLab } from '../../app/PlayLabContext';
import { Button } from '../../components/Button';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { PronunciationControl } from '../../components/PronunciationControl';
import { TileBoard } from '../../components/TileBoard';
import { useSpeech } from '../../hooks/useAudio';
import type { Round } from '../../hooks/useRound';
import { Illustration } from '../../illustrations/Illustration';
import { showGuideLetters } from '../../lib/level';
import { PRAISE, pickLine, TRY_AGAIN } from '../../lib/messages';
import {
  clearSlots, emptySlots, filledCount, hintTile, isComplete, isCorrect, makeTiles, placeTile, removeTile,
  scramble, slotStates, slotValues, type SlotState, type Slots, type Tile,
} from '../../lib/tiles';
import { correctVariants, incorrectVariants } from '../../motion/variants';
import type { WordEntry } from '../../types/learning';

type Status = 'building' | 'wrong' | 'solved';

const upper = (v: string) => v.toUpperCase();

/** One word-building question: picture, tiles, slots, check, feedback. State resets for each word (keyed by word id). */
export function WordQuestion({ round, word }: { round: Round<WordEntry>; word: WordEntry }) {
  const { level } = usePlayLab();
  const { speak, sfx } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const controls = useAnimationControls();
  const target = useMemo(() => word.text.split(''), [word.text]);
  const [tiles] = useState<Tile[]>(() => scramble(makeTiles(word.id, target)));
  const [slots, setSlots] = useState<Slots>(() => emptySlots(target.length));
  const [status, setStatus] = useState<Status>('building');
  const [states, setStates] = useState<SlotState[] | undefined>(undefined);
  const solved = status === 'solved';
  const complete = isComplete(slots);

  const touched = useCallback(() => {
    // any change after a "not quite" clears the old marks
    setStatus((s) => (s === 'wrong' ? 'building' : s));
    setStates(undefined);
  }, []);

  const place = useCallback(
    (tileId: string, slotIndex?: number) => {
      if (solved) return;
      sfx('place');
      setSlots((s) => placeTile(s, tileId, slotIndex));
      touched();
    },
    [solved, sfx, touched],
  );
  const remove = useCallback(
    (tileId: string) => {
      if (solved) return;
      sfx('tap');
      setSlots((s) => removeTile(s, tileId));
      touched();
    },
    [solved, sfx, touched],
  );
  const clearAll = () => {
    if (solved) return;
    setSlots((s) => clearSlots(s));
    touched();
  };

  const check = useCallback(() => {
    // Incomplete answers can never be submitted, whatever triggered this (button, Enter key, double tap).
    if (solved || !isComplete(slots)) return;
    const attempt = slotValues(slots, tiles).join('');
    const ok = isCorrect(slots, tiles, target);
    round.submit(attempt, word.text, ok);
    if (ok) {
      setStatus('solved');
      setStates(slotStates(slots, tiles, target));
      fire('burst', { x: 50, y: 40 });
      sfx('correct');
      void controls.start('correct');
      void speak(word.text);
    } else {
      setStatus('wrong');
      setStates(slotStates(slots, tiles, target));
      sfx('oops');
      void controls.start('incorrect');
    }
  }, [solved, slots, tiles, target, round, word.text, fire, sfx, controls, speak]);

  const retry = () => {
    // keep what is already right, send the rest back to the tray
    setSlots((s) => s.map((id, i) => (states?.[i] === 'correct' ? id : null)));
    setStatus('building');
    setStates(undefined);
  };

  // Typing a letter places a matching tile; Backspace takes the last one back; Enter checks (when no button has focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || solved) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (/^[a-z]$/i.test(e.key)) {
        const tile = tiles.find((x) => x.value === e.key.toLowerCase() && !slots.includes(x.id));
        if (tile) place(tile.id);
      } else if (e.key === 'Backspace') {
        const last = [...slots].reverse().find((id) => id !== null);
        if (last) remove(last);
      } else if (e.key === 'Enter' && t?.tagName !== 'BUTTON') {
        check();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tiles, slots, solved, place, remove, check]);

  // Gentle hint after two unsuccessful checks.
  const hint = !solved && round.attempts >= 2 ? hintTile(slots, tiles, target) : null;
  const hintText = hint ? (hint.slotIndex === 0 ? `The word starts with “${target[0]?.toUpperCase()}”.` : `Look for the letter “${(target[hint.slotIndex] ?? '').toUpperCase()}” for slot ${hint.slotIndex + 1}.`) : null;

  return (
    <div className="relative grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] md:gap-8">
      <CelebrationEffect burst={burst} onDone={clear} />

      <section aria-label="Clue" className="flex flex-col items-center gap-3 self-start rounded-5xl bg-white p-5 text-center shadow-soft">
        <span className="grid aspect-square w-full max-w-[13rem] place-items-center rounded-4xl bg-cream">
          <Illustration name={word.illustration} className="h-[78%] w-[78%]" label={solved ? word.text : 'Picture clue'} />
        </span>
        <p className="text-[1.05rem] leading-snug text-ink-soft">{word.clue}</p>
        <PronunciationControl label="Hear the clue" accent="brand" onPlay={() => speak(`${word.clue}`)} />
      </section>

      <section aria-label="Build the word" className="flex flex-col justify-between gap-5 rounded-5xl bg-white p-5 shadow-soft sm:p-7">
        <div>
          <h2 className="text-center font-display text-2xl font-bold">
            {solved ? (
              <span>
                {word.text.slice(0, 1).toUpperCase()}
                {word.text.slice(1)}!
              </span>
            ) : (
              `Spell the word (${target.length} letters)`
            )}
          </h2>
          <motion.div variants={{ ...incorrectVariants, ...correctVariants }} animate={controls} initial="idle" className="mt-5">
            <TileBoard
              tiles={tiles}
              slots={slots}
              onPlace={place}
              onRemove={remove}
              slotStates={states}
              guide={showGuideLetters(level) ? target : undefined}
              hintTileId={hint?.tileId ?? null}
              locked={solved}
              kind="letter"
              format={upper}
              noun="letter"
            />
          </motion.div>
        </div>

        {!solved ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" accent="brand" icon="undo" onClick={clearAll} disabled={filledCount(slots) === 0}>
              Clear
            </Button>
            <Button variant="primary" accent="brand" size="lg" icon="check" onClick={check} disabled={!complete} aria-describedby="pl-check-help">
              Check my word
            </Button>
            <span id="pl-check-help" className="sr-only">
              {complete ? 'All slots are filled. You can check your word.' : 'Fill every slot to check your word.'}
            </span>
          </div>
        ) : null}

        <div className="min-h-[5.5rem]">
          <AnimatePresence mode="wait">
            {solved ? (
              <FeedbackMessage
                key="ok"
                tone="success"
                title={pickLine(PRAISE, round.index)}
                action={{ label: round.index + 1 < round.total ? 'Next word' : 'Finish', onClick: round.next, icon: 'arrow-right' }}
              >
                You spelled <strong>{word.text}</strong>!
              </FeedbackMessage>
            ) : status === 'wrong' ? (
              <FeedbackMessage key="wrong" tone="retry" title={pickLine(TRY_AGAIN, round.attempts)} action={{ label: 'Try again', onClick: retry, icon: 'refresh' }}>
                The green squares are in the right place. Swap the others.
              </FeedbackMessage>
            ) : hintText ? (
              <FeedbackMessage key="hint" tone="hint" title="Need a hint?">
                {hintText}
              </FeedbackMessage>
            ) : null}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
