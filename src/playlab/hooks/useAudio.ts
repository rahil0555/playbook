import { useCallback, useSyncExternalStore } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { SPEECH_STYLE, type PlayRequest, type Scheduled, type SfxName, type SpeakOutcome } from '../services/audioService';
import { phonicLoopRequest, phonicRequest } from '../services/phonics';
import type { AudioClipSet, LetterEntry, PhonemeId } from '../types/learning';

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
    (items: { text: string; src?: string; rate?: number }[]): Promise<SpeakOutcome> =>
      audio.playSequence(items.map<PlayRequest>((i) => ({ text: i.text, lang, src: i.src, rate: i.rate }))),
    [audio, lang],
  );
  const sfx = useCallback((name: SfxName) => audio.sfx(name), [audio]);
  const stop = useCallback(() => audio.stop(), [audio]);
  /** say `text` after `delayMs` (cancelled by stop()); returns a function that cancels it */
  const speakLater = useCallback((text: string, delayMs: number): Scheduled => audio.later({ text, lang }, delayMs), [audio, lang]);

  const sayLetterName = useCallback((l: LetterEntry) => speak(l.nameSpeech, clip(l.audio, 'name')), [speak]);
  // isolated sounds are spoken a little slower so each stays clean
  const sayLetterSound = useCallback(
    (l: LetterEntry) => audio.play({ text: l.sound.speech, lang, src: clip(l.audio, 'sound'), rate: SPEECH_STYLE.soundRate }),
    [audio, lang],
  );
  const sayWord = useCallback((text: string, src?: string) => speak(text, src), [speak]);
  /** a Magic Letters sound (its recording), after `delayMs`; cancelled by stop() or by a newer sound */
  const laterPhonic = useCallback((id: PhonemeId, delayMs: number): Scheduled => audio.later(phonicRequest(id), delayMs), [audio]);
  /** the sound repeats until stop() (a letter held down); the caller stops it when the letter is let go */
  const loopPhonic = useCallback((id: PhonemeId) => void audio.play(phonicLoopRequest(id)), [audio]);

  return { speak, speakSequence, speakLater, sfx, stop, sayLetterName, sayLetterSound, sayWord, laterPhonic, loopPhonic };
}

const clip = (audio: AudioClipSet | undefined, key: keyof AudioClipSet) => audio?.[key];
