import type { Transition, Variants } from 'framer-motion';

/**
 * Reusable motion vocabulary for PlayLab.
 * Rules: animate transform + opacity only; keep durations short (<= ~0.9s);
 * every "one-shot" returns to its resting pose so input stays responsive.
 * Under reduced motion Framer drops transform animations globally (MotionConfig);
 * components pair these with colour/ring state changes so feedback survives.
 */

export const springs = {
  snappy: { type: 'spring', stiffness: 520, damping: 22, mass: 0.7 } satisfies Transition,
  bouncy: { type: 'spring', stiffness: 360, damping: 12, mass: 0.8 } satisfies Transition,
  soft: { type: 'spring', stiffness: 190, damping: 20 } satisfies Transition,
};

/* ------------------------------ 1. tap response ------------------------------ */
/** Spread onto a motion element: immediate press feedback. */
export const tapResponse = {
  whileTap: { scale: 0.92 },
  whileHover: { scale: 1.04 },
  transition: springs.snappy,
} as const;

/** Smaller version for dense grids and tiles. */
export const tapResponseSmall = {
  whileTap: { scale: 0.94 },
  whileHover: { scale: 1.03 },
  transition: springs.snappy,
} as const;

/* ---------------------- 2-5. letter animation variations --------------------- */

export type LetterAnimationName = 'bounce' | 'wobble' | 'spin' | 'jelly' | 'float' | 'pop';

const rest = { scale: 1, scaleX: 1, scaleY: 1, rotate: 0, x: 0, y: 0 };

/** Each entry is a Variants map with `idle` and `play`. Start with controls.start('play'). */
export const letterAnimations: Record<LetterAnimationName, Variants> = {
  /** Spring bounce: squash, launch, land. */
  bounce: {
    idle: rest,
    play: {
      y: [0, 6, -34, 0, -10, 0],
      scaleX: [1, 1.12, 0.94, 1.08, 0.98, 1],
      scaleY: [1, 0.86, 1.08, 0.92, 1.03, 1],
      transition: { duration: 0.8, times: [0, 0.14, 0.45, 0.68, 0.84, 1], ease: 'easeOut' },
    },
  },
  /** Wobble: quick shake that settles. */
  wobble: {
    idle: rest,
    play: {
      rotate: [0, -14, 12, -9, 6, -3, 0],
      x: [0, -6, 5, -4, 2, -1, 0],
      transition: { duration: 0.75, ease: 'easeInOut' },
    },
  },
  /** Gentle rotation: one slow, friendly turn with a swell. */
  spin: {
    idle: rest,
    play: {
      rotate: [0, 360],
      scale: [1, 1.18, 1],
      transition: { duration: 0.85, ease: [0.45, 0, 0.2, 1] },
    },
  },
  /** Jelly: alternating squash and stretch. */
  jelly: {
    idle: rest,
    play: {
      scaleX: [1, 1.25, 0.85, 1.12, 0.95, 1.03, 1],
      scaleY: [1, 0.75, 1.15, 0.9, 1.05, 0.98, 1],
      transition: { duration: 0.75, ease: 'easeInOut' },
    },
  },
  /** Float: lift, hang, settle. */
  float: {
    idle: rest,
    play: {
      y: [0, -26, -20, -26, 0],
      rotate: [0, -4, 3, -3, 0],
      scale: [1, 1.1, 1.1, 1.1, 1],
      transition: { duration: 1, ease: 'easeInOut' },
    },
  },
  /** Pop: overshoot scale. */
  pop: {
    idle: rest,
    play: {
      scale: [1, 0.78, 1.28, 0.95, 1.04, 1],
      transition: { duration: 0.6, times: [0, 0.18, 0.5, 0.72, 0.88, 1], ease: 'easeOut' },
    },
  },
};

export const LETTER_ANIMATION_ORDER: LetterAnimationName[] = ['bounce', 'wobble', 'spin', 'jelly', 'float', 'pop'];

