import type { AudioService, AudioSnapshot, PlayRequest, Scheduled, SpeakOutcome } from '../services/audioService';
import { listEnglishVoices, type VoiceLike } from '../services/voiceCatalog';
import { order } from './order';

/** Every request that reached the (fake) audio service, in order. Clip-only requests are here too (see `clipOnly`). */
export const audioLog: PlayRequest[] = [];
export const sfxLog: string[] = [];
/** How long a fake recording takes to play, in ms. Lines that wait for a recording wait this long. */
export const FAKE_CLIP_MS = 400;
/**
 * Everything the audio made, with the time (performance.now) it happened: a sound effect, a line said, a recording
 * started or ended, or a stop. Timing tests read this, so they can check what came first and how far apart.
 */
export const timeline: { t: number; kind: 'sfx' | 'say' | 'clip' | 'clipEnd' | 'stop'; what: string }[] = [];
const note = (kind: (typeof timeline)[number]['kind'], what: string) => timeline.push({ t: performance.now(), kind, what });
/** Ids passed to setVoice, in order. */
export const voiceLog: (string | null)[] = [];

/** Tests set these BEFORE rendering PlayLab (the fake reads them when it is created). */
export const fakeDevice: { voices: VoiceLike[]; speechSupported: boolean } = { voices: [], speechSupported: true };
export const resetFakeDevice = () => {
  fakeDevice.voices = [];
  fakeDevice.speechSupported = true;
  voiceLog.length = 0;
};

export function createFakeAudio(): AudioService {
  const listeners = new Set<() => void>();
  // useSyncExternalStore requires a referentially stable snapshot between changes
  let snapshot: AudioSnapshot = {
    speaking: false,
    unavailable: false,
    voiceName: null,
    muted: false,
    voices: listEnglishVoices(fakeDevice.voices),
    voiceId: null,
    speechSupported: fakeDevice.speechSupported,
  };
  const set = (patch: Partial<AudioSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((l) => l());
  };
  /** lines and recordings waiting for their moment: each one is its cancel function */
  const waiting = new Set<() => void>();
  /** listeners told before anything plays (see onBeforePlay), as in the real service */
  const beforePlay = new Set<() => void>();
  const announceBeforePlay = () => beforePlay.forEach((listener) => listener());
  /** the microphone is listening: sound effects are off, as in the real service (see setListening) */
  let listening = false;

  /** Plays one request the way the real service does: a recording (for `clipOnly`, never speech), or a spoken line. */
  const playNow = (req: PlayRequest): Promise<SpeakOutcome> => {
    audioLog.push(req);
    if (snapshot.muted) return Promise.resolve('muted');
    if (req.clipOnly) {
      note('clip', req.text);
      if (!req.src) return Promise.resolve('unsupported'); // no recording: nothing is said in its place
      announceBeforePlay();
      return new Promise((resolve) => {
        // a looping recording has no end: it plays until it is cancelled (stopped, or let go)
        const t = req.loop
          ? undefined
          : setTimeout(() => {
              waiting.delete(cancel);
              note('clipEnd', req.text);
              resolve('played');
            }, FAKE_CLIP_MS);
        const cancel = () => {
          if (t !== undefined) clearTimeout(t);
          waiting.delete(cancel);
          resolve('cancelled');
        };
        waiting.add(cancel);
      });
    }
    announceBeforePlay();
    note('say', req.text);
    order.push(`say:${req.text}`);
    return Promise.resolve('played');
  };

  return {
    play: async (req) => playNow(req),
    playSequence: async (reqs) => {
      let last: SpeakOutcome = 'played';
      for (const r of reqs) {
        last = await playNow(r);
        if (last !== 'played') break;
      }
      return last;
    },
    stop: () => {
      note('stop', '');
      [...waiting].forEach((cancel) => cancel());
      waiting.clear();
    },
    later: (req, delayMs): Scheduled => {
      let resolveDone: (outcome: SpeakOutcome) => void = () => undefined;
      const done = new Promise<SpeakOutcome>((resolve) => (resolveDone = resolve));
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cancel = () => {
        if (timer === undefined) return;
        clearTimeout(timer);
        timer = undefined;
        waiting.delete(cancel);
        resolveDone('cancelled');
      };
      timer = setTimeout(() => {
        timer = undefined;
        waiting.delete(cancel);
        void playNow(req).then(resolveDone);
      }, delayMs);
      waiting.add(cancel);
      return Object.assign(cancel, { done });
    },
    sfx: (name) => {
      if (listening) return;
      sfxLog.push(name);
      note('sfx', name);
    },
    setListening: (on) => {
      listening = on;
    },
    onBeforePlay: (listener) => {
      beforePlay.add(listener);
      return () => {
        beforePlay.delete(listener);
      };
    },
    setMuted: (m) => set({ muted: m }),
    setVoice: (id) => {
      voiceLog.push(id);
      set({ voiceId: id });
    },
    refreshVoices: () => undefined,
    getSnapshot: () => snapshot,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
