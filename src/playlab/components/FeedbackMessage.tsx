import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { springs } from '../motion/variants';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { useEffect, useRef } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { Companion } from './Companion';
import type { MascotMood } from './Mascot';

export type FeedbackTone = 'success' | 'retry' | 'hint' | 'info';

const TONES: Record<FeedbackTone, { box: string; icon: IconName; mood: MascotMood }> = {
  success: { box: 'bg-[#e6fbf3] border-brand-400 text-brand-900', icon: 'check', mood: 'cheer' },
  retry: { box: 'bg-[#fff4d6] border-sun-300 text-ink', icon: 'refresh', mood: 'oops' },
  hint: { box: 'bg-[#e8f4ff] border-sky-300 text-ink', icon: 'bulb', mood: 'think' },
  info: { box: 'bg-white border-black/10 text-ink', icon: 'sparkle', mood: 'happy' },
};

interface FeedbackMessageProps {
  tone: FeedbackTone;
  title: string;
  children?: ReactNode;
  /** e.g. "Try again" or "Next" */
  action?: { label: string; onClick: () => void; icon?: IconName };
  className?: string;
  /** Override the mascot's expression for this message (e.g. a thinking Pip while a letter is picked up). */
  mood?: MascotMood;
  /** Bump to replay the mascot's reaction (e.g. a second miss in a row while the message stays). */
  nudge?: number;
}

/** Encouraging feedback. Announced politely to screen readers; never uses red or "wrong". */
export function FeedbackMessage({ tone, title, children, action, className = '', mood, nudge }: FeedbackMessageProps) {
  const t = TONES[tone];
  const { reducedMotion } = usePlayLab();
  const box = useRef<HTMLDivElement>(null);
  // A result that appears below the fold (a short phone after a word is finished) brings its button into view, just
  // enough to show it, so the next step is never out of reach. The idle message is not moved: the screen opens at the top.
  useEffect(() => {
    if (tone === 'info') return;
    const el = box.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    const r = el.getBoundingClientRect();
    if (r.bottom > window.innerHeight || r.top < 0) el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    // only when the result first appears: later changes of the same message do not move the page
  }, [tone]);
  return (
    <motion.div
      ref={box}
      role={tone === 'info' ? undefined : 'status'}
      aria-live={tone === 'info' ? undefined : 'polite'}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
      transition={springs.soft}
      className={`flex items-end gap-1 sm:gap-2 ${className}`}
    >
      <Companion mood={mood ?? t.mood} nudge={nudge} className="h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24" />
      {/* the mascot's speech bubble */}
      <div className={`relative flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 rounded-[1.6rem] border-[3px] p-3 pr-4 shadow-soft before:absolute before:-left-[0.7rem] before:bottom-6 before:h-4 before:w-4 before:rotate-45 before:rounded-sm before:border-b-[3px] before:border-l-[3px] before:border-inherit before:bg-inherit before:content-[''] ${t.box}`}>
      {/* the text keeps a readable width: on a narrow screen the action wraps underneath instead of squeezing it */}
      <div className="min-w-0 flex-[1_1_9.5rem]">
        <p className="flex items-center gap-1.5 font-display text-lg font-semibold leading-tight">
          <Icon name={t.icon} size={20} />
          {title}
        </p>
        {children ? <p className="mt-0.5 text-[0.95rem] leading-snug">{children}</p> : null}
      </div>
      {action ? (
        <Button size="md" variant="primary" accent={tone === 'retry' ? 'sun' : 'brand'} icon={action.icon} onClick={action.onClick} className="max-w-full whitespace-normal text-left">
          {action.label}
        </Button>
      ) : null}
      </div>
    </motion.div>
  );
}
