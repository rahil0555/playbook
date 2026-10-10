import { motion } from 'framer-motion';
import { ACCENTS } from '../lib/accents';
import type { AccentName } from '../types/learning';

interface ProgressIndicatorProps {
  /** Questions finished so far. */
  done: number;
  total: number;
  /** Index (0-based) of the question being worked on, shown as the ringed dot. */
  currentIndex?: number;
  accent?: AccentName;
  /** e.g. "Question" -> "Question 2 of 5" */
  noun?: string;
  /** Fully custom caption, e.g. "Letters found: 2 of 5" */
  text?: string;
}

/** Dots for short rounds; exposes a proper progressbar to assistive tech. */
export function ProgressIndicator({ done, total, currentIndex, accent = 'brand', noun = 'Question', text }: ProgressIndicatorProps) {
  const a = ACCENTS[accent];
  const shown = currentIndex !== undefined ? Math.min(currentIndex + 1, total) : Math.min(done, total);
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={`${noun} progress`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${total} finished`}
        className="flex items-center gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => {
          const finished = i < done;
          const current = i === currentIndex && !finished;
          return (
            <motion.span
              key={i}
              data-state={finished ? 'done' : current ? 'current' : 'todo'}
              animate={finished ? { scale: [1, 1.35, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className={`block h-3.5 w-3.5 rounded-full border-2 ${finished ? `${a.solid} border-transparent` : current ? `bg-white ${a.border} ring-2 ${a.ring}` : 'border-black/30 bg-white'}`}
            />
          );
        })}
      </div>
      <span className="text-sm font-semibold text-ink-soft">
        {text ?? `${noun} ${shown} of ${total}`}
      </span>
    </div>
  );
}
