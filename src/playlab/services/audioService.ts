/**
 * Audio for PlayLab.
 *
 *  - Voice: PlayLab ships NO recorded voice files. By default it asks the
 *    browser's built-in speech synthesis (Web Speech API) to say things, so
 *    pronunciation depends on the browser, the operating system and the
 *    installed voices. Browser speech cannot say a sound on its own (such as
 *    "b"), so the app never asks it to: a sound is heard inside an example word.
 *    If a clip URL is supplied (`src`), that file is played instead and speech
 *    is only the fallback.
 *  - Sound effects: tiny tones synthesized with the Web Audio API (no files).
 *  - Nothing here ever throws into the UI or blocks an animation: every call is
 *    fire-and-forget safe and resolves with an outcome string.
 */

import { listEnglishVoices, resolveVoice, type VoiceOption } from './voiceCatalog';

/**
 * Speech style, in ONE place for easy tuning. Browser voices differ a lot, so keep these conservative:
 * a little slower than normal for young listeners, with only a slight lift in pitch.
 */
export const SPEECH_STYLE = {
  rate: 0.9,
  pitch: 1.05,
} as const;

/**
 * How long speech may take to START before we give up on it. Online (network) voices can take a couple of seconds to
 * begin, so they get more time than the voices on the device.
 */
export const START_TIMEOUT_MS = 2500;
export const ONLINE_START_TIMEOUT_MS = 6000;

export type SpeakOutcome = 'played' | 'muted' | 'unsupported' | 'blocked' | 'error' | 'cancelled';
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
  rate?: number;
  pitch?: number;
  /** in a sequence only: a short breath before this line, between an instruction and the example word */
  pauseBeforeMs?: number;
  /**
   * Use this English voice id for this request only (used by the Settings preview, so previewing never saves).
   * `undefined` = the saved preference; `null` = automatic.
   */
  voice?: string | null;
}

export interface AudioSnapshot {
  speaking: boolean;
  /** true once speech was tried and nothing could be played (no voice, blocked, unsupported) */
  unavailable: boolean;
  /** Name of the voice that will be used (saved choice or automatic). */
  voiceName: string | null;
  muted: boolean;
  /** English voices on this device (may be empty at first: browsers load them asynchronously). */
  voices: VoiceOption[];
  /** The saved voice id, or null for automatic. */
  voiceId: string | null;
  /** false when this browser has no speech synthesis at all */
  speechSupported: boolean;
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
  /** Choose the voice for future speech (null = automatic). Unknown/stale ids fall back to automatic. */
  setVoice(voiceId: string | null): void;
  /** Re-read the device's voice list (e.g. when Settings opens). */
  refreshVoices(): void;
  getSnapshot(): AudioSnapshot;
  subscribe(listener: () => void): () => void;
}

/** Injectable browser pieces, so the service can be tested without a real browser. */
export interface AudioEnv {
  synth?: SpeechSynthesis | null;
  Utterance?: typeof SpeechSynthesisUtterance;
  AudioElement?: typeof Audio;
  AudioContextCtor?: typeof AudioContext;
  /** ms to wait for speech to actually start before declaring it unavailable */
  startTimeoutMs?: number;
}

