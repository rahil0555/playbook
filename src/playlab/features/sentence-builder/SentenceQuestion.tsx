import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Button } from '../../components/Button';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { PronunciationControl } from '../../components/PronunciationControl';
import { TileBoard } from '../../components/TileBoard';
import { useSpeech } from '../../hooks/useAudio';
import type { Round } from '../../hooks/useRound';
import { Illustration } from '../../illustrations/Illustration';
import { elementUnder } from '../../lib/dom';
import { PRAISE, pickLine, TRY_AGAIN } from '../../lib/messages';
import { shuffle } from '../../lib/random';
import {
  clearSlots, emptySlots, filledCount, isComplete, isCorrect, makeTiles, placeTile, removeTile,
  scramble, slotStates, slotValues, type SlotState, type Slots, type Tile,
} from '../../lib/tiles';
import { correctVariants, incorrectVariants, springs, wave } from '../../motion/variants';
import type { SentenceEntry } from '../../types/learning';

type Status = 'building' | 'wrong' | 'solved';

const fullText = (s: SentenceEntry) => `${s.words.join(' ')}${s.punctuation}`;

/** Finished sentence: each word hops in turn (a small "wave"), a positive completion moment. */
function SolvedSentence({ sentence }: { sentence: SentenceEntry }) {
  return (
    <motion.p initial="idle" animate="go" role="img" aria-label={fullText(sentence)} className="flex flex-wrap items-baseline justify-center gap-x-3 font-display text-3xl font-bold text-brand-800 sm:text-4xl">
      {sentence.words.map((w, i) => (
        <motion.span key={i} custom={i} variants={wave} aria-hidden="true">
          {w}
        </motion.span>
      ))}
      <span aria-hidden="true">{sentence.punctuation}</span>
    </motion.p>
  );
}

