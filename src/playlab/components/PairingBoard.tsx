import { useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { elementUnder } from '../lib/dom';
import { dragProps, springs } from '../motion/variants';
import { Icon } from './Icon';

export interface PairItem {
  id: string;
  /** items with the same pairId belong together */
  pairId: string;
  /** accessible name */
  label: string;
  content: ReactNode;
  /** runs when the item is picked, e.g. to play its sound */
  onActivate?: () => void;
}

interface PairingBoardProps {
  left: PairItem[];
  right: PairItem[];
  matched: ReadonlySet<string>;
  /** the last attempted wrong pair, shown briefly */
  wrong: { left: string; right: string } | null;
  onAttempt: (leftId: string, rightId: string) => void;
  leftTitle: string;
  rightTitle: string;
}

type Sel = { side: 'left' | 'right'; id: string } | null;

/**
 * Two columns of cards. Pair them by tapping one on each side (either order),
 * or by dragging a left card onto a right card. Matched cards lock in green.
 */
export function PairingBoard({ left, right, matched, wrong, onAttempt, leftTitle, rightTitle }: PairingBoardProps) {
  const [sel, setSel] = useState<Sel>(null);
  const dragging = useRef(false);

  const pick = (side: 'left' | 'right', item: PairItem) => {
    if (matched.has(item.pairId)) return;
    item.onActivate?.();
    if (!sel || sel.side === side) {
      setSel(sel && sel.id === item.id ? null : { side, id: item.id });
      return;
    }
    const [l, r] = side === 'right' ? [sel.id, item.id] : [item.id, sel.id];
    setSel(null);
    onAttempt(l, r);
  };

  const card = (side: 'left' | 'right', item: PairItem) => {
    const done = matched.has(item.pairId);
    const selected = sel?.id === item.id;
    const bad = wrong?.[side] === item.id;
    return (
      <motion.button
        type="button"
        data-pair-id={item.pairId}
        data-right-id={side === 'right' ? item.id : undefined}
        data-side={side}
        disabled={done}
        aria-pressed={selected}
        aria-label={done ? `${item.label}, matched` : item.label}
        animate={bad ? { x: [0, -8, 7, -5, 3, 0] } : selected ? { scale: 1.05, y: -2 } : { x: 0, y: 0, scale: 1 }}
        transition={bad ? { duration: 0.45 } : springs.bouncy}
        whileTap={done ? undefined : { scale: 0.95 }}
        {...(side === 'left' && !done
          ? {
              drag: true,
              dragSnapToOrigin: true,
              dragMomentum: dragProps.dragMomentum,
              dragElastic: dragProps.dragElastic,
              whileDrag: dragProps.whileDrag,
              onDragStart: () => {
                dragging.current = true;
                setSel(null);
              },
              onDragEnd: (_: unknown, info: Parameters<typeof elementUnder>[0]) => {
                const hit = elementUnder(info, '[data-right-id]');
                if (hit?.dataset.rightId) onAttempt(item.id, hit.dataset.rightId);
                setTimeout(() => (dragging.current = false), 0);
              },
            }
          : {})}
        onClick={() => {
          if (dragging.current) return;
          pick(side, item);
        }}
        className={`pl-draggable pl-chunk relative flex min-h-[4.75rem] w-full items-center justify-center gap-3 rounded-3xl border-[3px] px-3 py-2 font-display text-xl font-bold sm:min-h-[5.5rem] ${
          done ? 'border-brand-500 bg-brand-100 text-brand-900' : selected ? 'border-plum-500 bg-plum-100' : 'border-transparent bg-white'
        }`}
      >
        {item.content}
        {done ? (
          <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-white">
            <Icon name="check" size={18} />
          </span>
        ) : null}
      </motion.button>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-8">
      <div>
        <h2 className="mb-3 text-center font-display text-lg font-bold text-ink-soft">{leftTitle}</h2>
        <ul className="space-y-3 sm:space-y-4" aria-label={leftTitle}>
          {left.map((i) => (
            <li key={i.id}>{card('left', i)}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-3 text-center font-display text-lg font-bold text-ink-soft">{rightTitle}</h2>
        <ul className="space-y-3 sm:space-y-4" aria-label={rightTitle}>
          {right.map((i) => (
            <li key={i.id}>{card('right', i)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
