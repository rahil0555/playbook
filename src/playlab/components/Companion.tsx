import { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { Mascot, type MascotMood } from './Mascot';

interface CompanionProps {
  mood?: MascotMood;
  className?: string;
  /** Bump to replay the reaction for the current mood (e.g. two wrong tries in a row). */
  nudge?: number;
}

/** What Pip does for each mood: hop for joy, a little head-tilt while thinking, a gentle sway to encourage. */
const REACTIONS: Record<MascotMood, { y?: number[]; rotate?: number[]; scale?: number[]; duration: number }> = {
  cheer: { y: [0, -26, 0, -14, 0], rotate: [0, -8, 8, -4, 0], scale: [1, 1.08, 1, 1.04, 1], duration: 0.9 },
  oops: { rotate: [0, -7, 6, -3, 0], y: [0, -3, 0], duration: 0.7 },
  think: { rotate: [0, 6, 6, 0], duration: 0.8 },
  happy: { y: [0, -8, 0], duration: 0.5 },
};

/**
 * The mascot as a little teacher that reacts. It plays its reaction when it appears or when the mood changes,
 * and idles with a very slow float. Reduced motion: no reaction, no float.
 */
export function Companion({ mood = 'happy', className = 'h-24 w-24', nudge = 0 }: CompanionProps) {
  const { reducedMotion } = usePlayLab();
  const controls = useAnimationControls();

  useEffect(() => {
    if (reducedMotion) return;
    const r = REACTIONS[mood];
    void controls.start({ y: r.y ?? 0, rotate: r.rotate ?? 0, scale: r.scale ?? 1, transition: { duration: r.duration, ease: 'easeInOut' } });
  }, [mood, nudge, reducedMotion, controls]);

  return (
    <motion.div animate={controls} className="shrink-0 origin-bottom" data-mascot-mood={mood}>
      <Mascot mood={mood} className={className} float={mood === 'happy' && !reducedMotion} />
    </motion.div>
  );
}
