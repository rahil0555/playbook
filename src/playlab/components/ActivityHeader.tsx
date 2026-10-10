import type { ReactNode } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { getActivity } from '../data/activities';
import { useSpeech } from '../hooks/useAudio';
import { Illustration } from '../illustrations/Illustration';
import { ACCENTS } from '../lib/accents';
import type { ActivityId } from '../types/learning';
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

/** Title, instruction (with read-aloud), back-to-home and an optional progress slot. */
export function ActivityHeader({ activityId, instruction, title, children, back }: ActivityHeaderProps) {
  const { navigate } = usePlayLab();
  const { speak } = useSpeech();
  const activity = getActivity(activityId);
  const a = ACCENTS[activity.accent];
  const text = instruction ?? activity.instruction;
  return (
    <header className="mb-4 sm:mb-7">
      <div className="mb-3 flex sm:mb-4 flex-wrap items-center gap-2">
        <Button variant="secondary" accent={activity.accent} icon="arrow-left" onClick={() => navigate('home')} aria-label="Back to home">
          Home
        </Button>
        {back ? (
          <Button variant="ghost" accent={activity.accent} onClick={back.onClick}>
            {back.label}
          </Button>
        ) : null}
      </div>
      <div className="flex items-start gap-3 sm:gap-4">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-3xl ${a.soft} sm:h-16 sm:w-16`}>
          <Illustration name={activity.illustration} className="h-10 w-10 sm:h-12 sm:w-12" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[1.7rem] font-bold leading-tight text-ink sm:text-4xl">{title ?? activity.title}</h1>
          <p className="mt-1 text-[1.02rem] leading-snug text-ink-soft">{text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <PronunciationControl label="Hear instructions" accent={activity.accent} variant="ghost" onPlay={() => speak(text)} className="-ml-3" />
            {children}
          </div>
        </div>
      </div>
    </header>
  );
}
