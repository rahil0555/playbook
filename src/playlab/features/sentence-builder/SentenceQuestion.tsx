import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Button } from '../../components/Button';
import { StoryBook } from '../../components/StoryBook';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { PronunciationControl } from '../../components/PronunciationControl';
import { TileBoard } from '../../components/TileBoard';
import { KeyWordReward, type Reward } from '../../moments/KeyWordReward';
import { useMoments } from '../../moments/useMoments';
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

/** The word a finished sentence highlights: the word that was missing, or the longest word (the first if tied). */
export const keyWordOf = (s: SentenceEntry): string => {
  if (s.mode === 'fill') return s.words[s.blankIndex ?? 0] ?? s.words[0] ?? '';
  return s.words.reduce((best, w) => (w.length > best.length ? w : best), s.words[0] ?? '');
};
const REWARD_COLOURS = ['#e8573f', '#16a286', '#2f8fd8', '#8a5cc7', '#d9741c'] as const;

const GEMS = ['#e8573f', '#16a286', '#2f8fd8', '#8a5cc7', '#d9741c'] as const;

/** Finished sentence: each word is a glossy tile that hops in turn (a small "wave"). */
function SolvedSentence({ sentence }: { sentence: SentenceEntry }) {
  return (
    <div className="flex flex-col items-center gap-4">
    <motion.p initial="idle" animate="go" role="img" aria-label={fullText(sentence)} className="pl-paper flex flex-wrap items-center justify-center gap-2.5 rounded-[2rem] px-3 py-5 font-display sm:gap-3.5">
      {sentence.words.map((w, i) => (
        <motion.span
          key={i}
          custom={i}
          variants={wave}
          aria-hidden="true"
          className="pl-gem rounded-[1.5rem] px-5 py-2 text-[1.7rem] font-bold leading-tight sm:px-6 sm:text-[2.1rem]"
          style={{ '--gem': GEMS[i % GEMS.length] } as CSSProperties}
        >
          {w}
        </motion.span>
      ))}
      <span aria-hidden="true" className="font-display text-4xl font-bold text-brand-800">{sentence.punctuation}</span>
    </motion.p>
    </div>
  );
}

