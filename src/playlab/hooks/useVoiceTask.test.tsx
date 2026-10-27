import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayLabContext, type PlayLabContextValue } from '../app/PlayLabContext';
import { letterNameTask, type VoiceTask, type VoiceVerdict } from '../services/speechInput/tasks';
import { createFakeAudio, sfxLog } from '../test/fakeAudio';
import { fakeRecognizers } from '../test/fakeRecognizer';
import { order } from '../test/order';
import { useVoiceTask } from './useVoiceTask';

// The hook needs only the language and the audio service from the app, so a small provider stands in for the whole app.
const value = { content: { language: 'en' }, audio: createFakeAudio() } as unknown as PlayLabContextValue;
const wrapper = ({ children }: { children: ReactNode }) => <PlayLabContext.Provider value={value}>{children}</PlayLabContext.Provider>;

const bee = letterNameTask({ id: 'b', name: 'bee' });
const see = letterNameTask({ id: 'c', name: 'see' });

let fake: ReturnType<typeof fakeRecognizers>;
const session = () => fake.latest();

beforeEach(() => {
  fake = fakeRecognizers();
  order.length = 0;
});
afterEach(() => {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

function render(task: VoiceTask = bee) {
  const onVerdict = vi.fn<(verdict: VoiceVerdict) => void>();
  const hook = renderHook(({ current }: { current: VoiceTask }) => useVoiceTask({ task: current, onVerdict, createRecognizer: fake.factory }), {
    wrapper,
    initialProps: { current: task },
  });
  return { ...hook, onVerdict };
}

describe("useVoiceTask: the app's own voice is never heard as the answer", () => {
  it('the microphone is switched off before the app speaks, and what the browser then reports is not judged', () => {
    const { result, onVerdict } = render();
    act(() => result.current.start());
    act(() => session().begin());
    const mark = order.length;
    act(() => {
      void value.audio.play({ text: 'bee' });
    });
    expect(order.slice(mark), 'the microphone is off first, then the app speaks').toEqual(['mic off', 'say:bee']);
    act(() => {
      session().heard('bee');
      session().end();
    });
    expect(onVerdict, 'the teacher saying the answer is not the child answering').not.toHaveBeenCalled();
    expect(result.current.phase).toBe('ready');
  });

  it('after the app has spoken, a new attempt listens again and is judged on its own', () => {
    const { result, onVerdict } = render();
    act(() => result.current.start());
    act(() => session().begin());
    act(() => {
      void value.audio.play({ text: 'bee' });
    });
    act(() => result.current.start());
    act(() => {
      session().begin();
      session().heard('bee');
      session().end();
    });
    expect(onVerdict).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('correct');
  });

  it('no sound effect is played while the microphone listens, and sound comes back once listening stops', () => {
    const { result } = render();
    act(() => result.current.start());
    act(() => session().begin());
    const mark = sfxLog.length;
    act(() => value.audio.sfx('pop'));
    expect(sfxLog.slice(mark), 'a tone that the microphone could pick up is not played').toEqual([]);
    act(() => result.current.stop());
    act(() => value.audio.sfx('pop'));
    expect(sfxLog.slice(mark)).toEqual(['pop']);
  });

  it('unmounting while listening turns the microphone off, and what it then reports is not judged', () => {
    const { result, unmount, onVerdict } = render();
    act(() => result.current.start());
    act(() => session().begin());
    const listening = session();
    unmount();
    expect(listening.aborted, 'the microphone is switched off when the question goes away').toBe(true);
    act(() => {
      listening.heard('bee');
      listening.end();
    });
    expect(onVerdict).not.toHaveBeenCalled();
  });
});

describe('useVoiceTask: a page that is not secure, or a site that refuses the microphone, is said so before any tap', () => {
  const secureBefore = window.isSecureContext;
  const setSecure = (secure: boolean) => Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
  afterEach(() => {
    setSecure(secureBefore);
    Reflect.deleteProperty(navigator, 'permissions');
  });

  it('on a page that is not secure, the page says so at once, and the microphone is never asked for', () => {
    setSecure(false);
    const { result } = render();
    expect(result.current.phase).toBe('page-blocked');
    expect(result.current.failure).toBe('insecure');
    act(() => result.current.start());
    expect(fake.made.some((recogniser) => recogniser.started), 'no recogniser was started').toBe(false);
    expect(result.current.phase).toBe('page-blocked');
  });

  it('a microphone the browser already refuses for this site is said so before the child taps, and nothing is started', async () => {
    Object.defineProperty(navigator, 'permissions', { value: { query: async () => ({ state: 'denied' }) }, configurable: true });
    const { result } = render();
    await waitFor(() => expect(result.current.phase).toBe('denied'));
    expect(fake.made.some((recogniser) => recogniser.started)).toBe(false);
  });

  it('a page that is secure and has no refused microphone starts in the ready state', () => {
    setSecure(true);
    const { result } = render();
    expect(result.current.phase).toBe('ready');
  });
});

describe('useVoiceTask: one attempt, one judgement', () => {
  it('judges an attempt once, even when the browser reports its result twice', () => {
    const { result, onVerdict } = render();
    act(() => result.current.start());
    act(() => {
      session().begin();
      session().heard('bee');
      session().heard('bee');
      session().end();
    });
    expect(onVerdict).toHaveBeenCalledTimes(1);
    expect(onVerdict.mock.calls[0]![0]).toMatchObject({ outcome: 'correct' });
    expect(result.current.phase).toBe('correct');
  });

  it('a result that arrives after the question has changed is never judged for the new question', () => {
    const { result, rerender, onVerdict } = render(bee);
    act(() => result.current.start());
    act(() => session().begin());
    rerender({ current: see });
    act(() => {
      session().heard('bee');
      session().end();
    });
    expect(onVerdict).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('ready');
  });

  it('a new attempt clears the previous verdict, so an old answer never carries over', () => {
    const { result } = render();
    act(() => result.current.start());
    act(() => {
      session().begin();
      session().heard('dog');
      session().end();
    });
    expect(result.current.phase).toBe('incorrect');
    act(() => result.current.start());
    expect(result.current.verdict).toBeNull();
  });
});

describe('useVoiceTask: listening is bounded and never left on by accident', () => {
  it('shows what is being heard while the child speaks, but judges only the final answer', () => {
    const { result, onVerdict } = render();
    act(() => result.current.start());
    act(() => session().begin());
    act(() => {
      session().onresult?.({ results: [{ isFinal: false, length: 1, 0: { transcript: 'be' } }] });
    });
    expect(result.current.phase).toBe('listening');
    expect(result.current.interim).toBe('be');
    expect(onVerdict).not.toHaveBeenCalled();
  });

  it('listening stops when the tab is hidden', () => {
    const { result } = render();
    act(() => result.current.start());
    act(() => session().begin());
    expect(result.current.phase).toBe('listening');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(session().aborted).toBe(true);
    expect(result.current.phase).toBe('ready');
  });

  it('silence is reported as nothing heard, and the child can start again', () => {
    const { result, onVerdict } = render();
    act(() => result.current.start());
    act(() => {
      session().begin();
      session().end();
    });
    expect(result.current.phase).toBe('nothing-heard');
    expect(onVerdict).not.toHaveBeenCalled();
    act(() => result.current.start());
    expect(session().started, 'the new attempt is listening for the browser').toBe(true);
    expect(result.current.phase).toBe('starting');
  });

  it('a failed attempt has no result coming, so a late result is never judged', () => {
    const { result, onVerdict } = render();
    act(() => result.current.start());
    act(() => {
      session().begin();
      session().fail('audio-capture');
    });
    expect(result.current.phase).toBe('no-microphone');
    act(() => session().heard('bee'));
    expect(onVerdict).not.toHaveBeenCalled();
  });
});

describe('useVoiceTask: each failure has its own phase', () => {
  it('a refused microphone is "denied", not "no microphone"', () => {
    const { result } = render();
    act(() => result.current.start());
    act(() => session().fail('not-allowed'));
    expect(result.current.phase).toBe('denied');
  });

  it('a browser with no speech recognition is "unsupported", and nothing is listened for', () => {
    const { result } = renderHook(() => useVoiceTask({ task: bee, createRecognizer: () => null }), { wrapper });
    expect(result.current.phase).toBe('unsupported');
    act(() => result.current.start());
    expect(result.current.phase).toBe('unsupported');
  });

  it('a speech-service failure is not reported as a microphone failure', () => {
    const { result } = render();
    act(() => result.current.start());
    act(() => session().fail('service-not-allowed'));
    expect(result.current.phase).toBe('service-unavailable');
  });

  it('after a failure the child can try again, and a new attempt starts', () => {
    const { result, onVerdict } = render();
    act(() => result.current.start());
    act(() => session().fail('network'));
    expect(result.current.phase).toBe('recoverable');
    act(() => result.current.start());
    act(() => {
      session().begin();
      session().heard('bee');
      session().end();
    });
    expect(onVerdict).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('correct');
  });
});
