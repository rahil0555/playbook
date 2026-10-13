/**
 * Small pure helpers for the Magic Letters "feel": a repeat gate so that rapid taps never stack the same sound or the
 * same spoken phonics sound. Kept free of React and audio so it can be unit-tested directly.
 */
export interface RepeatGate {
  /** true when `key` has not fired within the last `gapMs`; records the time when it returns true */
  allow(key: string, now?: number): boolean;
  reset(): void;
}

export function createRepeatGate(gapMs: number): RepeatGate {
  const last = new Map<string, number>();
  return {
    allow(key, now = Date.now()) {
      const prev = last.get(key);
      if (prev !== undefined && now - prev < gapMs) return false;
      last.set(key, now);
      return true;
    },
    reset() {
      last.clear();
    },
  };
}

/** Tap sounds: at most one pop every ~110 ms, however fast the child taps. */
export const tapSoundGate = createRepeatGate(110);
/** Spoken phonics sound for a letter: not again for the same letter within 1.4 s. */
export const PHONICS_GAP_MS = 1400;
/** Wait this long after the pop before the phonics sound starts, so the two never overlap. */
export const PHONICS_DELAY_MS = 170;
