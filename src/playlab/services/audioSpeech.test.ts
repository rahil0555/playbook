import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The global test setup replaces createAudioService with a fake; these tests drive the real one against a fake engine.
const { createAudioService, START_TIMEOUT_MS, ONLINE_START_TIMEOUT_MS } = await vi.importActual<typeof import('./audioService')>('./audioService');

type Handlers = { onstart?: () => void; onend?: () => void; onerror?: (e: { error: string }) => void };

/**
 * A speech engine that behaves like a browser's: it starts speaking `startAfterMs` after speak() is called, and can
 * start out paused. `voiceOnline` decides whether the only voice it offers is a network (online) one.
 */
function engine({ startAfterMs, voiceOnline = false, paused = false }: { startAfterMs: number; voiceOnline?: boolean; paused?: boolean }) {
  const state = { paused };
  const synth = {
    get paused() {
      return state.paused;
    },
    cancel: vi.fn(),
    resume: vi.fn(() => {
      state.paused = false;
    }),
    getVoices: () => [{ name: 'Test Voice', lang: 'en-US', localService: !voiceOnline }],
    speak: (u: Handlers) => {
      setTimeout(() => u.onstart?.(), startAfterMs);
      setTimeout(() => u.onend?.(), startAfterMs + 50);
    },
  };
  class Utterance {
    text: string;
    lang = '';
    rate = 1;
    pitch = 1;
    voice: unknown = null;
    onstart?: () => void;
    onend?: () => void;
    onerror?: (e: { error: string }) => void;
    constructor(text: string) {
      this.text = text;
    }
  }
  return { synth, Utterance: Utterance as unknown as typeof SpeechSynthesisUtterance };
}

describe('speech robustness', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resumes a paused speech engine before speaking, so the line is not silently dropped', async () => {
    const e = engine({ startAfterMs: 10, paused: true });
    const audio = createAudioService({ synth: e.synth as unknown as SpeechSynthesis, Utterance: e.Utterance });
    const p = audio.play({ text: 'Hear the clue' });
    await vi.advanceTimersByTimeAsync(100);
    await expect(p).resolves.toBe('played');
    expect(e.synth.resume).toHaveBeenCalledTimes(1);
  });

  it('a device voice that is slower than the start limit is given up on, as before', async () => {
    const e = engine({ startAfterMs: START_TIMEOUT_MS + 500, voiceOnline: false });
    const audio = createAudioService({ synth: e.synth as unknown as SpeechSynthesis, Utterance: e.Utterance });
    const p = audio.play({ text: 'cat' });
    await vi.advanceTimersByTimeAsync(START_TIMEOUT_MS + 100);
    await expect(p).resolves.toBe('unsupported');
    expect(audio.getSnapshot().unavailable).toBe(true);
  });

  it('an online voice gets the longer start allowance, so a slow network voice still plays', async () => {
    expect(ONLINE_START_TIMEOUT_MS).toBeGreaterThan(START_TIMEOUT_MS);
    const e = engine({ startAfterMs: START_TIMEOUT_MS + 1500, voiceOnline: true });
    const audio = createAudioService({ synth: e.synth as unknown as SpeechSynthesis, Utterance: e.Utterance });
    const p = audio.play({ text: 'Hooray!' });
    await vi.advanceTimersByTimeAsync(START_TIMEOUT_MS + 1600);
    await expect(p).resolves.toBe('played');
    expect(audio.getSnapshot().unavailable).toBe(false);
  });
});
