import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { getActivity } from '../data/activities';
import { useSpeech } from '../hooks/useAudio';
import { Illustration } from '../illustrations/Illustration';
import type { ActivityId } from '../types/learning';
import { springs } from '../motion/variants';
import { Button } from './Button';
import { PronunciationControl } from './PronunciationControl';

interface ActivityHeaderProps {
  activityId: ActivityId;
  /** Overrides the default instruction (e.g. per game) */
  instruction?: string;
  /** Overrides the default title */
  title?: string;
  /** Progress indicator or goal chip */
  children?: ReactNode;
  /** Optional extra back action, e.g. "Pick another game" */
  back?: { label: string; onClick: () => void };
  /**
   * On phones: the title sign sits beside Home instead of on its own row, and the read-aloud button is only an icon beside the
   * instruction. The play area below starts higher, so the letters and the outlines fit on one screen. Desktop is unchanged.
   */
  compact?: boolean;
}

/** A hanging wooden title sign, a Home button, the adventure-trail progress, and the instruction with read-aloud. */
export function ActivityHeader({ activityId, instruction, title, children, back, compact = false }: ActivityHeaderProps) {
  const { navigate } = usePlayLab();
  const { speak } = useSpeech();
  const activity = getActivity(activityId);
  const text = instruction ?? activity.instruction;
  const signClass = compact
    ? 'pl-wood flex min-w-0 flex-auto items-center justify-center gap-2 rounded-[1.4rem] px-3 py-1 sm:flex-none sm:gap-3 sm:rounded-[1.6rem] sm:px-8 sm:py-2.5'
    : 'pl-wood order-first flex w-full items-center justify-center gap-3 rounded-[1.6rem] px-5 py-2 sm:order-none sm:w-auto sm:px-8 sm:py-2.5';
  // Phones: the text takes the row beside the speaker button, and a status note from the speaker (e.g. "The sound didn’t play")
  // wraps onto a full-width row below. The control's wrapper is dropped from the layout on phones (max-sm:contents) so its
  // note is not squeezed into the button's narrow column.
  const pillClass = compact
    ? 'mt-1 flex flex-wrap items-center justify-center gap-x-1 rounded-[1.8rem] bg-white/85 px-3 py-1 text-center shadow-soft sm:mx-auto sm:mt-3 sm:w-fit sm:px-4'
    : 'mt-3 flex flex-wrap items-center justify-center gap-x-1 rounded-[1.8rem] bg-white/85 px-4 py-1 text-center shadow-soft sm:mx-auto sm:w-fit';
  return (
    <header className={`relative z-10 sm:mb-5 ${compact ? 'mb-1' : 'mb-3'}`}>
      <div className={`flex flex-wrap items-center justify-between gap-x-3 ${compact ? 'gap-y-1 sm:gap-y-2' : 'gap-y-2'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" accent={activity.accent} icon="arrow-left" onClick={() => navigate('home')} aria-label="Back to home">
            Home
          </Button>
          {back ? (
            <Button variant="secondary" accent={activity.accent} onClick={back.onClick}>
              {back.label}
            </Button>
          ) : null}
        </div>
        <motion.div
          initial={{ y: -24, opacity: 0, rotate: -2 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={springs.bouncy}
          className={signClass}
        >
          <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-2xl bg-white/90 shadow-[inset_0_-3px_0_rgba(0,0,0,0.08)] sm:h-12 sm:w-12 ${compact ? 'h-9 w-9' : 'h-10 w-10'}`}>
            <Illustration name={activity.illustration} className={`sm:h-10 sm:w-10 ${compact ? 'h-7 w-7' : 'h-8 w-8'}`} />
          </span>
          <h1 className={`font-display font-bold leading-none tracking-tight sm:text-[2.2rem] ${compact ? 'text-[1.4rem]' : 'text-[1.7rem]'}`}>{title ?? activity.title}</h1>
        </motion.div>
        <div className="flex min-h-[2.5rem] items-center">{children}</div>
      </div>
      <div className={pillClass}>
        <p className={`text-[1.02rem] leading-snug text-ink ${compact ? 'min-w-0 grow basis-[calc(100%-4.5rem)] sm:basis-auto sm:grow-0' : ''}`}>{text}</p>
        <PronunciationControl label="Hear instructions" accent={activity.accent} variant="ghost" onPlay={() => speak(text)} collapse={compact} className={compact ? 'shrink-0 max-sm:contents' : undefined} />
      </div>
    </header>
  );
}
