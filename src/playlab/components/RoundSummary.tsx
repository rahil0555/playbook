import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePlayLab, useProgressState } from '../app/PlayLabContext';
import { getActivity, nextActivityId } from '../data/activities';
import { useSpeech } from '../hooks/useAudio';
import { completionContainer, completionItem, starPop } from '../motion/variants';
import type { ActivityCompletion } from '../types/learning';
import { Button } from './Button';
import { CelebrationEffect, useBurst } from './CelebrationEffect';
import { Icon } from './Icon';
import { Companion } from './Companion';
import { StickerReveal } from './StickerReveal';

interface RoundSummaryProps {
  completion: ActivityCompletion;
  onPlayAgain: () => void;
  /** Extra secondary action, e.g. "Pick another game" */
  extra?: { label: string; onClick: () => void };
}

const HEADLINES = { 3: 'Amazing!', 2: 'Great work!', 1: 'You did it!' } as const;

/** Round finished: stars, kind message, and clear next steps (play again / next activity / home). */
export function RoundSummary({ completion, onPlayAgain, extra }: RoundSummaryProps) {
  const { navigate } = usePlayLab();
  const { sfx } = useSpeech();
  const { lifetime } = useProgressState();
  // the round that just finished has already been counted, so its sticker is the newest one
  const rounds = Math.max(1, lifetime.activitiesCompleted);
  const { burst, fire, clear } = useBurst();
  const next = getActivity(nextActivityId(completion.activityId));

  useEffect(() => {
    fire('confetti');
    sfx('celebrate');
  }, [fire, sfx]);

  return (
    <motion.section
      aria-labelledby="pl-summary-title"
      variants={completionContainer}
      initial="hidden"
      animate="show"
      className="relative mx-auto flex max-w-xl flex-col items-center pl-board rounded-[2.4rem] px-5 py-8 text-center sm:px-10"
    >
      <CelebrationEffect burst={burst} onDone={clear} />
      <motion.div variants={completionItem}>
        <Companion mood="cheer" className="h-32 w-32" />
      </motion.div>
      <motion.h2 variants={completionItem} id="pl-summary-title" className="mt-2 font-display text-4xl font-bold text-ink">
        {HEADLINES[completion.stars]}
      </motion.h2>
      <div className="mt-3 flex gap-2" role="img" aria-label={`${completion.stars} out of 3 stars`}>
        {[0, 1, 2].map((i) => (
          <motion.span key={i} custom={i} variants={starPop} className={i < completion.stars ? 'text-sun-500' : 'text-black/15'}>
            <Icon name="star" size={52} filled />
          </motion.span>
        ))}
      </div>
      <motion.div variants={completionItem} className="mt-4">
        <StickerReveal rounds={rounds} />
      </motion.div>
      <motion.p variants={completionItem} className="mt-3 text-lg text-ink-soft">
        {completion.score} of {completion.total} right on the first try. Every try helps you learn!
      </motion.p>
      <motion.div variants={completionItem} className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" accent="brand" icon="refresh" onClick={onPlayAgain}>
          Play again
        </Button>
        <Button size="lg" variant="secondary" accent={next.accent} iconRight="arrow-right" onClick={() => navigate(next.id)}>
          Next: {next.title}
        </Button>
      </motion.div>
      <motion.div variants={completionItem} className="mt-3 flex flex-wrap justify-center gap-2">
        {extra ? (
          <Button variant="ghost" accent="plum" onClick={extra.onClick}>
            {extra.label}
          </Button>
        ) : null}
        <Button variant="ghost" accent="brand" icon="home" onClick={() => navigate('home')}>
          Go home
        </Button>
      </motion.div>
    </motion.section>
  );
}