/** Deterministic default for a letter, then rotate through the others on replays. */
export function animationFor(letterIndex: number, replay = 0): LetterAnimationName {
  return LETTER_ANIMATION_ORDER[(letterIndex + replay) % LETTER_ANIMATION_ORDER.length] as LetterAnimationName;
}

/* -------------------------------- 6. float ---------------------------------- */
/** Optional continuous float; use on at most one element per screen. */
export const floatLoop = {
  animate: { y: [0, -7, 0] },
  transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' } satisfies Transition,
} as const;

/* -------------------------------- 7. ripple --------------------------------- */
/** CSS-driven (.pl-ripple); this is the matching Framer version for non-CSS surfaces. */
export const rippleVariants: Variants = {
  hidden: { scale: 0, opacity: 0.45 },
  show: { scale: 1, opacity: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

/* ------------------------------- 8. selection ------------------------------- */
export const selectionVariants: Variants = {
  off: { scale: 1, y: 0 },
  on: { scale: 1.08, y: -3, transition: springs.bouncy },
};

/* ----------------------------- 9. drag and drop ----------------------------- */
export const dragProps = {
  whileDrag: { scale: 1.14, rotate: -4, zIndex: 50, boxShadow: '0 18px 28px -10px rgba(18,49,44,0.35)' },
  dragTransition: { bounceStiffness: 420, bounceDamping: 22 },
  dragElastic: 0.18,
  dragMomentum: false,
} as const;

/** Slot highlight while a tile hovers over it. */
export const dropTargetVariants: Variants = {
  idle: { scale: 1 },
  over: { scale: 1.1, transition: springs.snappy },
};

/* ----------------------------- 10. correct answer --------------------------- */
export const correctVariants: Variants = {
  idle: { scale: 1, rotate: 0 },
  correct: {
    scale: [1, 1.14, 0.97, 1.05, 1],
    rotate: [0, -3, 3, -1, 0],
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

/* ---------------------------- 11. incorrect answer -------------------------- */
/** A soft side-to-side "not quite" nudge - deliberately small and kind. */
export const incorrectVariants: Variants = {
  idle: { x: 0 },
  incorrect: {
    x: [0, -9, 8, -6, 4, -2, 0],
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
};

/* --------------------------- 12. activity completion ------------------------ */
export const completionContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
export const completionItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: springs.bouncy },
};
export const starPop: Variants = {
  hidden: { opacity: 0, scale: 0, rotate: -30 },
  show: (i: number) => ({ opacity: 1, scale: 1, rotate: 0, transition: { ...springs.bouncy, delay: 0.25 + i * 0.18 } }),
};

/* ------------------------------- 13. celebration ---------------------------- */
export interface ParticleSpec {
  id: number;
  x: number;
  y: number;
  rotate: number;
  size: number;
  delay: number;
  color: string;
  shape: 'star' | 'dot' | 'bar';
}

export const CELEBRATION_COLORS = ['#f5b82e', '#e8573f', '#16a286', '#2f8fd8', '#8a5cc7'];

/** Deterministic-by-seed particle layout so bursts look composed, not random noise. */
export function burstParticles(count: number, spread: number, seed = 1): ParticleSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + seed * 0.7;
    const dist = spread * (0.55 + 0.45 * (((i * 7 + seed * 3) % 5) / 4));
    return {
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - spread * 0.15,
      rotate: ((i * 83 + seed * 31) % 360) - 180,
      size: 8 + ((i * 5 + seed) % 3) * 4,
      delay: (i % 4) * 0.02,
      color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length] as string,
      shape: (['star', 'dot', 'star', 'bar'] as const)[i % 4] as ParticleSpec['shape'],
    };
  });
}

export const wave: Variants = {
  idle: { y: 0 },
  go: (i: number) => ({ y: [0, -14, 0], transition: { duration: 0.5, delay: i * 0.09, ease: 'easeOut' } }),
};
