import { motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';

/**
 * A ring of little dots that pop out of a spot and fade: the snap of a letter going into place. It plays once, when mounted.
 * Positioned on the spot's centre, like StarBurst.
 */
export function SnapBurst({ color, seed = 1, count = 10 }: { color: string; seed?: number; count?: number }) {
  const { reducedMotion } = usePlayLab();
  if (reducedMotion) return null;
  const dots = Array.from({ length: count }, (_, i) => {
    const angle = ((i + seed) * 137.5 * Math.PI) / 180;
    const distance = 44 + ((i * 17 + seed * 11) % 24);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, size: 6 + ((i * 5) % 6), delay: (i % 3) * 0.02 };
  });
  return (
    <span aria-hidden="true" data-testid="snap-burst" className="pointer-events-none absolute left-1/2 top-1/2 z-20">
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ width: d.size, height: d.size, left: -d.size / 2, top: -d.size / 2, background: i % 2 ? color : '#ffd36b' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: d.x, y: d.y, opacity: [1, 1, 0], scale: [0.4, 1.1, 0.6] }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: d.delay }}
        />
      ))}
    </span>
  );
}
