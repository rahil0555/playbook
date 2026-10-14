import type { CSSProperties } from 'react';
import { motion, useMotionValue, type MotionStyle, type MotionValue } from 'framer-motion';

/** How the monster's face looks right now. `scream` is held-on-drag (eyes wide, mouth open), `oops` a miss, `cheer` a finished word. */
export type MonsterMood = 'idle' | 'think' | 'scream' | 'oops' | 'cheer';

interface LetterMonsterProps {
  letter: string;
  /** the body colour: each letter has its own, as in a picture book */
  color: string;
  mood?: MonsterMood;
  /** where the eyes look, -1 (left or up) to 1 (right or down); a moving monster's eyes lag behind its motion */
  lookX?: MotionValue<number>;
  lookY?: MotionValue<number>;
  /** a small bounce while idle, phased so that monsters on screen do not move in step (seconds) */
  bounce?: boolean;
  phase?: number;
  /** when the first blink happens (seconds), so monsters do not blink in unison */
  blinkDelay?: number;
  className?: string;
}

/**
 * A letter as a squishy, glossy monster with googly eyes that blink, and a mouth that shows its mood. Everything inside is
 * sized in `em`, so the monster's font size (see `.pl-monster` in playlab.css) sets its whole face. It is decorative: the
 * button or slot around it carries the name.
 */
export function LetterMonster({ letter, color, mood = 'idle', lookX, lookY, bounce = false, phase = 0, blinkDelay = 0, className = '' }: LetterMonsterProps) {
  const ownX = useMotionValue(0);
  const ownY = useMotionValue(0);
  const x = lookX ?? ownX;
  const y = lookY ?? ownY;
  return (
    <motion.div
      aria-hidden="true"
      data-monster-mood={mood}
      className={`pl-monster pl-monster--${mood} ${className}`}
      style={{ '--gem': color, '--lx': x, '--ly': y } as unknown as MotionStyle}
      animate={bounce ? { y: [0, -4, 0], scaleY: [1, 0.96, 1] } : undefined}
      transition={bounce ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: phase } : undefined}
    >
      <span className="pl-monster-eyes">
        {[0, 1].map((i) => (
          <span key={i} className="pl-monster-eye" style={{ animationDelay: `${blinkDelay + i * 0.06}s` } as CSSProperties}>
            <span className="pl-monster-pupil" />
          </span>
        ))}
      </span>
      <span className="pl-monster-mouth" />
      <span className="pl-monster-letter font-display">{letter}</span>
    </motion.div>
  );
}
