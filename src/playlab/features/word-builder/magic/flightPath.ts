/**
 * Pure geometry for the Magic Letters "flying letter": a slightly curved path from where the
 * bubble really is (tray position, or the spot a drag was released) to the centre of its slot.
 * No DOM or React in here, so it is unit-tested directly.
 */

export interface Point {
  x: number;
  y: number;
}

/** Where a bubble is right now, relative to the scene: centre, layout size, and its current scale and rotation. */
export interface Pose {
  cx: number;
  cy: number;
  w: number;
  h: number;
  scale: number;
  /** degrees */
  rot: number;
}

/** The slot's landed tile is the same size as a tray tile, so the flying copy settles at exactly 1. */
export const LANDING_SCALE = 1;

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Quick but readable: about 340 ms for a short hop, 520 ms at most. */
export function flightDuration(distance: number): number {
  return clamp(0.3 + distance / 2600, 0.34, 0.52);
}

/** Control point of the quadratic curve: the midpoint pushed sideways so the arc bows upward. */
export function controlPoint(a: Point, b: Point, index: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const sign = dx > 24 ? 1 : dx < -24 ? -1 : index % 2 === 0 ? 1 : -1;
  // rotate the direction by ±90°; for the dx<-24 case the same formula with the flipped sign bows upward too
  const nx = (dy / len) * sign;
  const ny = (-dx / len) * sign;
  const bow = Math.min(72, len * 0.22);
  return { x: (a.x + b.x) / 2 + nx * bow, y: (a.y + b.y) / 2 + ny * bow };
}

export function bezier(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/** Eases from the start scale to the landing scale with a small lift in the middle of the flight. */
export function flightScale(t: number, from: number, to: number): number {
  return lerp(from, to, t) + 0.14 * Math.sin(Math.PI * t);
}

/** Unwinds the drag tilt on the way, with a tiny playful wiggle that dies out. */
export function flightRotation(t: number, from: number): number {
  return lerp(from, 0, t) + 7 * Math.sin(Math.PI * 2 * t) * (1 - t);
}

/** Read scale and rotation (degrees) from a CSS transform matrix string; identity when unknown. */
export function parseTransform(transform: string): { scale: number; rot: number } {
  const m = /^matrix(?:3d)?\(([^)]+)\)$/.exec(transform.trim());
  if (!m || !m[1]) return { scale: 1, rot: 0 };
  const n = m[1].split(',').map((v) => parseFloat(v));
  const a = n[0] ?? 1;
  const b = n[1] ?? 0;
  if (![a, b].every(Number.isFinite)) return { scale: 1, rot: 0 };
  return { scale: Math.hypot(a, b) || 1, rot: (Math.atan2(b, a) * 180) / Math.PI };
}
