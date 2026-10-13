import { useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayLab } from '../../app/PlayLabContext';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { PronunciationControl } from '../../components/PronunciationControl';
import { RoundSummary } from '../../components/RoundSummary';
import { useSpeech } from '../../hooks/useAudio';
import { FlyingTile, type Flight } from '../../moments/FlyingTile';
import { measurePose } from '../../moments/flightPath';
import { StarBurst } from '../../moments/StarBurst';
import { useMoments } from '../../moments/useMoments';
import { useRound, type Round } from '../../hooks/useRound';
import { Illustration } from '../../illustrations/Illustration';
import { letterColor } from '../../lib/accents';
import { choiceCount, filterByLevel, ROUND_LENGTH } from '../../lib/level';
import { PRAISE, pickLine, TRY_AGAIN } from '../../lib/messages';
import { buildBlankQuestion, type BlankQuestion } from '../../lib/questions';
import { pickFresh } from '../../lib/random';
import { correctVariants, incorrectVariants, springs } from '../../motion/variants';

function Question({ round, q }: { round: Round<BlankQuestion>; q: BlankQuestion }) {
  const { speak, sfx } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const { reducedMotion } = usePlayLab();
  const moments = useMoments();
  /** the chosen letter travels from its button to its blank; the blank only shows it once it has landed */
  const scene = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [landed, setLanded] = useState(false);
  const [celebration, setCelebration] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const word = q.word.text;

  /** the letter has arrived: the word is finished, so a brief, bigger celebration and the word read aloud after it */
  const landOnBlank = () => {
    setLanded(true);
    fire('burst', { x: 50, y: 30 });
    setCelebration((n) => n + 1);
    moments.celebrateThenSay(word); // the fanfare, then the word read aloud once it has finished
  };

  /** from the chosen letter's button to the blank, measured in the question's own box */
  const planFlight = (letter: string): Flight | null => {
    const box = scene.current;
    const from = measurePose(box?.querySelector(`[data-choice="${letter}"]`) ?? null);
    const blank = box?.querySelector<HTMLElement>('[data-blank]') ?? null;
    if (!box || !blank || !from) return null;
    const target = blank.getBoundingClientRect();
    if (!target.width) return null;
    const origin = box.getBoundingClientRect();
    const ox = origin.left + box.clientLeft;
    const oy = origin.top + box.clientTop;
    return {
      id: `missing-${q.word.id}`,
      value: letter,
      color: letterColor(letter.charCodeAt(0)),
      slotIndex: 0,
      generation: 0,
      from: { ...from, cx: from.cx - ox, cy: from.cy - oy },
      to: { x: target.left + target.width / 2 - ox, y: target.top + target.height / 2 - oy },
    };
  };

  const choose = (letter: string) => {
    if (round.solved || flight || wrong.includes(letter)) return;
    const ok = letter === q.answer;
    round.submit(letter, q.answer, ok);
    if (ok) {
      setShowRetry(false);
      moments.pop();
      const f = reducedMotion ? null : planFlight(letter);
      if (f) setFlight(f);
      else landOnBlank();
    } else {
      sfx('oops');
      setWrong((w) => [...w, letter]);
      setFlash(letter);
      setShowRetry(true);
      setTimeout(() => setFlash(null), 600);
    }
  };

  return (
    <div ref={scene} className="relative mx-auto max-w-2xl space-y-4">
      <CelebrationEffect burst={burst} onDone={clear} />
      {flight ? <FlyingTile flight={flight} onLand={() => landOnBlank()} onDone={() => setFlight(null)} /> : null}
      <section className="pl-board flex flex-col items-center gap-4 rounded-[2.4rem] p-4 text-center sm:p-6">
        <span className="pl-frame grid h-32 w-32 place-items-center rounded-[2rem] sm:h-40 sm:w-40">
          <Illustration name={q.word.illustration} className="h-[78%] w-[78%]" label={landed ? word : 'Picture clue'} />
        </span>
        <motion.p
          variants={{ ...incorrectVariants, ...correctVariants }}
          animate={round.solved ? 'correct' : 'idle'}
          role="img"
          aria-label={landed ? word : `Word with a missing letter: ${word.split('').map((c, i) => (i === q.blankIndex ? 'blank' : c)).join(' ')}`}
          className="pl-paper flex items-center justify-center gap-2 rounded-[2rem] px-4 py-4 font-display text-5xl font-bold uppercase sm:gap-3 sm:text-6xl"
        >
          {word.split('').map((c, i) =>
            i === q.blankIndex ? (
              <span
                key={landed ? 'landed' : 'blank'}
                data-blank="true"
                aria-hidden="true"
                className={`relative grid h-16 w-14 place-items-center rounded-[1.4rem] border-[3px] sm:h-20 sm:w-16 ${
                  landed ? 'pl-gem border-transparent' : 'border-dashed border-amber-400 bg-white/80 shadow-[inset_0_0_16px_rgba(255,200,80,0.55),0_0_0_4px_rgba(255,255,255,0.55)]'
                }`}
                style={landed ? ({ '--gem': letterColor(c.charCodeAt(0)) } as CSSProperties) : undefined}
              >
                {landed ? (
                  <motion.span initial={reducedMotion ? false : { scale: 0.5 }} animate={{ scale: 1 }} transition={springs.bouncy} className="block">
                    {c}
                  </motion.span>
                ) : null}
                {landed && celebration > 0 && !reducedMotion ? <StarBurst key={celebration} seed={celebration} count={14} spread={84} /> : null}
              </span>
            ) : (
              <span key={i} aria-hidden="true" className="pl-gem-soft grid h-16 w-14 place-items-center rounded-[1.4rem] sm:h-20 sm:w-16" style={{ '--gem': letterColor(c.charCodeAt(0)), color: letterColor(c.charCodeAt(0)) } as CSSProperties}>
                {c}
              </span>
            ),
          )}
        </motion.p>
        <PronunciationControl label="Hear the clue" accent="plum" onPlay={() => speak(q.word.clue)} />
      </section>

      <ul aria-label="Letter choices" className="pl-wood flex flex-wrap justify-center gap-3 rounded-[1.9rem] px-3 py-4 sm:gap-4 sm:px-5">
        {q.choices.map((c) => {
          const isWrong = wrong.includes(c);
          return (
            <li key={c}>
              <motion.button
                type="button"
                data-choice={c}
                disabled={round.solved}
                aria-label={isWrong ? `${c.toUpperCase()}, not this one` : c.toUpperCase()}
                animate={flash === c ? { x: [0, -9, 8, -6, 4, 0] } : { x: 0 }}
                transition={flash === c ? { duration: 0.45 } : springs.snappy}
                whileTap={isWrong || round.solved ? undefined : { scale: 0.92 }}
                whileHover={isWrong || round.solved ? undefined : { y: -3 }}
                onClick={() => choose(c)}
                className={`h-[5rem] w-[5rem] rounded-[1.8rem] font-display text-6xl font-bold uppercase leading-none sm:h-[6.2rem] sm:w-[6.2rem] ${isWrong ? 'border-[3px] border-dashed border-white/50 bg-black/15 text-white/80 opacity-70' : 'pl-gem'}`}
                style={isWrong ? undefined : ({ '--gem': letterColor(c.charCodeAt(0)) } as CSSProperties)}
              >
                {c}
              </motion.button>
            </li>
          );
        })}
      </ul>

      <div className="min-h-[6rem]">
        <AnimatePresence mode="wait">
          {landed ? (
            <FeedbackMessage
              key="ok"
              tone="success"
              title={`${pickLine(PRAISE, round.index)} Hooray!`}
              action={{ label: round.index + 1 < round.total ? 'Next word' : 'Finish', onClick: round.next, icon: 'arrow-right' }}
            >
              <strong>{word}</strong> needs the letter <strong>{q.answer.toUpperCase()}</strong>.
            </FeedbackMessage>
          ) : showRetry ? (
            <FeedbackMessage key="retry" tone="retry" nudge={wrong.length} title={pickLine(TRY_AGAIN, wrong.length)} action={{ label: 'Try again', onClick: () => { setWrong([]); setShowRetry(false); }, icon: 'refresh' }}>
              Say the word out loud and listen for the missing sound.
            </FeedbackMessage>
          ) : (
            <FeedbackMessage key="idle" tone="info" title="Which letter is missing?">
              Look at the picture, say the word, and pick the letter that fits.
            </FeedbackMessage>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function WordCompletion({ onPickGame }: { onPickGame: () => void }) {
  const { content, level } = usePlayLab();
  const seen = useRef(new Set<string>());
  const round = useRound<BlankQuestion>(
    'matching',
    () => {
      const picks = pickFresh(filterByLevel(content.words, level), ROUND_LENGTH, seen.current);
      picks.forEach((p) => seen.current.add(p.id));
      return picks.map((w) => buildBlankQuestion(w, Math.random, choiceCount(level)));
    },
    'word-completion',
  );

  if (round.summary) return <RoundSummary completion={round.summary} onPlayAgain={round.restart} extra={{ label: 'Pick another game', onClick: onPickGame }} />;
  if (!round.current) return null;
  return (
    <div className="space-y-4">
      <div className="flex justify-center"><ProgressIndicator done={round.solvedCount} total={round.total} currentIndex={round.index} accent="plum" noun="Word" /></div>
      <Question key={round.current.id} round={round} q={round.current} />
    </div>
  );
}
