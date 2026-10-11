import { motion } from 'framer-motion';
import { usePlayLab } from '../../../app/PlayLabContext';
import { burstParticles } from '../../../motion/variants';

/**
 * A small, subtle star burst (8 particles; a few more for the last letter) centred on its parent. Parent must be `relative`.
 * Under reduced motion it renders nothing; the slot's opacity glow carries the feedback instead.
 */
export function StarBurst({ seed = 1, count = 8, spread = 54 }: { seed?: number; count?: number; spread?: number }) {
  const { reducedMotion } = usePlayLab();
  if (reducedMotion) return null;
  const particles = burstParticles(count, spread, seed);
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-20">
      {particles.map((p) => (
        <motion.svg
          key={p.id}
          width={p.size + 4}
          height={p.size + 4}
          viewBox="0 0 24 24"
          className="absolute"
          style={{ marginLeft: -(p.size + 4) / 2, marginTop: -(p.size + 4) / 2 }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: [0, 1, 0.7], opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: 0.7, delay: p.delay, ease: 'easeOut' }}
        >
          <path d="m12 1.5 2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.2 5.5 21.2l1.8-7.3L1.6 9l7.5-.6Z" fill={p.color} />
        </motion.svg>
      ))}
    </span>
  );
}
