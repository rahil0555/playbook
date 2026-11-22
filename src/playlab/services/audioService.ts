/**
 * Audio for PlayLab.
 *
 *  - Voice: ONE voice, Pip's own - the ElevenLabs voice behind the pre-generated files in /audio/edu and the
 *    /api/voice server function (see services/eduVoice.ts). If a line's clip will not play, the line is SILENT.
 *    The browser's built-in speech synthesis (Web Speech API) is deliberately NOT used: it sounds robotic, it
 *    differs on every device, and it is not this product's voice. There is no fallback to it, anywhere.
 *  - Sound effects: tiny tones synthesized with the Web Audio API (no files).
 *  - Nothing here ever throws into the UI or blocks an animation: every call is
 *    fire-and-forget safe and resolves with an outcome string.
 */

import { createEduVoice, type EduVoice } from './eduVoice';

/**
 * What came of a request. 'silent' is the honest outcome for a spoken line whose recording could not be played:
 * nothing was said, and nothing was said in its place.
 */
export type SpeakOutcome = 'played' | 'muted' | 'unsupported' | 'blocked' | 'error' | 'cancelled' | 'silent';
/** Calling it cancels the line or sound; `done` settles once it has been played, or dropped. */
export type Scheduled = (() => void) & { readonly done: Promise<SpeakOutcome> };
/** 'boing' = a soft playful pop when a tile is picked up; 'chime' = a gentle landing; 'sparkle' = a tiny shimmer. */
export type SfxName = 'tap' | 'pop' | 'place' | 'correct' | 'oops' | 'celebrate' | 'boing' | 'chime' | 'sparkle';

export interface PlayRequest {
  text: string;
  /** BCP-47 tag, e.g. 'en-US' */
  lang?: string;
  /** Optional URL of a recorded clip. Used before speech synthesis. */
  src?: string;
  /**
   * A recording only: it is played from `src`, or not at all. Nothing is spoken in its place, so a missing recording can
   * never turn into a made-up sound. Then `text` is only a label (for logs and tests), never read aloud.
   */
  clipOnly?: boolean;
  /** with `clipOnly`: repeat the recording until stop() (a sound that is held down) */
  loop?: boolean;
  /** in a sequence only: a short breath before this line, between an instruction and the example word */
  pauseBeforeMs?: number;
}

export interface AudioSnapshot {
  speaking: boolean;
  /** true once a line was tried and its recording could not be played (that line is then silent, not robotic) */
  unavailable: boolean;
  muted: boolean;
}

export interface AudioService {
  play(request: PlayRequest): Promise<SpeakOutcome>;
  playSequence(requests: PlayRequest[]): Promise<SpeakOutcome>;
  stop(): void;
  /**
   * Say `request` after `delayMs`, unless stop() is called first. Returns a function that cancels it (a newer line can
   * replace one that is still waiting). Used for praise that follows a fanfare, so it can be cancelled when the child leaves.
   */
  later(request: PlayRequest, delayMs: number): Scheduled;
  sfx(name: SfxName): void;
  /**
   * Called just before the app starts to play a line or a recording, so a listener can stop first. The microphone uses this:
   * it stops before the app speaks, so the app's own voice is never heard as the child's answer. Returns a function that
   * removes the listener.
   */
  onBeforePlay(listener: () => void): () => void;
  /**
   * Turns sound effects off while the child's microphone is listening. A tone played then can be picked up by the microphone,
   * and it distracts the child from answering. Spoken lines are already stopped before they play (see onBeforePlay).
   */
  setListening(listening: boolean): void;
  setMuted(muted: boolean): void;
  getSnapshot(): AudioSnapshot;
  subscribe(listener: () => void): () => void;
}

/** Injectable browser pieces, so the service can be tested without a real browser. */
export interface AudioEnv {
  AudioElement?: typeof Audio;
  AudioContextCtor?: typeof AudioContext;
  /** Pip's own voice (pre-generated clips + the server function). Without it, spoken lines stay silent. */
  voice?: EduVoice | null;
  /** ms a line waits for the clip manifest before it gives up on that line */
  voiceLoadTimeoutMs?: number;
}