function defaultEnv(): AudioEnv {
  if (typeof window === 'undefined') return {};
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  return {
    synth: 'speechSynthesis' in window ? window.speechSynthesis : null,
    Utterance: typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : undefined,
    AudioElement: typeof Audio !== 'undefined' ? Audio : undefined,
    AudioContextCtor: window.AudioContext ?? w.webkitAudioContext,
  };
}

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
    voiceName: null,
    muted: false,
    voices: [],
    voiceId: null,
    speechSupported: !!(env.synth && env.Utterance),
  };
  const listeners = new Set<() => void>();
  let ctx: AudioContext | null = null;
  let currentClip: HTMLAudioElement | null = null;
  /** ends the clip that is playing now (replaced or stopped count as played); null when none is */
  let endClip: (() => void) | null = null;
  /** settles when the playing clip has finished, or at once when none is playing */
  let clipIdle: Promise<void> = Promise.resolve();
  let token = 0; // bumped by stop() so queued sequence items are dropped
  /** lines waiting for their delay (see later()): calling one cancels it; stop() cancels them all */
  const waiting = new Set<() => void>();
  /**
   * Utterances the browser is still speaking. Kept referenced until they end: some browsers stop speaking, and never report
   * the end, when the only reference to an utterance is garbage-collected mid-sentence.
   */
  const inFlight = new Set<SpeechSynthesisUtterance>();
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

  const rawVoices = (): SpeechSynthesisVoice[] => {
    try {
      return env.synth?.getVoices() ?? [];
    } catch {
      return [];
    }
  };

  /** The voice to use for `lang`. `override` (a request's own choice) beats the saved preference. */
  const pickVoice = (lang: string, override?: string | null): SpeechSynthesisVoice | null =>
    resolveVoice(rawVoices(), lang, override === undefined ? snapshot.voiceId : override);

  const speakingLang = 'en-US';
  const refreshName = () => {
    const v = pickVoice(speakingLang);
    if (v && v.name !== snapshot.voiceName) set({ voiceName: v.name });
  };

  /** Re-read the English voice list; the snapshot only changes when the list really changed (stable for React). */
  const refreshVoices = () => {
    const next = listEnglishVoices(rawVoices());
    const same = next.length === snapshot.voices.length && next.every((o, i) => o.id === snapshot.voices[i]?.id && o.label === snapshot.voices[i]?.label);
    if (!same) set({ voices: next });
    refreshName();
  };

  // Browsers (notably Chrome) load voices asynchronously and announce it with `voiceschanged`.
  try {
    env.synth?.addEventListener?.('voiceschanged', refreshVoices);
  } catch {
    /* older browsers: the retries below still pick the list up */
  }
  refreshVoices();
  if (env.synth && snapshot.voices.length === 0 && typeof setTimeout === 'function') {
    [300, 1200, 3000].forEach((ms) => setTimeout(refreshVoices, ms));
  }

  const speak = (req: PlayRequest): Promise<SpeakOutcome> => {
    const { synth, Utterance } = env;
    if (!synth || !Utterance) {
      set({ unavailable: true });
      return Promise.resolve('unsupported');
    }
    return new Promise<SpeakOutcome>((resolve) => {
      let started = false;
      let settled = false;
      const lang = req.lang ?? 'en-US';
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      let utterance: SpeechSynthesisUtterance | null = null;
      const finish = (outcome: SpeakOutcome) => {
        if (settled) return;
        settled = true;
        if (watchdog) clearTimeout(watchdog);
        if (utterance) inFlight.delete(utterance);
        set({ speaking: false });
        resolve(outcome);
      };
      try {
        synth.cancel();
        // a paused engine accepts speak() and then says nothing, so it is resumed first
        if (synth.paused) synth.resume();
        const u = new Utterance(req.text);
        utterance = u;
        inFlight.add(u);
        u.lang = lang;
        u.rate = req.rate ?? SPEECH_STYLE.rate;
        u.pitch = req.pitch ?? SPEECH_STYLE.pitch;
        const voice = pickVoice(lang, req.voice);
        if (voice) {
          u.voice = voice;
          // "current voice" shows the saved/automatic voice; a one-off preview must not change it
          if (req.voice === undefined) set({ voiceName: voice.name });
        }
        u.onstart = () => {
          started = true;
          set({ speaking: true, unavailable: false });
        };
        u.onend = () => finish('played');
        u.onerror = (e) => {
          const err = (e as SpeechSynthesisErrorEvent).error;
          if (err === 'canceled' || err === 'interrupted') return finish('played'); // replaced by a newer request
          if (err === 'not-allowed') return finish('blocked');
          set({ unavailable: true });
          finish('error');
        };
        // Some browsers/devices with no installed voice accept speak() but never start. Do not wait forever.
        watchdog = setTimeout(() => {
          if (!started) {
            try {
              synth.cancel();
            } catch {
              /* ignore */
            }
            set({ unavailable: true });
            finish('unsupported');
          }
        }, env.startTimeoutMs ?? (voice?.localService === false ? ONLINE_START_TIMEOUT_MS : START_TIMEOUT_MS));
        synth.speak(u);
      } catch {
        set({ unavailable: true });
        finish('error');
      }
    });
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

  /** Speech that must not be heard over a sound: cancel it (a letter sound replaces anything being said). */
  const cancelSpeech = () => {
    try {
      env.synth?.cancel();
    } catch {
      /* ignore */
    }
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

  const play: AudioService['play'] = async (req) => {
    if (snapshot.muted) return 'muted';
    try {
      if (req.clipOnly) {
        // a recording only: with no recording there is nothing to play, and nothing is spoken instead
        if (!req.src) return 'unsupported';
        announceBeforePlay();
        cancelSpeech();
        return (await playClip(req.src, req.loop)) ? 'played' : 'error';
      }
      announceBeforePlay();
      if (req.src && (await playClip(req.src))) return 'played';
      // speech never starts on top of a recording that is still playing; with none playing, a line is spoken at once
      if (endClip) await clipIdle;
      return await speak(req);
    } catch {
      return 'error';
    }
  };

  const stop: AudioService['stop'] = () => {
    token += 1;
    [...waiting].forEach((cancel) => cancel());
    waiting.clear();
    cancelSpeech();
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
      if (!snapshot.muted) {
        const c = getCtx();
        if (c?.state === 'suspended') void c.resume().catch(() => undefined);
      }
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
    setVoice(id) {
      set({ voiceId: id });
      refreshName();
    },
    refreshVoices,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