export function SentenceQuestion({ round, sentence }: { round: Round<SentenceEntry>; sentence: SentenceEntry }) {
  const { speak, sfx } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const controls = useAnimationControls();
  const [status, setStatus] = useState<Status>('building');
  const solved = status === 'solved';
  const text = fullText(sentence);

  /** the key word, shown big for a moment over the picture (only words the child can already see) */
  const [reward, setReward] = useState<Reward | null>(null);
  const moments = useMoments();

  const succeed = useCallback(() => {
    setStatus('solved');
    fire('burst', { x: 50, y: 40 });
    setReward((r) => ({ id: (r?.id ?? 0) + 1, word: keyWordOf(sentence), color: REWARD_COLOURS[sentence.words.length % REWARD_COLOURS.length] as string }));
    void controls.start('correct');
    moments.celebrateThenSay(text); // the fanfare first, then the sentence read aloud once it has finished
  }, [controls, fire, moments, sentence, text]);

  const fail = useCallback(() => {
    sfx('oops');
    void controls.start('incorrect');
  }, [controls, sfx]);

  return (
    <div className="pl-board relative rounded-[2.4rem] p-3 sm:p-6">
      <CelebrationEffect burst={burst} onDone={clear} />
      <div className="relative grid items-center gap-5 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8">
        <section aria-label="Picture" className="relative flex flex-col items-center gap-3 text-center">
          <KeyWordReward reward={reward} className="rounded-5xl" />
          <StoryBook className="w-full max-w-[13rem]">
            <span className="grid aspect-square w-full place-items-center">
              <Illustration name={sentence.illustration} className="h-[78%] w-[78%]" />
            </span>
          </StoryBook>
          <PronunciationControl label="Read it to me" accent="sun" onPlay={() => speak(sentence.mode === 'fill' && !solved ? `${sentence.words.slice(0, sentence.blankIndex).join(' ')}... what? ${sentence.words.slice((sentence.blankIndex ?? 0) + 1).join(' ')}` : text)} />
        </section>

        <section aria-label="Build the sentence" className="flex min-w-0 flex-col gap-4">
          {sentence.mode === 'fill' ? (
            <FillQuestion sentence={sentence} round={round} solved={solved} onSolved={succeed} onWrong={fail} controls={controls} />
          ) : (
            <ArrangeQuestion sentence={sentence} round={round} solved={solved} status={status} setStatus={setStatus} onSolved={succeed} onWrong={fail} controls={controls} />
          )}
          <div>
            <AnimatePresence mode="wait">
              {solved ? (
                <FeedbackMessage
                  key="ok"
                  tone="success"
                  title={`${pickLine(PRAISE, round.index)} Hooray!`}
                  action={{ label: round.index + 1 < round.total ? 'Next sentence' : 'Finish', onClick: round.next, icon: 'arrow-right' }}
                >
                  You made a whole sentence!
                </FeedbackMessage>
              ) : null}
            </AnimatePresence>
          </div>
        </section>
      </div>
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
    // the slot was chosen when the tile was picked up: if another word has taken it since, use the first free slot
    // instead of overwriting that word (the sound and the glide are the tile board's)
    setSlots((s) => placeTile(s, id, i !== undefined && (s[i] === null || s[i] === id) ? i : undefined));
    touched();
  };
  const remove = (id: string) => {
    if (solved) return;
    sfx('tap');
    setSlots((s) => removeTile(s, id));
    touched();
  };
  /** the sentence is judged the moment its last word is in place: a right order is celebrated, a wrong one is shown at once */
  const judge = () => {
    if (solved) return;
    const ok = isCorrect(slots, tiles, target);
    round.submit(slotValues(slots, tiles).join(' '), target.join(' '), ok);
    setStates(slotStates(slots, tiles, target));
    if (ok) onSolved();
    else {
      setStatus('wrong');
      onWrong();
    }
  };
  // runs once per completion: it fires when the slots go from incomplete to complete, not on every render (judge reads
  // the slots of the render in which the sentence became complete)
  useEffect(() => {
    if (complete) judge();
  }, [complete]);
  const retry = () => {
    setSlots((s) => s.map((id, i) => (states?.[i] === 'correct' ? id : null)));
    setStatus('building');
    setStates(undefined);
  };

  if (solved) return <SolvedSentence sentence={sentence} />;

  return (
    <>
      <h2 className="pl-wood mx-auto w-fit rounded-full px-6 py-1 text-center font-display text-xl font-bold sm:text-2xl">Make the sentence</h2>
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
        ) : (
          <FeedbackMessage key="idle" tone="info" nudge={filledCount(slots)} title="Let’s build it!">
            Tap the words in order, or drag them into the glowing spots.
          </FeedbackMessage>
        )}
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

  /** every option this question has already answered: a double tap is one answer, never two */
  const answered = useRef(new Set<string>());
  const choose = (option: string) => {
    if (solved || wrongOptions.includes(option) || answered.current.has(option)) return;
    answered.current.add(option);
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
      <h2 className="pl-wood mx-auto w-fit rounded-full px-6 py-1 text-center font-display text-xl font-bold sm:text-2xl">Finish the sentence</h2>
      <motion.p
        variants={{ ...incorrectVariants, ...correctVariants }}
        animate={controls}
        initial="idle"
        className="pl-paper flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-[2rem] px-4 py-5 font-display text-3xl font-bold text-ink sm:text-4xl"
      >
        {sentence.words.map((w, i) =>
          i === blank ? (
            <span key={i} data-blank="true" role="img" aria-label="missing word"  className="inline-block h-14 min-w-[6.5rem] rounded-[1.5rem] border-[3px] border-dashed border-amber-400 bg-white/80 align-middle shadow-[inset_0_0_16px_rgba(255,200,80,0.55),0_0_0_4px_rgba(255,255,255,0.55)] sm:h-16" />
          ) : (
            <span key={i}>{w}</span>
          ),
        )}
        <span>{sentence.punctuation}</span>
      </motion.p>

      <ul aria-label="Word choices" className="pl-wood flex flex-wrap items-center justify-center gap-3 rounded-[1.9rem] px-3 py-4 sm:gap-4 sm:px-5">
        {options.map((o, oi) => {
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
                style={isWrong ? undefined : ({ '--gem': GEMS[oi % GEMS.length] } as CSSProperties)}
                className={`pl-draggable min-h-[3.75rem] rounded-[1.5rem] px-6 font-display text-2xl font-bold sm:min-h-[4.5rem] sm:text-3xl ${isWrong ? 'border-[3px] border-dashed border-white/50 bg-black/15 text-white/80 opacity-70' : 'pl-gem'}`}
              >
                {o}
              </motion.button>
            </li>
          );
        })}
      </ul>
      <AnimatePresence>
        {showRetry ? (
          <FeedbackMessage
            key="retry"
            tone="retry"
            title={pickLine(TRY_AGAIN, wrongOptions.length)}
            action={{ label: 'Try again', onClick: () => { setWrongOptions([]); setShowRetry(false); }, icon: 'refresh' }}
          >
            Read the sentence again and pick another word.
          </FeedbackMessage>
        ) : (
          <FeedbackMessage key="idle" tone="info" title="Which word fits?">
            Read the sentence, then tap or drag the word that finishes it.
          </FeedbackMessage>
        )}
      </AnimatePresence>
    </>
  );
}
