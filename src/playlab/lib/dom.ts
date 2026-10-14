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

/**
 * The open element matching `selector` (one not marked `data-state="filled"`) whose centre is nearest to the centre of `el`,
 * if that centre is within 80% of the element's own width. Boxes are measured as they are now, so it works for any size of
 * word or screen, and while `el` is being dragged.
 */
export function nearestOpenSlot(el: HTMLElement | null, selector: string): HTMLElement | null {
  if (!el || typeof document === 'undefined') return null;
  const b = el.getBoundingClientRect();
  const cx = b.left + b.width / 2;
  const cy = b.top + b.height / 2;
  let best: { slot: HTMLElement; distance: number } | null = null;
  for (const slot of document.querySelectorAll<HTMLElement>(selector)) {
    if (slot.dataset.state === 'filled') continue;
    const r = slot.getBoundingClientRect();
    const distance = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
    if (distance <= r.width * 0.8 && (!best || distance < best.distance)) best = { slot, distance };
  }
  return best?.slot ?? null;
}

