import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Illustration } from '../illustrations/Illustration';
import { springs } from '../motion/variants';
import type { ActivityDefinition, ActivityProgress } from '../types/learning';
import { Icon } from './Icon';

interface ActivityCardProps {
  activity: ActivityDefinition;
  progress: ActivityProgress;
  onOpen: () => void;
  /** position on the home screen, used to stagger the entrance */
  index?: number;
  /** the station number on the adventure trail (1-based) */
  station?: number;
}

/** Each activity has its own little world on its card: a coloured sky with a glowing picture frame. */
const WORLD: Record<string, { sky: string; gem: string }> = {
  coral: { sky: 'linear-gradient(180deg,#ffd9cf,#ffb9a6)', gem: '#e8573f' },
  sky: { sky: 'linear-gradient(180deg,#cfe9ff,#9fd0f7)', gem: '#2f8fd8' },
  brand: { sky: 'linear-gradient(180deg,#c9f2e4,#8fe0c6)', gem: '#16a286' },
  sun: { sky: 'linear-gradient(180deg,#fff0bd,#ffd66b)', gem: '#d9741c' },
  plum: { sky: 'linear-gradient(180deg,#e4d6ff,#c3a8f2)', gem: '#8a5cc7' },
};

/** A real button: the whole card opens the activity. */
export function ActivityCard({ activity, progress, onOpen, index = 0, station }: ActivityCardProps) {
  const w = WORLD[activity.accent] ?? WORLD.brand!;
  const played = progress.started > 0;
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.bouncy, delay: 0.08 * index }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
      data-activity={activity.id}
      className="pl-paper group flex h-full w-full flex-col overflow-hidden rounded-[2rem] text-left"
    >
      <span className="relative flex h-36 items-center justify-center" style={{ background: w.sky }}>
        {station ? (
          <span aria-hidden="true" className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full border-[3px] border-sun-500 bg-white font-display text-xl font-bold text-ink shadow-soft">
            {station}
          </span>
        ) : null}
        <span aria-hidden="true" className="pl-twinkle absolute left-16 top-5 text-xl text-white">✦</span>
        <span aria-hidden="true" className="pl-twinkle absolute right-8 top-8 text-base text-white" style={{ animationDelay: '1.3s' }}>✦</span>
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-8 rounded-t-[100%] bg-white/45" />
        <span className="pl-frame relative grid h-24 w-24 place-items-center rounded-[1.6rem] transition-transform group-hover:-rotate-3">
          <Illustration name={activity.illustration} className="h-16 w-16" />
        </span>
        {progress.bestStars > 0 ? (
          <span role="img" className="absolute right-3 top-3 flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-1 text-sun-700" aria-label={`Best: ${progress.bestStars} of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <Icon key={n} name="star" size={16} filled={n <= progress.bestStars} className={n <= progress.bestStars ? 'text-sun-500' : 'text-black/20'} />
            ))}
          </span>
        ) : null}
      </span>
      <span className="flex flex-1 flex-col px-4 pb-4 pt-3 sm:px-5">
        <span className="block font-display text-2xl font-bold leading-tight text-ink">{activity.title}</span>
        <span className="mt-1 block text-[0.98rem] leading-snug text-ink-soft">{activity.tagline}</span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="text-sm font-semibold text-ink-soft">{played ? `Played ${progress.started} time${progress.started === 1 ? '' : 's'}` : 'New!'}</span>
          <span className="pl-gem inline-flex min-h-[2.9rem] items-center gap-1.5 rounded-full px-5 font-display text-base font-semibold" style={{ '--gem': w.gem } as CSSProperties}>
            {activity.cta}
            <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </span>
    </motion.button>
  );
}
