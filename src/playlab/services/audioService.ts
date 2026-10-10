/**
 * Audio for PlayLab.
 *
 *  - Voice: PlayLab ships NO recorded voice files. By default it asks the
 *    browser's built-in speech synthesis (Web Speech API) to say things, so
 *    pronunciation depends on the browser, the operating system and the
 *    installed voices. Isolated phonemes ("buh") are only approximated.
 *    If a clip URL is supplied (`src`), that file is played instead and speech
 *    is only the fallback.
 *  - Sound effects: tiny tones synthesized with the Web Audio API (no files).
 *  - Nothing here ever throws into the UI or blocks an animation: every call is
 *    fire-and-forget safe and resolves with an outcome string.
 */

export type SpeakOutcome = 'played' | 'muted' | 'unsupported' | 'blocked' | 'error';
export type SfxName = 'tap' | 'pop' | 'place' | 'correct' | 'oops' | 'celebrate';

export interface PlayRequest {
  text: string;
  /** BCP-47 tag, e.g. 'en-US' */
  lang?: string;
  /** Optional URL of a recorded clip. Used before speech synthesis. */
  src?: string;
  rate?: number;
  pitch?: number;
}

export interface AudioSnapshot {
  speaking: boolean;
  /** true once speech was tried and nothing could be played (no voice, blocked, unsupported) */
  unavailable: boolean;
  voiceName: string | null;
  muted: boolean;
}

export interface AudioService {
  play(request: PlayRequest): Promise<SpeakOutcome>;
  playSequence(requests: PlayRequest[]): Promise<SpeakOutcome>;
  stop(): void;
  sfx(name: SfxName): void;
  setMuted(muted: boolean): void;
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
  celebrate: [
    { freq: 523, at: 0, dur: 0.12 },
    { freq: 659, at: 0.1, dur: 0.12 },
    { freq: 784, at: 0.2, dur: 0.12 },
    { freq: 1047, at: 0.3, dur: 0.3 },
  ],
};

export function createAudioService(env: AudioEnv = defaultEnv()): AudioService {
  let snapshot: AudioSnapshot = { speaking: false, unavailable: false, voiceName: null, muted: false };
  const listeners = new Set<() => void>();
  let ctx: AudioContext | null = null;
  let currentClip: HTMLAudioElement | null = null;
  let token = 0; // bumped by stop() so queued sequence items are dropped

  const set = (patch: Partial<AudioSnapshot>) => {
    const next = { ...snapshot, ...patch };
    if ((Object.keys(patch) as (keyof AudioSnapshot)[]).every((k) => next[k] === snapshot[k])) return;
    snapshot = next;
    listeners.forEach((l) => l());
  };

  const pickVoice = (lang: string): SpeechSynthesisVoice | null => {
    try {
      const voices = env.synth?.getVoices() ?? [];
      const prefix = lang.split('-')[0]?.toLowerCase();
      const exact = voices.filter((v) => v.lang.toLowerCase() === lang.toLowerCase());
      const loose = voices.filter((v) => v.lang.toLowerCase().startsWith(`${prefix}`));
      const pool = exact.length ? exact : loose;
      return pool.find((v) => v.localService) ?? pool[0] ?? null;
    } catch {
      return null;
    }
  };

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
      const finish = (outcome: SpeakOutcome) => {
        if (settled) return;
        settled = true;
        if (watchdog) clearTimeout(watchdog);
        set({ speaking: false });
        resolve(outcome);
      };
      try {
        synth.cancel();
        const u = new Utterance(req.text);
        u.lang = lang;
        u.rate = req.rate ?? 0.85;
        u.pitch = req.pitch ?? 1.1;
        const voice = pickVoice(lang);
        if (voice) {
          u.voice = voice;
          set({ voiceName: voice.name });
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
        }, env.startTimeoutMs ?? 2500);
        synth.speak(u);
      } catch {
        set({ unavailable: true });
        finish('error');
      }
    });
  };

  const playClip = (src: string): Promise<boolean> => {
    const { AudioElement } = env;
    if (!AudioElement) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      try {
        const clip = new AudioElement(src);
        currentClip = clip;
        clip.onended = () => resolve(true);
        clip.onerror = () => resolve(false);
        const p = clip.play();
        if (p && typeof p.catch === 'function') p.catch(() => resolve(false));
        set({ speaking: true });
        clip.addEventListener('ended', () => set({ speaking: false }));
      } catch {
        resolve(false);
      }
    });
  };

  const play: AudioService['play'] = async (req) => {
    if (snapshot.muted) return 'muted';
    try {
      if (req.src && (await playClip(req.src))) return 'played';
      return await speak(req);
    } catch {
      return 'error';
    }
  };

  const stop: AudioService['stop'] = () => {
    token += 1;
    try {
      env.synth?.cancel();
      currentClip?.pause();
    } catch {
      /* ignore */
    }
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

  return {
    play,
    async playSequence(requests) {
      const mine = ++token;
      let last: SpeakOutcome = 'played';
      for (const req of requests) {
        if (mine !== token) break;
        last = await play(req);
        if (last !== 'played') break;
      }
      return last;
    },
    stop,
    sfx(name) {
      if (snapshot.muted) return;
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
