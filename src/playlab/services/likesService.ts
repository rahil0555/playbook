/**
 * "Love it" hearts: letters, words and sentences a child has liked. Per-device convenience only (no personal data),
 * stored per learner. Every storage access is guarded, and when storage is unavailable the in-memory value still
 * keeps the heart working for the rest of the visit.
 */

export type LikeKind = 'letter' | 'word' | 'sentence';
export interface Like {
  kind: LikeKind;
  /** stable content id: a letter id ('a'), a word id, or a sentence id */
  id: string;
  /** what to show and speak back, e.g. "Aa", "apple" or the sentence text */
  label: string;
}

export const LIKE_LIMIT = 60;
const KIND_LIST: readonly LikeKind[] = ['letter', 'word', 'sentence'];
const KEY = 'edurance.playlab.likes.v1';

export const likeKey = (learnerId?: string): string => (learnerId ? `${KEY}:${learnerId}` : KEY);

/** Accepts whatever is in storage and keeps only well-formed, de-duplicated entries (newest first). */
export function normalizeLikes(raw: unknown): Like[] {
  if (!Array.isArray(raw)) return [];
  const out: Like[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { kind, id, label } = item as Record<string, unknown>;
    if (!KIND_LIST.includes(kind as LikeKind) || typeof id !== 'string' || typeof label !== 'string') continue;
    if (id.length === 0 || id.length > 120 || label.length === 0 || label.length > 200) continue;
    const k = `${kind}:${id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ kind: kind as LikeKind, id, label });
  }
  return out.slice(0, LIKE_LIMIT);
}

export const isLiked = (likes: readonly Like[], kind: LikeKind, id: string): boolean => likes.some((l) => l.kind === kind && l.id === id);

/* Stable snapshots for useSyncExternalStore: the same raw string always yields the same array reference. */
const EMPTY: Like[] = [];
const lastRaw = new Map<string, string | null>();
const lastParsed = new Map<string, Like[]>();
const listeners = new Set<() => void>();
/** keys whose latest save could not reach storage: their in-memory list is the truth for this visit */
const memoryOnly = new Set<string>();

export function readLikes(key: string): Like[] {
  if (memoryOnly.has(key)) return lastParsed.get(key) ?? EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  if (lastRaw.has(key) && lastRaw.get(key) === raw) return lastParsed.get(key) ?? EMPTY;
  let parsed = EMPTY;
  if (raw) {
    try {
      parsed = normalizeLikes(JSON.parse(raw));
    } catch {
      parsed = EMPTY;
    }
  }
  lastRaw.set(key, raw);
  lastParsed.set(key, parsed);
  return parsed;
}

function writeLikes(key: string, likes: Like[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(likes));
    memoryOnly.delete(key);
    lastRaw.delete(key);
  } catch {
    /* storage unavailable: keep the heart working in memory for this visit */
    memoryOnly.add(key);
  }
  lastParsed.set(key, likes);
  listeners.forEach((l) => l());
}

/** Adds the like if it is not there yet, removes it if it is. Returns the new list. */
export function toggleLike(key: string, like: Like): Like[] {
  const current = readLikes(key);
  const next = isLiked(current, like.kind, like.id)
    ? current.filter((l) => !(l.kind === like.kind && l.id === like.id))
    : [like, ...current].slice(0, LIKE_LIMIT);
  writeLikes(key, next);
  return next;
}

export function subscribeLikes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tests only: forget the in-memory cache between cases. */
export function resetLikesCache(): void {
  lastRaw.clear();
  lastParsed.clear();
  memoryOnly.clear();
}
