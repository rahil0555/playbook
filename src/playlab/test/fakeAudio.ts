import type { AudioService, PlayRequest } from '../services/audioService';

/** Every request that reached the (fake) audio service, in order. */
export const audioLog: PlayRequest[] = [];
export const sfxLog: string[] = [];

export function createFakeAudio(): AudioService {
  let muted = false;
  // useSyncExternalStore requires a referentially stable snapshot between changes
  let snapshot = { speaking: false, unavailable: false, voiceName: null as string | null, muted };
  return {
    play: async (req) => {
      audioLog.push(req);
      return muted ? 'muted' : 'played';
    },
    playSequence: async (reqs) => {
      audioLog.push(...reqs);
      return 'played';
    },
    stop: () => undefined,
    sfx: (name) => {
      sfxLog.push(name);
    },
    setMuted: (m) => {
      muted = m;
      snapshot = { ...snapshot, muted: m };
    },
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
  };
}
