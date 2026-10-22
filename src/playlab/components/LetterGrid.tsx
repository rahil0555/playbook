import { memo, useCallback, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { letterColor } from '../lib/accents';
import { useRipple } from '../hooks/useRipple';
import { animationFor, letterAnimations, springs } from '../motion/variants';
import type { LetterEntry } from '../types/learning';
import { Icon } from './Icon';

interface LetterTileProps {
  letter: LetterEntry;
  index: number;
  selected: boolean;
  explored: boolean;
  /** passed down rather than read per tile: 26 context subscriptions would re-render the whole grid on every change */
  reducedMotion: boolean;
  onSelect: (letter: LetterEntry, index: number) => void;
}

const LetterTile = memo(function LetterTile({ letter, index, selected, explored, reducedMotion, onSelect }: LetterTileProps) {
  const controls = useAnimationControls();
  const color = letterColor(index);
  const { onRippleClick, rippleLayer } = useRipple(color);

  return (
    <motion.button
      type="button"
      data-letter={letter.id}
      aria-pressed={selected}
      aria-label={`Letter ${letter.upper}, ${letter.lower}${explored ? ', already explored' : ''}`}
      animate={controls}
      /* reduced motion: no press or hover movement; the selected ring and colour still show the choice */
      whileTap={reducedMotion ? undefined : { scale: 0.88 }}
      whileHover={reducedMotion ? undefined : { scale: 1.06 }}
      transition={springs.snappy}
      onClick={(e) => {
        onRippleClick(e);
        // tile reacts instantly with its own animation; the stage handles the rest
        const v = letterAnimations[animationFor(index)];
        void controls.start({ ...(v.idle as object) }, { duration: 0 }).then(() => controls.start(v.play as never));
        onSelect(letter, index);
      }}
      className={`relative flex aspect-square min-h-[3.5rem] w-full items-center justify-center overflow-hidden rounded-[1.4rem] font-display font-bold leading-none ${selected ? 'pl-gem' : 'pl-gem-soft'}`}
      style={{ '--gem': color, ...(selected ? {} : { color }) } as CSSProperties}
    >
      {rippleLayer}
      <span aria-hidden="true" className="relative flex items-baseline gap-0.5">
        <span className="text-[1.7rem] sm:text-[2rem]">{letter.upper}</span>
        <span className="text-[1.25rem] sm:text-[1.4rem]">{letter.lower}</span>
      </span>
      {explored && !selected ? (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 text-sun-500">
          <Icon name="star" size={13} filled />
        </span>
      ) : null}
    </motion.button>
  );
});

interface LetterGridProps {
  letters: LetterEntry[];
  selectedId: string | null;
  exploredIds: ReadonlySet<string>;
  onSelect: (letter: LetterEntry, index: number) => void;
  /** grid column classes; default fits a full-width panel */
  className?: string;
  label?: string;
}

/** Responsive A-Z grid with arrow-key navigation (Tab/Enter/Space also work). */
export function LetterGrid({
  letters,
  selectedId,
  exploredIds,
  onSelect,
  className = 'grid-cols-5 min-[440px]:grid-cols-6 md:grid-cols-9',
  label = 'Alphabet',
}: LetterGridProps) {
  const ref = useRef<HTMLUListElement>(null);
  const { reducedMotion } = usePlayLab();
  const handleSelect = useCallback((l: LetterEntry, i: number) => onSelect(l, i), [onSelect]);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const cols = ref.current ? getComputedStyle(ref.current).gridTemplateColumns.split(' ').length : 1;
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? cols : e.key === 'ArrowUp' ? -cols : 0;
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : Math.min(buttons.length - 1, Math.max(0, at + step));
    e.preventDefault();
    buttons[to]?.focus();
  };

  return (
    <ul ref={ref} aria-label={label} onKeyDown={onKeyDown} className={`pl-paper grid gap-2.5 rounded-[2rem] p-3 sm:gap-3 sm:p-4 ${className}`}>
      {letters.map((l, i) => (
        <li key={l.id}>
          <LetterTile letter={l} index={i} selected={selectedId === l.id} explored={exploredIds.has(l.id)} reducedMotion={reducedMotion} onSelect={handleSelect} />
        </li>
      ))}
    </ul>
  );
}
