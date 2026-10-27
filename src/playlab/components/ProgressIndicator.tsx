import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { ACCENTS } from '../lib/accents';
import type { AccentName } from '../types/learning';
import { Icon } from './Icon';

interface ProgressIndicatorProps {
  /** Questions finished so far. */
  done: number;
  total: number;
  /** Index (0-based) of the question being worked on, shown as the pulsing stone. */
  currentIndex?: number;
  accent?: AccentName;
  /** e.g. "Question" -> "Question 2 of 5" */
  noun?: string;
  /** Fully custom caption, e.g. "Letters found: 2 of 5" */
  text?: string;
}

/**
 * An adventure trail: stepping stones joined by a path. Finished stones turn into golden stars, the current stone
 * pulses. Still a proper progressbar for assistive tech (and `data-state` per stone for tests).
 */
export function ProgressIndicator({ done, total, currentIndex, accent = 'brand', noun = 'Question', text }: ProgressIndicatorProps) {
  const a = ACCENTS[accent];
  const shown = currentIndex !== undefined ? Math.min(currentIndex + 1, total) : Math.min(done, total);
  return (
    <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-[1.6rem] bg-white/90 px-3 py-1.5 text-center shadow-soft sm:rounded-full sm:pr-4">
      <div
        role="progressbar"
        aria-label={`${noun} progress`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${total} finished`}
        className="flex max-w-full flex-wrap items-center justify-center"
      >
        {Array.from({ length: total }, (_, i) => {
          const finished = i < done;
          const current = i === currentIndex && !finished;
          return (
            <Fragment key={i}>
              {i > 0 ? <span aria-hidden="true" className={`mx-0.5 h-1 w-2 rounded-full sm:w-3.5 ${i <= done ? 'bg-sun-300' : 'bg-black/10'}`} /> : null}
              <motion.span
                data-state={finished ? 'done' : current ? 'current' : 'todo'}
                animate={finished ? { scale: [1, 1.5, 1], rotate: [0, 20, 0] } : { scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`relative grid h-6 w-6 place-items-center rounded-full border-2 sm:h-8 sm:w-8 ${
                  finished ? 'border-sun-700/30 bg-sun-300 text-sun-700' : current ? `bg-white ${a.border} ring-[3px] ${a.ring} ${current ? 'pl-glow-pulse' : ''}` : 'border-black/15 bg-black/[0.04]'
                }`}
              >
                {finished ? <Icon name="star" size={18} filled /> : <span aria-hidden="true" className="font-display text-xs font-bold text-ink-soft">{i + 1}</span>}
              </motion.span>
            </Fragment>
          );
        })}
      </div>
      <span className="font-display text-sm font-semibold text-ink-soft sm:text-base">{text ?? `${noun} ${shown} of ${total}`}</span>
    </div>
  );
}
