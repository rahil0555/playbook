import { memo, useId } from 'react';
import type { IllustrationId } from '../types/learning';
import { ART } from './art';

interface IllustrationProps {
  name: IllustrationId;
  /** Accessible label. Omit for purely decorative use (hidden from screen readers). */
  label?: string;
  className?: string;
}

/** Inline SVG illustration. Lightweight (no network request) and themeable via CSS size. */
export const Illustration = memo(function Illustration({ name, label, className }: IllustrationProps) {
  const uid = useId().replace(/:/g, '');
  const art = ART[name];
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {art(uid)}
    </svg>
  );
});

export const ILLUSTRATION_IDS = Object.keys(ART) as IllustrationId[];
