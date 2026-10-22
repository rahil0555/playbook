import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * The reward for a finished story word, after the reference reel: a racket and a ball on a green court. It plays once and clears
 * itself. With reduced motion the ball stays in the air and the scene simply fades away.
 */
export function TennisScene({ reducedMotion }: { reducedMotion: boolean }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), reducedMotion ? 1400 : 2600);
    return () => clearTimeout(timer);
  }, [reducedMotion]);
  if (!shown) return null;
  const flight = reducedMotion ? undefined : { duration: 1.6, ease: 'easeInOut' as const, repeat: 0 };
  return (
    <div data-story-tennis aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <svg viewBox="0 0 320 200" className="h-[96%] w-[96%] drop-shadow-lg">
        <rect width="320" height="200" rx="26" fill="#6fb85a" />
        <rect x="20" y="16" width="280" height="168" rx="6" fill="none" stroke="#f4f7ef" strokeWidth="4" />
        <line x1="160" y1="16" x2="160" y2="184" stroke="#f4f7ef" strokeWidth="3" strokeDasharray="8 6" />
        <rect x="156" y="98" width="8" height="18" fill="#f4f7ef" />
        <motion.g initial={{ rotate: -10 }} animate={{ rotate: reducedMotion ? 0 : [-10, -40, 12, -10] }} transition={flight} style={{ originX: '70px', originY: '150px' }}>
          <line x1="70" y1="150" x2="60" y2="188" stroke="#f08fb0" strokeWidth="9" strokeLinecap="round" />
          <ellipse cx="96" cy="124" rx="24" ry="33" fill="none" stroke="#3a7bd5" strokeWidth="8" transform="rotate(-18 96 124)" />
          <line x1="84" y1="98" x2="108" y2="150" stroke="#3a7bd5" strokeWidth="2" opacity="0.6" />
          <line x1="104" y1="98" x2="80" y2="150" stroke="#3a7bd5" strokeWidth="2" opacity="0.6" />
        </motion.g>
        <motion.circle
          r="12"
          fill="#d7ef3c"
          stroke="#8fb31c"
          strokeWidth="2"
          initial={{ cx: 230, cy: 140 }}
          animate={reducedMotion ? { cx: 230, cy: 60 } : { cx: [230, 150, 70], cy: [140, 30, 120] }}
          transition={flight}
        />
      </svg>
    </div>
  );
}
