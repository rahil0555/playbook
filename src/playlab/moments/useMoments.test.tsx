import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audioLog, createFakeAudio, sfxLog } from '../test/fakeAudio';
import { CELEBRATION_SPEECH_MS, SPEECH_AFTER_SOUND_MS, useMoments } from './useMoments';

// The moments layer talks to the shared audio service through PlayLab's context: give it the test's fake audio.
const mocks = vi.hoisted(() => ({ audio: null as unknown }));
vi.mock('../app/PlayLabContext', () => ({
  usePlayLab: () => ({ audio: mocks.audio, content: { speechLang: 'en-US' } }),
}));

const said = () => audioLog.map((r) => r.text);

describe('useMoments: spoken lines during a celebration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.audio = createFakeAudio();
  });
  afterEach(() => vi.useRealTimers());

  it('the cheer follows the fanfare by the short sound gap, not after the whole fanfare', () => {
    const { result } = renderHook(() => useMoments());
    act(() => {
      result.current.celebrate();
      result.current.say('Hooray!');
    });
    expect(sfxLog).toEqual(['celebrate']);
    expect(said(), 'nothing said on the landing itself').toEqual([]);
    act(() => vi.advanceTimersByTime(SPEECH_AFTER_SOUND_MS - 1));
    expect(said()).toEqual([]);
    act(() => vi.advanceTimersByTime(1));
    expect(said()).toEqual(['Hooray!']);
    expect(SPEECH_AFTER_SOUND_MS, 'the cheer starts before the fanfare (600 ms) has finished').toBeLessThan(CELEBRATION_SPEECH_MS);
  });

  it('a newer line replaces one still waiting, so two quick cheers never both play', () => {
    const { result } = renderHook(() => useMoments());
    act(() => {
      result.current.say('first');
      result.current.say('second');
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(said()).toEqual(['second']);
  });

  it('cancelSpeech drops a line that is still waiting', () => {
    const { result } = renderHook(() => useMoments());
    act(() => result.current.say('Hooray!'));
    act(() => result.current.cancelSpeech());
    act(() => vi.advanceTimersByTime(1000));
    expect(said()).toEqual([]);
  });

  it('the other screens keep the full wait for their fanfare (their timing is unchanged)', () => {
    const { result } = renderHook(() => useMoments());
    act(() => result.current.celebrateThenSay('The cat is sleeping.'));
    act(() => vi.advanceTimersByTime(CELEBRATION_SPEECH_MS - 1));
    expect(said()).toEqual([]);
    act(() => vi.advanceTimersByTime(1));
    expect(said()).toEqual(['The cat is sleeping.']);
  });
});
