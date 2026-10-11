import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isLiked, likeKey, LIKE_LIMIT, normalizeLikes, readLikes, resetLikesCache, toggleLike } from './likesService';

const KEY = likeKey();

beforeEach(() => {
  window.localStorage.clear();
  resetLikesCache();
});
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  resetLikesCache();
});

describe('normalizeLikes', () => {
  it('keeps well-formed entries and drops everything else', () => {
    const out = normalizeLikes([
      { kind: 'letter', id: 'm', label: 'Mm' },
      { kind: 'word', id: 'apple', label: 'apple' },
      { kind: 'nonsense', id: 'x', label: 'x' }, // unknown kind
      { kind: 'word', id: '', label: 'empty id' }, // empty id
      { kind: 'word', id: 'cat', label: 42 }, // label not text
      'not an object',
      null,
    ]);
    expect(out.map((l) => `${l.kind}:${l.id}`)).toEqual(['letter:m', 'word:apple']);
  });

  it('de-duplicates, rejects anything that is not an array, and caps the list', () => {
    expect(normalizeLikes({ kind: 'letter' })).toEqual([]);
    expect(normalizeLikes([{ kind: 'letter', id: 'a', label: 'Aa' }, { kind: 'letter', id: 'a', label: 'Aa' }])).toHaveLength(1);
    const many = Array.from({ length: LIKE_LIMIT + 10 }, (_, i) => ({ kind: 'word', id: `w${i}`, label: `w${i}` }));
    expect(normalizeLikes(many)).toHaveLength(LIKE_LIMIT);
  });

  it('ignores over-long text so a bad save cannot flood the screen', () => {
    expect(normalizeLikes([{ kind: 'sentence', id: 's1', label: 'x'.repeat(201) }])).toEqual([]);
  });
});

describe('toggleLike', () => {
  it('adds a like, puts the newest first, and removes it on the second toggle', () => {
    toggleLike(KEY, { kind: 'letter', id: 'a', label: 'Aa' });
    toggleLike(KEY, { kind: 'word', id: 'cat', label: 'cat' });
    expect(readLikes(KEY).map((l) => l.id)).toEqual(['cat', 'a']);
    expect(isLiked(readLikes(KEY), 'word', 'cat')).toBe(true);

    toggleLike(KEY, { kind: 'word', id: 'cat', label: 'cat' });
    expect(isLiked(readLikes(KEY), 'word', 'cat')).toBe(false);
    expect(readLikes(KEY).map((l) => l.id)).toEqual(['a']);
  });

  it('keeps letters, words and sentences with the same id apart', () => {
    toggleLike(KEY, { kind: 'letter', id: 'a', label: 'Aa' });
    expect(isLiked(readLikes(KEY), 'word', 'a')).toBe(false);
  });

  it('stores per learner, so two children on one device do not share their hearts', () => {
    toggleLike(likeKey('maya'), { kind: 'letter', id: 'm', label: 'Mm' });
    expect(readLikes(likeKey('maya'))).toHaveLength(1);
    expect(readLikes(likeKey('sam'))).toEqual([]);
    expect(readLikes(likeKey())).toEqual([]);
  });

  it('keeps a stable array reference while nothing changes (needed by useSyncExternalStore)', () => {
    toggleLike(KEY, { kind: 'letter', id: 'b', label: 'Bb' });
    expect(readLikes(KEY)).toBe(readLikes(KEY));
  });

  it('still works in memory when storage is blocked or full', () => {
    vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => toggleLike(KEY, { kind: 'letter', id: 'c', label: 'Cc' })).not.toThrow();
    expect(readLikes(KEY).map((l) => l.id)).toEqual(['c']);
  });

  it('reads nothing and does not crash when reading storage throws', () => {
    vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readLikes(KEY)).toEqual([]);
  });

  it('ignores corrupt saved JSON', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(readLikes(KEY)).toEqual([]);
  });
});
