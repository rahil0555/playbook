import { useEffect, useRef } from 'react';
import { animate, motion, useMotionValue, useTransform, type MotionStyle } from 'framer-motion';
import { bezier, clamp, controlPoint, flightDuration, flightRotation, flightScale, LANDING_SCALE, type Point, type Pose } from './flightPath';
import { LetterTileFace } from '../components/LetterTile';

export interface Flight {
  /** the tile that is travelling */
  id: string;
  value: string;
  color: string;
  slotIndex: number;
  /** bumped on "start again" so a stale flight never lands in the new round */
  generation: number;
  from: Pose;
  /** centre of the target slot, relative to the scene */
  to: Point;
  /** what the travelling copy looks like: the plain tile (the default), or the letter's monster */
}

/** Trail copies behind the bubble: how far behind (in flight progress) and how faint. */
const TRAIL = [
  { lag: 0.07, opacity: 0.3, scale: 0.9 },
  { lag: 0.14, opacity: 0.2, scale: 0.78 },
  { lag: 0.21, opacity: 0.1, scale: 0.66 },
] as const;

interface FlyingTileProps {
  flight: Flight;
  onLand: (flight: Flight) => void;
  onDone: (flight: Flight) => void;
}

/**
 * A copy of a tile that flies from where it was to its slot. Shared by Magic Letters, Missing Letter and Sentence Fun.
 * The SAME bubble the child picked up, flying on its own layer from where it really was to its slot.
 * It is a copy of the tray bubble (same size, colours and letter), positioned over the scene.
 * It never blocks the pointer. When it arrives it hands over to the slot (`onLand`) and fades out
 * while the slot's own letter squashes in at exactly the same spot (`onDone` removes it).
 * Only transforms and opacity animate, so it stays on the compositor and causes no layout shift.
 */
export function FlyingTile({ flight, onLand, onDone }: FlyingTileProps) {
  const { from, to, color, value, slotIndex } = flight;
  const start: Point = { x: from.cx, y: from.cy };
  const control = controlPoint(start, to, slotIndex);
  const distance = Math.hypot(to.x - start.x, to.y - start.y);

  const p = useMotionValue(0);
  const fade = useMotionValue(1);
  const x = useTransform(p, (t) => bezier(start, control, to, t).x - from.w / 2);
  const y = useTransform(p, (t) => bezier(start, control, to, t).y - from.h / 2);
  const scale = useTransform(p, (t) => flightScale(t, from.scale, LANDING_SCALE));
  const rotate = useTransform(p, (t) => flightRotation(t, from.rot));

  const cb = useRef({ onLand, onDone });
  cb.current = { onLand, onDone };

  useEffect(() => {
    let landed = false;
    let fading: ReturnType<typeof animate> | undefined;
    const run = animate(p, 1, {
      duration: flightDuration(distance),
      ease: [0.3, 0.2, 0.2, 1],
      onComplete: () => {
        if (landed) return;
        landed = true;
        cb.current.onLand(flight);
        fading = animate(fade, 0, { duration: 0.18, ease: 'easeOut', onComplete: () => cb.current.onDone(flight) });
      },
    });
    return () => {
      run.stop();
      fading?.stop();
    };
    // one flight = one run; the geometry is fixed when it is created
  }, []);

  const box = { width: from.w, height: from.h } as const;
  return (
    <span aria-hidden="true" data-magic-flight={flight.id} data-value={value} className="pointer-events-none absolute left-0 top-0 z-30">
      {TRAIL.map((t, i) => (
        <TrailCopy key={i} p={p} lag={t.lag} opacity={t.opacity} scale={t.scale} start={start} control={control} to={to} from={from} color={color} />
      ))}
      <motion.span className="absolute left-0 top-0 will-change-transform" style={{ ...box, x, y, scale, rotate, opacity: fade, '--tile': color } as unknown as MotionStyle}>
        <LetterTileFace text={value} color={color} />
      </motion.span>
    </span>
  );
}

function TrailCopy({ p, lag, opacity, scale, start, control, to, from, color }: { p: ReturnType<typeof useMotionValue<number>>; lag: number; opacity: number; scale: number; start: Point; control: Point; to: Point; from: Pose; color: string }) {
  const x = useTransform(p, (t) => bezier(start, control, to, clamp(t - lag, 0, 1)).x - from.w / 2);
  const y = useTransform(p, (t) => bezier(start, control, to, clamp(t - lag, 0, 1)).y - from.h / 2);
  const o = useTransform(p, (t) => (t <= lag + 0.01 || t >= 0.94 ? 0 : opacity));
  return (
    <motion.span
      className="absolute left-0 top-0 rounded-[1.6rem] will-change-transform"
      style={{ width: from.w, height: from.h, x, y, scale, opacity: o, backgroundColor: color }}
    />
  );
}
