import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRound } from './useRound';

// A double tap on Check, Next or Finish must count once: progress and host callbacks are the things at stake.
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

  it('a double tap on Next moves on one question, never two', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => {
      result.current.next();
      result.current.next();
    });
    expect(result.current.index).toBe(1);
    expect(result.current.current?.id).toBe('b');
  });

  it('a double tap on Finish records the completion once', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => [{ id: 'only' }]));
    act(() => {
      result.current.submit('only', 'only', true);
    });
    act(() => {
      result.current.next();
      result.current.next();
    });
    expect(mocks.recordCompletion).toHaveBeenCalledTimes(1);
    expect(result.current.finished).toBe(true);
    expect(mocks.recordCompletion.mock.calls[0]?.[0]).toMatchObject({ score: 1, total: 1 });
  });

  it('starting another round stops any speech still waiting from the last one', () => {
    mocks.audioStop.mockClear();
    const { result } = renderHook(() => useRound<Item>('sentences', () => three));
    act(() => result.current.restart());
    expect(mocks.audioStop).toHaveBeenCalledTimes(1);
  });

  it('a restarted round can be finished again, and counts once', () => {
    const { result } = renderHook(() => useRound<Item>('sentences', () => [{ id: 'only' }]));
    act(() => {
      result.current.submit('only', 'only', true);
      result.current.next();
    });
    act(() => result.current.restart());
    act(() => {
      result.current.submit('only', 'only', true);
      result.current.next();
      result.current.next();
    });
    expect(mocks.recordCompletion).toHaveBeenCalledTimes(2);
  });
});
