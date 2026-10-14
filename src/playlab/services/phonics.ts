import type { Phoneme } from '../types/learning';
import { SPEECH_STYLE, type PlayRequest } from './audioService';

/**
 * The one place a letter sound becomes a request to the audio service. Everything that speaks a Magic Letters sound goes
 * through here, so the speaking rate (the slower isolated-sound rate), the English voice (the audio service applies the
 * saved choice) and any recorded clip are decided in one place. To improve how a sound is made, change this function or the
 * phoneme's data; the screens do not change.
 */
export function phonemeRequest(phoneme: Phoneme, lang: string): PlayRequest {
  return { text: phoneme.speech, lang, rate: SPEECH_STYLE.soundRate, src: phoneme.clip };
}
