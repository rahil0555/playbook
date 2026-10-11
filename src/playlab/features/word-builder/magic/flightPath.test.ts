import { describe, expect, it } from 'vitest';
import { bezier, controlPoint, flightDuration, flightRotation, flightScale, parseTransform } from './flightPath';

describe('flightPath', () => {
  it('keeps every flight between 340 and 520 ms', () => {
    expect(flightDuration(0)).toBeCloseTo(0.34);
    expect(flightDuration(300)).toBeGreaterThanOrEqual(0.34);
    expect(flightDuration(5000)).toBeCloseTo(0.52);
  });

  it('starts at the start, ends at the end, and curves in between', () => {
    const a = { x: 100, y: 400 };
    const b = { x: 300, y: 100 };
    const c = controlPoint(a, b, 0);
    expect(bezier(a, c, b, 0)).toEqual(a);
    expect(bezier(a, c, b, 1)).toEqual(b);
    const mid = bezier(a, c, b, 0.5);
    const straight = { x: 200, y: 250 };
    expect(Math.hypot(mid.x - straight.x, mid.y - straight.y)).toBeGreaterThan(5);
  });

  it('bows above the straight line whichever way the letter travels', () => {
    for (const bx of [320, -120, 100]) {
      const a = { x: 100, y: 400 };
      const b = { x: bx + 100, y: 100 };
      const c = controlPoint(a, b, 1);
      expect(c.y).toBeLessThanOrEqual((a.y + b.y) / 2 + 0.001);
    }
  });

  it('scales from the start to the landing size and rotates back to upright', () => {
    expect(flightScale(0, 1.2, 1.3)).toBeCloseTo(1.2);
    expect(flightScale(1, 1.2, 1.3)).toBeCloseTo(1.3);
    expect(flightScale(0.5, 1, 1.3)).toBeGreaterThan(1.15);
    expect(flightRotation(0, -6)).toBeCloseTo(-6);
    expect(flightRotation(1, -6)).toBeCloseTo(0);
  });

  it('reads scale and rotation from a CSS matrix', () => {
    expect(parseTransform('none')).toEqual({ scale: 1, rot: 0 });
    const t = parseTransform('matrix(1.2, 0, 0, 1.2, 10, 20)');
    expect(t.scale).toBeCloseTo(1.2);
    expect(t.rot).toBeCloseTo(0);
    const r = parseTransform('matrix(0.9, -0.1, 0.1, 0.9, 0, 0)');
    expect(r.rot).toBeCloseTo(-6.34, 1);
  });
});
