import { motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { Mascot } from '../components/Mascot';
import { StarBurst } from './StarBurst';

/**
 * A small character (Pip, the existing mascot) that hops in beside something that was just finished, with a short
 * star burst. It is decorative (aria-hidden) and takes no pointer events. It only plays again when `trigger` changes.
 * Reduced motion: it fades in with no hop and no burst. The caller sizes and places it (`className`, absolute).
 */
export function CharacterReveal({ trigger, className = '' }: { trigger: number; className?: string }) {
  const { reducedMotion } = usePlayLab();
  if (trigger === 0) return null;
  return (
    <div aria-hidden="true" data-testid="character-reveal" className={`pointer-events-none absolute z-20 ${className}`}>
      <motion.div
        key={trigger}
        className="relative h-full w-full"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.2, y: 26 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: [0.2, 1.16, 0.96, 1], y: [26, -22, 3, 0] }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {reducedMotion ? null : <StarBurst seed={trigger + 5} count={10} spread={72} />}
        <Mascot mood="cheer" className="h-full w-full" />
      </motion.div>
    </div>
  );
}
