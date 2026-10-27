import { useEffect, useRef, useState, type RefObject } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Mascot } from '../../../components/Mascot';
import { StarBurst } from '../../../moments/StarBurst';
import { CREATURE_HOP_MS } from '../../../moments/timing';

export { CREATURE_HOP_MS } from '../../../moments/timing';

interface CompletionCreatureProps {
  /** counts each completion: the hop plays again only when this changes (0 = not yet) */
  trigger: number;
  /** where the picture is, relative to the perch on the word (px): Pip starts there and hops onto the word */
  from: { x: number; y: number };
  /** the perch on the word: a fixed, empty box above the letters that Pip sits in (measured to plan the hop) */
  perchRef: RefObject<HTMLSpanElement>;
  reducedMotion: boolean;
  /** called the moment Pip lands on the word: the fanfare and the letters' gold finish start here; the cheer follows its first note */
  onLand: () => void;
}

/**
 * Pip, the existing mascot, hops off the picture and lands on the completed word, sitting above the letters (never on
 * them). Landing = a squash, a green ring and a burst of stars. Reduced motion: Pip fades in on the word with no hop and
 * no burst; the landing sound comes at the same moment, and the spoken cheer follows it.
 */
export function CompletionCreature({ trigger, from, perchRef, reducedMotion, onLand }: CompletionCreatureProps) {
  const body = useAnimationControls();
  const squash = useAnimationControls();
  const ring = useAnimationControls();
  const [landed, setLanded] = useState(false);
  const [burst, setBurst] = useState(0);
  const onLandRef = useRef(onLand);
  onLandRef.current = onLand;

  useEffect(() => {
    if (trigger === 0) {
      body.set({ opacity: 0, x: 0, y: 0, scale: 1 });
      squash.set({ scaleX: 1, scaleY: 1 });
      setLanded(false);
      return;
    }
    if (reducedMotion) {
      void body.start({ opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.2 } });
      setLanded(true);
      onLandRef.current();
      return;
    }
    // off the picture: a high arc, then down onto the perch on the word
    body.set({ opacity: 1, x: from.x, y: from.y, scale: 0.85 });
    void body.start({
      x: [from.x, 0],
      y: [from.y, Math.min(from.y, 0) - 70, 0],
      scale: [0.85, 1.05, 1],
      transition: { duration: CREATURE_HOP_MS / 1000, ease: 'easeOut' },
    });
    const timer = setTimeout(() => {
      // the landing: squash, a ring and a burst, all at the moment the sound starts
      setLanded(true);
      void squash.start({ scaleX: [1.28, 0.8, 1.07, 1], scaleY: [0.7, 1.2, 0.95, 1], transition: { duration: 0.42, ease: 'easeOut' } });
      void ring.start({ opacity: [0.95, 0], scale: [0.45, 2.3], transition: { duration: 0.62, ease: 'easeOut' } });
      setBurst((n) => n + 1);
      onLandRef.current();
    }, CREATURE_HOP_MS);
    return () => clearTimeout(timer);
    // the controls are stable objects; only a new completion (trigger) starts the hop
  }, [trigger]);

  return (
    // the outer box is the perch: it is only positioned (never transformed), so its rectangle is where Pip rests
    <span ref={perchRef} aria-hidden="true" data-testid="completion-perch" className="pointer-events-none absolute left-1/2 top-[0.55rem] z-20 block h-14 w-14 -translate-x-1/2 sm:h-16 sm:w-16">
      <motion.span initial={{ opacity: 0 }} animate={body} className="relative block h-full w-full" data-testid="completion-creature">
        <motion.span initial={{ opacity: 0 }} animate={ring} className="absolute inset-0 rounded-full border-4 border-brand-500" />
        <motion.span animate={squash} className="relative block h-full w-full origin-bottom">
          <Mascot mood="cheer" className="h-full w-full" float={landed && !reducedMotion} />
        </motion.span>
        {burst > 0 && !reducedMotion ? <StarBurst key={burst} seed={burst + 7} count={14} spread={86} /> : null}
      </motion.span>
    </span>
  );
}

/** A gold splash under the letters at the moment the last letter lands (the first beat of the completion). */
export function WordSplash() {
  return (
    <span aria-hidden="true" data-testid="word-splash" className="pointer-events-none absolute inset-x-4 top-1/2 z-10 h-28 -translate-y-1/2">
      <motion.span
        initial={{ scale: 0.35, opacity: 0 }}
        // it swells to 1.2 and settles back to 1, so it finishes inside the board (a stuck 1.2 would poke past its edge)
        animate={{ scale: [0.35, 1.2, 1], opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        className="absolute inset-0 block rounded-full"
        style={{ background: 'radial-gradient(ellipse at center, rgba(245,184,46,0.9) 0%, rgba(245,184,46,0.35) 45%, rgba(245,184,46,0) 72%)' }}
      />
      <StarBurst seed={5} count={12} spread={110} />
    </span>
  );
}
