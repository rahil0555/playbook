import { describe, expect, it } from 'vitest';
import { createRepeatGate, PHONICS_DELAY_MS, PHONICS_GAP_MS, tapSoundGate } from './magicFeel';

describe('createRepeatGate', () => {
  it('lets a key through once, then holds it back until the gap has passed', () => {
    const gate = createRepeatGate(1000);
    expect(gate.allow('p', 0)).toBe(true);
    expect(gate.allow('p', 400)).toBe(false); // a rapid second tap on the same letter
    expect(gate.allow('p', 999)).toBe(false);
    expect(gate.allow('p', 1000)).toBe(true); // gap passed: allowed again
  });

  it('keeps different keys apart', () => {
    const gate = createRepeatGate(1000);
    expect(gate.allow('p', 0)).toBe(true);
    expect(gate.allow('b', 10)).toBe(true);
  });

  it('a refused attempt does not restart the clock', () => {
    const gate = createRepeatGate(1000);
    gate.allow('p', 0);
    expect(gate.allow('p', 900)).toBe(false);
    expect(gate.allow('p', 1000)).toBe(true); // measured from 0, not from 900
  });

  it('reset forgets everything', () => {
    const gate = createRepeatGate(1000);
    gate.allow('p', 0);
    gate.reset();
    expect(gate.allow('p', 1)).toBe(true);
  });
});

describe('magic feel timings', () => {
  it('the pop gate lets a tap through at a comfortable tapping speed but not in a burst', () => {
    const gate = createRepeatGate(110);
    expect(gate.allow('tap', 0)).toBe(true);
    expect(gate.allow('tap', 50)).toBe(false);
    expect(gate.allow('tap', 200)).toBe(true);
  });

  it('the phonics sound waits for the pop and is not repeated within 1.4 s', () => {
    expect(PHONICS_DELAY_MS).toBeGreaterThan(0);
    expect(PHONICS_DELAY_MS).toBeLessThan(300);
    expect(PHONICS_GAP_MS).toBe(1400);
    expect(tapSoundGate).toBeDefined();
  });
});
