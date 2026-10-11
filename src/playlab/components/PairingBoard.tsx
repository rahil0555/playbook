import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
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
  /** Colour (hex) for a glossy candy card with white text. Omit for a parchment card (pictures). */
  tone?: string;
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
interface Line {
  key: string;
  d: string;
  kind: 'match' | 'miss';
}

/**
 * Two columns of cards. Pair them by tapping one on each side (either order),
 * or by dragging a left card onto a right card. A pair that matches is joined by a glowing rope of light that
 * stays; a miss gets a soft, short-lived dotted line and a wobble.
 */
export function PairingBoard({ left, right, matched, wrong, onAttempt, leftTitle, rightTitle }: PairingBoardProps) {
  const { reducedMotion } = usePlayLab();
  const [sel, setSel] = useState<Sel>(null);
  const dragging = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);

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

  /** Measure the cards and rebuild the connecting lines (matched pairs + the last miss). */
  const measure = useCallback(() => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    const edge = (id: string, side: 'left' | 'right') => {
      const el = root.current?.querySelector(`[data-card="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: (side === 'left' ? r.right : r.left) - box.left, y: r.top + r.height / 2 - box.top };
    };
    const next: Line[] = [];
    const add = (l: PairItem | undefined, r: PairItem | undefined, kind: Line['kind']) => {
      if (!l || !r) return;
      const a = edge(l.id, 'left');
      const b = edge(r.id, 'right');
      if (!a || !b) return;
      const mx = (a.x + b.x) / 2;
      next.push({ key: `${kind}-${l.id}-${r.id}`, kind, d: `M${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}` });
    };
    for (const l of left) if (matched.has(l.pairId)) add(l, right.find((r) => r.pairId === l.pairId), 'match');
    if (wrong) add(left.find((i) => i.id === wrong.left), right.find((i) => i.id === wrong.right), 'miss');
    setLines(next);
  }, [left, right, matched, wrong]);

  useLayoutEffect(() => {
    measure();
    const ro = typeof ResizeObserver !== 'undefined' && root.current ? new ResizeObserver(measure) : null;
    if (ro && root.current) ro.observe(root.current);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const card = (side: 'left' | 'right', item: PairItem) => {
    const done = matched.has(item.pairId);
    const selected = sel?.id === item.id;
    const bad = wrong?.[side] === item.id;
    // the other column invites a choice while one card is picked up
    const inviting = !!sel && sel.side !== side && !done;
    const gem = item.tone ? ({ '--gem': item.tone } as CSSProperties) : ({ '--gem': '#16a286' } as CSSProperties);
    return (
      <motion.button
        type="button"
        data-card={item.id}
        data-pair-id={item.pairId}
        data-right-id={side === 'right' ? item.id : undefined}
        data-side={side}
        disabled={done}
        aria-pressed={selected}
        aria-label={done ? `${item.label}, matched` : item.label}
        initial={{ opacity: 0, y: 14, scale: 0.92 }}
        animate={
          bad
            ? { opacity: 1, x: [0, -8, 7, -5, 3, 0], y: 0, scale: 1 }
            : done
              ? { opacity: 1, y: 0, scale: [1, 1.12, 1] }
              : selected
                ? { opacity: 1, scale: 1.07, y: -4 }
                : { opacity: 1, x: 0, y: 0, scale: 1 }
        }
        transition={bad ? { duration: 0.45 } : done ? { duration: 0.5 } : springs.bouncy}
        whileHover={done || reducedMotion ? undefined : { y: -3 }}
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
        style={gem}
        className={`pl-draggable relative flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-[1.6rem] px-3 py-1.5 font-display text-xl font-bold sm:min-h-[4.75rem] ${
          done ? 'pl-gem-soft !border-brand-400 !bg-[#e6fbf3] text-brand-900' : item.tone ? 'pl-gem' : 'pl-gem-soft text-ink'
        } ${selected ? 'ring-4 ring-white' : ''}`}
      >
        {inviting && !reducedMotion ? <span aria-hidden="true" className="pl-aura pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] bg-[radial-gradient(circle,rgba(255,224,120,0.9),rgba(255,255,255,0)_70%)]" /> : null}
        {item.content}
        {done ? (
          <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-white shadow-chunk">
            <Icon name="check" size={18} />
          </span>
        ) : null}
      </motion.button>
    );
  };

  const column = (title: string, items: PairItem[], side: 'left' | 'right') => (
    <div>
      <h2 className="pl-wood mx-auto mb-4 w-fit rounded-full px-5 py-1 text-center font-display text-lg font-bold sm:text-xl">{title}</h2>
      <ul className="space-y-3" aria-label={title}>
        {items.map((i) => (
          <li key={i.id}>{card(side, i)}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={root} className="relative grid grid-cols-2 gap-x-9 sm:gap-x-20">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" focusable="false">
        <AnimatePresence>
          {lines.map((l) =>
            l.kind === 'match' ? (
              <g key={l.key}>
                <motion.path d={l.d} fill="none" stroke="#ffe27a" strokeWidth="14" strokeLinecap="round" opacity="0.55" initial={{ pathLength: reducedMotion ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
                <motion.path d={l.d} fill="none" stroke="#16a286" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 9" initial={{ pathLength: reducedMotion ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
              </g>
            ) : (
              <motion.path key={l.key} d={l.d} fill="none" stroke="#f08a3c" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 10" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />
            ),
          )}
        </AnimatePresence>
      </svg>
      <div className="relative z-10">{column(leftTitle, left, 'left')}</div>
      <div className="relative z-10">{column(rightTitle, right, 'right')}</div>
    </div>
  );
}
