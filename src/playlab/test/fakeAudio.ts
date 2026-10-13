import type { AudioService, AudioSnapshot, PlayRequest } from '../services/audioService';
import { listEnglishVoices, type VoiceLike } from '../services/voiceCatalog';

/** Every request that reached the (fake) audio service, in order. */
export const audioLog: PlayRequest[] = [];
export const sfxLog: string[] = [];
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
  const waiting = new Set<ReturnType<typeof setTimeout>>();
  return {
    play: async (req) => {
      audioLog.push(req);
      return snapshot.muted ? 'muted' : 'played';
    },
    playSequence: async (reqs) => {
      audioLog.push(...reqs);
      return 'played';
    },
    stop: () => {
      waiting.forEach((t) => clearTimeout(t));
      waiting.clear();
    },
    later: (req, delayMs) => {
      const t = setTimeout(() => {
        waiting.delete(t);
        audioLog.push(req);
      }, delayMs);
      waiting.add(t);
      return () => {
        clearTimeout(t);
        waiting.delete(t);
      };
    },
    sfx: (name) => {
      sfxLog.push(name);
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
