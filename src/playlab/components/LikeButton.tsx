import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { useLikes } from '../hooks/useLikes';
import type { LikeKind } from '../services/likesService';
import { Icon } from './Icon';

const NOUN: Record<LikeKind, string> = { letter: 'letter', word: 'word', sentence: 'sentence' };

/** A big "Love it" heart. Tap once to keep it in "Things you love", tap again to take it back. */
export function LikeButton({ kind, id, label, className = '' }: { kind: LikeKind; id: string; label: string; className?: string }) {
  const { reducedMotion } = usePlayLab();
  const { isLiked, toggle } = useLikes();
  const liked = isLiked(kind, id);
  return (
    <motion.button
      type="button"
      data-like={kind}
      data-like-id={id}
      aria-pressed={liked}
      aria-label={liked ? `Loved: ${label}. Tap to take it out of things you love` : `Love this ${NOUN[kind]}`}
      onClick={() => toggle({ kind, id, label })}
      whileTap={reducedMotion ? undefined : { scale: 0.9 }}
      className={`pl-gem-soft inline-flex min-h-[3.25rem] items-center gap-2 rounded-full px-5 font-display text-lg font-semibold text-ink ${className}`}
      style={{ '--gem': '#f0655a' } as CSSProperties}
    >
      <motion.span
        aria-hidden="true"
        className="grid place-items-center"
        animate={liked && !reducedMotion ? { scale: [1, 1.45, 0.92, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Icon name="heart" size={24} filled={liked} className={liked ? 'text-coral-500' : 'text-coral-500/70'} />
      </motion.span>
      <span aria-hidden="true">{liked ? 'Loved!' : 'Love it'}</span>
    </motion.button>
  );
}
