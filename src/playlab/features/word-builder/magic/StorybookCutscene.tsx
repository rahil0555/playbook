import { AnimatePresence, motion } from 'framer-motion';
import { usePlayLab } from '../../../app/PlayLabContext';
import { LetterMonster } from '../../../components/LetterMonster';
import { Illustration } from '../../../illustrations/Illustration';
import { letterColor } from '../../../lib/accents';
import type { WordEntry } from '../../../types/learning';

interface StorybookCutsceneProps {
  word: WordEntry;
  open: boolean;
}

/**
 * The reward for a finished word: a storybook page turns over over the board, the picture sits in the middle and the word's
 * monsters dance in a row underneath, with the word and its sentence in storybook type. It is a cutscene, not a dialog: it
 * never takes a click (the next word is always one tap away), it plays no sound of its own (Pip's cheer says the word), and
 * the parent clears it after a few seconds.
 */
export function StorybookCutscene({ word, open }: StorybookCutsceneProps) {
  const { reducedMotion } = usePlayLab();
  const letters = [...word.text];
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="story"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.35 }}
          aria-hidden="true"
          className="pl-storybook-overlay pointer-events-none fixed inset-0 z-50 grid place-items-center p-4"
        >
          <motion.article
            data-testid="storybook"
            initial={reducedMotion ? false : { rotateY: -85, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 15 }}
            style={{ transformOrigin: 'left center', transformPerspective: 900 }}
            className="pl-storybook-page relative w-full max-w-sm rounded-[2.2rem] px-5 pb-5 pt-4 text-center"
          >
            <div aria-hidden="true" className="relative mx-auto h-40 w-full">
              <Illustration name={word.illustration} className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-1">
                {letters.map((letter, i) => (
                  <div key={i} className="h-12 w-12 sm:h-16 sm:w-16">
                    <LetterMonster
                      letter={letter}
                      color={letterColor(letter.charCodeAt(0))}
                      mood="cheer"
                      bounce={!reducedMotion}
                      phase={i * 0.18}
                      blinkDelay={(i * 0.9) % 4}
                    />
                  </div>
                ))}
              </div>
            </div>
            <h3 className="pl-storybook-title font-display mt-3 text-[2.6rem] font-bold uppercase leading-none">{word.text}</h3>
            <p className="pl-storybook-line mt-3 text-[1.2rem] leading-snug">{word.clue}</p>
          </motion.article>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
