export type Rng = () => number;

/** Small deterministic PRNG so tests (and screenshots) can be reproducible. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function sample<T>(items: readonly T[], count: number, rng: Rng = Math.random): T[] {
  return shuffle(items, rng).slice(0, count);
}

/**
 * Pick `count` items, preferring ones whose id is not in `seen` so that
 * "Play again" shows fresh questions until the pool is used up.
 */
export function pickFresh<T extends { id: string }>(
  pool: readonly T[],
  count: number,
  seen: ReadonlySet<string>,
  rng: Rng = Math.random,
): T[] {
  const fresh = pool.filter((p) => !seen.has(p.id));
  const stale = pool.filter((p) => seen.has(p.id));
  const picked = shuffle(fresh, rng).slice(0, count);
  if (picked.length < count) picked.push(...shuffle(stale, rng).slice(0, count - picked.length));
  return shuffle(picked, rng);
}
