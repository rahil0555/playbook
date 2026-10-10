import { useCallback, useSyncExternalStore } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import type { PlayRequest, SfxName, SpeakOutcome } from '../services/audioService';
import type { AudioClipSet, LetterEntry } from '../types/learning';

/** Live audio status (speaking / unavailable / voice name). */
export function useAudioStatus() {
  const { audio } = usePlayLab();
  return useSyncExternalStore(audio.subscribe, audio.getSnapshot, audio.getSnapshot);
}

/**
 * Convenience wrappers around the audio service. All of them are
 * fire-and-forget safe: they never throw and never block rendering.
 */
export function useSpeech() {
  const { audio, content } = usePlayLab();
  const lang = content.speechLang;

  const speak = useCallback(
    (text: string, src?: string): Promise<SpeakOutcome> => audio.play({ text, lang, src }),
    [audio, lang],
  );
  const speakSequence = useCallback(
    (items: { text: string; src?: string }[]): Promise<SpeakOutcome> =>
      audio.playSequence(items.map<PlayRequest>((i) => ({ text: i.text, lang, src: i.src }))),
    [audio, lang],
  );
  const sfx = useCallback((name: SfxName) => audio.sfx(name), [audio]);
  const stop = useCallback(() => audio.stop(), [audio]);

  const sayLetterName = useCallback((l: LetterEntry) => speak(l.nameSpeech, clip(l.audio, 'name')), [speak]);
  const sayLetterSound = useCallback((l: LetterEntry) => speak(l.sound.speech, clip(l.audio, 'sound')), [speak]);
  const sayWord = useCallback((text: string, src?: string) => speak(text, src), [speak]);

  return { speak, speakSequence, sfx, stop, sayLetterName, sayLetterSound, sayWord };
}

const clip = (audio: AudioClipSet | undefined, key: keyof AudioClipSet) => audio?.[key];
