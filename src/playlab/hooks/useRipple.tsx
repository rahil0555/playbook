import { useCallback, useState, type MouseEvent } from 'react';
import { usePlayLab } from '../app/PlayLabContext';

interface RippleSpec {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

let rippleId = 0;
const MAX_RIPPLES = 2;

/**
 * Touch/click/keyboard ripple. `onRippleClick` places the ripple under the
 * pointer (or at the centre for keyboard activation, where clientX is 0).
 * At most 2 ripples exist at once; each removes itself when its CSS animation ends.
 * With reduced motion a short opacity-only flash is used instead.
 */
export function useRipple(color = 'currentColor') {
  const { reducedMotion } = usePlayLab();
  const [ripples, setRipples] = useState<RippleSpec[]>([]);

  const onRippleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const keyboard = event.detail === 0 || (event.clientX === 0 && event.clientY === 0);
      const x = keyboard ? rect.width / 2 : event.clientX - rect.left;
      const y = keyboard ? rect.height / 2 : event.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2.2;
      setRipples((r) => [...r.slice(-(MAX_RIPPLES - 1)), { id: ++rippleId, x, y, size, color }]);
    },
    [color],
  );

  const remove = useCallback((id: number) => setRipples((r) => r.filter((x) => x.id !== id)), []);

  const layer = (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {reducedMotion
        ? ripples.map((r) => <span key={r.id} className="pl-flash" style={{ background: r.color, opacity: 0.2 }} onAnimationEnd={() => remove(r.id)} />)
        : ripples.map((r) => (
            <span
              key={r.id}
              className="pl-ripple"
              style={{ left: r.x, top: r.y, width: r.size, height: r.size, background: r.color }}
              onAnimationEnd={() => remove(r.id)}
            />
          ))}
    </span>
  );

  return { onRippleClick, rippleLayer: layer };
}
