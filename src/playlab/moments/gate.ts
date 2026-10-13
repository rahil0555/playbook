/**
 * A repeat gate: a key may fire once per gap, so rapid taps never stack the same sound. Pure (no React, no audio).
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
