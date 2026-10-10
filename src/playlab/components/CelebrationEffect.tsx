import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { burstParticles, CELEBRATION_COLORS } from '../motion/variants';

export interface Burst {
  id: number;
  kind: 'burst' | 'confetti';
  /** origin as % of the container (burst only). Default 50 / 50. */
  x?: number;
  y?: number;
}

/**
 * Fire a celebration. Only one burst exists at a time: firing again replaces the
 * previous one, so rapid correct answers never pile up into visual chaos.
 */
export function useBurst() {
  const [burst, setBurst] = useState<Burst | null>(null);
  const counter = useRef(0);
  const fire = useCallback((kind: Burst['kind'] = 'burst', origin?: { x: number; y: number }) => {
    counter.current += 1;
    setBurst({ id: counter.current, kind, ...origin });
  }, []);
  const clear = useCallback(() => setBurst(null), []);
  return { burst, fire, clear };
}

const Star = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 1.5 2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.2 5.5 21.2l1.8-7.3L1.6 9l7.5-.6Z" fill={color} />
  </svg>
);

function Piece({ shape, size, color }: { shape: 'star' | 'dot' | 'bar'; size: number; color: string }) {
  if (shape === 'star') return <Star size={size + 6} color={color} />;
  if (shape === 'dot') return <span className="block rounded-full" style={{ width: size, height: size, background: color }} />;
  return <span className="block rounded-sm" style={{ width: size * 0.5, height: size * 1.4, background: color }} />;
}

interface CelebrationEffectProps {
  burst: Burst | null;
  onDone?: () => void;
}

/**
 * Particle burst / confetti. Place inside a `relative` container.
 * Transform + opacity only; ~14 particles for a burst, ~26 for confetti.
 * With reduced motion it becomes a soft opacity-only glow (no movement).
 */
export function CelebrationEffect({ burst, onDone }: CelebrationEffectProps) {
  const { reducedMotion } = usePlayLab();
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => doneRef.current?.(), burst.kind === 'confetti' ? 2600 : 1300);
    return () => clearTimeout(t);
  }, [burst]);

  if (!burst) return null;
  const left = `${burst.x ?? 50}%`;
  const top = `${burst.y ?? 50}%`;

  if (reducedMotion) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
        <motion.div
          key={burst.id}
          className="absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left, top, background: 'radial-gradient(circle, rgba(245,184,46,.55), rgba(245,184,46,0) 70%)' }}
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </div>
    );
  }

  if (burst.kind === 'confetti') {
    const pieces = Array.from({ length: 26 }, (_, i) => ({
      i,
      left: `${(i * 37 + 7) % 100}%`,
      drift: ((i * 53) % 90) - 45,
      delay: (i % 9) * 0.07,
      rotate: ((i * 97) % 540) - 270,
      color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length] as string,
      shape: (['bar', 'dot', 'star'] as const)[i % 3] as 'bar' | 'dot' | 'star',
      size: 8 + (i % 3) * 3,
    }));
    return (
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
        {pieces.map((p) => (
          <motion.span
            key={`${burst.id}-${p.i}`}
            className="absolute -top-4 block"
            style={{ left: p.left }}
            initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
            animate={{ y: 560, x: p.drift, opacity: [1, 1, 0], rotate: p.rotate }}
            transition={{ duration: 1.9, delay: p.delay, ease: 'easeIn' }}
          >
            <Piece shape={p.shape} size={p.size} color={p.color} />
          </motion.span>
        ))}
      </div>
    );
  }

  const particles = burstParticles(14, 96, burst.id);
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={`${burst.id}-${p.id}`}
          className="absolute block"
          style={{ left, top, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, scale: [0, 1.15, 0.85], opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: 0.95, delay: p.delay, ease: 'easeOut' }}
        >
          <Piece shape={p.shape} size={p.size} color={p.color} />
        </motion.span>
      ))}
    </div>
  );
}
