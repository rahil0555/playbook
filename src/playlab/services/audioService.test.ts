import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The global test setup replaces createAudioService with a fake; here we want the real one.
const { createAudioService } = await vi.importActual<typeof import('./audioService')>('./audioService');

type Handlers = { onstart?: () => void; onend?: () => void; onerror?: (e: { error: string }) => void };

function fakeSynth(behaviour: 'speak' | 'silent' | 'error' | 'throw', errorCode = 'synthesis-failed') {
  const spoken: string[] = [];
  const synth = {
    cancel: vi.fn(),
    getVoices: () => [{ name: 'Test Voice', lang: 'en-US', localService: true }],
    speak: (u: Handlers & { text: string }) => {
      if (behaviour === 'throw') throw new Error('nope');
      spoken.push(u.text);
      if (behaviour === 'speak') setTimeout(() => (u.onstart?.(), setTimeout(() => u.onend?.(), 5)), 1);
      if (behaviour === 'error') setTimeout(() => u.onerror?.({ error: errorCode }), 1);
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
  return { synth: synth as unknown as SpeechSynthesis, Utterance: Utterance as unknown as typeof SpeechSynthesisUtterance, spoken };
}

describe('audioService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plays speech through the browser voice and reports status', async () => {
    const env = fakeSynth('speak');
    const audio = createAudioService({ synth: env.synth, Utterance: env.Utterance });
    const p = audio.play({ text: 'ay', lang: 'en-US' });
    await vi.advanceTimersByTimeAsync(20);
    await expect(p).resolves.toBe('played');
    expect(env.spoken).toEqual(['ay']);
    expect(audio.getSnapshot()).toMatchObject({ unavailable: false, speaking: false, voiceName: 'Test Voice' });
  });

  it('reports "unsupported" (and never throws) when speech synthesis does not exist', async () => {
    const audio = createAudioService({ synth: null });
    await expect(audio.play({ text: 'x' })).resolves.toBe('unsupported');
    expect(audio.getSnapshot().unavailable).toBe(true);
    expect(() => audio.sfx('pop')).not.toThrow(); // no AudioContext either
    expect(() => audio.stop()).not.toThrow();
  });

  it('gives up after a timeout when speech never starts (no installed voice) instead of hanging', async () => {
    const env = fakeSynth('silent');
    const audio = createAudioService({ synth: env.synth, Utterance: env.Utterance, startTimeoutMs: 500 });
    const p = audio.play({ text: 'cat' });
    await vi.advanceTimersByTimeAsync(600);
    await expect(p).resolves.toBe('unsupported');
    expect(audio.getSnapshot().unavailable).toBe(true);
  });

  it('maps speech errors to outcomes', async () => {
    const blocked = fakeSynth('error', 'not-allowed');
    const a1 = createAudioService({ synth: blocked.synth, Utterance: blocked.Utterance });
    const p1 = a1.play({ text: 'a' });
    await vi.advanceTimersByTimeAsync(10);
    await expect(p1).resolves.toBe('blocked');

    const broken = fakeSynth('error');
    const a2 = createAudioService({ synth: broken.synth, Utterance: broken.Utterance });
    const p2 = a2.play({ text: 'a' });
    await vi.advanceTimersByTimeAsync(10);
    await expect(p2).resolves.toBe('error');
    expect(a2.getSnapshot().unavailable).toBe(true);

    const thrower = fakeSynth('throw');
    const a3 = createAudioService({ synth: thrower.synth, Utterance: thrower.Utterance });
    await expect(a3.play({ text: 'a' })).resolves.toBe('error');
  });

  it('treats an interrupted utterance (replaced by a newer one) as normal', async () => {
    const env = fakeSynth('error', 'interrupted');
    const audio = createAudioService({ synth: env.synth, Utterance: env.Utterance });
    const p = audio.play({ text: 'a' });
    await vi.advanceTimersByTimeAsync(10);
    await expect(p).resolves.toBe('played');
    expect(audio.getSnapshot().unavailable).toBe(false);
  });

  it('does nothing while muted', async () => {
    const env = fakeSynth('speak');
    const audio = createAudioService({ synth: env.synth, Utterance: env.Utterance });
    audio.setMuted(true);
    await expect(audio.play({ text: 'a' })).resolves.toBe('muted');
    expect(env.spoken).toEqual([]);
  });

  it('falls back to speech when a recorded clip cannot be played', async () => {
    const env = fakeSynth('speak');
    class BadAudio {
      onerror?: () => void;
      onended?: () => void;
      constructor(public src: string) {}
      play() {
        return Promise.reject(new Error('404'));
      }
      pause() {}
      addEventListener() {}
    }
    const audio = createAudioService({ synth: env.synth, Utterance: env.Utterance, AudioElement: BadAudio as unknown as typeof Audio });
    const p = audio.play({ text: 'apple', src: '/audio/apple.mp3' });
    await vi.advanceTimersByTimeAsync(20);
    await expect(p).resolves.toBe('played');
    expect(env.spoken).toEqual(['apple']);
  });

  it('plays a sequence in order and stop() drops the rest', async () => {
    const env = fakeSynth('speak');
    const audio = createAudioService({ synth: env.synth, Utterance: env.Utterance });
    const p = audio.playSequence([{ text: 'ay' }, { text: 'aah' }, { text: 'apple' }]);
    await vi.advanceTimersByTimeAsync(100);
    await p;
    expect(env.spoken).toEqual(['ay', 'aah', 'apple']);

    const p2 = audio.playSequence([{ text: '1' }, { text: '2' }, { text: '3' }]);
    await vi.advanceTimersByTimeAsync(2);
    audio.stop();
    await vi.advanceTimersByTimeAsync(100);
    await p2;
    expect(env.spoken.slice(3)).not.toContain('3');
  });
});
