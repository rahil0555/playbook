import { motion } from 'framer-motion';
import { ACCENTS } from '../lib/accents';
import { Illustration } from '../illustrations/Illustration';
import { springs } from '../motion/variants';
import type { ActivityDefinition, ActivityProgress } from '../types/learning';
import { Icon } from './Icon';

interface ActivityCardProps {
  activity: ActivityDefinition;
  progress: ActivityProgress;
  onOpen: () => void;
}

/** A real button: the whole card opens the activity. */
export function ActivityCard({ activity, progress, onOpen }: ActivityCardProps) {
  const a = ACCENTS[activity.accent];
  const played = progress.started > 0;
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={springs.snappy}
      data-activity={activity.id}
      className={`group flex h-full w-full flex-col rounded-4xl border-2 border-transparent p-4 text-left shadow-soft ${a.soft} hover:border-black/10 sm:p-5`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/80">
          <Illustration name={activity.illustration} className="h-14 w-14" />
        </span>
        {progress.bestStars > 0 ? (
          <span role="img" className="flex items-center gap-0.5 rounded-full bg-white/80 px-2 py-1 text-sun-700" aria-label={`Best: ${progress.bestStars} of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <Icon key={n} name="star" size={16} filled={n <= progress.bestStars} className={n <= progress.bestStars ? 'text-sun-500' : 'text-black/20'} />
            ))}
          </span>
        ) : null}
      </span>
      <span className="mt-3 block font-display text-2xl font-bold leading-tight text-ink">{activity.title}</span>
      <span className="mt-1 block text-[0.98rem] leading-snug text-ink-soft">{activity.tagline}</span>
      <span className="mt-auto flex items-center justify-between pt-4">
        <span className="text-sm font-semibold text-ink-soft">{played ? `Played ${progress.started} time${progress.started === 1 ? '' : 's'}` : 'New!'}</span>
        <span className={`inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full px-4 font-display text-base font-semibold ${a.solid} ${a.solidText}`}>
          {activity.cta}
          <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </motion.button>
  );
}