function defaultEnv(): AudioEnv {
  if (typeof window === 'undefined') return {};
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  return {
    AudioElement: typeof Audio !== 'undefined' ? Audio : undefined,
    AudioContextCtor: window.AudioContext ?? w.webkitAudioContext,
    voice: createEduVoice({ base: import.meta.env.BASE_URL }),
  };
}

/** How long a line waits for the clip manifest before it gives up on that line (nothing is spoken in its place). */
export const VOICE_LOAD_TIMEOUT_MS = 1500;

/**
 * A one-sample silent mp3. Played (and paused) on the first tap so the browser counts media playback as
 * user-started: after this, a clip that the app starts by itself is allowed on phones.
 */
const SILENCE =
  'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAABAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

const NOTES: Record<SfxName, { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number }[]> = {
  tap: [{ freq: 520, at: 0, dur: 0.07, type: 'triangle' }],
  pop: [{ freq: 440, at: 0, dur: 0.05, type: 'sine' }, { freq: 700, at: 0.04, dur: 0.08, type: 'sine' }],
  place: [{ freq: 330, at: 0, dur: 0.09, type: 'triangle' }],
  correct: [
    { freq: 523, at: 0, dur: 0.12 },
    { freq: 659, at: 0.1, dur: 0.12 },
    { freq: 784, at: 0.2, dur: 0.2 },
  ],
  oops: [{ freq: 247, at: 0, dur: 0.14, type: 'sine', gain: 0.05 }, { freq: 196, at: 0.12, dur: 0.18, type: 'sine', gain: 0.05 }],
  boing: [{ freq: 392, at: 0, dur: 0.14, type: 'sine', gain: 0.07 }, { freq: 784, at: 0.035, dur: 0.1, type: 'sine', gain: 0.035 }],
  chime: [{ freq: 880, at: 0, dur: 0.28, type: 'sine', gain: 0.06 }, { freq: 1318, at: 0.07, dur: 0.32, type: 'sine', gain: 0.04 }],
  sparkle: [{ freq: 1568, at: 0, dur: 0.07, type: 'triangle', gain: 0.035 }, { freq: 2093, at: 0.05, dur: 0.1, type: 'triangle', gain: 0.03 }],
  celebrate: [
    { freq: 523, at: 0, dur: 0.12 },
    { freq: 659, at: 0.1, dur: 0.12 },
    { freq: 784, at: 0.2, dur: 0.12 },
    { freq: 1047, at: 0.3, dur: 0.3 },
  ],
};

/** How long a sound effect takes to finish, in ms. Spoken lines wait for it, so speech never plays over a fanfare. */
export function sfxDurationMs(name: SfxName): number {
  return Math.round(Math.max(...NOTES[name].map((n) => n.at + n.dur)) * 1000);
}

