import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';

/** A reward to show once: a word in a colour, with an id so the same word can be rewarded again. */
export interface Reward {
  id: number;
  word: string;
  color: string;
}

/**
 * A large, brief, colourful word that pops over its parent (which must be `relative`) and fades away by itself.
 * It only shows a word the activity already displays, so it never reveals an answer. It is aria-hidden and
 * does not take pointer events, so it never blocks the next action. Reduced motion: it fades in without movement.
 */
export function KeyWordReward({ reward, className = '' }: { reward: Reward | null; className?: string }) {
  const { reducedMotion } = usePlayLab();
  const [shown, setShown] = useState<Reward | null>(null);

  useEffect(() => {
    if (!reward) return;
    setShown(reward);
    const t = setTimeout(() => setShown(null), 1400);
    return () => clearTimeout(t);
  }, [reward]);

  return (
    <AnimatePresence>
      {shown ? (
        <motion.div
          key={shown.id}
          aria-hidden="true"
          data-testid="key-word-reward"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -6 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: [0.4, 1.12, 1], rotate: [-6, 3, 0] }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`pointer-events-none absolute inset-0 z-30 grid place-items-center ${className}`}
        >
          <span className="font-display text-[clamp(2.2rem,9vw,4.2rem)] font-bold leading-none" style={{ color: shown.color, textShadow: '0 3px 0 #fff, 0 7px 16px rgba(18,49,44,0.35)' }}>
            {shown.word}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
