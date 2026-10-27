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
  const sfx = useCallback((name: SfxName) => audio.sfx(name), [audio]);
  const stop = useCallback(() => audio.stop(), [audio]);
  /** say `text` after `delayMs` (cancelled by stop()); returns a function that cancels it */
  const speakLater = useCallback((text: string, delayMs: number): Scheduled => audio.later({ text, lang }, delayMs), [audio, lang]);

  const sayLetterName = useCallback((l: LetterEntry) => speak(l.nameSpeech, clip(l.audio, 'name')), [speak]);
  /** a letter's sound, heard in its example word (see soundRequests) */
  const sayLetterSound = useCallback((l: LetterEntry) => audio.playSequence(soundRequests(l, lang)), [audio, lang]);
  /** the letter's name, then its sound: one sequence, so a tap during it cancels the rest */
  const sayLetterFully = useCallback(
    (l: LetterEntry) => audio.playSequence([{ text: l.nameSpeech, lang, src: clip(l.audio, 'name') }, ...soundRequests(l, lang)]),
    [audio, lang],
  );
  const sayWord = useCallback((text: string, src?: string) => speak(text, src), [speak]);
  /** a Magic Letters sound (its recording), after `delayMs`; cancelled by stop() or by a newer sound */
  const laterPhonic = useCallback((id: PhonemeId, delayMs: number): Scheduled => audio.later(phonicRequest(id), delayMs), [audio]);
  /** the sound repeats until stop() (a letter held down); the caller stops it when the letter is let go */
  const loopPhonic = useCallback((id: PhonemeId) => void audio.play(phonicLoopRequest(id)), [audio]);

  return { speak, speakLater, sfx, stop, sayLetterName, sayLetterSound, sayLetterFully, sayWord, laterPhonic, loopPhonic };
}

const clip = (audio: AudioClipSet | undefined, key: keyof AudioClipSet) => audio?.[key];

/** Said just before a letter's sound, so the child hears the sound inside its example word. */
export const SOUND_LEAD_IN = 'Listen for the sound in';

/**
 * The requests that play a letter's sound. A recording is used when there is one. Otherwise the sound is heard in its example
 * word, after a short breath, because browser speech cannot say an isolated sound and an invented respelling is not the sound.
 */
export function soundRequests(letter: LetterEntry, lang: string): PlayRequest[] {
  if (letter.audio?.sound) return [{ text: letter.sound.speech, lang, src: letter.audio.sound, rate: SPEECH_STYLE.rate }];
  return [
    { text: SOUND_LEAD_IN, lang, rate: SPEECH_STYLE.rate },
    { text: letter.sound.speech, lang, rate: SPEECH_STYLE.rate, pauseBeforeMs: 250 },
  ];
}