export function createAudioService(env: AudioEnv = defaultEnv()): AudioService {
  let snapshot: AudioSnapshot = {
    speaking: false,
    unavailable: false,
    muted: false,
  };
  const listeners = new Set<() => void>();
  // Start loading the clip manifest straight away, so the first line is not held up waiting for it. It is
  // fire-and-forget: a manifest that never arrives only means those lines stay silent.
  void env.voice?.load().catch(() => undefined);
  let ctx: AudioContext | null = null;
  let currentClip: HTMLAudioElement | null = null;
  /** ends the clip that is playing now (replaced or stopped count as played); null when none is */
  let endClip: (() => void) | null = null;
  /** settles when the playing clip has finished, or at once when none is playing */
  let clipIdle: Promise<void> = Promise.resolve();
  let token = 0; // bumped by stop() so queued sequence items are dropped
  /** lines waiting for their delay (see later()): calling one cancels it; stop() cancels them all */
  const waiting = new Set<() => void>();
  /** told just before a line or a recording starts (see onBeforePlay) */
  const beforePlay = new Set<() => void>();
  /** the microphone is listening: sound effects are off then (see setListening) */
  let listening = false;
  const announceBeforePlay = () => {
    [...beforePlay].forEach((listener) => {
      try {
        listener();
      } catch {
        /* a listener must never stop a line from playing */
      }
    });
  };

  const set = (patch: Partial<AudioSnapshot>) => {
    const next = { ...snapshot, ...patch };
    if ((Object.keys(patch) as (keyof AudioSnapshot)[]).every((k) => next[k] === snapshot[k])) return;
    snapshot = next;
    listeners.forEach((l) => l());
  };

  /** Stop the clip that is playing, if any, and release whatever is waiting for it. */
  const stopClip = () => {
    const end = endClip;
    endClip = null;
    try {
      currentClip?.pause();
    } catch {
      /* ignore */
    }
    currentClip = null;
    end?.();
  };

  /** Play a recording. One clip at a time: a new clip replaces the one playing. Resolves when it has finished. */
  const playClip = (src: string, loop = false): Promise<boolean> => {
    const { AudioElement } = env;
    stopClip();
    if (!AudioElement) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      let release: () => void = () => undefined;
      clipIdle = new Promise<void>((r) => (release = r));
      let clip: HTMLAudioElement | null = null;
      let settled = false;
      const end = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (clip && currentClip === clip) {
          currentClip = null;
          endClip = null;
        }
        set({ speaking: false });
        resolve(ok);
        release();
      };
      try {
        clip = new AudioElement(src);
        clip.loop = loop;
        currentClip = clip;
        endClip = () => end(true); // replaced or stopped: not a failure
        clip.onended = () => end(true);
        clip.onerror = () => end(false);
        const p = clip.play();
        if (p && typeof p.catch === 'function') p.catch(() => end(false));
        set({ speaking: true });
      } catch {
        end(false);
      }
    });
  };

  /**
   * The URL of the clip that says `req.text` in Pip's voice, or undefined when there is no recording for it. The very
   * first line waits a moment for the clip manifest; after that the answer is immediate. A manifest that never arrives
   * only costs that one wait: `load()` settles either way, and the timeout is the backstop if the request hangs.
   */
  const eduClipFor = async (voice: EduVoice, text: string): Promise<string | undefined> => {
    try {
      if (!voice.ready()) {
        const timeout = new Promise<void>((resolve) => setTimeout(resolve, env.voiceLoadTimeoutMs ?? VOICE_LOAD_TIMEOUT_MS));
        await Promise.race([voice.load(), timeout]);
      }
      return voice.clipFor(text);
    } catch {
      return undefined;
    }
  };

  const play: AudioService['play'] = async (req) => {
    if (snapshot.muted) return 'muted';
    try {
      if (req.clipOnly) {
        // a recording only: with no recording there is nothing to play, and nothing is spoken instead
        if (!req.src) return 'unsupported';
        announceBeforePlay();
        return (await playClip(req.src, req.loop)) ? 'played' : 'error';
      }
      announceBeforePlay();
      if (req.src && (await playClip(req.src))) return 'played';
      // Pip's own voice, and the ONLY voice: a pre-generated clip, or the server function (/api/voice, which uses the
      // same ElevenLabs key). A clip that will not play is remembered as broken, so it is not retried this session.
      const voice = env.voice;
      if (!req.src && voice) {
        const clip = voice.ready() ? voice.clipFor(req.text) : await eduClipFor(voice, req.text);
        if (clip) {
          if (await playClip(clip)) return 'played';
          voice.markBroken(clip);
        }
      }
      // Nothing could play this line, and nothing may be said in its place: never the browser's robotic voice.
      // The shell tells the grown-up that spoken words did not play; the pictures and sound effects still work.
      await clipIdle;
      set({ unavailable: true });
      return 'silent';
    } catch {
      return 'error';
    }
  };

  const stop: AudioService['stop'] = () => {
    token += 1;
    [...waiting].forEach((cancel) => cancel());
    waiting.clear();
    stopClip();
    set({ speaking: false });
  };

  const getCtx = (): AudioContext | null => {
    if (ctx) return ctx;
    if (!env.AudioContextCtor) return null;
    try {
      ctx = new env.AudioContextCtor();
    } catch {
      ctx = null;
    }
    return ctx;
  };

  // The first sound of a session used to wait for the AudioContext to be created and resumed, which showed up as a
  // late first pop. Creating it on the first touch (a user gesture, so browsers allow it) keeps every later sound on time.
  // Sound off never creates a context.
  if (typeof document !== 'undefined' && env.AudioContextCtor) {
    const prime = () => {
      document.removeEventListener('pointerdown', prime, true);
      if (snapshot.muted) return; // sound off never creates a context and never plays anything
      const c = getCtx();
      if (c?.state === 'suspended') void c.resume().catch(() => undefined);
      // Phones only allow audio the child started. Playing (and at once pausing) a silent clip inside this tap
      // makes the browser treat the page as allowed, so a clip the app starts later is not blocked.
      try {
        if (env.AudioElement) {
          const unlock = new env.AudioElement(SILENCE);
          unlock.volume = 0;
          const p = unlock.play();
          const settle = () => {
            try {
              unlock.pause();
            } catch {
              /* ignore */
            }
          };
          if (p && typeof p.then === 'function') p.then(settle, () => undefined);
          else settle();
        }
      } catch {
        /* the unlock is best effort: a blocked clip still falls back to browser speech */
      }
      // the first line can then be answered from the manifest instead of waiting for it
      void env.voice?.load().catch(() => undefined);
    };
    document.addEventListener('pointerdown', prime, true);
  }

  return {
    play,
    async playSequence(requests) {
      const mine = ++token;
      let last: SpeakOutcome = 'played';
      for (const req of requests) {
        if (mine !== token) break;
        if (req.pauseBeforeMs) {
          await new Promise<void>((resolve) => setTimeout(resolve, req.pauseBeforeMs));
          if (mine !== token) break;
        }
        last = await play(req);
        if (last !== 'played') break;
      }
      return last;
    },
    stop,
    later(request, delayMs) {
      let resolveDone: (outcome: SpeakOutcome) => void = () => undefined;
      const done = new Promise<SpeakOutcome>((resolve) => (resolveDone = resolve));
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cancel = () => {
        if (timer === undefined) return; // already played or already cancelled
        clearTimeout(timer);
        timer = undefined;
        waiting.delete(cancel);
        resolveDone('cancelled');
      };
      timer = setTimeout(() => {
        timer = undefined;
        waiting.delete(cancel);
        void play(request).then(resolveDone);
      }, delayMs);
      waiting.add(cancel);
      return Object.assign(cancel, { done });
    },
    sfx(name) {
      if (snapshot.muted || listening) return;
      try {
        const c = getCtx();
        if (!c) return;
        if (c.state === 'suspended') void c.resume().catch(() => undefined);
        const t0 = c.currentTime;
        for (const n of NOTES[name]) {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = n.type ?? 'sine';
          osc.frequency.value = n.freq;
          const peak = n.gain ?? 0.07;
          gain.gain.setValueAtTime(0.0001, t0 + n.at);
          gain.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
          osc.connect(gain).connect(c.destination);
          osc.start(t0 + n.at);
          osc.stop(t0 + n.at + n.dur + 0.02);
        }
      } catch {
        /* sound effects are optional */
      }
    },
    onBeforePlay(listener) {
      beforePlay.add(listener);
      return () => {
        beforePlay.delete(listener);
      };
    },
    setListening(on) {
      listening = on;
    },
    setMuted(muted) {
      if (muted) stop();
      set({ muted });
    },
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
