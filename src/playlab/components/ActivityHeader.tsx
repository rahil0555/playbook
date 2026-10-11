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
}

/** A hanging wooden title sign, a Home button, the adventure-trail progress, and the instruction with read-aloud. */
export function ActivityHeader({ activityId, instruction, title, children, back }: ActivityHeaderProps) {
  const { navigate } = usePlayLab();
  const { speak } = useSpeech();
  const activity = getActivity(activityId);
  const text = instruction ?? activity.instruction;
  return (
    <header className="relative z-10 mb-3 sm:mb-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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
          className="pl-wood order-first flex w-full items-center justify-center gap-3 rounded-[1.6rem] px-5 py-2 sm:order-none sm:w-auto sm:px-8 sm:py-2.5"
        >
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/90 shadow-[inset_0_-3px_0_rgba(0,0,0,0.08)] sm:h-12 sm:w-12">
            <Illustration name={activity.illustration} className="h-8 w-8 sm:h-10 sm:w-10" />
          </span>
          <h1 className="font-display text-[1.7rem] font-bold leading-none tracking-tight sm:text-[2.2rem]">{title ?? activity.title}</h1>
        </motion.div>
        <div className="flex min-h-[2.5rem] items-center">{children}</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1 rounded-[1.8rem] bg-white/85 px-4 py-1 text-center shadow-soft sm:mx-auto sm:w-fit">
        <p className="text-[1.02rem] leading-snug text-ink">{text}</p>
        <PronunciationControl label="Hear instructions" accent={activity.accent} variant="ghost" onPlay={() => speak(text)} />
      </div>
    </header>
  );
}
