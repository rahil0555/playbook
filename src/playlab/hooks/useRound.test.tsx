import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CELEBRATE_MAX_HOLD_MS, CELEBRATE_MS } from './useProgression';
import { useRound } from './useRound';

// The round moves on by itself after a right answer's celebration. A double tap, a repeated celebration or a late countdown must
// never move the child on twice or skip a question; progress and host callbacks are the things at stake.
const mocks = vi.hoisted(() => ({
  recordStart: vi.fn(),
  recordAnswer: vi.fn((answer: Record<string, unknown>) => ({ ...answer, timestamp: 1 })),
  recordCompletion: vi.fn((completion: Record<string, unknown>) => ({ ...completion, level: 'adventurer', timestamp: 1 })),
  audioStop: vi.fn(),
}));

vi.mock('../app/PlayLabContext', () => ({
  usePlayLab: () => ({ recordStart: mocks.recordStart, recordAnswer: mocks.recordAnswer, recordCompletion: mocks.recordCompletion, audio: { stop: mocks.audioStop } }),
}));

type Item = { id: string };
const three: Item[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

/** advance the fake clock by a whole celebration, in the act() that React needs */
const celebrationPasses = (ms = CELEBRATE_MS) => act(() => void vi.advanceTimersByTime(ms));

describe('useRound: a right answer moves the round on by itself', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.recordAnswer.mockClear();
    mocks.recordCompletion.mockClear();
    mocks.audioStop.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('after the celebration the next question comes, fresh: nothing solved, no attempts, the round still going', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => {
      result.current.submit('a', 'a', true);
      result.current.celebrate();
    });
    expect(result.current.index).toBe(0);
    celebrationPasses();
    expect(result.current.index).toBe(1);
    expect(result.current.current?.id).toBe('b');
    expect(result.current.solved).toBe(false);
    expect(result.current.attempts).toBe(0);
    expect(result.current.finished).toBe(false);
  });

  it('a question moves on exactly once, however many times its celebration is started', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => {
      result.current.submit('a', 'a', true);
      result.current.celebrate();
      result.current.celebrate();
      result.current.celebrate(Promise.resolve());
    });
    celebrationPasses();
    celebrationPasses();
    expect(result.current.index).toBe(1);
    expect(result.current.current?.id).toBe('b');
  });

  it('a wrong answer never moves the round on', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => {
      result.current.submit('x', 'a', false);
      result.current.celebrate(); // not solved: the countdown does not even start
    });
    celebrationPasses(CELEBRATE_MS * 5);
    expect(result.current.index).toBe(0);
    expect(result.current.attempts).toBe(1);
  });

  it('the celebration waits for the praise to be said, but never longer than the cap', async () => {
    let finishSpeaking!: () => void;
    const praise = new Promise<void>((resolve) => (finishSpeaking = resolve));
    const { result } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => {
      result.current.submit('a', 'a', true);
      result.current.celebrate(praise);
    });
    celebrationPasses(CELEBRATE_MS + 500);
    expect(result.current.index, 'still on the praised question while it is being said').toBe(0);
    await act(async () => finishSpeaking());
    expect(result.current.index, 'moves on once the praise has been said').toBe(1);

    const { result: stuck } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => {
      stuck.current.submit('a', 'a', true);
      stuck.current.celebrate(new Promise(() => undefined)); // a line that never reports that it ended
    });
    celebrationPasses(CELEBRATE_MAX_HOLD_MS);
    expect(stuck.current.index, 'the child is never held for ever').toBe(1);
  });

  it('a restart drops a celebration still counting down: nothing from the last round moves the new one on', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => {
      result.current.submit('a', 'a', true);
      result.current.celebrate();
    });
    act(() => result.current.restart());
    celebrationPasses(CELEBRATE_MS * 3);
    expect(result.current.index).toBe(0);
    expect(result.current.attempts).toBe(0);
  });
});

describe('useRound: the last question finishes the round', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.recordAnswer.mockClear();
    mocks.recordCompletion.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('the summary comes after the last celebration, and the round is recorded once, with its score', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => [{ id: 'only' }]));
    act(() => {
      result.current.submit('only', 'only', true);
      result.current.celebrate();
      result.current.celebrate();
    });
    expect(result.current.finished, 'no summary before the celebration is over').toBe(false);
    celebrationPasses();
    celebrationPasses();
    expect(result.current.finished).toBe(true);
    expect(mocks.recordCompletion).toHaveBeenCalledTimes(1);
    expect(mocks.recordCompletion.mock.calls[0]?.[0]).toMatchObject({ score: 1, total: 1 });
  });

  it('the round counts as finished when its last answer is right, even if the child leaves during the celebration', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => [{ id: 'only' }]));
    act(() => {
      result.current.submit('only', 'only', true);
      result.current.celebrate();
    });
    expect(mocks.recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('a restarted round can be finished again, and counts once', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => [{ id: 'only' }]));
    act(() => {
      result.current.submit('only', 'only', true);
      result.current.celebrate();
    });
    celebrationPasses();
    act(() => result.current.restart());
    act(() => {
      result.current.submit('only', 'only', true);
      result.current.celebrate();
    });
    celebrationPasses();
    expect(mocks.recordCompletion).toHaveBeenCalledTimes(2);
    expect(result.current.finished).toBe(true);
  });
});

describe('useRound double taps', () => {
  beforeEach(() => {
    mocks.recordAnswer.mockClear();
    mocks.recordCompletion.mockClear();
  });

  it('a double tap on a correct answer is recorded once', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => {
      result.current.submit('x', 'x', true);
      result.current.submit('x', 'x', true);
    });
    expect(mocks.recordAnswer).toHaveBeenCalledTimes(1);
    expect(result.current.solved).toBe(true);
  });

  it('a double tap on a wrong answer counts the attempts that were really made, one at a time', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => {
      result.current.submit('y', 'x', false);
    });
    act(() => {
      result.current.submit('z', 'x', false);
    });
    expect(mocks.recordAnswer).toHaveBeenCalledTimes(2);
    expect(result.current.attempts).toBe(2);
  });
});
