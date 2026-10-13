import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The global test setup replaces createAudioService with a fake; here we want the real one.
const { createAudioService, SPEECH_STYLE } = await vi.importActual<typeof import('./audioService')>('./audioService');

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

/* ---------------------- voice selection (browser voices only) ---------------------- */

type Rec = { text: string; rate: number; pitch: number; voice: { name: string } | null };

function voiceSynth(voices: { name: string; lang: string; voiceURI?: string; localService?: boolean }[]) {
  const spoken: Rec[] = [];
  const handlers: Record<string, () => void> = {};
  let list = voices;
  const synth = {
    cancel: vi.fn(),
    getVoices: () => list,
    addEventListener: (type: string, fn: () => void) => {
      handlers[type] = fn;
    },
    speak: (u: Rec & { onstart?: () => void; onend?: () => void }) => {
      spoken.push({ text: u.text, rate: u.rate, pitch: u.pitch, voice: u.voice });
      setTimeout(() => (u.onstart?.(), u.onend?.()), 1);
    },
  };
  class Utterance {
    text: string;
    lang = '';
    rate = 1;
    pitch = 1;
    voice: { name: string } | null = null;
    onstart?: () => void;
    onend?: () => void;
    constructor(text: string) {
      this.text = text;
    }
  }
  return {
    env: { synth: synth as unknown as SpeechSynthesis, Utterance: Utterance as unknown as typeof SpeechSynthesisUtterance },
    spoken,
    setVoices: (v: typeof voices) => {
      list = v;
      handlers.voiceschanged?.();
    },
  };
}

const DEVICE = [
  { name: 'Local US', lang: 'en-US', voiceURI: 'local-us', localService: true },
  { name: 'Daisy', lang: 'en_GB', voiceURI: 'daisy', localService: false },
  { name: 'Español', lang: 'es-ES', voiceURI: 'es', localService: true },
];

describe('audioService: voice selection', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('exposes English voices only, labelled, and reports speech support', () => {
    const d = voiceSynth(DEVICE);
    const audio = createAudioService(d.env);
    const snap = audio.getSnapshot();
    expect(snap.speechSupported).toBe(true);
    expect(snap.voices.map((v) => v.label)).toEqual(['Local US (American English)', 'Daisy (British English, online)']);
    expect(snap.voiceName).toBe('Local US');
  });

  it('without speech synthesis: unsupported and no voices', () => {
    const snap = createAudioService({ synth: null }).getSnapshot();
    expect(snap.speechSupported).toBe(false);
    expect(snap.voices).toEqual([]);
  });

  it('picks up voices that arrive late (voiceschanged), and keeps the snapshot stable when nothing changed', () => {
    const d = voiceSynth([]);
    const audio = createAudioService(d.env);
    expect(audio.getSnapshot().voices).toEqual([]);
    d.setVoices(DEVICE);
    const first = audio.getSnapshot();
    expect(first.voices).toHaveLength(2);
    d.setVoices(DEVICE); // same list again
    expect(audio.getSnapshot()).toBe(first); // same object: no pointless re-render
    audio.refreshVoices();
    expect(audio.getSnapshot()).toBe(first);
  });

  it('speaks with the saved voice, and updates the displayed voice name', async () => {
    const d = voiceSynth(DEVICE);
    const audio = createAudioService(d.env);
    audio.setVoice('daisy');
    expect(audio.getSnapshot()).toMatchObject({ voiceId: 'daisy', voiceName: 'Daisy' });
    const p = audio.play({ text: 'hello', lang: 'en-US' });
    await vi.advanceTimersByTimeAsync(10);
    await p;
    expect(d.spoken.at(-1)?.voice?.name).toBe('Daisy');
  });

  it('a stale saved voice silently falls back to automatic (and nothing breaks)', async () => {
    const d = voiceSynth(DEVICE);
    const audio = createAudioService(d.env);
    audio.setVoice('voice-from-another-device');
    const p = audio.play({ text: 'hello', lang: 'en-US' });
    await vi.advanceTimersByTimeAsync(10);
    await expect(p).resolves.toBe('played');
    expect(d.spoken.at(-1)?.voice?.name).toBe('Local US');
    expect(audio.getSnapshot().unavailable).toBe(false);
  });

  it('a preview override uses that voice for one request and does NOT change the saved voice or displayed name', async () => {
    const d = voiceSynth(DEVICE);
    const audio = createAudioService(d.env);
    audio.setVoice(null);
    const p = audio.play({ text: 'preview', lang: 'en-US', voice: 'daisy' });
    await vi.advanceTimersByTimeAsync(10);
    await p;
    expect(d.spoken.at(-1)?.voice?.name).toBe('Daisy');
    expect(audio.getSnapshot()).toMatchObject({ voiceId: null, voiceName: 'Local US' });
    const q = audio.play({ text: 'normal', lang: 'en-US' });
    await vi.advanceTimersByTimeAsync(10);
    await q;
    expect(d.spoken.at(-1)?.voice?.name).toBe('Local US');
  });

  it('uses the shared speech style by default, and a request can override rate (isolated sounds)', async () => {
    const d = voiceSynth(DEVICE);
    const audio = createAudioService(d.env);
    const a = audio.play({ text: 'cat' });
    await vi.advanceTimersByTimeAsync(10);
    await a;
    expect(d.spoken.at(-1)).toMatchObject({ rate: SPEECH_STYLE.rate, pitch: SPEECH_STYLE.pitch });
    const b = audio.play({ text: 'buh', rate: SPEECH_STYLE.soundRate });
    await vi.advanceTimersByTimeAsync(10);
    await b;
    expect(d.spoken.at(-1)).toMatchObject({ rate: SPEECH_STYLE.soundRate, pitch: SPEECH_STYLE.pitch });
    expect([SPEECH_STYLE.rate, SPEECH_STYLE.pitch, SPEECH_STYLE.soundRate]).toEqual([0.9, 1.05, 0.8]);
  });

  it('mute still wins over a chosen voice', async () => {
    const d = voiceSynth(DEVICE);
    const audio = createAudioService(d.env);
    audio.setVoice('daisy');
    audio.setMuted(true);
    await expect(audio.play({ text: 'x' })).resolves.toBe('muted');
    expect(d.spoken).toEqual([]);
  });
});

