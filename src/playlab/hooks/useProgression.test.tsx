import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CELEBRATE_MAX_HOLD_MS, CELEBRATE_MS, useProgression } from './useProgression';

describe('useProgression: one countdown per item, always cancellable', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the callback once the celebration has been on screen for CELEBRATE_MS', () => {
    const { result } = renderHook(() => useProgression());
    const done = vi.fn();
    act(() => result.current.arm('q1', done));
    act(() => void vi.advanceTimersByTime(CELEBRATE_MS - 1));
    expect(done).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('an item is armed once: a repeated or late arm for the same key does nothing', () => {
    const { result } = renderHook(() => useProgression());
    const done = vi.fn();
    act(() => {
      result.current.arm('q1', done);
      result.current.arm('q1', done);
    });
    act(() => void vi.advanceTimersByTime(CELEBRATE_MS * 3));
    act(() => result.current.arm('q1', done));
    act(() => void vi.advanceTimersByTime(CELEBRATE_MS * 3));
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('cancel drops the countdown: nothing armed before it runs afterwards', () => {
    const { result } = renderHook(() => useProgression());
    const done = vi.fn();
    act(() => result.current.arm('q1', done));
    act(() => result.current.cancel());
    act(() => void vi.advanceTimersByTime(CELEBRATE_MS * 3));
    expect(done).not.toHaveBeenCalled();
  });

  it('after a cancel the same key can be armed again, as for a new round', () => {
    const { result } = renderHook(() => useProgression());
    const done = vi.fn();
    act(() => result.current.arm('q1', done));
    act(() => result.current.cancel());
    act(() => result.current.arm('q1', done));
    act(() => void vi.advanceTimersByTime(CELEBRATE_MS));
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('leaving the activity (unmounting) cancels whatever is pending', () => {
    const { result, unmount } = renderHook(() => useProgression());
    const done = vi.fn();
    act(() => result.current.arm('q1', done));
    unmount();
    act(() => void vi.advanceTimersByTime(CELEBRATE_MS * 3));
    expect(done).not.toHaveBeenCalled();
  });

  it('waits for the held praise to finish, and not longer than CELEBRATE_MAX_HOLD_MS', async () => {
    const { result } = renderHook(() => useProgression());
    const done = vi.fn();
    let finish!: () => void;
    act(() => result.current.arm('q1', done, new Promise<void>((resolve) => (finish = resolve))));
    act(() => void vi.advanceTimersByTime(CELEBRATE_MS + 100));
    expect(done, 'the praise is still being said').not.toHaveBeenCalled();
    await act(async () => finish());
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('a held praise that never reports its end still lets the child on, after the cap', () => {
    const { result } = renderHook(() => useProgression());
    const done = vi.fn();
    act(() => result.current.arm('q1', done, new Promise(() => undefined)));
    act(() => void vi.advanceTimersByTime(CELEBRATE_MAX_HOLD_MS - 1));
    expect(done).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(done).toHaveBeenCalledTimes(1);
  });
});
