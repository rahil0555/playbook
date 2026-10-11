import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayLab } from '../../app/PlayLabContext';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { Icon } from '../../components/Icon';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { PronunciationControl } from '../../components/PronunciationControl';
import { RoundSummary } from '../../components/RoundSummary';
import { useSpeech } from '../../hooks/useAudio';
import { useRound, type Round } from '../../hooks/useRound';
import { letterColor } from '../../lib/accents';
import { choiceCount, ROUND_LENGTH } from '../../lib/level';
import { PRAISE, pickLine, TRY_AGAIN } from '../../lib/messages';
import { buildSoundQuestion, type SoundQuestion } from '../../lib/questions';
import { pickFresh } from '../../lib/random';
import { incorrectVariants, correctVariants } from '../../motion/variants';

interface QuestionProps {
  round: Round<SoundQuestion>;
  question: SoundQuestion;
}

function Question({ round, question }: QuestionProps) {
  const { sayLetterSound, sayWord, sfx } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const [wrong, setWrong] = useState<string[]>([]);
  const [showRetry, setShowRetry] = useState(false);
  const [lastWrong, setLastWrong] = useState<string | null>(null);
  const answer = question.answer;

  // Play the sound as the question appears (the child has already tapped to get here).
  useEffect(() => {
    void sayLetterSound(answer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer.id]);

  const choose = (id: string) => {
    if (round.solved || wrong.includes(id)) return;
    const correct = id === answer.id;
    round.submit(id, answer.id, correct);
    if (correct) {
      fire('burst', { x: 50, y: 55 });
      sfx('correct');
      setShowRetry(false);
      void sayWord(`${answer.upper}. ${answer.word.text}`);
    } else {
      sfx('oops');
      setWrong((w) => [...w, id]);
      setLastWrong(id);
      setShowRetry(true);
    }
  };

  const retry = () => {
    setShowRetry(false);
    setLastWrong(null);
    void sayLetterSound(answer);
  };

  const hintNow = !round.solved && wrong.length >= 2 && showRetry;

  return (
    <div className="relative mx-auto max-w-3xl">
      <CelebrationEffect burst={burst} onDone={clear} />
      <div className="flex flex-col items-center gap-3 pl-board rounded-[2.4rem] p-5 text-center sm:p-8">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Which letter makes this sound?</h2>
        <PronunciationControl label="Listen to the sound" accent="sky" variant="primary" size="lg" icon="speaker" onPlay={() => sayLetterSound(answer)} />
        <p className="text-sm text-ink-soft">Listen as many times as you like.</p>
      </div>

      <ul className={`mt-5 grid gap-3 sm:gap-4 ${question.choices.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`} aria-label="Letter choices">
        {question.choices.map((c) => {
          const isWrong = wrong.includes(c.id);
          const isRight = round.solved && c.id === answer.id;
          const color = letterColor(c.id.charCodeAt(0));
          return (
            <li key={c.id}>
              <motion.button
                type="button"
                data-choice={c.id}
                disabled={round.solved && !isRight}
                aria-disabled={isWrong}
                aria-label={`Letter ${c.upper} ${c.lower}${isWrong ? ', not this one' : ''}${isRight ? ', correct' : ''}`}
                variants={{ ...incorrectVariants, ...correctVariants }}
                animate={lastWrong === c.id ? 'incorrect' : isRight ? 'correct' : 'idle'}
                whileTap={isWrong || round.solved ? undefined : { scale: 0.93 }}
                onClick={() => choose(c.id)}
                className={`relative flex min-h-[6.5rem] w-full items-center justify-center gap-1 rounded-[2rem] font-display font-bold leading-none transition-colors sm:min-h-[8rem] ${
                  isRight ? 'pl-gem' : isWrong ? 'border-[3px] border-dashed border-black/15 bg-black/5 opacity-60' : 'pl-gem-soft'
                }`}
                style={{ '--gem': isRight ? '#16a286' : color, color: isWrong ? '#43615b' : isRight ? '#fff' : color } as CSSProperties}
              >
                <span aria-hidden="true" className="text-[3.6rem] sm:text-[4.6rem]">{c.upper}</span>
                <span aria-hidden="true" className="text-[2.6rem] sm:text-[3.2rem]">{c.lower}</span>
                {isRight ? (
                  <span className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-white"><Icon name="check" size={20} /></span>
                ) : null}
              </motion.button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 min-h-[5.5rem]">
        <AnimatePresence mode="wait">
          {round.solved ? (
            <FeedbackMessage
              key="ok"
              tone="success"
              title={pickLine(PRAISE, round.index)}
              action={{ label: round.index + 1 < round.total ? 'Next' : 'Finish', onClick: round.next, icon: 'arrow-right' }}
            >
              {answer.upper} says {answer.sound.symbol} like in <strong>{answer.word.text}</strong>.
            </FeedbackMessage>
          ) : hintNow ? (
            <FeedbackMessage key="hint" tone="hint" title="Here’s a hint" action={{ label: 'Hear it again', onClick: retry, icon: 'replay' }}>
              The sound is the first sound in “{answer.word.text}”.
            </FeedbackMessage>
          ) : showRetry ? (
            <FeedbackMessage key="retry" tone="retry" title={pickLine(TRY_AGAIN, wrong.length)} action={{ label: 'Try again', onClick: retry, icon: 'replay' }}>
              Listen once more, then pick another letter.
            </FeedbackMessage>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function SoundQuiz({ onExplore }: { onExplore: () => void }) {
  const { content, level } = usePlayLab();
  const seen = useRef(new Set<string>());
  const round = useRound<SoundQuestion>('phonics', () => {
    const picks = pickFresh(content.letters, ROUND_LENGTH, seen.current);
    picks.forEach((p) => seen.current.add(p.id));
    return picks.map((letter) => buildSoundQuestion(letter, content.letters, choiceCount(level), Math.random));
  });

  if (round.summary) return <RoundSummary completion={round.summary} onPlayAgain={round.restart} extra={{ label: 'Explore sounds again', onClick: onExplore }} />;
  if (!round.current) return null;

  return (
    <div className="space-y-5">
      <ProgressIndicator done={round.solvedCount} total={round.total} currentIndex={round.index} accent="sky" />
      <Question key={round.current.id} round={round} question={round.current} />
    </div>
  );
}
