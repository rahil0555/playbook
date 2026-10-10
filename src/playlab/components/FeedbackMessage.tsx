import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { springs } from '../motion/variants';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Mascot, type MascotMood } from './Mascot';

export type FeedbackTone = 'success' | 'retry' | 'hint' | 'info';

const TONES: Record<FeedbackTone, { box: string; icon: IconName; mood: MascotMood }> = {
  success: { box: 'bg-brand-100 border-brand-300 text-brand-900', icon: 'check', mood: 'cheer' },
  retry: { box: 'bg-sun-100 border-sun-300 text-ink', icon: 'refresh', mood: 'oops' },
  hint: { box: 'bg-sky-100 border-sky-300 text-ink', icon: 'bulb', mood: 'think' },
  info: { box: 'bg-white border-black/10 text-ink', icon: 'sparkle', mood: 'happy' },
};

interface FeedbackMessageProps {
  tone: FeedbackTone;
  title: string;
  children?: ReactNode;
  /** e.g. "Try again" or "Next" */
  action?: { label: string; onClick: () => void; icon?: IconName };
  className?: string;
}

/** Encouraging feedback. Announced politely to screen readers; never uses red or "wrong". */
export function FeedbackMessage({ tone, title, children, action, className = '' }: FeedbackMessageProps) {
  const t = TONES[tone];
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6 }}
      transition={springs.soft}
      className={`flex items-center gap-3 rounded-3xl border-2 p-3 pr-4 ${t.box} ${className}`}
    >
      <Mascot mood={t.mood} className="h-14 w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-display text-lg font-semibold leading-tight">
          <Icon name={t.icon} size={20} />
          {title}
        </p>
        {children ? <p className="mt-0.5 text-[0.95rem] leading-snug">{children}</p> : null}
      </div>
      {action ? (
        <Button size="md" variant="primary" accent={tone === 'retry' ? 'sun' : 'brand'} icon={action.icon} onClick={action.onClick} className="shrink-0">
          {action.label}
        </Button>
      ) : null}
    </motion.div>
  );
}