export function SentenceQuestion({ round, sentence }: { round: Round<SentenceEntry>; sentence: SentenceEntry }) {
  const { speak, sfx } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const controls = useAnimationControls();
  const [status, setStatus] = useState<Status>('building');
  const solved = status === 'solved';
  const text = fullText(sentence);

  const succeed = useCallback(() => {
    setStatus('solved');
    fire('burst', { x: 50, y: 40 });
    sfx('correct');
    void controls.start('correct');
    void speak(text);
  }, [controls, fire, sfx, speak, text]);

  const fail = useCallback(() => {
    sfx('oops');
    void controls.start('incorrect');
  }, [controls, sfx]);

  return (
    <div className="relative grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] md:gap-8">
      <CelebrationEffect burst={burst} onDone={clear} />
      <section aria-label="Picture" className="flex flex-col items-center gap-3 self-start rounded-5xl bg-white p-5 text-center shadow-soft">
        <span className="grid aspect-square w-full max-w-[12rem] place-items-center rounded-4xl bg-cream">
          <Illustration name={sentence.illustration} className="h-[78%] w-[78%]" />
        </span>
        <PronunciationControl label="Read it to me" accent="sun" onPlay={() => speak(sentence.mode === 'fill' && !solved ? `${sentence.words.slice(0, sentence.blankIndex).join(' ')}... what? ${sentence.words.slice((sentence.blankIndex ?? 0) + 1).join(' ')}` : text)} />
      </section>

      <section aria-label="Build the sentence" className="flex flex-col gap-5 rounded-5xl bg-white p-5 shadow-soft sm:p-7">
        {sentence.mode === 'fill' ? (
          <FillQuestion sentence={sentence} round={round} solved={solved} onSolved={succeed} onWrong={fail} controls={controls} />
        ) : (
          <ArrangeQuestion sentence={sentence} round={round} solved={solved} status={status} setStatus={setStatus} onSolved={succeed} onWrong={fail} controls={controls} />
        )}
        <div className="min-h-[5.5rem]">
          <AnimatePresence mode="wait">
            {solved ? (
              <FeedbackMessage
                key="ok"
                tone="success"
                title={pickLine(PRAISE, round.index)}
                action={{ label: round.index + 1 < round.total ? 'Next sentence' : 'Finish', onClick: round.next, icon: 'arrow-right' }}
              >
                You made a whole sentence!
              </FeedbackMessage>
            ) : null}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

/* ----------------------------- arrange the words ----------------------------- */

interface SubProps {
  sentence: SentenceEntry;
  round: Round<SentenceEntry>;
  solved: boolean;
  onSolved: () => void;
  onWrong: () => void;
  controls: ReturnType<typeof useAnimationControls>;
}

function ArrangeQuestion({ sentence, round, solved, status, setStatus, onSolved, onWrong, controls }: SubProps & { status: Status; setStatus: (s: Status) => void }) {
  const { sfx } = useSpeech();
  const target = sentence.words;
  const [tiles] = useState<Tile[]>(() => scramble(makeTiles(sentence.id, target)));
  const [slots, setSlots] = useState<Slots>(() => emptySlots(target.length));
  const [states, setStates] = useState<SlotState[] | undefined>(undefined);
  const complete = isComplete(slots);

  const touched = () => {
    if (status === 'wrong') setStatus('building');
    setStates(undefined);
  };
  const place = (id: string, i?: number) => {
    if (solved) return;
    sfx('place');
    setSlots((s) => placeTile(s, id, i));
    touched();
  };
  const remove = (id: string) => {
    if (solved) return;
    sfx('tap');
    setSlots((s) => removeTile(s, id));
    touched();
  };
  const check = () => {
    if (solved || !isComplete(slots)) return;
    const ok = isCorrect(slots, tiles, target);
    round.submit(slotValues(slots, tiles).join(' '), target.join(' '), ok);
    setStates(slotStates(slots, tiles, target));
    if (ok) onSolved();
    else {
      setStatus('wrong');
      onWrong();
    }
  };
  const retry = () => {
    setSlots((s) => s.map((id, i) => (states?.[i] === 'correct' ? id : null)));
    setStatus('building');
    setStates(undefined);
  };

  if (solved) return <SolvedSentence sentence={sentence} />;

  return (
    <>
      <h2 className="text-center font-display text-2xl font-bold">Make the sentence</h2>
      <motion.div variants={{ ...incorrectVariants, ...correctVariants }} animate={controls} initial="idle">
        <TileBoard
          tiles={tiles}
          slots={slots}
          onPlace={place}
          onRemove={remove}
          slotStates={states}
          kind="word"
          noun="word"
          trailing={<span role="img" aria-label={sentence.punctuation === '.' ? 'full stop' : sentence.punctuation} className="px-1 font-display text-4xl font-bold text-ink-soft">{sentence.punctuation}</span>}
        />
      </motion.div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" accent="sun" icon="undo" onClick={() => { setSlots((s) => clearSlots(s)); touched(); }} disabled={filledCount(slots) === 0}>
          Clear
        </Button>
        <Button variant="primary" accent="sun" size="lg" icon="check" onClick={check} disabled={!complete}>
          Check my sentence
        </Button>
      </div>
      <AnimatePresence mode="wait">
        {status === 'wrong' ? (
          <FeedbackMessage key="wrong" tone="retry" title={pickLine(TRY_AGAIN, round.attempts)} action={{ label: 'Try again', onClick: retry, icon: 'refresh' }}>
            Green words are in the right place. Move the others.
          </FeedbackMessage>
        ) : round.attempts >= 2 ? (
          <FeedbackMessage key="hint" tone="hint" title="Need a hint?">
            The sentence starts with “{target[0]}”.
          </FeedbackMessage>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------ fill the missing word ------------------------------ */

function FillQuestion({ sentence, round, solved, onSolved, onWrong, controls }: SubProps) {
  const { sfx } = useSpeech();
  const blank = sentence.blankIndex ?? 0;
  const answer = sentence.words[blank] as string;
  const options = useMemo(() => shuffle([answer, ...(sentence.distractors ?? [])]), [answer, sentence.distractors]);
  const [wrongOptions, setWrongOptions] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const dragging = useRef(false);

  const choose = (option: string) => {
    if (solved || wrongOptions.includes(option)) return;
    const ok = option === answer;
    round.submit(option, answer, ok);
    if (ok) {
      onSolved();
    } else {
      setWrongOptions((w) => [...w, option]);
      setFlash(option);
      setShowRetry(true);
      onWrong();
      setTimeout(() => setFlash(null), 600);
    }
  };

  if (solved) return <SolvedSentence sentence={sentence} />;

  return (
    <>
      <h2 className="text-center font-display text-2xl font-bold">Finish the sentence</h2>
      <motion.p
        variants={{ ...incorrectVariants, ...correctVariants }}
        animate={controls}
        initial="idle"
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-display text-3xl font-bold sm:text-4xl"
      >
        {sentence.words.map((w, i) =>
          i === blank ? (
            <span key={i} data-blank="true" role="img" aria-label="missing word" className="inline-block h-14 min-w-[6.5rem] rounded-3xl border-[3px] border-dashed border-sun-500 bg-sun-100 align-middle sm:h-16" />
          ) : (
            <span key={i}>{w}</span>
          ),
        )}
        <span>{sentence.punctuation}</span>
      </motion.p>

      <ul aria-label="Word choices" className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {options.map((o) => {
          const isWrong = wrongOptions.includes(o);
          return (
            <li key={o}>
              <motion.button
                type="button"
                data-option={o}
                disabled={isWrong}
                aria-label={isWrong ? `${o}, not this one` : o}
                drag={!isWrong}
                dragSnapToOrigin
                dragMomentum={false}
                dragElastic={0.18}
                whileDrag={{ scale: 1.12, zIndex: 50 }}
                whileTap={{ scale: 0.93 }}
                animate={flash === o ? { x: [0, -9, 8, -6, 4, 0] } : { x: 0 }}
                transition={flash === o ? { duration: 0.45 } : springs.snappy}
                onDragEnd={(_, info) => {
                  if (elementUnder(info, '[data-blank]')) choose(o);
                  setTimeout(() => (dragging.current = false), 0);
                }}
                onDragStart={() => (dragging.current = true)}
                onClick={() => {
                  if (dragging.current) return;
                  sfx('place');
                  choose(o);
                }}
                className={`pl-draggable pl-chunk min-h-[3.75rem] rounded-3xl border-2 px-6 font-display text-2xl font-bold sm:min-h-[4.25rem] sm:text-3xl ${isWrong ? 'border-dashed border-black/15 bg-black/5 text-ink-soft opacity-60' : 'border-black/10 bg-white'}`}
              >
                {o}
              </motion.button>
            </li>
          );
        })}
      </ul>
      <AnimatePresence mode="wait">
        {showRetry ? (
          <FeedbackMessage
            key="retry"
            tone="retry"
            title={pickLine(TRY_AGAIN, wrongOptions.length)}
            action={{ label: 'Try again', onClick: () => { setWrongOptions([]); setShowRetry(false); }, icon: 'refresh' }}
          >
            Read the sentence again and pick another word.
          </FeedbackMessage>
        ) : null}
      </AnimatePresence>
    </>
  );
}
