import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EduVoice } from './eduVoice';

// The global test setup replaces createAudioService with a fake; here we want the real one.
const { createAudioService } = await vi.importActual<typeof import('./audioService')>('./audioService');

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

/** A recording the test starts, ends and fails by hand. */
class FakeAudio {
  static made: FakeAudio[] = [];
  paused = false;
  loop = false;
  volume = 1;
  onended?: () => void;
  onerror?: () => void;
  constructor(public src: string) {
    FakeAudio.made.push(this);
  }
  play() {
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  finish() {
    this.onended?.();
  }
  fail() {
    this.onerror?.();
  }
}

/**
 * Pip's voice, faked: a fixed clip table plus a record of what was marked broken. There is no other voice in the
 * product, so a line with no clip here is a line that will simply not be said.
 */
function fakeVoice(clips: Record<string, string> = {}, opts: { ready?: boolean } = {}) {
  const broken: string[] = [];
  const voice: EduVoice & { broken: string[] } = {
    clipFor: (text) => clips[text],
    load: () => Promise.resolve(),
    ready: () => opts.ready ?? true,
    size: () => Object.keys(clips).length,
    markBroken: (url) => {
      broken.push(url);
    },
    broken,
  };
  return voice;
}

function env(voice: EduVoice | null = fakeVoice({ Hi: './audio/edu/hi.mp3' })) {
  return { voice, AudioElement: FakeAudio as unknown as typeof Audio };
}

describe('audioService: one voice (Pip), and nothing else', () => {
  beforeEach(() => {
    FakeAudio.made = [];
  });

  it("plays a spoken line from Pip's own recording and resolves 'played'", async () => {
    const audio = createAudioService(env());
    const p = audio.play({ text: 'Hi', lang: 'en-US' });
    await tick();
    expect(FakeAudio.made.at(-1)?.src).toBe('./audio/edu/hi.mp3');
    FakeAudio.made.at(-1)!.finish();
    await expect(p).resolves.toBe('played');
    expect(audio.getSnapshot()).toMatchObject({ speaking: false, unavailable: false });
  });

  it('stays silent (never robotic) when a line has no recording at all', async () => {
    const audio = createAudioService(env(fakeVoice({})));
    await expect(audio.play({ text: 'a line nobody recorded' })).resolves.toBe('silent');
    expect(FakeAudio.made).toHaveLength(0);
    expect(audio.getSnapshot().unavailable).toBe(true);
  });

  it('is silent, and marks the clip broken, when a recording will not play', async () => {
    const voice = fakeVoice({ Hi: './audio/edu/hi.mp3' });
    const audio = createAudioService(env(voice));
    const p = audio.play({ text: 'Hi' });
    await tick();
    FakeAudio.made.at(-1)!.fail();
    await expect(p).resolves.toBe('silent');
    expect(voice.broken).toEqual(['./audio/edu/hi.mp3']);
    expect(audio.getSnapshot().unavailable).toBe(true);
  });

  it('is silent when the browser has no voice at all', async () => {
    const audio = createAudioService({ voice: null, AudioElement: FakeAudio as unknown as typeof Audio });
    await expect(audio.play({ text: 'Hi' })).resolves.toBe('silent');
    expect(FakeAudio.made).toHaveLength(0);
  });

  it("reports 'unsupported' when the browser cannot play recordings, and never throws", async () => {
    const audio = createAudioService({ voice: fakeVoice({ Hi: 'x.mp3' }) });
    await expect(audio.play({ text: 'Hi', clipOnly: true })).resolves.toBe('unsupported');
    expect(() => audio.sfx('pop')).not.toThrow(); // no AudioContext either
    expect(() => audio.stop()).not.toThrow();
  });

  it('does nothing while muted', async () => {
    const audio = createAudioService(env());
    audio.setMuted(true);
    await expect(audio.play({ text: 'Hi' })).resolves.toBe('muted');
    expect(FakeAudio.made).toHaveLength(0);
  });

  it('stop() stops the recording and releases whoever waits for it', async () => {
    const audio = createAudioService(env());
    const p = audio.play({ text: 'Hi' });
    await tick();
    audio.stop();
    expect(FakeAudio.made.at(-1)!.paused).toBe(true);
    await expect(p).resolves.toBe('played');
  });

  it('later() plays the line unless it is cancelled first', async () => {
    const audio = createAudioService(env());
    const scheduled = audio.later({ text: 'Hi' }, 10);
    await tick(30);
    expect(FakeAudio.made).toHaveLength(1);
    FakeAudio.made.at(-1)!.finish();
    await expect(scheduled.done).resolves.toBe('played');

    const cancelled = audio.later({ text: 'Hi' }, 20);
    cancelled();
    await expect(cancelled.done).resolves.toBe('cancelled');
    await tick(40);
    expect(FakeAudio.made).toHaveLength(1);
  });

  it('playSequence stops as soon as a line cannot be played', async () => {
    const audio = createAudioService(env(fakeVoice({ A: './audio/edu/a.mp3' })));
    const p = audio.playSequence([{ text: 'A' }, { text: 'a line nobody recorded' }]);
    await tick();
    FakeAudio.made.at(-1)!.finish();
    await expect(p).resolves.toBe('silent');
    expect(FakeAudio.made).toHaveLength(1);
  });
});
