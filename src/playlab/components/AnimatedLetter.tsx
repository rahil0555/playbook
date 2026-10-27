import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { useRipple } from '../hooks/useRipple';
import { dragProps, letterAnimations, type LetterAnimationName } from '../motion/variants';

export interface AnimatedLetterHandle {
  /** Play an animation now (defaults to the component's `animation`). Safe to call repeatedly. */
  play: (name?: LetterAnimationName) => void;
}

interface AnimatedLetterProps {
  glyph: string;
  color: string;
  animation: LetterAnimationName;
  /** Tailwind size/typography classes for the glyph box */
  className?: string;
  /** Called on tap, click or Enter/Space. The animation plays first, so audio can never delay it. */
  onTap?: () => void;
  /** Allow dragging the glyph around; it springs back on release. Never required for selection. */
  draggable?: boolean;
  label: string;
  pressed?: boolean;
  /** Plain (non-interactive) glyph, e.g. inside a tile that is already a button */
  decorative?: boolean;
  /** Not tappable (and dimmed) while something else is using the sound, e.g. the microphone is listening */
  disabled?: boolean;
}

/**
 * A single big letter that reacts like a toy: it squashes under a finger,
 * performs one of six hand-tuned animations on tap, throws a ripple, and can
 * optionally be dragged. Animation is started synchronously in the event
 * handler; nothing awaits audio or state.
 */
export const AnimatedLetter = forwardRef<AnimatedLetterHandle, AnimatedLetterProps>(function AnimatedLetter(
  { glyph, color, animation, className = '', onTap, draggable = false, label, pressed, decorative = false, disabled = false },
  ref,
) {
  const controls = useAnimationControls();
  const dragging = useRef(false);
  const { onRippleClick, rippleLayer } = useRipple(color);

  const play = useCallback(
    (name: LetterAnimationName = animation) => {
      const variants = letterAnimations[name];
      // Re-arm the rest pose, then run: interrupts a running animation cleanly.
      void controls.start({ ...(variants.idle as object) }, { duration: 0 }).then(() => controls.start(variants.play as never));
    },
    [animation, controls],
  );
  useImperativeHandle(ref, () => ({ play }), [play]);

  const trigger = useCallback(() => {
    play();
    onTap?.();
  }, [onTap, play]);

  if (decorative) {
    return (
      <motion.span animate={controls} className={`inline-block select-none font-display font-bold leading-none ${className}`} style={{ color }} aria-hidden="true">
        {glyph}
      </motion.span>
    );
  }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      animate={controls}
      aria-label={label}
      aria-pressed={pressed}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      {...(draggable
        ? {
            drag: true,
            dragSnapToOrigin: true,
            dragElastic: dragProps.dragElastic,
            dragMomentum: dragProps.dragMomentum,
            dragTransition: dragProps.dragTransition,
            whileDrag: dragProps.whileDrag,
            onDragStart: () => {
              dragging.current = true;
            },
            onDragEnd: () => {
              // keep the flag until the click that follows pointer-up has been ignored
              setTimeout(() => (dragging.current = false), 0);
            },
          }
        : {})}
      onClick={(e) => {
        if (dragging.current) return;
        onRippleClick(e);
        trigger();
      }}
      className={`relative inline-flex select-none items-center justify-center font-display font-bold leading-none disabled:opacity-60 ${draggable ? 'pl-draggable cursor-grab active:cursor-grabbing' : ''} ${className}`}
      style={{ color }}
    >
      {rippleLayer}
      <span aria-hidden="true" className="relative">
        {glyph}
      </span>
    </motion.button>
  );
});
