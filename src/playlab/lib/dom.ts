import type { PanInfo } from 'framer-motion';

/**
 * The first element matching `selector` under the pointer at the end of a drag.
 * `elementsFromPoint` sees through the dragged element itself, so the drop
 * target underneath is found even though the tile is on top.
 */
export function elementUnder(info: PanInfo, selector: string): HTMLElement | null {
  if (typeof document === 'undefined' || !document.elementsFromPoint) return null;
  const x = info.point.x - window.scrollX;
  const y = info.point.y - window.scrollY;
  for (const el of document.elementsFromPoint(x, y)) {
    const hit = (el as HTMLElement).closest?.(selector) as HTMLElement | null;
    if (hit) return hit;
  }
  return null;
}
