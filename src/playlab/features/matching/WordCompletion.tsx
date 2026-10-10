import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayLab } from '../../app/PlayLabContext';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { PronunciationControl } from '../../components/PronunciationControl';
import { RoundSummary } from '../../components/RoundSummary';
import { useSpeech } from '../../hooks/useAudio';
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
  const [wrong, setWrong] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const word = q.word.text;

  const choose = (letter: string) => {
    if (round.solved || wrong.includes(letter)) return;
    const ok = letter === q.answer;
    round.submit(letter, q.answer, ok);
    if (ok) {
      fire('burst', { x: 50, y: 30 });
      sfx('correct');
      setShowRetry(false);
      void speak(word);
    } else {
      sfx('oops');
      setWrong((w) => [...w, letter]);
      setFlash(letter);
      setShowRetry(true);
      setTimeout(() => setFlash(null), 600);
    }
  };

  return (
    <div className="relative mx-auto max-w-2xl space-y-5">
      <CelebrationEffect burst={burst} onDone={clear} />
      <section className="flex flex-col items-center gap-4 rounded-5xl bg-white p-5 text-center shadow-soft sm:p-7">
        <span className="grid h-36 w-36 place-items-center rounded-4xl bg-cream sm:h-44 sm:w-44">
          <Illustration name={q.word.illustration} className="h-28 w-28 sm:h-36 sm:w-36" label={round.solved ? word : 'Picture clue'} />
        </span>
        <motion.p
          variants={{ ...incorrectVariants, ...correctVariants }}
          animate={round.solved ? 'correct' : 'idle'}
          role="img"
          aria-label={round.solved ? word : `Word with a missing letter: ${word.split('').map((c, i) => (i === q.blankIndex ? 'blank' : c)).join(' ')}`}
          className="flex items-center justify-center gap-2 font-display text-5xl font-bold uppercase sm:text-6xl"
        >
          {word.split('').map((c, i) =>
            i === q.blankIndex ? (
              <span
                key={i}
                aria-hidden="true"
                className={`grid h-16 w-14 place-items-center rounded-2xl border-[3px] sm:h-20 sm:w-16 ${round.solved ? 'border-brand-500 bg-brand-100 text-brand-800' : 'border-dashed border-sun-500 bg-sun-100'}`}
              >
                {round.solved ? c : ''}
              </span>
            ) : (
              <span key={i} aria-hidden="true">
                {c}
              </span>
            ),
          )}
        </motion.p>
        <PronunciationControl label="Hear the clue" accent="plum" onPlay={() => speak(q.word.clue)} />
      </section>

      <ul aria-label="Letter choices" className="flex flex-wrap justify-center gap-3 sm:gap-4">
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
                onClick={() => choose(c)}
                className={`pl-chunk h-[5.2rem] w-[5.2rem] rounded-4xl border-2 font-display text-6xl font-bold uppercase leading-none sm:h-28 sm:w-28 ${isWrong ? 'border-dashed border-black/15 bg-black/5 opacity-60' : 'border-black/10 bg-white'}`}
                style={{ color: isWrong ? '#43615b' : letterColor(c.charCodeAt(0)) }}
              >
                {c}
              </motion.button>
            </li>
          );
        })}
      </ul>

      <div className="min-h-[5.5rem]">
        <AnimatePresence mode="wait">
          {round.solved ? (
            <FeedbackMessage
              key="ok"
              tone="success"
              title={pickLine(PRAISE, round.index)}
              action={{ label: round.index + 1 < round.total ? 'Next word' : 'Finish', onClick: round.next, icon: 'arrow-right' }}
            >
              <strong>{word}</strong> needs the letter <strong>{q.answer.toUpperCase()}</strong>.
            </FeedbackMessage>
          ) : showRetry ? (
            <FeedbackMessage key="retry" tone="retry" title={pickLine(TRY_AGAIN, wrong.length)} action={{ label: 'Try again', onClick: () => { setWrong([]); setShowRetry(false); }, icon: 'refresh' }}>
              Say the word out loud and listen for the missing sound.
            </FeedbackMessage>
          ) : null}
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
    <div className="space-y-5">
      <ProgressIndicator done={round.solvedCount} total={round.total} currentIndex={round.index} accent="plum" noun="Word" />
      <Question key={round.current.id} round={round} q={round.current} />
    </div>
  );
}