describe('sound effect timing', () => {
  it('each sound effect lasts as long as its notes, so speech can wait for the fanfare to finish', async () => {
    const { sfxDurationMs } = await vi.importActual<typeof import('./audioService')>('./audioService');
    expect(sfxDurationMs('celebrate')).toBe(600);
    expect(sfxDurationMs('correct')).toBe(400);
    expect(sfxDurationMs('chime')).toBe(390);
  });
});

describe('speech that waits for a fanfare', () => {
  // a fake speech synthesiser that records what it was asked to say
  function fakeSpeech() {
    const said: string[] = [];
    const synth = {
      speak: (u: { text: string }) => said.push(u.text),
      cancel: () => undefined,
      getVoices: () => [],
      addEventListener: () => undefined,
    };
    class Utterance {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    }
    return { said, env: { synth, Utterance, startTimeoutMs: 60_000 } as unknown as Parameters<typeof createAudioService>[0] };
  }

  it('says a line once its delay has passed, and not before', async () => {
    vi.useFakeTimers();
    try {
      const { said, env } = fakeSpeech();
      const { createAudioService: create } = await vi.importActual<typeof import('./audioService')>('./audioService');
      const audio = create(env);
      audio.later({ text: 'Hooray', lang: 'en-US' }, 720);
      vi.advanceTimersByTime(719);
      expect(said).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(said).toEqual(['Hooray']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a line can be cancelled, and stop() drops every line still waiting', async () => {
    vi.useFakeTimers();
    try {
      const { said, env } = fakeSpeech();
      const { createAudioService: create } = await vi.importActual<typeof import('./audioService')>('./audioService');
      const audio = create(env);
      const replaced = audio.later({ text: 'old line', lang: 'en-US' }, 500);
      audio.later({ text: 'kept line', lang: 'en-US' }, 500);
      replaced();
      audio.later({ text: 'left behind', lang: 'en-US' }, 500);
      audio.stop();
      vi.advanceTimersByTime(1000);
      expect(said).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
