import { beforeEach, describe, expect, it, vi } from 'vitest';

// The global test setup replaces createAudioService with a fake; these tests drive the real module with a fake recording.
const { createAudioService } = await vi.importActual<typeof import('./audioService')>('./audioService');

/** A recording the test starts, ends and fails by hand. */
class FakeRecording {
  static made: FakeRecording[] = [];
  paused = false;
  onended?: () => void;
  onerror?: () => void;
  constructor(public src: string) {
    FakeRecording.made.push(this);
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setup() {
  const speak = vi.fn((u: { onstart?: () => void; onend?: () => void }) => {
    setTimeout(() => u.onstart?.(), 1);
    setTimeout(() => u.onend?.(), 20);
  });
  const synth = { cancel: vi.fn(), speak, getVoices: () => [], paused: false } as unknown as SpeechSynthesis;
  class Utterance {
    text: string;
    lang = '';
    rate = 1;
    pitch = 1;
    voice = null;
    onstart?: () => void;
    onend?: () => void;
    onerror?: () => void;
    constructor(text: string) {
      this.text = text;
    }
  }
  const audio = createAudioService({
    synth,
    Utterance: Utterance as unknown as typeof SpeechSynthesisUtterance,
    AudioElement: FakeRecording as unknown as typeof Audio,
  });
  return { audio, speak, synth };
}

describe('recordings: clip-only requests never speak in their place', () => {
  beforeEach(() => {
    FakeRecording.made = [];
  });

  it('a recording-only request with no recording says nothing and plays nothing', async () => {
    const { audio, speak } = setup();
    await expect(audio.play({ text: 't', clipOnly: true })).resolves.toBe('unsupported');
    expect(speak).not.toHaveBeenCalled();
    expect(FakeRecording.made).toHaveLength(0);
  });

  it('plays its file, and resolves only once the file has ended', async () => {
    const { audio, speak } = setup();
    let finished = false;
    const p = audio.play({ text: 't', clipOnly: true, src: '/t.ogg' }).then((o) => ((finished = true), o));
    await wait(5);
    expect(FakeRecording.made.at(-1)?.src).toBe('/t.ogg');
    expect(finished, 'not done while the file is still playing').toBe(false);
    FakeRecording.made.at(-1)!.finish();
    await expect(p).resolves.toBe('played');
    expect(speak).not.toHaveBeenCalled();
  });

  it('a file that fails to play says nothing in its place', async () => {
    const { audio, speak } = setup();
    const p = audio.play({ text: 't', clipOnly: true, src: '/missing.ogg' });
    await wait(5);
    FakeRecording.made.at(-1)!.fail();
    await expect(p).resolves.toBe('error');
    expect(speak).not.toHaveBeenCalled();
  });

  it('muted: nothing plays at all', async () => {
    const { audio } = setup();
    audio.setMuted(true);
    await expect(audio.play({ text: 't', clipOnly: true, src: '/t.ogg' })).resolves.toBe('muted');
    expect(FakeRecording.made).toHaveLength(0);
  });
});

describe('recordings: one at a time, and speech waits for them', () => {
  beforeEach(() => {
    FakeRecording.made = [];
  });

  it('a new recording stops the one playing; the old one is released as replaced', async () => {
    const { audio } = setup();
    const a = audio.play({ text: 'a', clipOnly: true, src: '/a.ogg' });
    const b = audio.play({ text: 'b', clipOnly: true, src: '/b.ogg' });
    await wait(5);
    const [first, second] = FakeRecording.made;
    expect(first!.paused, 'the first recording is stopped').toBe(true);
    second!.finish();
    await expect(a).resolves.toBe('played');
    await expect(b).resolves.toBe('played');
  });

  it('stop() stops the recording and releases whoever waits for it', async () => {
    const { audio } = setup();
    const p = audio.play({ text: 't', clipOnly: true, src: '/t.ogg' });
    await wait(5);
    audio.stop();
    expect(FakeRecording.made[0]!.paused).toBe(true);
    await expect(p).resolves.toBe('played');
  });

  it('a spoken line waits for a recording that is still playing, then speaks', async () => {
    const { audio, speak } = setup();
    void audio.play({ text: 't', clipOnly: true, src: '/t.ogg' });
    await wait(5);
    const line = audio.play({ text: 'Hooray!' });
    await wait(10);
    expect(speak, 'nothing is spoken over the recording').not.toHaveBeenCalled();
    FakeRecording.made[0]!.finish();
    await expect(line).resolves.toBe('played');
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('a line scheduled after a recording has its done settle only when the recording ends', async () => {
    const { audio } = setup();
    const scheduled = audio.later({ text: 'p', clipOnly: true, src: '/p.ogg' }, 10);
    let settled = false;
    void scheduled.done.then(() => (settled = true));
    await wait(40);
    expect(FakeRecording.made).toHaveLength(1);
    expect(settled).toBe(false);
    FakeRecording.made[0]!.finish();
    await expect(scheduled.done).resolves.toBe('played');
  });

  it('cancelling a scheduled recording before it starts plays nothing and settles as cancelled', async () => {
    const { audio } = setup();
    const scheduled = audio.later({ text: 'p', clipOnly: true, src: '/p.ogg' }, 50);
    scheduled();
    await expect(scheduled.done).resolves.toBe('cancelled');
    await wait(80);
    expect(FakeRecording.made).toHaveLength(0);
  });

  it('a spoken line whose file fails falls back to speech, as before', async () => {
    const { audio, speak } = setup();
    const p = audio.play({ text: 'Hi', src: '/x.ogg' });
    await wait(5);
    FakeRecording.made[0]!.fail();
    await expect(p).resolves.toBe('played');
    expect(speak).toHaveBeenCalledTimes(1);
  });
});
